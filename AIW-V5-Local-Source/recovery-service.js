import {validateNativePackage,PACKAGE_SCHEMA} from './public/model-exchange.js';
import {publicMessage,integrityError,isIntegrityError} from './error-message.js';
import {readStoredProject,saveStoredProject,wholeProject} from './project-storage.js';
import {withFinalReview,chapterSummaries} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {journeyIndex} from './public/journey-context.js';
import {sha256} from './public/workbook-reader.js';
import {assertDocumentSafe} from './shared/document-safety.js';
import {RECOVERY_V2,packageLines,packageText,checkManifest,checkLine,assemblePackage,stagingKey} from './recovery-package.js';
import {json} from './http.js';
// A request to this route stays within 12 MiB (server.js): a package larger than that arrives in entries (upload).
const MAX=12*1024*1024;
function decoded(s){if(typeof s!=='string'||s.length>MAX*1.4)throw Error('Invalid recovery file encoding.');return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
// A package as it arrives: an entry package (aiw.recovery.v2, recovery-package.js) as its NDJSON text or as the entries an
// upload staged, checked entry by entry and assembled; a package written before round 12 (aiw.recovery.v1, compressed
// or not) or a project JSON or model package, as before.
async function unpackRecovery(pack){
 if(typeof pack==='string'){const {manifest,line}=packageText(pack);return packageOf(await assemblePackage(manifest,line));}
 if(pack?.staged)return packageOf(await assemblePackage(pack.staged.manifest,pack.staged.line));
 if(pack?.schema!=='aiw.recovery.gzip.v1')return pack;
 if(!Number.isInteger(pack.expandedBytes)||pack.expandedBytes<1||pack.expandedBytes>64*1024*1024)throw Error('The recovery package expands beyond the 64 MB project limit.');
 const bytes=decoded(pack.body);if(await sha256(bytes)!==pack.checksum)throw Error('The recovery package checksum does not match.');
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),parts=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>pack.expandedBytes||size>64*1024*1024){await reader.cancel();throw Error('The recovery package expands beyond its declared size.');}parts.push(value);}}finally{reader.releaseLock();}if(size!==pack.expandedBytes)throw Error('The recovery package size does not match.');return JSON.parse(await new Blob(parts).text());
}
// An assembled entry package in the shape the preview and the restore read: its project, its audit record, its files
// with their bytes (each checked against its SHA-256 as it was assembled) and its manifest's checksum as its identity.
const packageOf=a=>({schema:RECOVERY_V2,at:a.manifest.at,revision:a.manifest.revision,authority:a.manifest.authority,project:a.project,audit:a.audit,files:a.files,checksum:a.manifest.checksum});
async function body(request){const reader=request.body?.getReader();if(!reader)throw Error('Choose a project export or recovery package.');let size=0,out='',decode=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX){await reader.cancel();throw Error('This recovery request exceeds 12 MB. Send a larger package in entries (the workbench does), or use the local project database backup.');}out+=decode.decode(value,{stream:true});}return JSON.parse(out+decode.decode());}
const AUTHORITY='Portable source history. Imported identities are historical assertions; access grants, server secrets and live approvals are not transferred.';
// The package of a project (round 12, GR-STO-03: aiw.recovery.v2, recovery-package.js), line by line: the project with its
// change journal and its frozen baselines whole (project-storage.js wholeProject), its audit record, and each original
// file it references (workbooks, source snapshots — the later revisions of a dataset as the cell deltas they are stored
// as — and attachments), read when its turn comes. The manifest, with every entry's SHA-256, is the last line.
export async function* recoveryLines(env,identity,project){
 const row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(identity.owner,project).first();if(!row)throw Error('Project unavailable.');
 const stored=await readStoredProject(env,identity.owner,row.document),p=await wholeProject(env,identity.owner,project,withFinalReview(stored.document),stored.keys),files=[],seen=new Set();
 const retain=(key,metadata)=>{if(!key||seen.has(key))return;seen.add(key);files.push({...metadata,key,read:async()=>{const item=await env.FILES.get(key);if(!item)throw integrityError('A referenced original is missing; recovery is incomplete.',key);return new Uint8Array(await item.arrayBuffer());}});};
 const uploads=(await env.DB.prepare('SELECT * FROM workbook_uploads WHERE owner_id=? AND project_id=?').bind(identity.owner,project).all()).results;
 for(const u of uploads)retain(u.storage_key,{kind:'workbook',metadata:{id:u.id,filename:u.filename,sha256:u.sha256,bytes:u.bytes,created_at:u.created_at}});
 const attachments=(await env.DB.prepare('SELECT * FROM project_attachments WHERE owner_id=? AND project_id=?').bind(identity.owner,project).all()).results;
 for(const a of attachments)retain(a.storage_key,{kind:'attachment',metadata:{id:a.id,filename:a.filename,sha256:a.sha256,bytes:a.bytes,source_id:a.source_id,created_at:a.created_at,actor_id:a.actor_id}});
 for(const d of p.intake?.datasets||[])for(const v of d.versions||[]){const key=p.workspace?.recovery?.keys?.[v.snapshotKey]||v.snapshotKey;if(key)retain(key,{kind:'snapshot',originalKey:v.snapshotKey});}
 for(const f of p.workspace?.recovery?.files||[])if(!seen.has(f.key))retain(f.key,{kind:f.kind,metadata:f.metadata,originalKey:f.originalKey});
 const audit={};for(const table of ['project_reviews','object_discussions','project_activity'])audit[table]=(await env.DB.prepare('SELECT document FROM '+table+' WHERE owner_id=? AND project_id=?').bind(identity.owner,project).all()).results.map(r=>JSON.parse(r.document));
 yield* packageLines({at:new Date().toISOString(),revision:row.revision,project:{id:p.id,name:p.name},authority:AUTHORITY},{project:p,audit},files);
}
// The whole package as one text, for a caller in process (the route streams it: handleRecovery).
export async function buildRecovery(env,identity,project){let out='';for await(const line of recoveryLines(env,identity,project))out+=line;return out;}
// The preview reads the package once (round 2, B2-23): handleRecovery unpacks it and hands the result to both
// the preview and the restore, so a package is checked and assembled once per request, not twice.
export async function previewRecovery(raw,unpacked=null){const encodedPack=typeof raw==='string'||raw?.staged?raw:raw.package||raw,pack=unpacked||await unpackRecovery(encodedPack),v2=pack.schema===RECOVERY_V2,p=pack.project||pack.document||pack;if(!p||typeof p.name!=='string'||!Array.isArray(p.artefacts)||!Array.isArray(p.relationships))throw Error('Choose a complete AIW project JSON export.');assertDocumentSafe(p);for(const key of ['quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime','finalReview'])if(!p[key]||p[key].storageKey)throw Error('The export must include the complete '+key+' chapter.');if(p.caseExtensions||p.requirementsStorage||p.coauthoring?.storageKey||p.workbench?.storageKey||p.knowledge?.storageKey||p.changes?.storageKey||p.changes?.segments||p.changes?.archive||(Array.isArray(p.changes?.events)&&p.changes.events.some(e=>e?.archived))||p.changes?.archivedCount)throw Error('Use the hydrated project export, not internal storage metadata.');const {checksum,...payload}=pack;if(pack.schema==='aiw.recovery.v1'&&checksum!==await sha256(new TextEncoder().encode(JSON.stringify(payload))))throw Error('The recovery package checksum does not match.');if(!v2&&(pack.files||[]).length>200)throw Error('This package exceeds the portable file count.');
 // An entry package's files were checked part by part as it was assembled, each within its own limit; a package written
 // before round 12 keeps its file budget.
 let bytes=0;for(const f of pack.files||[]){const data=v2?f.data:decoded(f.body);bytes+=data.length;if((!v2&&bytes>7*1024*1024)||data.length!==f.bytes||await sha256(data)!==f.hash||!['workbook','snapshot','attachment'].includes(f.kind))throw Error('A recovery file failed integrity or size checks.');}
 const native=pack.schema===PACKAGE_SCHEMA?await validateNativePackage(pack):null;const hydrated=withFinalReview(p),index=journeyIndex(hydrated);if(index.nodes.size>100000)throw Error('Use the managed migration path above 100,000 objects.');if(hydrated.finalReview.baselines.some(b=>!b.source||b.storageKey||b.frozen))throw Error('Every baseline must contain its original frozen snapshot.');return {name:p.name,objects:native?.objects||index.nodes.size,relationships:native?.relationships||index.edges.length,chapters:chapterSummaries(hydrated),files:(pack.files||[]).length,sourceBytes:bytes,baselines:p.finalReview.baselines.length,importedAuthority:importedAuthoritySummary(hydrated),hash:v2?pack.checksum:await sha256(new TextEncoder().encode(JSON.stringify(encodedPack))),limits:['aiw.recovery.v1',RECOVERY_V2].includes(pack.schema)?['Restored as a new private project. Imported review history is retained as historical evidence.','Imported review, baseline, approval and claim-verification authors are historical assertions: approval evidence and the delivery handoff need an architect review recorded here and a second signed-in person, and imported knowledge claims need a verification recorded here before they are used.','Organisation releases require verified membership and reviewed adoption.']:['Project JSON does not include original uploaded files or authenticated collaboration history. Attach originals separately or use a recovery package.']};}
// Imported authority (round 2, B2-01). A package carries whoever was signed in on the workbench it came from.
// Here those identities are historical assertions, kept as importedActor for the record. The signed-in actor
// fields that the four-eyes rules compare (the architect review's author, a baseline's author, an approval's
// author) are cleared, exactly as knowledge receipts and organisation pins are neutralised: an approval on this
// workbench needs an architect review recorded here and a second signed-in person, and an imported handoff is
// never current. Group judgements, trace reviews and finding treatments also remain historical until a person
// records the review on this workbench. Chapter content, stamps and typed reviewer names are untouched.
export const IMPORTED_AUTHORITY='Imported historical assertion; not a signed-in identity on this workbench.';
const importedAuthoritySummary=p=>{const m=p.finalReview||{};const actors=new Set();const note=r=>{if(r?.actor)actors.add(r.actor);};for(const r of m.reviews||[])note(r);for(const r of m.judgements||[])note(r);for(const b of m.baselines||[]){note(b);note(b.review?.outcome);}for(const g of m.governance||[])note(g);const verified=(p.knowledge?.claims||[]).filter(c=>c.review?.actor);for(const c of verified)note(c.review);return {reviews:(m.reviews||[]).length,judgements:(m.judgements||[]).length,baselines:(m.baselines||[]).length,governance:(m.governance||[]).length,handoff:!!m.handoff,verifiedClaims:verified.length,actors:[...actors].sort(),authority:IMPORTED_AUTHORITY};};
export function neutraliseImportedAuthority(p,at){
 const m=p.finalReview;if(!m||typeof m!=='object')return p;
 const strip=r=>{if(!r||typeof r!=='object')return;if(r.actor!=null)r.importedActor=r.actor;r.actor=null;};
 strip(m.intake);strip(m.checks);
 for(const r of m.reviews||[])strip(r);
 for(const r of m.judgements||[])strip(r);
 for(const b of m.baselines||[]){strip(b);if(b.review?.outcome)strip(b.review.outcome);}
 for(const g of m.governance||[]){strip(g);if(g.reviewAuthor!=null){g.importedReviewAuthor=g.reviewAuthor;g.reviewAuthor=null;}}
 for(const d of m.dispositions||[])strip(d);
 for(const t of m.traces||[])strip(t);
 for(const a of m.actions||[])strip(a.verification);
 if(m.capacity)strip(m.capacity);
 if(m.handoff){m.importedHandoff={...m.handoff,authority:IMPORTED_AUTHORITY};m.handoff=null;}
 m.imported={at,authority:IMPORTED_AUTHORITY,reviews:(m.reviews||[]).length,judgements:(m.judgements||[]).length,baselines:(m.baselines||[]).length,governance:(m.governance||[]).length};
 // Knowledge claims follow the same four-eyes rule (knowledgeEligibility: the verifier is not the author). An imported
 // verifier is a historical assertion too, so a claim, and its copy in a release, needs a verification recorded here
 // by a signed-in person before it is used: a released claim is immutable, so that means a successor release.
 const verifier=c=>{if(c?.review&&typeof c.review==='object'){if(c.review.actor!=null)c.review.importedActor=c.review.actor;c.review.actor=null;}};
 for(const c of p.knowledge?.claims||[])verifier(c);
 for(const r of p.knowledge?.releases||[])for(const c of r.claims||[])verifier(c);
 // Round 12 (GR-DOM-09): a pinned organisation knowledge release was verified on the workbench it came from; here its
 // claims stay ineligible until this workbench's organisation is found to sign exactly it (refreshOrganizationAssurance).
 for(const r of Array.isArray(p.knowledge?.organizationReleases)?p.knowledge.organizationReleases:[])if(r&&typeof r==='object')r.assurance={eligible:false,status:IMPORTED_AUTHORITY,signature:r.signature??null};
 return p;
}
// A package larger than one request arrives in entries (round 12, GR-STO-03): its manifest first (action=upload), then
// its entry lines in order (action=upload-entries, as many requests as it takes, each line checked against its SHA-256
// as it arrives and kept privately), then preview and restore name the upload. An upload is the actor's own; at most
// OPEN_UPLOADS are open at once, and one left unfinished is swept after a day (retention.js).
const OPEN_UPLOADS=4,UPLOAD_ID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
async function uploadOf(env,actor,id){if(typeof id!=='string'||!UPLOAD_ID.test(id))throw Error('Choose a recovery package you are sending.');const row=await env.DB.prepare('SELECT * FROM recovery_uploads WHERE actor_id=? AND id=?').bind(actor,id).first();if(!row)throw Error('This recovery package upload is no longer available. Send the package again.');return {id:row.id,received:row.received,manifest:JSON.parse(row.manifest)};}
async function stagedPackage(env,actor,id){const u=await uploadOf(env,actor,id),total=u.manifest.entries.length;if(u.received!==total)throw Error('The package is not complete yet: '+u.received+' of '+total+' entries have arrived.');return {staged:{manifest:checkManifest(u.manifest),line:async n=>{const key=stagingKey(actor,id,n),f=await env.FILES.get(key);if(!f)throw integrityError('A staged entry of the recovery package is missing.',key);return f.text();}},total};}
export async function dropUpload(env,actor,id,received){await Promise.allSettled(Array.from({length:received},(_,i)=>env.FILES.delete(stagingKey(actor,id,i+1))));await env.DB.prepare('DELETE FROM recovery_uploads WHERE actor_id=? AND id=?').bind(actor,id).run();}
export async function handleRecovery(request,env,identity,project){const {owner,actor,role}=identity,url=new URL(request.url),action=url.searchParams.get('action')||'export';if(request.method!=='GET'&&request.headers.get('Origin')!==url.origin)return json({error:'Use recovery from the private workspace.'},403);try{
 // The complete package (document, uploaded originals, attachments, reviews, discussions, activity) and the
 // imported audit record leave the project only at the request of its owner or an editor (round 2, B2-08).
 if(['export','audit'].includes(action)&&!['owner','editor'].includes(role))return json({error:'Only the project owner and editors can export the complete project package.',code:'role'},403);
 // The package streams entry by entry (recovery-package.js), its manifest last: the project is read, and its first entry
 // written, before the answer starts, so a project that cannot be read is answered as the error it is.
 if(action==='export'&&request.method==='GET'){
  if(!await env.DB.prepare('SELECT 1 AS ok FROM projects WHERE owner_id=? AND id=?').bind(owner,project).first())return json({error:'This project is unavailable.'},404);
  const lines=recoveryLines(env,identity,project),encoder=new TextEncoder();let pending=await lines.next();
  const stream=new ReadableStream({async pull(controller){try{const x=pending||await lines.next();pending=null;if(x.done)controller.close();else controller.enqueue(encoder.encode(x.value));}catch(e){console.error(JSON.stringify({at:new Date().toISOString(),event:isIntegrityError(e)?'integrity-fault':'recovery-export-error',route:'/api/recovery',owner,project,key:e?.key||null,message:String(e?.message||e)}));controller.error(e);}},async cancel(){await lines.return?.();}});
  return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Content-Disposition':'attachment; filename="AIW_Recovery.ndjson"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(action==='audit'&&request.method==='GET'){const row=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,project).first();if(!row)return json({error:'Project unavailable.'},404);const p=JSON.parse(row.document),recovery=p.workspace?.recovery,key=recovery?.auditKey;if(!key)return json({audit:null});if(!key.startsWith('recovery/'+encodeURIComponent(owner)+'/'+encodeURIComponent(project)+'/'))throw Error('Invalid historical audit reference.');const file=await env.FILES.get(key);if(!file)throw integrityError('The imported audit record could not be loaded.',key);const bytes=new Uint8Array(await file.arrayBuffer());if(recovery.auditDigest&&await sha256(bytes)!==recovery.auditDigest)throw integrityError('The imported audit record failed its integrity check.',key);return json(JSON.parse(new TextDecoder().decode(bytes)));}
 if(!['preview','restore','upload','upload-entries'].includes(action)||request.method!=='POST')return json({error:'Unknown recovery action.'},405);const raw=await body(request);
 if(action==='upload'){const m=checkManifest(raw.manifest),open=await env.DB.prepare('SELECT COUNT(*) AS n FROM recovery_uploads WHERE actor_id=?').bind(actor).first();if(open.n>=OPEN_UPLOADS)return json({error:'Finish or wait out the packages you are sending before starting another.'},429);const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO recovery_uploads(actor_id,id,manifest,received,created_at) VALUES(?,?,?,0,?)').bind(actor,id,JSON.stringify(m),new Date().toISOString()).run();return json({upload:id,entries:m.entries.length,received:0},201);}
 if(action==='upload-entries'){
  const u=await uploadOf(env,actor,raw.upload);if(!Array.isArray(raw.lines)||!raw.lines.length||raw.lines.some(l=>typeof l!=='string'))throw Error('Send the next entries of the package.');let received=u.received;
  for(const text of raw.lines){const n=Number(/^\{"n":(\d+),/.exec(text)?.[1]);if(n<=received)continue;if(n!==received+1)return json({error:'Send the entries of the package in order: entry '+(received+1)+' is next.',received},409);await checkLine(u.manifest,text);await env.FILES.put(stagingKey(actor,u.id,n),text);received=n;}
  const r=await env.DB.prepare('UPDATE recovery_uploads SET received=? WHERE actor_id=? AND id=? AND received=?').bind(received,actor,u.id,u.received).run();if(!r.meta?.changes)return json({error:'Another request sent entries of this package meanwhile. Send the next entries again.',conflict:true},409);
  return json({upload:u.id,received,entries:u.manifest.entries.length});
 }
 const source=raw.upload!==undefined?await stagedPackage(env,actor,raw.upload):raw.package,pack=await unpackRecovery(source),preview=await previewRecovery(source,pack);if(action==='preview')return json(preview);if(raw.reviewed!==true||raw.hash!==preview.hash||typeof raw.name!=='string'||!raw.name.trim()||raw.name.length>100)throw Error('Name the restored project and review its complete source package.');
 // An entry package's project was assembled for this request; any other is copied before it is changed.
 const p=pack.schema===RECOVERY_V2?pack.project:structuredClone(pack.project||pack.document||pack),id='project-'+crypto.randomUUID(),at=new Date().toISOString(),prefix='recovery/'+encodeURIComponent(actor)+'/'+id+'/',created=[];let modelView=null;if(pack.schema===PACKAGE_SCHEMA&&pack.exploration){p.workbench??={version:1,alternatives:[],analyses:[],catalogue:[],views:[],assignments:[]};modelView='imported-view-'+preview.hash.slice(0,16);p.workbench.views??=[];p.workbench.views=p.workbench.views.filter(v=>v.id!==modelView);p.workbench.views.push({id:modelView,title:'Imported perspective',chapter:4,tab:'model',objectId:pack.exploration.selectedId||'',exploration:pack.exploration,at,actor});}const originalId=p.id;p.id=id;p.name=raw.name.trim();for(const v of p.workbench?.views||[]){if(v.exploration&&!v.exploration.baselineId){for(const key of ['scopeId','selectedId'])if(v.exploration[key]==='system:'+originalId)v.exploration[key]='system:'+id;}if(!v.exploration?.baselineId&&v.objectId==='system:'+originalId)v.objectId='system:'+id;}p.workspace={...p.workspace,status:'active',template:'imported',...(modelView?{initialModelViewId:modelView}:{}),organizationPins:[],restoredAt:at,restoredBy:actor,recovery:{originProjectId:originalId,packageHash:preview.hash,keys:{},files:[],auditKey:prefix+'audit.json',auditDigest:null}};delete p.workspace.organizationId;if(p.knowledge){p.knowledge.pins=[];if(p.knowledge.repositorySync)for(const receipt of p.knowledge.repositorySync.releases||[])receipt.assurance={eligible:false,status:'Imported historical proof; obtain a receipt for this project.'};p.knowledge.history??=[];p.knowledge.history.push({at,type:'import',reason:'Historical knowledge retained; project pins require review.'});}if(p.workbench)for(const e of p.workbench.catalogue||[]){e.status='draft';if(e.organization)e.organization.assurance={eligible:false,status:'Restored history; review and adopt the signed release again.'};}
 neutraliseImportedAuthority(p,at);
 try{
  for(const f of pack.files||[]){const key=prefix+crypto.randomUUID();await env.FILES.put(key,f.data||decoded(f.body));created.push(key);p.workspace.recovery.keys[f.originalKey||f.key]=key;p.workspace.recovery.files.push({kind:f.kind,key,originalKey:f.originalKey||f.key,metadata:f.metadata,hash:f.hash,bytes:f.bytes});}
  // The imported audit record is stored with its digest, so a later read detects alteration in object storage.
  const auditBytes=new TextEncoder().encode(JSON.stringify({importedAt:at,authority:'Historical imported assertions, not current authenticated approvals.',audit:pack.audit||{}}));await env.FILES.put(p.workspace.recovery.auditKey,auditBytes);created.push(p.workspace.recovery.auditKey);p.workspace.recovery.auditDigest=await sha256(auditBytes);
  const empty=createProject({name:p.name,template:'blank'},id,at);await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(actor,id,JSON.stringify(empty),at).run();const saved=await saveStoredProject(env,actor,id,withFinalReview(p),1,at,new Map());if(!saved.meta.changes)throw Error('The restored project could not be saved.');
  if(raw.upload!==undefined)await dropUpload(env,actor,raw.upload,source.total);
  return json({id,revision:2,name:p.name,objects:preview.objects,modelView,importedAuthority:preview.importedAuthority},201);
 }catch(e){await env.DB.prepare('DELETE FROM requirement_index WHERE owner_id=? AND project_id=?').bind(actor,id).run();await env.DB.prepare('DELETE FROM projects WHERE owner_id=? AND id=?').bind(actor,id).run();await Promise.allSettled(created.map(key=>env.FILES.delete(key)));throw e;}
 }catch(e){if(isIntegrityError(e)){console.error(JSON.stringify({at:new Date().toISOString(),event:'integrity-fault',route:'/api/recovery',action,owner,project,key:e.key||null,message:e.message}));return json({error:e.message,code:'integrity'},422);}return json({error:publicMessage(e)},400);}}
export async function recoveredFile(env,owner,project,{kind,id,key}){const row=await env.DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,project).first();if(!row)return null;const files=JSON.parse(row.document).workspace?.recovery?.files||[],item=files.find(f=>f.kind===kind&&(id?f.metadata?.id===id:f.originalKey===key));if(!item)return null;if(!item.key.startsWith('recovery/'+encodeURIComponent(owner)+'/'+encodeURIComponent(project)+'/'))throw Error('Invalid imported file reference.');const file=await env.FILES.get(item.key);if(!file)throw integrityError('The restored original file is missing.',item.key);if(await sha256(await file.arrayBuffer())!==item.hash)throw integrityError('The restored original failed its integrity check.',item.key);return {row:{...item.metadata,storage_key:item.key},file};}
