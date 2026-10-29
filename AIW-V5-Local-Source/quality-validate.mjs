import assert from 'node:assert/strict';
import {seedProject,applyCommand} from './public/requirements-domain.js';
import {QUALITY_TYPES,ADDED_QUALITY_TYPES,playbookDriverProposal,withQuality,applyQualityCommand,qualityFindings,qualityMilestones,qualityReviewCurrent,qualityHandoffCurrent,orderedDrivers,sourceChanged,targetIsMeasurable,potentialTradeoffs,conflictIsResolved,qualityProposals,qualityGuidance,exportQualityMarkdown} from './public/quality-domain.js';
import worker from './worker.js';
import {applyRecordCommand} from './public/canonical-command.js';
import {localDatabase} from './local-db.js';
const original=seedProject(),p=withQuality(original),q=(p,type,payload={})=>applyQualityCommand(p,{type:'quality.'+type,payload}).document;
assert.equal(original.quality,undefined,'Legacy input is not mutated');
assert.deepEqual(p.artefacts,original.artefacts);assert.deepEqual(p.relationships,original.relationships);
assert.equal(p.quality.drivers.length,6);assert(p.quality.drivers.every(d=>!d.targetConfirmed&&!d.confirmed&&d.origin==='reference'));
assert(p.quality.drivers.every(targetIsMeasurable));assert(p.quality.drivers.every(d=>d.requirementIds.length&&d.responsibilityIds.length));
assert.deepEqual(p.quality.drivers.map(d=>d.id),['QD-001','QD-002','QD-003','QD-004','QD-005','QD-006']);
let draft=q(p,'driver',{category:'performance',title:'Test an investigation lookup'}),d=draft.quality.drivers.at(-1);
assert.equal(d.id,'QD-007');assert.equal(d.scenarioId,'QS-007');
assert(qualityFindings(draft).some(f=>f.driverId===d.id&&f.code==='measurement'));assert(qualityFindings(draft).some(f=>f.driverId===d.id&&f.code==='requirements'));
assert.throws(()=>q(draft,'driver',{...d,targetConfirmed:true}),/measurable/);
assert.throws(()=>q(draft,'driver',{...d,requirementIds:['REQ-missing']}),/existing Chapter 1/);
assert.throws(()=>q(draft,'driver',{...d,responsibilityIds:['unknown']}),/existing application/);
for(const value of ['', '-1','Infinity','NaN'])assert(!targetIsMeasurable({...p.quality.drivers[0],targetValue:value}));
assert(!targetIsMeasurable({...p.quality.drivers[1],targetValue:'101'}));
assert(!targetIsMeasurable({...p.quality.drivers[0],measurement:'Verify [the response]'}));
// GR-DRV-03 (round 23): a window or a measurement that is only a dash states nothing, so the target is not measurable.
for(const k of ['window','measurement','metric'])for(const v of ['-','–','—',' — '])assert(!targetIsMeasurable({...p.quality.drivers[0],[k]:v}),k+' '+JSON.stringify(v));
assert(targetIsMeasurable({...p.quality.drivers[1]}),'a percentage unit still states its unit');
const before=JSON.stringify(draft);const proposal=qualityProposals(draft,d,'validate')[0];assert.equal(proposal.id,'measurement');assert.equal(JSON.stringify(draft),before,'Ghost suggestions do not mutate the project');
// Round 12 (GR-GOV-24): a driver leaves through the one retire path, with why (the hard delete is refused); its number is not reused.
assert.throws(()=>q(draft,'delete',{id:d.id}),/leaves the design through Retire/);draft=applyRecordCommand(draft,{type:'record.retire',payload:{ids:[d.id],chapter:2,reason:'Replaced by a new lookup scenario.'}}).document;draft=q(draft,'driver',{category:'performance',title:'A new lookup scenario'});assert.equal(draft.quality.drivers.at(-1).id,'QD-008');
assert.equal(orderedDrivers(p)[0].id,'QD-001');assert.equal(orderedDrivers(q(p,'move',{id:'QD-004',direction:'up'}))[0].id,'QD-004');
assert(potentialTradeoffs(p,p.quality.drivers[0]).some(t=>t.driverIds.includes('QD-003')));
let conflicted=q(p,'conflict',{driverIds:['QD-001','QD-003'],title:'Integrity versus acknowledgement time',effect:'Checks contribute to acknowledgement latency.'});
let conflict=conflicted.quality.conflicts[0];assert.equal(conflict.id,'QC-001');assert(qualityFindings(conflicted).some(f=>f.code==='conflict'));
assert.throws(()=>q(conflicted,'conflict',{...conflict,status:'resolved'}),/resolution and accountable owner/);
conflicted=q(conflicted,'conflict',{...conflict,status:'resolved',resolution:'Preserve duplicate detection and measure the complete protected path.',owner:'Payments architect'});conflict=conflicted.quality.conflicts[0];assert(conflictIsResolved(conflicted,conflict));
conflicted=q(conflicted,'driver',{...conflicted.quality.drivers[0],targetValue:'1',targetConfirmed:false});assert(!conflictIsResolved(conflicted,conflict),'A changed driver reopens the resolution for review');
let reviewed=q(q(p,'intake'),'review');assert(qualityReviewCurrent(reviewed));assert.throws(()=>q(reviewed,'handoff'),/Acknowledge/);reviewed=q(reviewed,'handoff',{acknowledge:true});assert(qualityHandoffCurrent(reviewed));
const req=reviewed.artefacts.find(a=>a.id===reviewed.quality.drivers[0].requirementIds[0]);
const revised=applyCommand(reviewed,{type:'artefact',payload:{...req,description:req.description+' Revised required behaviour.'}}).document;
assert.equal(revised.quality.drivers[0].id,'QD-001');assert(sourceChanged(revised,revised.quality.drivers[0]));assert(!qualityReviewCurrent(revised));assert(!qualityHandoffCurrent(revised));
assert(qualityFindings(revised).some(f=>f.code==='source-change'));const reconciled=q(revised,'driver',{...revised.quality.drivers[0],confirmed:true});assert(!sourceChanged(reconciled,reconciled.quality.drivers[0]));
// Round 12 (GR-GOV-24): a requirement no longer leaves while a driver names it (the one retire path refuses, and the hard
// delete is gone); a driver that names a requirement the project no longer holds (a document written before) is still a finding.
assert.throws(()=>applyCommand(reviewed,{type:'deleteArtefact',payload:{id:req.id}}),/leaves the design through Retire/);
const removed={...reviewed,artefacts:reviewed.artefacts.filter(a=>a.id!==req.id)};assert(qualityFindings(removed).some(f=>f.code==='broken-requirement'));
let ready=withQuality(seedProject());for(const a of [...ready.artefacts].filter(a=>a.type==='requirement'))ready=applyCommand(ready,{type:'artefact',payload:{...a,confirmed:true}}).document;
for(const d of [...ready.quality.drivers])ready=q(ready,'driver',{...d,targetConfirmed:true,confirmed:true});ready=q(q(q(ready,'intake'),'review'),'handoff');assert.deepEqual(qualityFindings(ready),[]);assert(qualityMilestones(ready).every(m=>m.done));
assert.notEqual(qualityGuidance(p,p.quality.drivers[0],'model').next,qualityGuidance(p,p.quality.drivers[0],'output').next);
const md=exportQualityMarkdown(reviewed);for(const s of ['QD-001','QS-001','REQ-003','assumption','Candidate tactic','Chapter 3 handoff'])assert(md.includes(s),s);
const DB=localDatabase(':memory:'),env={DB,ASSETS:{fetch:()=>new Response('asset')}};
const reqApi=async(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{
  const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}
  return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env);
};
try{
  assert.equal((await reqApi('/api/project','GET',null,null)).status,401);
  let state=await (await reqApi('/api/project')).json();assert.equal(state.document.quality.drivers.length,6);
  const driver={...state.document.quality.drivers[0],title:'Persist a reviewed integrity scenario',targetValue:'0',targetConfirmed:true,confirmed:true};
  const change={revision:state.revision,command:{type:'quality.driver',payload:driver}};
  assert.equal((await reqApi('/api/commands','POST',change,'architect-a','https://elsewhere.test')).status,403);
  const saved=await reqApi('/api/commands','POST',change);assert.equal(saved.status,200);state=await saved.json();assert.equal(state.selected,'QD-001');
  assert.equal((await reqApi('/api/commands','POST',change)).status,409,'Stale quality writes are rejected');
  const reopened=await (await reqApi('/api/project')).json();assert.equal(reopened.document.quality.drivers[0].title,driver.title);assert.equal(reopened.document.quality.drivers[0].scenarioId,'QS-001');assert(reopened.document.quality.drivers[0].targetConfirmed);
  const other=await (await reqApi('/api/project','GET',null,'architect-b')).json();assert.notEqual(other.document.quality.drivers[0].title,driver.title);
  const jsonResponse=await reqApi('/api/export?chapter=2&format=json');assert.equal(jsonResponse.status,200);assert(jsonResponse.headers.get('Content-Disposition').includes('.json'));const bundle=await jsonResponse.json();assert.equal(bundle.project.quality.drivers[0].id,'QD-001');assert(Array.isArray(bundle.qualityValidation.findings));
  const mdResponse=await reqApi('/api/export?chapter=2&format=md');assert.equal(mdResponse.status,200);assert(mdResponse.headers.get('Content-Disposition').includes('Quality'));const text=await mdResponse.text();assert(text.includes(driver.title));assert(text.includes('QS-001'));
  console.log('PASS Quality scenarios: stable references; legacy project preservation; assumptions and measurable targets; requirement/responsibility validation; named prioritisation; conflict resolution invalidation; ghost non-mutation; source-change review; complete progress and handoff; durable API reopen, authentication, owner isolation, concurrency, and exports.');
}finally{DB.close()}

// The Chapter 2 studio through the one shell's contract (round 3, A): created from its factory with a store double
// (the real Worker and an in-memory database behind a recording command()), drawn as the shell draws it, its editors
// opened in the shell's dialog host through bind() in a happy-dom document and saved only through the store's
// commands; dispose() takes every listener away. Needs happy-dom (a pinned development dependency).
{
  const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
  const {pathToFileURL,fileURLToPath}=await import('node:url');
  const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
  const w=new Window({url:'https://aiw.test/?chapter=2&tab=work',width:1440,height:900});
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
    const {createQualityStudio}=await import(pathToFileURL(root+'/public/quality.js'));const {driverQuestions}=await import(pathToFileURL(root+'/public/design-questions.js'));
    const studio=createQualityStudio(store),q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
    const doc0=value.document,graph=studio.graph();
    assert.deepEqual(studio.milestones().map(m=>m.id),qualityMilestones(doc0).map(m=>m.id),'readiness is the chapter\'s own milestones');
    assert.deepEqual(graph.nodes.map(n=>n.id),['project',...orderedDrivers(doc0).map(d=>d.id)],'the project, then the drivers in their priority order');
    assert.ok(graph.nodes.every(n=>n.layer==='process'));
    assert.match(studio.work(),/data-q-from-requirement="REQ-004"/,'Work opens on the requirements it starts from');
    assert.match(studio.validation(),/<h2>Review driver definitions and evidence<\/h2><p>Check architectural impact and priority; quality scenarios also need measurable responses and targets\.<\/p>/,'the Validate frame opens with the chapter\'s title and purpose');assert.match(studio.output(),/The prioritised architectural driver brief/);
    assert.match(studio.inspector({id:'project'}),/class="record-guidance"[\s\S]*Select a record/,'arrival shows chapter guidance until an explicit record selection');
    assert.match(studio.assistance(),/id="q-page-error"[\s\S]*class="r-assistant-bar"[\s\S]*data-q-action="sol"[\s\S]*data-action="cursor"/);
    assert.doesNotMatch(studio.work()+studio.assistance(),/r-topbar|r-sidebar|r-tabs|r-footer|r-side-progress|q-map-card/,'no frame of its own and no page map');
    const shell={toasts:[],chapters:[]},state={chapter:2,tab:'work',selected:'project',cursor:true};
    const draw=()=>{q('#app').innerHTML=`${studio.assistance()}<section class="studio"><div class="stage tab-content">${state.tab==='work'?studio.work():state.tab==='validate'?studio.validation():studio.output()}</div><aside id="inspector">${studio.inspector({id:state.selected})}</aside></section><div id="dialog-host"></div>`;};
    const bridge={state,render(){draw()},toast(m){shell.toasts.push(m)},selectNode(id){state.selected=id;draw()},setTab(tab){state.tab=tab;draw()},setChapter(n,o){shell.chapters.push([n,o])},route(){},persist(){}};
    studio.bind(bridge);draw();
    assert.equal(state.selected,'project','binding does not invent a record selection');
    assert.ok(document.body.classList.contains('quality-app'),'the chapter\'s own styles apply while it is open');assert.equal(typeof window.aiwQualityPage?.tune,'function');
    const submit=form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    const settle=async(fn,message)=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out: '+message);};
    // A scenario added for REQ-004: the three-step editor in the shell's dialog host, saved through quality.driver.
    q('details:has([data-q-from-requirement="REQ-004"]) [data-q-from-requirement="REQ-004"]').click();
    const form=q('dialog.q-dialog[open] #q-driver-form');assert.ok(form,'the scenario editor opens through the shared dialog');
    assert.deepEqual(qa('[data-q-panel]').map(p=>p.hidden),[false,true,true],'it opens on its first step');
    q('[data-q-form-step="2"]').click();assert.deepEqual(qa('[data-q-panel]').map(p=>p.hidden),[false,true,true],'an empty required title keeps the first step open');assert.equal(form.elements.title.getAttribute('aria-invalid'),'true','and is announced beside the field');form.elements.title.value='Hold an uncertain settlement';q('[data-q-form-step="2"]').click();assert.deepEqual(qa('[data-q-panel]').map(p=>p.hidden),[true,true,false],'a valid step lets the wizard move on');
    assert.ok(form.querySelector('input[name="requirementIds"][value="REQ-004"]').checked,'linked to the requirement it was added for');
    // The Chapter 2 models open editors through the studio's bridge; a second editor replaces the first.
    window.aiwQualityPage.add();assert.equal(qa('dialog').length,1,'one dialog at a time');assert.equal(q('#q-dialog-title').textContent,'Add a driver');
    q('[data-q-action="close"]').click();assert.ok(!q('dialog'));
    q('details:has([data-q-from-requirement="REQ-004"]) [data-q-from-requirement="REQ-004"]').click();
    const editor=q('#q-driver-form');editor.elements.title.value='Hold an uncertain settlement';editor.elements.title.dispatchEvent(new Event('input',{bubbles:true}));
    submit(editor);await settle(()=>!q('dialog'),'the scenario is saved');
    const saved=value.document.quality.drivers.find(d=>d.title==='Hold an uncertain settlement');
    assert.ok(saved&&commands.at(-1).type==='quality.driver','saved through the quality.driver command');assert.deepEqual(saved.requirementIds,['REQ-004']);
    assert.equal(state.selected,saved.id,'the saved driver is the shell\'s selection');assert.match(q('#inspector').textContent,new RegExp(saved.id));
    assert.ok(q(`#q-driver-list [data-q-select="${saved.id}"]`),'Work shows it in the register');assert.equal(shell.toasts.at(-1),'Driver saved with its stable code.');
    window.aiwQualityPage.add();const other=q('#q-driver-form');other.elements.kind.value='functional';other.elements.kind.dispatchEvent(new Event('change',{bubbles:true}));
    assert.equal(q('[data-q-form-step="1"]').hidden,true,'non-quality drivers skip the measurement step');
    assert.match(q('[data-q-panel="0"] [data-q-action="form-next"]').textContent,/traceability & priority/i);
    other.elements.title.value='Preserve settlement intent';other.elements.title.dispatchEvent(new Event('input',{bubbles:true}));q('[data-q-form-step="2"]').click();
    assert.deepEqual(qa('[data-q-panel]').map(p=>p.hidden),[true,true,false],'non-quality driver reaches traceability directly');
    q('[data-q-action="close"]').click();q('[data-q-action="discard"]').click();
    // A conflict editor; Escape with unsaved input asks first.
    q('[data-q-section="conflicts"]').click();q('[data-q-action="add-conflict"]').click();const conflict=q('#q-conflict-form');assert.ok(conflict);
    conflict.elements.title.value='Integrity against latency';conflict.elements.title.dispatchEvent(new Event('input',{bubbles:true}));
    q('dialog.q-dialog').dispatchEvent(new Event('cancel',{cancelable:true}));assert.equal(q('#q-discard').hidden,false,'Escape asks before discarding');q('[data-q-action="discard"]').click();assert.ok(!q('dialog'));
    // Checks through quality.review, then the handoff opens Chapter 3 in place, through the shell.
    state.tab='validate';draw();q('[data-q-action="validate"]').click();await settle(()=>commands.at(-1)?.type==='quality.review'&&!studio.busy,'checks recorded');
    state.tab='output';draw();q('[data-q-action="handoff"]').click();const handoff=q('#q-handoff-form');assert.ok(handoff,'the handoff editor opens');
    if(handoff.elements.acknowledge)handoff.elements.acknowledge.checked=true;submit(handoff);await settle(()=>shell.chapters.length,'the handoff moves to Chapter 3');
    assert.equal(commands.at(-1).type,'quality.handoff');assert.deepEqual(shell.chapters.at(-1),[3,{keepTab:true}]);assert.equal(state.tab,'work');
    assert.equal(location.href,'https://aiw.test/?chapter=2&tab=work','the studio itself never navigates the document');
    // rc39 (PLAN §4.3.1): the driver's record card says what it asks of the design, from the one projection
    // (design-questions.js driverQuestions): attribute and family, the questions it opens with the chapter each is
    // decided in and where it lands by state, the playbook's tactics; the register row counts the same questions.
    {
      const dq=driverQuestions(value.document,'QD-003');
      state.selected='QD-003';state.tab='work';draw();q('[data-q-section="scenarios"]').click();
      const asks=q('#inspector .record-card [data-design-asks="QD-003"]');assert.ok(asks,'the section is on the driver card');
      assert.match(asks.querySelector('h3').textContent,/^What this driver asks of the design$/);
      assert.match(asks.querySelector('p').textContent,/^Performance · Performance and scale family · a response-time or acknowledgement target$/,'attribute, family and target shape in words');
      assert.deepEqual(qa('#inspector [data-design-question]').map(li=>li.dataset.designQuestion),dq.questions.map(x=>x.id),'the questions the projection opens, in its order');
      const first=q('#inspector [data-design-question="read-path"]');assert.match(first.querySelector('b').textContent,/^Read from the authority or keep a bounded read copy\?$/);
      assert.match(first.querySelector('small').textContent,/decided in Chapter 5\s+· lands on 3 records · 3 open/,'where it is decided and where it lands, by state');
      assert.match(first.querySelector('a').getAttribute('href'),/chapter=5&tab=work&object=api-pod/,'the chapter link opens that chapter\'s Work on the first record it lands on');
      assert.ok(qa('#inspector .q-design-tactics li').some(li=>/Caching · /.test(li.textContent)),'the playbook\'s tactics for the attribute, with their group');
      assert.match(q('#q-driver-list [data-work-record-row="QD-003"] small').textContent,new RegExp('opens '+dq.questions.length+' design questions · '+dq.counts.decided+' decided$'),'the register row counts from the projection');
      assert.match(q('#q-driver-list [data-work-record-row="QD-001"] small').textContent,/opens \d+ design questions · \d+ decided$/);
      state.selected='project';draw();
    }
    studio.dispose();
    assert.ok(!document.body.classList.contains('quality-app')&&window.aiwQualityPage===undefined,'dispose() takes the chapter\'s class and bridge away');
    const before=commands.length;q('[data-q-action="add"]')?.click();q('[data-q-section="scenarios"]')?.click();
    assert.ok(!q('dialog')&&commands.length===before,'after dispose() no listener of the studio answers');
    console.log('PASS Chapter 2 studio through the shell contract: surfaces as HTML for the shell\'s stage, details and assistance bar, drivers on the Process layer in priority order, milestones as readiness; the three-step editor in the shell\'s dialog host, one at a time, saved only through quality commands, the saved driver becoming the shell\'s selection; Escape asks before discarding; the handoff opens Chapter 3 through the shell; the driver card says what the driver asks of the design and the register row counts it, both from the design-questions projection (rc39); dispose() removes every listener, the class and the bridge.');
  }finally{db.close();await w.happyDOM.close();}
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
  const {applyQualityCommand: applyQ, QUALITY_LIMITS: QL} = await import('./public/quality-domain.js');
  assert.equal(QL.drivers, 500);
  bound('quality drivers', QL.drivers, p => p.quality.drivers, (p, n) => ({...structuredClone(p.quality.drivers[0]), id: 'QD-B' + n, scenarioId: 'QS-B' + n, title: 'Bound driver ' + n}), applyQ, () => ({type: 'quality.driver', payload: {category: 'performance', title: 'One driver more', requirementIds: [], responsibilityIds: []}}), /^Error: This workspace keeps up to 500 quality scenarios\.$/);
  console.log('PASS quality drivers are bounded at 500: the 501st is refused with "This workspace keeps up to 500 quality scenarios." and the 500th accepted');
}
// Round 11: four more categories (compliance, privacy, cost, capacity), and round 12 two more (reliability,
// operability), accepted everywhere a category is chosen.
{
 assert.deepEqual(ADDED_QUALITY_TYPES.map(t=>t.id),['compliance','privacy','cost','capacity','reliability','operability']);assert.equal(QUALITY_TYPES.length,18);
 for(const t of ADDED_QUALITY_TYPES){assert.ok(t.name&&t.description&&t.guidance?.stimulus&&t.guidance?.metric&&['protection','efficiency','reliability'].includes(t.family),t.id+' has a name, a description, stimulus and metric guidance and a family');assert.ok(!t.playbook,t.id+' is not claimed as a playbook attribute');}
 let r=p;const before=orderedDrivers(r).map(d=>d.id),req=r.artefacts.find(a=>a.type==='requirement').id;
 for(const t of ADDED_QUALITY_TYPES)r=q(r,'driver',{category:t.id,title:'A '+t.name.toLowerCase()+' scenario',stimulus:t.guidance.stimulus,conditions:'Normal operation.',response:'Say what happens.',metric:t.guidance.metric,operator:'At most',targetValue:'1',unit:'days',window:'Each quarter',measurement:'Count them each quarter.',priority:'Supporting',rationale:'Supporting: it matters, after the six above.',owner:'Test owner',source:'Test fixture',requirementIds:[req],responsibilityIds:['api']});
 assert.deepEqual(r.quality.drivers.slice(-6).map(d=>d.category),['compliance','privacy','cost','capacity','reliability','operability']);assert.ok(r.quality.drivers.slice(-6).every(targetIsMeasurable));
 // Round 12 (GR-DRV-08): a reliability driver and an operability driver save with their own stimulus and metric guidance.
 for(const id of ['reliability','operability']){const t=QUALITY_TYPES.find(x=>x.id===id),d=r.quality.drivers.find(x=>x.category===id);assert.deepEqual([d.stimulus,d.metric,t.family],[t.guidance.stimulus,t.guidance.metric,'reliability'],id+' keeps its stimulus and metric guidance');}
 assert.deepEqual(orderedDrivers(r).slice(0,before.length).map(d=>d.id),before,'the existing drivers keep their order: a category takes part in no score');
 assert.match(exportQualityMarkdown(r),/Scenario: QS-\d+ · Compliance/);
 for(const t of ADDED_QUALITY_TYPES){const miss=playbookDriverProposal(p,t.id);assert.equal(miss.record.category,t.id);assert.equal(miss.record.origin,'suggestion');assert.equal(miss.record.confirmed,false);}
 const covered={...p,workspace:{template:'blank'},quality:{...p.quality,drivers:p.quality.drivers.concat(QUALITY_TYPES.filter(t=>t.playbook).map((t,i)=>({...p.quality.drivers[0],id:'QD-P'+i,category:t.id})))}};
 const missing=qualityProposals(covered,null,'work').find(x=>x.id==='missing');assert.ok(missing&&missing.record.category==='compliance'&&missing.record.title==='Define compliance','with every playbook category covered, the next missing category is compliance, offered as an empty scenario on any template');
 assert.throws(()=>q(p,'driver',{category:'nonsense',title:'x'}),/Choose a quality concern/);
 // Round 12 (GR-DRV-09): every quality concern no driver covers is offered once, in one proposal list.
 const three=['testability','privacy','operability'],most={...p,quality:{...p.quality,drivers:p.quality.drivers.concat(QUALITY_TYPES.filter(t=>!p.quality.drivers.some(d=>d.category===t.id)&&!three.includes(t.id)).map((t,i)=>({...p.quality.drivers[0],id:'QD-M'+i,category:t.id})))}};
 const offered=qualityProposals(most,null,'work').filter(x=>x.id==='missing'||x.id.startsWith('missing:'));
 assert.deepEqual(offered.map(x=>x.record.category),three,'the three missing concerns are offered together, in the order of the categories');
 assert.deepEqual(offered.map(x=>x.id),['missing','missing:privacy','missing:operability'],'each once, the first as before');
 assert.ok(offered.every(x=>x.record.origin==='suggestion'&&x.record.confirmed===false),'each a proposal for review');
 const none={...p,workspace:{template:'blank'},quality:{...p.quality,drivers:[]}},all=qualityProposals(none,null,'work').filter(x=>x.id==='missing'||x.id.startsWith('missing:'));
 assert.deepEqual(all.map(x=>x.record.category),QUALITY_TYPES.map(t=>t.id),'with no driver, every category is offered once');
 console.log('PASS round 11 and 12: compliance, privacy, cost, capacity, reliability and operability are quality categories with a description, stimulus and metric guidance and a family; a driver of each saves and measures, reliability and operability with their own guidance; existing drivers keep their order; every missing concern is proposed once, together, as an empty scenario on any template; an unknown category is still refused');
}
// Round 12 (GR-REQ-14): a driver whose words cite a requirement it does not link raises the one grouped cause of the
// chapters (requirement-links.js citedNotes), and linking it clears it. The reference drivers raise none.
{
 assert.equal(qualityFindings(p).filter(f=>f.code==='cited-not-linked').length,0,'the reference drivers cite only what they link');
 const d0=p.quality.drivers[0],other=p.artefacts.find(a=>a.type==='requirement'&&!d0.requirementIds.includes(a.id)).id;
 let r=q(p,'driver',{id:d0.id,conditions:d0.conditions+' As '+other+' states for a held payment.'});
 const cited=qualityFindings(r).filter(f=>f.code==='cited-not-linked');
 assert.equal(cited.length,1);assert.equal(cited[0].id,'cited-not-linked:cited');assert.equal(cited[0].level,'warning');
 assert.deepEqual(cited[0].items,[{objectId:d0.id,requirementIds:[other]}]);
 r=q(r,'driver',{id:d0.id,requirementIds:{add:[other]}});
 assert.equal(qualityFindings(r).filter(f=>f.code==='cited-not-linked').length,0);
 console.log('PASS round 12: a driver whose words cite a requirement it does not link raises the one grouped cited-not-linked cause, cleared by linking it');
}
