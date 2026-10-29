import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {createProject} from './shared/projects-domain.js';
import {handleIntelligenceDraft} from './intelligence-draft-service.js';

const root=await mkdtemp(path.join(tmpdir(),'aiw-context-draft-')),dbFile=path.join(root,'project.sqlite');
const env={DB:localDatabase(dbFile),FILES:localFiles(path.join(root,'files'))};
const origin='https://aiw.test',owner='draft-owner',actor2='draft-editor',projectId='draft-project';
const scope={chapter:1,tab:'work',objectId:'REQ001',field:'question',mode:'design',taskId:''};
const p=createProject({name:'Private contextual draft regression',template:'blank'},projectId);
p.artefacts.push({id:'REQ001',type:'requirement',title:'Bounded synthetic transfer requirement',statement:'Allow one committed outcome per request.',owner:'',priority:'unconfirmed'},{id:'REQ002',type:'requirement',title:'Other requirement',statement:'An unrelated test record.',owner:'',priority:'unconfirmed'});
const at=new Date().toISOString();
await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner,projectId,JSON.stringify(p),at).run();
await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(owner,'other-project',JSON.stringify({...p,id:'other-project'}),at).run();
await env.DB.prepare('INSERT INTO project_access(owner_id,project_id,actor_id,role,created_at) VALUES(?,?,?,?,?)').bind(owner,projectId,actor2,'editor',at).run();
const checks=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
async function api(body,{actor=owner,project=projectId,selected=scope,method=body===undefined?'GET':'POST',originHeader=origin,files=env.FILES}={}){
  const url=origin+'/api/intelligence/draft?project='+project+'&scope='+encodeURIComponent(JSON.stringify(selected));
  const headers={...(actor?{'oai-authenticated-user-id':actor}:{}),...(originHeader?{Origin:originHeader}:{}),...(method==='POST'?{'Content-Type':'application/json'}:{})};
  const request=new Request(url,{method,headers,...(method==='POST'?{body:JSON.stringify(body)}:{})});
  const response=await handleIntelligenceDraft(request,{...env,FILES:files},owner,project);
  return {status:response.status,data:await response.json()};
}
let mainRowId;
const getRow=async()=>{if(!mainRowId)mainRowId=(await env.DB.prepare("SELECT id FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode='context-draft' AND object_id=? AND actor_id=? ORDER BY created_at LIMIT 1").bind(owner,projectId,scope.objectId,owner).first()).id;return env.DB.prepare('SELECT * FROM intelligence_runs WHERE owner_id=? AND id=?').bind(owner,mainRowId).first();};
let saved,initialBytes,initialKey;
try{
await check('authenticated project and exact scope, with no external provider request',async()=>{
  assert.equal((await api(undefined,{actor:null})).status,401);
  assert.equal((await api(undefined,{actor:'stranger'})).status,404);
  assert.equal((await api(undefined,{project:'missing-project'})).status,404);
  assert.equal((await api(undefined,{selected:{...scope,chapter:99}})).status,400);
  assert.equal((await api(undefined,{selected:{...scope,objectId:'FOREIGN-ID'}})).status,404);
  const empty=await api();assert.equal(empty.status,200);assert.equal(empty.data.draft,null);assert.equal(empty.data.revision,null);assert.match(empty.data.actorKey,/^[a-f0-9]{64}$/);
  assert.equal((await api({scope,draft:{prompt:'No origin'},revision:null,actorKey:empty.data.actorKey},{originHeader:'https://untrusted.test'})).status,403);
  saved=await api({scope,draft:{prompt:'Compare the retry design',semantic:false,challenge:true},revision:null,actorKey:empty.data.actorKey});
  assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal(saved.data.draft.prompt,'Compare the retry design');assert.equal(saved.data.draft.challenge,true);
  const row=await getRow();assert.equal(row.mode,'context-draft');assert.equal(row.status,'draft');assert.equal(row.used_tokens,0);assert.equal(row.reserved_tokens,0);assert.equal(row.provider,'none');
  initialKey=row.storage_key;initialBytes=await (await env.FILES.get(initialKey)).text();
});
await check('actor, project, chapter, tab, field and mode are isolated; changed identity cannot write',async()=>{
  const editor=await api(undefined,{actor:actor2});assert.equal(editor.data.draft,null);assert.notEqual(editor.data.actorKey,saved.data.actorKey);
  const changed=await api({scope,draft:{prompt:'Old actor text'},revision:null,actorKey:saved.data.actorKey},{actor:actor2});assert.equal(changed.status,409);assert.equal(changed.data.code,'draft_identity_changed');assert.equal(changed.data.actorKey,editor.data.actorKey);
  assert.equal((await api()).data.draft.prompt,'Compare the retry design');
  assert.equal((await api(undefined,{project:'other-project'})).data.draft,null);
  for(const diff of [{chapter:2},{tab:'model'},{field:'description'},{mode:'mind'},{objectId:'REQ002'}])assert.equal((await api(undefined,{selected:{...scope,...diff}})).data.draft,null);
  const editorSave=await api({scope,draft:{prompt:'Editor private question'},revision:null,actorKey:editor.data.actorKey},{actor:actor2});assert.equal(editorSave.status,200);assert.equal((await api()).data.draft.prompt,'Compare the retry design');
});
await check('concurrent compare-and-swap has exactly one winner; superseded immutable bytes are removed after commit',async()=>{
  assert.equal(await (await env.FILES.get(initialKey)).text(),initialBytes);
  const base=saved.data,put=prompt=>api({scope,draft:{prompt},revision:base.revision,actorKey:base.actorKey});
  const results=await Promise.all([put('Concurrent A'),put('Concurrent B')]);assert.deepEqual(results.map(x=>x.status).sort(),[200,409]);
  saved=results.find(x=>x.status===200);assert.equal((await api()).data.revision,saved.data.revision);
  assert.equal(await env.FILES.get(initialKey),null,'The superseded text is retired only after SQL points to the winner.');
  const freshScope={...scope,field:'new-question'},empty=(await api(undefined,{selected:freshScope})).data;
  const creates=await Promise.all(['First A','First B'].map(prompt=>api({scope:freshScope,draft:{prompt},revision:null,actorKey:empty.actorKey})));assert.deepEqual(creates.map(x=>x.status).sort(),[200,409]);
});
await check('clearing creates a tombstone revision; old tabs cannot resurrect cleared drafts',async()=>{
  const old=saved.data;const clear=await api({scope,draft:null,revision:old.revision,actorKey:old.actorKey});assert.equal(clear.status,200);assert.equal(clear.data.draft,null);assert.notEqual(clear.data.revision,old.revision);
  const after=(await api()).data;assert.equal(after.draft,null);assert.equal(after.revision,clear.data.revision);
  for(const revision of [old.revision,null])assert.equal((await api({scope,draft:{prompt:'Stale resurrection'},revision,actorKey:old.actorKey})).status,409);
  saved=await api({scope,draft:{prompt:'New question after clear'},revision:after.revision,actorKey:after.actorKey});assert.equal(saved.status,200);
});
await check('follow-up references require completed actor/project/object/task/field matching runs',async()=>{
  const putRun=async(id,{actor=owner,objectId='REQ001',taskId='',field='',status='completed',ids=null}={})=>{
    const key='intelligence/'+encodeURIComponent(owner)+'/'+projectId+'/'+id+'.json';
    const run={id,projectId,actor,status,packet:{request:{...(ids?{ids}:{objectId}),...(taskId?{architectureTaskId:taskId}:{}),...(field?{field}:{}),prompt:'A synthetic prior question'}},result:{summary:'Advisory synthetic response'}};
    await env.FILES.put(key,JSON.stringify(run));await env.DB.prepare("INSERT INTO intelligence_runs(owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens,used_tokens) VALUES(?,?,?,?,'design','fixture',?,'none','test',?,?,?,?,0,0)").bind(owner,id,projectId,objectId,status,key,at,at,actor).run();
  };
  const good='11111111-1111-4111-8111-111111111111',wrongActor='22222222-2222-4222-8222-222222222222',wrongObject='33333333-3333-4333-8333-333333333333',wrongTask='44444444-4444-4444-8444-444444444444';
  await putRun(good);await putRun(wrongActor,{actor:actor2});await putRun(wrongObject,{objectId:'REQ002'});await putRun(wrongTask,{taskId:'different-task'});
  for(const priorRunId of [wrongActor,wrongObject,wrongTask,'55555555-5555-4555-8555-555555555555']){const bad=await api({scope,draft:{prompt:'Continue prior advice',priorRunId},revision:saved.data.revision,actorKey:saved.data.actorKey});assert.equal(bad.status,403,JSON.stringify(bad.data));}
  saved=await api({scope,draft:{prompt:'Continue the valid saved reasoning',priorRunId:good},revision:saved.data.revision,actorKey:saved.data.actorKey});assert.equal(saved.status,200);assert.equal((await api()).data.draft.priorRunId,good);
  const fieldScope={...scope,mode:'field',field:'description'},empty=(await api(undefined,{selected:fieldScope})).data;
  const fieldMismatch=await api({scope:fieldScope,draft:{prompt:'Continue field',priorRunId:good},revision:null,actorKey:empty.actorKey});assert.equal(fieldMismatch.status,403);
  const reasonId='66666666-6666-4666-8666-666666666666';await putRun(reasonId,{ids:['M:1:REQ001']});
  const reasonScope={...scope,mode:'reason',field:'assessment-fixture'},reasonEmpty=(await api(undefined,{selected:reasonScope})).data;
  const reasoning=await api({scope:reasonScope,draft:{prompt:'Follow up on the chapter reading',priorRunId:reasonId},revision:null,actorKey:reasonEmpty.actorKey});assert.equal(reasoning.status,200,JSON.stringify(reasoning.data));assert.equal((await api(undefined,{selected:reasonScope})).data.draft.priorRunId,reasonId);
});
await check('current excluded objects and role changes block disclosure and writes',async()=>{
  p.workspace.aiPolicy={excludedObjectIds:['REQ001']};await env.DB.prepare('UPDATE projects SET document=? WHERE owner_id=? AND id=?').bind(JSON.stringify(p),owner,projectId).run();
  assert.equal((await api()).status,403);assert.equal((await api({scope,draft:{prompt:'Excluded'},revision:saved.data.revision,actorKey:saved.data.actorKey})).status,403);
  p.workspace.aiPolicy={enabled:false,excludedObjectIds:[]};await env.DB.prepare('UPDATE projects SET document=? WHERE owner_id=? AND id=?').bind(JSON.stringify(p),owner,projectId).run();
  assert.equal((await api()).status,200,'Private composition remains available when provider use is disabled.');
  await env.DB.prepare("UPDATE project_access SET role='viewer' WHERE owner_id=? AND project_id=? AND actor_id=?").bind(owner,projectId,actor2).run();
  const editor=(await api(undefined,{actor:actor2})).data;assert.equal(editor.draft.prompt,'Editor private question');assert.equal((await api({scope,draft:{prompt:'Viewer edit'},revision:editor.revision,actorKey:editor.actorKey},{actor:actor2})).status,403);
});
await check('storage failure preserves prior revision; corrupt or missing exact bytes fail closed',async()=>{
  const before=(await api()).data;
  const files={...env.FILES,put:async()=>{throw Error('synthetic disk failure');}};
  assert.equal((await api({scope,draft:{prompt:'Must remain local'},revision:before.revision,actorKey:before.actorKey},{files})).status,503);assert.equal((await api()).data.revision,before.revision);
  const row=await getRow(),bytes=await (await env.FILES.get(row.storage_key)).text();
  const corrupted=JSON.parse(bytes);corrupted.draft.prompt='Tampered';await env.FILES.put(row.storage_key,JSON.stringify(corrupted));assert.equal((await api()).status,422);
  await env.FILES.put(row.storage_key,bytes);await env.FILES.delete(row.storage_key);assert.equal((await api()).status,422);await env.FILES.put(row.storage_key,bytes);
  assert.equal((await api({scope,draft:{prompt:'x'.repeat(2001)},revision:before.revision,actorKey:before.actorKey})).status,400);
});
await check('active draft retention renews on successful save; cleanup failure cannot undo committed text',async()=>{
  const before=(await api()).data,row=await getRow(),old='2020-01-01T00:00:00.000Z';
  await env.DB.prepare("UPDATE intelligence_runs SET created_at=? WHERE owner_id=? AND id=?").bind(old,owner,row.id).run();
  const files={...env.FILES,delete:async()=>{throw Error('synthetic cleanup failure');}};
  const next=await api({scope,draft:{prompt:'A newly edited active draft'},revision:before.revision,actorKey:before.actorKey},{files});assert.equal(next.status,200);const updated=await getRow();assert.notEqual(updated.created_at,old);assert.equal(updated.created_at,updated.updated_at);assert.equal((await api()).data.draft.prompt,'A newly edited active draft');assert.ok(await env.FILES.get(row.storage_key),'Cleanup failure retains only unreferenced old bytes.');
});
await check('draft and tombstone rows survive a real database close and reopen',async()=>{
  const before=(await api()).data;env.DB.close();env.DB=localDatabase(dbFile);const after=(await api()).data;assert.deepEqual(after,before);
  const row=await getRow();assert.equal(row.status,'draft');assert.equal(row.input_stamp,after.revision);
});
console.log(JSON.stringify({passed:checks.length,checks},null,2));
}finally{
  env.DB.close();const resolved=path.resolve(root),parent=path.resolve(tmpdir())+path.sep;
  if(!resolved.startsWith(parent)||!path.basename(resolved).startsWith('aiw-context-draft-'))throw Error('Refusing cleanup outside the isolated test directory.');
  await rm(resolved,{recursive:true,force:true});
}
