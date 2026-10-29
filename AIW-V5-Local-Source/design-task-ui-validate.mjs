// DOM and Worker integration checks. No browser, layout engine or production data.
import assert from 'node:assert/strict';
const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
const ch=Number(process.env.AIW_CHAPTER||4),blank=process.env.AIW_BLANK==='1';
const w=new Window({url:`https://aiw.test/?chapter=${ch}&tab=work`,width:1440,height:900});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
w.document.body.innerHTML='<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
const {default:worker}=await import(pathToFileURL(root+'/worker.js'));
const {localDatabase}=await import(pathToFileURL(root+'/local-db.js'));
const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}};
globalThis.fetch=(path,options={})=>worker.fetch(new Request(new URL(path,'https://aiw.test'),{...options,headers:{...options.headers,'oai-authenticated-user-id':'ux-test',Origin:'https://aiw.test'}}),env);
const errors=[];w.addEventListener('error',e=>errors.push(e.message));
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);assert.ok(el,'Missing '+s);el.focus();el.click();return el};
const waitFor=async(fn,message)=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw Error(message+' '+q('.ip-error')?.textContent)};
if(blank){const created=await(await fetch('/api/projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Equipment reservations',template:'blank',brief:'Reserve shared equipment.'})})).json();const id=created.document.id;await fetch('/api/commands?project='+id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:1,command:{type:'artefact',payload:{type:'requirement',title:'Reserve equipment',description:'Reserve available equipment and retrieve its recorded outcome.',acceptance:'The same request reference returns the recorded reservation.',owner:'Equipment services',source:'Workshop notes'}}})});history.replaceState({},'',`https://aiw.test/?chapter=${ch}&tab=work&project=${id}`);}
await import(pathToFileURL(root+'/public/entry.js'));
const input=(selector,value)=>{const el=q(selector);assert.ok(el,'Missing '+selector);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));return el;};
const select=(selector,value)=>{const el=q(selector);assert.ok(el,'Missing '+selector);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));return el;};
const submit=selector=>{assert.ok(q(selector),'Missing '+selector);q(selector).dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));};
const ip=a=>click('[data-ip-action="'+a+'"]');
const store=w.aiwProjectStore,impact=w.aiwInterfaceImpact,initial=structuredClone(store.value.document);
const dirtyUnload=()=>{const event=new Event('beforeunload',{cancelable:true});w.dispatchEvent(event);return event.defaultPrevented;};
const openMind=()=>w.aiwLogicalStudio.assistant('mind');
const record=(p,id)=>[...p.logical.responsibilities,...p.realisation.components,...p.technology.capabilities,...p.technologyRealisation.records].find(r=>r.id===id);
const review=()=>{if(!q('.ip-dialog'))ip('details');};

const dc=a=>click('[data-dc-action="'+a+'"]');
const saved=()=>waitFor(()=>!w.aiwDesignTasks.busy,'Guided task save: '+q('.dc-error')?.textContent);
const answer=(key,value)=>input('[data-dc-answer="'+key+'"]',value);
const {designTasksReady,disposeDesignTasks}=await import('./public/workspace-ux.js');
assert.equal(w.aiwDesignTasks,undefined,'Opening the chapter does not create the guided task workspace');
const cancelled=designTasksReady();disposeDesignTasks();
await assert.rejects(cancelled,/context changed/);
assert.equal(w.aiwDesignTasks,undefined,'A disposed loader cannot create a late task workspace');
assert.equal(q('.dc-dialog'),null);
const originalProjectId=store.value.document.id,switched=designTasksReady();
store.value.document.id='synthetic-switched-project';
await assert.rejects(switched,/context changed/);
store.value.document.id=originalProjectId;
assert.equal(w.aiwDesignTasks,undefined,'A project change cancels the pending workspace before it opens');
assert.equal(store.value.document.coauthoring?.designTasks?.length||0,0,'Loading and cancellation cannot create a task');
// Guided design starts from the Sol panel's "Develop the connected design" (brain-context-ui.js), which calls
// startFrom for the chosen requirement; resuming opens the saved task.
const firstRequirement=()=>store.value.document.artefacts.find(a=>a.type==='requirement').id;
const develop=async()=>{const tasks=await designTasksReady();await tasks.startFrom(firstRequirement());await saved();};
const resume=()=>w.aiwDesignTasks.openTask(store.value.document.coauthoring.designTasks.filter(t=>!t.kind).at(-1).id);
await develop();assert.ok(q('.dc-dialog'));assert.equal(qa('dialog[open]').length,1);assert.ok(store.value.document.coauthoring.designTasks.length===1);assert.ok(q('[data-dc-answer="boundary"]'));
// A source review preserves the semantics of a non-quality driver even if an
// old captured record happens to contain irrelevant numerical fields.
{
 const task=store.value.document.coauthoring.designTasks[0],basis=task.basis;
 task.basis={...basis,drivers:[...basis.drivers,{id:'SYN-OPS',kind:'operational',title:'Retain on-call ownership',description:'An operator must own the recovery procedure.',impact:'The design must name the recovery escalation.',metric:'Do not show numeric operating target',targetValue:'987654321'}]};
 dc('close');resume();
 assert.match(q('.dc-reading').textContent,/Architecture drivers/);assert.match(q('.dc-reading').textContent,/An operator must own the recovery procedure/);assert.match(q('.dc-reading').textContent,/The design must name the recovery escalation/);
 assert.doesNotMatch(q('.dc-reading').textContent,/987654321|Do not show numeric operating target/);
 dc('close');task.basis=basis;resume();
}

answer('boundary','Own validation and safe acceptance.');answer('exclusions','Exclude posting and customer notification.');
dc('close');assert.ok(q('.dc-leave'));dc('stay');assert.equal(q('[data-dc-answer="boundary"]').value,'Own validation and safe acceptance.');
dc('answer');assert.ok(q('[data-dc-action="answer"]').disabled);await saved();
assert.equal(store.value.document.coauthoring.designTasks[0].answers.boundary,'Own validation and safe acceptance.');
dc('close');await store.load();resume();assert.ok(q('[data-dc-answer="information"]'),'Resume at next missing question');
answer('information','The authoritative instruction register records state; consumers only read the outcome.');answer('failure','Keep an uncertain instruction pending, reconcile before a repeat.');select('[data-dc-answer="interaction"]','event');dc('answer');await saved();
answer('owner','Application team');dc('answer');await saved();
select('[data-dc-answer="category"]','compute');select('[data-dc-answer="boundaryId"]','');answer('support','Execute the recorded acceptance boundary.');answer('trustName','Acceptance environment');answer('trustPolicy','Only authenticated requests enter the boundary.');dc('answer');await saved();
answer('operations','Accountable on-call response, traced outcomes and reviewed restoration.');answer('unknowns','Measure recovery expectations with operations.');dc('answer');await saved();
// The comparison stage is titled Co-design, the entry that replaced Proposals (audit/co-design-2026-10-13.json).
assert.ok(q('.dc-approaches'));assert.equal(store.value.document.modelAlternatives.records.length,2);assert.equal(record(store.value.document,'api')?.boundary,record(initial,'api')?.boundary);assert.equal(q('#dc-title').textContent,'Co-design');
click('[data-dc-action="choose"][data-approach="separate"]');assert.ok(q('[data-dc-slot]'));select('[data-dc-slot]','coordination');input('[data-dc-record="title"]','Coordinate the recorded instruction');
input('[data-dc-meta="rationale"]','A separate coordinator localises uncertain-outcome recovery while preserving the existing acceptance component.');dc('preview');await saved();
assert.ok(q('.ip-dialog'),q('.dc-error')?.textContent);assert.equal(qa('dialog[open]').length,1);assert.equal(qa('[data-ip-change] option').length,7);assert.equal(q('[data-ip-action="add"]'),null);assert.equal(record(store.value.document,'api')?.boundary,record(initial,'api')?.boundary);
// Shape a new ghost through the same Sol task; it must not use a saved-record editor.
select('[data-ip-change]',[...q('[data-ip-change]').options].find(o=>o.textContent.includes('Coordinate the recorded instruction')).value);disposeDesignTasks();ip('edit');await waitFor(()=>q('.dc-dialog'),'The saved proposal did not load its native design task');assert.ok(q('.dc-dialog'));assert.equal(qa('dialog[open]').length,1);select('[data-dc-slot]','coordination');assert.equal(q('[data-dc-record="title"]').value,'Coordinate the recorded instruction');input('[data-dc-record="boundary"]','Own uncertainty resolution; never repeat an effect without authoritative confirmation.');dc('preview');await saved();assert.ok(q('.ip-dialog'));
ip('review');ip('apply');assert.ok(q('.ip-error').textContent.includes('Confirm'));input('[data-ip-input="reviewer"]','Design QA');input('[data-ip-input="reason"]','The isolated coordinator owns uncertainty and the operating obligations are explicit.');q('[data-ip-confirm]').checked=true;ip('apply');await waitFor(()=>!impact.pending&&!impact.busy,'Accept guided proposal');
let task=store.value.document.coauthoring.designTasks[0];assert.equal(task.status,'applied');assert.ok(task.applied.records.some(r=>r.isNew));assert.equal(task.applied.records.some(r=>!r.isNew),!blank);assert.ok(task.applied.changeIds.length>0);
const originalAdoption=JSON.stringify(task.applied),originalBasis=JSON.stringify(task.basis),adoptedRecords=JSON.stringify(task.applied.records.map(r=>record(store.value.document,r.id)));
w.aiwDesignTasks.openTask(task.id);
if(!blank){
 // ADR-003 is attached to the new coordinator responsibility. Its QD-004 driver
 // becomes positively applicable only after this adoption, so it needs a review.
 assert(q('.dc-source-diff'),'The newly applicable obligation requires source review');
 assert(!task.basis.drivers.some(d=>d.id==='QD-004'),'The original basis did not contain the new obligation');
 assert.match(q('.dc-source-diff').textContent,/QD-004.*Resolve uncertainty without unsafe retries/);
 input('[data-dc-source="reviewer"]','Design QA');
 input('[data-dc-source="reason"]','Reviewed QD-004 introduced by ADR-003 on the new coordination responsibility. The adopted coordinator owns uncertainty resolution; its investigation target still needs operational verification.');
 q('[data-dc-confirm]').checked=true;dc('source-review');await saved();
 task=store.value.document.coauthoring.designTasks[0];
 assert(task.sourceReview.basis.drivers.some(d=>d.id==='QD-004'));
 assert.equal(JSON.stringify(task.applied),originalAdoption,'Source review retains the original adoption receipt');
 assert.equal(JSON.stringify(task.basis),originalBasis,'Source review retains the captured original basis');
 assert.equal(JSON.stringify(task.applied.records.map(r=>record(store.value.document,r.id))),adoptedRecords,'Source review does not reapply or rewrite accepted records');
}
assert.ok(q('.dc-record-trail'),q('dialog[open]')?.textContent);assert.ok(q('.dc-dialog').textContent.includes('Design QA'));dc('native');assert.ok(q('.logical-dialog'));assert.equal(q('.dc-dialog'),null);click('.logical-dialog header button');assert.equal(qa('dialog[open]').length,0);
await store.load();resume();assert.ok(q('.dc-record-trail'));dc('close');
// Saved provenance remains usable without instantiating the task at startup.
const {designRecordContext,designRecordExplanation}=await import('./public/knowledge-ui.js');
const appliedTask=store.value.document.coauthoring.designTasks.find(t=>t.status==='applied'),appliedId=appliedTask.applied.records[0].id;
const projection=designRecordContext(store.value.document,appliedId),explanation=designRecordExplanation(store.value.document,appliedId),beforeReload=JSON.stringify(store.value.document);
assert.match(projection,/Open source & reasoning/);assert.match(explanation,new RegExp(appliedTask.id));
disposeDesignTasks();assert.equal(w.aiwDesignTasks,undefined);
const provenance=document.createElement('section');provenance.innerHTML=projection;document.body.append(provenance);
provenance.querySelector('[data-dc-action="open-task"]').click();
await waitFor(()=>q('.dc-record-trail'),'Saved reasoning did not load the native task');
assert.equal(qa('dialog[open]').length,1);assert.equal(JSON.stringify(store.value.document),beforeReload,'Opening saved reasoning is read-only');
dc('close');provenance.remove();
// A conflicting task save preserves local input and cannot overwrite another author's answers.
await develop();const concurrentTask=store.value.document.coauthoring.designTasks.at(-1);answer('boundary','Unsaved boundary must remain available.');
const concurrentResponse=await fetch('/api/commands?project='+store.value.document.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:store.value.revision,command:{type:'design.answers',payload:{id:concurrentTask.id,taskRevision:concurrentTask.revision,answers:{owner:'Concurrent owner'}}}})});assert.equal(concurrentResponse.status,200);dc('answer');await saved();assert.ok(q('[data-dc-action="reload"]'));assert.equal(q('[data-dc-answer="boundary"]').value,'Unsaved boundary must remain available.');dc('reload');await saved();assert.ok(q('[data-dc-action="current-task"]'));const currentRevision=store.value.revision;dc('answer');await saved();assert.equal(store.value.revision,currentRevision);assert.equal(store.value.document.coauthoring.designTasks.at(-1).answers.owner,'Concurrent owner');dc('current-task');assert.ok(q('.dc-leave'));dc('discard');assert.equal(q('[data-dc-answer="boundary"]').value,'');dc('close');
// Sol's draft answers are marked as drafts until the person edits them (round 2, I2-13). The draft record is
// placed on the open task in memory, as the adopt command writes it (intelligence-context.js: fields of
// {field, value, edited:false}), so only the form's marking is under test here.
{
  if(q('[data-dc-action="close"]')){dc('close');if(q('.dc-leave'))dc('leave');}
  const drafted=store.value.document.coauthoring.designTasks.filter(t=>!t.kind).at(-1);
  drafted.answers={...drafted.answers,boundary:'Sol: own acceptance and validation only.',exclusions:'Sol: exclude posting.'};
  drafted.assistedDrafts=[{at:'2026-10-01T00:00:00Z',runId:'RUN-TEST',fields:[{field:'boundary',value:'Sol: own acceptance and validation only.',edited:false},{field:'exclusions',value:'An earlier draft the person already replaced.',edited:false}],authority:'test'}];
  w.aiwDesignTasks.openTask(drafted.id);
  if(!q('[data-dc-answer="boundary"]'))dc('questions');
  assert.equal(q('[data-dc-draft="boundary"]')?.textContent,'Sol draft · not edited','a drafted, unedited answer is marked');
  assert.ok(q('[data-dc-draft="boundary"]').closest('label').querySelector('[data-dc-answer="boundary"]'),'the mark sits in the field\'s own label');
  assert.equal(q('[data-dc-draft="exclusions"]'),null,'an answer that no longer holds the drafted value is not marked');
  answer('boundary','Own acceptance and validation; the architect reworded the draft.');
  assert.equal(q('[data-dc-draft="boundary"]'),null,'editing the field removes its mark');
}
// The rail keeps its three navigation sections, Design resources among them since round 18
// (audit/round18/ROUND18-RELEASE.md); the Model picture's layers join them on the Model tab this flow ends on.
if(blank)assert.doesNotMatch(JSON.stringify(store.value.document.modelAlternatives),/bank|payment|ledger|agency/i);assert.deepEqual(errors,[]);assert.equal(document.body.dataset.workspaceTab,'model');assert.deepEqual(qa('.journey-rail>section').map(s=>s.getAttribute('aria-label')),['Project','Architecture journey','Design resources','Model layers']);assert.equal(qa('.ev-launcher,.lens-position-controls').length,0);
console.log('PASS Guided design UI (Chapter '+ch+', '+(blank?'blank equipment project':'Bank reference')+'): lazy first open, disposal/project cancellation and saved provenance reload; kind-aware source review and retained adoption after new positive scope; native Sol adoption and restoration; required questions; partial save/reload/resume; two alternatives; existing-object reuse; new ghost editing; shared impact acceptance; durable reasoning; no nested dialogs; refined navigation retained.');
await w.happyDOM.close();process.exit(0);
