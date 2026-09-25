import {recoveredFile} from './recovery-service.js';
import {activityStatement} from './object-service.js';
import {readStoredProject,saveStoredProject} from './project-storage.js';
import {applyEvidenceCommand} from './public/evidence-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {workingBasis} from './public/workbench-domain.js';
import {digest} from './public/brain-integrity.js';
import {sha256} from './public/workbook-reader.js';
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const text=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'';
export async function projectIdentity(env,actor,project){
 const own=await env.DB.prepare('SELECT id FROM projects WHERE owner_id=? AND id=?').bind(actor,project).first();if(own)return {owner:actor,actor,role:'owner'};
 const shared=await env.DB.prepare('SELECT owner_id,role FROM project_access WHERE actor_id=? AND project_id=?').bind(actor,project).first();return shared?{owner:shared.owner_id,actor,role:shared.role}:{owner:actor,actor,role:'owner'};
}
export async function reviewRecords(env,owner,project){const rows=await env.DB.prepare('SELECT document,revision FROM project_reviews WHERE owner_id=? AND project_id=? ORDER BY updated_at DESC').bind(owner,project).all();return rows.results.map(r=>({...JSON.parse(r.document),revision:r.revision}));}
async function bounded(request,max){if(Number(request.headers.get('Content-Length')||0)>max)throw Error('This file exceeds the 12 MB evidence limit.');const reader=request.body?.getReader();if(!reader)throw Error('Choose a file.');let total=0;const chunks=[];try{for(;;){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>max)throw Error('This file exceeds the 12 MB evidence limit.');chunks.push(value);}}catch(e){await reader.cancel();throw e;}const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return bytes;}
export async function handleCollaboration(request,env,identity,project){
 const {owner,actor,role}=identity,url=new URL(request.url),at=new Date().toISOString();
 const row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,project).first();if(!row)return json({error:'This project is unavailable.'},404);
 if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'Use this action from the project workspace.'},403);
 try{
 if(url.pathname==='/api/access'){
  if(request.method==='GET'){const members=await env.DB.prepare('SELECT actor_id,role,created_at FROM project_access WHERE owner_id=? AND project_id=?').bind(owner,project).all();return json({actor,role,owner,members:members.results});}
  if(role!=='owner')return json({error:'Only the project owner can change project roles.'},403);
  const raw=await request.json();if(!/^[A-Za-z0-9_@.\-]{1,180}$/.test(raw.actorId||'')||raw.actorId===owner)throw Error('Enter the existing authenticated account ID of a different person.');if(!['editor','reviewer','viewer','remove'].includes(raw.role))throw Error('Choose a project role.');
  if(raw.role==='remove')await env.DB.prepare('DELETE FROM project_access WHERE owner_id=? AND project_id=? AND actor_id=?').bind(owner,project,raw.actorId).run();else await env.DB.prepare('INSERT INTO project_access (owner_id,project_id,actor_id,role,created_at) VALUES (?,?,?,?,?) ON CONFLICT(owner_id,project_id,actor_id) DO UPDATE SET role=excluded.role,created_at=excluded.created_at').bind(owner,project,raw.actorId,raw.role,at).run();
  return json({saved:true,note:'Project access recorded. The person also needs access to the private Site. No invitation or message was sent.'});
 }
 if(url.pathname==='/api/attachments'){
  if(request.method==='GET'){
   const id=url.searchParams.get('id');if(!id){const rows=await env.DB.prepare('SELECT id,filename,sha256,bytes,source_id,created_at,actor_id FROM project_attachments WHERE owner_id=? AND project_id=? ORDER BY created_at DESC').bind(owner,project).all();const original=JSON.parse(row.document).workspace?.recovery?.files?.filter(f=>f.kind==='attachment').map(f=>({...f.metadata,imported:true}))||[];return json({attachments:[...rows.results,...original]});}
   let file=await env.DB.prepare('SELECT * FROM project_attachments WHERE owner_id=? AND project_id=? AND id=?').bind(owner,project,id).first();if(!file){const restored=await recoveredFile(env,owner,project,{kind:'attachment',id});if(restored)file=restored.row;}if(!file)return json({error:'This evidence file is unavailable.'},404);const item=await env.FILES.get(file.storage_key);if(!item)throw Error('The evidence bytes are unavailable.');const data=await item.arrayBuffer();if(await sha256(data)!==file.sha256)throw Error('Evidence integrity check failed.');return new Response(data,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="'+file.filename.replace(/[^A-Za-z0-9_.-]/g,'_')+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(!['owner','editor'].includes(role))return json({error:'Only project editors can attach sources.'},403);
  if(JSON.parse(row.document).workspace?.status==='archived')return json({error:'Restore this project before attaching sources.'},409);
  if(!env.FILES)throw Error('Evidence file storage is unavailable.');if(Number(url.searchParams.get('revision'))!==row.revision)return json({error:'Reload the project before attaching evidence.',conflict:true},409);
  const filename=text(url.searchParams.get('filename'),180),excerpt=text(url.searchParams.get('excerpt'),8000),title=text(url.searchParams.get('title'),180);if(!filename||!excerpt||!title)throw Error('Name the evidence and supply the exact relevant excerpt or a labelled description of non-text evidence.');
  const bytes=await bounded(request,12*1024*1024),hash=await sha256(bytes),id=crypto.randomUUID(),storageKey='evidence/'+owner+'/'+project+'/'+id;
  const stored=await readStoredProject(env,owner,row.document),p=withFinalReview(stored.document),result=applyEvidenceCommand(p,{type:'evidence.source',payload:{title,excerpt,location:'Attached original: '+filename+' · SHA-256 '+hash,version:hash.slice(0,16),date:at.slice(0,10),status:'Unconfirmed'}},at);
  const source=result.document.coauthoring.sources.find(s=>s.id===result.selected);source.attachmentId=id;source.versions.at(-1).attachment={id,filename,hash,bytes:bytes.length,actor};
  await env.FILES.put(storageKey,bytes);try{const saved=await saveStoredProject(env,owner,project,result.document,row.revision,at,stored.keys,stamp=>[env.DB.prepare('INSERT INTO project_attachments (owner_id,project_id,id,filename,sha256,bytes,storage_key,source_id,created_at,actor_id) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM projects WHERE owner_id=? AND id=? AND index_stamp=?)').bind(owner,project,id,filename,hash,bytes.length,storageKey,source.id,at,actor,owner,project,stamp)]);if(!saved.meta?.changes){await env.FILES.delete(storageKey);return json({error:'The project changed. Reattach against the latest project.',conflict:true},409);}}catch(e){await env.FILES.delete(storageKey);throw e;}
  return json({id,sourceId:source.id,hash,bytes:bytes.length},201);
 }
 if(url.pathname==='/api/reviews'){
  const stored=await readStoredProject(env,owner,row.document),p=withFinalReview(stored.document),basis=workingBasis(p);
  if(request.method==='GET')return json({actor,role,reviews:(await reviewRecords(env,owner,project)).map(r=>({...r,current:r.baselineId?!!p.finalReview.baselines.some(b=>b.id===r.baselineId&&digest(b.source)===r.basis):r.basis===basis}))});
  if(role==='viewer')return json({error:'Viewer access does not permit review actions.'},403);const body=await request.text();if(body.length>20000)throw Error('Keep review text below 20 KB.');const raw=JSON.parse(body),all=await reviewRecords(env,owner,project);let review;
  if(raw.action==='assign'){
   if(!['owner','editor'].includes(role))return json({error:'Only editors can assign a review.'},403);
   const access=await env.DB.prepare('SELECT role FROM project_access WHERE owner_id=? AND project_id=? AND actor_id=?').bind(owner,project,raw.assignee).first();if(raw.assignee!==owner&&!['reviewer','editor'].includes(access?.role))throw Error('Assign an existing project reviewer or editor.');if(!text(raw.title,180)||!text(raw.scope))throw Error('Name the review and its scope.');
   const baseline=raw.baselineId?p.finalReview.baselines.find(b=>b.id===raw.baselineId):null;if(raw.baselineId&&!baseline)throw Error('Choose an existing baseline.');review={id:crypto.randomUUID(),title:text(raw.title,180),scope:text(raw.scope),assignee:raw.assignee,assignedBy:actor,basis:baseline?digest(baseline.source):basis,baselineId:baseline?.id||null,state:'requested',at,events:[{at,actor,action:'Assigned',text:text(raw.scope)}]};await env.DB.prepare('INSERT INTO project_reviews (owner_id,project_id,id,document,revision,updated_at) VALUES (?,?,?,?,1,?)').bind(owner,project,review.id,JSON.stringify(review),at).run();
  }else{
   review=all.find(r=>r.id===raw.id);if(!review)throw Error('Choose an existing review.');if(raw.revision!==review.revision)return json({error:'This review changed. Reload before responding.',conflict:true},409);if(!text(raw.text))throw Error('Record a review observation.');
   if(raw.action==='respond'){if(actor!==review.assignee)return json({error:'Only the assigned authenticated reviewer can record this outcome.'},403);if(!['accepted','accepted with conditions','changes requested','inconclusive','withdrawn'].includes(raw.outcome)||raw.reviewed!==true)throw Error('Review the scope and choose an outcome.');const current=review.baselineId?!!p.finalReview.baselines.some(b=>b.id===review.baselineId&&digest(b.source)===review.basis):review.basis===basis;if(!current&&raw.outcome!=='withdrawn')throw Error('The working design changed. Request a review against the current design.');if(raw.outcome==='accepted with conditions'&&!text(raw.conditions))throw Error('Record the conditions before accepting with conditions.');review.state=raw.outcome;review.response={at,actor,text:text(raw.text),conditions:text(raw.conditions),independent:actor!==review.assignedBy&&actor!==owner};}
   else if(raw.action!=='comment')throw Error('Choose a review response or discussion comment.');
   review.events.push({at,actor,action:raw.action,text:text(raw.text)});const revision=review.revision;delete review.revision;const changed=await env.DB.prepare('UPDATE project_reviews SET document=?,revision=revision+1,updated_at=? WHERE owner_id=? AND project_id=? AND id=? AND revision=?').bind(JSON.stringify(review),at,owner,project,review.id,revision).run();if(!changed.meta?.changes)return json({error:'The review changed while saving.',conflict:true},409);
  }await activityStatement(env,identity,project,{at,kind:'review',title:review.title+' · '+review.state,reviewId:review.id}).run();return json({saved:true,id:review.id});
 }
 return json({error:'Unknown collaboration route.'},404);
 }catch(e){return json({error:e.message},400);}
}
