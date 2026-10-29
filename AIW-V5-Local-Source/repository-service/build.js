// Builds and refreshes the repository store from the pinned selection. Each connector is one
// transaction; a crashed job resumes after its last completed connector. Every current revision is
// re-verified against the manifest hash on each run. After the first complete (baseline) build, every
// change is appended to the notice log: new revisions, successors and invalidations.
import {readManifest} from './manifest-stream.js';
import {loadRegistry,loadSelection,readAccepted,decodeText,usePolicyOf,contentPermitted,retrievalDecision,bareHash,siteAddressable} from './corpus.js';
import {segment,formatOf} from './passages.js';
import {conceptLexicon,conceptCues} from './concepts.js';
import {revisionId,passageId,sha256,excerptOf} from './ids.js';
import {openStore,unindexRevision} from './store.js';

async function pool(items,n,fn){let next=0;const out=new Array(items.length);await Promise.all(Array.from({length:Math.min(n,items.length)},async()=>{while(next<items.length){const k=next++;out[k]=await fn(items[k]);}}));return out;}
const fileName=p=>p.split('/').at(-1);

export async function buildStore(config,{log=()=>{},only=null,concurrency=12,now=()=>new Date().toISOString()}={}){
 const store=openStore(config.store),{db}=store;
 try{
  const registry=await loadRegistry(config),selection=await loadSelection(config),lexicon=conceptLexicon();
  store.tx(()=>{const up=db.prepare('INSERT INTO concepts(concept_id,catalogue_id,name,record_type) VALUES(?,?,?,?) ON CONFLICT(concept_id) DO UPDATE SET name=excluded.name,record_type=excluded.record_type');for(const c of lexicon.concepts)up.run(c.conceptId,c.catalogueId,c.name,c.recordType);});
  const baseline=store.get('baselineAt')!==null;
  let job=db.prepare("SELECT * FROM jobs WHERE kind='build' AND state='running' ORDER BY started_at DESC LIMIT 1").get();
  if(job&&JSON.parse(job.data).selection!==selection.receipt.sha256){db.prepare("UPDATE jobs SET state='abandoned',updated_at=? WHERE id=?").run(now(),job.id);job=null;}
  if(!job){const at=now();job={id:'build:'+at,started_at:at,data:JSON.stringify({selection:selection.receipt.sha256,done:[]})};db.prepare("INSERT INTO jobs(id,kind,state,position,started_at,updated_at,data) VALUES(?,'build','running',NULL,?,?,?)").run(job.id,at,at,job.data);}
  const progress=JSON.parse(job.data),snapshots=selection.snapshots.filter(s=>!only||only.includes(s.connectorId)).sort((a,b)=>a.connectorId.localeCompare(b.connectorId));
  const summary={storeId:store.storeId,job:job.id,baseline,startedAt:job.started_at,connectors:[],errors:[],resumedPast:progress.done.length};
  for(const snap of snapshots){
   if(progress.done.includes(snap.connectorId))continue;
   try{const result=await buildConnector(store,snap,registry,lexicon,{baseline,concurrency,now});summary.connectors.push(result);log(result);}
   catch(e){summary.errors.push({connectorId:snap.connectorId,error:e.message});log({connectorId:snap.connectorId,error:e.message});continue;}
   progress.done.push(snap.connectorId);db.prepare('UPDATE jobs SET position=?,updated_at=?,data=? WHERE id=?').run(snap.connectorId,now(),JSON.stringify(progress),job.id);
  }
  const complete=!only&&!summary.errors.length;
  if(!only)db.prepare('UPDATE jobs SET state=?,updated_at=? WHERE id=?').run(complete?'completed':'failed',now(),job.id);
  if(complete){const at=now();if(!baseline)store.set('baselineAt',at);store.set('builtAt',at);store.set('selection',JSON.stringify(selection.receipt));store.set('registry',JSON.stringify(registry.receipt));}
  summary.finishedAt=now();summary.cursor=store.cursor();summary.complete=complete;return summary;
 }finally{store.close();}
}

async function buildConnector(store,snap,registry,lexicon,{baseline,concurrency,now}){
 const {db}=store,started=Date.now(),docs=[];let files=0;
 const {header,rawSha256}=await readManifest(snap.manifestFile,e=>{files++;if(e.status==='accepted'&&formatOf(e.path))docs.push(e);});
 if(header.connectorId!==snap.connectorId||header.repository!==snap.repository||header.commitSha!==snap.commit||header.snapshotId!==snap.snapshotId)throw Error('The manifest header differs from the pinned selection.');
 if(snap.manifestChecksum&&header.manifestSha256!==snap.manifestChecksum)throw Error('The embedded manifest digest differs from the acquisition index.');
 if(snap.snapshotChecksum&&header.snapshotChecksum!==snap.snapshotChecksum)throw Error('The snapshot checksum differs from the acquisition index.');
 const connector=registry.connectors.get(snap.connectorId)||null,licence=header.licenceEvidence||{},usePolicy=usePolicyOf(connector,licence),permitted=contentPermitted(usePolicy);
 const prepared=await pool(docs,concurrency,async e=>{
  const fileSha256=bareHash(e.contentSha256),rid=revisionId(snap.repository,snap.commit,e.path,fileSha256);
  const base={revisionId:rid,path:e.path,fileSha256,bytes:Number(e.sizeBytes)||0,format:formatOf(e.path),object:e.contentAddressedObject,findings:(e.findings||[]).map(f=>f.code).filter(Boolean),title:fileName(e.path),passages:[],bodyIndexed:false,textOk:true,state:'current'};
  if(!/^[a-f0-9]{64}$/.test(fileSha256))return {...base,state:'unavailable',error:'The manifest has no content hash.'};
  if(!permitted)return base;// licence dossier: metadata only; the bytes are not read
  let bytes;try{bytes=await readAccepted(snap.snapshotDir,e);}catch(err){return {...base,state:'unavailable',error:err.message};}
  const decoded=decodeText(bytes);if(!decoded.ok)return {...base,textOk:false,note:decoded.reason};
  const seg=segment(decoded.text,e.path);
  const passages=seg.passages.map((p,i)=>{const excerpt=excerptOf(decoded.text,p.lineStart,p.lineEnd),h=sha256(excerpt);return {ordinal:i+1,lineStart:p.lineStart,lineEnd:p.lineEnd,heading:p.heading||'',excerptSha256:h,passageId:passageId(rid,p.lineStart,p.lineEnd,h),body:excerpt,cues:conceptCues(lexicon,[e.path,p.heading,excerpt].join(' '))};});
  return {...base,title:seg.title,passages,bodyIndexed:true};
 });
 const at=now(),stats={connectorId:snap.connectorId,repository:snap.repository,usePolicy,lifecycle:connector?.lifecycle||'unregistered',files,documents:docs.length,added:0,verified:0,reindexed:0,superseded:0,invalidated:0,unavailable:0,passages:0,notices:0};
 const S={
  revision:db.prepare('INSERT INTO revisions(revision_id,connector_id,repository,commit_sha,path,file_sha256,bytes,format,title,snapshot_id,object,state,reason,supersedes,body_indexed,retrievable,retrieval_reason,passages,findings,first_cursor,verified_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'),
  passage:db.prepare('INSERT INTO passages(passage_id,revision_rowid,ordinal,line_start,line_end,excerpt_sha256,heading,chars) VALUES(?,?,?,?,?,?,?,?)'),
  search:db.prepare('INSERT INTO passage_search(rowid,title,heading,body,path) VALUES(?,?,?,?,?)'),
  file:db.prepare('INSERT INTO file_search(rowid,title,path,repository) VALUES(?,?,?,?)'),
  cue:db.prepare('INSERT OR IGNORE INTO passage_concepts(passage_rowid,concept_id) VALUES(?,?)'),
  byId:db.prepare('SELECT rowid,state,body_indexed,revision_id,file_sha256 FROM revisions WHERE revision_id=?'),
  verify:db.prepare('UPDATE revisions SET verified_at=?,retrievable=?,retrieval_reason=?,findings=? WHERE rowid=?'),
  state:db.prepare('UPDATE revisions SET state=?,reason=? WHERE rowid=?')
 };
 const pathWords=p=>p.replace(/[/._-]+/g,' ');
 const indexPassages=(rowid,r)=>{for(const p of r.passages){const pr=S.passage.run(p.passageId,rowid,p.ordinal,p.lineStart,p.lineEnd,p.excerptSha256,p.heading,p.body.length).lastInsertRowid;S.search.run(pr,r.title,p.heading,p.body,pathWords(r.path));for(const c of p.cues)S.cue.run(pr,c.conceptId);}stats.passages+=r.passages.length;};
 const dropPassages=rowid=>{unindexRevision(db,rowid);for(const p of db.prepare('SELECT rowid FROM passages WHERE revision_rowid=?').all(rowid))db.prepare('DELETE FROM passage_concepts WHERE passage_rowid=?').run(p.rowid);db.prepare('DELETE FROM passages WHERE revision_rowid=?').run(rowid);};
 // Notices exist only after the baseline, and only for paths a project can hold.
 const emit=n=>{if(baseline&&siteAddressable(n.path)){store.notice({...n,repository:snap.repository,at});stats.notices++;}};
 const invalidate=(row,reason,note)=>{S.state.run(reason==='superseded'?'superseded':reason==='withdrawn'?'withdrawn':'unavailable',note||reason,row.rowid);unindexRevision(db,row.rowid);stats.invalidated++;
  emit({kind:'invalidation',revisionId:row.revision_id,reason,commit:row.commit_sha,path:row.path,hash:row.file_sha256});};
 store.tx(()=>{
  db.prepare(`INSERT INTO connectors(connector_id,repository,name,snapshot_id,commit_sha,branch,acquired_at,manifest_sha256,raw_manifest_sha256,snapshot_checksum,lifecycle,trust_tier,use_policy,review_status,final_disposition,spdx,licence_note,files,documents,indexed,passages,verified_at,data) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)
   ON CONFLICT(connector_id) DO UPDATE SET repository=excluded.repository,name=excluded.name,snapshot_id=excluded.snapshot_id,commit_sha=excluded.commit_sha,branch=excluded.branch,acquired_at=excluded.acquired_at,manifest_sha256=excluded.manifest_sha256,raw_manifest_sha256=excluded.raw_manifest_sha256,snapshot_checksum=excluded.snapshot_checksum,lifecycle=excluded.lifecycle,trust_tier=excluded.trust_tier,use_policy=excluded.use_policy,review_status=excluded.review_status,final_disposition=excluded.final_disposition,spdx=excluded.spdx,licence_note=excluded.licence_note,files=excluded.files,documents=excluded.documents,indexed=excluded.indexed,verified_at=excluded.verified_at,data=excluded.data`)
   .run(snap.connectorId,snap.repository,connector?.name||snap.repository,snap.snapshotId,snap.commit,header.branch||null,header.acquiredAt||null,header.manifestSha256||null,rawSha256,header.snapshotChecksum||null,connector?.lifecycle||'unregistered',connector?.trustTier??null,usePolicy,licence.dossierReviewStatus||connector?.licence.reviewStatus||null,licence.finalDisposition||null,licence.repositoryApi?.spdxId||null,connector?.licence.note||null,files,docs.length,prepared.filter(r=>r.bodyIndexed).length,at,
    JSON.stringify({owner:connector?.owner||null,categories:connector?.categories||[],contentUses:connector?.contentUses||[],licenceName:licence.repositoryApi?.name||null,licencePath:licence.repositoryApi?.path||null,htmlUrl:header.repositoryMetadata?.htmlUrl||null}));
  const current=new Map(db.prepare("SELECT rowid,revision_id,path,file_sha256,commit_sha FROM revisions WHERE connector_id=? AND state='current'").all(snap.connectorId).map(r=>[r.path,r]));
  const seen=new Set();
  for(const r of prepared){
   seen.add(r.path);
   const decision=retrievalDecision({connector,usePolicy,path:r.path,bytes:r.bytes,textOk:r.textOk,state:r.state}),existing=S.byId.get(r.revisionId);
   if(existing){
    if(existing.state!=='current')continue;// invalidated revisions never recover silently
    if(r.state==='unavailable'){invalidate({...existing,path:r.path,commit_sha:snap.commit},'source-unavailable',r.error);stats.unavailable++;continue;}
    S.verify.run(at,decision.retrievable?1:0,decision.reason,JSON.stringify(r.findings),existing.rowid);stats.verified++;
    if(!!existing.body_indexed!==r.bodyIndexed){dropPassages(existing.rowid);if(r.bodyIndexed)indexPassages(existing.rowid,r);db.prepare('UPDATE revisions SET body_indexed=?,passages=?,title=? WHERE rowid=?').run(r.bodyIndexed?1:0,r.passages.length,r.title,existing.rowid);S.file.run(existing.rowid,r.title,r.path,snap.repository);stats.reindexed++;}
    continue;
   }
   const prev=current.get(r.path),state=r.state==='unavailable'?'unavailable':'current';
   const rowid=S.revision.run(r.revisionId,snap.connectorId,snap.repository,snap.commit,r.path,r.fileSha256,r.bytes,r.format,r.title,snap.snapshotId,r.object,state,r.error||r.note||null,prev?.revision_id||null,r.bodyIndexed?1:0,decision.retrievable?1:0,decision.reason,r.passages.length,JSON.stringify(r.findings),baseline?store.cursor()+1:0,at).lastInsertRowid;
   if(state==='current'){if(r.bodyIndexed)indexPassages(rowid,r);S.file.run(rowid,r.title,r.path,snap.repository);stats.added++;}else stats.unavailable++;
   if(prev){
    // Same bytes at a new commit: record the successor without invalidating what projects already hold.
    const changed=prev.file_sha256!==r.fileSha256;
    if(state==='current')emit({kind:'revision',revisionId:r.revisionId,supersedes:prev.revision_id,reason:'observed',commit:snap.commit,path:r.path,hash:r.fileSha256});
    if(changed)invalidate(prev,'superseded');else{S.state.run('superseded','same-content-successor',prev.rowid);unindexRevision(db,prev.rowid);}
    stats.superseded++;
   }
   else if(state==='current')emit({kind:'revision',revisionId:r.revisionId,supersedes:null,reason:'observed',commit:snap.commit,path:r.path,hash:r.fileSha256});
  }
  for(const [p,row] of current)if(!seen.has(p))invalidate(row,'source-unavailable','No longer an accepted documentation file in the pinned snapshot.');
  db.prepare('UPDATE connectors SET passages=(SELECT COALESCE(SUM(passages),0) FROM revisions WHERE connector_id=? AND state=?) WHERE connector_id=?').run(snap.connectorId,'current',snap.connectorId);
 });
 stats.ms=Date.now()-started;return stats;
}

// Operator withdrawal (for example a licence decision): the revision leaves search and retrieval,
// and a withdrawal notice reaches pinned projects through signed synchronisation.
export function withdrawRevision(config,revision,reason,{now=()=>new Date().toISOString()}={}){
 const store=openStore(config.store),{db}=store;
 try{return store.tx(()=>{
  const row=db.prepare('SELECT * FROM revisions WHERE revision_id=?').get(revision);if(!row)throw Error('No such revision.');
  if(row.state!=='current')throw Error('This revision is already '+row.state+'.');
  if(!String(reason||'').trim())throw Error('Record why the revision is withdrawn.');
  db.prepare("UPDATE revisions SET state='withdrawn',reason=?,retrievable=0,retrieval_reason='revision-not-current' WHERE rowid=?").run(String(reason).slice(0,500),row.rowid);unindexRevision(db,row.rowid);
  const cursor=siteAddressable(row.path)?store.notice({kind:'invalidation',revisionId:row.revision_id,reason:'withdrawn',repository:row.repository,commit:row.commit_sha,path:row.path,hash:row.file_sha256,at:now()}):null;
  return {revisionId:row.revision_id,cursor};
 });}finally{store.close();}
}
