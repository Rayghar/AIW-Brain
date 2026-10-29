// DOM behaviour + real Worker/SQLite; this is not rendered browser QA.
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {Window}=await import(process.env.AIW_DOM_MODULE),w=new Window({url:'https://aiw.test/?chapter=1'});
for(const k of ['window','document','history','location','localStorage','CustomEvent','Event','MouseEvent','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator'])Object.defineProperty(globalThis,k,{value:k==='window'?w:w[k],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
const {default:worker}=await import('./worker.js'),{localDatabase}=await import('./local-db.js'),{localFiles}=await import('./local-files.js');
const root=await mkdtemp(path.join(tmpdir(),'aiw-ui-intake-')),env={DB:localDatabase(path.join(root,'db.sqlite')),FILES:localFiles(path.join(root,'files'))};
globalThis.fetch=(url,options={})=>worker.fetch(new Request(new URL(url,'https://aiw.test'),{...options,headers:{...options.headers,Origin:'https://aiw.test','oai-authenticated-user-id':'ui-reviewer'}}),env);
const wait=async(fn,label)=>{for(let i=0;i<300;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error(label+' '+document.body.textContent.slice(-1000));},q=s=>document.querySelector(s),click=s=>{assert(q(s),'Missing '+s);q(s).click();};
try{
 const {createProjectStore}=await import('./public/project-store.js'),store=createProjectStore();await store.load();
 const {openIntake,openSourceRow}=await import('./public/intake-ui.js');let completed=false;openIntake({store,onSaved:()=>{completed=true;}});
 const bytes=await readFile(process.env.AIW_WORKBOOK),file=new w.File([bytes],'SEABaaS.xlsx'),dt=new w.DataTransfer();dt.items.add(file);q('#intake-file').files=dt.files;q('#intake-file').dispatchEvent(new w.Event('change',{bubbles:true}));
 await wait(()=>q('[data-intake-next]')&&!q('[data-intake-next]').disabled,'Workbook mapping never became ready');assert.equal(q('#intake-header').value,'5');assert.equal(q('[data-intake-map=externalId]').value,'A');
 click('[data-intake-next]');await wait(()=>q('#intake-reviewed'),'Import preview missing');assert(document.body.textContent.includes('1,400'));q('#intake-reviewed').checked=true;click('[data-intake-next]');await wait(()=>completed,'Import not applied');
 assert.equal(store.value.document.artefacts.filter(a=>a.provenance).length,1400);const frd=store.value.document.artefacts.find(a=>a.externalId==='FRD-022');await openSourceRow(store.value.document,frd.id);assert(document.body.textContent.includes('D7'));assert(document.body.textContent.includes('Original value'));click('[data-source-close]');
 const {reviewOrdinaryChange}=await import('./public/workbench-ui.js');const command={type:'artefact',payload:{...frd,owner:'Reviewed owner'}},promise=reviewOrdinaryChange(store.value.document,command);await wait(()=>q('[data-wb-action=apply-preview]'),'Ordinary change preview missing');q('[data-reviewed]').checked=true;click('[data-wb-action=apply-preview]');const accepted=await promise;assert.equal(accepted.type,'workspace.apply');await store.command(accepted);assert.equal(store.value.document.artefacts.find(a=>a.id===frd.id).owner,'Reviewed owner');
 const {brainContext}=await import('./public/aiw-brain.js'),{workbenchHTML,mountWorkbench}=await import('./public/workbench-ui.js');document.body.innerHTML=workbenchHTML(store.value.document,brainContext(store.value.document,{chapter:7,id:'project',tab:'work'}),'design');mountWorkbench(()=>{});click('[data-wb-action=cost]');assert(q('dialog[open]'));assert(q('[name=monthly0]'));q('[data-close]').click();
 console.log('Native XLSX file selection, header mapping, 1,400-row preview/apply, original cells, ordinary-change review and cost-dialog opening passed with real project storage.');
}finally{env.DB.close();await rm(root,{recursive:true,force:true});w.happyDOM.abort();}
