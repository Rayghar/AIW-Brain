// Contract execution uses the same three-valued predicates as product and
// knowledge checks. Generic consumers import architecture-facts directly so
// they do not load this interface-specific interpretation.
import {EXECUTION_COMPOSITION,EXECUTION_FIELDS} from './composition-manifest.js';
import {digest} from './brain-integrity.js';
import {list} from './util.js';
import {evaluateApplicability,unknownValue} from './architecture-facts.js';
import {resultReadContext} from './result-read-context.js';
export {APPLICABILITY_OPERATORS,safeFactKey,readArchitectureFact,evaluateApplicability,optionFacts,evaluateArchitectureScope} from './architecture-facts.js';
const executionFields=new Map(EXECUTION_FIELDS.map(f=>[f.key,f])),callerFields=EXECUTION_FIELDS.filter(f=>f.group==='caller'),callerBudgetKeys=['maxAttempts','attemptTimeoutMs','backoffBudgetMs','callerBudgetMs'];
const validNumber=(f,v)=>typeof v==='number'&&Number.isFinite(v)&&v>=f.min&&v<=f.max&&(!f.integer||Number.isInteger(v));
const authoredRecord=r=>r&&!['proposed','retired'].includes(r.state);

export function normaliseContractExecution(raw,validReference=()=>true){
 if(raw==null)return null;
 if(typeof raw!=='object'||Array.isArray(raw))throw Error('Execution declarations must be an object.');
 if(raw.schemaVersion!==undefined&&raw.schemaVersion!==1)throw Error('Unsupported execution declaration version.');
 const out={schemaVersion:1};
 for(const [key,value] of Object.entries(raw)){
  if(key==='schemaVersion')continue;
  const field=executionFields.get(key);if(!field)throw Error('Unsupported execution declaration: '+key+'.');
  if(value==null||value==='')continue;
  if(field.type==='number'){
   if(!validNumber(field,value))throw Error('Record '+field.label.toLowerCase()+' between '+field.min+' and '+field.max+(field.integer?' as a whole number.':'.'));
   out[key]=value;continue;
  }
  if(typeof value!=='string'||value.length>100)throw Error('Record a valid '+field.label.toLowerCase()+'.');
  if(field.type==='field'){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value))throw Error('Use an exact dictionary field name for '+field.label.toLowerCase()+'.');out[key]=value;continue;}
  if(field.options?!field.options.some(([id])=>id===value):!validReference(key,value))throw Error('Choose an existing or supported '+field.label.toLowerCase()+'.');
  out[key]=value;
 }
 return Object.keys(out).length>1?out:null;
}

const executionFingerprint=()=>digest(EXECUTION_COMPOSITION);
export function executionMethodCurrent(p,source){
 const r=source?.receipt,ids=[EXECUTION_COMPOSITION.id,...EXECUTION_COMPOSITION.sources.map(s=>s.id)];
 return r?.packId===EXECUTION_COMPOSITION.id&&r.version===EXECUTION_COMPOSITION.version&&r.fingerprint===executionFingerprint()&&!list(p?.knowledge?.withdrawals).some(w=>ids.includes(w.targetId));
}
export function executionMethodSource(p,{journey=false}={}){
 const receipt={packId:EXECUTION_COMPOSITION.id,version:EXECUTION_COMPOSITION.version,fingerprint:executionFingerprint(),sourceIds:EXECUTION_COMPOSITION.sources.map(s=>s.id)};
 const {accessedAt,authority}=EXECUTION_COMPOSITION.sources[0],sourceReview={accessedAt,authority},sources=EXECUTION_COMPOSITION.sources.map(s=>Object.fromEntries(Object.entries(s).filter(([key,value])=>sourceReview[key]!==value)));
 const source={id:'method:'+EXECUTION_COMPOSITION.id+(journey?':journey':''),kind:'brain-method',objectId:EXECUTION_COMPOSITION.id,title:EXECUTION_COMPOSITION.title,receipt,
  posture:'Bounded AIW interpretation of inspected primary sources; explicit project declarations remain unverified. No repository candidate was promoted.',
  excerpt:JSON.stringify({method:EXECUTION_COMPOSITION.id,version:EXECUTION_COMPOSITION.version,sourceReview,sources,...(journey?{journeyScope:EXECUTION_COMPOSITION.journeyScope}:{callerScope:EXECUTION_COMPOSITION.callerScope,outcomeScope:EXECUTION_COMPOSITION.outcomeScope,readScope:EXECUTION_COMPOSITION.readScope,scope:'One saved interface, its provider-owned business effect and its explicitly named runtime environment. Publication, repeat protection and outcome discovery remain distinct obligations. Optional bounded caller retries compose declared attempt and delay limits with repeat safety and circuit behavior; this is not a measured latency or availability result.'})}),truncated:false};
 return executionMethodCurrent(p,source)?source:null;
}

// Composes declared mechanisms at one concrete contract/path/environment using
// the same three-valued predicates as product and reviewed-knowledge checks.
// It neither infers prose nor executes/simulates the business operation.
const separateOutcome=c=>!!c.execution&&(EXECUTION_FIELDS.some(f=>['outcome','read'].includes(f.group)&&c.execution[f.key]!==undefined)||c.execution.completion==='business-outcome'&&!!c.execution.outcomeAuthorityId&&c.execution.outcomeAuthorityId!==c.to);
const resultReadDeclared=a=>EXECUTION_FIELDS.some(f=>f.group==='read'&&a[f.key]!==undefined);
export function contractExecutionContext(p,contract){
 const a=contract.execution,environment=list(p.runtime?.environments).find(e=>e.id===a?.environmentId)||null,
 payload=(c,role)=>list(c?.exchanges).filter(x=>x.role===role).map(x=>list(p.interfaces?.data).find(d=>d.id===x.dataId)||null),
 path=c=>list(p.runtime?.paths).find(r=>r.contractId===c?.id&&r.environmentId===a?.environmentId)||null,
 result=list(p.interfaces?.contracts).find(c=>c.id===a?.outcomeContractId)||null;
 return {environment,data:payload(contract,'request'),path:path(contract),outcome:separateOutcome(contract)?{contract:result,path:path(result),requestData:payload(result,'request'),resultData:payload(result,result?.kind==='event'?'request':'response'),authority:[...list(p.realisation?.components),...list(p.technologyRealisation?.records),...list(p.interfaces?.parties)].find(r=>r.id===a.outcomeAuthorityId)||null,...(resultReadDeclared(a)?{read:resultReadContext(p,a.outcomeReadTaskId)}:{})}:null};
}
export function assessContractExecution(contract,{path=null,environment=null,data=[],outcome=null}={}){
 const a=contract.execution;if(!a)return null;
 const facts=Object.create(null),requires=[],sourceIds=EXECUTION_COMPOSITION.sources.map(s=>s.id);
 const fact=(key,value,id=contract.id,field='execution.'+key)=>facts[key]={value,status:'declared',source:{kind:'model',id,field}};
 fact('schemaVersion',a.schemaVersion);for(const field of EXECUTION_FIELDS)fact(field.key,a[field.key]);
 for(const key of ['correlationKey','idempotencyKey','contractVersion'])fact(key,contract[key],contract.id,key);
 fact('runtimePath',path&&environment&&path.contractId===contract.id&&path.environmentId===environment.id&&a.environmentId===environment.id&&path.state!=='proposed'&&environment.state!=='proposed'?path.id:null,path?.id||contract.id,'contractId');
 const need=(id,key,value,label,question,op='eq',failure='')=>requires.push({id,fact:key,value,op,label,question,sourceIds,...(failure?{failure}:{})});
 const present=(key,label,question)=>need(key,key,undefined,label,question,'present');
 need('schema','schemaVersion',1,'Supported execution declaration schema','Review this execution declaration in the native interface editor.');
 const declaredKey=(key,label)=>{present(key,label,'Name the '+label.toLowerCase()+' in the interface dictionary.');fact(key+'Defined',contract[key]&&data.length&&data.every(Boolean)?data.some(d=>list(d.fields).some(f=>f.name===contract[key])):null,contract.id,key);need(key+'-dictionary',key+'Defined',true,label+' in the request dictionary','Link a request dictionary that declares the named '+label.toLowerCase()+'.','eq','The named '+label.toLowerCase()+' is absent from the linked request dictionary.');};
 present('environmentId','Named operating environment','Which saved environment does this execution contract describe?');
 present('runtimePath','Contract path in that environment','Record the runtime path for this exact contract in its named environment; another route is not evidence for it.');
 present('contractVersion','Versioned interface agreement','Record the interface version whose execution agreement is being assessed.');
 need('delivery','delivery',['required','best-effort'],'Required delivery outcome','Must every committed change remain deliverable, or is downstream loss explicitly acceptable?','oneOf');
 need('repetition','repetition',['possible','none'],'Possibility of repeated attempts','Can the caller, relay or channel repeat this operation?','oneOf');
 need('completion','completion',['business-outcome','acceptance'],'Required completion meaning','Does this contract promise acceptance of work or the authoritative business outcome?','oneOf');
 if(a.delivery==='required')need('retained-intent','publication','atomic-commit','Retained publication intent','Which atomic commit retains the state change and its delivery intent?','eq','Separate commit and publication leave a loss window. This retained-intent recipe requires one atomic boundary; a durable queue does not close that gap.');
 if(a.publication==='atomic-commit')need('relay-repeat','repetition','possible','Repeat-aware relay contract','How does this relay handle publication repeated around acknowledgement or restart?','eq','Retained intent alone does not establish a single delivery attempt. This relay recipe must account for possible repetition.');
 if(a.repetition==='possible'){
  need('repeat-protection','protection',['atomic-deduplication','idempotent-effect'],'Protection at the business effect','Is the effect intrinsically idempotent or atomically protected with its duplicate record?','oneOf','Transport deduplication or a retry policy alone does not protect a separate business effect.');
  need('repeat-owner','repeatOwnerId',contract.to,'Provider-owned repeat protection','Which provider owns the effect and its repeat protection?','eq','The named repeat owner is outside this contract provider boundary. Specify the actual effect-owning contract before applying this bounded recipe.');
 }
 if(a.protection==='atomic-deduplication'){
  need('stable-repeat-key','identity','stable','Stable operation identity','Does every retry retain the original operation identity?','eq','A new identity on every attempt bypasses duplicate recognition.');
  declaredKey('idempotencyKey','Repeat key');
  need('changed-intent','changedIntent','reject','Changed-intent rejection','What happens when the same operation identity carries different business parameters?','eq','The same identity cannot silently authorize changed intent under this deduplication recipe.');
 }
 if(a.repetition==='possible'||a.completion==='business-outcome')need('uncertain-result','timeout','unresolved','Truthful uncertain outcome','What business state is retained when the response is missing?','eq','A missing response does not establish business failure or success; preserve an unresolved outcome.');
 const outcomeDeclared=separateOutcome(contract);
 if(a.completion==='business-outcome'){
  declaredKey('correlationKey','Outcome correlation identity');
  need('outcome-discovery','discovery',['authoritative-status','correlated-event','manual-reconciliation'],'Authoritative outcome discovery','How will the caller discover the authoritative result after an uncertain response?','oneOf','Delivery acceptance without an outcome-discovery contract does not satisfy the recorded business-completion obligation.');
  if(!outcomeDeclared)need('outcome-authority','outcomeAuthorityId',contract.to,'Business result authority','Which provider owns the authoritative result for this contract?','eq','This result authority is outside the provider boundary. Identify the separate authoritative contract rather than treating an intermediary acknowledgement as completion.');
 }
 if(outcomeDeclared){
  const c=outcome?.contract,rd=outcome?.resultData||[],qd=outcome?.requestData||[],event=a.discovery==='correlated-event',status=a.discovery==='authoritative-status';
  const check=(key,value,expected,label,question,id=contract.id,field='execution.outcomeContractId',op='eq')=>{fact(key,value,id,field);need(key,key,expected,label,question,op,question);};
  need('outcome-completion','completion','business-outcome','Business outcome required by the submission','Record whether this submission requires the authoritative business outcome.');
  need('outcome-channel','discovery',['authoritative-status','correlated-event'],'Explicit result interaction','Choose a status request or correlated result event for this two-contract interpretation.','oneOf');
  present('outcomeContractId','Separate result contract','Name the exact saved status or result contract.');
  check('outcome-contract',authoredRecord(c)&&c.id!==contract.id?c.id:null,null,'Available result agreement','Choose a separate authored contract for discovering this operation’s result.',contract.id,'execution.outcomeContractId','present');
  present('outcomeAuthorityId','Named result authority','Name the system that owns the authoritative business result.');
  check('outcome-authority-exists',authoredRecord(outcome?.authority)?outcome.authority.id:null,null,'Available result authority','Choose the saved authority that owns this result.',contract.id,'execution.outcomeAuthorityId','present');
  need('outcome-correlation','outcomeCorrelation','same-operation','Same business operation','Declare whether the result refers to the original operation, regardless of dictionary field names.');
  need('outcome-meaning','outcomeMeaning','business-outcome','Authoritative result meaning','Does the linked payload carry the business state or only an acceptance acknowledgement?');
  present('outcomeResultKey','Named business result field','Name the field in the linked result payload that carries business state.');
  if(c){
   check('outcome-kind',c.kind,event?'event':status?'request':null,'Result interaction style','Set the linked contract’s interaction style to match the declared discovery.',c.id,'kind');
   check('outcome-caller',event?c.to:status?c.from:null,contract.from,'Original caller receives the result','Bind result discovery to the original caller; an intermediary needs its own supported boundary.',c.id,event?'to':'from');
   check('outcome-authority',event?c.from:status?c.to:null,a.outcomeAuthorityId,'Result authority at the boundary','Use the named result authority as the status provider or event publisher.',c.id,event?'from':'to');
   check('outcome-version',c.contractVersion,null,'Versioned result contract','Record the exact version of the result contract.',c.id,'contractVersion','present');
   check('outcome-terminal',!c.execution?.outcomeContractId,true,'Bounded result discovery','This reading ends at the named authority; a further result-contract link needs a separate interpretation.',c.id,'execution.outcomeContractId');
   if(c.execution?.completion)check('outcome-contract-meaning',c.execution.completion,'business-outcome','Result contract completion meaning','Reconcile the result contract’s declared acceptance-only completion.',c.id,'execution.completion');
   if(c.execution?.environmentId)check('outcome-contract-environment',c.execution.environmentId,a.environmentId,'Result declaration environment','Review the result contract’s execution declaration in the same environment.',c.id,'execution.environmentId');
   check('outcome-path',authoredRecord(outcome.path)&&authoredRecord(environment)&&outcome.path.contractId===c.id&&outcome.path.environmentId===environment.id?outcome.path.id:null,null,'Result path in the same environment','Record the exact result contract path in the submission’s named environment.',outcome.path?.id||contract.id,outcome.path?'contractId':'execution.environmentId','present');
   const fields=(ds,key)=>key&&ds.length&&ds.every(authoredRecord)?ds.flatMap(d=>list(d.fields).filter(f=>f.name===key).map(f=>({data:d,field:f}))):null;
   const original=fields(data,contract.correlationKey),request=fields(qd,c.correlationKey),result=fields(rd,c.correlationKey),state=fields(rd,a.outcomeResultKey);
   check('outcome-key',c.correlationKey,null,'Result correlation key','Name the correlation key in the result contract.',c.id,'correlationKey','present');
   for(const [key,fs,label] of [['outcome-request-key',request,'Result request/event correlation field'],['outcome-result-key',result,'Result payload correlation field'],['outcome-state-key',state,'Business state field']])check(key,fs?fs.length>0:null,true,label,'Link payload dictionaries containing the named '+label.toLowerCase()+'.',key==='outcome-state-key'?contract.id:c.id,key==='outcome-state-key'?'execution.outcomeResultKey':'correlationKey');
   const all=[...(original||[]),...(request||[]),...(result||[])],typed=all.filter(x=>!unknownValue(x.field.type)),mismatch=typed.find(x=>x.field.type!==typed[0].field.type),typeTarget=mismatch||result?.[0];
   check('outcome-key-types',mismatch?false:original?.length&&request?.length&&result?.length&&typed.length===all.length?true:null,true,'Compatible operation identity types','Use compatible declared types for the original and returned operation identity.',typeTarget?.data.id||c.id,typeTarget?'fields':'correlationKey');
   check('outcome-data-authority',state?.length&&a.outcomeAuthorityId?state.some(x=>x.data.authorityId&&x.data.authorityId!==a.outcomeAuthorityId)?false:state.every(x=>x.data.authorityId)?true:null:null,true,'Authoritative business state payload','Assign the result data to the named business authority.',state?.find(x=>x.data.authorityId!==a.outcomeAuthorityId)?.data.id||state?.[0]?.data.id||contract.id,state?.length?'authorityId':'execution.outcomeResultKey');
  }
 }
 if(resultReadDeclared(a)){
  const read=outcome?.read,t=read?.task,s=read?.solution,r=read?.answers||{},accepted=authoredRecord(t)&&t.kind==='architecture'&&t.topic==='reads'&&t.status==='applied'&&s?.state==='adopted',cache=s?.optionId==='cache-aside';
  const check=(key,value,expected,label,question,field='outcomeReadTaskId',op='eq')=>{fact(key,value,contract.id,'execution.'+field);need(key,key,expected,label,question,op,question);};
  need('outcome-read-channel','discovery','authoritative-status','Result read interaction','Link a status request for this read design; a result event needs a separate freshness interpretation.');
  present('outcomeReadTaskId','Accepted result read design','Choose the exact accepted read design serving this status result.');
  check('outcome-read-accepted',accepted?true:null,true,'Accepted read approach','Accept a read design for this result before composing its declared freshness.');
  need('outcome-read-freshness','outcomeFreshness',['strict','bounded'],'Required result freshness','Decide whether the result must reflect the latest committed state or may use a bounded older value.','oneOf');
  if(accepted){
   check('outcome-read-current',read.current?true:null,true,'Current read design support','Review the read design’s changed drivers, sources or model relationships before relying on it.');
   check('outcome-read-approach',s.optionId,['direct-read','cache-aside'],'Supported read approach','Choose an accepted authoritative-read or cache-aside design for this bounded interpretation.','outcomeReadTaskId','oneOf');
   check('outcome-read-caller',read.roleIds.caller||null,contract.from,'Same result reader','Use the accepted read design belonging to the original result caller.');
   check('outcome-read-authority',read.roleIds.processor||null,a.outcomeAuthorityId,'Same result authority','Use a read design whose source is the named business-result authority.');
   const stateData=list(outcome?.resultData).filter(d=>authoredRecord(d)&&list(d.fields).some(f=>f.name===a.outcomeResultKey));
   check('outcome-read-data',authoredRecord(read.data)&&stateData.length?stateData.every(d=>d.id===read.data.id):null,true,'Exact result information','Use the exact authoritative dictionary carrying the named business-state field; another read scope cannot supply its freshness.');
   if(a.outcomeFreshness==='strict')check('outcome-read-strict',cache?false:unknownValue(r.freshness)?null:r.freshness==='strict',true,'Latest committed result contract','This accepted cache-aside or bounded-read recipe does not establish the latest committed state. Review the read approach and source consistency contract.','outcomeFreshness');
   if(a.outcomeFreshness==='bounded'){
    present('outcomeMaxAgeSeconds','Maximum accepted result age','Record the maximum source-value age the result consumer permits.');
    const age=cache||r.freshness==='bounded'?r.maxAge!==''&&Number.isFinite(Number(r.maxAge))&&Number(r.maxAge)>0&&Number(r.maxAge)<=31536000?Number(r.maxAge):null:r.freshness==='strict'?0:null;
    const limit=validNumber(executionFields.get('outcomeMaxAgeSeconds'),a.outcomeMaxAgeSeconds)?a.outcomeMaxAgeSeconds:null;
    check('outcome-read-age',age,limit,'Read age fits the result contract',age!==null&&limit!==null?'The accepted read design permits '+age+' seconds, above the result consumer’s '+limit+' second limit. Review the read design or explicitly revise the requirement.':'Record the read design’s source-value age and the result consumer’s declared limit.','outcomeMaxAgeSeconds','lte');
   }
  }
 }
 const callerDeclared=callerFields.some(f=>a[f.key]!==undefined),calculations=[];
 if(callerDeclared){
  need('caller-retries','callerRetries',['none','bounded'],'Declared caller retry policy','Does this caller retry automatically, or explicitly stop after one attempt?','oneOf');
  need('caller-circuit','circuitBreaker',['none','caller'],'Explicit circuit placement','Is a circuit breaker used at this caller boundary?','oneOf');
  if(a.circuitBreaker==='caller')need('open-circuit','openCircuit','stop','Calls respect the open circuit','Does this caller stop attempts while its circuit is open?','eq','Continuing attempts through an open circuit defeats the declared protection. Preserve the result uncertainty of earlier attempts while stopping new ones.');
 }
 if(a.callerRetries==='bounded'||a.circuitBreaker==='caller'){
  fact('contractKind',contract.kind,contract.id,'kind');
  need('request-call','contractKind','request','Synchronous request boundary','Identify the request contract whose caller attempts or circuit are being assessed.','eq','This caller recipe covers a request and response. A logical event or batch path does not identify the invocation boundary for this circuit or time budget. Model the relevant request separately.');
 }
 if(a.callerRetries==='bounded'){
  need('caller-repeat','repetition','possible','Caller attempts included in repeat protection','Include the caller’s retries in this operation’s repeat protection.','eq','Automatic retries contradict a declaration that repeated execution attempts are prohibited.');
  need('retry-failures','retryFailures','transient-only','Eligible transient failures','Which provider errors are explicitly safe and useful to retry?','eq','Retrying every failure also repeats permanent rejection or invalid intent. Classify the eligible failures before using this recipe.');
  need('retry-owner','retryLayers','one-owner','One accounted retry owner','Are SDK, proxy and downstream retries disabled or fully included in these attempt limits?','eq','Retries outside this declared budget can multiply attempts. Model their combined behavior before treating this caller budget as bounded.');
  for(const key of callerBudgetKeys){const {label}=executionFields.get(key);present(key,label,'Record '+label.toLowerCase()+'.');}
  const numbers=callerBudgetKeys.every(key=>validNumber(executionFields.get(key),a[key]));
  const envelope=numbers?a.maxAttempts*a.attemptTimeoutMs+a.backoffBudgetMs:null;
  fact('callerEnvelopeMs',envelope,contract.id,'execution.maxAttempts');
  need('caller-envelope','callerEnvelopeMs',typeof a.callerBudgetMs==='number'?a.callerBudgetMs:null,'Attempt and delay envelope within the caller budget','Supply the complete attempt limit, maximum attempt duration, total delay and caller budget.','lte',numbers?'The declared attempt and delay envelope is '+envelope+' ms, above the '+a.callerBudgetMs+' ms caller budget. Revise the limits or explicitly revisit the requirement.':'');
  if(numbers)calculations.push({kind:'declared-envelope',value:envelope,unit:'ms',budget:a.callerBudgetMs,formula:a.maxAttempts+' × '+a.attemptTimeoutMs+' ms + '+a.backoffBudgetMs+' ms',statement:'Declared maximum attempt and delay envelope: '+envelope+' ms against '+a.callerBudgetMs+' ms. Complete attempt duration includes connection, request and response; the total delay includes back-off and jitter. Implementation timing, cancellation and aggregate load remain unverified.'});
 }
 const reading=evaluateApplicability({id:EXECUTION_COMPOSITION.id,requires},facts);
 for(const check of reading.checks){const rule=requires.find(r=>r.id===check.id);check.fieldKeys=check.fact==='callerEnvelopeMs'?[...callerBudgetKeys]:[check.fact==='contractKind'?'kind':check.fact==='runtimePath'?'environmentId':check.fact.replace(/Defined$/,'')];if(outcomeDeclared&&check.id.startsWith('outcome')){check.fieldKeys=[check.source.field.replace(/^execution\./,'')];check.target={objectId:check.source.id,fieldKey:check.source.field,chapter:check.source.id===outcome?.path?.id?10:8};}if(check.state==='blocked'&&rule.failure)check.detail=rule.failure;}
 reading.reasons=[...reading.blockers,...reading.unknown].map(c=>c.detail);
 const obligation=(id,action,evidence,targetIds)=>({id:'execution:'+contract.id+':'+id,action,evidence,targetIds,verification:'pending',sourceIds});
 reading.obligations=[obligation('crash-window','Preserve the declared publication and repeat boundary.','Interrupt before commit, after commit, after delivery and before acknowledgement; compare retained intent with permitted effects.',[contract.from,contract.to]),obligation('replay','Verify repeated and changed-intent attempts at the effect owner.','Repeat the original operation before and after restart, then change its parameters; inspect effect count, retained identity and retention/replay limits.',[contract.to]),...(a.completion==='business-outcome'?[obligation('outcome','Discover the authoritative business result without inventing success.','Lose the response after the effect commits, then discover the result under the original identity; test pending, terminal and inaccessible-result states.',[contract.from,contract.to])]:[])];
 reading.placement=[{role:'repeat-protection',componentId:a.repeatOwnerId||contract.to,scope:'business-effect'},{role:'outcome-discovery',componentId:contract.from,scope:'caller-policy'},{role:'outcome-authority',componentId:a.outcomeAuthorityId||contract.to,scope:'business-result'}];
 if(outcomeDeclared)reading.obligations.push(obligation('linked-outcome','Verify the separate authoritative result contract.','Lose submission and result responses; correlate the original operation across both contracts, inspect acceptance, pending and final states, and test authorization, inaccessible results, retention expiry and stale or duplicate result events.',[contract.id,...(outcome?.contract?[outcome.contract.id]:[]),...new Set([contract.from,a.outcomeAuthorityId].filter(Boolean))]));
 if(resultReadDeclared(a)){
  reading.obligations.push(obligation('result-read','Verify result freshness at the original read boundary.','Read pending and final states around a committed change, stale cache fill and invalidation; verify source age and version, caller authorization, unavailable-source behavior and the declared result-age limit. A consistent declaration is not measured freshness or proof of business finality.',[contract.id,...(outcome?.contract?[outcome.contract.id]:[]),...new Set(Object.values(outcome?.read?.roleIds||{}).filter(Boolean))]));
  reading.placement.push({role:'result-read-policy',componentId:outcome?.read?.roleIds.caller||contract.from,scope:'caller-read-policy'},...(outcome?.read?.solution?.optionId==='cache-aside'?[{role:'result-read-copy',componentId:outcome.read.roleIds.cache,scope:'disposable-read-copy'}]:[]));
 }
 if(a.callerRetries==='bounded'){
  reading.obligations.push(obligation('caller-budget','Verify the caller retry, deadline and circuit behavior together.','Exercise slow and transient failures, permanent rejection, circuit opening and lost responses. Measure full attempt and delay durations, verify cancellation, inspect SDK retries and concurrent aggregate load, and confirm that no repeated attempt adds another business effect.',[contract.from,contract.to]));
  reading.placement.push({role:'bounded-retry',componentId:contract.from,scope:'caller-policy'});
 }
 if(a.circuitBreaker==='caller'){
  reading.placement.push({role:'circuit-breaker',componentId:contract.from,scope:'caller-dependency'});
  if(a.callerRetries!=='bounded')reading.obligations.push(obligation('caller-circuit','Verify circuit behavior at the caller boundary.','Exercise circuit opening, probe recovery and lost responses. Confirm stopped calls do not invent a result for an earlier business operation.',[contract.from,contract.to]));
 }
 return {...reading,calculations,scope:{contractId:contract.id,from:contract.from,to:contract.to,pathId:path?.id||null,environmentId:a.environmentId||null,...(outcomeDeclared?{outcomeContractId:a.outcomeContractId||null,outcomePathId:outcome?.path?.id||null,outcomeAuthorityId:a.outcomeAuthorityId||null}:{}),...(resultReadDeclared(a)?{outcomeReadTaskId:a.outcomeReadTaskId||null,outcomeFreshness:a.outcomeFreshness||null,outcomeMaxAgeSeconds:a.outcomeMaxAgeSeconds??null}:{})},authority:'Conditional consistency of declared mechanisms. Implementation, timing, retention and measured outcomes require separate evidence.'};
}

// Only saved typed references connect this reading. Shared components, matching
// names and process order do not imply invocation, nesting or operation identity.
// A parent link means one invocation within each parent attempt; branching calls
// are separate exposures. Their durations cannot be summed without scheduling facts.
export function executionJourney(p,contractId,{limit=12,assess=true,record=null}={}){
 const all=list(p.interfaces?.contracts).filter(c=>c.id!==record?.id);if(record)all.push(record);
 const byId=new Map(all.map(c=>[c.id,c]));if(!byId.has(contractId))return null;
 const links=all.flatMap(c=>[...(c.execution?.outcomeContractId?[{kind:'outcome',from:c.id,to:c.execution.outcomeContractId}]:[]),...(c.execution?.invocationParentId?[{kind:'invocation',from:c.execution.invocationParentId,to:c.id}]:[])]),adj=new Map();
 for(const e of links)for(const [a,b] of [[e.from,e.to],[e.to,e.from]]){if(!adj.has(a))adj.set(a,[]);adj.get(a).push(b);}
 const ids=new Set(),omitted=new Set(),queue=[contractId],bound=Math.max(2,Math.min(12,Number(limit)||12));
 while(queue.length){const id=queue.shift();if(ids.has(id))continue;if(ids.size>=bound){omitted.add(id);continue;}ids.add(id);for(const next of adj.get(id)||[])if(!ids.has(next))queue.push(next);}
 const edges=links.filter(e=>ids.has(e.from)&&ids.has(e.to));
 if(!edges.some(e=>e.kind==='invocation')&&edges.length<2&&!omitted.size)return null;
 const contracts=[...ids].map(id=>byId.get(id)).filter(Boolean),environments=list(p.runtime?.environments).filter(e=>contracts.some(c=>c.execution?.environmentId===e.id)),environmentIds=new Set(environments.map(e=>e.id));
 const paths=list(p.runtime?.paths).filter(r=>ids.has(r.contractId)&&environmentIds.has(r.environmentId)),dataIds=new Set(contracts.flatMap(c=>list(c.exchanges).map(x=>x.dataId))),data=list(p.interfaces?.data).filter(d=>dataIds.has(d.id));
 const flows=list(p.processModel?.transitions).filter(t=>t.contractId&&ids.has(t.contractId)),elementIds=new Set(flows.flatMap(t=>[t.from,t.to])),elements=[...list(p.processModel?.elements),...list(p.artefacts)].filter(r=>elementIds.has(r.id));
 const participantIds=new Set(contracts.flatMap(c=>[c.from,c.to,c.execution?.outcomeAuthorityId])),participants=[...list(p.realisation?.components),...list(p.technologyRealisation?.records),...list(p.interfaces?.parties)].filter(r=>participantIds.has(r.id));
 const contexts=new Map(contracts.filter(c=>c.execution).map(c=>[c.id,contractExecutionContext(p,c)]));
 const sourceRecords=[...new Map([...contracts,...environments,...paths,...data,...flows,...elements,...participants,...[...contexts.values()].flatMap(c=>list(c.outcome?.read?.sourceRecords))].map(r=>[r.id,r])).values()];
 const id='journey:'+contracts.map(c=>c.id).sort().join(':'),scope={contractIds:contracts.map(c=>c.id),links:edges,pathIds:paths.map(r=>r.id),environmentIds:[...environmentIds],processTransitionIds:flows.map(r=>r.id),omittedContractIds:[...omitted],limit:bound,unmodelled:'Only explicit invocation/result links are traversed. Process order, undeclared calls, scheduling, arbitrary sagas and compensation are not inferred.'};
 const readSupport=[...contexts].flatMap(([contractId,c])=>c.outcome?.read?[{contractId,taskId:c.outcome.read.task?.id||null,current:c.outcome.read.current,methodCurrent:c.outcome.read.methodCurrent}]:[]),support={id,scope,sourceRecords,readSupport};if(!assess)return support;
 const facts=Object.create(null),requires=[],meta=new Map(),calculations=[];
 const sourceIds=EXECUTION_COMPOSITION.sources.map(s=>s.id),target=(c,field)=>({objectId:c.id,fieldKey:field,chapter:8});
 const check=(id,value,label,question,to,expected=true,op='eq',dependentIds=[])=>{const fact='journey.'+requires.length;facts[fact]={value,status:'declared',source:{kind:'model',id:to.objectId,field:to.fieldKey}};requires.push({id,fact,op,value:expected,label,question,sourceIds});meta.set(id,{target:to,dependentIds,question});};
 const known=c=>authoredRecord(c)?c:null,path=(c,env)=>paths.find(r=>r.contractId===c?.id&&r.environmentId===env),present=v=>unknownValue(v)?null:v;
 check('journey-method',executionMethodSource(p)?true:null,'Current composition interpretation','Review the composition method and its withdrawn sources before relying on this journey.',target(byId.get(contractId),'execution.completion'));
 // Reuse each boundary's existing interpretation, including accepted-read v5
 // semantics. The journey cannot turn an unsafe local declaration into a pass.
 for(const c of contracts.filter(c=>c.execution)){
  const context=contexts.get(c.id),reading=assessContractExecution(c,context),first=reading.blockers[0]||reading.unknown[0],to=first?.target||(first?.fact==='runtimePath'?target(c,'execution.environmentId'):first?.source?{objectId:first.source.id,fieldKey:first.source.field,chapter:paths.some(r=>r.id===first.source.id)?10:8}:target(c,'execution.completion'));
  check('journey-boundary:'+c.id,reading.blockers.length?false:reading.unknown.length?null:true,'Consistent declarations at '+(c.ref||c.id),first?.detail||'Verify the declared local publication, repetition and outcome agreement.',to,true,'eq',[c.id]);
 }
 if(omitted.size)check('journey-coverage',null,'Bounded journey coverage','This explicit scope exceeds '+bound+' boundaries. Review a smaller connected scope; no whole-journey conclusion is established.',target(byId.get(contractId),'execution.invocationParentId'));
 const invocation=edges.filter(e=>e.kind==='invocation'),parentOf=new Map(invocation.map(e=>[e.to,e.from])),validEdges=new Set();
 for(const e of invocation){
  const parent=known(byId.get(e.from)),child=known(byId.get(e.to)),owner=child||byId.get(contractId),at=target(owner,'execution.invocationParentId'),key='invocation:'+e.from+':'+e.to,a=parent?.execution||{},b=child?.execution||{},start=requires.length,depends=[e.from,e.to];
  check(key+':records',parent&&child?true:null,'Authored waiting request and child call','Choose two authored request contracts for the waiting boundary.',at,true,'eq',depends);
  check(key+':kind',parent&&child?parent.kind==='request'&&child.kind==='request':null,'Synchronous invocation boundaries','This waiting-chain interpretation requires request/response contracts; process order or an event is not a nested call.',at,true,'eq',depends);
  check(key+':caller',parent?.to&&child?.from?parent.to===child.from:null,'Provider owns the nested caller','The waiting request’s provider must be the child call’s caller. Review the exact invocation boundary.',at,true,'eq',depends);
  check(key+':environment',a.environmentId&&b.environmentId?a.environmentId===b.environmentId:null,'Same declared invocation environment','Record the same operating environment for the waiting request and its child call.',target(owner,'execution.environmentId'),true,'eq',depends);
  for(const c of [parent,child].filter(Boolean)){const env=c.execution?.environmentId,record=environments.find(r=>r.id===env);check(key+':path:'+c.id,known(record)&&known(path(c,env))?true:null,'Authored invocation path for '+(c.ref||c.id),'Record the exact authored runtime path for this request in its stated environment.',target(c,'execution.environmentId'),true,'eq',depends);}
  const shape=evaluateApplicability({requires:requires.slice(start)},facts);
  if(shape.ready)validEdges.add(e.to);
  for(const c of [parent,child].filter(Boolean))check(key+':retry:'+c.id,present(c.execution?.callerRetries),'Retry ownership for '+(c.ref||c.id),'State whether this request makes one attempt or has explicitly bounded retries before composing the chain.',target(c,'execution.callerRetries'),['none','bounded'],'oneOf',depends);
  if(parent&&child){
   const childBound=b.callerRetries==='bounded'&&callerBudgetKeys.every(k=>validNumber(executionFields.get(k),b[k]))?b.maxAttempts*b.attemptTimeoutMs+b.backoffBudgetMs:b.callerRetries==='none'&&validNumber(executionFields.get('callerBudgetMs'),b.callerBudgetMs)?b.callerBudgetMs:null;
   const parentBound=a.callerRetries==='bounded'&&validNumber(executionFields.get('attemptTimeoutMs'),a.attemptTimeoutMs)?a.attemptTimeoutMs:a.callerRetries==='none'&&validNumber(executionFields.get('callerBudgetMs'),a.callerBudgetMs)?a.callerBudgetMs:null;
   check(key+':wait-budget',shape.ready&&childBound!==null&&parentBound!==null?childBound<=parentBound:null,'Child waiting envelope fits one parent attempt',childBound!==null&&parentBound!==null?'The child declares '+childBound+' ms of waiting against '+parentBound+' ms for one parent attempt. Review the bounds, cancellation and remaining processing time.':'Record the child attempt/delay bounds (or its single-call budget) and the parent’s complete attempt budget; a total multi-attempt parent budget cannot be reused as one attempt.',parentBound===null?target(parent,'execution.'+(a.callerRetries==='none'?'callerBudgetMs':'attemptTimeoutMs')):target(child,'execution.'+(b.callerRetries==='none'?'callerBudgetMs':'attemptTimeoutMs')),true,'eq',depends);
   if(shape.ready&&childBound!==null&&parentBound!==null)calculations.push({kind:'nested-wait',contractIds:depends,value:childBound,budget:parentBound,unit:'ms',statement:'Child waiting envelope '+childBound+' ms; one parent attempt '+parentBound+' ms. This is a necessary fit check; processing, parallel/sequential work and cancellation remain to be verified.'});
  }
 }
 // Shared result interfaces do not make their submissions the same operation.
 // Each explicit link must retain its own identity and name the same authority
 // at that exact result endpoint; independent caller identities may differ.
 const groups=new Map();for(const e of edges.filter(e=>e.kind==='outcome')){if(!groups.has(e.to))groups.set(e.to,[]);groups.get(e.to).push(byId.get(e.from));}
 for(const [resultId,parents] of groups)if(parents.length>1){
  const authorities=new Set(parents.map(c=>present(c.execution?.outcomeAuthorityId)).filter(Boolean));
  for(const c of parents){const a=c.execution||{},depends=[...parents.map(x=>x.id),resultId];
   check('shared-result:'+resultId+':authority:'+c.id,present(a.outcomeAuthorityId)?authorities.size===1:null,'One authority at the shared result boundary','These submissions name the same result contract. Reconcile their declared result authorities at that boundary.',target(c,'execution.outcomeAuthorityId'),true,'eq',depends);
   check('shared-result:'+resultId+':identity:'+c.id,present(a.outcomeCorrelation),'Explicit result identity for '+(c.ref||c.id),'Declare this submission’s relationship to the result identity. Sharing an endpoint or dictionary does not establish the same business operation.',target(c,'execution.outcomeCorrelation'),'same-operation','eq',depends);
  }
 }
 for(const kind of ['invocation','outcome'])for(const c of contracts){
  const visited=new Set(),trace=[];let id=c.id;
  while(id&&!visited.has(id)){visited.add(id);trace.push(id);id=kind==='invocation'?parentOf.get(id):byId.get(id)?.execution?.outcomeContractId;if(id&&!ids.has(id))break;}
  if(id&&visited.has(id))check('journey-cycle:'+kind+':'+c.id,false,'Acyclic '+(kind==='invocation'?'waiting requests':'result discovery'),'The explicit '+kind+' references form a cycle. Resolve the boundary; this reading cannot establish a terminal result or finite invocation chain.',target(c,'execution.'+(kind==='invocation'?'invocationParentId':'outcomeContractId')),true,'eq',trace);
 }
 for(const leaf of contracts.filter(c=>parentOf.has(c.id)&&!invocation.some(e=>e.from===c.id))){
  const chain=[],seen=new Set();let c=leaf,attempts=1,complete=!omitted.size;
  while(c&&!seen.has(c.id)){seen.add(c.id);chain.unshift(c.id);const a=c.execution||{},count=a.callerRetries==='none'?1:a.callerRetries==='bounded'&&a.retryLayers==='one-owner'&&validNumber(executionFields.get('maxAttempts'),a.maxAttempts)?a.maxAttempts:null;if(count===null)complete=false;else attempts*=count;const parent=parentOf.get(c.id);if(parent&&!validEdges.has(c.id))complete=false;c=parent?byId.get(parent):null;}
  if(c)complete=false;
  if(complete&&Number.isSafeInteger(attempts))calculations.push({kind:'nested-attempts',contractIds:chain,value:attempts,unit:'attempts',statement:chain.join(' → ')+': up to '+attempts+' leaf attempts per root request under the declared per-attempt invocation and retry limits. This is an exposure bound, not a prediction; each child effect retains its own repeat protection and identity.'});
  else if(complete)check('journey-attempt-range:'+leaf.id,null,'Representable retry exposure','The nested count exceeds the supported exact numeric range. Review a smaller caller chain.',target(leaf,'execution.maxAttempts'),true,'eq',chain);
 }
 const reading=evaluateApplicability({id:EXECUTION_COMPOSITION.id,requires},facts);
 for(const c of reading.checks){const m=meta.get(c.id);c.target=m.target;c.fieldKeys=[m.target.fieldKey.replace(/^execution\./,'')];c.dependentIds=m.dependentIds;if(c.state==='blocked')c.detail=m.question;}
 reading.reasons=[...reading.blockers,...reading.unknown].map(c=>c.detail);
 const obligations=[{id:id+':verify',action:'Verify the linked request and result boundaries together.',evidence:'Exercise root and nested retries, cancellation and lost responses; count each authority’s effects and discover its result under the declared identity. Measure full waiting times and inspect SDK/proxy attempts, result access and pending/final states.',targetIds:scope.contractIds,sourceIds,verification:'pending'}];
 return {...reading,...support,calculations,obligations,stamp:digest([EXECUTION_COMPOSITION,support]),authority:'Bounded consistency and exposure reading of declared links; no runtime, transaction or business-finality proof.'};
}
