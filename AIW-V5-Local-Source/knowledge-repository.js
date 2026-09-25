// Server-side client of the laptop knowledge repository service (repository-service/). What it returns
// is discovery material: unreviewed repository text with its receipts. Nothing here creates a claim,
// grants a licence or changes a release; retrieval into a project goes through knowledge.fetch.
const LOOPBACK=new Set(['127.0.0.1','localhost','[::1]']);
export const CORPUS_AUTHORITY='discovery-only';

export function repositoryServiceEndpoint(env){
 const raw=String(env.AIW_KNOWLEDGE_REPOSITORY_URL||'').trim();
 if(!raw)return {configured:false,reason:'The knowledge repository service is not configured on this server.'};
 let url;try{url=new URL(raw);}catch{return {configured:false,reason:'The knowledge repository address is not a valid URL.'};}
 if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'||url.protocol==='http:'&&LOOPBACK.has(url.hostname)))return {configured:false,reason:'Use an https address, or http on this computer only, without credentials.'};
 if(String(env.AIW_KNOWLEDGE_REPOSITORY_TOKEN||'').length<32)return {configured:false,reason:'The knowledge repository service token is not configured on this server.'};
 return {configured:true,base:url.origin+url.pathname.replace(/\/+$/,'')};
}

export async function repositoryService(env,route,{method='GET',body=null,fetcher=fetch,timeoutMs=15000,maxBytes=4000000}={}){
 const endpoint=repositoryServiceEndpoint(env);if(!endpoint.configured)throw Object.assign(Error(endpoint.reason),{code:'not_configured'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetcher(endpoint.base+route,{method,redirect:'error',signal:controller.signal,headers:{Authorization:'Bearer '+env.AIW_KNOWLEDGE_REPOSITORY_TOKEN,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const reader=response.body?.getReader();if(!reader)throw Error('The knowledge repository returned no body.');
  let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw Error('The knowledge repository response exceeded its limit.');}text+=decoder.decode(value,{stream:true});}
  text+=decoder.decode();let data;try{data=JSON.parse(text);}catch{throw Error('The knowledge repository returned an unreadable response.');}
  if(!response.ok)throw Object.assign(Error(typeof data?.error==='string'?data.error.slice(0,400):'The knowledge repository answered '+response.status+'.'),{status:response.status,reason:data?.reason||null});
  return data;
 }catch(e){if(controller.signal.aborted)throw Object.assign(Error('The knowledge repository did not answer in time.'),{code:'timeout'});if(e?.cause?.code==='ECONNREFUSED'||/fetch failed/i.test(e?.message||''))throw Object.assign(Error('The knowledge repository service is not running. Start it on the laptop: node repository-service/cli.mjs serve'),{code:'unavailable'});throw e;}
 finally{clearTimeout(timer);}
}

// Status for the Sources view. A service that is configured but down is reported, not hidden.
export async function repositoryServiceStatus(env,{fetcher=fetch}={}){
 const endpoint=repositoryServiceEndpoint(env);if(!endpoint.configured)return {connected:false,configured:false,reason:endpoint.reason,authority:CORPUS_AUTHORITY};
 try{const s=await repositoryService(env,'/v1/status',{fetcher,timeoutMs:6000});
  return {connected:true,configured:true,storeId:s.storeId,cursor:s.cursor,baselineAt:s.baselineAt,builtAt:s.builtAt,counts:s.counts,connectors:(s.connectors||[]).map(c=>({connectorId:c.connectorId,repository:c.repository,name:c.name,lifecycle:c.lifecycle,usePolicy:c.usePolicy,spdx:c.spdx,documents:c.documents,passages:c.passages})),noticeKey:s.signing?.keyId||null,authority:CORPUS_AUTHORITY,productionAccepted:false};}
 catch(e){return {connected:false,configured:true,reason:e.message,authority:CORPUS_AUTHORITY};}
}
