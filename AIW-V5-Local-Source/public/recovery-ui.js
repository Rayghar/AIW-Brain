import {modal} from './workbench-ui.js';
import {projectURL} from './project-context.js';
import {esc} from './html-escape.js';
import {servicePost} from './project-store.js';
// Through servicePost: an Idempotency-Key and one retry under it when the answer is lost (round 2).
async function api(action,raw){return servicePost('/api/recovery?action='+action,raw,{fallback:'Recovery could not be completed.'});}
// A recovery package (round 12, GR-STO-03: aiw.recovery.v2) is NDJSON: its entries, then its manifest on the last line.
// One that fits a request is sent whole; a larger one is sent in entries — its manifest, then its entry lines in order,
// in requests of at most SEND_BYTES as sent (each line escaped in the request's JSON, as UTF-8), each checked by the
// server against its SHA-256 as it arrives — and previewed and restored by its upload. A project JSON or model package,
// or a package written before round 12, is one JSON file. A request stays within the server's 12 MiB.
const INLINE_BYTES=11*1024*1024,SEND_BYTES=10*1024*1024,sentBytes=s=>new TextEncoder().encode(JSON.stringify(s)).length;
function entryPackage(text){const lines=text.split('\n').filter(l=>l.length);if(lines.length<2)return null;let manifest=null;try{manifest=JSON.parse(lines.at(-1));}catch{return null;}return manifest?.schema==='aiw.recovery.v2'?{manifest,lines:lines.slice(0,-1)}:null;}
// The package as the preview and the restore name it: {package} sent whole, or {upload} once its entries are sent.
async function prepared(text,progress){
 const pack=entryPackage(text);
 if(!pack){if(text.length>12*1024*1024)throw Error('Choose a project JSON file up to 12 MB, or a recovery package.');return {package:JSON.parse(text)};}
 if(sentBytes(text)<=INLINE_BYTES)return {package:text};
 const begun=await api('upload',{manifest:pack.manifest});let batch=[],size=0,sent=0;
 const send=async()=>{if(!batch.length)return;const r=await api('upload-entries',{upload:begun.upload,lines:batch});sent=r.received;batch=[];size=0;progress('Sending the package: '+sent+' of '+begun.entries+' entries checked and kept.');};
 for(const line of pack.lines){const n=sentBytes(line)+1;if(size&&size+n>SEND_BYTES)await send();batch.push(line);size+=n;}
 await send();
 return {upload:begun.upload};
}
// A restored project opens in place when the shell is on screen (round 4, A: the shell switches project without a
// document load); from the Projects page, its own route, it is the document load into the shell.
export function importProject(){let source,preview;const d=modal('Restore or import an AIW project','<form><p>Bring an AIW model package, project JSON or recovery package into a new private project. A recovery package includes original files and retained collaboration history.</p><label class="brain-field">Project file<input type="file" name="file" accept=".ndjson,.json,application/json,application/x-ndjson" required></label><p data-progress role="status"></p><div data-preview></div><button type="submit" class="btn primary">Review contents</button></form>');const f=d.querySelector('form'),progress=t=>{d.querySelector('[data-progress]').textContent=t;};f.elements.file.onchange=()=>{source=null;preview=null;progress('');d.querySelector('[data-preview]').innerHTML='';f.querySelector('button').textContent='Review contents';};f.onsubmit=async e=>{e.preventDefault();const button=f.querySelector('button');button.disabled=true;try{if(!preview){const file=f.elements.file.files[0];if(!file)throw Error('Choose a project file.');source=await prepared(await file.text(),progress);preview=await api('preview',source);progress('');d.querySelector('[data-preview]').innerHTML=`<h3>${esc(preview.name)}</h3><p>${preview.objects} objects · ${preview.relationships} relationships · ${preview.baselines} baselines · ${preview.files} original files.</p><ol class="guide-model-preview">${preview.chapters.map(c=>`<li><span>Chapter ${esc(c.id)}</span><strong>${esc(c.title)}</strong><small>${c.done}/${c.total} content milestones</small></li>`).join('')}</ol>${preview.limits.map(l=>`<p>${esc(l)}</p>`).join('')}<label class="brain-field">New project name<input name="name" maxlength="100" value="${esc(preview.name+' · restored')}" required></label><label class="brain-check"><input name="reviewed" type="checkbox">I reviewed the contents and historical evidence status.</label>`;button.textContent='Restore as a new project';}else{const result=await api('restore',{...source,hash:preview.hash,name:f.elements.name.value,reviewed:f.elements.reviewed.checked}),href=projectURL(result.modelView?'/?chapter=4&tab=model&modelView='+encodeURIComponent(result.modelView):'/?chapter=1&tab=work',result.id);d.closeView();if(!window.aiwRoute?.(href))location.href=href;}}catch(err){d.error(err);}finally{button.disabled=false;}};}
export async function exportRecovery(){const r=await fetch(projectURL('/api/recovery?action=export'),{credentials:'same-origin'});if(!r.ok){const e=await r.json();throw Error(e.error);}const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='AIW_Recovery.ndjson';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
