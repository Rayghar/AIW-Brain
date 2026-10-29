// Retention (round 2, B2-04, B2-11). One policy, applied by the local server at start-up and then hourly
// (server.js), by `node scripts/retention.mjs` on demand, and callable from a hosted scheduled trigger with the
// same bindings. It works through the D1-shaped adapter only, so it runs unchanged against the local SQLite.
//
// What is swept, and what never is:
// - Sol's runs (intelligence_runs, brain_retrieval_runs) and their response and packet objects after runsDays.
//   What the architect adopted was copied into the project at adoption with its receipt; the run file is the
//   provider transcript, kept for review for runsDays. A run still "pending" after interruptedMinutes was cut
//   off mid-flight (a crash, a stopped server): it becomes "interrupted" with no tokens used, which releases its
//   reservation from the daily budget at once.
// - operation_events (job, sync and AI operation log) after eventsDays; project_activity (the activity feed)
//   after activityDays; command_receipts and route_receipts (idempotency receipts) after receiptsHours.
// - Workbook uploads that no dataset of their project references (uploaded and inspected, never applied; or whose
//   project no longer exists) after uploadsDays, with their files. A project that cannot be read is skipped and
//   reported: nothing is removed on a guess.
// - Never: projects and their objects, baselines, the change journal, applied workbook uploads and their source
//   snapshots, and attachments. They are the project's evidence and live as long as the project does. Project
//   reviews and discussions likewise. Superseded project objects (an earlier journal head, an earlier knowledge or
//   evidence file) are deleted by the next save once they are ten minutes old (project-storage.js), and Sol's
//   semantic index is one object per project, replaced when its scope changes (brain-retrieval.js).
// - Recovery points (round 12, A3: GR-STO-07): a storage upgrade keeps the version it replaced (storage-upgrade.js), the
//   row as it was and every object that row referenced, named by a recovery point. A project's recovery points older
//   than recoveryPointsDays are retired, its newest always kept: the point is deleted, and the objects only it kept are
//   released — deleted at once when no kept point and no current row of the project needs them, and no longer kept by
//   its row. A kept point reads back whole, as it was.
import {readStoredProject,referencedKeys} from './project-storage.js';
import {stagingKey} from './recovery-package.js';
export const DEFAULT_RETENTION=Object.freeze({runsDays:90,eventsDays:365,activityDays:365,uploadsDays:30,receiptsHours:24,interruptedMinutes:10,recoveryPointsDays:90});
const days=(value,fallback)=>{if(value===undefined||value===null||value==='')return fallback;const n=Number(value);if(!Number.isInteger(n)||n<0||n>36500)throw Error('Retention settings are whole numbers of days, 0 to keep for ever.');return n;};
export function retentionPolicy(env={}){
 return {...DEFAULT_RETENTION,runsDays:days(env.AIW_RETENTION_RUNS_DAYS,DEFAULT_RETENTION.runsDays),eventsDays:days(env.AIW_RETENTION_EVENTS_DAYS,DEFAULT_RETENTION.eventsDays),activityDays:days(env.AIW_RETENTION_ACTIVITY_DAYS,DEFAULT_RETENTION.activityDays),uploadsDays:days(env.AIW_RETENTION_UPLOADS_DAYS,DEFAULT_RETENTION.uploadsDays),recoveryPointsDays:days(env.AIW_RETENTION_RECOVERY_POINTS_DAYS,DEFAULT_RETENTION.recoveryPointsDays)};
}
const iso=(now,ms)=>new Date(now-ms).toISOString();
// Pending runs older than the interruption threshold, for one project (called before a new run is reserved) or for
// every project (the sweep). used_tokens=0 is what releases the reservation: budgets sum COALESCE(used, reserved).
export async function releaseInterruptedRuns(env,{owner=null,projectId=null,now=Date.now(),minutes=DEFAULT_RETENTION.interruptedMinutes}={}){
 const stale=iso(now,minutes*60000),at=new Date(now).toISOString(),scope=owner?' AND owner_id=? AND project_id=?':'',binds=owner?[owner,projectId]:[];
 const runs=await env.DB.prepare("UPDATE intelligence_runs SET status='interrupted',error_code='interrupted',used_tokens=0,updated_at=? WHERE status='pending' AND created_at<?"+scope).bind(at,stale,...binds).run();
 const retrievals=await env.DB.prepare("UPDATE brain_retrieval_runs SET status='interrupted',used_tokens=0 WHERE status='pending' AND created_at<?"+scope).bind(stale,...binds).run();
 return (runs.meta?.changes||0)+(retrievals.meta?.changes||0);
}
async function sweepRuns(env,table,cutoff,result,counter,fileCounter){
 for(let guard=0;guard<1000;guard++){
  const rows=(await env.DB.prepare('SELECT owner_id,id,storage_key FROM '+table+' WHERE created_at<? LIMIT 200').bind(cutoff).all()).results;
  if(!rows.length)break;
  // Rows first, then their files: a failed file delete leaves an unreferenced object, never a row whose file is gone.
  const statements=rows.map(row=>env.DB.prepare('DELETE FROM '+table+' WHERE owner_id=? AND id=?').bind(row.owner_id,row.id));
  const outcomes=env.DB.batch?await env.DB.batch(statements):await Promise.all(statements.map(s=>s.run()));
  result[counter]+=outcomes.reduce((n,o)=>n+(o.meta?.changes||0),0);
  for(const row of rows){try{if(env.FILES&&row.storage_key)await env.FILES.delete(row.storage_key);result[fileCounter]++;}catch(e){result.errors.push({table,key:row.storage_key,message:String(e?.message||e)});}}
  if(rows.length<200)break;
 }
}
// Uploads older than the cutoff that no dataset of their project references, project by project. A project that
// cannot be read (an integrity fault) is reported in errors and its uploads are left alone.
export async function unreferencedUploads(env,cutoff,errors=[]){
 const out=[],projects=(await env.DB.prepare('SELECT DISTINCT owner_id,project_id FROM workbook_uploads WHERE created_at<?').bind(cutoff).all()).results;
 for(const {owner_id:owner,project_id:projectId} of projects){
  const row=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();let referenced=new Set();
  if(row){try{const p=(await readStoredProject(env,owner,row.document)).document;referenced=new Set((p.intake?.datasets||[]).flatMap(d=>[d.uploadId,...(d.versions||[]).map(v=>v.uploadId)]).filter(Boolean));}catch(e){errors.push({table:'workbook_uploads',owner,project:projectId,message:'Skipped: the project could not be read. '+String(e?.message||e)});continue;}}
  for(const upload of (await env.DB.prepare('SELECT id,storage_key FROM workbook_uploads WHERE owner_id=? AND project_id=? AND created_at<?').bind(owner,projectId,cutoff).all()).results)if(!referenced.has(upload.id))out.push({owner,projectId,id:upload.id,key:upload.storage_key});
 }
 return out;
}
export async function runRetention(env,policy=retentionPolicy(env),now=Date.now()){
 const result={at:new Date(now).toISOString(),policy,interrupted:0,runs:0,runFiles:0,retrievals:0,retrievalFiles:0,events:0,activity:0,uploads:0,uploadFiles:0,receipts:0,recoveryUploads:0,recoveryPoints:0,recoveryObjects:0,errors:[]};
 result.interrupted=await releaseInterruptedRuns(env,{now,minutes:policy.interruptedMinutes});
 // Recovery points first: the activity rows that name them are swept after activityDays.
 if(policy.recoveryPointsDays>0)await retireRecoveryPoints(env,iso(now,policy.recoveryPointsDays*86400000),result);
 if(policy.runsDays>0){const cutoff=iso(now,policy.runsDays*86400000);await sweepRuns(env,'intelligence_runs',cutoff,result,'runs','runFiles');await sweepRuns(env,'brain_retrieval_runs',cutoff,result,'retrievals','retrievalFiles');}
 if(policy.eventsDays>0)result.events=(await env.DB.prepare('DELETE FROM operation_events WHERE created_at<?').bind(iso(now,policy.eventsDays*86400000)).run()).meta?.changes||0;
 if(policy.activityDays>0)result.activity=(await env.DB.prepare('DELETE FROM project_activity WHERE created_at<?').bind(iso(now,policy.activityDays*86400000)).run()).meta?.changes||0;
 if(policy.uploadsDays>0)for(const upload of await unreferencedUploads(env,iso(now,policy.uploadsDays*86400000),result.errors)){
  result.uploads+=(await env.DB.prepare('DELETE FROM workbook_uploads WHERE owner_id=? AND project_id=? AND id=?').bind(upload.owner,upload.projectId,upload.id).run()).meta?.changes||0;
  try{if(env.FILES&&upload.key){await env.FILES.delete(upload.key);result.uploadFiles++;}}catch(e){result.errors.push({table:'workbook_uploads',key:upload.key,message:String(e?.message||e)});}
 }
 result.receipts=(await env.DB.prepare('DELETE FROM command_receipts WHERE created_at<?').bind(iso(now,policy.receiptsHours*3600000)).run()).meta?.changes||0;
 result.receipts+=(await env.DB.prepare('DELETE FROM route_receipts WHERE created_at<?').bind(iso(now,policy.receiptsHours*3600000)).run()).meta?.changes||0;
 // A recovery package sent in entries and never restored (round 12, GR-STO-03: recovery-service.js), with its entries.
 for(const u of (await env.DB.prepare('SELECT actor_id,id,received FROM recovery_uploads WHERE created_at<?').bind(iso(now,policy.receiptsHours*3600000)).all()).results){
  result.recoveryUploads+=(await env.DB.prepare('DELETE FROM recovery_uploads WHERE actor_id=? AND id=?').bind(u.actor_id,u.id).run()).meta?.changes||0;
  for(let n=1;n<=u.received;n++)try{await env.FILES?.delete(stagingKey(u.actor_id,u.id,n));}catch(e){result.errors.push({table:'recovery_uploads',key:stagingKey(u.actor_id,u.id,n),message:String(e?.message||e)});}
 }
 return result;
}
export const retentionChanged=result=>result.interrupted+result.runs+result.retrievals+result.events+result.activity+result.uploads+result.receipts+(result.recoveryUploads||0)+(result.recoveryPoints||0)>0||result.errors.length>0;
// The recovery points the activity names ({kind: 'storage', recoveryPoint}), by project, newest kept, those before the
// cutoff retired. A point already gone is skipped; a project whose row cannot be read keeps everything and is reported.
async function retireRecoveryPoints(env,cutoff,result){
 if(!env.FILES)return;
 const rows=(await env.DB.prepare('SELECT owner_id,project_id,document,created_at FROM project_activity WHERE document LIKE ?').bind('%"recoveryPoint"%').all()).results,byProject=new Map();
 for(const r of rows){let d;try{d=JSON.parse(r.document);}catch{continue;}if(d?.kind!=='storage'||typeof d.recoveryPoint!=='string')continue;const k=r.owner_id+'\n'+r.project_id;if(!byProject.has(k))byProject.set(k,{owner:r.owner_id,project:r.project_id,points:[]});byProject.get(k).points.push({key:d.recoveryPoint,at:d.at||r.created_at});}
 for(const {owner,project,points} of byProject.values()){
  points.sort((a,b)=>a.at<b.at?-1:a.at>b.at?1:0);
  const retire=points.slice(0,-1).filter(p=>p.at<cutoff),kept=points.filter(p=>!retire.includes(p));if(!retire.length)continue;
  try{
   const objectsOf=async key=>{const f=await env.FILES.get(key);if(!f)return null;const point=JSON.parse(await f.text());return Array.isArray(point.objects)?point.objects:[];};
   const row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,project).first(),stored=row?JSON.parse(row.document):null;
   const needed=new Set([...(stored?referencedKeys(stored):[]),...(stored?.storageSweep?.superseded||[]).map(s=>s.key)]);
   for(const p of kept)for(const key of (await objectsOf(p.key))||[])needed.add(key);
   const released=new Set();
   for(const p of retire){const objects=await objectsOf(p.key);if(objects===null)continue;for(const key of objects)if(!needed.has(key))released.add(key);await env.FILES.delete(p.key);result.recoveryPoints++;}
   for(const key of released){try{await env.FILES.delete(key);result.recoveryObjects++;}catch(e){result.errors.push({table:'recovery_points',key,message:String(e?.message||e)});}}
   // The row keeps only what a kept point needs; written over the revision it was read at, its content unchanged.
   if(stored&&Array.isArray(stored.storageRetained)&&released.size){const retained=stored.storageRetained.filter(k=>!released.has(k)),next={...stored};if(retained.length)next.storageRetained=retained;else delete next.storageRetained;await env.DB.prepare('UPDATE projects SET document=? WHERE owner_id=? AND id=? AND revision=?').bind(JSON.stringify(next),owner,project,row.revision).run();}
  }catch(e){result.errors.push({table:'recovery_points',key:owner+'/'+project,message:String(e?.message||e)});}
 }
}
