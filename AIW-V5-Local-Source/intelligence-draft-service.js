// Private composition drafts share the existing run ledger. They are not AI
// invocations, source evidence, selected architecture, or human reviews.
import {readStoredProject} from './project-storage.js';
import {normalizeDraftScope,normalizeContextDraft,draftScopeKey,requestSubjectIds} from './public/intelligence-continuity.js';
import {digest} from './public/brain-integrity.js';
import {findRecord} from './public/chapter-reasoning.js';
import {journeyIndex} from './public/journey-context.js';
import {decisionPoints} from './public/brain-reasoning.js';

const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const fail=(message,status=400,code='draft_invalid')=>Object.assign(Error(message),{status,code});
const prefix=(owner,projectId)=>'intelligence/'+encodeURIComponent(owner)+'/'+projectId+'/';
const revisionPattern=/^[a-f0-9]{64}$/;
export const draftActorKey=(owner,projectId,actor)=>digest(['private-context-draft-actor',owner,projectId,actor]);
const draftRowId=(projectId,actor,scope)=>'context-draft:'+digest([projectId,actor,draftScopeKey(scope)]);
const baseObject=id=>id.replace(/^M:\d+:/,'').replace(/^[DFJ]:/,'').replace(/\|whatif$/,'');
function containsSavedId(value,id,seen=new Set()){
  if(!value||typeof value!=='object'||seen.has(value))return false;
  seen.add(value);if(value.id===id)return true;
  return Object.values(value).some(v=>v&&typeof v==='object'&&containsSavedId(v,id,seen));
}
function validateScope(p,scope){
  const id=baseObject(scope.objectId),excluded=new Set(p.workspace?.aiPolicy?.excludedObjectIds||[]);
  if(excluded.has(scope.objectId)||excluded.has(id)||scope.taskId&&excluded.has(scope.taskId))throw fail('This object is excluded from AI composition. Your local text is retained.',403,'draft_excluded');
  let known=id==='project'||!!findRecord(p,id)||journeyIndex(p).nodes.has(id);
  // Chapter 11 also composes around computed desk fixes/judgements. Resolve
  // those through the existing model rather than accepting arbitrary IDs.
  if(!known&&scope.mode==='reason'){
    const ids=scope.objectId.startsWith('K:')?[scope.objectId]:['F:'+id,'J:'+id];
    try{known=decisionPoints(p,{ids,values:{}}).items.length>0;}catch{/* not a live desk context */}
  }
  if(!known)throw fail('The saved model object is no longer available. Choose its current context.',404,'draft_scope_missing');
  if(scope.taskId&&!containsSavedId(p,scope.taskId))throw fail('The architecture task is no longer available in this project.',404,'draft_scope_missing');
}
async function readPrior(env,owner,projectId,actor,scope,id){
  const row=await env.DB.prepare('SELECT * FROM intelligence_runs WHERE owner_id=? AND project_id=? AND id=?').bind(owner,projectId,id).first();
  if(!row||row.actor_id!==actor||row.status!=='completed'||row.mode==='context-draft'||!row.storage_key.startsWith(prefix(owner,projectId)))throw fail('Choose your saved response about this object in this project.',403,'draft_prior_scope');
  const file=await env.FILES.get(row.storage_key);if(!file)throw fail('The earlier response is unavailable. Start a separate question.',409,'draft_prior_missing');
  let run;try{run=JSON.parse(await file.text());}catch{throw fail('The earlier response could not be read. Start a separate question.',409,'draft_prior_missing');}
  const request=run.packet?.request||run.request||{},subjects=requestSubjectIds(request),wanted=requestSubjectIds({ids:[scope.objectId]})[0];
  if(run.id!==id||run.projectId!==projectId||run.actor!==actor||run.status!=='completed'||!subjects.includes(wanted))throw fail('Choose your saved response about the same model object.',403,'draft_prior_scope');
  if((scope.taskId||request.architectureTaskId)&&scope.taskId!==request.architectureTaskId)throw fail('Choose a saved response from this architecture task.',403,'draft_prior_scope');
  if(scope.mode==='field'&&request.field!==scope.field)throw fail('Choose a saved response for the same field.',403,'draft_prior_scope');
}
async function readDraft(env,row,{owner,projectId,actor,scope,id}){
  if(!row)return {draft:null,revision:null};
  const start=prefix(owner,projectId)+'context-drafts/'+draftActorKey(owner,projectId,actor)+'/'+draftScopeKey(scope)+'/';
  if(row.id!==id||row.project_id!==projectId||row.actor_id!==actor||row.mode!=='context-draft'||row.status!=='draft'||!revisionPattern.test(row.input_stamp)||row.storage_key!==start+row.input_stamp+'.json')throw fail('The saved draft reference failed its integrity check.',422,'integrity');
  const file=await env.FILES.get(row.storage_key);if(!file)throw fail('The saved draft file is unavailable. Your local text is retained.',422,'integrity');
  let saved;try{saved=JSON.parse(await file.text());}catch{throw fail('The saved draft could not be read. Your local text is retained.',422,'integrity');}
  const {revision,...body}=saved;
  if(revision!==row.input_stamp||digest(body)!==revision||body.id!==id||body.owner!==owner||body.projectId!==projectId||body.actor!==actor||draftScopeKey(body.scope)!==draftScopeKey(scope))throw fail('The saved draft does not match its exact revision.',422,'integrity');
  return {draft:body.draft===null?null:{...normalizeContextDraft(body.draft),updatedAt:body.updatedAt},revision};
}
async function bodyText(request,max=16000){
  if(Number(request.headers.get('Content-Length')||0)>max)throw fail('Keep this draft within 2,000 characters.',413);
  const reader=request.body?.getReader();if(!reader)throw fail('Supply a draft and its context.');
  let total=0;const chunks=[];
  for(;;){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>max){await reader.cancel();throw fail('Keep this draft within 2,000 characters.',413);}chunks.push(value);}
  const all=new Uint8Array(total);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}return new TextDecoder().decode(all);
}
export async function handleIntelligenceDraft(request,env,owner,projectId){
  const actor=request.headers.get('oai-authenticated-user-id'),url=new URL(request.url);
  if(!actor||!owner)return json({error:'Sign in to resume your private draft.',code:'authentication'},401);
  if(!['GET','POST'].includes(request.method))return json({error:'Use GET or POST for a contextual draft.'},405);
  if(!env.DB||!env.FILES)return json({error:'Private draft storage is unavailable. Your local text is retained.',code:'draft_storage'},503);
  if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(projectId||''))return json({error:'Choose a valid project.'},400);
  if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'Save drafts from your private workbench.'},403);
  if(request.method==='POST'&&!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Expected a JSON draft.'},415);
  const actorKey=draftActorKey(owner,projectId,actor);
  try{
    // Defense in depth: the enclosing worker resolves owner; direct callers
    // must also prove the authenticated actor still has project access.
    let role='owner';if(actor!==owner){const access=await env.DB.prepare('SELECT role FROM project_access WHERE owner_id=? AND project_id=? AND actor_id=?').bind(owner,projectId,actor).first();if(!access)throw fail('This project is unavailable to this account.',404,'draft_project');role=access.role;}
    if(request.method==='POST'&&!['owner','editor'].includes(role))throw fail('This project role permits reading and assigned reviews only.',403,'role');
    const projectRow=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();if(!projectRow)throw fail('Open a project in your account first.',404,'draft_project');
    let raw,scope;try{raw=request.method==='GET'?{scope:JSON.parse(url.searchParams.get('scope')||'null')}:JSON.parse(await bodyText(request));scope=normalizeDraftScope(raw.scope);}catch(e){if(e.status)throw e;throw fail('Supply a valid chapter, tab, object and field draft scope.');}
    if(request.method==='POST'&&raw.actorKey!==actorKey)return json({error:'The signed-in identity changed. Reopen this context to load its private draft.',code:'draft_identity_changed',actorKey},409);
    const p=(await readStoredProject(env,owner,projectRow.document)).document;validateScope(p,scope);
    const id=draftRowId(projectId,actor,scope),loadRow=()=>env.DB.prepare('SELECT * FROM intelligence_runs WHERE owner_id=? AND id=?').bind(owner,id).first();
    let row=await loadRow(),previous;
    try{previous=await readDraft(env,row,{owner,projectId,actor,scope,id});}
    catch(e){
      // A concurrent successful save may retire the object after this reader
      // selected its old pointer. Retry only if SQL proves the pointer moved.
      const latest=e.code==='integrity'?await loadRow():null;
      if(!latest||latest.input_stamp===row?.input_stamp)throw e;
      row=latest;previous=await readDraft(env,row,{owner,projectId,actor,scope,id});
    }
    if(request.method==='GET'){
      if(previous.draft?.priorRunId)await readPrior(env,owner,projectId,actor,scope,previous.draft.priorRunId);
      return json({...previous,actorKey});
    }
    if(raw.revision!==null&&!revisionPattern.test(raw.revision||''))throw fail('Load the saved draft revision before saving.');
    if(raw.revision!==previous.revision)return json({error:'This draft changed in another tab. Your local text is retained.',code:'draft_conflict'},409);
    let draft;try{draft=normalizeContextDraft(raw.draft);}catch(e){throw fail(e.message);}
    if(draft?.priorRunId)await readPrior(env,owner,projectId,actor,scope,draft.priorRunId);
    const at=new Date().toISOString(),body={version:1,id,owner,projectId,actor,scope,draft,nonce:crypto.randomUUID(),updatedAt:at},revision=digest(body),key=prefix(owner,projectId)+'context-drafts/'+actorKey+'/'+draftScopeKey(scope)+'/'+revision+'.json';
    // Each attempted revision has its own immutable object. The SQL pointer is
    // switched only by a compare-and-swap; a tombstone also has a new revision,
    // preventing an old tab from resurrecting a cleared draft (the ABA race).
    await env.FILES.put(key,JSON.stringify({...body,revision}),{httpMetadata:{contentType:'application/json'}});
    // Retention scans use created_at. For this non-invocation row it represents
    // the current draft revision, so recent editing renews its retention age.
    const written=row?await env.DB.prepare("UPDATE intelligence_runs SET input_stamp=?,storage_key=?,updated_at=?,created_at=? WHERE owner_id=? AND project_id=? AND id=? AND actor_id=? AND mode='context-draft' AND status='draft' AND input_stamp=?").bind(revision,key,at,at,owner,projectId,id,actor,previous.revision).run():await env.DB.prepare("INSERT OR IGNORE INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens,used_tokens) VALUES (?,?,?,?,'context-draft',?,'draft','none','private-context-draft',?,?,?,?,0,0)").bind(owner,id,projectId,scope.objectId,revision,key,at,at,actor).run();
    if(!written.meta?.changes){try{await env.FILES.delete(key);}catch{/* an unreferenced private blob is safe to retain */}return json({error:'This draft changed in another tab. Your local text is retained.',code:'draft_conflict'},409);}
    // Never rewrite a revision. Once SQL definitively points to the new bytes,
    // remove the superseded private text. An uncertain SQL failure above keeps
    // the new object, since deleting it could break a committed pointer.
    if(row&&row.storage_key!==key)try{await env.FILES.delete(row.storage_key);}catch{/* the saved pointer is valid; later storage cleanup can retry */}
    return json({draft:draft===null?null:{...draft,updatedAt:at},revision,actorKey});
  }catch(e){return e.status?json({error:e.message,code:e.code},e.status):json({error:'Private draft storage is unavailable. Your local text is retained.',code:'draft_storage'},503);}
}
