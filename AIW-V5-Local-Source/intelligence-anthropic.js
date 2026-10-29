// The Anthropic wire behind modelCall (intelligence-provider.js; round 5, Contract P; round 12, M). It is loaded only
// when a route reaches a provider of kind anthropic, so the OpenAI paths never read it. It speaks the Messages API
// through the official SDK, which is fetch-based, so the local server and the hosted Worker share it (build.mjs
// vendors it into the Worker package). The target of a call is the registry's provider (its validated address and its
// key: https, or http on this machine's loopback, like every provider) with the route's model, effort and refusal
// fallback. One call: the pinned instructions as a cached system block; the packet as JSON in the user turn (for a
// journey, the brief's passages first, in their own cached block); the mode's JSON schema as the structured-output
// format; adaptive thinking at the configured effort; the journey and generate modes streamed to their final message.
// Retries, timers and the response-size ceiling are the seam's own (providerFetch, the call's timer), the same for
// every wire. What comes back is the parsed answer and its receipt: the model that answered, the response id, the stop
// reason, a fallback when the provider's own refusal fallback served it, and the usage including cache reads and
// writes, priced by the provider's own table. A refusal the fallback could not rescue is thrown as a coded refusal
// carrying its receipt, which each mode records as a withheld draft with the reason. Nothing here validates or applies
// an answer: the modes do.
import Anthropic from '@anthropic-ai/sdk';
import {providerFetch,withCost,ANTHROPIC_DEFAULT_MODEL,STREAMED_MODES,safeProviderIdentifier} from './intelligence-provider.js';

const FALLBACK_BETA='server-side-fallback-2026-07-01';
// Output ceilings: thinking counts toward max_tokens, so a streamed mode (the larger answers) has room for both.
export const MAX_TOKENS=16000,STREAM_MAX_TOKENS=32000;
// The response-size ceilings for this wire: a streamed answer arrives as server-sent events, several times its size.
const BYTES={streamed:4000000,whole:1000000};

// The mode's JSON schema as a structured-output format. The format takes types, enums, required keys and closed objects;
// it does not take length, count or range limits, so those are dropped from the format and named in the description,
// as the SDK's own helper does, while the mode's validator still enforces them on the answer. Enumerations stay: they
// are what holds a citation or an element id to the packet. The title names the contract, as the OpenAI format's name.
const LIMITS=new Set(['maxItems','minItems','minLength','maxLength','minimum','maximum','exclusiveMinimum','exclusiveMaximum','multipleOf','pattern','uniqueItems','minProperties','maxProperties']);
export function structuredSchema(schema,name){
 const walk=s=>{
  if(!s||typeof s!=='object'||Array.isArray(s))return s;
  const out={},limits=[];
  for(const [k,v] of Object.entries(s)){
   if(k==='minItems'&&(v===0||v===1)){out[k]=v;continue;}
   if(LIMITS.has(k)){limits.push(k+': '+JSON.stringify(v));continue;}
   out[k]=k==='properties'||k==='$defs'?Object.fromEntries(Object.entries(v).map(([p,x])=>[p,walk(x)])):k==='items'?walk(v):k==='anyOf'||k==='allOf'?v.map(walk):v;
  }
  if(out.type==='object'){out.properties??={};out.required??=Object.keys(out.properties);out.additionalProperties=false;}
  if(limits.length)out.description=(out.description?out.description+'\n\n':'')+'{'+limits.join(', ')+'}';
  return out;
 };
 return {title:name,...walk(schema)};
}

// The user turn. Stable content first so the cache can hold it: for a journey (draft or check) the brief's passages are
// lifted into their own block, marked for caching after the instructions; the rest of the packet follows. Every block
// is the packet's own JSON, so the two blocks together are exactly what the OpenAI path sends as one.
function liftPassages(input){
 if(Array.isArray(input?.passages)){const {passages,...rest}=input;return {stable:{passages},rest};}
 if(Array.isArray(input?.packet?.passages)){const {packet:{passages,...packet},...rest}=input;return {stable:{packet:{passages}},rest:{packet,...rest}};}
 return null;
}
export function userBlocks(mode,input){
 const lifted=mode==='journey'?liftPassages(input):null;
 if(lifted)return [{type:'text',text:JSON.stringify(lifted.stable),cache_control:{type:'ephemeral'}},{type:'text',text:JSON.stringify(lifted.rest)}];
 return [{type:'text',text:JSON.stringify(input)}];
}

// The request body for one call (the SDK turns betas into the anthropic-beta header and sends the rest as it is). The
// target names the model, the effort and the refusal fallback (a route's target, or the status of the old form).
export function anthropicRequest(target,{instructions,input,schema,name,mode}){
 const streamed=STREAMED_MODES.includes(mode);
 return {model:target.model||ANTHROPIC_DEFAULT_MODEL,max_tokens:streamed?STREAM_MAX_TOKENS:MAX_TOKENS,thinking:{type:'adaptive'},
  output_config:{effort:target.effort||'medium',format:{type:'json_schema',schema:structuredSchema(schema,name)}},
  system:[{type:'text',text:instructions,cache_control:{type:'ephemeral'}}],
  messages:[{role:'user',content:userBlocks(mode,input)}],
  ...(target.refusalFallback==='default'?{betas:[FALLBACK_BETA],fallbacks:'default'}:{})};
}

// Every request goes through the seam's providerFetch (its one bounded retry, the call's own timer and signal), with
// redirects refused and the response cut off past its ceiling.
function seamFetch(fetcher,call,limit,attempts=2){
 return async(url,init)=>{
  const response=await providerFetch(fetcher,typeof url==='string'?url:String(url),init,call,{attempts});
  if(!response?.body||[101,204,205,304].includes(response.status))return response;
  let size=0;
  const counted=response.body.pipeThrough(new TransformStream({transform(chunk,c){size+=chunk.byteLength;if(size>limit){call.oversize=true;c.error(Object.assign(Error('The provider response exceeded its limit.'),{code:'invalid_output'}));return;}c.enqueue(chunk);}}));
  return new Response(counted,{status:response.status,statusText:response.statusText,headers:response.headers});
 };
}
// The client for one provider of the registry: its own key, at its own validated address (the SDK appends /v1/…).
function client(target,call,fetcher,limit,attempts){
 return new Anthropic({apiKey:String(target.provider.key||'').trim(),authToken:null,baseURL:target.provider.baseURL,maxRetries:0,timeout:600000,fetch:seamFetch(fetcher,call,limit,attempts),fetchOptions:{redirect:'error'}});
}

// The SDK's typed errors, answered in the seam's own codes (and so the service's 429 and 502 answers). The SDK has no
// APIStatusError: every status error is an APIError with its status.
const answer={authentication:'The provider could not authorise this connection. Check the server-side key and model access.',provider_limit:'The provider request limit was reached. Your request is retained.',provider_unavailable:'The provider could not complete this request. Your request is retained.'};
const coded=code=>Object.assign(Error(answer[code]),{code});
// Round 25 (D-25-12): a failure with a status is logged as the OpenAI wire logs one (anthropic-provider-failure), and
// travels with the error as its providerFailure, so a refusal such as an account gate can be read without sending the
// call again: the status, the error's type and the request id, each only when it is a plain identifier. Never the key,
// the provider's message text or the request.
export function anthropicFailure(e){
 const receipt={upstreamStatus:e.status},id=safeProviderIdentifier(e.requestID??e.headers?.get?.('request-id')??e.headers?.['request-id'],128),type=safeProviderIdentifier(e.error?.error?.type);
 if(id)receipt.upstreamRequestId=id;if(type)receipt.upstreamType=type;return receipt;
}
export function anthropicError(e,call,noun='assessment'){
 if(call.oversize)return Object.assign(Error(`The provider response exceeded the ${noun} limit.`),{code:'invalid_output'});
 if(call.aborted)return e;
 const failure=e instanceof Anthropic.APIError&&Number.isInteger(e.status)?anthropicFailure(e):null,known=x=>(failure?Object.assign(x,{providerFailure:failure}):x);
 if(failure)console.error(JSON.stringify({event:'anthropic-provider-failure',...failure}));
 if(e instanceof Anthropic.RateLimitError)return known(coded('provider_limit'));
 if(e instanceof Anthropic.AuthenticationError||e instanceof Anthropic.PermissionDeniedError)return known(coded('authentication'));
 if(e instanceof Anthropic.APIConnectionTimeoutError)return Object.assign(Error('The provider took too long. Your request is saved.'),{code:'timeout'});
 // The status travels with the code (never the upstream text): the seam falls back to another route on a 5xx only.
 if(e instanceof Anthropic.APIError)return known(Object.assign(coded('provider_unavailable'),Number.isInteger(e.status)?{status:e.status}:{}));
 if(e?.code&&typeof e.code==='string')return e;
 return coded('provider_unavailable');
}

const count=v=>{const n=Number(v);return Number.isFinite(n)&&n>0?n:0;};
// Usage, honestly counted: after a refusal fallback the per-attempt iterations are the source (top-level usage covers
// only the attempt that answered). inputTokens is the whole prompt, uncached plus cache reads and writes, as OpenAI
// counts its own cached input inside input_tokens, so the budget compares like with like.
export function anthropicUsage(env,u,pricing){
 const parts=Array.isArray(u?.iterations)&&u.iterations.length?u.iterations:[u||{}],sum=k=>parts.reduce((t,x)=>t+count(x?.[k]),0);
 const read=sum('cache_read_input_tokens'),write=sum('cache_creation_input_tokens');
 return withCost(env,{inputTokens:sum('input_tokens')+read+write,outputTokens:sum('output_tokens'),cacheReadTokens:read,cacheWriteTokens:write},pricing);
}
function fallbackOf(m){
 const switches=m.content.filter(b=>b?.type==='fallback').map(b=>({from:String(b.from?.model||'').slice(0,120),to:String(b.to?.model||'').slice(0,120)}));
 const served=Array.isArray(m.usage?.iterations)&&m.usage.iterations.some(x=>x?.type==='fallback_message');
 return switches.length||served?{servedBy:String(m.model||'').slice(0,120),switches}:null;
}
// The answer: a refusal is thrown with its receipt (never with the model's words), a stop short of the end is
// incomplete, and only the text after the last fallback switch point is the answer.
function readMessage(env,target,m,call,{noun}){
 if(typeof m==='string'){try{m=JSON.parse(m);}catch{throw Object.assign(Error('The provider returned unreadable output.'),{code:'invalid_output'});}}
 if(!m||typeof m!=='object'||!Array.isArray(m.content))throw Object.assign(Error('The provider returned unreadable output.'),{code:'invalid_output'});
 const fallback=fallbackOf(m),receipt={model:typeof m.model==='string'&&m.model?m.model.slice(0,120):target.model,usage:anthropicUsage(env,m.usage,target.provider?.pricing),attempts:call.attempts,providerResponseId:typeof m.id==='string'?m.id.slice(0,180):null,stopReason:typeof m.stop_reason==='string'?m.stop_reason:null,...(fallback?{fallback}:{})};
 if(m.stop_reason==='refusal'){
  const category=typeof m.stop_details?.category==='string'&&/^[a-z_]{1,40}$/.test(m.stop_details.category)?m.stop_details.category:null;
  throw Object.assign(Error('The provider declined this request.'),{code:'refusal',refusal:{category,reason:`The provider declined to answer${category?` (refusal category: ${category})`:''}${target.refusalFallback==='default'?' and its fallback did not answer either':''}; nothing was drafted.`},...receipt});
 }
 if(m.stop_reason!=='end_turn'&&m.stop_reason!=='stop_sequence')throw Object.assign(Error(`The provider response was incomplete. No ${noun} was created.`),{code:'incomplete',...receipt});
 const last=m.content.map(b=>b?.type).lastIndexOf('fallback'),text=m.content.slice(last+1).filter(b=>b?.type==='text').map(b=>String(b.text)).join('');
 let raw,parseError;try{raw=JSON.parse(text);}catch(e){parseError=e.message==='Unexpected end of JSON input'?'The model response was incomplete.':e.message;}
 return {raw,...(parseError?{parseError}:{}),...receipt};
}

// One call through the seam. The journey and generate modes stream (their answers are the longest) and read the final
// message; the others ask for the whole message. The refusal fallback is a beta of the Messages API, so a request that
// opts in goes through the beta namespace.
export async function anthropicCall(env,target,request,call,fetcher,{noun='assessment'}={}){
 const streamed=STREAMED_MODES.includes(request.mode),params=anthropicRequest(target,request);
 const sdk=client(target,call,fetcher,streamed?BYTES.streamed:BYTES.whole,2),api=params.betas?sdk.beta.messages:sdk.messages;
 if(!params.betas){delete params.betas;delete params.fallbacks;}
 let message;
 try{message=streamed?await api.stream(params,{signal:call.signal}).finalMessage():await api.create(params,{signal:call.signal});}
 catch(e){throw anthropicError(e,call,noun);}
 return readMessage(env,target,message,call,{noun});
}

// The connection probe: GET /v1/models/{model}, one attempt, no project data.
export async function anthropicProbe(env,target,call,fetcher){
 try{await client(target,call,fetcher,BYTES.whole,1).models.retrieve(target.model,{signal:call.signal});return {ok:true};}
 catch(e){const x=anthropicError(e,call,'probe');if(call.aborted)throw e;return {ok:false,code:x.code==='authentication'?'authentication':'provider_unavailable',...(x.providerFailure||{})};}
}
// The models the provider lists (GET /v1/models, the first page of up to 100), for the organisation's view.
export async function anthropicModels(env,target,call,fetcher){
 try{const page=await client(target,call,fetcher,BYTES.whole,1).models.list({limit:100},{signal:call.signal});return (page?.data||[]).map(m=>String(m?.id||'')).filter(Boolean);}
 catch(e){throw anthropicError(e,call,'probe');}
}
