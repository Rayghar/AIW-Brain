// Output restoration is read-only: prerequisites, local inspection and workflow access.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w=new Window({url:'https://aiw.test/?project=output-restoration&chapter=1&tab=output',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const key of ['window','document','history','location','CustomEvent','Event','HTMLElement','MutationObserver'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
const {seedProject}=await import('./public/requirements-domain.js');
const {withFinalReview}=await import('./public/review-domain.js');
const {createProject}=await import('./shared/projects-domain.js');
const {outputStage,outputRecords,recordListHTML}=await import('./public/output-documents.js');
const {chapterOfRecord}=await import('./public/chapter-records.js');
const {outputWorkspaceHTML,mountOutputWorkspace}=await import('./public/output-workspace.js');
const received=[];document.addEventListener('aiw:inspect-record',event=>received.push(event.detail));
let related=0,inspected=0,workflows=0;
function render(p,chapter,options={}){
 history.replaceState({},'','/?project=output-restoration&chapter='+chapter+'&tab=output');
 document.body.innerHTML=outputWorkspaceHTML(p,chapter,options);mountOutputWorkspace(document.body);
}
try{
 const p=withFinalReview(seedProject()),blank=withFinalReview(createProject({name:'Output restoration',template:'blank'},'output-restoration'));
 for(const fixture of [blank,p]){
  const before=JSON.stringify(fixture);
  for(let chapter=1;chapter<=11;chapter++){
   render(fixture,chapter,{handoff:'<button type="button" data-native-handoff="'+chapter+'">Native handoff</button>'});
   const S=outputStage(fixture,chapter);
   for(const doc of S.later.filter(row=>!row.here)){
    const row=document.querySelector('[data-output-related="'+doc.id+'"]');assert(row,doc.id+' is discoverable');
    assert.equal(row.querySelector('.output-prerequisite').textContent,doc.needs,'Exact prerequisites survive the workspace composition');
    assert.equal(new URL(row.querySelector('a').href).searchParams.get('chapter'),String(doc.chapter));
    if(!doc.available)assert.match(row.textContent,/Needs /,'An unavailable related document names the missing input');related++;
   }
   for(const panel of ['sources','handoff']){
    const button=document.querySelector('[data-output-panel="'+panel+'"]'),details=document.getElementById(button.getAttribute('aria-controls'));
    assert(!button.closest('details'),'Workflow entry stays outside a collapsed disclosure');assert(!details.open);button.click();assert(details.open);
    assert.equal(button.getAttribute('aria-expanded'),'true');workflows++;
   }
   assert(document.querySelector('[data-native-handoff="'+chapter+'"]'),'The supplied native command remains intact');
   const initialURL=location.href,selected=document.querySelector('[data-output-document][aria-pressed="true"]')?.dataset.outputDocument,frame=document.querySelector('iframe'),src=frame?.getAttribute('src');
   const buttons=[...document.querySelectorAll('[data-out-inspect]')];assert.equal(buttons.length,Math.min(50,outputRecords(fixture,chapter).length));
   for(const button of buttons){
    const id=button.dataset.outInspect,last=received.length;button.click();assert.equal(received.length,last+1);
    assert.deepEqual(received.at(-1),{id,chapter:chapterOfRecord(fixture,id)});
    const row=button.closest('.out-record');assert(row.querySelector('[data-out-work="'+id+'"]'),'Open in Work stays separate');
    assert.equal(location.href,initialURL);assert.equal(document.querySelector('[data-output-document][aria-pressed="true"]')?.dataset.outputDocument,selected);
    assert.equal(document.querySelector('iframe'),frame);assert.equal(frame?.getAttribute('src'),src);inspected++;
   }
  }
  assert.equal(JSON.stringify(fixture),before,'Workspace inspection never mutates records');
 }
 // A source list embedded in Chapter 11 must inspect its canonical owner, not its host.
 const before=JSON.stringify(p),source=outputRecords(p,1)[0];
 render(p,11,{records:recordListHTML(p,1,{documents:false}),editionControls:'<form class="rv-export-form"><select name="edition"><option value="architecture">Architecture</option><option value="executive">Executive</option></select><select name="audience"><option value="all">All</option><option value="delivery">Delivery</option></select></form>',baselinePreview:'/api/export?chapter=11&baseline=fixture&format=html&view=1',baselineControls:'<button data-frozen-control>Frozen control</button>'});
 const edition=document.querySelector('[name="edition"]');edition.value='executive';edition.dispatchEvent(new Event('change',{bubbles:true}));
 const audience=document.querySelector('[name="audience"]');audience.value='delivery';audience.dispatchEvent(new Event('change',{bubbles:true}));
 const originalFrame=document.querySelector('iframe'),preview=originalFrame.src;
 const button=document.querySelector('[data-out-inspect="'+source.id+'"]');button.dataset.outChapter='11';button.click();
 assert.deepEqual(received.at(-1),{id:source.id,chapter:1},'Canonical saved owner takes precedence over presentation metadata');
 assert.equal(new URL(location.href).searchParams.get('chapter'),'11');assert.equal(new URL(location.href).searchParams.get('tab'),'output');
 assert.equal(document.querySelector('iframe'),originalFrame);assert.equal(originalFrame.src,preview);assert.equal(edition.value,'executive');assert.equal(audience.value,'delivery');
 document.querySelector('[data-output-document="frozen"]').click();assert(document.querySelector('[data-frozen-control]'));assert.match(document.querySelector('iframe').src,/baseline=fixture/);
 button.click();assert.equal(document.querySelector('[data-output-document][aria-pressed="true"]').dataset.outputDocument,'frozen');assert.match(document.querySelector('iframe').src,/baseline=fixture/);
 assert.equal(JSON.stringify(p),before);
 console.log(`PASS Output restoration: ${related} related-document prerequisites, ${inspected+2} canonical Inspect actions, ${workflows} workflow entry actions; tabs, selection, editions, preview and frozen controls retained; no saved mutations.`);
}finally{await w.happyDOM.close();}
