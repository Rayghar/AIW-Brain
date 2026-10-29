// A separate, locally held index of video-derived *candidates*. The supplied analysis files are
// preserved byte-for-byte with local SHA-256 receipts. They are neither the MP4 originals nor
// approved project knowledge. This module has no route into releases, claims, or Sol packets.
import {readFile,mkdir,writeFile,rename,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {openStore} from './store.js';
import {SOURCE_MEDIA_AREAS} from '../public/source-media-areas.js';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=message=>{throw Error('Video candidate import: '+message);};
const RIGHT='restricted-source-review-required';
const FILES={graph:['graph','.json',1000000],manifest:['manifest','.csv',1000000],schema:['schema','.json',100000],blueprint:['blueprint','.md',250000],frames:['frames','.csv',20000000],readme:['readme','.txt',100000]};
export const ENGINEERING_PACK_LIBRARY_ID='libfile_871244a2cf188191901156e77ed3edaa';
export const ENGINEERING_PACK_SHA256=Object.freeze({graph:'c79e721c6a2fb23b60e3d2f6d4c59d19bee4715b50a788372fd3244aa184d4b7',manifest:'18cedddb101608bb94f4325eba8dc3d3e1adb938e71cca23f11b66dc29e2cda1',schema:'8590f8d25c5bcee72c6767038b11636aaa880bd35f615371615433d2357129fd',blueprint:'bf1fe5c11f70fe3cb5b8f0a0626d22bd9f0da17da0045a286a3fe4fd9a7116c1',frames:'6570f9fbf7546d23a83bbadbe7fda04ebd9c976da73ee1218bd9250aa4f8818e',readme:'e8ef9038be45f789b7ce551110374bb3e7fd4fb21a2917700af60b88ba548807'});
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);

// CSV is parsed as CSV, including quoted commas/newlines and escaped quotes; a rendered Library
// readback may differ bytewise from the original, so its own materialisation label is retained.
export function parseCSV(input){
 const text=String(input).replace(/^\uFEFF/,''),rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++;}else if(c==='"')quoted=false;else field+=c;continue;}
  if(c==='"'){if(field)fail('malformed CSV quoting');quoted=true;}
  else if(c===','){row.push(field);field='';}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);field='';if(row.some(x=>x!==''))rows.push(row);row=[];}
  else field+=c;
 }
 if(quoted)fail('unterminated CSV field');
 if(field||row.length){row.push(field);rows.push(row);}
 if(!rows.length||new Set(rows[0]).size!==rows[0].length)fail('CSV header is empty or repeated');
 const columns=rows.shift();return rows.map((r,i)=>{if(r.length!==columns.length)fail('CSV row '+(i+2)+' has the wrong column count');return Object.fromEntries(columns.map((c,j)=>[c,r[j]]));});
}

function validate(graph,manifest,schema,blueprint){
 if(graph?.status!=='candidate-only'||!/^AIW-VIDEO-[A-Z0-9-]+$/.test(graph.graph_id||''))fail('graph must be a named candidate-only graph');
 if(!Array.isArray(graph.source_videos)||!graph.source_videos.length||graph.source_videos.length>100||!Array.isArray(graph.nodes)||graph.nodes.length>5000||!Array.isArray(graph.edges)||graph.edges.length>20000)fail('invalid graph bounds');
 if(!schema?.properties?.media_asset||!schema?.properties?.evidence_spans||!schema?.properties?.governance)fail('expected multimodal ingestion schema');
 if(typeof blueprint!=='string'||!blueprint.startsWith('# AIW Video-to-Knowledge Graph Blueprint'))fail('expected analysis blueprint');
 const videos=new Map(),nodes=new Map(),scenes=new Map();
 for(const v of graph.source_videos){
  if(!/^VID-\d{3}$/.test(v.video_id||'')||videos.has(v.video_id)||typeof v.file_name!=='string'||v.file_name.length>500||!v.file_name.endsWith('.mp4')||typeof v.title!=='string'||v.title.length>500||!Number.isFinite(v.duration_s)||v.duration_s<=0)fail('invalid/duplicate video identity');videos.set(v.video_id,v);
 }
 for(const n of graph.nodes){
  if(typeof n.id!=='string'||!n.id||nodes.has(n.id)||typeof n.canonical_name!=='string'||n.canonical_name.length>500||n.description!=null&&(typeof n.description!=='string'||n.description.length>10000)||n.authority_state!=='candidate'||n.release_state!=='unreleased'||!Number.isFinite(n.confidence)||n.confidence<0||n.confidence>1)fail('graph nodes must be unique, bounded and candidate/unreleased');
  nodes.set(n.id,n);
  if(n.type==='Video'&&(!videos.has(n.id)||n.metadata?.rights_state!==RIGHT))fail('video node missing or rights status changed');
  if(n.type==='Scene'){
   const videoId=n.id.match(/^(VID-\d{3})-S\d{3}$/)?.[1],v=videos.get(videoId);
   if(!v||n.metadata?.rights_state!==RIGHT||!Number.isFinite(n.metadata.start_s)||!Number.isFinite(n.metadata.end_s)||n.metadata.start_s<0||n.metadata.end_s<=n.metadata.start_s||n.metadata.end_s>v.duration_s+0.02)fail('scene identity, timecode or rights status invalid');
   scenes.set(n.id,n);
  }
 }
 if(graph.nodes.filter(n=>n.type==='Video').length!==videos.size||scenes.size!==manifest.length)fail('manifest, video and graph counts differ');
 for(const [id,v] of videos){
  const ranges=[...scenes].filter(([sceneId])=>sceneId.startsWith(id+'-')).map(([,s])=>s.metadata).sort((a,b)=>a.start_frame-b.start_frame);
  let last=-1;for(const r of ranges){if(!Number.isInteger(r.start_frame)||!Number.isInteger(r.end_frame)||r.start_frame!==last+1||r.end_frame<r.start_frame)fail('scene frame spans have a gap or overlap for '+id);last=r.end_frame;}
  if(last!==v.frame_count-1)fail('scene frame spans do not cover '+id);
 }
 const rows=new Map();
 for(const r of manifest){
  if(!scenes.has(r.scene_id)||rows.has(r.scene_id)||r.authority_state!=='candidate'||r.rights_state!==RIGHT||r.asset_types.length>1000||r.candidate_entities.length>5000)fail('manifest contains an unknown, duplicate, oversized or promoted scene');
  const n=scenes.get(r.scene_id),v=videos.get(r.video_id);
  if(!v||r.video_id!==r.scene_id.slice(0,7)||r.file_name!==v.file_name||Math.abs(Number(r.start_s)-n.metadata.start_s)>0.002||Math.abs(Number(r.end_s)-n.metadata.end_s)>0.002||Number(r.start_frame)!==n.metadata.start_frame||Number(r.end_frame)!==n.metadata.end_frame||Math.abs(Number(r.duration_s)-(n.metadata.end_s-n.metadata.start_s))>0.002||r.title!==n.canonical_name||r.summary!==n.description||r.asset_types!==n.metadata.asset_types||r.confidence!==(n.confidence>=0.9?'high':'medium'))fail('manifest disagrees with graph on '+r.scene_id);
  rows.set(r.scene_id,r);
 }
 const edges=new Set();for(const e of graph.edges){
  if(!e.id||edges.has(e.id)||e.authority_state!=='candidate'||!nodes.has(e.subject_id)||!nodes.has(e.object_id)||!scenes.has(e.evidence_scene_id)||!graph.ontology?.edge_types?.includes(e.predicate))fail('edge cannot be traced to candidate nodes and a scene');edges.add(e.id);
 }
 for(const n of graph.nodes){if(n.metadata?.source_scene&&!scenes.has(n.metadata.source_scene))fail('node has no source scene');}
 return {videos,nodes,scenes,rows};
}

export async function importVideoCandidates(config,{tenantId,graph:graphFile,manifest:manifestFile,schema:schemaFile,blueprint:blueprintFile,frames:framesFile=null,readme:readmeFile=null,provenance={}}={}){
 if(!/^[a-zA-Z0-9_@.\-]{1,180}$/.test(tenantId||''))fail('name one tenant scope for this restricted pack');
 if(!config?.store||![graphFile,manifestFile,schemaFile,blueprintFile].every(Boolean))fail('supply graph, manifest, schema and blueprint');
 const paths={graph:graphFile,manifest:manifestFile,schema:schemaFile,blueprint:blueprintFile,...(framesFile?{frames:framesFile}:{}),...(readmeFile?{readme:readmeFile}:{})},files={};
 for(const [role,file] of Object.entries(paths)){
  const [,,max]=FILES[role],info=await stat(file);if(!info.isFile()||info.size===0||info.size>max)fail(role+' is missing, empty or exceeds its bound');
  const bytes=await readFile(file),from=provenance[role]||{};
  if(!['library-readback','exact-download','user-supplied'].includes(from.materialization))fail('record how '+role+' was materialised');
  if(from.libraryId&&!/^libfile_[a-z0-9]+$/.test(from.libraryId))fail('invalid Library identifier for '+role);
  const digest=hash(bytes),matchesPinnedPack=digest===ENGINEERING_PACK_SHA256[role];
  if(from.materialization==='exact-download'&&(!matchesPinnedPack||from.libraryId!==ENGINEERING_PACK_LIBRARY_ID))fail('exact engineering pack '+role+' does not match the pinned Library artifact');
  files[role]={name:role+FILES[role][1],sha256:digest,bytes:bytes.length,materialization:from.materialization,libraryId:from.libraryId||null,matchesPinnedPack,data:bytes};
 }
 let graph,schema;try{graph=JSON.parse(files.graph.data);schema=JSON.parse(files.schema.data);}catch{fail('graph and schema must be valid JSON');}
 const manifest=parseCSV(files.manifest.data.toString('utf8')),blueprint=files.blueprint.data.toString('utf8');
 const {videos,nodes,scenes,rows}=validate(graph,manifest,schema,blueprint);
 // A frame index is optional. A preview or first thousand rows is not the full 63,184-frame source;
 // this importer intentionally does not synthesize its missing rows or claim their completeness.
 let indexedFrames=null;
 if(files.frames){
  const frameRows=parseCSV(files.frames.data.toString('utf8'));
  if(frameRows.length!==[...videos.values()].reduce((n,v)=>n+v.frame_count,0))fail('the frame index is partial; supply all frames, not a readback preview');
  const counts=new Map();
  for(const r of frameRows){
   const scene=scenes.get(r.scene_id),video=videos.get(r.video_id),n=Number(r.frame_number),t=Number(r.timestamp_s);
   if(!scene||!video||r.scene_id.slice(0,7)!==r.video_id||r.file_name!==video.file_name||r.scene_title!==scene.canonical_name||r.authority_state!=='candidate'||r.rights_state!==RIGHT||!Number.isInteger(n)||n<scene.metadata.start_frame||n>scene.metadata.end_frame||!Number.isFinite(t)||t<scene.metadata.start_s-0.05||t>scene.metadata.end_s+0.05)fail('frame index disagrees with candidate scene '+r.scene_id);
   const key=r.video_id,prev=counts.get(key)||{count:0,last:-1};
   if(n!==prev.last+1||prev.time!==undefined&&t<prev.time)fail('frame index has a gap, duplicate or reversed timestamp at '+key+' frame '+n);
   counts.set(key,{count:prev.count+1,last:n,time:t});
  }
  for(const [id,v] of videos)if(counts.get(id)?.count!==v.frame_count)fail('frame count differs for '+id);
  indexedFrames=frameRows.length;
 }
 const receiptFiles=Object.fromEntries(Object.entries(files).map(([k,{data,...v}])=>[k,v]));
 const packId='video-'+hash(Buffer.from(JSON.stringify([tenantId,...Object.entries(receiptFiles).map(([k,v])=>[k,v.sha256])]))).slice(0,32);
 const folder=path.join(path.dirname(config.store),'video-materials','packs',packId);
 await mkdir(folder,{recursive:true});
 for(const f of Object.values(files)){
  const name=path.join(folder,f.name),temp=name+'.tmp';
  await writeFile(temp,f.data);await rename(temp,name);
  if(hash(await readFile(name))!==f.sha256)fail('stored '+f.name+' did not verify');
 }
 const importedAt=new Date().toISOString(),store=openStore(config.store);
 try{
  const existed=!!store.db.prepare('SELECT pack_id FROM video_candidate_packs WHERE pack_id=?').get(packId);
  store.tx(()=>{
   if(!existed){
    store.db.prepare('UPDATE video_candidate_packs SET active=0 WHERE tenant_id=? AND graph_id=?').run(tenantId,graph.graph_id);
    store.db.prepare('INSERT INTO video_candidate_packs(pack_id,tenant_id,graph_id,graph_sha256,manifest_sha256,files_json,imported_at,active,authority) VALUES(?,?,?,?,?,?,?,1,?)').run(packId,tenantId,graph.graph_id,files.graph.sha256,files.manifest.sha256,JSON.stringify(receiptFiles),importedAt,'candidate-only');
   }
   // Retain source titles and timebase in the tenant's index. Older installations can backfill
   // this table by reimporting the same pack without replacing its existing scene receipts.
   const source=store.db.prepare('INSERT OR IGNORE INTO video_candidate_sources(pack_id,video_id,file_name,title,duration_s,frame_count) VALUES(?,?,?,?,?,?)');
   for(const v of videos.values())source.run(packId,v.video_id,v.file_name,v.title,v.duration_s,v.frame_count);
   if(!existed){
   const insert=store.db.prepare('INSERT INTO video_candidates(pack_id,scene_id,video_id,start_ms,end_ms,start_frame,end_frame,title,summary,asset_types,entities,related_nodes,related_edges,confidence,rights_state,authority_state) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
   for(const [sceneId,n] of scenes){
    const r=rows.get(sceneId),videoId=r.video_id,related=[...nodes.values()].filter(x=>x.metadata?.source_scene===sceneId).map(x=>({id:x.id,type:x.type,title:x.canonical_name,description:x.description,authorityState:'candidate'}));
    const relatedEdges=graph.edges.filter(e=>e.evidence_scene_id===sceneId).map(e=>({id:e.id,subjectId:e.subject_id,predicate:e.predicate,objectId:e.object_id,qualifiers:e.qualifiers||{},confidence:e.confidence,authorityState:'candidate'}));
    if(Buffer.byteLength(JSON.stringify({title:n.canonical_name,summary:n.description,related,relatedEdges,entities:r.candidate_entities}))>120000)fail('scene '+sceneId+' metadata exceeds the bounded media view');
    insert.run(packId,sceneId,videoId,Math.round(n.metadata.start_s*1000),Math.round(n.metadata.end_s*1000),n.metadata.start_frame,n.metadata.end_frame,n.canonical_name,n.description,r.asset_types||'',r.candidate_entities||'',JSON.stringify(related),JSON.stringify(relatedEdges),n.confidence,RIGHT,'candidate');
   }
   }
  });
  return {packId,tenantId,graphId:graph.graph_id,alreadyPresent:existed,authority:'candidate-only',rightsState:RIGHT,productionAccepted:false,originalVideosPresent:false,originalHashesKnown:false,frameIndexComplete:indexedFrames!==null,frameIndexRows:indexedFrames,counts:{videos:videos.size,scenes:scenes.size,nodes:nodes.size,edges:graph.edges.length},files:receiptFiles,repositoryFolder:folder};
 }finally{store.close();}
}

export function videoCandidateStatus(store,tenantId){
 if(!/^[a-zA-Z0-9_@.\-]{1,180}$/.test(tenantId||''))fail('name one tenant scope');
 const totals=store.db.prepare("SELECT COUNT(DISTINCT p.pack_id) packs,COUNT(DISTINCT c.pack_id||':'||c.video_id) videos,COUNT(c.scene_id) scenes,COALESCE(SUM(json_array_length(c.related_nodes)),0) assets,COALESCE(SUM(json_array_length(c.related_edges)),0) relationships FROM video_candidate_packs p LEFT JOIN video_candidates c ON c.pack_id=p.pack_id WHERE p.active=1 AND p.tenant_id=?").get(tenantId);
 const packs=store.db.prepare('SELECT pack_id,graph_id,graph_sha256,manifest_sha256,files_json,imported_at FROM video_candidate_packs WHERE active=1 AND tenant_id=? ORDER BY imported_at DESC LIMIT 20').all(tenantId);
 return {authority:'candidate-only',productionAccepted:false,originalVideosPresent:false,transcriptAvailable:false,counts:{packs:totals.packs,videos:totals.videos,scenes:totals.scenes,assets:totals.assets,relationships:totals.relationships},packsTruncated:totals.packs>packs.length,packs:packs.map(p=>({packId:p.pack_id,graphId:p.graph_id,importedAt:p.imported_at,graphSha256:p.graph_sha256,manifestSha256:p.manifest_sha256,files:JSON.parse(p.files_json),sceneCount:store.db.prepare('SELECT COUNT(*) n FROM video_candidates WHERE pack_id=?').get(p.pack_id).n,frameIndexComplete:has(JSON.parse(p.files_json),'frames')}))};
}

export function videoCandidates(store,{tenantId,q='',videoId='',videoKey='',sceneId='',key='',area='',offset=0,limit=50}={}){
 if(!/^[a-zA-Z0-9_@.\-]{1,180}$/.test(tenantId||''))fail('name one tenant scope');
 const term=String(q).trim().slice(0,120).toLowerCase(),video=String(videoId).slice(0,80),scene=String(sceneId).slice(0,80),take=Math.max(1,Math.min(100,Number(limit)||50)),skip=Math.max(0,Math.min(100000,Number(offset)||0));
 const scopedKey=/^(video-[a-f0-9]{32}):([a-zA-Z0-9_-]{1,80})$/;
 const sceneMatch=key?scopedKey.exec(String(key)):null,videoMatch=videoKey?scopedKey.exec(String(videoKey)):null;
 if(key&&!sceneMatch||videoKey&&!videoMatch)throw Object.assign(Error('Choose a source media locator.'),{status:400});
 const areaRule=area?SOURCE_MEDIA_AREAS.find(x=>x.id===area):null;
 if(area&&!areaRule)throw Object.assign(Error('Choose a source media area.'),{status:400});
 const fragments=areaRule?.matches.source.split('|')||[];
 const areaWhere=fragments.length?' AND ('+fragments.map(()=>'instr(c.asset_types,?)>0').join(' OR ')+' OR EXISTS (SELECT 1 FROM json_each(c.related_nodes) node WHERE '+fragments.map(()=>'instr(json_extract(node.value,\'$.type\'),?)>0').join(' OR ')+'))':'';
 const from="FROM video_candidates c JOIN video_candidate_packs p ON p.pack_id=c.pack_id LEFT JOIN video_candidate_sources v ON v.pack_id=c.pack_id AND v.video_id=c.video_id WHERE p.active=1 AND p.tenant_id=? AND (?='' OR c.video_id=?) AND (?='' OR c.scene_id=?) AND (?='' OR c.pack_id=?) AND (?='' OR c.scene_id=?) AND (?='' OR c.pack_id=?) AND (?='' OR c.video_id=?) AND (?='' OR instr(lower(c.title||' '||c.summary||' '||c.asset_types||' '||c.entities||' '||c.related_nodes||' '||coalesce(v.title,'')||' '||coalesce(v.file_name,'')),?)>0)"+areaWhere;
 const args=[tenantId,video,video,scene,scene,sceneMatch?.[1]||'',sceneMatch?.[1]||'',sceneMatch?.[2]||'',sceneMatch?.[2]||'',videoMatch?.[1]||'',videoMatch?.[1]||'',videoMatch?.[2]||'',videoMatch?.[2]||'',term,term];
 args.push(...fragments,...fragments);
 const total=store.db.prepare('SELECT COUNT(*) n '+from).get(...args).n;
 const rows=store.db.prepare('SELECT c.*,p.graph_id,p.graph_sha256,p.manifest_sha256,p.pack_id,v.file_name,v.title video_title,v.duration_s '+from+' ORDER BY c.video_id,c.start_ms,c.pack_id,c.scene_id LIMIT ? OFFSET ?').all(...args,take,skip);
 const videos=store.db.prepare('SELECT c.pack_id packId,c.video_id videoId,COALESCE(v.title,c.video_id) title,v.file_name fileName,v.duration_s durationSeconds FROM video_candidates c JOIN video_candidate_packs p ON p.pack_id=c.pack_id LEFT JOIN video_candidate_sources v ON v.pack_id=c.pack_id AND v.video_id=c.video_id WHERE p.active=1 AND p.tenant_id=? GROUP BY c.pack_id,c.video_id ORDER BY title,c.pack_id,c.video_id LIMIT 50').all(tenantId).map(v=>({...v,id:v.packId+':'+v.videoId,mediaAvailable:false,transcriptAvailable:false}));
 const counts=videoCandidateStatus(store,tenantId).counts;
 const result={authority:'candidate-only',productionAccepted:false,originalVideosPresent:false,transcriptAvailable:false,total,offset:skip,limit:take,nextOffset:null,videos,videoListTruncated:counts.videos>videos.length,counts,provenance:{source:'tenant-repository-index',packIds:[],originalsPresent:false,originalHashesKnown:false},results:[]};
 // Even a valid pack may have unevenly sized scenes. Keep each response below the workbench's
 // 250 KB service-read bound and advance the cursor by the number actually delivered.
 const MAX_RESPONSE_BYTES=180000,packIds=new Set();let size=Buffer.byteLength(JSON.stringify(result))+300;
 for(const r of rows){
  const item={sceneId:r.scene_id,id:r.pack_id+':'+r.scene_id,sourceMediaId:r.pack_id+':'+r.scene_id,videoId:r.video_id,videoKey:r.pack_id+':'+r.video_id,fileName:r.file_name||null,videoTitle:r.video_title||null,durationSeconds:r.duration_s??null,startMs:r.start_ms,endMs:r.end_ms,startSeconds:r.start_ms/1000,endSeconds:r.end_ms/1000,startFrame:r.start_frame,endFrame:r.end_frame,title:r.title,summary:r.summary,assetTypes:r.asset_types.split(';').filter(Boolean),candidateEntities:r.entities.split(';').filter(Boolean),relatedNodes:JSON.parse(r.related_nodes),relatedEdges:JSON.parse(r.related_edges),confidence:r.confidence,authorityState:r.authority_state,rightsState:r.rights_state,originalVideosPresent:false,transcriptAvailable:false,packId:r.pack_id,graphId:r.graph_id,graphSha256:r.graph_sha256,manifestSha256:r.manifest_sha256,projectSourceId:null};
  const bytes=Buffer.byteLength(JSON.stringify(item))+3;
  if(size+bytes>MAX_RESPONSE_BYTES){if(!result.results.length)throw Object.assign(Error('This media scene exceeds the response limit.'),{status:413});break;}
  result.results.push(item);size+=bytes;packIds.add(r.pack_id);
 }
 result.provenance.packIds=[...packIds];
 result.nextOffset=skip+result.results.length<total?skip+result.results.length:null;
 return result;
}
