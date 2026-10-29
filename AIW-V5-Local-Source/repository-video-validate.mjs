// Restricted video candidate ingestion, tenant isolation and fail-closed provenance.
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {importVideoCandidates,videoCandidateStatus,videoCandidates,ENGINEERING_PACK_LIBRARY_ID} from './repository-service/video-evidence.js';
import {openStore} from './repository-service/store.js';
import {openReader} from './repository-service/reader.js';
import {startService} from './repository-service/server.js';
import {candidatePacket} from './repository-service/sync.js';
import {localDatabase} from './local-db.js';

const dir=await mkdtemp(path.join(os.tmpdir(),'aiw-video-check-'));
const p={store:path.join(dir,'store','akr.sqlite')},names={graph:'graph.json',manifest:'scenes.csv',schema:'schema.json',blueprint:'blueprint.md',frames:'frames.csv'};
const paths=Object.fromEntries(Object.entries(names).map(([k,v])=>[k,path.join(dir,v)]));
const video={video_id:'VID-001',file_name:'fixture.mp4',duration_s:1,fps:2,frame_count:2,title:'Synthetic architecture video'};
const rights_state='restricted-source-review-required';
const scene={id:'VID-001-S001',type:'Scene',canonical_name:'Outbox example',description:'A candidate architecture observation.',authority_state:'candidate',release_state:'unreleased',confidence:0.93,metadata:{start_s:0,end_s:1,start_frame:0,end_frame:1,asset_types:'Pattern',rights_state}};
const graph={graph_id:'AIW-VIDEO-TEST-001',status:'candidate-only',ontology:{edge_types:['VIDEO_HAS_SCENE']},source_videos:[video],nodes:[{id:'VID-001',type:'Video',canonical_name:video.title,authority_state:'candidate',release_state:'unreleased',confidence:0.9,metadata:{rights_state}},scene],edges:[{id:'E-1',subject_id:'VID-001',predicate:'VIDEO_HAS_SCENE',object_id:scene.id,evidence_scene_id:scene.id,authority_state:'candidate',confidence:1}]};
const schema={properties:{media_asset:{},evidence_spans:{},governance:{}}};
const manifest='scene_id,video_id,file_name,start_s,end_s,duration_s,start_frame,end_frame,title,summary,asset_types,candidate_entities,confidence,authority_state,rights_state\n'+
 'VID-001-S001,VID-001,fixture.mp4,0,1,1,0,1,Outbox example,A candidate architecture observation.,Pattern,Outbox,high,candidate,restricted-source-review-required\n';
const frames='video_id,file_name,frame_number,timestamp_s,scene_id,scene_title,authority_state,rights_state\n'+[0,1].map(n=>`VID-001,fixture.mp4,${n},${n/2},VID-001-S001,Outbox example,candidate,restricted-source-review-required`).join('\n')+'\n';
const provenance=Object.fromEntries(Object.keys(paths).map(k=>[k,{materialization:'user-supplied'}]));
const input={tenantId:'architect.one@example.com',...paths,provenance};
let service=null;
try{
 await Promise.all([writeFile(paths.graph,JSON.stringify(graph)),writeFile(paths.manifest,manifest),writeFile(paths.schema,JSON.stringify(schema)),writeFile(paths.blueprint,'# AIW Video-to-Knowledge Graph Blueprint\nSynthetic fixture'),writeFile(paths.frames,frames)]);
 const result=await importVideoCandidates(p,input);
 const sceneKey=result.packId+':'+scene.id;
 assert.deepEqual(result.counts,{videos:1,scenes:1,nodes:2,edges:1});assert.equal(result.frameIndexRows,2);assert.equal(result.originalVideosPresent,false);assert.equal(result.productionAccepted,false);
 const rerun=await importVideoCandidates(p,input);assert.equal(rerun.alreadyPresent,true);assert.equal(rerun.packId,result.packId);
 const store=openStore(p.store);
 try{
  assert.equal(videoCandidateStatus(store,input.tenantId).packs.length,1);
  assert.deepEqual(videoCandidateStatus(store,input.tenantId).counts,{packs:1,videos:1,scenes:1,assets:0,relationships:1});
  assert.equal(videoCandidateStatus(store,'other@example.com').packs.length,0);
  const hit=videoCandidates(store,{tenantId:input.tenantId,q:'outbox'}).results[0];
  assert.equal(hit.sceneId,scene.id);assert.equal(hit.startFrame,0);assert.equal(hit.endFrame,1);assert.equal(hit.relatedEdges.length,1);assert.equal(hit.authorityState,'candidate');assert.equal(hit.rightsState,rights_state);assert.equal(hit.projectSourceId,null);
  assert.equal(hit.id,result.packId+':'+scene.id);assert.equal(hit.videoKey,result.packId+':'+video.video_id);
  assert.equal(hit.fileName,video.file_name);assert.equal(hit.videoTitle,video.title);assert.equal(hit.originalVideosPresent,false);assert.equal(hit.transcriptAvailable,false);
  assert.equal(videoCandidates(store,{tenantId:input.tenantId,q:'synthetic',limit:1}).total,1,'search includes scoped recording metadata');
  assert.equal(videoCandidates(store,{tenantId:input.tenantId,sceneId:scene.id}).results[0].sceneId,scene.id,'an exact scene locator can open without scanning pages');
  assert.equal(videoCandidates(store,{tenantId:input.tenantId,key:hit.id}).results[0].id,hit.id,'a pack-scoped locator is unambiguous');
  assert.equal(videoCandidates(store,{tenantId:input.tenantId,videoKey:hit.videoKey}).total,1,'recording filter includes pack identity');
  assert.equal(videoCandidates(store,{tenantId:'other@example.com',sceneId:scene.id}).results.length,0,'an exact scene locator cannot cross tenants');
  assert.equal(videoCandidates(store,{tenantId:input.tenantId,area:'options'}).total,1,'area is filtered before pagination');
  assert.equal(videoCandidates(store,{tenantId:input.tenantId,area:'portfolio'}).total,0);
  assert.throws(()=>videoCandidates(store,{tenantId:input.tenantId,area:'undefined'}),/Choose a source media area/);
  const page=videoCandidates(store,{tenantId:input.tenantId,limit:1,offset:1});assert.equal(page.total,1);assert.equal(page.results.length,0);assert.equal(page.nextOffset,null);
  assert.equal(videoCandidates(store,{tenantId:'other@example.com',q:'outbox'}).results.length,0);
  assert.deepEqual(videoCandidateStatus(store,'other@example.com').counts,{packs:0,videos:0,scenes:0,assets:0,relationships:0});
  const denseTenant='dense@example.com',densePack='video-'+'a'.repeat(32),hash='a'.repeat(64);
  store.db.prepare('INSERT INTO video_candidate_packs(pack_id,tenant_id,graph_id,graph_sha256,manifest_sha256,files_json,imported_at,active,authority) VALUES(?,?,?,?,?,?,?,1,?)').run(densePack,denseTenant,'AIW-VIDEO-TEST-DENSE',hash,hash,'{}',new Date().toISOString(),'candidate-only');
  store.db.prepare('INSERT INTO video_candidate_sources(pack_id,video_id,file_name,title,duration_s,frame_count) VALUES(?,?,?,?,?,?)').run(densePack,'VID-001','large-fixture.mp4','Synthetic large source',40,40);
  const insert=store.db.prepare('INSERT INTO video_candidates(pack_id,scene_id,video_id,start_ms,end_ms,start_frame,end_frame,title,summary,asset_types,entities,related_nodes,related_edges,confidence,rights_state,authority_state) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  for(let i=0;i<40;i++)insert.run(densePack,'VID-001-S'+String(i).padStart(3,'0'),'VID-001',i*1000,(i+1)*1000,i,i,'Synthetic scene '+i,'A'.repeat(8000),'Pattern','Synthetic','[]','[]',0.9,rights_state,'candidate');
  const denseFirst=videoCandidates(store,{tenantId:denseTenant,limit:50});
  assert.equal(denseFirst.total,40);assert.ok(denseFirst.results.length>0&&denseFirst.results.length<40);assert.ok(Buffer.byteLength(JSON.stringify(denseFirst))<180000);
  const denseIds=new Set(denseFirst.results.map(x=>x.id));let next=denseFirst.nextOffset;
  for(let page=0;next!==null&&page<10;page++){
   const response=videoCandidates(store,{tenantId:denseTenant,offset:next,limit:50});
   assert.ok(response.results.length>0);assert.ok(Buffer.byteLength(JSON.stringify(response))<180000);
   for(const item of response.results)denseIds.add(item.id);
   assert.ok(response.nextOffset===null||response.nextOffset>next);
   next=response.nextOffset;
  }
  assert.equal(next,null);assert.equal(denseIds.size,40);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM revisions').get().n,0,'video metadata must not become a project source revision');
 }finally{store.close();}
 const reader=openReader(p);try{
  assert.equal(reader.revision('revision-'+'a'.repeat(32)),null);
  assert.throws(()=>candidatePacket(reader,{tenantId:input.tenantId,projectId:'p',revisionIds:[result.packId]}),/not current/);
 }finally{reader.close();}
 const token='f'.repeat(64),call=(s,route)=>fetch(s.url+route,{headers:{Authorization:'Bearer '+token}});
 service=await startService({...p,allowedTenants:[input.tenantId],port:0},{token,port:0});
 assert.equal((await call(service,'/v1/video/status?tenant=other%40example.com')).status,403);
 assert.equal((await call(service,'/v1/video/candidates?tenant='+encodeURIComponent(input.tenantId)+'&q=outbox')).status,200);
 const servicePage=await (await call(service,'/v1/video/candidates?tenant='+encodeURIComponent(input.tenantId)+'&q=outbox&area=options&limit=1&offset=0')).json();
 assert.equal(servicePage.results[0].sceneId,scene.id);assert.equal(servicePage.total,1);assert.equal(servicePage.nextOffset,null);
 const files=new Map(),DB=localDatabase(':memory:'),env={DB,FILES:{async put(k,v){files.set(k,v);},async get(k){return files.has(k)?{text:async()=>String(files.get(k))}:null;},async delete(k){files.delete(k);}},ASSETS:{fetch:()=>new Response('')},AIW_KNOWLEDGE_REPOSITORY_URL:service.url,AIW_KNOWLEDGE_REPOSITORY_TOKEN:token};
 try{
  const {default:worker}=await import('./worker.js'),request=(actor,route)=>worker.fetch(new Request('https://aiw.test'+route,{headers:{'oai-authenticated-user-id':actor}}),env);
  assert.equal((await request(input.tenantId,'/api/project')).status,200);
  const site=await request(input.tenantId,'/api/knowledge/corpus?view=video&q=outbox&limit=1');assert.equal(site.status,200);
  const siteBody=await site.json();assert.equal(siteBody.results[0].sceneId,scene.id);assert.equal(siteBody.videos[0].fileName,video.file_name);assert.equal(siteBody.connected,true);assert.equal(siteBody.total,1);
  const direct=await request(input.tenantId,'/api/knowledge/corpus?view=video&scene='+scene.id+'&area=options');assert.equal((await direct.json()).results[0].sceneId,scene.id);
  const byKey=await request(input.tenantId,'/api/knowledge/corpus?view=video&key='+encodeURIComponent(sceneKey));assert.equal((await byKey.json()).results[0].id,sceneKey);
  const videoStatus=await request(input.tenantId,'/api/knowledge/corpus?view=video-status');assert.equal(videoStatus.status,200);assert.equal((await videoStatus.json()).counts.scenes,1);
  assert.equal((await request('other@example.com','/api/project')).status,200);
  assert.equal((await request('other@example.com','/api/knowledge/corpus?view=video&q=outbox')).status,403,'the Site cannot cross the video tenant gate');
  const noService={...env,AIW_KNOWLEDGE_REPOSITORY_URL:''};
  assert.equal((await worker.fetch(new Request('https://aiw.test/api/knowledge/corpus?view=video',{headers:{'oai-authenticated-user-id':input.tenantId}}),noService)).status,409,'an unconfigured repository never falls back to static media metadata');
 }finally{DB.close();}
 await service.close();service=null;
 await writeFile(paths.graph,JSON.stringify({...graph,graph_id:'AIW-VIDEO-TEST-002'}));
 const second=await importVideoCandidates(p,input);
 const multi=openStore(p.store);
 try{
  const both=videoCandidates(multi,{tenantId:input.tenantId});
  assert.equal(both.total,2,'same scene locator in separate active packs remains two source records');
  assert.notEqual(both.results[0].id,both.results[1].id);
  assert.equal(videoCandidates(multi,{tenantId:input.tenantId,key:result.packId+':'+scene.id}).total,1);
  assert.equal(videoCandidates(multi,{tenantId:input.tenantId,key:second.packId+':'+scene.id}).total,1);
  assert.equal(videoCandidates(multi,{tenantId:input.tenantId,videoKey:second.packId+':'+video.video_id}).total,1);
 }finally{multi.close();}
 await writeFile(paths.graph,JSON.stringify(graph));
 service=await startService({...p,port:0},{token,port:0});
 assert.equal((await call(service,'/v1/video/status?tenant='+encodeURIComponent(input.tenantId))).status,403,'missing allow list fails closed');
 await service.close();service=null;
 await writeFile(paths.frames,frames.replace('VID-001,fixture.mp4,1,0.5,VID-001-S001,Outbox example,candidate,restricted-source-review-required\n',''));
 await assert.rejects(importVideoCandidates(p,input),/frame index is partial/);
 await writeFile(paths.frames,frames);
 await writeFile(paths.manifest,manifest.replace(',0,1,Outbox example,',',0,2,Outbox example,'));
 await assert.rejects(importVideoCandidates(p,input),/manifest disagrees/);
 await writeFile(paths.manifest,manifest);
 await assert.rejects(importVideoCandidates(p,{...input,provenance:{...provenance,graph:{materialization:'exact-download',libraryId:ENGINEERING_PACK_LIBRARY_ID}}}),/does not match the pinned Library artifact/);
 const original=await readFile(path.join(dir,'store','video-materials','packs',result.packId,'graph.json'));assert.equal(original.toString(),JSON.stringify(graph));
 console.log('PASS restricted candidate import, frame and scene checks, idempotency, tenant isolation, read-only discovery, no release path, tamper/partial refusal');
}finally{if(service)await service.close();await rm(dir,{recursive:true,force:true});}
