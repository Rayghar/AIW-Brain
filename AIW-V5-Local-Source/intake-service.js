import {recoveredFile} from './recovery-service.js';
import {openWorkbook,sha256,WORKBOOK_LIMITS} from './public/workbook-reader.js';
import {guessHeader,sheetHeaders,suggestMapping,mapWorkbookRows,previewIntake,applyIntake} from './public/intake-domain.js';
import {digest} from './public/brain-integrity.js';
import {readStoredProject,saveStoredProject} from './project-storage.js';
import {withFinalReview} from './public/review-domain.js';
import {trackRequirementChanges} from './public/changes-domain.js';
import {requirementImpact} from './public/projects-domain.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const prefix=(owner,id)=>'intake/'+encodeURIComponent(owner)+'/'+encodeURIComponent(id)+'/';
async function bodyBytes(request,limit){const parts=[];let size=0;if(!request.body)return new Uint8Array();const reader=request.body.getReader();try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>limit){await reader.cancel();throw Error('This upload exceeds the supported size.');}parts.push(r.value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}return bytes;}
async function inputJSON(request){const bytes=await bodyBytes(request,100000);try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('The intake request could not be read.');}}
async function uploadFor(env,owner,projectId,id){const row=await env.DB.prepare('SELECT * FROM workbook_uploads WHERE owner_id=? AND project_id=? AND id=?').bind(owner,projectId,id).first();if(!row){const restored=await recoveredFile(env,owner,projectId,{kind:'workbook',id});if(restored)return restored;throw Error('This workbook is unavailable in the current project.');}if(!row.storage_key.startsWith(prefix(owner,projectId)))throw Error('The workbook reference is invalid.');const file=await env.FILES.get(row.storage_key);if(!file)throw Error('The original workbook could not be loaded.');return {row,file};}
async function snapshotFor(env,owner,projectId,version){let f;if(!version.snapshotKey.startsWith(prefix(owner,projectId))){const restored=await recoveredFile(env,owner,projectId,{kind:'snapshot',key:version.snapshotKey});if(!restored)throw Error('The source snapshot reference is invalid.');f=restored.file;}else f=await env.FILES.get(version.snapshotKey);if(!f)throw Error('The saved source revision could not be loaded.');const source=JSON.parse(await f.text());if(source.workbookHash!==version.workbookHash||source.revision!==version.revision)throw Error('The source revision does not match its receipt.');return source;}
export async function handleIntake(request,env,owner,projectId){
 const url=new URL(request.url),action=url.searchParams.get('action')||'inspect';
 if(!env.FILES)return json({error:'Private workbook storage is unavailable. Your file has not been imported.'},503);
 if(request.method==='POST'&&request.headers.get('Origin')!==url.origin)return json({error:'Import from your private project workspace.'},403);
 const projectRow=await env.DB.prepare('SELECT document,revision,updated_at FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
 if(!projectRow)return json({error:'Open or create a project before importing.'},404);
 if(request.method!=='GET'&&JSON.parse(projectRow.document).workspace?.status==='archived')return json({error:'Restore this project before importing sources.'},409);
 try{
  if(action==='upload'&&request.method==='POST'){
   const filename=(url.searchParams.get('filename')||'').replace(/[\\/\x00-\x1f]/g,'').slice(0,220);if(!/\.xlsx$/i.test(filename))throw Error('Choose an unencrypted .xlsx workbook.');
   const bytes=await bodyBytes(request,WORKBOOK_LIMITS.bytes),hash=await sha256(bytes),workbook=await openWorkbook(bytes);
   const prior=await env.DB.prepare('SELECT id FROM workbook_uploads WHERE owner_id=? AND project_id=? AND sha256=? ORDER BY created_at DESC LIMIT 1').bind(owner,projectId,hash).first();
   if(prior)return json({id:prior.id,filename,hash,sheets:workbook.sheets,reused:true});
   const id=crypto.randomUUID(),key=prefix(owner,projectId)+id+'.xlsx',at=new Date().toISOString();
   await env.FILES.put(key,bytes,{httpMetadata:{contentType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}});
   try{await env.DB.prepare('INSERT INTO workbook_uploads(owner_id,id,project_id,filename,sha256,bytes,storage_key,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(owner,id,projectId,filename,hash,bytes.length,key,at).run();}catch(e){await env.FILES.delete(key);throw e;}
   return json({id,filename,hash,sheets:workbook.sheets},201);
  }
  const stored=await readStoredProject(env,owner,projectRow.document),project=withFinalReview(stored.document);
  if(action==='source'&&request.method==='GET'){
   const dataset=project.intake?.datasets.find(d=>d.id===url.searchParams.get('dataset')),version=dataset?.versions.find(v=>v.revision===Number(url.searchParams.get('revision')||dataset.revision));if(!version)throw Error('Choose an existing source revision.');
   const source=await snapshotFor(env,owner,projectId,version),row=source.rows.find(r=>r.externalId===url.searchParams.get('externalId'));
   return json({dataset:dataset.id,filename:version.filename,revision:version.revision,hash:version.workbookHash,sheet:version.sheet,headers:source.headers,...(row?{row}:{rows:source.rows.slice(0,50),total:source.rows.length}),versions:dataset.versions.map(v=>({revision:v.revision,at:v.at,hash:v.workbookHash}))});
  }
  if(action==='download'&&request.method==='GET'){
   const {row,file}=await uploadFor(env,owner,projectId,url.searchParams.get('uploadId'));return new Response(await file.arrayBuffer(),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="'+row.filename.replace(/["\r\n]/g,'_')+'"','Cache-Control':'no-store'}});
  }
  if(request.method!=='POST')return json({error:'Choose a supported intake action.'},405);
  const raw=await inputJSON(request),{row:upload,file}=await uploadFor(env,owner,projectId,raw.uploadId),workbook=await openWorkbook(new Uint8Array(await file.arrayBuffer()));
  if(action==='inspect'){
   const sheet=await workbook.sheet(raw.sheet||workbook.sheets.find(s=>/requirement/i.test(s.name))?.name||workbook.sheets[0].name),headerRow=raw.headerRow||guessHeader(sheet),headers=sheetHeaders(sheet,headerRow);
   return json({sheet:sheet.name,headerRow,headers,mapping:suggestMapping(headers),rowCount:sheet.rows.filter(r=>r.number>headerRow).length,formulaCount:sheet.formulaCount,mergedCells:sheet.mergedCells,preview:sheet.rows.slice(0,12),datasets:project.intake?.datasets.map(d=>({id:d.id,filename:d.filename,sheet:d.sheet,revision:d.revision}))||[],projectRevision:projectRow.revision});
  }
  if(!['preview','apply'].includes(action))throw Error('Choose a supported intake action.');
  const sheet=await workbook.sheet(raw.sheet),mapped=mapWorkbookRows(sheet,raw.headerRow,raw.mapping||{});
  const dataset=raw.datasetId?project.intake?.datasets.find(d=>d.id===raw.datasetId):null;if(raw.datasetId&&!dataset)throw Error('Choose the dataset to update from this project.');
  const source={...mapped,datasetId:dataset?.id||'workbook-'+upload.id,revision:(dataset?.revision||0)+1,filename:upload.filename,uploadId:upload.id,workbookHash:upload.sha256,sheet:sheet.name,headerRow:Number(raw.headerRow)},prior=dataset?await snapshotFor(env,owner,projectId,dataset):null;
  // Re-uploading identical bytes under the existing dataset keeps its identity.
  if(!dataset&&project.intake?.datasets.some(d=>d.id===source.datasetId))throw Error('This workbook is already imported. Select its existing dataset to review an update.');
  const preview=previewIntake(project,source,prior?.rows||[]);
  if(action==='preview')return json({...preview,projectRevision:projectRow.revision,datasetId:source.datasetId});
  if(raw.revision!==projectRow.revision)return json({error:'The project changed. Refresh the preview before applying the import.',conflict:true},409);
  const at=new Date().toISOString();source.snapshotKey=prefix(owner,projectId)+'snapshots/'+crypto.randomUUID()+'.json';
  const result=applyIntake(project,source,preview,raw,at,owner);
  if(result.unchanged)return json({...result,revision:projectRow.revision,updatedAt:projectRow.updated_at});
  await env.FILES.put(source.snapshotKey,JSON.stringify(source),{httpMetadata:{contentType:'application/json'}});
  try{
   trackRequirementChanges(project,result.document,at,requirementImpact);
   const change=await saveStoredProject(env,owner,projectId,result.document,projectRow.revision,at,stored.keys);
   if(!change.meta?.changes){await env.FILES.delete(source.snapshotKey);return json({error:'The project changed during import. Refresh the preview; nothing was applied.',conflict:true},409);}
  }catch(e){await env.FILES.delete(source.snapshotKey);throw e;}
  return json({...result,revision:projectRow.revision+1,updatedAt:at});
 }catch(e){return json({error:e.message},400);}
}
