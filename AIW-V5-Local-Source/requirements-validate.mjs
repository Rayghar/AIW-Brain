import assert from 'node:assert/strict';
import {seedProject,applyCommand,findings,milestones,exportMarkdown,proposals,guidance,PROCESS_KINDS,processKind} from './public/requirements-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
const files=new Map();
const FILES={async put(key,value){files.set(key,value)},async get(key){return files.has(key)?{text:async()=>files.get(key)}:null},async delete(key){files.delete(key)}};
const DB=localDatabase(':memory:'),env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const request=async(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{
  const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}
  const r=await worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,body:await r.json()};
};
try{
  assert.equal((await request('/api/project','GET',null,null)).status,401);
  let loaded=await request('/api/project');assert.equal(loaded.status,200);let state=loaded.body;
  assert.equal(state.document.artefacts.filter(a=>a.type==='requirement').length,5);
  assert.equal(milestones(state.document).filter(m=>m.done).length,0);
  const send=async(type,payload)=>{const result=await request('/api/commands','POST',{revision:state.revision,command:{type,payload}});if(result.status===200)state=result.body;return result};
  assert.equal((await request('/api/commands','POST',{revision:1,command:{type:'review'}},'architect-a','https://elsewhere.test')).status,403);
  const created=await send('artefact',{type:'requirement',title:'Test a status enquiry',description:'The service shall expose the current status for an authorised request reference.',owner:'Payments owner',source:'Architecture workshop',priority:'Must',acceptance:'Given an existing reference, when an authorised user enquires, then the current recorded status is returned.',confirmed:true});
  assert.equal(created.status,200);const id=state.selected;assert.equal(id,'REQ-006');
  await send('relationship',{from:'JRN-004',to:id,kind:'requires'});await send('relationship',{from:id,to:'OUT-001',kind:'delivers'});
  const record=state.document.artefacts.find(a=>a.id===id);await send('artefact',{...record,title:'Enquire using the original reference',confirmed:false});assert.equal(state.selected,id);assert.equal(state.document.artefacts.find(a=>a.id===id).confirmed,false);
  assert.equal((await send('relationship',{from:id,to:'MISSING',kind:'delivers'})).status,400);
  assert.equal((await send('relationship',{from:id,to:id,kind:'delivers'})).status,400);
  assert.equal((await send('relationship',{from:id,to:'OUT-001',kind:'delivers'})).status,400);
  const before=state.revision;const old=await request('/api/commands','POST',{revision:1,command:{type:'review'}});assert.equal(old.status,409);assert.equal((await request('/api/project')).body.revision,before);
  await send('review',{});assert.equal(state.document.review.contentVersion,state.document.contentVersion);
  assert.equal((await send('handoff',{})).status,400);await send('handoff',{acknowledge:true});assert.equal(state.document.handoff.contentVersion,state.document.contentVersion);
  await send('artefact',{...state.document.artefacts.find(a=>a.id===id),description:'A revised status enquiry description.'});assert.equal(state.document.review,null);assert.equal(state.document.handoff,null);
  const reopened=(await request('/api/project')).body;assert.equal(reopened.document.artefacts.find(a=>a.id===id).description,'A revised status enquiry description.');
  assert.equal((await request('/api/project','GET',null,'architect-b')).body.document.artefacts.some(a=>a.id===id),false);
  // Round 12 (GR-GOV-24): a record leaves only through the one retire path, with why, who and when, and can be restored;
  // deleting it outright is refused, and so is retiring it while its links stand. Its links go first, each an edit.
  const deleted=await send('deleteArtefact',{id});assert.equal(deleted.status,400);assert.match(deleted.body.error,/leaves the design through Retire/);
  assert.match((await send('record.retire',{ids:[id],chapter:1,reason:'Folded into the status enquiry.'})).body.error,/is still named by Chapter 1/);
  for(const l of state.document.relationships.filter(r=>r.from===id||r.to===id))assert.equal((await send('deleteRelationship',{id:l.id})).status,200);
  assert.equal((await send('record.retire',{ids:[id],chapter:1,reason:'Folded into the status enquiry.'})).status,200);
  assert(!state.document.relationships.some(r=>r.from===id||r.to===id));assert(!state.document.artefacts.some(a=>a.id===id));
  assert.deepEqual(['reason','actor'].map(k=>state.document.retired.records.find(x=>x.id===id)[k]),['Folded into the status enquiry.','architect-a']);
  await send('artefact',{type:'requirement',title:'Accept a traceable payment instruction'});assert.equal(state.selected,'REQ-007');assert(findings(state.document).some(f=>f.code==='duplicate'));
  const p=seedProject();p.relationships.push({id:'BROKEN',from:'MISSING',to:'REQ-001',kind:'supports'});assert(findings(p).some(f=>f.code==='broken-link'));
  let ready=applyCommand(seedProject(),{type:'brief',payload:{problem:'A verified problem',goal:'A verified outcome',source:'Workshop record',confirmed:true}}).document;
  for(const a of [...ready.artefacts]){ready=applyCommand(ready,{type:'artefact',payload:{...a,title:a.id==='REQ-005'?'Notify the customer of the recorded outcome':a.title,description:a.id==='REQ-005'?'The service shall expose the recorded payment outcome to the customer.':a.description,acceptance:a.type==='requirement'?(a.acceptance||'Given a recorded outcome, when the customer enquires, then the recorded status and payment reference are returned.'):'',confirmed:true}}).document;}
  assert.deepEqual(findings(ready),[]);ready=applyCommand(ready,{type:'review'}).document;ready=applyCommand(ready,{type:'handoff'}).document;assert(milestones(ready).every(m=>m.done));
  const duplicateContext=applyCommand(ready,{type:'artefact',payload:{...ready.artefacts.find(a=>a.type==='outcome'),id:undefined}}).document;assert(!milestones(duplicateContext).find(m=>m.id==='context').done,'Confirmed duplicate context must not count as ready');
  const snapshot=JSON.stringify(ready);proposals(ready,ready.artefacts[0]);assert.equal(JSON.stringify(ready),snapshot,'Ghost previews must not mutate the project');
  const incomplete=seedProject();incomplete.artefacts=incomplete.artefacts.filter(a=>!['constraint','assumption'].includes(a.type));
  const missing=findings(incomplete).filter(f=>f.code==='missing-type');assert.equal(new Set(missing.map(f=>f.id)).size,2);assert.deepEqual(missing.map(f=>f.artefactType),['constraint','assumption'],'Each missing category must identify its own creation target');
  assert.equal(findings(incomplete).find(f=>f.code==='broken-link').relationshipId,'REL-008','Broken links need a repair target');
  const unreviewed=seedProject(),notify=unreviewed.artefacts.find(a=>a.id==='REQ-005');
  assert.equal(guidance(unreviewed,notify,'model').attention,'Describe the starting condition, action, and observable expected result.','A concrete acceptance gap takes priority over confirmation');
  assert.notEqual(guidance(unreviewed,null,'work').heading,guidance(unreviewed,null,'model').heading);assert.notEqual(guidance(unreviewed,null,'validate').next,guidance(unreviewed,null,'output').next);
  const ghost=proposals(unreviewed,notify,'validate').find(p=>p.id==='acceptance');assert.notEqual(ghost.record.title,notify.title);assert.equal(notify.acceptance,'');
  const contextGhost=proposals(unreviewed,unreviewed.artefacts.find(a=>a.id==='CON-001'),'model')[0];assert.equal(contextGhost.record.type,'assumption');assert.deepEqual(contextGhost.links,[['new','informs','CON-001']]);
  const applied=applyCommand(unreviewed,{type:'artefact',payload:{...contextGhost.record,origin:'suggestion',links:contextGhost.links}}).document;assert(!proposals(applied,applied.artefacts.find(a=>a.id==='CON-001'),'model').some(p=>p.id==='context-evidence'),'Do not repeatedly suggest an existing artefact');
  // GR-INT-18 (round 23): a statement equal to its title prints once in the Chapter 1 export, under its heading.
  {const same='Record each ledger posting with balanced entries',q=applyCommand(seedProject(),{type:'artefact',payload:{type:'requirement',title:same,description:same,owner:'Ops',source:'Synthetic',priority:'Must',acceptance:'Given, when, then.'}}).document;
   assert.equal((exportMarkdown(q).match(new RegExp(same,'g'))||[]).length,1,'the statement equal to its title prints once');}
  const md=exportMarkdown(ready);assert(md.includes('REQ-005'));assert(md.includes('Acceptance criteria'));assert(md.includes('REL-001'));assert(md.includes('Chapter 2 handoff'));
  const jsonExport=await worker.fetch(new Request('https://aiw.test/api/export?format=json',{headers:{'oai-authenticated-user-id':'architect-a'}}),env);assert.equal(jsonExport.status,200);assert(jsonExport.headers.get('Content-Disposition').includes('.json'));const bundle=await jsonExport.json();assert.equal(bundle.project.id,'bank-payment');assert(Array.isArray(bundle.validation.findings));
  const mdExport=await worker.fetch(new Request('https://aiw.test/api/export?format=md',{headers:{'oai-authenticated-user-id':'architect-a'}}),env);assert.equal(mdExport.status,200);assert(mdExport.headers.get('Content-Disposition').includes('.md'));assert((await mdExport.text()).includes('REQ-007'));
  const unavailable=await worker.fetch(new Request('https://aiw.test/api/project',{headers:{'oai-authenticated-user-id':'x'}}),{});assert.equal(unavailable.status,503);
  console.log('PASS Private authentication and owner isolation; durable create/edit/reopen; stable and non-reused IDs; explicit confirmation; duplicate and broken-link findings; invalid endpoints rejected; concurrent edits protected; handoff and invalidation; complete milestone progression; ghost non-mutation; JSON/Markdown content; storage failure states.');
}finally{DB.close()}

// The Chapter 1 studio through the one shell's contract (round 3, A). It is created from its factory with a store
// double (the real Worker and an in-memory database behind a recording command()), its surfaces are drawn as the
// shell draws them, its editors open in the shell's dialog host through bind() in a happy-dom document and save only
// through the store's commands, and dispose() takes every listener away. Needs happy-dom (a pinned dev dependency).
{
  const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
  const {pathToFileURL,fileURLToPath}=await import('node:url');
  const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
  const w=new Window({url:'https://aiw.test/?chapter=1&tab=work',width:1440,height:900});
  for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','KeyboardEvent','MouseEvent','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
  for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
  if(typeof globalThis.CSS==='undefined')globalThis.CSS={escape:v=>String(v).replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c)};
  w.document.body.innerHTML='<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
  const db=localDatabase(':memory:'),domEnv={DB:db,FILES,ASSETS:{fetch:()=>new Response('asset')}};
  globalThis.fetch=(path,options={})=>worker.fetch(new Request(new URL(path,'https://aiw.test'),{...options,headers:{...options.headers,'oai-authenticated-user-id':'studio-test',Origin:'https://aiw.test'}}),domEnv);
  try{
    const call=async(path,body)=>{const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'Refused'),{conflict:r.status===409});return d;};
    let value=await call('/api/project');const commands=[];
    const store={get value(){return value},async load(){value=await call('/api/project');return value},async command(command){commands.push(command);value=await call('/api/commands',{revision:value.revision,command});return value}};
    const {createRequirementsStudio}=await import(pathToFileURL(root+'/public/requirements.js'));
    const studio=createRequirementsStudio(store),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
    // Before it is bound the studio draws from the saved project alone.
    const p=value.document,graph=studio.graph();
    assert.deepEqual(studio.milestones().map(m=>m.id),milestones(p).map(m=>m.id),'readiness is the chapter\'s own milestones');
    assert.equal(graph.nodes[0].id,'project');assert.equal(graph.nodes.length,p.artefacts.length+1);assert.ok(graph.nodes.every(n=>n.layer==='process'&&typeof n.title==='string'),'every record sits on the Process layer');
    assert.equal(graph.edges.length,p.relationships.length);
    assert.match(studio.work(),/data-r-action="edit-brief"/);assert.match(studio.validation(),/<h2>Make the requirements defensible<\/h2>/);assert.match(studio.output(),/<h2>A brief you can build from<\/h2>/);assert.ok(!/data-r-action="export-(?:json|md)"/.test(studio.output()),'the Output tab offers no export button of its own: the documents list is the frame\'s (output-documents.js, round 26 D-26-13)');
    const emptyDetails=studio.inspector({id:'project'});
    assert.match(emptyDetails,/class="record-guidance"[\s\S]*Select a record to inspect its details, sources and relationships/,'with nothing selected the shared inspector explains how to inspect a record');
    assert.doesNotMatch(emptyDetails,/data-record-card=/,'chapter guidance does not silently select the first record');
    assert.match(studio.assistance(),/class="r-assistant-bar"[\s\S]*data-r-action="sol"[\s\S]*data-r-action="mind"[\s\S]*data-action="cursor"/,'Sol, Proposals and the shell\'s hover switch');
    assert.doesNotMatch(studio.work()+studio.assistance(),/r-topbar|r-sidebar|r-tabs|r-footer|r-side-progress/,'no topbar, sidebar, tab bar, readiness widget or footer of its own');
    // The shell's side of the contract: state, a render that draws the studio, selection, tabs, chapters and the toast.
    const shell={renders:0,toasts:[],chapters:[]},state={chapter:1,tab:'work',selected:'project',cursor:true};
    const draw=()=>{q('#app').innerHTML=`${studio.assistance()}<section class="studio"><div class="stage tab-content">${state.tab==='work'?studio.work():state.tab==='validate'?studio.validation():studio.output()}</div><aside id="inspector">${studio.inspector({id:state.selected})}</aside></section><div id="dialog-host"></div>`;};
    const bridge={state,render(){shell.renders++;draw()},toast(m){shell.toasts.push(m)},selectNode(id){state.selected=id;draw()},setTab(tab){state.tab=tab;draw()},setChapter(n,o){shell.chapters.push([n,o])},route(){},persist(){}};
    studio.bind(bridge);draw();
    assert.equal(typeof window.aiwRequirementsPage?.edit,'function','the Chapter 1 models edit through the studio');
    // The shared record card supplies chapter guidance until the person chooses a record. The reference note
    // shows once per project per viewer on Work, is dismissed with "Got it" and remembered in this browser.
    assert.equal(qa('#inspector .record-guidance').length,1,'the studio renders one shared guidance card');
    assert.equal(state.selected,'project','binding the chapter does not select a saved record');
    assert.equal(qa('#inspector [data-record-card]').length,0,'no saved record is shown as the selection');
    assert.doesNotMatch(q('#inspector').textContent,/Chapter 01 \//,'no chapter-and-tab kicker above the guidance');
    assert.equal(q('#inspector .record-guidance h2'),null,'the empty hint does not repeat the shell chapter heading');
    assert.equal(q('#inspector .record-guidance a'),null,'the empty hint does not repeat chapter navigation');
    assert.equal(qa('.r-reference-note').length,1,'the reference note shows once');
    assert.equal(localStorage.getItem('aiw.note.reference.bank-payment'),null);
    q('.r-reference-note [data-r-action="dismiss-reference-note"]').click();
    assert.equal(localStorage.getItem('aiw.note.reference.bank-payment'),'1','Got it is remembered per project per viewer');
    assert.equal(qa('.r-reference-note').length,0,'and the note is gone');
    localStorage.removeItem('aiw.note.reference.bank-payment');state.tab='validate';draw();assert.equal(qa('.r-reference-note').length,0,'the note is on Work only');
    state.tab='work';draw();assert.equal(qa('.r-reference-note').length,1,'forgotten, it shows again');q('.r-reference-note [data-r-action="dismiss-reference-note"]').click();
    const submit=form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const settle=async(fn,message)=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out: '+message);};
    // The brief: the editor opens in the shell's dialog host, the change is reviewed inside it, the brief command is
    // sent, and focus returns to the control that opened it.
    q('[data-r-action="edit-brief"]').focus();q('[data-r-action="edit-brief"]').click();
    assert.ok(q('dialog.r-dialog[open] #r-brief-form'),'the brief editor opens through the shared dialog');
    const brief=q('#r-brief-form');brief.elements.problem.value='Payments need one traceable outcome.';brief.elements.problem.dispatchEvent(new Event('input',{bubbles:true}));submit(brief);
    await settle(()=>q('dialog[open] [data-dialog-review] [data-reviewed]'),'the change review inside the editor');
    assert.equal(qa('dialog').length,1,'the review sits inside the editor, not on top of it');
    q('[data-dialog-review] [data-reviewed]').checked=true;const reason=q('[data-dialog-review] [name="reason"]');if(reason)reason.value='Sharpen the problem statement.';
    q('[data-dialog-review] [data-wb-action="apply-preview"]').click();
    await settle(()=>!q('dialog'),'the editor closes once saved');
    assert.equal(commands.at(-1).type,'workspace.apply');assert.equal(commands.at(-1).payload.commands[0].type,'brief');assert.equal(value.document.brief.problem,'Payments need one traceable outcome.','saved through the brief command');
    assert.equal(shell.toasts.at(-1),'Project brief saved.');assert.equal(document.activeElement?.dataset.rAction,'edit-brief','focus returns to what opened the editor');
    // A requirement: Add opens one editor, named for what it adds, and the saved record becomes the shell's selection.
    q('[data-r-section="requirement"]').click();assert.ok(q('#r-record-list .r-record'),'the register is drawn');
    q('.work-task-head [data-r-action="add"]').click();assert.equal(q('#r-dialog-title').textContent,'Add a functional requirement');
    q('.work-task-head [data-r-action="add"]')?.click();assert.equal(qa('dialog').length,1,'one dialog at a time');
    // happy-dom reads a <select>'s value from the wrong option when other options carry a blank attribute slot, so the
    // type is chosen explicitly, as a person (or Playwright's selectOption) would; the title follows the type.
    const form=q('#r-artefact-form'),pick=type=>{form.elements.type.value=type;form.elements.type.dispatchEvent(new Event('change',{bubbles:true}));};
    pick('assumption');assert.equal(q('#r-dialog-title').textContent,'Add an assumption','the title follows the type');pick('requirement');
    form.elements.title.value='Show the settlement status to the customer';form.elements.title.dispatchEvent(new Event('input',{bubbles:true}));submit(form);
    await settle(()=>!q('dialog'),'the new requirement is saved');
    const added=value.document.artefacts.find(a=>a.title==='Show the settlement status to the customer');
    assert.ok(added&&added.type==='requirement'&&commands.at(-1).type==='artefact','saved through the artefact command');
    assert.equal(state.selected,added.id,'the saved record is the shell\'s selection');assert.match(q('#inspector').textContent,new RegExp(added.id));
    // A record chosen on the surface goes through the shell's selection; unsaved input is not lost to Escape.
    q(`[data-r-select="${p.artefacts.find(a=>a.type==='requirement').id}"]`).click();assert.equal(state.selected,p.artefacts.find(a=>a.type==='requirement').id);
    q(`[data-r-edit="${state.selected}"]`).click();const edit=q('#r-artefact-form');edit.elements.title.value+=' (draft)';edit.elements.title.dispatchEvent(new Event('input',{bubbles:true}));
    q('dialog.r-dialog').dispatchEvent(new Event('cancel',{cancelable:true}));assert.equal(q('#r-discard').hidden,false,'Escape asks before discarding');
    q('[data-r-action="discard"]').click();assert.ok(!q('dialog'));
    // Checks are recorded through the review command, and carrying the requirements forward opens Chapter 2 in place,
    // on its Work tab, through the shell (no document navigation).
    state.tab='validate';draw();q('[data-r-action="validate"]').click();
    await settle(()=>value.document.review?.contentVersion===value.document.contentVersion,'checks recorded for the revision');
    assert.equal(commands.at(-1).type,'review');
    state.tab='output';draw();q('[data-r-action="handoff"]').click();
    const handoff=q('#r-handoff-form');assert.ok(handoff,'the handoff editor opens');if(handoff.elements.acknowledge)handoff.elements.acknowledge.checked=true;submit(handoff);
    await settle(()=>shell.chapters.length,'the handoff moves to Chapter 2');
    assert.equal(commands.at(-1).type,'handoff');assert.deepEqual(shell.chapters.at(-1),[2,{keepTab:true}]);assert.equal(state.tab,'work','Chapter 2 opens on Work');
    assert.equal(location.href,'https://aiw.test/?chapter=1&tab=work','the studio itself never navigates the document');
    studio.dispose();
    assert.equal(window.aiwRequirementsPage,undefined,'the models\' bridge goes with the studio');
    const before=commands.length;q('[data-r-action="edit-brief"]')?.click();q('[data-r-section="context"]')?.click();
    assert.ok(!q('dialog')&&commands.length===before,'after dispose() no listener of the studio answers');
    studio.bind(bridge);draw();q('[data-r-section="brief"]').click();q('[data-r-action="edit-brief"]').click();assert.ok(q('#r-brief-form'),'bound again, it answers again');q('[data-r-action="close-dialog"]').click();studio.dispose();
    console.log('PASS Chapter 1 studio through the shell contract: surfaces as HTML for the shell\'s stage, details and assistance bar, graph on the Process layer, milestones as readiness; editors in the shell\'s dialog host, one at a time, saved only through store commands with the review inside the editor, focus returned; the saved record becomes the shell\'s selection; the handoff opens Chapter 2 through the shell; dispose() removes every listener and the models\' bridge.');
  }finally{db.close();await w.happyDOM.close();}
}

// Round 12 (D-03, D-09, D-15): requirement groups and their readers, the faithful intake's pure parts, confirming at
// scale, a reason for missing evidence, the import's proposals, the checks read per cause and a companion that names a
// handful. Through the worker where a command is involved, in memory where a rule is.
{
  const {GROUP_LIMITS,requirementGroups,groupMembers,groupsOf,groupSummary,groupsMarkdown,requirementAttribute}=await import('./public/requirement-groups.js');
  const {applyRequirementsCommand,selectRequirements,findingCauses,journalBase,groupLinks}=await import('./public/requirement-commands.js');
  const {suggestMapping,priorityFor,titleOf,projectedRequirement,ASSESSMENT_FIELDS,mapWorkbookRows,previewIntake,applyIntake,sameMapping}=await import('./public/intake-domain.js');
  const {openWorkbook}=await import('./public/workbook-reader.js');
  const {defaultPriorityMap,bandRank,cleanPriorityMap}=await import('./public/intake-proposals.js');
  const {markupIn,applyAssuranceCommand}=await import('./public/assurance-domain.js');
  const {storySource,storyInsights}=await import('./public/story-model.js');
  const {localFiles}=await import('./local-files.js');
  const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');
  const {syntheticWorkbook}=await import('./scripts/synthetic-workbook.mjs');
  const throwsLike=(fn,re,label)=>assert.throws(fn,e=>re.test(e.message),label);

  // 1. The mapping: the most specific alias wins and a column serves one field, whatever the column order.
  const headers=(...labels)=>labels.map((label,i)=>({column:String.fromCharCode(65+i),label}));
  let m=suggestMapping(headers('Baseline_ID','Module / Theme','Requirement_Statement','Capability_Theme','User_Group','Source_Authority','PGL_Linked'));
  assert.deepEqual([m.externalId,m.module,m.description,m.capability,m.userGroup,m.sourceAuthority,m.pglLinked],['A','B','C','D','E','F','G']);
  m=suggestMapping(headers('Capability_Theme','Module / Theme','ID','Statement'));assert.equal(m.capability,'A');assert.equal(m.module,'B');
  m=suggestMapping(headers('ID','Statement','Module / Theme'));assert.equal(m.capability,'',  'a module column alone is the module, not the capability');assert.equal(m.module,'C');
  // The band: the strongest level found is Must, the next Should, the rest Could; delivered is Could; a band AIW cannot
  // order is not stated (''), as a row with no band is (round 12, GR-INT-19: it was Must, which read as a stated priority).
  const map=vs=>defaultPriorityMap(vs.map(value=>({value})));
  assert.deepEqual(map(['Critical','High','Medium','Watch','Delivered']),{Critical:'Must',High:'Should',Medium:'Could',Watch:'Could',Delivered:'Could'});
  assert.deepEqual(map(['High','Medium','Low']),{High:'Must',Medium:'Should',Low:'Could'});
  assert.deepEqual(map(['Must','Should','Could',"Won't"]),{Must:'Must',Should:'Should',Could:'Could',"Won't":'Could'});
  assert.deepEqual(map(['1','2','3']),{1:'Must',2:'Should',3:'Could'});
  assert.deepEqual(map(['Gold','Silver']),{Gold:'',Silver:''},'a band AIW does not recognise is not stated: AIW cannot tell its order (round 12, GR-INT-19)');
  assert.equal(bandRank('Not delivered'),null,'a band that says not delivered is not read as done');assert.equal(bandRank('Delivered / no current gap'),0);
  assert.equal(priorityFor('critical',{Critical:'Must'}),'Must');assert.equal(priorityFor('',{'':'Could'}),'','no band is not stated, whatever the map says');assert.equal(priorityFor('Other',{Critical:'Should'}),'','a band the map does not name is not stated');
  assert.equal(priorityFor('Gold',{Gold:''}),'','a band the person left not stated stays so');assert.deepEqual(cleanPriorityMap({Gold:'',Silver:'Must',Bronze:'Maybe'}),{Gold:'',Silver:'Must'},'not stated is a choice a saved band map keeps');
  const long='The system shall keep a complete record of every change to a customer limit, including the previous and the new value, the person who made it and the time it was made.';
  assert.equal(titleOf('Short statement.'),'Short statement.');const t=titleOf(long);assert.ok(t.length<=160&&t.endsWith('…')&&long.startsWith(t.slice(0,-1)),'a long title ends at a word: '+t);
  const projected=projectedRequirement({externalId:'X-1',sourceRow:6,fields:{description:long,domain:'Lending',capability:'Loan servicing',module:'Repayments 1',userGroup:'Lending Operations',priorityBand:'High',sourceAuthority:'Signed baseline',pglLinked:'Yes'}},{filename:'w.xlsx',sheet:'S',mapping:{description:'D'},priorityMap:{High:'Should'}});
  assert.deepEqual([projected.module,projected.userGroup,projected.priority,projected.assessment.sourceAuthority,projected.assessment.pglLinked],['Repayments 1','Lending Operations','Should','Signed baseline','Yes']);
  assert.equal(Object.keys(projected.assessment).length,ASSESSMENT_FIELDS.length);
  // Markup: the tags of pasted web content, a tag cut off mid-attribute, entities; placeholders and comparisons are not.
  assert.equal(markupIn('Latency < 200 ms and > 1 user'),null);assert.equal(markupIn('Enter the <account number> first'),null);
  assert.equal(markupIn('<div class="a"><p>Show the <b>balance</b>&nbsp;now</p></div>').cleaned,'Show the balance now');
  assert.equal(markupIn('<div data-message-author- role="assistant" data-x="1').cleaned,'');
  console.log('PASS the intake maps the most specific header to each field, one field per column; a band sets Must, Should or Could by its order, delivered is Could and a band AIW cannot order, or none, is not stated; a long title ends at a word; pasted markup is told from placeholders');

  // 2. Groups through the worker: create, read, update, refuse, remove; a small synthetic import gives the attributes.
  const root=await mkdtemp(path.join(tmpdir(),'aiw-groups-')),gdb=localDatabase(path.join(root,'g.sqlite')),genv={DB:gdb,FILES:localFiles(path.join(root,'files')),ASSETS:{fetch:()=>new Response('asset')}},origin='https://aiw.test';let pid,rev,doc;
  const api=async(route,{body,bytes,owner='architect-g'}={})=>{const r=await worker.fetch(new Request(origin+route+(route.includes('?')?'&':'?')+'project='+pid,{method:body||bytes?'POST':'GET',headers:{'oai-authenticated-user-id':owner,Origin:origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:bytes?{body:bytes}:{})}),genv);return {status:r.status,body:await r.json()};};
  const send=async(type,payload)=>{const r=await api('/api/commands',{body:{revision:rev,command:{type,payload}}});if(r.status===200){rev=r.body.revision;doc=r.body.document;}return r;};
  try{
    const created=await worker.fetch(new Request(origin+'/api/projects',{method:'POST',headers:{'oai-authenticated-user-id':'architect-g',Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Groups',template:'blank'})}),genv);pid=(await created.json()).document.id;
    const {bytes,manifest}=syntheticWorkbook({rows:40});
    const up=(await api('/api/intake?action=upload&filename=Small.xlsx',{bytes})).body,ins=(await api('/api/intake?action=inspect',{body:{uploadId:up.id,sheet:manifest.sheet}})).body;
    const input={uploadId:up.id,sheet:ins.sheet,headerRow:ins.headerRow,mapping:ins.mapping,priorityMap:ins.bands.map,groups:{domain:true,capabilityTheme:false}};
    const pre=(await api('/api/intake?action=preview',{body:input})).body;
    assert.equal(pre.proposals.groups.find(g=>g.field==='capabilityTheme').values.length>0,true);
    const applied=await api('/api/intake?action=apply',{body:{...input,revision:pre.projectRevision,previewStamp:pre.stamp,reviewed:true}});assert.equal(applied.status,200,JSON.stringify(applied.body));
    ({revision:rev,document:doc}=applied.body);
    const domains=[...new Set(manifest.rows.map(r=>r.domain))];
    assert.equal(requirementGroups(doc).length,domains.length,'only the chosen column becomes groups');assert.ok(requirementGroups(doc).every(g=>g.kind==='domain'));
    const reqs=doc.artefacts.filter(a=>a.type==='requirement'),[r1,r2,r3]=reqs;
    let r=await send('requirements.group',{title:'Teller close-out',kind:'functional-area',description:'What the teller does at the end of the day.',owner:'Branch operations',memberIds:`${r1.id}, ${r3.id}`,rule:[]});
    assert.equal(r.status,200,JSON.stringify(r.body));const own=r.body.selected;assert.match(own,/^RG-\d{3}$/);
    assert.deepEqual(groupMembers(doc,own),[r1.id,r3.id]);assert.ok(groupsOf(doc,r1.id).includes(own));assert.equal(groupsOf(doc,r2.id).includes(own),false);
    const ruleGroup=(await send('requirements.group',{title:'Lending and its loans',kind:'theme',rule:[{field:'domain',value:r2.domain},{field:'capabilityTheme',value:r2.capability}]})).body.selected;
    const expected=reqs.filter(a=>a.domain===r2.domain&&a.capability===r2.capability).map(a=>a.id);assert.deepEqual(groupMembers(doc,ruleGroup),expected,'every condition of the rule must hold');
    assert.equal(requirementAttribute(r2,'capabilityTheme'),r2.capability);assert.equal(requirementAttribute(r2,'delivery'),r2.assessment.delivery);
    for(const [payload,re] of [[{title:'',kind:'theme',memberIds:[r1.id]},/title/],[{title:'X',kind:'nonsense',memberIds:[r1.id]},/kind of group/],[{title:'X',kind:'theme',memberIds:['REQ-999']},/REQ-999 is not a requirement/],[{title:'X',kind:'theme'},/Name the requirements/],[{title:'Teller close-out',kind:'theme',memberIds:[r1.id]},/exists/],[{title:'X',kind:'theme',rule:[{field:'colour',value:'red'}]},/imported attribute/],[{title:'X',kind:'theme',rule:[{field:'domain',value:' '}]},/value/],[{title:'X',kind:'theme',rule:[1,2,3,4,5].map(()=>({field:'domain',value:'A'}))},/at most 4 conditions/],[{title:'X',kind:'theme',memberIds:Array.from({length:GROUP_LIMITS.members+1},(_,i)=>'REQ-'+i)},/at most 5,000/]]){const x=await send('requirements.group',payload);assert.equal(x.status,400,JSON.stringify(payload).slice(0,80));assert.match(x.body.error,re);}
    r=await send('requirements.group',{id:own,title:'Teller close-out and cash count',kind:'functional-area',memberIds:[r1.id],rule:[]});assert.equal(r.status,200);
    const edited=requirementGroups(doc).find(g=>g.id===own);assert.equal(edited.title,'Teller close-out and cash count');assert.equal(edited.updatedBy,'architect-g');assert.deepEqual(groupMembers(doc,own),[r1.id]);
    assert.equal(groupSummary(doc).find(s=>s.group.id===ruleGroup).members,expected.length);
    // GR-REQ-10 (round 23): a rule "delivery is one of A, B" holds the members of both values, and the summary counts each.
    {const values=[...new Set(reqs.map(a=>a.assessment?.delivery).filter(Boolean))].slice(0,2);assert.equal(values.length,2,'the synthetic register holds two delivery values');
     const two=(await send('requirements.group',{title:'Two delivery states',kind:'theme',rule:[{field:'delivery',op:'is one of',values}]})).body.selected,want=reqs.filter(a=>values.includes(a.assessment?.delivery)).map(a=>a.id);
     assert.deepEqual(groupMembers(doc,two),want,'the members of both values');const sum=groupSummary(doc).find(x=>x.group.id===two);
     for(const v of values)assert.equal(sum.deliveries[v],reqs.filter(a=>a.assessment?.delivery===v).length,'the summary counts '+v);
     assert.equal(Object.values(sum.deliveries).reduce((n,k)=>n+k,0),want.length,'and nothing else');assert.equal((await send('requirements.group-delete',{id:two})).status,200);}assert.match(groupsMarkdown(doc),/## Requirement groups[\s\S]*Teller close-out and cash count \| Functional area \| 1 \|/);
    const md=(await worker.fetch(new Request(origin+'/api/export?format=md&project='+pid,{headers:{'oai-authenticated-user-id':'architect-g'}}),genv).then(x=>x.text()));
    assert.match(md,/## Requirement groups/);assert.match(md,new RegExp(`External ID: ${r1.externalId} · Domain: ${r1.domain}[^\\n]*Groups: [^\\n]*${own}`),'the Chapter 1 register prints what the import kept and the groups');
    r=await send('requirements.group-delete',{id:own});assert.equal(r.status,200);assert.equal(requirementGroups(doc).some(g=>g.id===own),false);assert.equal((await send('requirements.group-delete',{id:own})).status,400);
    // A group another record links cannot go; the legacy capability groups become requirement groups, their command retired.
    const linked=structuredClone(doc);linked.quality={...(linked.quality||{}),drivers:[{id:'QD-001',requirementGroupIds:[ruleGroup]}]};
    assert.deepEqual(groupLinks(linked,ruleGroup),['QD-001']);throwsLike(()=>applyRequirementsCommand(linked,{type:'requirements.group-delete',payload:{id:ruleGroup}}),/QD-001 links this group/);
    const legacy=structuredClone(doc);legacy.assurance={version:1,counter:1,records:[],groups:[{id:'GRP-001',title:'Old capability group',requirementIds:[r1.id,r2.id],reason:'Related by capability',at:'2026-01-01',actor:'someone'}]};
    // Round 12 (DM-24): it reads as RG-nnn, numbered after the project's own groups, with GRP-001 kept as its alias; the
    // migration a group command makes stores the same id, and the next group is numbered after it.
    const read=requirementGroups(legacy).find(g=>g.alias==='GRP-001'),nextId='RG-'+String(legacy.requirementGroups.counter+1).padStart(3,'0');
    assert.equal(read?.legacy,true,'a legacy group reads as a requirement group');assert.equal(read.id,nextId);assert.deepEqual(groupMembers(legacy,read.id),[r1.id,r2.id]);
    const migrated=applyRequirementsCommand(legacy,{type:'requirements.group',payload:{title:'New',kind:'theme',memberIds:[r3.id]}},'2026-10-07','tester').document;
    assert.equal(migrated.assurance.groups,undefined);assert.deepEqual([migrated.requirementGroups.records.find(g=>g.alias==='GRP-001').id,migrated.requirementGroups.records.find(g=>g.alias==='GRP-001').origin],[nextId,'migrated']);
    assert.equal(migrated.requirementGroups.records.at(-1).id,'RG-'+String(legacy.requirementGroups.counter+2).padStart(3,'0'),'the next group is numbered after the migrated one');
    throwsLike(()=>applyAssuranceCommand(legacy,{type:'assurance.group',payload:{requirementIds:[r1.id,r2.id],title:'X',reason:'Y'}},'2026-10-07','tester'),/requirement groups now/);
    const full=structuredClone(doc);full.requirementGroups.records=Array.from({length:GROUP_LIMITS.groups},(_,i)=>({id:'RG-'+(900+i),title:'G'+i,kind:'theme',memberIds:[],rule:[{field:'domain',value:'x'}]}));
    throwsLike(()=>applyRequirementsCommand(full,{type:'requirements.group',payload:{title:'One more',kind:'theme',memberIds:[r1.id]}}),/up to 500/);
    console.log('PASS requirement groups: an import makes the chosen column\'s groups; a group by name, by a rule of two conditions, edited and removed through its commands; members and groups-of agree; each refusal says why; a linked group stays; legacy capability groups migrate and their command is retired; caps of 500 groups and 5,000 named members; the register prints the groups and each requirement\'s imported fields');

    // 3. Confirming at scale: one reviewed step with the count the person saw, journalled once.
    const unconfirmed=doc.artefacts.filter(a=>a.type==='requirement'&&!a.confirmed).length,events=doc.changes?.events?.length||0;
    for(const [payload,re] of [[{filter:{},count:unconfirmed}, /Review the requirements/],[{filter:{},count:unconfirmed-1,reviewed:true},/selection changed/],[{ids:['REQ-999'],count:1,reviewed:true},/no longer in this project/],[{count:1,reviewed:true},/Choose the requirements/]]){const x=await send('requirements.confirm',payload);assert.equal(x.status,400);assert.match(x.body.error,re);}
    const gaps=selectRequirements(doc,{filter:{gaps:true}});assert.ok(gaps.length>0&&gaps.every(a=>a.assessment.delivery!=='Delivered'));
    r=await send('requirements.confirm',{filter:{gaps:true},count:gaps.length,reviewed:true});assert.equal(r.status,200,JSON.stringify(r.body));
    assert.equal(doc.changes.events.length,events+1,'one journal event for the step');const ev=doc.changes.events.at(-1);
    assert.deepEqual([ev.source.id,ev.reviewed,ev.actor,ev.requirementIds.length,ev.items.length],['requirements-confirm',true,'architect-g',gaps.length,0]);
    assert.ok(gaps.every(a=>doc.artefacts.find(x=>x.id===a.id).confirmed));assert.equal(doc.review,null);
    r=await send('requirements.confirm',{filter:{gaps:true},count:0,reviewed:true});assert.equal(r.status,400);assert.match(r.body.error,/confirmed already/);
    assert.equal(journalBase(doc,doc,'artefact'),doc);
    console.log('PASS bulk confirmation: refused without the review or with a count that no longer holds; one step confirms every delivery gap and the journal records it once, with each requirement it confirmed, and no per-requirement change');
    // A re-import under a changed band mapping updates the priorities only, and keeps the confirmations, since no
    // requirement's own words changed; a receipt from before a field existed reads as the same mapping.
    const ds=doc.intake.datasets[0],rows40=mapWorkbookRows(await (await openWorkbook(bytes)).sheet(manifest.sheet),5,ds.mapping);
    const flipped=Object.fromEntries(Object.entries(ds.priorityMap).map(([k,v])=>[k,v==='Could'?'Should':v])),src={...rows40,datasetId:ds.id,revision:ds.revision+1,filename:'Small.xlsx',sheet:manifest.sheet,headerRow:5,workbookHash:ds.workbookHash,priorityMap:flipped};
    const pv=previewIntake(doc,src,rows40.rows),updates=pv.changes.filter(c=>c.kind==='update');
    assert.ok(updates.length>0&&updates.every(c=>c.fields.join()==='priority')&&pv.counts.unchanged>0&&pv.counts.unchanged+updates.length===40,'only the priorities change: '+JSON.stringify(pv.counts));
    const before=new Set(doc.artefacts.filter(a=>a.confirmed).map(a=>a.id));assert.ok(updates.some(c=>before.has(c.id)),'a confirmed requirement is among the updates');
    const reimported=applyIntake(doc,src,pv,{previewStamp:pv.stamp,reviewed:true},'2026-10-07','tester').document;
    assert.deepEqual(new Set(reimported.artefacts.filter(a=>a.confirmed).map(a=>a.id)),before,'confirmation kept where the words stand');
    assert.ok(updates.every(c=>reimported.artefacts.find(a=>a.id===c.id).priority==='Should'),'the priorities the new mapping sets');
    const older={mapping:Object.fromEntries(Object.entries(ds.mapping).filter(([k])=>!['module','userGroup','pglLinked'].includes(k))),priorityMap:ds.priorityMap};
    assert.equal(sameMapping(older,{mapping:{...older.mapping,module:'',userGroup:'',pglLinked:''},priorityMap:ds.priorityMap}),true);assert.equal(sameMapping(older,{mapping:ds.mapping,priorityMap:ds.priorityMap}),false);
    console.log('PASS a re-import under a changed band mapping updates the priorities and keeps every confirmation; a receipt from before a field existed reads as the same mapping');

    // 4. Missing evidence: a reason clears it while the source row stands; a reviewed, linked test result clears it too.
    const one=doc.artefacts.find(a=>a.type==='requirement'&&!a.assessment.evidence),findingOf=(p,id)=>findings(p).find(f=>f.code==='source-evidence'&&f.artefactId===id);
    assert.ok(findingOf(doc,one.id));
    assert.match((await send('requirements.evidence',{ids:[one.id],reason:'Too short',count:1,reviewed:true})).body.error,/in a sentence/);
    r=await send('requirements.evidence',{ids:[one.id],reason:'The source workbook records no evidence; the run logs are with the test team.',count:1,reviewed:true});assert.equal(r.status,200,JSON.stringify(r.body));
    assert.equal(findingOf(doc,one.id),undefined,'the reason clears the finding');assert.equal(doc.artefacts.find(a=>a.id===one.id).evidenceTreatment.actor,'architect-g');
    const moved=structuredClone(doc);moved.artefacts.find(a=>a.id===one.id).provenance.rowHash='changed';assert.match(findingOf(moved,one.id).detail,/predates a change to the source row/,'a changed source row asks for the reason again');
    r=await send('requirements.evidence',{ids:[one.id],remove:true,count:1,reviewed:true});assert.equal(r.status,200);assert.ok(findingOf(doc,one.id),'removing the reason brings the finding back');
    const withSource=structuredClone(doc);withSource.coauthoring={schemaVersion:1,counters:{source:1,task:0},sources:[{id:'SRC-001',title:'Test run log',versions:[{revision:1,text:'Run 14 passed.',location:'runs/14'}]}],tasks:[]};
    const tested=applyAssuranceCommand(withSource,{type:'assurance.record',payload:{kind:'test-result',requirementIds:[one.id],title:'Run 14',statement:'Passed in release 2.',release:'R2',environment:'UAT',observedAt:'2026-09-01',cycle:'Cycle 4',sourceId:'SRC-001',reviewed:true,reviewer:'Test lead',reviewNote:'Read the run log.'}},'2026-10-07','tester').document;
    assert.equal(findingOf(tested,one.id),undefined,'a reviewed test result that links the requirement is its evidence');
    const unreviewed=applyAssuranceCommand(withSource,{type:'assurance.record',payload:{kind:'test-result',requirementIds:[one.id],title:'Run 15',statement:'Passed.',release:'R2',environment:'UAT',observedAt:'2026-09-02',cycle:'Cycle 4'}},'2026-10-07','tester').document;
    assert.ok(findingOf(unreviewed,one.id),'an unreviewed assertion is not evidence');
    console.log('PASS missing evidence: a reviewed reason clears the finding while the source row stands and asks again when it changes; removing it brings the finding back; a reviewed, current test result that links the requirement clears it, an unreviewed one does not');

    // 5. The milestone is reachable without a new workbook: owner, acceptance, journey and outcome, confirmation and the reason.
    // The requirements picked carry none of the source's own findings, which a later workbook or a further step answers
    // (round 12 adds those B2 reads: an unvalidated delivery, an undelivered item marked stable, blocked tests, sheets that
    // disagree, identical statements that disagree, a test objective).
    let p=structuredClone(doc);const pick=p.artefacts.filter(a=>a.type==='requirement'&&!findings(p).some(f=>f.artefactId===a.id&&['source-conflict','test-cycle','delivery-assurance','duplicate','source-markup','ambiguity','delivery-validation','gap-stable','test-blocked','enrich-conflict','repeat-conflict','test-objective'].includes(f.code))).slice(0,3).map(a=>a.id);
    p.artefacts=p.artefacts.filter(a=>a.type!=='requirement'||pick.includes(a.id));p.relationships=[];
    const step=x=>{p=applyCommand(p,x).document;};
    step({type:'artefact',payload:{type:'journey',title:'Close the till',description:'The teller balances the till at the end of the day.',owner:'Branch operations',source:'Workshop',confirmed:true,order:1}});
    step({type:'artefact',payload:{type:'outcome',title:'Balanced tills',description:'Every till balances on the same day.',owner:'Branch operations',source:'Workshop',confirmed:true}});
    const journeyId=p.artefacts.find(a=>a.type==='journey').id,outcomeId=p.artefacts.find(a=>a.type==='outcome').id;
    for(const id of pick){const a=p.artefacts.find(x=>x.id===id);step({type:'artefact',payload:{...a,owner:'Branch operations',acceptance:'Given an open till, when the teller closes it, then the balance is recorded with the time.',confirmed:false}});step({type:'relationship',payload:{from:journeyId,to:id,kind:'requires'}});step({type:'relationship',payload:{from:id,to:outcomeId,kind:'delivers'}});}
    const ready=()=>milestones(p).find(x=>x.id==='requirements');
    assert.equal(ready().done,false);
    p=applyRequirementsCommand(p,{type:'requirements.confirm',payload:{ids:pick,count:pick.filter(id=>!p.artefacts.find(a=>a.id===id).confirmed).length,reviewed:true}},'2026-10-07','tester').document;
    const lacking=pick.filter(id=>!p.artefacts.find(a=>a.id===id).assessment.evidence&&!p.artefacts.find(a=>a.id===id).evidenceTreatment);
    if(lacking.length){assert.equal(ready().done,false,'missing evidence still holds it back');p=applyRequirementsCommand(p,{type:'requirements.evidence',payload:{ids:lacking,reason:'Evidence for these is held outside the workbook; recorded at the review.',count:lacking.length,reviewed:true}},'2026-10-07','tester').document;}
    assert.equal(ready().done,true,'requirements ready: '+JSON.stringify(findings(p).filter(f=>pick.includes(f.artefactId)).map(f=>f.code)));
    console.log('PASS the requirements-ready milestone is reached inside AIW: owner, testable acceptance, a journey step and an outcome, one reviewed confirmation and a reviewed reason for the missing evidence; no new workbook needed');

    // 6. What the import proposed: refused when it does not hold.
    const datasetId=doc.intake.datasets[0].id;
    for(const [payload,re] of [[{datasetId,stakeholders:{accept:['Nobody']},reviewed:true},/not a stakeholder this import proposed/],[{datasetId,stakeholders:{accept:[]}},/Review the proposals/],[{datasetId:'nope',reviewed:true},/no proposals/],[{datasetId,reviewed:true},/Choose the proposals/]]){const x=await send('requirements.proposals',payload);assert.equal(x.status,400,JSON.stringify(payload));assert.match(x.body.error,re);}
    const confirmedBrief=structuredClone(doc);confirmedBrief.brief={problem:'Settled',goal:'Done',source:'Board',confirmed:true};
    throwsLike(()=>applyRequirementsCommand(confirmedBrief,{type:'requirements.proposals',payload:{datasetId,brief:{accept:{problem:'New text from the workbook sentences.'}},reviewed:true}}),/brief is confirmed/);
    r=await send('requirements.proposals',{datasetId,brief:{dismiss:true},reviewed:true});assert.equal(r.status,200);assert.equal(doc.intake.datasets[0].proposals.brief.status,'dismissed');
    assert.match((await send('requirements.proposals',{datasetId,brief:{dismiss:true},reviewed:true})).body.error,/dismissed already/);
    console.log('PASS the import\'s proposals: an unknown stakeholder, an unreviewed step or a missing dataset is refused; a confirmed brief is not replaced; a dismissed brief stays dismissed');

    // 7. The checks per cause, the selection filters and a companion that names a handful.
    const causes=findingCauses(findings(doc)),journey=causes.find(c=>c.code==='journey-link');
    assert.equal(journey.count,40);assert.equal(journey.sentence,'40 requirements are needed at no journey step.');assert.ok(causes.findIndex(c=>c.level!=='error')>causes.findLastIndex(c=>c.level==='error'),'what is to fix comes first');
    assert.equal(causes.find(c=>c.code==='brief')?.sentence,'Capture the problem, intended outcome, and source.','a cause found once reads as its finding');
    assert.equal(selectRequirements(doc,{filter:{q:r1.externalId.toLowerCase()}})[0].id,r1.id);assert.equal(selectRequirements(doc,{filter:{noEvidence:true}}).length,doc.artefacts.filter(a=>a.type==='requirement'&&!a.assessment.evidence).length);
    assert.equal(selectRequirements(doc,{filter:{groupId:ruleGroup}}).length,expected.length);assert.equal(selectRequirements(doc,{filter:{cause:'journey-link'}}).length,40);
    const insight=storyInsights(storySource(doc)).find(i=>i.cause==='journey-link');
    assert.equal(insight.count,40);assert.match(insight.text,/^40 requirements are needed at no journey step: REQ-\d+, REQ-\d+, REQ-\d+, REQ-\d+, REQ-\d+ and 35 more\.$/);
    const small=storyInsights(storySource(seedProject()));assert.ok(small.every(i=>!/ more\b/.test(i.text)),'five or fewer keep their titles');
    console.log('PASS the checks read per cause, errors first, each with its count and a sentence; a selection filters by group, search, evidence and cause; the companion names five requirements and counts the rest');
    // 8. Round 12 (GR-DRF-05): a requirement may sit on a step of a supporting or administrative process, or carry a
    // person's reviewed reason that it belongs on no journey; either clears its journey-link finding.
    const linkFinding=(p,id)=>findings(p).find(f=>f.code==='journey-link'&&f.artefactId===id);
    const loose=doc.artefacts.filter(a=>a.type==='requirement'&&linkFinding(doc,a.id)).slice(0,4).map(a=>a.id);
    assert.equal(loose.length,4,'imported requirements are on no journey step yet');
    r=await send('artefact',{type:'journey',title:'Produce the day-end reports',description:'Operations produce the day-end reports for the branches.',owner:'Operations',source:'Workshop',order:1,processKind:'supporting'});
    assert.equal(r.status,200,JSON.stringify(r.body));const supporting=r.body.selected;
    assert.equal(processKind(doc.artefacts.find(a=>a.id===supporting)),'supporting');
    r=await send('artefact',{type:'journey',title:'Maintain users and roles',description:'Administrators keep the users, their roles and their limits.',owner:'Security administration',source:'Workshop',order:2,processKind:'administrative'});
    assert.equal(r.status,200,JSON.stringify(r.body));const administrative=r.body.selected;
    assert.equal(processKind(doc.artefacts.find(a=>a.id===administrative)),'administrative');
    assert.deepEqual(PROCESS_KINDS.map(([k])=>k),['','supporting','administrative']);
    assert.match((await send('artefact',{type:'journey',title:'A ceremonial step',processKind:'ceremonial'})).body.error,/kind of process/);
    await send('relationship',{from:supporting,to:loose[0],kind:'requires'});await send('relationship',{from:administrative,to:loose[1],kind:'requires'});
    assert.equal(linkFinding(doc,loose[0]),undefined,'a requirement on a supporting process step is linked');
    assert.equal(linkFinding(doc,loose[1]),undefined,'and one on an administrative process step');
    const reason='Platform rules that no step of any journey carries; checked at the review.';
    assert.match((await send('requirements.journey-treatment',{ids:[loose[2]],reason:'No journey',count:1,reviewed:true})).body.error,/in a sentence/);
    assert.match((await send('requirements.journey-treatment',{ids:[loose[2]],reason,count:1})).body.error,/Review the requirements/);
    assert.match((await send('requirements.journey-treatment',{ids:[loose[0]],reason,count:1,reviewed:true})).body.error,/on a journey step already/);
    assert.match((await send('requirements.journey-treatment',{ids:[loose[2],loose[3]],reason,count:1,reviewed:true})).body.error,/selection changed/);
    const journalled=doc.changes?.events?.length||0;
    r=await send('requirements.journey-treatment',{ids:[loose[2],loose[3]],reason,count:2,reviewed:true});assert.equal(r.status,200,JSON.stringify(r.body));
    assert.equal(linkFinding(doc,loose[2]),undefined,'a reviewed reason clears the finding');assert.equal(linkFinding(doc,loose[3]),undefined);
    const treated=doc.artefacts.find(a=>a.id===loose[2]).journeyTreatment;
    assert.deepEqual([treated.reason,treated.reviewed,treated.actor],[reason,true,'architect-g']);
    assert.equal(doc.changes.events.length,journalled+1,'the step is journalled once');assert.deepEqual(doc.changes.events.at(-1).requirementIds,[loose[2],loose[3]]);
    const kept=doc.artefacts.find(a=>a.id===loose[2]);r=await send('artefact',{...kept,owner:'Platform owner',confirmed:false});assert.equal(r.status,200,JSON.stringify(r.body));
    assert.equal(doc.artefacts.find(a=>a.id===loose[2]).journeyTreatment.reason,reason,'a save of the requirement keeps the reason');
    const unreviewedReason=structuredClone(doc);unreviewedReason.artefacts.find(a=>a.id===loose[3]).journeyTreatment.reviewed=false;
    assert.ok(linkFinding(unreviewedReason,loose[3]),'a reason no person reviewed clears nothing');
    r=await send('requirements.journey-treatment',{ids:[loose[3]],remove:true,count:1,reviewed:true});assert.equal(r.status,200,JSON.stringify(r.body));
    assert.ok(linkFinding(doc,loose[3]),'removing the reason brings the finding back');assert.equal(linkFinding(doc,loose[2]),undefined);
    console.log('PASS GR-DRF-05: a requirement on a step of a supporting or administrative process is linked; one that belongs on no journey carries a reviewed reason (refused unreviewed, in less than a sentence, for a selection that changed or one already on a step), recorded once in the journal, kept by a save, and its journey-link finding clears; an unreviewed reason clears nothing; removing it brings the finding back');
    // 9. Round 12 (GR-REQ-18): a project saved before the capability groups moved still holds them; a link the client
    // sends by such a group's GRP id is stored, through the worker, as the RG id the group reads as. A GRP id no group
    // carries is refused as before.
    const {readStoredProject,saveStoredProject}=await import('./project-storage.js');
    const row=await gdb.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind('architect-g',pid).first();
    const held=await readStoredProject(genv,'architect-g',row.document),[g1,g2]=doc.artefacts.filter(a=>a.type==='requirement');
    held.document.assurance={...(held.document.assurance||{version:1,counter:0,records:[]}),groups:[{id:'GRP-001',title:'Old capability group',requirementIds:[g1.id,g2.id],reason:'Related by capability',at:'2026-01-01',actor:'someone'}]};
    assert.equal((await saveStoredProject(genv,'architect-g',pid,held.document,row.revision,new Date().toISOString(),held.keys)).meta.changes,1);
    ({revision:rev,document:doc}=(await api('/api/project')).body);
    const aliased=requirementGroups(doc).find(g=>g.alias==='GRP-001');assert.ok(aliased&&/^RG-\d{3}$/.test(aliased.id),'the stored capability group reads as a requirement group');
    r=await send('quality.driver',{kind:'functional',title:'The old capability group works as one',requirementGroupIds:['GRP-001']});assert.equal(r.status,200,JSON.stringify(r.body));
    assert.deepEqual(doc.quality.drivers.find(d=>d.id===r.body.selected).requirementGroupIds,[aliased.id],'a driver linked by GRP-001 stores the RG id it aliases');
    r=await send('assurance.record',{kind:'capability',title:'The old capability group is in service',statement:'In service since release 2.',requirementGroupIds:['GRP-001']});assert.equal(r.status,200,JSON.stringify(r.body));
    assert.deepEqual(doc.assurance.records.at(-1).requirementGroupIds,[aliased.id],'and so does an assurance record');
    assert.match((await send('quality.driver',{kind:'functional',title:'An unknown group',requirementGroupIds:['GRP-077']})).body.error,/GRP-077 is not in this project/,'a GRP id no group carries is refused');
    console.log('PASS GR-REQ-18 (worker): a driver and an assurance record linked by a stored capability group\'s GRP id store the RG id it reads as; an unknown GRP id is refused');
  }finally{gdb.close();await rm(root,{recursive:true,force:true});}
}
// Round 12 (B2): the statement checks read as one ambiguity cause (GR-INT-08); an assurance record links a requirement
// group of any size and an assessment holds rated dimensions (GR-REQ-15); a link sent by a legacy capability group's id
// stores the RG id it aliases on the staged path (GR-REQ-18; the worker path is block 2, section 9). In memory.
{
  const {statementChecks,SUBJECTIVE}=await import('./public/statement-checks.js');
  const {findingCauses,applyRequirementsCommand}=await import('./public/requirement-commands.js');
  const {applyAssuranceCommand,assuranceRequirementIds,assuranceCurrent,assuranceFindings,assuranceMarkdown,ASSESSMENT_LIMITS}=await import('./public/assurance-domain.js');
  const {requirementGroups,groupMembers,resolveGroupAliases}=await import('./public/requirement-groups.js');
  const {applyCanonical}=await import('./public/canonical-command.js');
  const {mapWorkbookRows,previewIntake,applyIntake,suggestMapping,sheetHeaders,guessHeader}=await import('./public/intake-domain.js');
  const {openWorkbook}=await import('./public/workbook-reader.js');
  const {syntheticWorkbook}=await import('./scripts/synthetic-workbook.mjs');
  const throwsLike=(fn,re,label)=>assert.throws(fn,e=>re.test(e.message),label);
  // GR-INT-08: subjective words, a regulation cited by its kind only, a quality with no target, open scope and a question
  // each raise the one ambiguity cause, with the check and the words that raised it; the eight words Chapter 1 has always
  // flagged still match; a statement with a figure, or one that names its regulator or instrument, raises none.
  const LEGACY=['quickly','fast','user-friendly','seamless','asap','timely','easy','efficiently'];
  assert.ok(LEGACY.every(w=>SUBJECTIVE.includes(w)),'the eight words stay on the list');
  const legacyStatements={quickly:'The service shall confirm the transfer quickly.',fast:'The service shall offer a fast transfer.','user-friendly':'The service shall offer a user-friendly transfer screen.',seamless:'The service shall give a seamless hand-over between channels.',asap:'The service shall notify the customer asap after a transfer.',timely:'The service shall send timely notices of each transfer.',easy:'The service shall make the transfer easy to repeat.',efficiently:'The service shall post the transfers efficiently.'};
  for(const [w,s] of Object.entries(legacyStatements)){const c=statementChecks(s).find(x=>x.check==='subjective');assert.ok(c?.words.includes(w),`“${w}” still raises the subjective check`);}
  const flagged=[['subjective','Show the balance','The teller screen shall show the balance intuitively.'],['regulation','Meet the reporting rules','The service shall meet all regulatory requirements for reporting.'],['target','Keep the posting responsive','The posting service shall keep its response time low at peak hours.'],['vague','Store the records','The service shall store the appropriate records where applicable.'],['shape','Interest on savings','Is interest computed on the daily balance?']];
  const clean=[['Confirm the transfer in time','The service shall confirm each transfer within 2 seconds for 95 percent of requests.'],['Protect the customer data','The service shall meet the regulatory requirements of the Data Protection Act 2018 for every customer record.'],['File the returns','The service shall file the returns the central bank requires under its regulations each month.']];
  for(const [check,title,s] of flagged)assert.deepEqual(statementChecks(s,{title}).map(c=>c.check),[check],`${check}: ${s}`);
  for(const [title,s] of clean)assert.deepEqual(statementChecks(s,{title}),[],'no check: '+s);
  let p=seedProject();const made=new Map();
  for(const [key,title,description] of [...flagged,...Object.entries(legacyStatements).map(([w,s])=>['legacy:'+w,'Transfer '+(LEGACY.indexOf(w)+1),s]),...clean.map(([t,s],i)=>['clean:'+i,t,s])]){const r=applyCommand(p,{type:'artefact',payload:{type:'requirement',title,description,owner:'Payments owner',source:'Workshop',priority:'Must',acceptance:'Given a transfer, when it is made, then the recorded result is returned.'}});p=r.document;made.set(key,r.selected);}
  const amb=findings(p).filter(f=>f.code==='ambiguity'),causes=findingCauses(findings(p)).filter(c=>c.code==='ambiguity');
  assert.equal(causes.length,1,'one ambiguity cause');
  const expected=[...made].filter(([k])=>!k.startsWith('clean:')).map(([,id])=>id);
  assert.deepEqual(causes[0].ids.filter(id=>[...made.values()].includes(id)).sort(),expected.slice().sort(),'every flagged statement, and no clean one, is in the cause');
  for(const [check] of flagged){const f=amb.find(x=>x.artefactId===made.get(check));assert.deepEqual(f.checks,[check]);assert.match(f.detail,check==='regulation'?/name the regulation it rests on/:/Replace subjective wording/);}
  assert.match(amb.find(f=>f.artefactId===made.get('subjective')).detail,/“intuitively”/,'the detail names the words');
  // With the core-banking lens chosen for the project (and only then) a regime the lens names, such as know your customer,
  // counts as named.
  const kyc='The service shall apply the KYC checks that regulation requires before an account opens.';
  assert.deepEqual(statementChecks(kyc).map(c=>c.check),['regulation'],'without the lens, KYC is not a named regulation');
  assert.deepEqual(statementChecks(kyc,{lens:true}),[],'with the lens, it is');
  const lensed=applyCommand(p,{type:'artefact',payload:{type:'requirement',title:'Apply the KYC checks',description:kyc,owner:'Onboarding owner',source:'Workshop',priority:'Must',acceptance:'Given a new customer, when the account opens, then the checks are recorded.'}}),kid=lensed.selected;
  assert.ok(findings(lensed.document).some(f=>f.code==='ambiguity'&&f.artefactId===kid));
  const withLens=structuredClone(lensed.document);withLens.workspace={...(withLens.workspace||{}),domainLens:{lensId:'core-banking'}};
  assert.equal(findings(withLens).some(f=>f.code==='ambiguity'&&f.artefactId===kid),false,'the project that chose the lens reads the regime');
  console.log('PASS GR-INT-08: subjective words, a regulation cited without its name, a quality with no target, open scope and a question raise the one ambiguity cause with their words; the eight words still match; figures and named regulators or instruments raise none; a regime the core-banking lens names counts only for a project that chose the lens');

  // GR-REQ-15: a group of 400 members on one assurance record; refusals with their bounds, nothing cut.
  const {bytes,manifest}=syntheticWorkbook({rows:420});
  const sheet=await (await openWorkbook(bytes)).sheet(manifest.sheet),headerRow=guessHeader(sheet),mapping=suggestMapping(sheetHeaders(sheet,headerRow));
  const src={...mapWorkbookRows(sheet,headerRow,mapping),datasetId:'synthetic-420',revision:1,filename:'Synthetic.xlsx',sheet:manifest.sheet,headerRow,workbookHash:'synthetic',priorityMap:{}};
  const base=seedProject(),pv=previewIntake(base,src,[]);let big=applyIntake(base,src,pv,{previewStamp:pv.stamp,reviewed:true},'2026-10-07','tester').document;
  const reqIds=big.artefacts.filter(a=>a.type==='requirement'&&a.externalId).map(a=>a.id);assert.ok(reqIds.length>=400,'the import gives 400 requirements or more: '+reqIds.length);
  let r=applyRequirementsCommand(big,{type:'requirements.group',payload:{title:'Four hundred transfers',kind:'theme',memberIds:reqIds.slice(0,400)}},'2026-10-07','tester');big=r.document;const gid=r.selected;
  assert.equal(groupMembers(big,gid).length,400);
  const at='2026-10-07',record=(payload,doc=big)=>applyAssuranceCommand(doc,{type:'assurance.record',payload:{title:'The group is in service',statement:'All of them are in service in release 3.',...payload}},at,'tester').document;
  const linked=record({kind:'capability',requirementGroupIds:[gid]}),rec=linked.assurance.records.at(-1);
  assert.deepEqual([rec.requirementGroupIds,rec.requirementIds],[[gid],[]],'the record links the group, not 400 copies of its members');
  assert.equal(assuranceRequirementIds(linked,rec).length,400,'and reads its 400 members');assert.equal(assuranceCurrent(linked,rec),true);
  assert.match(assuranceMarkdown(linked),new RegExp(`requirement groups: ${gid} \\(400 requirements\\)`));
  const shrunk=applyRequirementsCommand(linked,{type:'requirements.group',payload:{id:gid,title:'Four hundred transfers',kind:'theme',memberIds:reqIds.slice(0,399)}},at,'tester').document;
  assert.equal(assuranceCurrent(shrunk,shrunk.assurance.records.at(-1)),false,'a change of the group asks for the record to be rechecked');assert.ok(assuranceFindings(shrunk).some(f=>f.code==='assurance-stale'));
  const dims=[{name:'Clarity',rating:'Meets'},{name:'Fairness to the customer',rating:'Partly meets',note:'Fees are shown only after confirmation.'}];
  const assessed=record({kind:'ethos-assessment',title:'Ethos assessment of the transfers',statement:'Assessed against the published ethos.',requirementGroupIds:[gid],dimensions:dims,rating:'Partly meets'}),arec=assessed.assurance.records.at(-1);
  assert.deepEqual([arec.dimensions,arec.rating],[dims,'Partly meets'],'an assessment holds its rated dimensions and its overall rating');
  assert.match(assuranceMarkdown(assessed),/Overall rating: Partly meets\. Clarity: Meets; Fairness to the customer: Partly meets \(Fees are shown only after confirmation\.\)\./);
  for(const [payload,re] of [[{kind:'capability',requirementGroupIds:[gid],dimensions:dims},/Only an assessment holds rated dimensions/],[{kind:'capability',requirementGroupIds:[gid],rating:'Good'},/Only an assessment/],[{kind:'ethos-assessment',requirementGroupIds:[gid],dimensions:[{name:'Clarity'}]},/name and the rating/],[{kind:'ethos-assessment',requirementGroupIds:[gid],dimensions:[{name:'Clarity',rating:'A'},{name:'clarity',rating:'B'}]},/Name each dimension once/],[{kind:'ethos-assessment',requirementGroupIds:[gid],dimensions:Array.from({length:ASSESSMENT_LIMITS.dimensions+1},(_,i)=>({name:'D'+i,rating:'R'}))},/at most 20 dimensions; 21 were sent/],[{kind:'capability',requirementGroupIds:[gid],objectIds:Array.from({length:ASSESSMENT_LIMITS.objects+1},(_,i)=>'OBJ-'+i)},/at most 30 project objects; 31 were sent/],[{kind:'capability',requirementIds:Array.from({length:5001},(_,i)=>'REQ-'+i)},/at most 5,000 requirements; 5,001 were sent/],[{kind:'capability',requirementGroupIds:['RG-999']},/Choose existing requirement groups: RG-999/],[{kind:'capability'},/requirements or requirement groups/]])throwsLike(()=>record(payload),re,JSON.stringify(payload).slice(0,90));
  console.log('PASS GR-REQ-15: an assurance record links a requirement group of 400 members and reads them, and asks to be rechecked when the group changes; an assessment holds rated dimensions and an overall rating, printed in the register; dimensions on another kind, an unrated or repeated dimension, more than 20 dimensions, 30 objects or 5,000 requirements, or an unknown group are refused with their bound');

  // GR-REQ-18 (the staged path): a link sent as GRP-nnn stores the RG-nnn it aliases; ids of other records are untouched.
  const legacy=structuredClone(big);legacy.assurance={...(legacy.assurance||{version:1,counter:0,records:[]}),groups:[{id:'GRP-001',title:'Old capability group',requirementIds:reqIds.slice(0,2),reason:'Related by capability',at:'2026-01-01',actor:'someone'}]};
  const alias=requirementGroups(legacy).find(g=>g.alias==='GRP-001').id;assert.match(alias,/^RG-\d{3}$/);
  const staged=applyCanonical(legacy,{type:'quality.driver',payload:{kind:'functional',title:'The old capability group works as one',requirementGroupIds:['GRP-001']}},at,'tester').document;
  assert.deepEqual(staged.quality.drivers.at(-1).requirementGroupIds,[alias],'the driver stores the RG id');
  const patch={type:'decision.alternative',payload:{requirementGroupIds:{add:['GRP-001'],remove:[]},responsibilityIds:['GRP-001'],nested:{requirementGroupIds:['GRP-001',gid]}}};
  assert.deepEqual(resolveGroupAliases(legacy,patch).payload,{requirementGroupIds:{add:[alias],remove:[]},responsibilityIds:['GRP-001'],nested:{requirementGroupIds:[alias,gid]}},'a patch and a nested list resolve; a responsibility group id is another record');
  const plain={type:'quality.driver',payload:{requirementGroupIds:[gid]}};assert.equal(resolveGroupAliases(legacy,plain),plain,'a command with nothing to resolve is returned as it is');
  console.log('PASS GR-REQ-18 (staged path): a driver linked by a legacy GRP id stores the RG id it reads as; a patch and a nested list resolve; other records\' ids and a command with nothing to resolve are left as they are');
}
