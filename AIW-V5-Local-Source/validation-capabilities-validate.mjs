// UI regression checks against real chapter adapters and domain-derived findings.
// Treatment records below exist only in this synthetic in-memory fixture.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const nextOf=()=>{const root=document.querySelector('[data-validation-workspace]');return {url:root?.dataset.validationNext||null,text:root?.dataset.validationNextText||null,kind:root?.dataset.validationNextKind||null};};
const w=new Window({url:'https://aiw.test/?chapter=11&tab=validate',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const k of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','MutationObserver','navigator','CSS'])Object.defineProperty(globalThis,k,{value:k==='window'?w:w[k],configurable:true,writable:true});
for(const k of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[k]=w[k].bind(w);
const {seedProject,findings}=await import('./public/requirements-domain.js');
const {withFinalReview,inheritedFindings,findingTreatment,applyFinalReviewCommand}=await import('./public/review-domain.js');
const {createReviewStudio}=await import('./public/review-ui.js');
const {createRequirementsStudio}=await import('./public/requirements.js');
const {mountValidationWorkspace,validationSurfaceHTML}=await import('./public/validation-workspace.js');
const {validationNextStep}=await import('./public/validate-view.js');
let commands=0;
const tick=()=>new Promise(r=>setTimeout(r,0));
const click=selector=>{const b=document.querySelector(selector);assert(b,'Control present: '+selector);b.click();return b;};
const change=(selector,value)=>{const e=document.querySelector(selector);assert(e,'Control present: '+selector);e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}));};
const count=()=>Number(document.querySelector('.validation-queue-heading b').textContent.split(' ')[0]);
const filterCount=id=>Number(document.querySelector('[data-validation-filter="'+id+'"] span').textContent);
const ids=()=>[...document.querySelectorAll('[data-validation-select]')].map(b=>b.dataset.validationSelect.slice('source:'.length)).sort();
const showAll=()=>{let b;while((b=document.querySelector('[data-validation-more]')))b.click();};
function setup(p,chapter,create){
 const store={value:{document:p,revision:1},command:async()=>{commands++;throw Error('Read-only presentation must not save');}};window.aiwProjectStore=store;
 const studio=create(store),state={chapter,tab:'validate',selected:null,visible:[],focus:false,zoom:1,pan:{x:0,y:0}};
 studio.bind({state,getNode:()=>null,render(){},persist(){},toast(){},setTab(tab){state.tab=tab;},setChapter(){},selectNode(id){state.selected=id;},hideTip(){},refreshSimulation(){}});
 const render=()=>{document.body.innerHTML='<div class="stage">'+studio.validation()+'</div>';mountValidationWorkspace(document.body,{nextStep:validationNextStep});};render();return {studio,render,state};
}
try{
 let p=withFinalReview(seedProject());
 const source=inheritedFindings(p),errors=source.filter(f=>f.level==='error');assert(errors.length>=3);
 const accepted=errors[0],fixed=errors[1],stale=errors[2];
 for(const [f,treatment]of [[accepted,'Accepted design limitation'],[fixed,'Fix before review'],[stale,'Accepted design limitation']]){
  p=applyFinalReviewCommand(p,{type:'review.disposition',payload:{findingId:f.id,stamp:inheritedFindings(p).find(x=>x.id===f.id).stamp,treatment,reviewer:'Synthetic reviewer',reference:'Unit fixture only',rationale:'Exercise the presentation of a recorded treatment in an isolated fixture.',reviewed:true}},undefined,'fixture-architect').document;
 }
 // A stale source stamp must re-open assessment; do not infer it from existence of a disposition.
 p=structuredClone(p);p.finalReview.dispositions.find(d=>d.findingId===stale.id).stamp='obsolete-synthetic-stamp';
 const current=inheritedFindings(p),expected=current.filter(f=>findingTreatment(p,f)==='Needs assessment');
 assert(expected.some(f=>f.id===stale.id));assert(!expected.some(f=>f.id===accepted.id||f.id===fixed.id));
 const before=JSON.stringify(p),review=setup(p,11,createReviewStudio);
 click('[data-validation-set="source"]');
 assert.equal(filterCount('review'),expected.length,'Awaiting assessment counts domain status, including errors and stale treatments');
 click('[data-validation-filter="review"]');showAll();
 assert.deepEqual(ids(),expected.map(f=>f.id).sort(),'Awaiting assessment includes every current Needs assessment finding');
 assert(document.querySelector('.validation-item.gaps'),'Unassessed errors stay visible in Awaiting assessment');
 click('[data-validation-filter="gaps"]');showAll();
 assert.deepEqual(ids(),current.filter(f=>f.level==='error').map(f=>f.id).sort(),'Content gaps preserve original severity, including treated errors');
 assert(document.querySelector('[data-validation-select="source:'+CSS.escape(accepted.id)+'"]').classList.contains('treated'));
 click('[data-validation-filter="all"]');change('[data-validation-source]',String(accepted.chapter));
 const chapterRows=current.filter(f=>f.chapter===accepted.chapter);
 assert.equal(filterCount('all'),chapterRows.length,'Category counts follow selected source chapter');
 assert.equal(filterCount('review'),chapterRows.filter(f=>findingTreatment(p,f)==='Needs assessment').length);
 click('[data-validation-causes] > summary');await tick();
 const expectedCauses=new Map();for(const f of chapterRows){const key=f.chapter+':'+(f.code||f.title);if(!expectedCauses.has(key))expectedCauses.set(key,[]);expectedCauses.get(key).push(f);}
 for(const row of document.querySelectorAll('[data-validation-cause-row]')){
  const fs=expectedCauses.get(row.dataset.validationCauseRow);assert(fs);
  assert.equal(Number(row.querySelector('[data-validation-cause-count]').textContent),fs.length);
  const treatments=new Map();for(const f of fs){const t=findingTreatment(p,f);treatments.set(t,(treatments.get(t)||0)+1);}
  assert.deepEqual(Object.fromEntries([...row.querySelectorAll('[data-treatment]')].map(e=>[e.dataset.treatment,Number(e.dataset.count)])),Object.fromEntries(treatments),'Cause treatment counts use current domain state');
 }
 assert(document.querySelector('.validation-record-chips a[href*="tab=work"]'),'Cause overview restores direct affected-record routes');
 const cause=click('[data-validation-cause-pick]').dataset.validationCausePick;
 assert.equal(count(),expectedCauses.get(cause).length,'Cause action narrows the actual finding queue');
  const search=document.querySelector('[data-validation-search]');search.value='no matching finding 123456';search.dispatchEvent(new Event('input',{bubbles:true}));
  assert.equal(count(),0);assert.equal(document.querySelector('[data-validation-cause]').value,cause,'Search cannot conceal a cause that still filters the queue');
  assert([...document.querySelector('[data-validation-cause]').options].find(o=>o.value===cause).textContent.includes('(0)'));
  const clearSearch=document.querySelector('[data-validation-search]');clearSearch.value='';clearSearch.dispatchEvent(new Event('input',{bubbles:true}));
 change('[data-validation-cause]','');
 click('[data-validation-filter="review"]');
 assert.equal([...document.querySelectorAll('[data-validation-cause-count]')].reduce((n,e)=>n+Number(e.textContent),0),count(),'Cause aggregate respects assessment filter and source chapter');
 click('[data-validation-set="final"]');assert(!document.querySelector('[data-validation-source]'));
 click('[data-validation-set="source"]');assert.equal(document.querySelector('[data-validation-source]').value,'all','No inherited source filter survives set switch');
 change('[data-validation-source]','4');
 change('[data-validation-group]','object');await tick();
 const groups=[...document.querySelectorAll('[data-validation-group-id]')];assert(groups.length>1,'By object renders genuine multiple groups');
 assert(groups.every(g=>g.querySelector('.validation-group-counts')));
 // rc41 close: a group of chapter-level findings is named for what it is, never by the internal "project" subject, and
 // each count agrees with its number ("1 review item", "2 gaps").
 {const labels=groups.map(g=>g.querySelector('summary > b').textContent),counts=groups.flatMap(g=>[...g.querySelectorAll('.validation-group-counts > span')].map(s=>s.textContent));
  const chapterLevel=current.filter(f=>f.chapter===4&&(!f.objectId||f.objectId==='project'));
  assert(chapterLevel.length>0,'the fixture has chapter-level findings in Chapter 4');
  assert(labels.includes('Chapter 4 · The chapter as a whole'),'the chapter-level group is named as the chapter as a whole: '+JSON.stringify(labels));
  assert(!labels.some(l=>/(^|· )project$/.test(l)),'no group is named "project": '+JSON.stringify(labels));
  assert(counts.some(c=>/^1 \D/.test(c)),'the fixture has a group of one, so the singular is read: '+JSON.stringify(counts));
  assert(counts.length&&counts.every(c=>{const m=c.match(/^(\d+) (gaps?|review items?|treated)$/);return m&&(m[2]==='treated'||(Number(m[1])===1)===!/s$/.test(m[2]));}),'every count agrees with its number: '+JSON.stringify(counts));}
 const first=groups[0],firstKey=first.dataset.validationGroupId;assert(first.open);first.querySelector('summary').click();await tick();assert(!first.open);
 change('[data-validation-group]','cause');await tick();assert(document.querySelectorAll('[data-validation-group-id]').length>1,'By kind renders actual collapsible groups');
 click('[data-validation-groups="expand"]');await tick();assert([...document.querySelectorAll('[data-validation-group-id]')].every(g=>g.open));
 click('[data-validation-groups="collapse"]');await tick();assert([...document.querySelectorAll('[data-validation-group-id]')].every(g=>!g.open));
 // New module instance simulates a reload with no in-memory workspace state.
 const fresh=await import('./public/validation-workspace.js?reload=capabilities');
 const syntheticOptions={title:'Reload check',purpose:'Fixture',run:'<button data-test-run>Run checks</button>',findings:current.map(f=>({...f,set:'source',sourceFinding:f,sourceChapter:f.chapter,objectId:f.objectId,actions:'<button>Open remedy</button>'}))};
 document.body.innerHTML=fresh.validationSurfaceHTML(p,11,syntheticOptions);fresh.mountValidationWorkspace(document.body,{nextStep:validationNextStep});
 assert.equal(document.querySelector('[data-validation-group]').value,'cause','Grouping survives module reload');
 click('[data-validation-set="source"]');change('[data-validation-source]','4'); // group context itself is independent of source filter
 change('[data-validation-group]','object');await tick();
 const restored=document.querySelector('[data-validation-group-id="'+CSS.escape(firstKey)+'"]');
 // Reload fixture uses another source chapter when the first error is not Chapter 4; verify stored collapse below directly.
 const pref=JSON.parse(localStorage.getItem('aiw-validate-groups-11-whole:'+p.id));assert.equal(pref.open[firstKey],false,'Individual collapse survives reload');
 assert(restored);assert.equal(restored.open,false);
 review.render();click('[data-validation-set="source"]');change('[data-validation-source]','4');change('[data-validation-group]','priority');
 const recordFinding=[...document.querySelectorAll('[data-validation-select]')].find(b=>b.dataset.validationSelect.endsWith(':api'));assert(recordFinding);recordFinding.click();
 let inspection;document.addEventListener('aiw:inspect-record',e=>inspection=e.detail,{once:true});const route=location.href;click('[data-validation-inspect]');
 assert.deepEqual(inspection,{id:'api',chapter:4});assert.equal(location.href,route,'Inspect event retains the current workspace route');assert.equal(review.state.tab,'validate');
 const checks11=(await import('./public/readiness-model.js')).chapterChecks(p,11),expectedNext=validationNextStep(checks11,11)||checks11.next;
 const {projectURL}=await import('./public/project-context.js');
 assert.equal(nextOf().url,expectedNext?.url?projectURL(expectedNext.url):null,'Do not replace the domain draft workflow with an invented primary action: the published next task is the readiness model\'s');
 assert.equal(nextOf().text,expectedNext?.text||null,'published in the readiness model\'s words');
 assert.equal(document.querySelectorAll('.validation-recommendation, [data-validation-related], [data-validation-next]:not([data-validation-workspace]), [data-validation-run]').length,0,'The next task is said once, in the shell footer: no second line in the workspace, only the root\'s published reading (rc41, W2)');
 assert.equal(JSON.stringify(p),before);review.studio.dispose();
 // Chapter 1 warning-level content gaps retain their original classification.
 const q=withFinalReview(seedProject());q.id='requirements-category-fixture';q.artefacts.find(a=>a.id==='REQ-001').description='The system should be fast and user friendly.';
 const warnings=findings(q).filter(f=>f.level==='warning'&&!['confirmation','brief-review'].includes(f.code));assert(warnings.some(f=>f.code==='ambiguity'));
 const requirements=setup(q,1,createRequirementsStudio);click('[data-validation-filter="gaps"]');showAll();
 const qNext=validationNextStep((await import('./public/readiness-model.js')).chapterChecks(q,1),1);assert(qNext?.url);assert.equal(nextOf().url,projectURL(qNext.url),'Primary recommendation uses the existing domain route: the published next task is its route');assert.equal(nextOf().text,qNext.text,'in its words');
 for(const f of warnings)assert(document.querySelector('[data-validation-select="chapter:'+CSS.escape(f.id)+'"]'),'Warning content gap remains in Content gaps: '+f.code);
 click('[data-validation-filter="review"]');assert([...document.querySelectorAll('[data-validation-select]')].every(b=>/chapter:(confirmation|brief-review):/.test(b.dataset.validationSelect)));
 requirements.studio.dispose();
 // A stale, clear chapter publishes "Record current checks" as the native command; the studio's own Run checks is the one button.
 const r=withFinalReview(seedProject());r.id='recommended-native-fixture';let runs=0;
 document.body.innerHTML=validationSurfaceHTML(r,4,{title:'Run recommendation',purpose:'Fixture',run:'<button data-native-run>Run checks</button>',findings:[]});
 document.querySelector('[data-native-run]').addEventListener('click',()=>runs++);
 mountValidationWorkspace(document.body,{nextStep:()=>validationNextStep({toFix:0,toConfirm:0,run:{current:false}},4)});
 assert.equal(nextOf().kind,'run');assert.equal(nextOf().text,'Record current checks');assert.equal(nextOf().url,null,'Record current checks is the native command, not a route');assert.equal(document.querySelector('[data-validation-workspace]').getAttribute('data-validation-next'),'','published on the root, empty');
 // rc41 close (C9): was `click('[data-native-run]');assert.equal(runs,1)` — a click on the very button that carried the counter,
 // which could not fail. The studio's button stands in the header's run slot, and mounting runs nothing; the delegation
 // itself is driven through the real shell below.
 assert.equal(document.querySelectorAll('.validation-run button, [data-native-run]').length,1,'one native Run checks');
 assert.equal(document.querySelectorAll('.validation-header .validation-run > [data-native-run]').length,1,'the studio\'s Run checks stands in the header\'s run slot');
 assert.equal(runs,0,'mounting the workspace and publishing the next task run nothing');
 assert.equal(commands,0,'Presentation interactions never save, approve or invent a handoff');
 // rc41 close (C9): the footer's Next task delegates "Record current checks" to the studio's own Run checks, once. The real
 // shell runs here (public/app.js: the aiw:next-task listener, footerNextHTML, and the click handler's `next` case, which
 // clicks `.validation-run button`) with the real Chapter 4 studio (logical-ui.js: its Run checks and its own check
 // command). Only the chapter's checks are a fixture: stale and clear, which the seed project never is, read through the
 // same validationNextStep the shell's Validate uses. The shell is loaded last: it keeps its document listeners.
 globalThis.fetch=async()=>new Response('null',{status:503});w.fetch=globalThis.fetch; // no server here: Sol's status reads 503
 history.replaceState(null,'','/?chapter=4&tab=validate');document.body.innerHTML='<div id="app"></div><div id="toast"></div>';
 const shellDoc=withFinalReview(seedProject());shellDoc.id='footer-run-fixture';const sent=[];
 const shellStore={value:{document:shellDoc,revision:1},status:'saved',command:async c=>{sent.push(c.type);return {document:shellDoc,revision:2};}};
 window.aiwProjectStore=shellStore;
 const {createLogicalStudio}=await import('./public/logical-ui.js');
 window.aiwLogicalStudio=createLogicalStudio(shellStore);window.aiwFoundationStudios={};
 await import('./public/app.js');await tick();
 const shellStage=document.querySelector('#studio-surface > .stage.tab-content');
 assert.ok(shellStage?.querySelector('[data-validation-workspace][data-bound="1"] .validation-run'),'the shell draws and mounts Chapter 4 Validate');
 assert.notEqual(document.querySelector('footer .workspace-next')?.dataset.nextKind,'run','the seed project\'s Chapter 4 checks hold items to confirm: the footer names them first');
 shellStage.innerHTML=window.aiwLogicalStudio.validation();
 mountValidationWorkspace(shellStage,{nextStep:()=>validationNextStep({toFix:0,toConfirm:0,run:{current:false}},4)});
 const footer=document.querySelector('footer .workspace-next');
 assert.equal(footer?.tagName,'BUTTON','the footer\'s Record current checks is a command, not a link');
 assert.equal(footer.dataset.action,'next');assert.equal(footer.dataset.nextKind,'run');assert.equal(footer.querySelector('#next-text')?.textContent,'Record current checks','in the readiness model\'s words');assert.equal(footer.hasAttribute('href'),false);
 const native=[...shellStage.querySelectorAll('.validation-run button')];
 assert.equal(native.length,1,'one native Run checks in the shell');assert.equal(native[0].dataset.lAction,'run-checks','the studio\'s own command');
 assert.ok(native[0]!==footer&&!footer.contains(native[0])&&!native[0].contains(footer),'the footer and the native button are two controls');
 let nativeRuns=0;native[0].addEventListener('click',()=>nativeRuns++);
 assert.deepEqual(sent,[],'drawing the shell and publishing the next task save nothing');
 footer.click();await tick();
 assert.equal(nativeRuns,1,'the footer\'s Record current checks runs the studio\'s Run checks, once');
 assert.deepEqual(sent,['logical.review'],'and the one command sent is the studio\'s own check record');
 console.log('PASS: C11 orthogonal severity/assessment and stale treatments; C1 warning gaps; scoped source/filter cause totals; real groups + reload persistence; domain recommendations/native check delegation (the shell footer\'s Record current checks runs the studio\'s Run checks once); same-tab inspection contract; no saved commands.');
}finally{await w.happyDOM.close();}
