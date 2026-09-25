import {refreshRepositoryAssurance} from './repository-sync.js';
import {operationStatement} from './operation-service.js';
import {refreshOrganizationAssurance} from './organization-service.js';
import {prepareBrainPacket} from './brain-retrieval.js';
import {intelligencePacket,intelligenceRequest,adoptIntelligence,generationReceipt} from './public/intelligence-context.js';
import {generationCurrent} from './public/aiw-brain.js';
import {changeFingerprint} from './public/changes-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {readStoredProject} from './project-storage.js';
import {intelligenceStatus,requestIntelligence,requestReasoning} from './intelligence-provider.js';
import {reasoningRequest,reasoningPacket,adoptReasoning,checkRecordRefinements} from './public/brain-reasoning.js';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const prefix=(owner,projectId)=>'intelligence/'+encodeURIComponent(owner)+'/'+projectId+'/';
const rowFor=(env,owner,projectId,id)=>env.DB.prepare('SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND id=?').bind(owner,projectId,id).first();
const genericError=code=>({timeout:'The provider took too long. Your request is retained.',refusal:'The provider declined the request. Reframe the design question.',authentication:'Check the server-side key and model access.',provider_limit:'The provider request limit was reached.',invalid_output:'The response did not pass source and structure checks.',incomplete:'The provider returned an incomplete response.',storage:'The response could not be saved. No proposal was applied.'}[code]||'The request could not be completed. Your saved model is unchanged.');
function metadata(row){return {id:row.id,objectId:row.object_id,mode:row.mode,status:row.status==='pending'&&Date.now()-Date.parse(row.created_at)>120000?'interrupted':row.status,provider:row.provider,model:row.model,createdAt:row.created_at,updatedAt:row.updated_at,...(row.error_code?{error:genericError(row.error_code)}:{})};}
async function readRun(env,owner,projectId,row){
 if(!row||!row.storage_key.startsWith(prefix(owner,projectId)))throw Error('The saved response is unavailable.');
 const file=await env.FILES?.get(row.storage_key);if(!file)return {...metadata(row),error:'The saved response could not be loaded. Retry opening it.'};
 const run=JSON.parse(await file.text());if(run.id!==row.id||run.projectId!==projectId)throw Error('The saved response reference does not match.');
 return {...run,...(run.status==='completed'?{}:metadata(row))};
}
async function loadProject(env,owner,id){const row=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,id).first();return row?await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,withFinalReview((await readStoredProject(env,owner,row.document)).document))):null;}
export async function adoptSavedIntelligence(env,owner,projectId,p,payload,at){
 const row=await rowFor(env,owner,projectId,payload.runId);if(!row)throw Error('Choose a saved response in this project.');
 if(payload.kind==='assessment'){if(row.mode!=='reason')throw Error('Choose a saved assessment of Sol’s.');return adoptReasoning(await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,p)),payload,await readRun(env,owner,projectId,row),at);}
 return adoptIntelligence(await refreshRepositoryAssurance(env,owner,await refreshOrganizationAssurance(env,owner,p)),payload,await readRun(env,owner,projectId,row),at);
}
export async function handleIntelligence(request,env,owner,projectId){
 const url=new URL(request.url),action=url.pathname.slice('/api/intelligence/'.length);
 if(action==='status'&&request.method==='GET')return json(intelligenceStatus(env));
 if(action==='runs'&&request.method==='GET'){
  const p=await loadProject(env,owner,projectId);if(!p)return json({error:'Open a project in your account first.'},404);
  const id=url.searchParams.get('id');
  if(id){const row=await rowFor(env,owner,projectId,id);if(!row)return json({error:'This response is unavailable for your project.'},404);const run=await readRun(env,owner,projectId,row);return json({...run,current:run.status==='completed'?generationCurrent(p,generationReceipt(run)):false});}
  const objectId=url.searchParams.get('object')||'';
  const rows=await env.DB.prepare('SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND object_id=? ORDER BY created_at DESC LIMIT 12').bind(owner,projectId,objectId).all();return json({runs:rows.results.map(metadata)});
 }
 if(action==='reasonings'&&request.method==='GET'){
  const rows=await env.DB.prepare("SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode='reason' AND status='completed' ORDER BY created_at DESC LIMIT 40").bind(owner,projectId).all();
  const runs=[];for(const row of rows.results){try{const run=await readRun(env,owner,projectId,row);if(run.status==='completed')runs.push({id:run.id,createdAt:run.createdAt,provider:run.provider,model:run.model,packet:{stamp:run.packet.stamp,request:run.packet.request,items:run.packet.items,sources:run.packet.sources.map(s=>({ref:s.ref,kind:s.kind,objectId:s.objectId,title:s.title,posture:s.posture,receipt:s.receipt||null,excerpt:s.excerpt}))},result:run.result,groundingReview:{accepted:run.groundingReview?.accepted,withheld:run.groundingReview?.withheld||[]}});}catch{}}
  return json({runs});
 }
 if(['reasoning-context','reason'].includes(action)&&request.method==='POST')return handleReasoning(request,env,owner,projectId,action,url);
 if(!['context','generate'].includes(action)||request.method!=='POST')return json({error:'Intelligence action not found.'},404);
 if(request.headers.get('Origin')!==url.origin)return json({error:'Use Sol from your private workbench.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected a design request.'},415);
 const bytes=await request.text();if(bytes.length>8000)return json({error:'Keep the request within 2,000 characters.'},413);
 let raw,normal;try{raw=JSON.parse(bytes);normal=intelligenceRequest(raw);}catch(e){return json({error:e.message},400);}
 const p=await loadProject(env,owner,projectId);if(!p)return json({error:'Open a project in your account first.'},404);
 const policy=p.workspace?.aiPolicy||{enabled:true,hourlyRequests:10,dailyTokens:1000000};if(policy.enabled===false&&(normal.semantic||action==='generate'))return json({error:'The project owner has disabled external AI processing.'},403);
 if(action==='context'){try{return json({packet:await prepareBrainPacket(env,owner,p,normal)});}catch(e){return json({error:e.message},400);}}
 if(!env.FILES)return json({error:'Private response storage is unavailable. No request was sent.'},503);
 if(!/^[a-f0-9-]{36}$/.test(raw.requestId||''))return json({error:'Start a new request from Sol.'},400);
 const inputStamp=changeFingerprint({request:normal,packetStamp:raw.packetStamp}),existing=await rowFor(env,owner,projectId,raw.requestId);
 if(existing){if(existing.input_stamp!==inputStamp)return json({error:'This request identifier belongs to different input. Start a new request.'},409);return json(await readRun(env,owner,projectId,existing));}
 const status=intelligenceStatus(env);if(!status.configured)return json({error:'LLM connection is not configured. Project guidance remains available.',configuration:status},503);
 let packet;try{packet=await prepareBrainPacket(env,owner,p,normal,{forGeneration:true,expectedStamp:raw.packetStamp});}catch(e){return json({error:e.message},400);}
 if(packet.stamp!==raw.packetStamp)return json({error:'The context changed. Review the sources again before sending.',conflict:true},409);
 const at=new Date().toISOString(),hour=new Date(Date.now()-3600000).toISOString(),active=new Date(Date.now()-120000).toISOString(),key=prefix(owner,projectId)+raw.requestId+'.json';
 const reservedTokens=2*new TextEncoder().encode(JSON.stringify(packet)).length+188000;
 const inserted=await env.DB.prepare("INSERT OR IGNORE INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens) SELECT ?,?,?,?,?,?,'pending',?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM intelligence_runs WHERE owner_id=? AND created_at>?)<10 AND (SELECT COUNT(*) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND created_at>?)<? AND (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND created_at>?) + (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM brain_retrieval_runs WHERE owner_id=? AND project_id=? AND created_at>?) + ? <= ? AND NOT EXISTS (SELECT 1 FROM intelligence_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner,raw.requestId,projectId,normal.objectId,normal.mode,inputStamp,status.provider,status.model,key,at,at,request.headers.get('oai-authenticated-user-id'),reservedTokens,owner,hour,owner,projectId,hour,policy.hourlyRequests??10,owner,projectId,new Date(Date.now()-86400000).toISOString(),owner,projectId,new Date(Date.now()-86400000).toISOString(),reservedTokens,policy.dailyTokens??1000000,owner,projectId,active).run();
 if(!inserted.meta?.changes)return json({error:'A request is already running, or a project or hourly request budget has been reached. Reopen saved requests before trying again.'},429);
 let run={actor:request.headers.get('oai-authenticated-user-id'),id:raw.requestId,projectId,objectId:normal.objectId,mode:normal.mode,status:'pending',provider:status.provider,model:status.model,createdAt:at,updatedAt:at,packet};
 try{
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  const generated=await requestIntelligence(env,packet);run={...run,...generated,status:'completed',updatedAt:new Date().toISOString()};
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  await env.DB.prepare("UPDATE intelligence_runs SET status='completed',model=?,updated_at=?,used_tokens=? WHERE owner_id=? AND id=?").bind(run.model,run.updatedAt,run.usage.inputTokens+run.usage.outputTokens,owner,run.id).run();
  await operationStatement(env,owner,projectId,'ai',{id:run.id,actor:run.actor,status:'completed',usage:run.usage,model:run.model,groundingAccepted:run.groundingReview.accepted}).run();
  const currentProject=await loadProject(env,owner,projectId);return json({...run,current:generationCurrent(currentProject,generationReceipt(run))});
 }catch(e){
  const code=e.code||'storage',failed={...run,status:'failed',updatedAt:new Date().toISOString(),error:genericError(code)};
  // If a completed response reached R2, retain it even if the metadata write failed.
  try{const saved=await env.FILES.get(key),value=saved?JSON.parse(await saved.text()):null;if(value?.status==='completed')return json({...value,current:generationCurrent(p,generationReceipt(value))});}catch{}
  try{await env.FILES.put(key,JSON.stringify({...failed,result:undefined}),{httpMetadata:{contentType:'application/json'}});}catch{}
  await env.DB.prepare("UPDATE intelligence_runs SET status='failed',error_code=?,updated_at=? WHERE owner_id=? AND id=?").bind(code,failed.updatedAt,owner,run.id).run();
  return json({...failed,result:undefined},code==='provider_limit'?429:502);
 }
}

// Sol's assessments at the review desk and in the chapter models: the packet is prepared and shown
// first (reasoning-context), then sent (reason) only if it is still the packet the architect saw. Same budgets, storage and
// replay rules as every other Sol request; nothing is applied.
async function handleReasoning(request,env,owner,projectId,action,url){
 if(request.headers.get('Origin')!==url.origin)return json({error:'Use Sol from your private workbench.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected a reasoning request.'},415);
 const bytes=await request.text();if(bytes.length>40000)return json({error:'Ask Sol about fewer decisions at a time.'},413);
 let raw,normal;try{raw=JSON.parse(bytes);normal=reasoningRequest(raw);}catch(e){return json({error:e.message},400);}
 const p=await loadProject(env,owner,projectId);if(!p)return json({error:'Open a project in your account first.'},404);
 const policy=p.workspace?.aiPolicy||{enabled:true,hourlyRequests:10,dailyTokens:1000000};
 if(action==='reasoning-context'){try{return json({packet:reasoningPacket(p,normal),configuration:intelligenceStatus(env)});}catch(e){return json({error:e.message},400);}}
 if(policy.enabled===false)return json({error:'The project owner has disabled external AI processing.'},403);
 if(!env.FILES)return json({error:'Private response storage is unavailable. No request was sent.'},503);
 if(!/^[a-f0-9-]{36}$/.test(raw.requestId||''))return json({error:'Start a new request from the desk.'},400);
 const inputStamp=changeFingerprint({request:normal,packetStamp:raw.packetStamp}),existing=await rowFor(env,owner,projectId,raw.requestId);
 if(existing){if(existing.input_stamp!==inputStamp)return json({error:'This request identifier belongs to different input. Start a new request.'},409);return json(await readRun(env,owner,projectId,existing));}
 const status=intelligenceStatus(env);if(!status.configured)return json({error:'LLM connection is not configured. The desk’s readings and drafts remain available.',configuration:status},503);
 let packet;try{packet=reasoningPacket(p,normal);}catch(e){return json({error:e.message},400);}
 if(packet.stamp!==raw.packetStamp)return json({error:'The desk changed. Review what Sol will read again before sending.',conflict:true},409);
 const at=new Date().toISOString(),hour=new Date(Date.now()-3600000).toISOString(),active=new Date(Date.now()-120000).toISOString(),key=prefix(owner,projectId)+raw.requestId+'.json';
 const reservedTokens=3*new TextEncoder().encode(JSON.stringify(packet)).length+24000;
 const inserted=await env.DB.prepare("INSERT OR IGNORE INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens) SELECT ?,?,?,?,'reason',?,'pending',?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM intelligence_runs WHERE owner_id=? AND created_at>?)<? AND (SELECT COUNT(*) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND created_at>?)<? AND (SELECT COALESCE(SUM(COALESCE(used_tokens,reserved_tokens)),0) FROM intelligence_runs WHERE owner_id=? AND project_id=? AND created_at>?) + ? <= ? AND NOT EXISTS (SELECT 1 FROM intelligence_runs WHERE owner_id=? AND project_id=? AND status='pending' AND created_at>?)").bind(owner,raw.requestId,projectId,normal.scope.slice(0,100),inputStamp,status.provider,status.model,key,at,at,request.headers.get('oai-authenticated-user-id'),reservedTokens,owner,hour,Math.max(10,policy.hourlyRequests??10),owner,projectId,hour,policy.hourlyRequests??10,owner,projectId,new Date(Date.now()-86400000).toISOString(),reservedTokens,policy.dailyTokens??1000000,owner,projectId,active).run();
 if(!inserted.meta?.changes)return json({error:'Sol is already working, or the project’s hourly request budget has been reached. Its earlier assessments stay on the desk.'},429);
 let run={actor:request.headers.get('oai-authenticated-user-id'),id:raw.requestId,projectId,objectId:normal.scope,mode:'reason',status:'pending',provider:status.provider,model:status.model,createdAt:at,updatedAt:at,packet};
 try{
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  const reasoned=await requestReasoning(env,packet,{check:r=>checkRecordRefinements(p,packet,r)});run={...run,...reasoned,status:'completed',updatedAt:new Date().toISOString()};
  await env.FILES.put(key,JSON.stringify(run),{httpMetadata:{contentType:'application/json'}});
  await env.DB.prepare("UPDATE intelligence_runs SET status='completed',model=?,updated_at=?,used_tokens=? WHERE owner_id=? AND id=?").bind(run.model,run.updatedAt,run.usage.inputTokens+run.usage.outputTokens,owner,run.id).run();
  await operationStatement(env,owner,projectId,'ai',{id:run.id,actor:run.actor,status:'completed',usage:run.usage,model:run.model,groundingAccepted:run.groundingReview.accepted}).run();
  return json(run);
 }catch(e){
  const code=e.code||'storage',failed={...run,status:'failed',updatedAt:new Date().toISOString(),error:genericError(code)};
  try{await env.FILES.put(key,JSON.stringify({...failed,result:undefined}),{httpMetadata:{contentType:'application/json'}});}catch{}
  await env.DB.prepare("UPDATE intelligence_runs SET status='failed',error_code=?,updated_at=? WHERE owner_id=? AND id=?").bind(code,failed.updatedAt,owner,run.id).run();
  return json({...failed,result:undefined},code==='provider_limit'?429:502);
 }
}
