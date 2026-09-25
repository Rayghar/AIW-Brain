// Server-side client of the laptop knowledge repository service (repository-service/). What it returns
// is discovery material: unreviewed repository text with its receipts. Nothing here creates a claim,
// grants a licence or changes a release; retrieval into a project goes through knowledge.fetch.
import {readStoredProject,saveStoredProject} from './project-storage.js';
import {verifyRepositorySync,applyRepositorySync} from './repository-sync.js';
import {BRAIN_CATALOGUE,knowledgeState} from './public/knowledge-governance.js';
const LOOPBACK=new Set(['127.0.0.1','localhost','[::1]']);
export const CORPUS_AUTHORITY='discovery-only';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const str=(v,n=500)=>typeof v==='string'?v.slice(0,n):'';
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const REVISION=/^revision-[a-f0-9]{32}$/,PASSAGE=/^passage-[a-f0-9]{32}$/,HEX40=/^[a-f0-9]{40}$/,HEX64=/^[a-f0-9]{64}$/;
const registered=id=>BRAIN_CATALOGUE.repositories.some(r=>r.connectorId===id);

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

// The service's revision as the Site presents it: type-checked fields only, whether this project
// already holds the exact original, and a retrieval command only for approved, registered repositories.
function revisionView(state,r){
 if(!r||!REVISION.test(r.revisionId)||!HEX40.test(r.commit)||!HEX64.test(r.fileSha256))return null;
 const saved=state.sources.find(x=>x.origin==='repository-fetch'&&x.repository===r.repository&&x.revision===r.commit&&x.path===r.path&&x.hash===r.fileSha256);
 const retrievable=r.retrieval?.retrievable===true&&registered(r.connectorId),reason=retrievable?null:r.retrieval?.retrievable===true?'repository-registration-required':str(r.retrieval?.reason,80)||'not-retrievable';
 return {revisionId:r.revisionId,connectorId:str(r.connectorId,100),repository:str(r.repository,160),commit:r.commit,path:str(r.path,350),fileSha256:r.fileSha256,bytes:num(r.bytes),title:str(r.title,180),findings:(Array.isArray(r.findings)?r.findings:[]).map(f=>str(f,60)).slice(0,10),
  connector:{name:str(r.connector?.name,180),lifecycle:str(r.connector?.lifecycle,40)},licence:{usePolicy:str(r.licence?.usePolicy,60),reviewStatus:str(r.licence?.reviewStatus,60),finalDisposition:str(r.licence?.finalDisposition,80),spdx:str(r.licence?.spdx,60),clearance:'not-reviewed'},
  retrieval:{retrievable,reason,explanation:retrievable?null:reason==='repository-registration-required'?'The repository is not registered in this workspace.':str(r.retrieval?.explanation,300)},savedSourceId:saved?.id||null,
  command:retrievable&&!saved?{type:'knowledge.fetch',payload:{transport:'corpus',revisionId:r.revisionId,connectorId:r.connectorId,path:r.path,ref:r.commit,expectedHash:r.fileSha256}}:null};
}
function passageView(state,x){
 const revision=revisionView(state,x?.revision);if(!revision||!PASSAGE.test(x.passageId))return null;
 return {passageId:x.passageId,lineStart:num(x.lineStart),lineEnd:num(x.lineEnd),heading:str(x.heading,240),excerptSha256:HEX64.test(x.excerptSha256)?x.excerptSha256:'',verified:x.verified===true,status:str(x.status,40),
  snippet:str(x.snippet,500),excerpt:x.verified===true?str(x.excerpt,12000):'',concepts:(Array.isArray(x.concepts)?x.concepts:[]).slice(0,5).map(c=>({catalogueId:str(c.catalogueId,80),name:str(c.name,120),recordType:str(c.recordType,40)})),
  previous:PASSAGE.test(x.previous)?x.previous:null,next:PASSAGE.test(x.next)?x.next:null,revision};
}

// GET /api/knowledge/corpus?view=status|search|passage — any project member may read discovery material.
// POST ?view=sync — an editor asks for signed repository notices to be applied now.
export async function handleRepositoryCorpus(request,env,identity,projectId,{fetcher=fetch}={}){
 const url=new URL(request.url),view=url.searchParams.get('view')||'status',q=k=>url.searchParams.get(k)||'';
 try{
  if(request.method==='GET'&&view==='status')return json(await repositoryServiceStatus(env,{fetcher}));
  if(request.method==='POST'&&view==='sync'){
   if(request.headers.get('Origin')!==url.origin)return json({error:'Use your private workspace origin.'},403);
   if(!['owner','editor'].includes(identity.role))return json({error:'A project editor is required.'},403);
   return json(await syncRepositoryNotices(env,identity,projectId,{fetcher,force:true}));
  }
  if(request.method!=='GET'||!['search','passage'].includes(view))return json({error:'Choose a knowledge repository view.'},400);
  const row=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(identity.owner,projectId).first();if(!row)return json({error:'Project not found.'},404);
  const state=knowledgeState((await readStoredProject(env,identity.owner,row.document)).document);
  if(view==='passage'){const id=q('id');if(!PASSAGE.test(id))return json({error:'Choose a repository passage.'},400);
   const passage=passageView(state,await repositoryService(env,'/v1/passages/'+id,{fetcher}));if(!passage)return json({error:'The repository returned an invalid passage.'},502);
   return json({authority:CORPUS_AUTHORITY,passage});}
  const params=new URLSearchParams({q:q('q').slice(0,300),page:String(Math.max(1,Math.min(20,Number(q('page'))||1)))});
  if(/^GH-[A-Z0-9-]{1,80}$/.test(q('connector')))params.set('connector',q('connector'));
  if(/^concept-[a-f0-9]{32}$/.test(q('concept')))params.set('concept',q('concept'));
  if(q('retrievable')==='1')params.set('retrievable','1');
  const data=await repositoryService(env,'/v1/search?'+params,{fetcher});
  return json({authority:CORPUS_AUTHORITY,query:str(data.query,300),total:num(data.total),page:num(data.page)||1,pageSize:num(data.pageSize)||20,
   results:(Array.isArray(data.results)?data.results:[]).map(x=>passageView(state,x)).filter(Boolean),files:(Array.isArray(data.files)?data.files:[]).map(r=>revisionView(state,r)).filter(Boolean)});
 }catch(e){return json({error:e.message,code:e.code||null},e.code==='not_configured'||e.code==='unavailable'?409:e.status===404?404:e.status===409?409:502);}
}

// Automatic revocation processing: signed notices from the repository service are verified with the
// configured public keys and applied through the existing signed-update path, one bounded update at a
// time. Throttled per project; a project without repository originals has nothing to protect.
const lastSync=new Map();
export async function syncRepositoryNotices(env,identity,projectId,{fetcher=fetch,force=false,now=Date.now()}={}){
 const owner=identity.owner,key=owner+'\n'+projectId;
 if(!repositoryServiceEndpoint(env).configured)return {status:'not-configured'};
 if(!env.AIW_REPOSITORY_NOTICE_KEYS&&!env.AIW_REPOSITORY_SYNC_KEYS)return {status:'no-trusted-key',reason:'Install the repository service notice key (AIW_REPOSITORY_NOTICE_KEYS) before notices can be applied.'};
 const interval=Number(env.AIW_REPOSITORY_SYNC_INTERVAL_MS??60000);
 if(!force&&now-(lastSync.get(key)||0)<interval)return {status:'throttled'};
 let applied=0,cursor=null;const revoked=[];
 for(let round=0;round<50;round++){
  const row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();if(!row)return {status:'missing'};
  const stored=await readStoredProject(env,owner,row.document),s=knowledgeState(stored.document);
  if(stored.document.workspace?.status==='archived')return {status:'archived'};
  if(!s.repositorySync&&!s.sources.some(x=>x.origin==='repository-fetch'))return {status:'no-repository-sources'};
  lastSync.set(key,now);// only a read that contacts the service counts towards the interval
  const update=await repositoryService(env,'/v1/sync',{method:'POST',body:{tenantId:owner,projectId,fromCursor:s.repositorySync?.cursor||0,storeId:s.repositorySync?.storeId||null},fetcher});
  cursor=update.cursor;if(!Array.isArray(update.notices)||!update.notices.length)break;
  const packetHash=await verifyRepositorySync(update,env,{tenantId:owner,projectId}),at=new Date().toISOString();
  const result=applyRepositorySync(stored.document,update,packetHash,at,'repository-service');if(result.unchanged)break;
  const saved=await saveStoredProject(env,owner,projectId,result.document,row.revision,at,stored.keys);
  if(!saved.meta?.changes)return {status:'conflict',applied,revoked,cursor};
  applied+=update.notices.length;revoked.push(...result.revoked);
 }
 return {status:applied?'synchronised':'current',applied,revoked,cursor};
}
