import assert from 'node:assert/strict';
import {seedProject,applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {withDecisions,applyDecisionCommand,chosen,decisionFindings,decisionCurrent,decisionSourceChanged,impactCurrent,decisionReviewCurrent,decisionHandoffCurrent,decisionMilestones,governanceCurrent,acceptedDecisionsFor,appliedDecisionEdges,decisionPatterns,proposedAlternative,potentialDecisionConflicts,conflictResolved,exportDecisionsMarkdown} from './public/decisions-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
const command=(p,type,payload={})=>applyDecisionCommand(p,{type:'decision.'+type,payload}).document;
const get=(p,id)=>p.decisions.records.find(d=>d.id===id);
const original=seedProject(),p=withDecisions(original);assert.equal(original.decisions,undefined);assert.deepEqual(p.artefacts,original.artefacts);assert.equal(p.decisions.records.length,3);assert.equal(p.decisions.counters.alternative,6);assert(p.decisions.records.every(d=>d.status==='draft'&&!d.selectedAlternativeId&&!d.governance&&!d.appliedImpact));
{
 const linked=structuredClone(p),driver=linked.quality.drivers.find(q=>q.id==='QD-001');driver.kind='business';driver.code='BD1';driver.confirmed=true;driver.targetConfirmed=false;
 linked.decisions.records[0].driverIds=[driver.id];
 assert(!decisionFindings(linked).some(f=>f.decisionId==='ADR-001'&&f.code==='driver-assumptions'),'a reviewed non-quality driver does not need a numerical target');
 const unreviewed=structuredClone(linked);unreviewed.quality.drivers.find(q=>q.id===driver.id).confirmed=false;
 assert(decisionFindings(unreviewed).some(f=>f.decisionId==='ADR-001'&&f.code==='driver-assumptions'&&/driver/i.test(f.title)),'an unreviewed non-quality driver is still visible as a review finding');
}
const before=JSON.stringify(p);proposedAlternative(p,get(p,'ADR-001'),decisionPatterns(get(p,'ADR-001'))[0]);assert.equal(JSON.stringify(p),before,'Ghost proposals do not mutate the project');
assert.throws(()=>command(p,'apply-impact',{id:'ADR-001',alternativeId:'ALT-001',revision:1}),/Accept the current decision/);
let test=command(p,'choose',{id:'ADR-001',alternativeId:'ALT-002'});assert.equal(get(test,'ADR-001').status,'draft');assert.equal(chosen(get(test,'ADR-001')).id,'ALT-002');assert(decisionFindings(test).some(f=>f.code==='support-QD-002'));assert.throws(()=>command(test,'record',{id:'ADR-001'}),/rationale/);
test=command(test,'save',{...get(test,'ADR-001'),rationale:'Separate acceptance from settlement to limit dependency coupling.'});test=command(test,'record',{id:'ADR-001'});assert.equal(get(test,'ADR-001').status,'recorded');assert.throws(()=>command(test,'accept',{id:'ADR-001',acknowledge:true}),/content and conflict/);
function prepare(input,id,index=0){let p=input,d=get(p,id),a=d.alternatives[index];p=command(p,'alternative',{...a,id,alternativeId:a.id,assessments:Object.fromEntries(d.driverIds.map(q=>[q,{effect:a.assessments[q]?.effect||'neutral',reason:'Compared against the documented failure boundary and driver.',evidence:'Architecture analysis in the prototype review; runtime validation remains required.'}]))});p=command(p,'choose',{id,alternativeId:a.id});p=command(p,'save',{...get(p,id),rationale:'Prefer the explicit failure boundary; retain the original reference and a recorded outcome.',mitigation:'Verify the complete path under timeout, concurrency, and restart conditions.'});return command(p,'record',{id});}
test=prepare(p,'ADR-001',1);assert.throws(()=>command(test,'accept',{id:'ADR-001'}),/Acknowledge/);test=command(test,'accept',{id:'ADR-001',acknowledge:true});let d=get(test,'ADR-001');assert(decisionCurrent(test,d));assert.equal(d.governance,null,'Architect acceptance must not imply governance approval');assert.equal(appliedDecisionEdges(test).length,0,'Acceptance must not apply unreviewed model changes');
assert.throws(()=>command(test,'apply-impact',{id:d.id,alternativeId:d.selectedAlternativeId,revision:d.revision-1}),/stale/);
test=command(test,'apply-impact',{id:d.id,alternativeId:d.selectedAlternativeId,revision:d.revision});d=get(test,d.id);assert(impactCurrent(test,d));assert.equal(appliedDecisionEdges(test).length,2);assert.equal(acceptedDecisionsFor(test,'api-pod')[0].id,'ADR-001');assert.equal(acceptedDecisionsFor(test,'worker')[0].id,'ADR-001');
assert.throws(()=>command(test,'governance',{id:d.id,status:'approved',reviewer:'Review body',evidence:'Recorded review reference'}),/assumptions/);
test=command(test,'save',{...d,assumptionsResolved:true,assumptionEvidence:'Prototype review: channel behaviour explicitly agreed.'});assert.equal(get(test,d.id).status,'draft');assert.equal(appliedDecisionEdges(test).length,0,'Revision makes old impacts inactive');assert(get(test,d.id).history.some(h=>h.event==='Before revision'&&h.status==='accepted'));
test=command(command(test,'record',{id:d.id}),'accept',{id:d.id,acknowledge:true});test=command(test,'governance',{id:d.id,status:'approved',reviewer:'Architecture review body',evidence:'External review reference GOV-DEMO-01'});assert(governanceCurrent(get(test,d.id)));assert.equal(get(test,d.id).governance.status,'approved');
test=command(test,'review');test=command(test,'handoff',{acknowledge:true});assert(decisionReviewCurrent(test));assert(decisionHandoffCurrent(test));
// Round 12 (GR-DEC-03): a decision's linked assumption records are its assumptions too, in the check, the gates and the export.
// With no assumptions written, a linked record not confirmed in Chapter 1 still needs evidence before the assumptions are
// marked resolved, and no approval evidence is recorded while it is open, even once they are.
{
  const asm=p.artefacts.find(a=>a.type==='assumption');assert.ok(asm&&!asm.confirmed,'the reference holds an unconfirmed assumption record');
  let t=prepare(p,'ADR-002',0);t=command(t,'save',{...get(t,'ADR-002'),assumptions:'',assumptionEvidence:'',assumptionIds:[asm.id]});
  assert.ok(decisionFindings(t).some(f=>f.decisionId==='ADR-002'&&f.code==='assumptions'),'a linked assumption record is an open assumption of the decision');
  assert.ok(decisionFindings(t).some(f=>f.decisionId==='ADR-002'&&f.code==='assumption-records'&&f.detail.includes(asm.id)),'and the unconfirmed record is named');
  assert.throws(()=>command(t,'save',{...get(t,'ADR-002'),assumptionsResolved:true}),/Record evidence before confirming the assumptions \(the linked assumption records ASM-\d+ are not confirmed in Chapter 1\)/);
  t=command(t,'save',{...get(t,'ADR-002'),assumptionsResolved:true,assumptionEvidence:'Walkthrough with the settlement provider.'});
  t=command(command(t,'record',{id:'ADR-002'}),'accept',{id:'ADR-002',acknowledge:true});assert(decisionCurrent(t,get(t,'ADR-002')));
  assert.throws(()=>command(t,'governance',{id:'ADR-002',status:'approved',reviewer:'Architecture review body',evidence:'External review reference GOV-DEMO-02'}),/the linked assumption records ASM-\d+ are not confirmed in Chapter 1/);
  assert.match(exportDecisionsMarkdown(t),new RegExp('Assumption records: '+asm.id+' · [^\n]+\\(not confirmed\\)'));
  // Confirmed in Chapter 1, the record no longer holds the approval back.
  t=applyCommand(t,{type:'artefact',payload:{...t.artefacts.find(a=>a.id===asm.id),confirmed:true}}).document;
  assert(decisionCurrent(t,get(t,'ADR-002')),'a confirmation is not a change of what the decision read');
  t=command(t,'governance',{id:'ADR-002',status:'approved',reviewer:'Architecture review body',evidence:'External review reference GOV-DEMO-02'});assert.equal(get(t,'ADR-002').governance.status,'approved');
  console.log('PASS a decision that links an unconfirmed assumption record cannot have its assumptions marked resolved without evidence, and approval evidence is refused while the record is open; the export names each linked record and whether it is confirmed');
}
const source=get(test,d.id).requirementIds[0],r=test.artefacts.find(a=>a.id===source);const updated=applyCommand(test,{type:'artefact',payload:{...r,description:r.description+' A changed requirement.'}}).document;assert(decisionSourceChanged(updated,get(updated,d.id)));assert(!decisionCurrent(updated,get(updated,d.id)));assert(!governanceCurrent(get(updated,d.id),updated),'Source changes invalidate governance evidence for the current decision');assert(!decisionReviewCurrent(updated));assert(!decisionHandoffCurrent(updated));assert(acceptedDecisionsFor(updated,'api').some(a=>a.id===d.id),'Stale accepted references stay visible for review');
const qid=get(test,d.id).driverIds[0],qd=test.quality.drivers.find(q=>q.id===qid),qchanged=applyQualityCommand(test,{type:'quality.driver',payload:{...qd,targetValue:'99'}}).document;assert(decisionSourceChanged(qchanged,get(qchanged,d.id)));assert(!decisionHandoffCurrent(qchanged));
const bad=command(p,'save',{question:'An unsupported new choice',topic:'custom',context:'Context',owner:'Owner',source:'Source',requirementIds:['REQ-001'],driverIds:['QD-002']});assert.equal(bad.decisions.records.at(-1).id,'ADR-004');assert.throws(()=>command(bad,'alternative',{id:'ADR-004',title:'Broken relationship',responsibilityIds:['api'],relationships:[{from:'api',to:'hub',label:'Broken'}]}),/two different affected responsibilities/);
assert.throws(()=>command(p,'save',{question:'Bad references',requirementIds:['MISSING'],driverIds:[]}),/existing requirements/);
let conflicts=prepare(p,'ADR-001',0);const ref=get(conflicts,'ADR-001');conflicts=command(conflicts,'save',{...ref,id:undefined,question:'A second processing choice'});const second=conflicts.decisions.records.at(-1).id;for(const a of ref.alternatives)conflicts=command(conflicts,'alternative',{...a,id:second,alternativeId:undefined});conflicts=prepare(conflicts,second,1);assert(potentialDecisionConflicts(conflicts).length);assert(decisionFindings(conflicts).some(f=>f.code==='contradiction'&&f.decisionId===second));assert.throws(()=>command(conflicts,'accept',{id:second,acknowledge:true}),/content and conflict/);
conflicts=command(conflicts,'conflict',{decisionIds:['ADR-001',second],title:'Conflicting processing scopes',status:'resolved',owner:'Architect',resolution:'Separate the internal acknowledgement boundary from the externally awaited outcome.'});let c=conflicts.decisions.conflicts[0];assert(conflictResolved(conflicts,c));conflicts=command(conflicts,'save',{...get(conflicts,second),context:'Revised scope'});assert(!conflictResolved(conflicts,c));
let ready=p;for(const id of ['ADR-001','ADR-002','ADR-003']){ready=prepare(ready,id,0);ready=command(ready,'accept',{id,acknowledge:true});const d=get(ready,id);ready=command(ready,'apply-impact',{id,alternativeId:d.selectedAlternativeId,revision:d.revision})}ready=command(command(command(ready,'intake'),'review'),'handoff',{acknowledge:true});assert(decisionMilestones(ready).every(m=>m.done),'Readiness is achievable and still retains review findings');
const md=exportDecisionsMarkdown(ready);for(const token of ['ADR-001','ALT-001','QD-001','REQ-001','Governance','Assumptions','Comparison','History'])assert(md.toLowerCase().includes(token.toLowerCase()),token);
const DB=localDatabase(':memory:'),env={DB,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env)};
try{assert.equal((await api('/api/project','GET',null,null)).status,401);let state=await(await api('/api/project')).json();const payload={...state.document.decisions.records[0],question:'Persist a reviewed processing question'};const body={revision:state.revision,command:{type:'decision.save',payload}};assert.equal((await api('/api/commands','POST',body,'architect-a','https://other.test')).status,403);const saved=await api('/api/commands','POST',body);assert.equal(saved.status,200);state=await saved.json();assert.equal(state.selected,'ADR-001');assert.equal((await api('/api/commands','POST',body)).status,409);const reopened=await(await api('/api/project')).json();assert.equal(reopened.document.decisions.records[0].question,payload.question);assert.equal(reopened.document.decisions.records[0].alternatives[0].id,'ALT-001');assert.notEqual((await(await api('/api/project','GET',null,'architect-b')).json()).document.decisions.records[0].question,payload.question);const json=await api('/api/export?chapter=3&format=json');assert(json.headers.get('Content-Disposition').includes('.json'));const bundle=await json.json();assert.equal(bundle.project.decisions.records[0].id,'ADR-001');assert(Array.isArray(bundle.decisionValidation.findings));const markdown=await api('/api/export?chapter=3&format=md');assert(markdown.headers.get('Content-Disposition').includes('Decisions.md'));assert((await markdown.text()).includes(payload.question));console.log('PASS Decisions: stable ADR/alternative references; comparison evidence; draft/recorded/accepted/governance separation; reviewed ghost application; logical/physical traceability; source and revision invalidation; conflict handling; history; milestone/handoff progression; authenticated durable saving, owner isolation, concurrency, and exports.');}finally{DB.close()}

// The Chapter 3 studio through the one shell's contract (round 3, A): created from its factory with a store double
// (the real Worker and an in-memory database behind a recording command()), drawn as the shell draws it, its editors
// opened in the shell's dialog host through bind() in a happy-dom document and saved only through the store's
// commands; a decision's model impact is reviewed in its own dialog, with no page map; dispose() takes every listener
// away. Needs happy-dom (a pinned development dependency).
{
  const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
  const {pathToFileURL,fileURLToPath}=await import('node:url');
  const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
  const w=new Window({url:'https://aiw.test/?chapter=3&tab=work',width:1440,height:900});
  for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','KeyboardEvent','MouseEvent','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
  for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
  if(typeof globalThis.CSS==='undefined')globalThis.CSS={escape:v=>String(v).replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c)};
  w.document.body.innerHTML='<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
  const stored=new Map(),db=localDatabase(':memory:'),domEnv={DB:db,FILES:{async put(k,v){stored.set(k,v)},async get(k){return stored.has(k)?{text:async()=>stored.get(k)}:null},async delete(k){stored.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}};
  globalThis.fetch=(path,options={})=>worker.fetch(new Request(new URL(path,'https://aiw.test'),{...options,headers:{...options.headers,'oai-authenticated-user-id':'studio-test',Origin:'https://aiw.test'}}),domEnv);
  try{
    const call=async(path,body)=>{const r=await fetch(path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'Refused'),{conflict:r.status===409});return d;};
    let value=await call('/api/project');const commands=[];
    const store={get value(){return value},async load(){value=await call('/api/project');return value},async command(command){commands.push(command);value=await call('/api/commands',{revision:value.revision,command});return value}};
    const {createDecisionsStudio}=await import(pathToFileURL(root+'/public/decisions.js'));
    const blank=structuredClone(value.document);blank.decisions.records=[];
    const blankStudio=createDecisionsStudio({value:{document:blank}});
    // rc39: the Work frame (work-frame.js) draws the task's actions in its head, before the body, so the three are pinned as
    // the elements they are rather than in one order: the Inputs section is the pressed, current step; the frame's one
    // primary action is Create a question; the body opens with the empty note.
    const blankWork=blankStudio.work();
    assert.match(blankWork,/<button type="button" data-d-stage="inputs" aria-pressed="true" aria-current="step"[^>]*>Inputs &amp; question<\/button>/,'a new project begins at Inputs, the pressed and current step');
    assert.match(blankWork,/<div class="work-task-actions"><button type="button" class="r-btn primary" data-d-action="new-question" >Create a question<\/button>/,'with Create a question as the frame\'s one primary action');
    assert.match(blankWork,/<div class="work-body"><div class="r-empty"><h3>No design question yet\.<\/h3>/,'and a body that says there is no question yet');
    // Round 26 (D-26-13): rows never edit on Output; a blank register says so and offers the way to Work, not a dialog here.
    assert.match(blankStudio.output(),/<p class="out-records-none">No records yet\. <a href="[^"]*chapter=3&amp;tab=work">Add the first in Work →<\/a><\/p>/,'a blank Output offers the way to Work');
    assert.ok(!/data-d-action="new-question"|data-d-select=/.test(blankStudio.output()),'and no editing or selecting control of its own');
    const many=structuredClone(value.document);many.decisions.records=Array.from({length:51},(_,i)=>({...structuredClone(many.decisions.records[0]),id:'ADR-'+String(i+1).padStart(3,'0')}));
    const manyStudio=createDecisionsStudio({value:{document:many}});
    // Round 26 (D-26-13): the chapter's own records, one read-only row each with one action, "Open in Work", 50 at a time.
    {const many=manyStudio.output();
     assert.equal((many.match(/<li class="out-record" data-record="ADR-/g)||[]).length,50,'Output bounds the visible register at 50 decisions');
     assert.equal((many.match(/data-out-work="ADR-/g)||[]).length,50,'one "Open in Work" per row');assert.ok(!/data-d-select=|data-d-edit=/.test(many),'and no selecting or editing control on a row');
     assert.match(many,/<a class="btn out-record-open" data-out-work="ADR-001" href="\/\?chapter=3&amp;tab=work&amp;decision=ADR-001">Open in Work<\/a>/,'the action opens the chapter\'s Work with the record');
     const pager=/<button type="button" class="btn" data-out-more="50">Show (\d+) more<\/button><small>50 of (\d+) records shown<\/small>/.exec(many);
     assert.ok(pager&&Number(pager[2])>=51&&Number(pager[1])===Math.min(50,Number(pager[2])-50),'the rest remain reachable, a page at a time: '+(pager?.[0]||'no pager'));}
    const studio=createDecisionsStudio(store),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
    const doc0=value.document,graph=studio.graph();
    assert.deepEqual(studio.milestones().map(m=>m.id),decisionMilestones(doc0).map(m=>m.id),'readiness is the chapter\'s own milestones');
    assert.deepEqual(graph.nodes.map(n=>n.id),['project','ADR-001','ADR-002','ADR-003']);assert.ok(graph.nodes.every(n=>n.layer==='logical'),'decisions sit on the Logical layer');
    assert.match(studio.work(),/data-d-stage="inputs"[^>]*aria-pressed="true"/,'Work opens on inputs and its design question');
    assert.match(studio.validation(),/Can the choice be explained\?/);assert.match(studio.output(),/A reasoned basis for the application model/);assert.match(studio.inspector({id:'project'}),/class="record-guidance"[\s\S]*Select a record/,'arrival shows chapter guidance until selection');
    // rc39: the question picker is the Work frame's context control (work-frame.js), not part of the assistance bar: it
    // is pinned there, as the frame's one context control, with its select and the create action; the assistance bar
    // keeps Sol and Co-design.
    assert.match(studio.work(),/<div class="work-context"><div class="work-context-controls"><div class="d-question-bar"><label><span>Design question<\/span><select id="d-question-select"[^>]*>[\s\S]*?<\/select><\/label><button type="button" class="r-btn " data-d-action="new-question" >/,'the design-question bar is the Work frame\'s context control, with its select and the create action');
    assert.doesNotMatch(studio.assistance(),/d-question-bar|d-question-select/,'and not part of the assistance bar');
    assert.match(studio.assistance(),/class="r-assistant-bar"[\s\S]*data-d-action="sol"[\s\S]*data-d-action="mind"/,'which keeps Sol and Co-design');
    assert.doesNotMatch(studio.work()+studio.assistance(),/r-topbar|r-sidebar|r-tabs|r-footer|r-side-progress|d-map-card/,'no frame of its own and no page map');
    const shell={toasts:[],chapters:[]},state={chapter:3,tab:'work',selected:'project',cursor:true};
    const draw=()=>{q('#app').innerHTML=`${studio.assistance()}<section class="studio"><div class="stage tab-content">${state.tab==='work'?studio.work():state.tab==='validate'?studio.validation():studio.output()}</div><aside id="inspector">${studio.inspector({id:state.selected})}</aside></section><div id="dialog-host"></div>`;};
    const bridge={state,render(){draw()},toast(m){shell.toasts.push(m)},selectNode(id){state.selected=id;draw()},setTab(tab){state.tab=tab;draw()},setChapter(n,o){shell.chapters.push([n,o])},route(){},persist(){}};
    studio.bind(bridge);draw();
    assert.equal(state.selected,'project','binding does not invent a decision selection');
    assert.ok(document.body.classList.contains('decisions-app'));assert.equal(typeof window.aiwDecisionsPage?.choose,'function','the Chapter 3 models act through the studio');
    const submit=form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const settle=async(fn,message)=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out: '+message);};
    // The question bar chooses the decision through the shell's selection.
    const pick=q('#d-question-select');pick.value='ADR-003';pick.dispatchEvent(new Event('change',{bubbles:true}));
    assert.equal(state.selected,'ADR-003');assert.match(q('.stage').textContent,/ADR-003/);
    // A working choice through decision.choose.
    pick.value='ADR-001';q('#d-question-select').value='ADR-001';q('#d-question-select').dispatchEvent(new Event('change',{bubbles:true}));
    q('[data-d-stage="compare"]').click();
    const alt=value.document.decisions.records.find(d=>d.id==='ADR-001').alternatives[0].id;
    q(`[data-d-choose="${alt}"]`).click();await settle(()=>value.document.decisions.records.find(d=>d.id==='ADR-001').selectedAlternativeId===alt&&!studio.busy,'the working choice is saved');
    assert.equal(commands.at(-1).type,'decision.choose');
    // Recording waits for its preconditions and says why.
    q('[data-d-stage="record"]').click();assert.equal(q('[data-d-action="record"]').disabled,true);assert.match(q('#d-record-reason').textContent,/^Record decision needs: /);
    // The model impact is reviewed in its own dialog (no page map): before acceptance it says what is missing.
    const ask=document.createElement('button');ask.dataset.dAction='model';q('.stage').append(ask);ask.click();
    assert.ok(q('dialog.d-dialog[open] #d-apply-form'),'Review model impact opens the impact review in the shared dialog');
    assert.match(q('#d-apply-form').textContent,/Choose, record, and accept this alternative before applying its impact\./);q('[data-d-action="close"]').click();
    // A new design question in the shell's dialog host, through decision.save; a second editor replaces the first.
    q('[data-d-action="new-question"]').click();window.aiwDecisionsPage.newQuestion(null);assert.equal(qa('dialog').length,1,'one dialog at a time');
    const form=q('#d-question-form');form.elements.question.value='How should a duplicate instruction be detected?';form.elements.question.dispatchEvent(new Event('input',{bubbles:true}));
    submit(form);await settle(()=>!q('dialog'),'the question is saved');
    const created=value.document.decisions.records.find(d=>d.question==='How should a duplicate instruction be detected?');
    assert.ok(created&&commands.at(-1).type==='decision.save','saved through the decision.save command');assert.equal(state.selected,created.id,'the new decision is the shell\'s selection');
    assert.equal(shell.toasts.at(-1),'Working revision saved with its stable ADR reference.');
    // Escape with unsaved input asks first.
    q('[data-d-action="new-question"]').click();q('#d-question-form').elements.question.value='Draft';q('#d-question-form').elements.question.dispatchEvent(new Event('input',{bubbles:true}));
    q('dialog.d-dialog').dispatchEvent(new Event('cancel',{cancelable:true}));assert.equal(q('#d-discard').hidden,false);q('[data-d-action="discard"]').click();assert.ok(!q('dialog'));
    // Round 25 (D-25-03 to D-25-08): the comparison shows the decision reading and the suggested effects; "Breaks it" is
    // offered only for a driver of kind constraint; a suggestion is recorded only when the person saves it, as their own.
    {
      const said=(effect,reason)=>({effect,reason,evidence:'Synthetic design review notes.'}),D2=()=>value.document.decisions.records.find(d=>d.id==='ADR-002'),A2=id=>D2().alternatives.find(a=>a.id===id);
      await store.command({type:'quality.driver',payload:{kind:'constraint',title:'Post through the existing core ledger',description:'Every posting goes through the existing core ledger.',impact:'Rules out a second store of postings.',constraintIds:['CON-001'],priority:'High'}});
      const C=value.document.quality.drivers.at(-1).id;assert.equal(value.document.quality.drivers.at(-1).kind,'constraint');
      await store.command({type:'decision.save',payload:{id:'ADR-002',driverIds:[...D2().driverIds,C]}});
      await store.command({type:'decision.alternative',payload:{id:'ADR-002',alternativeId:'ALT-003',assessments:{...A2('ALT-003').assessments,[C]:said('supports','Posts through the core ledger.')}}});
      await store.command({type:'decision.alternative',payload:{id:'ADR-002',alternativeId:'ALT-004',assessments:{...A2('ALT-004').assessments,[C]:said('violates','The cache keeps its own record of postings.')}}});
      await store.command({type:'decision.alternative',payload:{id:'ADR-002',title:'Guard the posting boundary',pattern:'Protected System',summary:'A protected boundary in front of posting.',benefits:'One place to check every instruction.',costs:'Another boundary to run.',consequences:'Posting accepts only checked instructions.',assessments:{'QD-001':said('neutral','Leaves the posting record as it is.'),'QD-003':said('neutral','One more check on the path.'),[C]:said('supports','Posts through the core ledger.')}}});
      const guard=D2().alternatives.at(-1).id;draw();
      const choose=(sel,v)=>{const e=q(sel);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));};
      choose('#d-question-select','ADR-002');q('[data-d-stage="compare"]').click();q('[data-d-comparison-view="evidence"]').click();
      let stage=q('.stage').textContent;
      assert.match(stage,/Each linked driver supplies a criterion; effects are explained with reasons and evidence\. AIW shows the arithmetic on the drivers; it does not choose\./,'the comparison says what is true of the arithmetic (D-25-07)');
      assert.doesNotMatch(stage,/No score or automatic winner|favou?r|scored|winner/i);
      // "Breaks it" in the comparison editor: for the constraint driver only. (Recording it through the editor and the
      // change review is checked in the browser, tradeoff-browser-validate.mjs; this document cannot read the editor's
      // relationship rows back.)
      q('[data-d-edit-option="ALT-004"][data-step="1"]').click();
      const offered=id=>[...q(`.d-dialog [name="effect:${id}"]`).options].map(o=>o.value);
      assert.ok(offered(C).includes('violates'),'"Breaks it" is offered for '+C+', a constraint driver');
      // The option the editor marks selected (this document's select.value does not read the selected attribute reliably).
      const marked=id=>q(`.d-dialog [name="effect:${id}"] option[selected]`)?.value;
      assert.equal(marked(C),'violates','the recorded "Breaks it" stands in the editor');
      for(const id of ['QD-001','QD-003','QD-005'])assert.ok(!offered(id).includes('violates'),id+' is not a constraint: "Breaks it" is not offered');
      q('.d-dialog [data-d-action="close"]').click();assert.ok(!q('dialog.d-dialog'),'closed unchanged, without asking');
      // The change review is worked out from the whole project before it opens: a longer wait than settle's two seconds.
      const until=async(fn,message,ms=30000)=>{const end=Date.now()+ms;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('Timed out: '+message);};
      // A browser's select takes the value of its option marked selected; this document reads the one before it, so the
      // form is given the values its markup states before it is sent.
      const apply=async(reason,saved,message)=>{for(const s of q('#d-alternative-form').querySelectorAll('select')){const o=s.querySelector('option[selected]');if(o)s.value=o.value;}submit(q('#d-alternative-form'));await until(()=>q('.d-dialog [data-dialog-review] [data-reviewed]'),'the change review opens inside the editor');const r=q('.d-dialog [data-dialog-review]');r.querySelector('[data-reviewed]').checked=true;r.querySelector('[name=reason]').value=reason;r.querySelector('[data-wb-action="apply-preview"]').click();await until(()=>saved()&&!studio.busy,message);};
      // The reading beside the comparison, in its own sentences; the suggestion, labelled and with its source.
      draw();choose('[data-d-compare="1"]',guard);choose('[data-d-criterion]','QD-005');
      stage=q('.stage').textContent;const reading=q('.d-reading').textContent;
      assert.match(reading,/ALT-003 · Enforce the reference at the posting boundary\+4Enforce the reference at the posting boundary leads on the drivers\./);
      assert.match(reading,/ALT-004 · Suppress repeats in the application cache−4Suppress repeats in the application cache is ruled out: it breaks QD-007, a hard constraint\./);
      assert.match(reading,new RegExp(guard+' · Guard the posting boundary\\+3, between 0 and \\+6 once the unstated effects are knownRanks 2 of 2 on the drivers\\.'));
      assert.match(reading,/One weighed effect is not stated; stating it could change the lead: Guard the posting boundary’s on QD-005\.[\s\S]*Hypothesis, not a result: if the suggested effects were recorded, Guard the posting boundary would lead instead of Enforce the reference at the posting boundary\.[\s\S]*Arithmetic on the recorded effects, not a measurement; it does not choose\./);
      const card=[...document.querySelectorAll('.d-assessments>article')].find(a=>a.textContent.includes(guard));
      assert.match(card.textContent,/Suggestion · not counted[\s\S]*Suggests Supports: The SA Playbook marks the Protected System pattern as strong support for security\.[\s\S]*Source ?SA Playbook, [\s\S]*Use this suggestion/);
      // "Use this suggestion" fills the editor; nothing is recorded until the person saves, and what they save is theirs.
      const before=JSON.stringify(value.document),sent=commands.length;
      card.querySelector('[data-d-suggest]').click();
      assert.ok(q('dialog.d-dialog #d-alternative-form'),'the comparison editor opens');
      const f2=q('#d-alternative-form');
      assert.equal(marked('QD-005'),'supports','the editor is filled with the suggested effect');assert.match(f2.elements['reason:QD-005'].value,/The SA Playbook marks the Protected System pattern as strong support for security\./);assert.match(f2.elements['evidence:QD-005'].value,/^SA Playbook, /);
      assert.match(q('.d-dialog .d-suggested').textContent,/Filled from a suggestion[\s\S]*Nothing is recorded until you save; what you save is your own judgement\./);
      assert.equal(JSON.stringify(value.document),before,'nothing is recorded before the save');assert.equal(commands.length,sent,'and no command is sent');
      await apply('Recorded from the SA Playbook\'s mark, reviewed for this design.',()=>A2(guard).assessments['QD-005']?.effect==='supports','the suggestion is saved by the person');
      assert.ok(!Object.hasOwn(A2(guard).assessments['QD-005'],'by'),'what the person saved carries no drafted mark');
      assert.equal(commands.at(-1).type,'workspace.apply');assert.equal(commands.at(-1).payload.commands[0].type,'decision.alternative','recorded through decision.alternative, reviewed by the person');assert.equal(commands.at(-1).payload.reviewed,true);
      draw();choose('[data-d-compare="1"]',guard);
      assert.match(q('.d-reading').textContent,/Guard the posting boundary\+6Guard the posting boundary leads on the drivers\./,'the reading moves only once the person saved it');
      assert.ok(value.document.decisions.records.every(d=>!Object.hasOwn(d,'reading')),'nothing the reading computes is saved');
      console.log('PASS round 25: the comparison says AIW shows the arithmetic and does not choose; it shows the reading on the drivers (totals, the range of unstated effects, ruled out, the lead, ranks, the unstated effects that matter and the labelled hypothesis) with its note; the comparison editor offers "Breaks it" only for a constraint driver; a suggested effect is shown with its source, not counted, fills the editor through "Use this suggestion", is recorded only when the person saves it through decision.alternative and the change review, carries no drafted mark, and only then moves the reading');
    }
    assert.equal(location.href,'https://aiw.test/?chapter=3&tab=work','the studio itself never navigates the document');
    studio.dispose();
    assert.ok(!document.body.classList.contains('decisions-app')&&window.aiwDecisionsPage===undefined,'dispose() takes the chapter\'s class and bridge away');
    const before=commands.length;q('[data-d-action="new-question"]')?.click();q('[data-d-stage="inputs"]')?.click();
    assert.ok(!q('dialog')&&commands.length===before,'after dispose() no listener of the studio answers');
    console.log('PASS Chapter 3 studio through the shell contract: surfaces as HTML for the shell\'s stage, details and assistance bar with the design-question bar, decisions on the Logical layer, milestones as readiness; the question bar and a new decision go through the shell\'s selection; choose and save through decision commands, one dialog at a time in the shell\'s dialog host; recording waits for its preconditions; the model impact is reviewed in its own dialog; Escape asks before discarding; dispose() removes every listener, the class and the bridge.');
  }finally{db.close();await w.happyDOM.close();}
}

// ---------------------------------------------------------------- round 12 (D4): assessments follow the drivers; citations
// GR-DEC-04: a driver added to a decision gives every alternative an "unknown" assessment for it, and a driver removed
// takes its entries away; the other assessments are kept as they were.
{
  let q=withDecisions(seedProject());const d0=structuredClone(get(q,'ADR-001')),added=q.quality.drivers.find(x=>!d0.driverIds.includes(x.id)).id;
  assert.ok(d0.alternatives.length>=2&&d0.driverIds.length>=2,'the reference decision compares alternatives against several drivers');
  q=command(q,'save',{id:'ADR-001',driverIds:{add:[added]}});
  assert.deepEqual(get(q,'ADR-001').driverIds,[...d0.driverIds,added]);
  for(const a of get(q,'ADR-001').alternatives){
    assert.deepEqual(a.assessments[added],{effect:'unknown',reason:'',evidence:''},a.id+': the added driver is assessed as unknown');
    for(const id of d0.driverIds)assert.deepEqual(a.assessments[id],d0.alternatives.find(x=>x.id===a.id).assessments[id],a.id+': '+id+' keeps its assessment');
  }
  const removed=d0.driverIds[0];q=command(q,'save',{id:'ADR-001',driverIds:{remove:[removed]}});
  for(const a of get(q,'ADR-001').alternatives){assert.ok(!Object.hasOwn(a.assessments,removed),a.id+': the removed driver leaves no entry');assert.deepEqual(Object.keys(a.assessments).sort(),[...get(q,'ADR-001').driverIds].sort(),a.id+': one entry per driver of the decision');}
  console.log('PASS GR-DEC-04: a driver added to a decision gives each of its '+d0.alternatives.length+' alternatives an unknown assessment for it, a driver removed takes its entries away, and the other assessments are kept');
}
// GR-REQ-14: a decision whose context cites a requirement by its workbook id without linking it raises the one grouped
// cause Chapters 6-10 raise (requirement-links.js citedNotes, one reader), and linking the requirement clears it.
{
  const {citedNotes}=await import('./public/requirement-links.js');
  const base=withDecisions(seedProject()),linked=new Set(get(base,'ADR-002').requirementIds),req=base.artefacts.find(a=>a.type==='requirement'&&!linked.has(a.id));
  req.externalId='WB-7.2';
  let q=command(base,'save',{id:'ADR-002',context:get(base,'ADR-002').context+' Workbook line WB-7.2 asks for this.'});
  const cited=decisionFindings(q).filter(f=>f.code==='cited-not-linked');
  assert.equal(cited.length,1,'one grouped finding');
  assert.deepEqual(cited[0].items,[{objectId:'ADR-002',requirementIds:[req.id]}],'it names the decision and the requirement its words cite');
  let same=null;citedNotes(q,[get(q,'ADR-002')],(code,key,title,detail,level,extra)=>{same={id:code+':'+key,code,title,detail,level,...extra};});
  assert.deepEqual({id:cited[0].id,code:cited[0].code,title:cited[0].title,detail:cited[0].detail,level:cited[0].level,items:cited[0].items},same,'the cause, its wording and its items are the shared reader\'s, as in Chapters 6-10');
  assert.equal(cited[0].id,'cited-not-linked:cited');
  q=command(q,'save',{id:'ADR-002',requirementIds:{add:[req.id]}});
  assert.equal(decisionFindings(q).filter(f=>f.code==='cited-not-linked').length,0,'linking the requirement clears it');
  console.log('PASS GR-REQ-14: a decision whose context cites a requirement by its workbook id without linking it raises the one grouped "cited-not-linked" cause of Chapters 6-10, from the same reader; linking it clears the finding');
}

// ---------------------------------------------------------------- bounds (round 5, R5-G)
// A workspace keeps up to 500 records of a collection (2,000 relationships and fields): at the bound the next one is
// refused with the workspace's wording and nothing changes; one under it, the next is accepted and the bound is reached.
import * as boundsMemo from './public/document-memo.js';
import * as boundsReview from './public/review-domain.js';
import * as boundsSeed from './public/requirements-domain.js';
{
  const base = boundsReview.withFinalReview(boundsSeed.seedProject()), at = '2026-10-02T12:00:00.000Z';
  const filled = (limit, list, make) => { const p = boundsMemo.documentClone(base), xs = list(p); for (let n = 0; xs.length < limit; n++) xs.push(make(p, n)); return p; };
  const bound = (what, limit, list, make, apply, command, words) => {
    const full = filled(limit, list, make), before = JSON.stringify(full);
    assert.throws(() => apply(full, command(full), at), words, what + ': the ' + (limit + 1) + 'st is refused');
    assert.equal(JSON.stringify(full), before, what + ': a refused record changes nothing');
    const under = filled(limit - 1, list, make), after = apply(under, command(under), at).document;
    assert.equal(list(after).length, limit, what + ': the last one under the bound is accepted');
  };
  const {applyDecisionCommand: applyD, DECISION_LIMITS: DL} = await import('./public/decisions-domain.js');
  assert.equal(DL.records, 500);
  bound('decisions', DL.records, p => p.decisions.records, (p, n) => ({...structuredClone(p.decisions.records[0]), id: 'ADR-B' + n, question: 'Bound question ' + n + '?'}), applyD, () => ({type: 'decision.save', payload: {question: 'One question more?', requirementIds: [], driverIds: []}}), /^Error: This workspace keeps up to 500 decision questions\.$/);
  console.log('PASS decisions are bounded at 500: the 501st is refused with "This workspace keeps up to 500 decision questions." and the 500th accepted');
}
