import {recoveredFile} from './recovery-service.js';
import {errorResponse,integrityError} from './error-message.js';
import {sha256 as textSha256} from './public/brain-integrity.js';
import {openWorkbook,sha256,WORKBOOK_LIMITS} from './public/workbook-reader.js';
import {guessHeader,sheetHeaders,suggestMapping,mapWorkbookRows,previewIntake,applyIntake,assertionChanges,ENRICH_FIELDS,suggestEnrichMapping,mapEnrichRows,previewEnrich,applyEnrich} from './public/intake-domain.js';
import {bandValues,defaultPriorityMap,cleanPriorityMap,groupProposals,moduleProposalPreview,createImportModules,stakeholderProposals,markupFlags,proposeBrief,createImportGroups,savedMapping,savedBands,personalColumns,personalFlag,personalKey,columnProfile,outcomeProposals,constraintProposals,sourceLists,rowReferences} from './public/intake-proposals.js';
import {readStoredProject,saveStoredProject} from './project-storage.js';
import {withFinalReview} from './public/review-domain.js';
import {trackRequirementChanges,trackSourceAssertions,withChanges} from './public/changes-domain.js';
import {requirementImpact} from './shared/projects-domain.js';
import {usesLens} from './public/statement-checks.js';
import {activityStatement} from './object-service.js';
import {commitAuthor,activityTitle} from './authorship.js';
import {json} from './http.js';

const prefix=(owner,id)=>'intake/'+encodeURIComponent(owner)+'/'+encodeURIComponent(id)+'/';
async function bodyBytes(request,limit){const parts=[];let size=0;if(!request.body)return new Uint8Array();const reader=request.body.getReader();try{while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>limit){await reader.cancel();throw Error('This upload exceeds the supported size.');}parts.push(r.value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length;}return bytes;}
async function inputJSON(request){const bytes=await bodyBytes(request,100000);try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Error('The intake request could not be read.');}}
async function uploadFor(env,owner,projectId,id){const row=await env.DB.prepare('SELECT * FROM workbook_uploads WHERE owner_id=? AND project_id=? AND id=?').bind(owner,projectId,id).first();if(!row){const restored=await recoveredFile(env,owner,projectId,{kind:'workbook',id});if(restored)return restored;throw Error('This workbook is unavailable in the current project.');}if(!row.storage_key.startsWith(prefix(owner,projectId)))throw Error('The workbook reference is invalid.');const file=await env.FILES.get(row.storage_key);if(!file)throw integrityError('The original workbook could not be loaded.',row.storage_key);return {row,file};}
// The person's choice of personal data to import (round 12, GR-SRC-06): {sheet, column} keys, as the preview flagged them.
const includeOf=raw=>[...new Set((Array.isArray(raw?.personal)?raw.personal:[]).filter(k=>typeof k==='string').map(k=>k.slice(0,300)))].slice(0,200);
const isEnrich=raw=>raw?.mode==='enrich';
// The flagged columns of the sheet read, and those of them held back.
function personalOf(sheet,headerRow,include){const flags=personalColumns(sheet).filter(f=>{const row=Number(headerRow);return !f.header||Number(f.header.replace(/^[A-Z]+/,''))<=row;});return {flags,withheld:flags.filter(f=>!include.includes(personalKey(f.sheet,f.column))).map(f=>f.column)};}
// A dataset's later revisions are kept as cell deltas (round 12, A3: GR-STO-04). Every import revision kept a full copy
// of the mapped workbook (every row with every cell), and a recovery package counted each against a fixed budget, so a
// second revision of a large workbook broke portable recovery. A revision after the first is now stored as the cells
// that changed against the revision before it: a row by its external id, with its own position and statement fields
// when they changed and, of its cells, only those that changed (a cell's address is its column and the row's position,
// so a row that moved changes no cell); a new row whole. The delta names its base revision and the SHA-256 of the base
// and of the revision it makes, and is stored only when applying it to its base makes that revision again exactly; else,
// and every KEYFRAME revisions, the revision is stored whole. Reading a revision applies the deltas from the last whole
// one, each checked against its SHA-256. A revision stored whole before round 12 reads as before.
export const SNAPSHOT_DELTA='aiw.intake-snapshot-delta.v1',KEYFRAME=8;
const isObject=v=>!!v&&typeof v==='object'&&!Array.isArray(v),sameKeys=(a,b)=>{const x=Object.keys(a),y=Object.keys(b);return x.length===y.length&&x.every((k,i)=>k===y[i]);};
// The patch that turns a into b (undefined when they write the same JSON): objects with the same keys by key, arrays of
// the same length by index, anything else replaced.
function diffJSON(a,b){
 if(a===b||JSON.stringify(a)===JSON.stringify(b))return undefined;
 if(isObject(a)&&isObject(b)&&sameKeys(a,b)){const o={};for(const k of Object.keys(b)){const d=diffJSON(a[k],b[k]);if(d!==undefined)o[k]=d;}return {o};}
 if(Array.isArray(a)&&Array.isArray(b)&&a.length===b.length){const x=[];b.forEach((v,i)=>{const d=diffJSON(a[i],v);if(d!==undefined)x.push([i,d]);});return {a:x};}
 return {v:b};
}
function patchJSON(a,d){
 if(d===undefined)return a;if(Object.hasOwn(d,'v'))return d.v;
 if(d.o){if(!isObject(a))throw integrityError('A source revision delta does not fit its base.');const out={};for(const k of Object.keys(a))out[k]=Object.hasOwn(d.o,k)?patchJSON(a[k],d.o[k]):a[k];return out;}
 if(d.a){if(!Array.isArray(a))throw integrityError('A source revision delta does not fit its base.');const out=a.slice();for(const [i,x] of d.a)out[i]=patchJSON(a[i],x);return out;}
 throw integrityError('A source revision delta could not be read.');
}
// A row with each cell's address left out where it is its column and the row's position, and put back.
const derivable=(row,c)=>{if(!isObject(c)||typeof c.column!=='string'||c.address!==c.column+row.sourceRow)return false;const k=Object.keys(c);return k[0]==='column'&&k[1]==='label'&&k[2]==='address';};
const lean=row=>Array.isArray(row?.values)?{...row,values:row.values.map(c=>{if(!derivable(row,c))return c;const {address:_a,...rest}=c;return rest;})}:row;
const full=row=>Array.isArray(row?.values)?{...row,values:row.values.map(c=>{if(!isObject(c)||Object.hasOwn(c,'address')||typeof c.column!=='string')return c;const {column,label,...rest}=c;return {column,label,address:column+row.sourceRow,...rest};})}:row;
export function applySnapshotDelta(base,delta){
 const byId=new Map((base.rows||[]).map(r=>[r.externalId,r])),rows=delta.rows.map(r=>{if(r.w)return r.w;const b=byId.get(r.e);if(!b)throw integrityError('A source revision delta names a row its base does not hold.');return r.d===undefined?b:full(patchJSON(lean(b),r.d));});
 return Object.fromEntries(delta.keys.map(k=>[k,k==='rows'?rows:delta.head[k]]));
}
// The delta of source against base (both whole), or null when the revision is to be stored whole.
export function snapshotDelta(base,source,depth){
 if(depth>=KEYFRAME-1||!Array.isArray(base?.rows)||!Array.isArray(source?.rows))return null;
 const byId=new Map(base.rows.map(r=>[r.externalId,r])),text=JSON.stringify(source),baseText=JSON.stringify(base),{rows:_r,...head}=source;
 const delta={schema:SNAPSHOT_DELTA,datasetId:source.datasetId,revision:source.revision,workbookHash:source.workbookHash,base:{revision:base.revision,sha256:textSha256(baseText)},depth:depth+1,keys:Object.keys(source),head,
  rows:source.rows.map(r=>{const b=byId.get(r.externalId);if(!b)return {w:r};const d=diffJSON(lean(b),lean(r));return d===undefined?{e:r.externalId}:{e:r.externalId,d};}),sha256:textSha256(text),chars:text.length};
 return JSON.stringify(applySnapshotDelta(base,delta))===text?delta:null;
}
// A revision read whole (a delta applied to its base, read the same way), checked against its receipt: {source, depth}.
async function readSnapshot(env,owner,projectId,version,dataset,seen=0){
 let f;if(!version?.snapshotKey)throw Error('Choose an existing source revision.');
 if(!version.snapshotKey.startsWith(prefix(owner,projectId))){const restored=await recoveredFile(env,owner,projectId,{kind:'snapshot',key:version.snapshotKey});if(!restored)throw Error('The source snapshot reference is invalid.');f=restored.file;}else f=await env.FILES.get(version.snapshotKey);
 if(!f)throw integrityError('The saved source revision could not be loaded.',version.snapshotKey);
 const stored=JSON.parse(await f.text());let source=stored,depth=0;
 if(stored?.schema===SNAPSHOT_DELTA){
  const baseVersion=(dataset?.versions||[]).find(v=>v.revision===stored.base?.revision);
  if(!baseVersion||seen>KEYFRAME)throw integrityError('The source revision\'s base revision is missing.',version.snapshotKey);
  const base=await readSnapshot(env,owner,projectId,baseVersion,dataset,seen+1);
  if(textSha256(JSON.stringify(base.source))!==stored.base.sha256)throw integrityError('The source revision\'s base does not match its SHA-256.',version.snapshotKey);
  source=applySnapshotDelta(base.source,stored);depth=base.depth+1;
  const text=JSON.stringify(source);if(text.length!==stored.chars||textSha256(text)!==stored.sha256)throw integrityError('The source revision does not match its SHA-256.',version.snapshotKey);
 }
 if(source.workbookHash!==version.workbookHash||source.revision!==version.revision)throw integrityError('The source revision does not match its receipt.',version.snapshotKey);
 return {source,depth};
}
const snapshotFor=async(env,owner,projectId,version,dataset)=>(await readSnapshot(env,owner,projectId,version,dataset)).source;
// identity: {owner, actor, role} from projectIdentity. The import is executed on the owner's project and attributed to
// the signed-in actor, with an activity row in the same batch as the change (round 2, B2-09).
// Round 12 (GR-INT-05): mode 'enrich' reads a further sheet into the requirements an import made (intake-domain.js
// previewEnrich), creating none; its dataset is the upload's sheet ('enrich-<upload>-<sheet number>'), revised by a later
// upload chosen as its destination.
export async function handleIntake(request,env,identity,projectId){
 const owner=identity.owner,actor=identity.actor||owner,url=new URL(request.url),action=url.searchParams.get('action')||'inspect';
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
   const source=await snapshotFor(env,owner,projectId,version,dataset),row=source.rows.find(r=>(r.externalId||r.joinId)===url.searchParams.get('externalId'));
   return json({dataset:dataset.id,filename:version.filename,revision:version.revision,hash:version.workbookHash,sheet:version.sheet,headers:source.headers,...(row?{row}:{rows:source.rows.slice(0,50),total:source.rows.length}),versions:dataset.versions.map(v=>({revision:v.revision,at:v.at,hash:v.workbookHash}))});
  }
  if(action==='download'&&request.method==='GET'){
   const {row,file}=await uploadFor(env,owner,projectId,url.searchParams.get('uploadId'));return new Response(await file.arrayBuffer(),{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="'+row.filename.replace(/["\r\n]/g,'_')+'"','Cache-Control':'no-store'}});
  }
  if(request.method!=='POST')return json({error:'Choose a supported intake action.'},405);
  const raw=await inputJSON(request),{row:upload,file}=await uploadFor(env,owner,projectId,raw.uploadId),workbook=await openWorkbook(new Uint8Array(await file.arrayBuffer()));
  const datasets=project.intake?.datasets||[],include=includeOf(raw),enrich=isEnrich(raw);
  const listed=datasets.map(d=>({id:d.id,mode:d.mode==='enrich'?'enrich':'requirements',filename:d.filename,sheet:d.sheet,revision:d.revision,mapping:d.mapping,priorityMap:d.priorityMap||{}}));
  if(action==='inspect'){
   const sheet=await workbook.sheet(raw.sheet||workbook.sheets.find(s=>/requirement/i.test(s.name))?.name||workbook.sheets[0].name);
   if(enrich){
    // A further sheet: its header, the join column (the column whose cells hold the most ids of the project's
    // requirements), the evidence and assertion columns AIW recognises, and its personal data, held back.
    const headerRow=raw.headerRow||guessHeader(sheet,ENRICH_FIELDS),{flags,withheld}=personalOf(sheet,headerRow,include),known=new Set(project.artefacts.filter(a=>a.type==='requirement'&&a.externalId).map(a=>String(a.externalId).trim()));
    const s=suggestEnrichMapping(sheet,headerRow,known,{exclude:withheld}),destination=raw.datasetId!==undefined?datasets.find(d=>d.id===raw.datasetId&&d.mode==='enrich'):null;
    const mapping=destination?Object.fromEntries(Object.keys(ENRICH_FIELDS).map(k=>[k,s.headers.some(h=>h.column===destination.mapping?.[k])&&!withheld.includes(destination.mapping[k])?destination.mapping[k]:s.mapping[k]])):s.mapping;
    return json({mode:'enrich',sheet:sheet.name,headerRow,headers:s.headers,mapping,fields:Object.fromEntries(Object.entries(ENRICH_FIELDS).map(([k,f])=>[k,{label:f.label,required:!!f.required}])),matches:s.matches,personal:flags.map(f=>personalFlag(f,include)),rowCount:sheet.rows.filter(r=>r.number>headerRow).length,formulaCount:sheet.formulaCount,mergedCells:sheet.mergedCells,preview:sheet.rows.slice(0,12),datasets:listed,datasetId:destination?.id||'',projectRevision:projectRow.revision});
   }
   const headerRow=raw.headerRow||guessHeader(sheet),headers=sheetHeaders(sheet,headerRow),{flags,withheld}=personalOf(sheet,headerRow,include);
   // Round 12 (GR-INT-06): a new revision of a dataset (the one chosen, else the one imported from the same file and
   // sheet) is proposed the mapping and band mapping it was saved with, matched by header, with every difference listed.
   const requirementSets=datasets.filter(d=>d.mode!=='enrich'),matches=requirementSets.filter(d=>d.filename===upload.filename&&d.sheet===sheet.name);
   const destination=raw.datasetId!==undefined?requirementSets.find(d=>d.id===raw.datasetId)||null:matches.length===1?matches[0]:null;
   let mapping=suggestMapping(headers,{exclude:withheld}),differences=[],bandDifferences=[];
   if(destination){const labels=destination.mappingLabels||Object.fromEntries(Object.entries(destination.mapping||{}).filter(([,v])=>v).map(([k,v])=>[k,(destination.headers||[]).find(h=>h.column===v)?.label||'']));
    const kept=Object.values(labels).some(Boolean)?labels:await snapshotFor(env,owner,projectId,destination,destination).then(s=>Object.fromEntries(Object.entries(destination.mapping||{}).filter(([,v])=>v).map(([k,v])=>[k,s.headers.find(h=>h.column===v)?.label||'']))).catch(()=>({}));
    ({mapping,differences}=savedMapping(destination,headers,kept,{exclude:withheld}));}
   // The priority band's values in this sheet, with the priority each sets (round 12, D-09): the saved choice of a
   // re-import, else the default. A mapping sent with the request reads the band from the column the person chose.
   const bandColumn=typeof raw.mapping?.priorityBand==='string'?raw.mapping.priorityBand:mapping.priorityBand,values=headers.some(h=>h.column===bandColumn)?bandValues(sheet,headerRow,bandColumn):[];
   let map=defaultPriorityMap(values);if(destination&&bandColumn===destination.mapping?.priorityBand)({map,differences:bandDifferences}=savedBands(destination.priorityMap,values));
   return json({mode:'requirements',sheet:sheet.name,headerRow,headers,mapping,bands:{column:bandColumn||'',values,map},rowCount:sheet.rows.filter(r=>r.number>headerRow).length,formulaCount:sheet.formulaCount,mergedCells:sheet.mergedCells,preview:sheet.rows.slice(0,12),personal:flags.map(f=>personalFlag(f,include)),datasets:listed,datasetId:destination?.id||'',basis:destination?{datasetId:destination.id,revision:destination.revision,filename:destination.filename,sheet:destination.sheet}:null,differences,bandDifferences,projectRevision:projectRow.revision});
  }
  if(!['preview','apply'].includes(action))throw Error('Choose a supported intake action.');
  const sheet=await workbook.sheet(raw.sheet),dataset=raw.datasetId?datasets.find(d=>d.id===raw.datasetId):null;if(raw.datasetId&&!dataset)throw Error('Choose the dataset to update from this project.');
  if(dataset&&(dataset.mode==='enrich')!==enrich)throw Error(enrich?'Choose an enrichment to update, or a new one.':'Choose a requirement dataset to update.');
  const {flags,withheld}=personalOf(sheet,Number(raw.headerRow),include);
  const base={datasetId:'',revision:(dataset?.revision||0)+1,filename:upload.filename,uploadId:upload.id,workbookHash:upload.sha256,sheet:sheet.name,headerRow:Number(raw.headerRow)};
  // An import is its own author kind (round 12, D-06), an enrichment too (an import that creates no requirement): applied
  // by a person who reviewed its preview, or unreviewed by an agent or service account, which never claims a review. Every
  // journal event it adds says who, of what kind, whether a person stood behind it and why (stampEvents), and so does its
  // activity row (save).
  const author=commitAuthor({actor,account:identity.account},{authorKind:'import',reason:raw.reason},null,{kind:'import'});
  const stampEvents=from=>{for(const event of (result.document.changes?.events||[]).slice(from)){event.actor??=actor;event.authorKind??='import';event.reviewed??=author.reviewed;if(author.reason)event.reason??=author.reason;if(author.account==='agent')event.account??='agent';}};
  let result;
  if(enrich)return await enrichAction();
  const mapped=mapWorkbookRows(sheet,raw.headerRow,raw.mapping||{},{withhold:withheld});
  const source={...mapped,...base,datasetId:dataset?.id||'workbook-'+upload.id,priorityMap:cleanPriorityMap(raw.priorityMap)},priorRead=dataset?await readSnapshot(env,owner,projectId,dataset,dataset):null,prior=priorRead?.source||null;
  // Re-uploading identical bytes under the existing dataset keeps its identity.
  if(!dataset&&datasets.some(d=>d.id===source.datasetId))throw Error('This workbook is already imported. Select its existing dataset to review an update.');
  // What the import proposes and reports besides its rows (round 12, D-09): groups from the domain and capability-theme
  // columns, stakeholders from the user-group column, a brief from the overview sheets (holding back a sentence that
  // names a person no one chose to import), the statements that hold markup, the intended outcomes and the regulations
  // the rows name (GR-INT-04, GR-INT-10), the profile of the mapped columns (GR-SRC-03), the personal data flagged
  // (GR-SRC-06) and the lists of these requirements the workbook keeps in its assurance sheets (GR-SRC-04, -05).
  const choice={domain:raw.groups?.domain!==false,capabilityTheme:raw.groups?.capabilityTheme!==false,modules:raw.groups?.modules===true};
  const brief=await proposeBrief(workbook,{exclude:sheet.name,include,personal:flags});
  const extras={groups:groupProposals(project,source),...(choice.modules?{modules:moduleProposalPreview(project,source)}:{}),stakeholders:stakeholderProposals(project,source,dataset?.proposals),brief:brief?.sentences.length?{sentences:brief.sentences,sheets:brief.sheets}:null,markup:markupFlags(source),
   outcomes:outcomeProposals(source),constraints:constraintProposals(source,{lens:usesLens(project)}),profile:columnProfile(source),personal:[...flags.map(f=>personalFlag(f,include)),...(brief?.personal||[])],withheld:{brief:brief?.withheld||0,columns:withheld},lists:await sourceLists(workbook,source,{exclude:sheet.name}),choice};
  const preview=previewIntake(project,source,prior?.rows||[],extras);
  if(action==='preview')return json({...preview,projectRevision:projectRow.revision,datasetId:source.datasetId});
  if(raw.revision!==projectRow.revision)return json({error:'The project changed. Refresh the preview before applying the import.',conflict:true},409);
  const at=new Date().toISOString();source.snapshotKey=prefix(owner,projectId)+'snapshots/'+crypto.randomUUID()+'.json';
  result=applyIntake(project,source,preview,raw,at,actor,{unattended:author.account==='agent'});
  if(result.unchanged)return json({...result,revision:projectRow.revision,updatedAt:projectRow.updated_at});
  // The groups the reviewed preview proposed, created with the import and named on its receipt.
  const groups=createImportGroups(result.document,extras.groups,choice,{filename:upload.filename,datasetId:source.datasetId,revision:source.revision},at,actor),receipt=result.document.intake.datasets.find(d=>d.id===source.datasetId);
  receipt.groups=groups;receipt.versions.at(-1).groups=groups;result.groups=groups;
  // Round 24 (D-24-02): the module structure the person asked for, proposed from the whole project, saved as proposed.
  if(choice.modules){const modules=createImportModules(result.document,{datasetId:source.datasetId},at,actor);receipt.modules=modules;receipt.versions.at(-1).modules=modules;result.modules=modules;}
  // A later revision is stored as the cells that changed against the one before it (snapshotDelta), else whole.
  await env.FILES.put(source.snapshotKey,JSON.stringify((prior&&snapshotDelta(prior,source,priorRead.depth))||source),{httpMetadata:{contentType:'application/json'}});
  try{
   const from=project.changes?.events?.length||0;
   trackRequirementChanges(project,result.document,at,requirementImpact);
   // Round 12 (GR-INT-03): what the source asserts of a requirement, changed by this revision, is journalled with the
   // design records built on it for review; confirmation stands.
   trackSourceAssertions(project,result.document,at,requirementImpact,assertionChanges(project,result.document,source.datasetId),{from,datasetId:source.datasetId,revision:source.revision});
   stampEvents(from);
   return await save(result,source,at,upload.filename+' · '+source.datasetId+' · revision '+source.revision);
  }catch(e){await env.FILES.delete(source.snapshotKey);throw e;}

  // A further sheet, read into the requirements it names (GR-INT-05, GR-SRC-05, GR-SRC-06).
  async function enrichAction(){
   const mapped=mapEnrichRows(sheet,raw.headerRow,raw.mapping||{},{withhold:withheld}),number=workbook.sheets.findIndex(s=>s.name===sheet.name)+1;
   const source={...mapped,...base,datasetId:dataset?.id||'enrich-'+upload.id+'-'+number};
   if(!dataset&&datasets.some(d=>d.id===source.datasetId))throw Error('This sheet is enriching the requirements already. Select its enrichment to review an update.');
   const reqs=new Map(project.artefacts.filter(a=>a.type==='requirement'&&a.externalId).map(a=>[String(a.externalId).trim(),a])),head=new Map(source.headers.map(h=>[h.column,h.label]));
   const refs=rowReferences(source.rows.filter(r=>reqs.get(r.joinId)?.provenance?.sourceRow).map(r=>({expected:reqs.get(r.joinId).provenance.sourceRow,cells:r.values.filter(v=>v.column!==source.mapping.joinId).map(v=>[v.column,v.value])})),c=>head.get(c)||'');
   const preview=previewEnrich(project,source,{rowReferences:refs,personal:flags.map(f=>personalFlag(f,include))});
   if(action==='preview')return json({...preview,projectRevision:projectRow.revision,datasetId:source.datasetId});
   if(raw.revision!==projectRow.revision)return json({error:'The project changed. Refresh the preview before applying the enrichment.',conflict:true},409);
   const at=new Date().toISOString();source.snapshotKey=prefix(owner,projectId)+'snapshots/'+crypto.randomUUID()+'.json';
   result=applyEnrich(project,source,preview,raw,at,actor,{unattended:author.account==='agent'});
   if(result.unchanged)return json({...result,revision:projectRow.revision,updatedAt:projectRow.updated_at});
   await env.FILES.put(source.snapshotKey,JSON.stringify(source),{httpMetadata:{contentType:'application/json'}});
   try{
    // One journal entry for the enrichment: the requirements it added to; it opens no review (evidence, not what they say).
    const from=project.changes?.events?.length||0,p=withChanges(result.document);
    if(result.touched.length)p.changes.events.push({id:'CHG-'+String(++p.changes.counter).padStart(3,'0'),source:{chapter:1,id:'intake-enrich:'+source.datasetId,ref:'Chapter 1',kind:'intake-enrich',title:'Enrichment from '+sheet.name},title:'Enriched '+result.touched.length+' requirement'+(result.touched.length===1?'':'s')+' from '+sheet.name,at,before:{state:'Revision '+(dataset?.revision||0)},after:{state:'Revision '+source.revision},fields:[{key:'enrichment',label:'Evidence and assertions from a further sheet',before:dataset?'Revision '+dataset.revision:'None',after:'Revision '+source.revision+': '+preview.counts.add+' added, '+preview.counts.update+' updated, '+preview.counts.missing+' no longer listed'}],items:[],requirementIds:result.touched,actor,quiet:{reason:'Evidence and assertions read from a further sheet: what the requirements say is unchanged, so no review is opened.'}});
    stampEvents(from);
    return await save(result,source,at,upload.filename+' · '+sheet.name+' · enrichment revision '+source.revision);
   }catch(e){await env.FILES.delete(source.snapshotKey);throw e;}
  }
  async function save(result,source,at,summary){
   const change=await saveStoredProject(env,owner,projectId,result.document,projectRow.revision,at,stored.keys,stamp=>[activityStatement(env,{owner,actor},projectId,{at,kind:'import',title:activityTitle('intake.apply',author),command:'intake.apply',authorKind:'import',account:author.account,reviewed:author.reviewed,...(author.reason?{reason:author.reason}:{}),summary:summary.slice(0,160),objectId:null,datasetId:source.datasetId,uploadId:upload.id,workbookHash:upload.sha256,revision:projectRow.revision+1,...(result.imported?{counts:result.imported}:{})},stamp)]);
   if(!change.meta?.changes){await env.FILES.delete(source.snapshotKey);return json({error:'The project changed during import. Refresh the preview; nothing was applied.',conflict:true},409);}
   return json({...result,revision:projectRow.revision+1,updatedAt:at});
  }
 }catch(e){return errorResponse(e,400,{route:'/api/intake',owner,project:projectId});}
}
