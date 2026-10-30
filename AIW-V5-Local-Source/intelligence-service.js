import {refreshRepositoryAssurance} from './repository-sync.js';
import {publicMessage,integrityError} from './error-message.js';
import {operationStatement,draftingSpent} from './operation-service.js';
import {refreshOrganizationAssurance} from './organization-service.js';
import {prepareBrainPacket} from './brain-retrieval.js';
import {handleIntelligenceDraft} from './intelligence-draft-service.js';
import {appendAdvisoryHistory} from './public/intelligence-continuity.js';
import {intelligenceRequest,adoptIntelligence,generationReceipt,journeyRequest,journeyPacket,reviewRequest,reviewPacket,disclosureSourceExcluded,discloseIntelligenceValue,containsExcludedRecord,packArchitectureIntelligence} from './public/intelligence-context.js';
import {generationCurrent} from './public/aiw-brain.js';
import {changeFingerprint} from './public/changes-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {readStoredProject} from './project-storage.js';
import {intelligenceStatus,requestIntelligence,requestReasoning,requestFieldDraft,fieldInstructionsPin,requestJourneyDraft,journeyInstructionsPin,requestModelReview,reviewInstructionsPin,verifyConnection,DEFAULT_HOURLY_REQUESTS,jobBudgetOf} from './intelligence-provider.js';
import {draftChapter,briefSource,modelSource} from './shared/journey-drafter.js';
import {draftsByGroup} from './public/readiness-model.js';
import {interpretModel} from './shared/model-interpreter.js';
import {releaseInterruptedRuns} from './retention.js';
import {requestArchitectureDraft} from './architecture-request.js';
import {reasoningRequest,reasoningCurrency,adoptReasoning,checkRecordRefinements,instructionsPin} from './public/brain-reasoning.js';
import {fieldsFor,fieldOf,fieldHelp} from './public/record-fields.js';
import {sparkFields,draftable,supported,recordOf,chapterOf,parentOf,relatedOf,maxLengthOf,workingRecord,LINK_FIELDS,singletonId,recordNoun} from './public/field-suggestions.js';
import {fieldOpen,isOpenText} from './public/open-fields.js';
import {chapterReading,fitReading,RECORD_TYPES} from './public/chapter-reasoning.js';
import {brainContext} from './public/aiw-brain.js';
import {architectureBrain,brainSources,BRAIN_ENGINE,BRAIN_POLICY} from './public/architecture-brain.js';
import {redactSecrets} from './public/secret-redaction.js';
import {digest} from './public/brain-integrity.js';
import {driverKind,isQualityDriver} from './public/quality-domain.js';
import {driverScope} from './public/driver-scope.js';
import {architectureIntelligence} from './public/architecture-intelligence.js';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const prefix=(owner,projectId)=>'intelligence/'+encodeURIComponent(owner)+'/'+projectId+'/';
const rowFor=(env,owner,projectId,id)=>env.DB.prepare("SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND id=? AND mode<>'context-draft'").bind(owner,projectId,id).first();
const genericError=code=>({timeout:'The provider took too long. Your request is retained.',interrupted:'The request was interrupted before the provider answered (the server stopped). Its reserved tokens were released; send it again.',refusal:'The provider declined the request. Reframe the design question.',authentication:'Check the server-side key and model access.',provider_limit:'The provider request limit was reached; it clears with time, so send the request again shortly.',provider_quota:'The provider account’s spend limit or credit is exhausted, and waiting will not clear it. The account’s owner raises the limit or adds credit, or the administrator configures another key. Your request is retained.',invalid_output:'The response did not pass source and structure checks.',incomplete:'The provider returned an incomplete response.',storage:'The response could not be saved. No proposal was applied.'}[code]||'The request could not be completed. Your saved model is unchanged.');
// Only the bounded status/type/code/request ID constructed by the provider adapter is attached to a failed run.
// Provider response text and the request packet never enter this diagnostic field.
// A rate limit's Retry-After (seconds, from the provider) travels with the failed run and its 429 answer (failedAnswer).
const providerFailure=e=>({
 ...(e?.providerFailure?{providerFailure:e.providerFailure}:{}),
 ...(e?.transportFailure?{transportFailure:e.transportFailure}:{}),
 ...(e?.code==='provider_limit'&&Number.isInteger(e.retryAfter)?{retryAfterSeconds:e.retryAfter}:{})
});
// A failed run's answer (round 41, FIX NOW 7): 429 with the provider's Retry-After for a rate limit, which clears with
// time; 502 for everything else, a spend limit included, which waiting does not clear.
const failedAnswer=(failed,code)=>{const r=json({...failed,result:undefined},code==='provider_limit'?429:502);if(failed.retryAfterSeconds)r.headers.set('Retry-After',String(failed.retryAfterSeconds));return r;};
// The tokens a failed run holds (round 41, FIX NOW 6), in every mode: what its calls were billed when that is the run's
// whole use (intelligence-provider.js runCalls: the answered calls with the failing call's own usage, and none for a
// call refused before it answered), so a spend-limit or rate-limit refusal with no answer holds nothing. Where the use
// is not known (a timeout, an answer that could not be read, a storage fault, anything else) the reservation stands:
// NULL, which the budgets count as reserved_tokens (COALESCE(used_tokens, reserved_tokens)) until it leaves the window.
export const settleFailedRun=e=>e?.settled?(Number(e.usage?.inputTokens)||0)+(Number(e.usage?.outputTokens)||0):e?.code==='not_configured'?0:null;
function metadata(row){return {id:row.id,objectId:row.object_id,mode:row.mode,status:row.status==='pending'&&Date.now()-Date.parse(row.created_at)>120000?'interrupted':row.status,provider:row.provider,model:row.model,createdAt:row.created_at,updatedAt:row.updated_at,...(row.error_code?{error:genericError(row.error_code)}:{})};}
// The browser needs receipts to mark an old review as historical after a knowledge withdrawal.
// Return only the saved basis needed for currency, not a second copy of every source excerpt.
const reviewBasisPacket=packet=>packet?{stamp:packet.stamp,brainReceipt:{instructions:packet.brainReceipt?.instructions||null},sources:(packet.sources||[]).map(s=>({kind:s.kind,objectId:s.objectId,receipt:s.receipt||null}))}:null;
async function readRun(env,owner,projectId,row){
 if(!row||!row.storage_key.startsWith(prefix(owner,projectId)))throw Error('The saved response is unavailable.');
 const file=await env.FILES?.get(row.storage_key);if(!file)return {...metadata(row),error:'The saved response could not be loaded. Retry opening it.'};
 const run=JSON.parse(await file.text());if(run.id!==row.id||run.projectId!==projectId)throw Error('The saved response reference does not match.');
 return {...run,...(run.status==='completed'?{}:metadata(row))};
}
async function loadProject(env,owner,id){const row=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,id).first();return row?await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,withFinalReview((await readStoredProject(env,owner,row.document)).document))):null;}
// Follow-ups load one completed response from authenticated storage. Browser text
// never supplies conversation history, and an old receipt cannot become a current source.
export async function prepareContextualPacket(env,owner,p,normal,{actorId,projectId=p.id,forGeneration=false,packetStamp='',basePacketStamp=''}={}){
 let prior=null,current=false;
 if(normal.priorRunId){
  const row=await rowFor(env,owner,projectId,normal.priorRunId);
  if(!row||row.status!=='completed'||row.actor_id!==actorId)throw Error('Choose a completed response from this authenticated project context.');
  prior=await readRun(env,owner,projectId,row);
  try{
   if(prior.mode==='reason'){
    const currency=reasoningCurrency(p,prior);
    current=currency.size>0&&[...currency.values()].every(Boolean)&&prior.packet?.brainReceipt?.instructions?.sha256===instructionsPin().sha256;
   }else current=generationCurrent(p,generationReceipt(prior));
  }catch{/* Unreadable or changed basis stays explicitly historical. */}
  if(forGeneration&&!basePacketStamp)throw Error('Preview the current context before sending this follow-up.');
 }
 const packet=await prepareBrainPacket(env,owner,p,normal,{forGeneration,expectedStamp:prior?basePacketStamp:packetStamp});
 return prior?appendAdvisoryHistory(packet,prior,{projectId,actorId,request:normal,current,policy:aiPolicy(p)}):packet;
}
export async function adoptSavedIntelligence(env,owner,projectId,p,payload,at){
 const row=await rowFor(env,owner,projectId,payload.runId);if(!row)throw Error('Choose a saved response in this project.');
 // A model review's findings are advice for the chapter's picture (round 5, Contract R); they are not a passage,
 // a design option or a desk assessment. The one adoption a review takes is kind review-finding: a person records one
 // finding as a Chapter 11 delivery action through review.action (adoptReviewFinding in intelligence-context.js).
 if(row.mode==='review'&&payload.kind!=='review-finding')throw Error('Sol’s review findings are advice on the model; adopt one finding as a Chapter 11 action, or record what you decide through the chapter itself.');
 if(payload.kind==='review-finding'&&row.mode!=='review')throw Error('Choose a saved review of Sol’s.');
 if(payload.kind==='assessment'){if(row.mode!=='reason')throw Error('Choose a saved assessment of Sol’s.');return adoptReasoning(await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,p)),payload,await readRun(env,owner,projectId,row),at);}
 return adoptIntelligence(await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,p)),payload,await readRun(env,owner,projectId,row),at);
}
// One budget for every one of Sol's modes (audit B-11): the owner's requests in the last hour across projects,
// this project's requests in the last hour, and this project's tokens in the last day counted over both
// run tables (Sol's answers and its source searches). The owner's policy allows 0–120 requests an hour
// (operation-service.js); a project without a policy gets 30. The owner-wide cap is never below the default
// and never undercuts a project's own allowance.
const aiPolicy=p=>p.workspace?.aiPolicy||{enabled:true,hourlyRequests:DEFAULT_HOURLY_REQUESTS,dailyTokens:1000000};
// The interactive budget (the owner's hourly requests and daily tokens) covers Sol's requests from the screens. A
// drafting job's theme runs (mode 'architecture') are left out of it and admitted under the project's drafting budget
// (round 23, BR-06: a 1,400-requirement draft is about 40 themes, which the interactive budget would hold up for hours
// or stop half-way).
const SOL_BUDGET_SQL="(SELECT COUNT(*) FROM intelligence_runs WHERE owner_id=? AND mode NOT IN ('context-draft','architecture') AND created_at>?)<? AND (SELECT COUNT(*) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode NOT IN ('context-draft','architecture') AND created_at>?)<? AND (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode NOT IN ('context-draft','architecture') AND created_at>?) + (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM brain_retrieval_runs WHERE owner_id=? AND project_id=? AND created_at>?) + ? <= ?";
// The drafting budget the owner sets (aiPolicy.jobRequests, aiPolicy.jobTokens; jobBudgetOf): the theme runs and tokens
// the project's drafting jobs may use in any 24 hours, reservations counted until a response replaces them. It holds
// across jobs, so starting another job does not refill it.
const JOB_BUDGET_SQL="(SELECT COUNT(*) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode='architecture' AND created_at>?)<? AND (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode='architecture' AND created_at>?)+?<=?";
function solBudgetBinds(owner,projectId,policy,reservedTokens,now=Date.now()){
 const hour=new Date(now-3600000).toISOString(),day=new Date(now-86400000).toISOString(),hourly=policy.hourlyRequests??DEFAULT_HOURLY_REQUESTS;
 return [owner,hour,Math.max(DEFAULT_HOURLY_REQUESTS,hourly),owner,projectId,hour,hourly,owner,projectId,day,owner,projectId,day,reservedTokens,policy.dailyTokens??1000000];
}
// Which limit refused a reservation (round 41, FIX NOW 6), read after SOL_BUDGET_SQL refused it and named for the person:
// another request of this project still running, the owner's requests in the last hour across projects, this project's
// requests in the last hour, or this project's tokens in the last 24 hours (used, or still reserved) with this request's
// reservation. A refusal the counts no longer show (the window moved on) says so rather than guess.
async function budgetRefusal(env,owner,projectId,policy,reservedTokens,now=Date.now()){
 const hour=new Date(now-3600000).toISOString(),day=new Date(now-86400000).toISOString(),active=new Date(now-120000).toISOString(),hourly=policy.hourlyRequests??DEFAULT_HOURLY_REQUESTS,ownerHourly=Math.max(DEFAULT_HOURLY_REQUESTS,hourly),daily=policy.dailyTokens??1000000,n=v=>Number(v)||0,fmt=v=>n(v).toLocaleString('en-GB');
 const count=(sql,...binds)=>env.DB.prepare(sql).bind(...binds).first().then(r=>n(r?.n));
 if(await count("SELECT COUNT(*) AS n FROM intelligence_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?",owner,projectId,active))return 'Sol is already working on another request of this project.';
 if(await count("SELECT COUNT(*) AS n FROM intelligence_runs WHERE owner_id=? AND mode NOT IN ('context-draft','architecture') AND created_at>?",owner,hour)>=ownerHourly)return `Your hourly request budget across projects is used (${fmt(ownerHourly)} requests in the last hour).`;
 if(await count("SELECT COUNT(*) AS n FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode NOT IN ('context-draft','architecture') AND created_at>?",owner,projectId,hour)>=hourly)return `The project’s hourly request budget is used (${fmt(hourly)} requests in the last hour, set by the project owner in Operations).`;
 const held=await count("SELECT (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode NOT IN ('context-draft','architecture') AND created_at>?)+(SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM brain_retrieval_runs WHERE owner_id=? AND project_id=? AND created_at>?) AS n",owner,projectId,day,owner,projectId,day);
 if(held+reservedTokens>daily)return `The project’s daily token budget would be passed: ${fmt(held)} of its ${fmt(daily)} tokens are used or reserved in the last 24 hours, and this request reserves ${fmt(reservedTokens)}.`;
 return 'Sol is already working, or a request budget of this project has just been reached.';
}
// One architecture theme is one bounded Sol request (the draft and its source check are the passes of that request),
// on the same hourly/daily ledger as the other modes. A completed provider response is saved before the job's theme
// checkpoint: if the worker stops in that gap, the next lease reuses the response without sending or charging again.
export async function budgetedArchitectureDraft(env,owner,projectId,p,packet,{actor,jobId}){
 const policy=aiPolicy(p);
 if(policy.enabled===false)throw Object.assign(Error('The project owner disabled external AI processing.'),{code:'ai_disabled'});
 const objectId=('draft-theme:'+jobId).slice(0,100),inputStamp=packet.stamp,keyPrefix=prefix(owner,projectId);
 await releaseInterruptedRuns(env,{owner,projectId});
 const prior=(await env.DB.prepare("SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND object_id=? AND mode='architecture' AND input_stamp=? ORDER BY created_at DESC LIMIT 1").bind(owner,projectId,objectId,inputStamp).all()).results[0];
 if(prior&&(prior.status==='completed'||prior.status==='pending'||prior.status==='interrupted')){
  const file=await env.FILES.get(prior.storage_key);
  if(!file&&prior.status==='completed')throw integrityError('The saved architecture response is missing.',prior.storage_key);
  if(file){
   const saved=JSON.parse(await file.text());
   if(saved.id!==prior.id||saved.projectId!==projectId||saved.packetStamp!==inputStamp)throw integrityError('The saved architecture response does not match its theme.',prior.storage_key);
   if(saved.status==='completed'&&saved.response){
    if(prior.status!=='completed')await env.DB.prepare("UPDATE intelligence_runs SET status='completed',model=?,used_tokens=?,updated_at=? WHERE owner_id=? AND id=? AND status IN ('pending','interrupted')").bind(saved.response.model||prior.model,(saved.response.usage?.inputTokens||0)+(saved.response.usage?.outputTokens||0),saved.updatedAt,owner,prior.id).run();
    return saved.response;
   }
  }
  if(prior.status==='pending')throw Object.assign(Error('A previous architecture request is still pending.'),{code:'budget'});
 }
 const status=intelligenceStatus(env,'architecture');
 if(!status.configured)throw Object.assign(Error('The architecture provider is not configured.'),{code:'not_configured'});
 const id=crypto.randomUUID(),at=new Date().toISOString(),active=new Date(Date.now()-120000).toISOString(),key=keyPrefix+id+'.json';
 // Reserve room for the input plus two bounded draft/check passes; actual provider usage replaces this reservation.
 const reservedTokens=2*new TextEncoder().encode(JSON.stringify(packet)).length+24000;
 // The drafting budget (BR-06): spent when the project's theme runs of the last 24 hours reach the owner's request count
 // or would pass the token cap; the remaining themes then keep the rules skeleton (a final answer for this job, not a
 // pause: the job does not wait a day for the window to free).
 const budget=jobBudgetOf(policy),day=new Date(Date.now()-86400000).toISOString(),spent=await draftingSpent(env,owner,projectId);
 if(spent.runs>=budget.requests||spent.tokens+reservedTokens>budget.tokens)throw Object.assign(Error(`The project's drafting budget is spent: ${budget.requests.toLocaleString('en-GB')} model requests and ${budget.tokens.toLocaleString('en-GB')} tokens in 24 hours, set by the project owner in Operations. The remaining themes keep the rules skeleton.`),{code:'job_budget'});
 const inserted=await env.DB.prepare("INSERT OR IGNORE INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens) SELECT ?,?,?,?,'architecture',?,'pending',?,?,?,?,?,?,? WHERE "+JOB_BUDGET_SQL+" AND NOT EXISTS (SELECT 1 FROM intelligence_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner,id,projectId,objectId,inputStamp,status.provider,status.model,key,at,at,actor,reservedTokens,owner,projectId,day,budget.requests,owner,projectId,day,reservedTokens,budget.tokens,owner,projectId,active).run();
 if(!inserted.meta?.changes)throw Object.assign(Error('Another Sol request of this project is still running. The draft will resume automatically when it ends.'),{code:'budget'});
 let saved={id,projectId,jobId,packetStamp:inputStamp,status:'pending',actor,createdAt:at,updatedAt:at};
 try{
  await env.FILES.put(key,JSON.stringify(saved),{httpMetadata:{contentType:'application/json'}});
  const response=await requestArchitectureDraft(env,packet);
  saved={...saved,response,status:'completed',updatedAt:new Date().toISOString()};
  await env.FILES.put(key,JSON.stringify(saved),{httpMetadata:{contentType:'application/json'}});
  await env.DB.prepare("UPDATE intelligence_runs SET status='completed',model=?,used_tokens=?,updated_at=? WHERE owner_id=? AND id=? AND status='pending'").bind(response.model||status.model,(response.usage?.inputTokens||0)+(response.usage?.outputTokens||0),saved.updatedAt,owner,id).run();
  await operationStatement(env,owner,projectId,'ai',{id,actor,jobId,status:'completed',mode:'architecture',usage:response.usage,model:response.model,groundingAccepted:response.groundingReview?.accepted}).run();
  return response;
 }catch(e){
  // A saved completed response survives a later metadata or logging outage; never send the same packet again.
  try{const file=await env.FILES.get(key),held=file?JSON.parse(await file.text()):null;if(held?.status==='completed'&&held.response)return held.response;}catch{/* Preserve the original provider or storage error. */}
  // The tokens a failed run used (round 23; round 41 settleFailedRun, the same for every mode): what the provider billed
  // when that is the run's whole use, none when no call got an answer, and otherwise the reservation stands.
  const failedAt=new Date().toISOString();
  await env.DB.prepare("UPDATE intelligence_runs SET status='failed',error_code=?,used_tokens=?,updated_at=? WHERE owner_id=? AND id=? AND status='pending'").bind(e.code||'provider_unavailable',settleFailedRun(e),failedAt,owner,id).run();
  throw e;
 }
}
// Where a pending run is (round 5): the first provider call drafts, a second one checks. Each call carries its own
// abort signal (intelligence-provider.js timed), so a retry inside a call is not a new step. The step is written into
// the pending run's saved file, which runs?id= returns while the run is pending, so the surface that asked can say
// "drafting…" then "checking…" instead of standing still. The provider is reached as before: this only watches.
function stepFetcher(env,key,run){
 const seen=[];
 return async(url,init={})=>{
  const signal=init?.signal;
  if(signal&&!seen.includes(signal)&&seen.length<2){seen.push(signal);try{await env.FILES.put(key,JSON.stringify({...run,step:seen.length===1?'drafting':'checking'}),{httpMetadata:{contentType:'application/json'}});}catch{/* the surface falls back to the run's status */}}
  return globalThis.fetch(url,init);
 };
}
export async function handleIntelligence(request,env,owner,projectId){
 const url=new URL(request.url),action=url.pathname.slice('/api/intelligence/'.length);
 if(action==='draft')return handleIntelligenceDraft(request,env,owner,projectId);
 if(action==='status'&&request.method==='GET'){
  const asked=url.searchParams.get('mode'), mode=['reasoning','review','field','journey','architecture'].includes(asked)?asked:null;
  const status=intelligenceStatus(env,mode);
  // A named provider is probed with its own default model (round 23, M-08: a connection check per provider, cached a
  // minute as before); a name the registry does not hold is ignored and the mode's draft route is checked.
  const named=url.searchParams.get('provider'),listed=!!named&&status.providers.some(x=>x.name===named);
  if(url.searchParams.get('verify')==='1')await verifyConnection(env,listed?{provider:named}:{provider:status.route?.draft?.provider,model:status.route?.draft?.model});
  return json(intelligenceStatus(env,mode));
 }
 if(action==='runs'&&request.method==='GET'){
  const p=await loadProject(env,owner,projectId);if(!p)return json({error:'Open a project in your account first.'},404);
  const id=url.searchParams.get('id');
  if(id){const row=await rowFor(env,owner,projectId,id);if(!row)return json({error:'This response is unavailable for your project.'},404);const run=await readRun(env,owner,projectId,row);return json({...run,current:run.status==='completed'?generationCurrent(p,generationReceipt(run)):false});}
  const objectId=url.searchParams.get('object')||'';
  const rows=await env.DB.prepare("SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND object_id=? AND mode<>'context-draft' ORDER BY created_at DESC LIMIT 12").bind(owner,projectId,objectId).all();return json({runs:rows.results.map(metadata)});
 }
 if(action==='reasonings'&&request.method==='GET'){
  // Every assessed item keeps its newest assessment on display, however many runs came after it: the newest
  // runs are read in turn, and a run is returned when it holds the newest assessment of an item not yet seen.
  // An exact item explicitly asks for its saved history instead. Batch runs are
  // matched by their assessments, never by the SQL object_id (which is a scope).
  const item=url.searchParams.has('item')?url.searchParams.get('item'):null;
  if(item!==null){try{if(reasoningRequest({task:'decisions',ids:[item]}).ids[0]!==item)return json({error:'Choose an exact assessed item for its history.'},400);}catch{return json({error:'Choose an exact assessed item for its history.'},400);}}
  const project=item!==null?await loadProject(env,owner,projectId):null;
  if(item!==null&&!project)return json({error:'Open a project in your account first.'},404);
  const rows=await env.DB.prepare("SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode='reason' AND status='completed' ORDER BY created_at DESC LIMIT 400").bind(owner,projectId).all();
  const runs=[],seen=new Set(),limit=item!==null?20:120;let scanned=0,unreadable=0;
  for(const row of rows.results){
   if(runs.length>=limit)break;scanned++;
   try{
    const run=await readRun(env,owner,projectId,row),ids=(run.result?.assessments||[]).map(a=>a.id),fresh=item!==null?ids.filter(id=>id===item):ids.filter(id=>!seen.has(id));
    if(run.status!=='completed'||!fresh.length){if(run.error)unreadable++;continue;}
    fresh.forEach(id=>seen.add(id));let current=false;
    if(item!==null){try{current=reasoningCurrency(project,run).get(item)===true&&run.packet.brainReceipt?.instructions?.sha256===instructionsPin().sha256;}catch{/* An unreadable basis is historical, never presumed current. */}}
    runs.push({id:run.id,createdAt:run.createdAt,provider:run.provider,model:run.model,...(item!==null?{historyItem:item,current}:{}),packet:{stamp:run.packet.stamp,request:run.packet.request,items:run.packet.items,...(item!==null?{brainReceipt:run.packet.brainReceipt}:{}),sources:run.packet.sources.map(s=>({ref:s.ref,kind:s.kind,objectId:s.objectId,title:s.title,posture:s.posture,receipt:s.receipt||null,excerpt:s.excerpt,...(item!==null?{id:s.id,revision:s.revision,passage:s.passage,versionStamp:s.versionStamp,truncated:s.truncated,applicableTo:s.applicableTo}: {})}))},result:run.result,groundingReview:{accepted:run.groundingReview?.accepted,withheld:run.groundingReview?.withheld||[]}});
   }catch{unreadable++;}
  }
  return json({runs,...(item!==null?{history:{item,limit,scanLimit:400,scanned,returned:runs.length,unreadable,limitReached:runs.length===limit,scanLimitReached:scanned===400,availability:'Up to 20 matching assessments from the most recent 400 completed reasoning runs. Unreadable saved responses are omitted; this is a bounded history, not a complete archive.'}}:{})});
 }
 if(['reasoning-context','reason'].includes(action)&&request.method==='POST')return handleReasoning(request,env,owner,projectId,action,url);
 if(['field-context','field'].includes(action)&&request.method==='POST')return handleFieldDraft(request,env,owner,projectId,action,url);
 if(['journey-context','journey'].includes(action)&&request.method==='POST')return handleJourneyDraft(request,env,owner,projectId,action,url);
 if(['review-context','review'].includes(action)&&request.method==='POST')return handleModelReview(request,env,owner,projectId,action,url);
 if(action==='review-runs'&&request.method==='GET'){
  // Sol's completed model reviews in this project, newest first (all chapters, or ?chapter=N), for the picture's marks.
  const chapter=Number(url.searchParams.get('chapter'));const rows=await env.DB.prepare("SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode='review' AND status='completed'"+(Number.isInteger(chapter)&&chapter>=1&&chapter<=11?' AND object_id=?':'')+' ORDER BY created_at DESC LIMIT 20').bind(owner,projectId,...(Number.isInteger(chapter)&&chapter>=1&&chapter<=11?['review:'+chapter]:[])).all();
  const runs=[];for(const row of rows.results){try{const run=await readRun(env,owner,projectId,row);if(run.status==='completed'&&run.request)runs.push({id:run.id,createdAt:run.createdAt,provider:run.provider,model:run.model,request:run.request,result:run.result,instructions:run.instructions,packetStamp:run.packet?.stamp,packetBasis:reviewBasisPacket(run.packet),accepted:!!run.groundingReview?.accepted});}catch{/* an unreadable run is left out of the list */}}
  return json({runs});
 }
 if(action==='field-runs'&&request.method==='GET'){
  // Sol's completed field drafts in this project, newest first, for the Co-author panel (round 2, I2-12).
  const rows=await env.DB.prepare("SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode='field' AND status='completed' ORDER BY created_at DESC LIMIT 40").bind(owner,projectId).all();
  const runs=[];for(const row of rows.results){try{const run=await readRun(env,owner,projectId,row);if(run.status==='completed'&&run.request)runs.push({id:run.id,createdAt:run.createdAt,provider:run.provider,model:run.model,request:run.request,result:run.result,instructions:run.instructions,packetStamp:run.packet?.stamp,accepted:!!run.groundingReview?.accepted});}catch{/* an unreadable run is left out of the list */}}
  return json({runs});
 }
 if(!['context','generate'].includes(action)||request.method!=='POST')return json({error:'Intelligence action not found.'},404);
 if(request.headers.get('Origin')!==url.origin)return json({error:'Use Sol from your private workbench.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected a design request.'},415);
 const bytes=await request.text();if(bytes.length>8000)return json({error:'Keep the request within 2,000 characters.'},413);
 let raw,normal;try{raw=JSON.parse(bytes);normal=intelligenceRequest(raw);}catch(e){return json({error:publicMessage(e)},400);}
 const p=await loadProject(env,owner,projectId);if(!p)return json({error:'Open a project in your account first.'},404);
 const policy=aiPolicy(p);if(policy.enabled===false&&(normal.semantic||action==='generate'))return json({error:'The project owner has disabled external AI processing.'},403);
 if(action==='context'){try{return json({packet:await prepareContextualPacket(env,owner,p,normal,{actorId:request.headers.get('oai-authenticated-user-id'),projectId})});}catch(e){return json({error:publicMessage(e)},400);}}
 if(!env.FILES)return json({error:'Private response storage is unavailable. No request was sent.'},503);
 if(!/^[a-f0-9-]{36}$/.test(raw.requestId||''))return json({error:'Start a new request from Sol.'},400);
 const inputStamp=changeFingerprint({request:normal,packetStamp:raw.packetStamp}),existing=await rowFor(env,owner,projectId,raw.requestId);
 if(existing){if(existing.input_stamp!==inputStamp)return json({error:'This request identifier belongs to different input. Start a new request.'},409);return json(await readRun(env,owner,projectId,existing));}
 const status=intelligenceStatus(env);if(!status.configured)return json({error:'LLM connection is not configured. Project guidance remains available.',configuration:status},503);
 let packet;try{packet=await prepareContextualPacket(env,owner,p,normal,{actorId:request.headers.get('oai-authenticated-user-id'),projectId,forGeneration:true,packetStamp:raw.packetStamp,basePacketStamp:raw.basePacketStamp});}catch(e){return json({error:publicMessage(e)},400);}
 if(packet.stamp!==raw.packetStamp)return json({error:'The context changed. Review the sources again before sending.',conflict:true},409);
 const at=new Date().toISOString(),active=new Date(Date.now()-120000).toISOString(),key=prefix(owner,projectId)+raw.requestId+'.json';
 const reservedTokens=2*new TextEncoder().encode(JSON.stringify(packet)).length+188000;
 // A run cut off mid-flight (round 2, B2-11) releases its reservation before this one is counted against the budget.
 await releaseInterruptedRuns(env,{owner,projectId});
 const inserted=await env.DB.prepare("INSERT OR IGNORE INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens) SELECT ?,?,?,?,?,?,'pending',?,?,?,?,?,?,? WHERE "+SOL_BUDGET_SQL+" AND NOT EXISTS (SELECT 1 FROM intelligence_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner,raw.requestId,projectId,normal.objectId,normal.mode,inputStamp,status.provider,status.model,key,at,at,request.headers.get('oai-authenticated-user-id'),reservedTokens,...solBudgetBinds(owner,projectId,policy,reservedTokens),owner,projectId,active).run();
 if(!inserted.meta?.changes)return json({error:(await budgetRefusal(env,owner,projectId,policy,reservedTokens))+' Reopen saved requests before trying again.'},429);
 let run={actor:request.headers.get('oai-authenticated-user-id'),id:raw.requestId,projectId,objectId:normal.objectId,mode:normal.mode,status:'pending',provider:status.provider,model:status.model,createdAt:at,updatedAt:at,packet};
 try{
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  const generated=await requestIntelligence(env,packet);run={...run,...generated,status:'completed',updatedAt:new Date().toISOString()};
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  await env.DB.prepare("UPDATE intelligence_runs SET status='completed',model=?,updated_at=?,used_tokens=? WHERE owner_id=? AND id=?").bind(run.model,run.updatedAt,run.usage.inputTokens+run.usage.outputTokens,owner,run.id).run();
  await operationStatement(env,owner,projectId,'ai',{id:run.id,actor:run.actor,status:'completed',usage:run.usage,model:run.model,groundingAccepted:run.groundingReview.accepted}).run();
  const currentProject=await loadProject(env,owner,projectId);return json({...run,current:generationCurrent(currentProject,generationReceipt(run))});
 }catch(e){
  const code=e.code||'storage',failed={...run,status:'failed',updatedAt:new Date().toISOString(),error:genericError(code),...providerFailure(e)};
  // If a completed response reached R2, retain it even if the metadata write failed.
  try{const saved=await env.FILES.get(key),value=saved?JSON.parse(await saved.text()):null;if(value?.status==='completed')return json({...value,current:generationCurrent(p,generationReceipt(value))});}catch{}
  try{await env.FILES.put(key,JSON.stringify({...failed,result:undefined}),{httpMetadata:{contentType:'application/json'}});}catch{}
  await env.DB.prepare("UPDATE intelligence_runs SET status='failed',error_code=?,used_tokens=?,updated_at=? WHERE owner_id=? AND id=?").bind(code,settleFailedRun(e),failed.updatedAt,owner,run.id).run();
  return failedAnswer(failed,code);
 }
}

// Sol's assessments at the review desk and in the chapter models: the packet is prepared and shown
// first (reasoning-context), then sent (reason) only if it is still the packet the architect saw. Same budgets, storage and
// replay rules as every other Sol request; nothing is applied.
async function handleReasoning(request,env,owner,projectId,action,url){
 if(request.headers.get('Origin')!==url.origin)return json({error:'Use Sol from your private workbench.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected a reasoning request.'},415);
 const bytes=await request.text();if(bytes.length>40000)return json({error:'Ask Sol about fewer decisions at a time.'},413);
 let raw,normal;try{raw=JSON.parse(bytes);normal=reasoningRequest(raw);}catch(e){return json({error:publicMessage(e)},400);}
 const p=await loadProject(env,owner,projectId);if(!p)return json({error:'Open a project in your account first.'},404);
 const policy=aiPolicy(p);
 if(action==='reasoning-context'){try{return json({packet:await prepareContextualPacket(env,owner,p,normal,{actorId:request.headers.get('oai-authenticated-user-id'),projectId}),configuration:intelligenceStatus(env,'reasoning')});}catch(e){return json({error:publicMessage(e)},400);}}
 if(policy.enabled===false)return json({error:'The project owner has disabled external AI processing.'},403);
 if(!env.FILES)return json({error:'Private response storage is unavailable. No request was sent.'},503);
 if(!/^[a-f0-9-]{36}$/.test(raw.requestId||''))return json({error:'Start a new request from the desk.'},400);
 const inputStamp=changeFingerprint({request:normal,packetStamp:raw.packetStamp}),existing=await rowFor(env,owner,projectId,raw.requestId);
 if(existing){if(existing.input_stamp!==inputStamp)return json({error:'This request identifier belongs to different input. Start a new request.'},409);return json(await readRun(env,owner,projectId,existing));}
 const status=intelligenceStatus(env,'reasoning');if(!status.configured)return json({error:'LLM connection is not configured. The desk’s readings and drafts remain available.',configuration:status},503);
 let packet;try{packet=await prepareContextualPacket(env,owner,p,normal,{actorId:request.headers.get('oai-authenticated-user-id'),projectId,forGeneration:true,packetStamp:raw.packetStamp,basePacketStamp:raw.basePacketStamp});}catch(e){return json({error:publicMessage(e)},400);}
 if(packet.stamp!==raw.packetStamp)return json({error:'The desk changed. Review what Sol will read again before sending.',conflict:true},409);
 const at=new Date().toISOString(),active=new Date(Date.now()-120000).toISOString(),key=prefix(owner,projectId)+raw.requestId+'.json';
 const reservedTokens=3*new TextEncoder().encode(JSON.stringify(packet)).length+24000;
 await releaseInterruptedRuns(env,{owner,projectId});
 const inserted=await env.DB.prepare("INSERT OR IGNORE INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens) SELECT ?,?,?,?,'reason',?,'pending',?,?,?,?,?,?,? WHERE "+SOL_BUDGET_SQL+" AND NOT EXISTS (SELECT 1 FROM intelligence_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner,raw.requestId,projectId,normal.scope.slice(0,100),inputStamp,status.provider,status.model,key,at,at,request.headers.get('oai-authenticated-user-id'),reservedTokens,...solBudgetBinds(owner,projectId,policy,reservedTokens),owner,projectId,active).run();
 if(!inserted.meta?.changes)return json({error:(await budgetRefusal(env,owner,projectId,policy,reservedTokens))+' Its earlier assessments stay on the desk.'},429);
 let run={actor:request.headers.get('oai-authenticated-user-id'),id:raw.requestId,projectId,objectId:normal.scope,mode:'reason',status:'pending',provider:status.provider,model:status.model,createdAt:at,updatedAt:at,packet,instructions:packet.brainReceipt?.instructions||instructionsPin()};
 try{
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  const reasoned=await requestReasoning(env,packet,{check:r=>checkRecordRefinements(p,packet,r),fetcher:stepFetcher(env,key,run)});run={...run,...reasoned,status:'completed',updatedAt:new Date().toISOString()};
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  await env.DB.prepare("UPDATE intelligence_runs SET status='completed',model=?,updated_at=?,used_tokens=? WHERE owner_id=? AND id=?").bind(run.model,run.updatedAt,run.usage.inputTokens+run.usage.outputTokens,owner,run.id).run();
  await operationStatement(env,owner,projectId,'ai',{id:run.id,actor:run.actor,status:'completed',usage:run.usage,model:run.model,groundingAccepted:run.groundingReview.accepted}).run();
  return json(run);
 }catch(e){
  // A response that fails the structure checks says which check (the validator's own words, never model text).
  const code=e.code||'storage',failed={...run,status:'failed',updatedAt:new Date().toISOString(),error:genericError(code),...providerFailure(e),...(code==='invalid_output'&&e.message?{detail:String(e.message).slice(0,300)}:{})};
  try{await env.FILES.put(key,JSON.stringify({...failed,result:undefined}),{httpMetadata:{contentType:'application/json'}});}catch{}
  await env.DB.prepare("UPDATE intelligence_runs SET status='failed',error_code=?,used_tokens=?,updated_at=? WHERE owner_id=? AND id=?").bind(code,settleFailedRun(e),failed.updatedAt,owner,run.id).run();
  return failedAnswer(failed,code);
 }
}

// A completed Sol run of this owner and project, read from storage, or null (worker.js checks `solSuggestions` with it).
export async function savedRun(env,owner,projectId,id){
 if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))return null;
 const row=await rowFor(env,owner,projectId,id);if(!row||row.status!=='completed')return null;
 try{const run=await readRun(env,owner,projectId,row);return run.status==='completed'?run:null;}catch{return null;}
}

// ---------------------------------------------------------------- Sol drafts one field (round 2, I2-12; mode 'field')

// What the spark asks for: one free-text field of one record type, the saved record it edits (or none), the form's
// other free-text values and the links it has chosen. Numbers, owners, identifiers and evidence are not drafted.
const ID=/^[\w:.-]{1,120}$/;
export function fieldRequest(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Choose a field for Sol to draft.');
 const command=String(raw.command||''),field=String(raw.field||'');
 if(!supported(command)||!sparkFields(command).some(d=>d.name===field))throw Error('Choose a free-text field of a record this chapter edits.');
 if(!draftable(command,field))throw Error('Sol does not draft owners, identifiers, evidence, sources or the basis of a number. A person records them.');
 if(raw.recordId!=null&&raw.recordId!==''&&(typeof raw.recordId!=='string'||!ID.test(raw.recordId)))throw Error('Choose an existing record.');
 const values={},links={};let size=0;
 for(const d of sparkFields(command)){const v=raw.values?.[d.name];if(typeof v==='string'&&v.trim()){const t=v.trim().slice(0,2400);values[d.name]=t;size+=t.length;}}
 if(size>9000)throw Error('Shorten the form’s text before asking Sol.');
 // The links the form chose: its described id lists and choices, and the links the rules follow (LINK_FIELDS).
 const linkNames=new Set([...fieldsFor(command).filter(d=>d.kind==='ids'||d.kind==='select').map(d=>d.name),...LINK_FIELDS]);
 for(const name of linkNames){const v=raw.links?.[name];if(Array.isArray(v))links[name]=[...new Set(v.filter(x=>typeof x==='string'&&ID.test(x)))].slice(0,24);else if(typeof v==='string'&&(v===''||ID.test(v)))links[name]=v;}
 return {command,field,recordId:raw.recordId||null,values,links};
}
// The packet for one field: the record as the form holds it (free text only), the chapter's reading of the saved
// record, the parent a new record hangs from, the requirements and quality drivers it answers to, and governed claims
// (released, reviewed, linked; never candidate or discovery knowledge). Disclosure policy and redaction as everywhere.
const FIELD_SOURCES=10,FIELD_CHARS=12000;
export function fieldPacket(p,raw){
 const request=fieldRequest(raw),{command,field}=request,policy=p.workspace?.aiPolicy||{},excluded=new Set(policy.excludedObjectIds||[]);
 // The brief and the narrative are single records with no id of their own: the form edits the saved one even
 // when it names no record.
 const saved=request.recordId||singletonId(command)?recordOf(p,command,request.recordId):null;
 if(request.recordId&&!saved)throw Error('This record is no longer in the project. Reopen it before asking Sol.');
 const r=workingRecord(p,command,{recordId:request.recordId,values:{...request.links,...request.values}}),parent=parentOf(p,command,r),d=fieldOf(command,field);
 if((request.recordId&&excluded.has(request.recordId))||(parent?.id&&excluded.has(parent.id)))throw Error('The project disclosure policy excludes this record from LLM requests.');
 const sources=[],omissions=[];let chars=0,withheld=0,criticalWithheld=0;
 const add=(s,must=false)=>{
  if(disclosureSourceExcluded(s,excluded)){withheld++;if(['parent','requirement','quality-driver','architecture-driver'].includes(s.kind))criticalWithheld++;return null;}
  if(sources.length>=FIELD_SOURCES||chars+s.excerpt.length>FIELD_CHARS){if(must)throw Error('This record does not fit in one request.');omissions.push({id:s.id,title:s.title,reason:sources.length>=FIELD_SOURCES?'source limit':'character budget'});return null;}
  const ref='S'+(sources.length+1);sources.push({...s,ref});chars+=s.excerpt.length;return ref;
 };
 // A field that is open (open-fields.js: a placeholder such as "Open question: …" or "Unassigned", or a recorded open
 // state with nothing typed) holds no value (rc41 IMPROVEMENTS-2026-10-29, item 1): S1 lists it under open with its
 // question, never as recorded text; the target sends it as target.open with no current value; the retrieval query reads
 // the field's meaning instead of the placeholder. An empty field with no recorded state stays notRecorded, and text the
 // architect typed is a value whatever open state the saved record keeps.
 const openOf=k=>{const v=String(r[k]??'').trim();if(v&&!isOpenText(v))return null;const o=fieldOpen(r,k);return o&&(v||!o.derived)?{state:o.state,question:String(o.question||'').slice(0,600)}:null;};
 const text=sparkFields(command).map(x=>x.name),open=Object.fromEntries(text.map(k=>[k,openOf(k)]).filter(([,o])=>o)),recorded=Object.fromEntries(text.filter(k=>!open[k]&&String(r[k]??'').trim()).map(k=>[k,String(r[k]).trim().slice(0,1200)]));
 // A saved record by its reference and title (the brief and the narrative are singletons with no id; a decision is
 // titled by its question); a new one by what it is ("A new quality scenario").
 const label=saved?(command==='brief'?`Project brief ${saved.title||saved.name||''}`:`${saved.ref||saved.id||singletonId(command)||''} ${saved.title||saved.question||saved.name||''}`).trim():`A new ${recordNoun(command,r)}`;
 add({id:'record:'+(request.recordId||command),kind:'record',objectId:request.recordId||null,title:label,posture:'The record as the open form holds it: its free-text fields, saved or not yet saved. What the architect typed is not yet recorded fact.'+(Object.keys(open).length?' A field under open holds no value yet: it is not stated, or an open question no source has answered.':''),excerpt:JSON.stringify({record:label,type:command,field:{name:field,label:d?.label||field},recorded,...(Object.keys(open).length?{open}:{}),notRecorded:text.filter(k=>!recorded[k]&&!open[k])}).slice(0,3000),truncated:false},true);
 const type=Object.entries(RECORD_TYPES).find(([,T])=>T.command===command)?.[0];let chapterSource=null;
 if(saved&&type){try{const R=chapterReading(p,`M:${RECORD_TYPES[type].chapter}:${saved.id||'SDD'}`);if(R?.reading){const body=JSON.stringify(fitReading(R.reading,3000));chapterSource={id:'reading:'+(saved.id||'SDD'),kind:'chapter-reading',objectId:saved.id||null,title:`Chapter ${RECORD_TYPES[type].chapter}’s reading of ${label}`,posture:'The chapter’s reading of its own record: recorded facts, the journey’s checks and the desk’s vitals — design arithmetic, not measurement.',excerpt:body,truncated:JSON.stringify(R.reading).length>body.length};}}catch{/* a record without a reading is read from the form alone */}}
 if(parent&&parent.id!==request.recordId){const fields=Object.fromEntries(Object.entries(parent).filter(([k,v])=>typeof v==='string'&&v.trim()&&!['id','sourceSnapshot','origin','ref','type'].includes(k)).map(([k,v])=>[k,v.slice(0,600)]));add({id:'parent:'+parent.id,kind:'parent',objectId:parent.id,title:`${parent.ref||parent.id} ${parent.title||parent.question||parent.description||''}`.trim().slice(0,160),posture:'The record this one hangs from, as saved.',excerpt:JSON.stringify(fields).slice(0,1800),truncated:false});}
 // The record's own neighbours by chapter (round 11; neighboursOf in field-suggestions.js): a component's
 // responsibilities with their purposes, a contract's two components, a control's threats, a plan's component and
 // capability. They come before the requirements, drivers and claims, so that when the budget trims, the sources of
 // lower value to this field's draft go first (claims, then drivers, then requirements), never the record's neighbours.
 const rel=relatedOf(p,command,r);
 for(const n of rel.neighbours.filter(n=>n.id!==parent?.id&&n.id!==request.recordId))add({id:'neighbour:'+n.id,kind:'neighbour',objectId:n.id,title:`${n.ref||n.id} ${n.title}`.trim().slice(0,160),posture:`${n.chapter?`A Chapter ${n.chapter} ${n.noun}`:`A ${n.noun}`}, ${n.relation}, as saved. A neighbour says what this record works with; it is not evidence about this record.`,excerpt:JSON.stringify({[n.noun]:n.title,relation:n.relation,...n.fields}).slice(0,1400),truncated:false});
 for(const q of rel.requirements.filter(q=>q.id!==parent?.id))add({id:'requirement:'+q.id,kind:'requirement',objectId:q.id,title:`${q.id} ${q.title}`,posture:`A Chapter 1 requirement, ${q.confirmed?'confirmed by the architect':'not yet confirmed'}. A requirement states a need, not evidence that it is met.`,excerpt:JSON.stringify({description:q.description,acceptance:q.acceptance,priority:q.priority}).slice(0,1200),truncated:false});
 for(const x of rel.drivers){const quality=isQualityDriver(x);add({id:'driver:'+x.id,kind:quality?'quality-driver':'architecture-driver',objectId:x.id,title:`${x.id} ${x.title}`,posture:quality?`A Chapter 2 quality scenario; its target is ${x.targetConfirmed?'confirmed':'unconfirmed'}. Neither state is a measured outcome.`:`A Chapter 2 ${driverKind(x)} driver; preserve its stated scope and force. No quality target is inferred.`,excerpt:JSON.stringify({kind:driverKind(x),description:x.description,impact:x.impact,category:x.category,priority:x.priority,confirmed:x.confirmed,...(quality?{stimulus:x.stimulus,conditions:x.conditions,response:x.response,target:`${x.operator||''} ${x.targetValue??''} ${x.unit||''}`.trim(),measurement:x.measurement}:{}),tactic:x.tactic,scope:driverScope(p,x)}),truncated:false});}
 const claimIds=[];
 try{
  const anchor=request.recordId||parent?.id;
  if(anchor){
   const selection={chapter:chapterOf(command),id:anchor},c=brainContext(p,selection);
   if(c.selected.id!=='project'){
    const query=[d?.label,r.title,open[field]?fieldHelp(command,field):recorded[field]].filter(Boolean).join(' '),reading=architectureIntelligence(p,selection,{context:c,prompt:query,limit:4});
    // A saved parent or driver already has a place in this packet. Expand that
    // same source to its complete canonical record instead of paying another
    // source slot for a duplicate. The unsaved form remains a distinct source.
    for(const s of reading.sources.filter(s=>s.kind==='model')){
     const current=sources.find(x=>x.kind!=='record'&&x.objectId===s.objectId);
     if(current&&chars-current.excerpt.length+s.excerpt.length<=FIELD_CHARS){chars+=s.excerpt.length-current.excerpt.length;Object.assign(current,{id:s.id,versionStamp:s.versionStamp,excerpt:s.excerpt,truncated:s.truncated});}
    }
    const packed=packArchitectureIntelligence([reading],{sources,maxCharacters:FIELD_CHARS,maxSources:FIELD_SOURCES,excluded});
    sources.splice(0,sources.length,...packed.sources.map((s,i)=>({...s,ref:s.ref||'S'+(i+1)})));chars=packed.characters;
    if(packed.omitted)omissions.push({id:'architecture-intelligence:omitted',title:`${packed.omitted} contextual insights omitted`,reason:'Complete source basis did not fit the disclosed context'});
    // A bounded field request may not fit every dependency of a deduction. Its
    // exact source can still pose a conditional question, without claiming fit.
    for(const s of reading.sources.filter(s=>['governed-claim','catalogue-description'].includes(s.kind)))if(!sources.some(x=>x.id===s.id))add(s);
    for(const s of brainSources(p,architectureBrain(p,c,{query,limit:3})).filter(x=>x.kind==='governed-claim'))if(!sources.some(x=>x.id===s.id))add(s);
   }
  }
 }catch{omissions.push({id:'architecture-intelligence',title:'The contextual architecture reading could not be prepared.',reason:'context unavailable'});}
 if(chapterSource){if(containsExcludedRecord(saved,excluded))omissions.push({id:chapterSource.id,title:'The chapter reading depends on an excluded child record.',reason:'disclosure policy'});else add(chapterSource);}
 claimIds.push(...sources.filter(s=>s.kind==='governed-claim').map(s=>s.objectId));
 const redact=t=>redactSecrets(policy.redactContacts?String(t).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email redacted]').replace(/(?<![\w.-])\+?\d[\d ()-]{8,}\d(?![\w.-])/g,'[phone-like value redacted]'):t);
 if(withheld)omissions.push({id:'disclosure-policy',title:`${withheld} source${withheld===1?'':'s'} excluded by the project disclosure policy`,reason:'disclosure policy'});
 const packet={version:1,task:'field-draft',request:{command,field,recordId:request.recordId,parentId:parent?.id||null},
  target:{command,field,label:d?.label||field,kind:d?.kind||'textarea',help:fieldHelp(command,field),maxLength:maxLengthOf(command,field),current:open[field]?'':redact(String(r[field]??'').trim().slice(0,2400)),...(open[field]?{open:{state:open[field].state,question:redact(open[field].question)}}:{}),record:label},
  sources:sources.map(s=>({...s,title:redact(s.title),excerpt:redact(s.excerpt)})),omissions,coverage:{characters:chars,maxCharacters:FIELD_CHARS,sourceCount:sources.length,maxSources:FIELD_SOURCES},
  brainReceipt:{engine:BRAIN_ENGINE,policy:BRAIN_POLICY,reasoning:'aiw-field-draft-1',instructions:fieldInstructionsPin(),claimIds,scoring:false},
  disclosure:{version:2,redactContacts:!!policy.redactContacts,redactSecrets:true,excludedObjectCount:excluded.size,withheldSources:withheld}};
 packet.criticalContext={complete:!rel.omitted.requirements&&!rel.omitted.drivers&&!criticalWithheld&&!omissions.some(x=>/^(requirement|driver):/.test(x.id)),omittedRequirements:rel.omitted.requirements,omittedDrivers:rel.omitted.drivers,policy:'Omitted drivers or requirements cannot be assumed satisfied. Field wording does not establish component suitability.'};
 const safe=discloseIntelligenceValue(packet,policy,excluded);
 return {...safe,stamp:digest(safe)};
}
// Prepared first (field-context: the packet, nothing sent), then sent (field) only if it is still the packet the
// architect saw. Same budget, storage, replay and receipts as Sol's other paths; nothing is applied.
async function handleFieldDraft(request,env,owner,projectId,action,url){
 if(request.headers.get('Origin')!==url.origin)return json({error:'Use Sol from your private workbench.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected a field request.'},415);
 const bytes=await request.text();if(bytes.length>20000)return json({error:'Shorten the form’s text before asking Sol.'},413);
 let raw,normal;try{raw=JSON.parse(bytes);normal=fieldRequest(raw);}catch(e){return json({error:publicMessage(e)},400);}
 const p=await loadProject(env,owner,projectId);if(!p)return json({error:'Open a project in your account first.'},404);
 const policy=aiPolicy(p);
 if(action==='field-context'){try{return json({packet:fieldPacket(p,normal),configuration:intelligenceStatus(env,'field')});}catch(e){return json({error:publicMessage(e)},400);}}
 if(policy.enabled===false)return json({error:'The project owner has disabled external AI processing.'},403);
 if(!env.FILES)return json({error:'Private response storage is unavailable. No request was sent.'},503);
 if(!/^[a-f0-9-]{36}$/.test(raw.requestId||''))return json({error:'Start a new draft from the field.'},400);
 const inputStamp=changeFingerprint({request:normal,packetStamp:raw.packetStamp}),existing=await rowFor(env,owner,projectId,raw.requestId);
 if(existing){if(existing.input_stamp!==inputStamp)return json({error:'This request identifier belongs to different input. Start a new request.'},409);return json(await readRun(env,owner,projectId,existing));}
 const status=intelligenceStatus(env,'field');if(!status.configured)return json({error:'LLM connection is not configured. The rule-based suggestions remain available.',configuration:status},503);
 let packet;try{packet=fieldPacket(p,normal);}catch(e){return json({error:publicMessage(e)},400);}
 if(packet.stamp!==raw.packetStamp)return json({error:'The record or its sources changed. Review what Sol will read again before sending.',conflict:true},409);
 const at=new Date().toISOString(),active=new Date(Date.now()-120000).toISOString(),key=prefix(owner,projectId)+raw.requestId+'.json';
 const reservedTokens=3*new TextEncoder().encode(JSON.stringify(packet)).length+8000,objectId=(normal.recordId||packet.request.parentId||normal.command).slice(0,100);
 await releaseInterruptedRuns(env,{owner,projectId});
 const inserted=await env.DB.prepare("INSERT OR IGNORE INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens) SELECT ?,?,?,?,'field',?,'pending',?,?,?,?,?,?,? WHERE "+SOL_BUDGET_SQL+" AND NOT EXISTS (SELECT 1 FROM intelligence_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner,raw.requestId,projectId,objectId,inputStamp,status.provider,status.model,key,at,at,request.headers.get('oai-authenticated-user-id'),reservedTokens,...solBudgetBinds(owner,projectId,policy,reservedTokens),owner,projectId,active).run();
 if(!inserted.meta?.changes)return json({error:(await budgetRefusal(env,owner,projectId,policy,reservedTokens))+' The rule-based suggestions remain available.'},429);
 let run={actor:request.headers.get('oai-authenticated-user-id'),id:raw.requestId,projectId,objectId,mode:'field',status:'pending',provider:status.provider,model:status.model,createdAt:at,updatedAt:at,request:packet.request,packet,instructions:fieldInstructionsPin()};
 try{
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  const drafted=await requestFieldDraft(env,packet,{fetcher:stepFetcher(env,key,run)});run={...run,...drafted,status:'completed',updatedAt:new Date().toISOString()};
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  await env.DB.prepare("UPDATE intelligence_runs SET status='completed',model=?,updated_at=?,used_tokens=? WHERE owner_id=? AND id=?").bind(run.model,run.updatedAt,run.usage.inputTokens+run.usage.outputTokens,owner,run.id).run();
  await operationStatement(env,owner,projectId,'ai',{id:run.id,actor:run.actor,status:'completed',usage:run.usage,model:run.model,groundingAccepted:run.groundingReview.accepted}).run();
  return json(run);
 }catch(e){
  const code=e.code||'storage',failed={...run,status:'failed',updatedAt:new Date().toISOString(),error:genericError(code),...providerFailure(e),...(code==='invalid_output'&&e.message?{detail:String(e.message).slice(0,300)}:{})};
  try{await env.FILES.put(key,JSON.stringify({...failed,result:undefined}),{httpMetadata:{contentType:'application/json'}});}catch{/* the row below still records the failure */}
  await env.DB.prepare("UPDATE intelligence_runs SET status='failed',error_code=?,used_tokens=?,updated_at=? WHERE owner_id=? AND id=?").bind(code,settleFailedRun(e),failed.updatedAt,owner,run.id).run();
  return failedAnswer(failed,code);
 }
}

// ---------------------------------------------------------------- the journey: one chapter drafted (round 4; mode 'journey')

// The interpreted brief (shared/brief-interpreter.js, Contract 1), read from the brief the project stores. The reader is
// loaded when first asked for, so that a server without it still starts and says what is missing.
let interpreter=null;
async function interpretedBrief(p){
 interpreter??=import('./shared/brief-interpreter.js').then(m=>m.interpretBrief,()=>{interpreter=null;return null;});
 const interpret=await interpreter;
 if(typeof interpret!=='function')throw Object.assign(Error('The brief reader is not available on this server. Nothing was drafted.'),{status:503});
 const source=briefSource(p);
 if(!source.text.trim())throw Object.assign(Error('Write the project brief before drafting from it.'),{status:400});
 return {brief:interpret(source.text,{name:p.name}),source:{sourceId:source.sourceId,kept:source.kept,note:source.note}};
}
// The model a project keeps (round 6, Contract I; shared/model-interpreter.js): the kept text read again when a chapter
// is drafted from it (`mode: 'model'`), so the passages a record cites are the model's own lines. Nothing is sent to Sol
// for a model draft: its values come from the model's lines and, where the model says nothing, the brief rules.
function interpretedModel(p){
 const source=modelSource(p);
 if(!source.kept)throw Object.assign(Error('This project keeps no model source to draft from.'),{status:400});
 const model={...interpretModel(source.text,{name:source.name,format:source.format}),sourceId:source.sourceId};
 return {model,source:{kept:true,sourceId:source.sourceId,name:source.name,format:model.format,elements:model.elements.length,relationships:model.relationships.length,stated:model.elements.filter(e=>e.confidence==='stated').length}};
}
// Prepared first (journey-context: the chapter's deterministic draft and Sol's packet; nothing is sent and no key is
// needed), then sent (journey) only if the packet is still the one the architect saw. Same budget, storage, replay and
// receipts as Sol's other paths; nothing is applied — the architect commits each record through the guide.
async function handleJourneyDraft(request,env,owner,projectId,action,url){
 if(request.headers.get('Origin')!==url.origin)return json({error:'Use Sol from your private workbench.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected a chapter request.'},415);
 const bytes=await request.text();if(bytes.length>4000)return json({error:'Ask for one chapter at a time.'},413);
 let raw,normal;try{raw=JSON.parse(bytes);normal=journeyRequest(raw);}catch(e){return json({error:publicMessage(e)},400);}
 const p=await loadProject(env,owner,projectId);if(!p)return json({error:'Open a project in your account first.'},404);
 // Asked for, or the only source there is: a project with no brief text and a kept model drafts from the model.
 const fromModel=raw.mode==='model'||(!briefSource(p).text.trim()&&modelSource(p).kept),grouped=draftsByGroup(p);
 let brief=null,source,draft,packet=null,model=null,modelInfo=null;
 try{
  if(fromModel)({model,source:modelInfo}=interpretedModel(p));
  // A model draft stands without a brief (the brief rules then propose nothing). Round 12 (DRF-06): only Chapter 1 reads
  // the brief; without one, Chapters 2-11 are drafted from the records before them, and only Chapter 1 asks for it. A
  // project drafted by requirement group (readiness-model.js draftsByGroup) is answered grouped on every chapter, brief
  // or not: its architecture is drafted from the groups as one draft (/api/drafting), and nothing is sent from here.
  try{({brief,source}=await interpretedBrief(p));}catch(e){if(e.status===503||(!fromModel&&!grouped&&normal.chapter===1))throw e;source={sourceId:null,kept:false,note:fromModel||grouped?'':'No brief is written: this chapter is drafted from the records before it.'};}
  draft=draftChapter(p,normal.chapter,{brief,model});
  if(!fromModel&&brief&&!draft.grouped)packet=journeyPacket(p,normal,draft,brief,{instructions:journeyInstructionsPin()});
 }catch(e){return json({error:publicMessage(e)},e.status||400);}
 const policy=aiPolicy(p);
 // The passages the draft cites, quoted beside its records (the packet holds at most sixty): the brief's for the records
 // the brief rules drafted, the model's lines for the records read from the model (each list numbers its own P-nnn).
 if(action==='journey-context'){
  const cited=ofModel=>new Set(draft.records.filter(r=>(r.provenance.mode==='model')===ofModel).flatMap(r=>[...r.provenance.passages,...r.fields.flatMap(f=>f.passages)]));
  const quote=(xs,ids)=>(xs||[]).filter(x=>ids.has(x.id)).map(x=>({id:x.id,text:x.text}));
  const kept=fromModel?modelInfo:(()=>{const m=modelSource(p);return {kept:m.kept,sourceId:m.sourceId,name:m.name,format:m.format};})();
  return json({draft,packet,brief:source,passages:quote(brief?.passages,cited(false)),model:kept,modelPassages:fromModel?quote(model.passages,cited(true)):[],configuration:intelligenceStatus(env,'journey'),aiEnabled:policy.enabled!==false});
 }
 if(fromModel)return json({error:'A model draft is read from the model’s own lines; Sol drafts from the brief.'},400);
 if(!packet)return json({error:draft?.grouped?draft.empty:'Write the project brief before asking Sol to draft from it. The deterministic draft of this chapter remains available.'},400);
 if(policy.enabled===false)return json({error:'The project owner has disabled external AI processing.'},403);
 if(!env.FILES)return json({error:'Private response storage is unavailable. No request was sent.'},503);
 if(!/^[a-f0-9-]{36}$/.test(raw.requestId||''))return json({error:'Start a new draft from the journey.'},400);
 const inputStamp=changeFingerprint({request:normal,packetStamp:raw.packetStamp}),existing=await rowFor(env,owner,projectId,raw.requestId);
 if(existing){if(existing.input_stamp!==inputStamp)return json({error:'This request identifier belongs to different input. Start a new request.'},409);return json(await readRun(env,owner,projectId,existing));}
 const status=intelligenceStatus(env,'journey');if(!status.configured)return json({error:'LLM connection is not configured. The deterministic journey draft remains available.',configuration:status},503);
 if(packet.stamp!==raw.packetStamp)return json({error:'The chapter or its sources changed. Review the draft again before sending.',conflict:true},409);
 if(!packet.records.length)return json({error:'This chapter has no draft record for Sol to answer.'},400);
 const at=new Date().toISOString(),active=new Date(Date.now()-120000).toISOString(),key=prefix(owner,projectId)+raw.requestId+'.json';
 const reservedTokens=3*new TextEncoder().encode(JSON.stringify(packet)).length+12000,objectId=('journey:'+normal.chapter).slice(0,100);
 await releaseInterruptedRuns(env,{owner,projectId});
 const inserted=await env.DB.prepare("INSERT OR IGNORE INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens) SELECT ?,?,?,?,'journey',?,'pending',?,?,?,?,?,?,? WHERE "+SOL_BUDGET_SQL+" AND NOT EXISTS (SELECT 1 FROM intelligence_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner,raw.requestId,projectId,objectId,inputStamp,status.provider,status.model,key,at,at,request.headers.get('oai-authenticated-user-id'),reservedTokens,...solBudgetBinds(owner,projectId,policy,reservedTokens),owner,projectId,active).run();
 if(!inserted.meta?.changes)return json({error:(await budgetRefusal(env,owner,projectId,policy,reservedTokens))+' The deterministic journey draft remains available.'},429);
 let run={actor:request.headers.get('oai-authenticated-user-id'),id:raw.requestId,projectId,objectId,mode:'journey',status:'pending',provider:status.provider,model:status.model,createdAt:at,updatedAt:at,request:normal,packet,instructions:journeyInstructionsPin()};
 try{
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  const drafted=await requestJourneyDraft(env,packet,{fetcher:stepFetcher(env,key,run)});run={...run,...drafted,status:'completed',updatedAt:new Date().toISOString()};
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  await env.DB.prepare("UPDATE intelligence_runs SET status='completed',model=?,updated_at=?,used_tokens=? WHERE owner_id=? AND id=?").bind(run.model,run.updatedAt,(run.usage.inputTokens||0)+(run.usage.outputTokens||0),owner,run.id).run();
  await operationStatement(env,owner,projectId,'ai',{id:run.id,actor:run.actor,status:'completed',usage:run.usage,model:run.model,groundingAccepted:run.groundingReview.accepted}).run();
  return json(run);
 }catch(e){
  const code=e.code||'storage',failed={...run,status:'failed',updatedAt:new Date().toISOString(),error:genericError(code),...providerFailure(e),...(code==='invalid_output'&&e.message?{detail:String(e.message).slice(0,300)}:{})};
  try{await env.FILES.put(key,JSON.stringify({...failed,result:undefined}),{httpMetadata:{contentType:'application/json'}});}catch{/* the row below still records the failure */}
  await env.DB.prepare("UPDATE intelligence_runs SET status='failed',error_code=?,used_tokens=?,updated_at=? WHERE owner_id=? AND id=?").bind(code,settleFailedRun(e),failed.updatedAt,owner,run.id).run();
  return failedAnswer(failed,code);
 }
}

// ---------------------------------------------------------------- Sol words the architecture draft, group by group (round 12)
// The model-assisted path of Sol's architecture draft (D-10, DRF-18; drafting-service.js runs it as a job): one request
// per requirement group, each on the journey contract with the group's packet (architecture-drafter.js
// groupDraftPackets: the group's requirements and the chapter's drafted records that answer it, wording fields only),
// under the same budget, storage, receipts and checks as a chapter's journey request (mode 'journey', object
// draft-group:<chapter>:<group>). A group the budget does not reach, or whose answer the checks withhold, keeps the
// deterministic wording; the requests stop at the first group the budget refuses. Nothing here is applied: the
// answers go back to the job, which keeps them in a new draft for a person to preview and apply.
const arrayOf = v => (Array.isArray(v) ? v : []);
export async function draftGroupWording(env, owner, projectId, p, packets, {actor = null, cancelled = async () => false, onGroup = async () => {}} = {}) {
 const status = intelligenceStatus(env,'journey'), policy = aiPolicy(p);
 if (!status.configured) throw Object.assign(Error('LLM connection is not configured. The deterministic wording of the draft stands.'), {code: 'not_configured', status: 503});
 if (policy.enabled === false) throw Object.assign(Error('The project owner has disabled external AI processing.'), {status: 403});
 if (!env.FILES) throw Object.assign(Error('Private response storage is unavailable. No request was sent.'), {status: 503});
 const results = [];
 for (const {groupId, packet} of packets) {
  if (await cancelled()) break;
  const id = crypto.randomUUID(), at = new Date().toISOString(), active = new Date(Date.now() - 120000).toISOString(), key = prefix(owner, projectId) + id + '.json';
  const reservedTokens = 3 * new TextEncoder().encode(JSON.stringify(packet)).length + 12000, objectId = ('draft-group:' + packet.request.chapter + ':' + groupId).slice(0, 100), inputStamp = changeFingerprint({request: packet.request, packetStamp: packet.stamp});
  await releaseInterruptedRuns(env, {owner, projectId});
  const inserted = await env.DB.prepare("INSERT OR IGNORE INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens) SELECT ?,?,?,?,'journey',?,'pending',?,?,?,?,?,?,? WHERE " + SOL_BUDGET_SQL + " AND NOT EXISTS (SELECT 1 FROM intelligence_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner, id, projectId, objectId, inputStamp, status.provider, status.model, key, at, at, actor, reservedTokens, ...solBudgetBinds(owner, projectId, policy, reservedTokens), owner, projectId, active).run();
  if (!inserted.meta?.changes) { results.push({groupId, runId: null, status: 'not-sent', answers: [], error: (await budgetRefusal(env, owner, projectId, policy, reservedTokens)) + ' The deterministic wording stands for this group and the ones after it.'}); await onGroup(results.at(-1)); break; }
  let run = {actor, id, projectId, objectId, mode: 'journey', status: 'pending', provider: status.provider, model: status.model, createdAt: at, updatedAt: at, request: packet.request, packet, instructions: journeyInstructionsPin()};
  try {
   await env.FILES.put(key, JSON.stringify(run), {httpMetadata: {contentType: 'application/json'}});
   const drafted = await requestJourneyDraft(env, packet, {fetcher: stepFetcher(env, key, run)});
   run = {...run, ...drafted, status: 'completed', updatedAt: new Date().toISOString()};
   await env.FILES.put(key, JSON.stringify(run), {httpMetadata: {contentType: 'application/json'}});
   await env.DB.prepare("UPDATE intelligence_runs SET status='completed',model=?,updated_at=?,used_tokens=? WHERE owner_id=? AND id=?").bind(run.model, run.updatedAt, (run.usage.inputTokens || 0) + (run.usage.outputTokens || 0), owner, id).run();
   await operationStatement(env, owner, projectId, 'ai', {id, actor, status: 'completed', usage: run.usage, model: run.model, groundingAccepted: run.groundingReview.accepted}).run();
   const withheld = !!run.result?.withheld;
   results.push({groupId, runId: id, status: withheld ? 'withheld' : 'accepted', answers: withheld ? [] : arrayOf(run.result?.answers), ...(withheld ? {issues: arrayOf(run.result?.issues).slice(0, 6)} : {})});
  } catch (e) {
   const code = e.code || 'storage', failedAt = new Date().toISOString();
   try { await env.FILES.put(key, JSON.stringify({...run, status: 'failed', updatedAt: failedAt, error: genericError(code)}), {httpMetadata: {contentType: 'application/json'}}); } catch { /* the row below still records the failure */ }
   await env.DB.prepare("UPDATE intelligence_runs SET status='failed',error_code=?,used_tokens=?,updated_at=? WHERE owner_id=? AND id=?").bind(code, settleFailedRun(e), failedAt, owner, id).run();
   results.push({groupId, runId: id, status: 'failed', answers: [], error: genericError(code)});
  }
  await onGroup(results.at(-1));
 }
 return results;
}

// ---------------------------------------------------------------- Sol reviews a chapter's model (round 5, Contract R; mode 'review')

// Prepared first (review-context: the packet Sol would read — the chapter's records and checks and its connected model;
// nothing is sent and no key is needed), then sent (review) only if the packet is still the one the architect saw. Same
// budget, storage, replay and receipts as Sol's other modes. The findings are advice: nothing is applied, no check is
// written, and the chapter's own rules still decide what passes.
async function handleModelReview(request,env,owner,projectId,action,url){
 if(request.headers.get('Origin')!==url.origin)return json({error:'Use Sol from your private workbench.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected a review request.'},415);
 const bytes=await request.text();if(bytes.length>4000)return json({error:'Ask for one chapter at a time.'},413);
 let raw,normal;try{raw=JSON.parse(bytes);normal=reviewRequest(raw);}catch(e){return json({error:publicMessage(e)},400);}
 const p=await loadProject(env,owner,projectId);if(!p)return json({error:'Open a project in your account first.'},404);
 let packet;try{packet=reviewPacket(p,normal,{instructions:reviewInstructionsPin()});}catch(e){return json({error:publicMessage(e)},400);}
 const policy=aiPolicy(p);
 if(action==='review-context')return json({packet,configuration:intelligenceStatus(env,'review'),aiEnabled:policy.enabled!==false});
 if(policy.enabled===false)return json({error:'The project owner has disabled external AI processing.'},403);
 if(!env.FILES)return json({error:'Private response storage is unavailable. No request was sent.'},503);
 if(!/^[a-f0-9-]{36}$/.test(raw.requestId||''))return json({error:'Start a new review from the chapter.'},400);
 const inputStamp=changeFingerprint({request:normal,packetStamp:raw.packetStamp}),existing=await rowFor(env,owner,projectId,raw.requestId);
 if(existing){if(existing.input_stamp!==inputStamp)return json({error:'This request identifier belongs to different input. Start a new request.'},409);return json(await readRun(env,owner,projectId,existing));}
 const status=intelligenceStatus(env,'review');if(!status.configured)return json({error:'LLM connection is not configured. The chapter’s own checks remain available.',configuration:status},503);
 if(packet.stamp!==raw.packetStamp)return json({error:'The chapter or its checks changed. Review what Sol will read again before sending.',conflict:true},409);
 if(!packet.elementIds.length)return json({error:'This chapter has no record for Sol to review.'},400);
 const at=new Date().toISOString(),active=new Date(Date.now()-120000).toISOString(),key=prefix(owner,projectId)+raw.requestId+'.json';
 const reservedTokens=3*new TextEncoder().encode(JSON.stringify(packet)).length+32000,objectId='review:'+normal.chapter;
 await releaseInterruptedRuns(env,{owner,projectId});
 const inserted=await env.DB.prepare("INSERT OR IGNORE INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens) SELECT ?,?,?,?,'review',?,'pending',?,?,?,?,?,?,? WHERE "+SOL_BUDGET_SQL+" AND NOT EXISTS (SELECT 1 FROM intelligence_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner,raw.requestId,projectId,objectId,inputStamp,status.provider,status.model,key,at,at,request.headers.get('oai-authenticated-user-id'),reservedTokens,...solBudgetBinds(owner,projectId,policy,reservedTokens),owner,projectId,active).run();
 if(!inserted.meta?.changes)return json({error:(await budgetRefusal(env,owner,projectId,policy,reservedTokens))+' The chapter’s own checks remain available.'},429);
 let run={actor:request.headers.get('oai-authenticated-user-id'),id:raw.requestId,projectId,objectId,mode:'review',status:'pending',provider:status.provider,model:status.model,createdAt:at,updatedAt:at,request:normal,packet,instructions:reviewInstructionsPin()};
 try{
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  const reviewed=await requestModelReview(env,packet,{fetcher:stepFetcher(env,key,run)});run={...run,...reviewed,status:'completed',updatedAt:new Date().toISOString()};
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  await env.DB.prepare("UPDATE intelligence_runs SET status='completed',model=?,updated_at=?,used_tokens=? WHERE owner_id=? AND id=?").bind(run.model,run.updatedAt,(run.usage.inputTokens||0)+(run.usage.outputTokens||0),owner,run.id).run();
  await operationStatement(env,owner,projectId,'ai',{id:run.id,actor:run.actor,status:'completed',usage:run.usage,model:run.model,groundingAccepted:run.groundingReview.accepted}).run();
  return json(run);
 }catch(e){
  const code=e.code||'storage',failed={...run,status:'failed',updatedAt:new Date().toISOString(),error:genericError(code),...providerFailure(e),...(code==='invalid_output'&&e.message?{detail:String(e.message).slice(0,300)}:{})};
  try{await env.FILES.put(key,JSON.stringify({...failed,result:undefined}),{httpMetadata:{contentType:'application/json'}});}catch{/* the row below still records the failure */}
  await env.DB.prepare("UPDATE intelligence_runs SET status='failed',error_code=?,used_tokens=?,updated_at=? WHERE owner_id=? AND id=?").bind(code,settleFailedRun(e),failed.updatedAt,owner,run.id).run();
  return failedAnswer(failed,code);
 }
}
