import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withRuntime,applyRuntimeCommand} from './public/runtime-domain.js';
import {withProcessModel} from './public/process-model.js';
import {logicalGraph} from './public/logical-domain.js';
import * as rv from './public/review-domain.js';
import {readStoredProject,saveStoredProject} from './project-storage.js';
import {localDatabase} from './local-db.js';
import worker from './worker.js';
import {createReviewStudio} from './public/review-ui.js';

const cmd=(p,type,payload={})=>rv.applyFinalReviewCommand(p,{type:'review.'+type,payload}).document;
const base=rv.withFinalReview(seedProject()),original=JSON.stringify(base);
assert.deepEqual(rv.withFinalReview(base),base);
assert.deepEqual(rv.reviewSource(base),withProcessModel(withRuntime(seedProject())));
assert.equal(rv.chapterSummaries(base).length,10);
assert.equal(rv.finalMilestones(base).filter(m=>m.done).length,0);
const sourceFindings=rv.inheritedFindings(base),sourceErrors=sourceFindings.filter(f=>f.level==='error');
assert(sourceErrors.length>0);assert.equal(new Set(sourceFindings.map(f=>f.id)).size,sourceFindings.length);
const trace=rv.reviewTrace(base,'REQ-001'),graph=logicalGraph(base);
assert(trace.logical.some(r=>r.ref==='LR-001'));assert(trace.applications.some(a=>a.ref==='APP-001'));
assert(trace.capabilities.length&&trace.realizations.length&&trace.contracts.length&&trace.data.length&&trace.controls.length&&trace.runtime.length);
assert(trace.nodeIds.every(id=>graph.nodes.some(n=>n.id===id)));
assert.equal(rv.reviewTrace(base,'REQ-missing'),null);

const narrative={title:'Synthetic SDD fixture',owner:'Fixture architect',audience:'Prototype validation',summary:'Synthetic review, not a bank approval.',scope:'Reference project only.',approach:'Preserve findings and separate design from implementation.',confirmed:true};
const action={title:'Synthetic delivery evidence',owner:'Fixture owner',due:'2026-10-01',acceptance:'Record the observed result and review its limits.',objectIds:['api'],findingId:sourceErrors[0].id};
const treatment=(p,f,extra={})=>({findingId:f.id,stamp:rv.inheritedFindings(p).find(x=>x.id===f.id).stamp,treatment:'Accepted design limitation',reviewer:'Synthetic reviewer',reference:'Test fixture only',rationale:'Synthetic explicit limitation used to exercise review state transitions.',reviewed:true,...extra});
const record=(p,outcome='Revision required')=>({stamp:rv.reviewDesignStamp(p),outcome,reviewer:'Synthetic reviewer',reference:'Fixture outcome, no real approval',rationale:'Source gaps remain explicit.',reviewed:true});
const capture=p=>({stamp:rv.reviewDesignStamp(p),title:'Synthetic frozen review',reviewed:true});
let p=cmd(base,'intake');p=cmd(p,'narrative',narrative);
assert(rv.reviewIntakeCurrent(p)&&rv.narrativeCurrent(p));
assert.throws(()=>cmd(p,'action',{...action,due:'2026-02-30'}),/valid/);
assert.throws(()=>cmd(p,'action',{...action,objectIds:['missing']}),/existing/);
p=cmd(p,'action',action);assert.equal(p.finalReview.actions[0].id,'RA-001');
assert.throws(()=>cmd(p,'disposition',treatment(p,sourceErrors[1],{treatment:'Carry as action',actionId:'RA-001'})),/specific finding/);
p=cmd(p,'disposition',treatment(p,sourceErrors[0],{treatment:'Carry as action',actionId:'RA-001'}));
assert.equal(rv.findingTreatment(p,rv.inheritedFindings(p).find(f=>f.id===sourceErrors[0].id)),'Carry as action');
assert.equal(rv.inheritedFindings(p).length,sourceFindings.length,'A treatment does not erase or change source findings');
assert.throws(()=>cmd(p,'disposition',treatment(p,sourceErrors[1],{reference:''})),/reference/);
assert.throws(()=>cmd(p,'disposition',treatment(p,sourceErrors[1],{stamp:'stale'})),/changed/);
const proposal=rv.reviewProposal(p,'drift','api');assert(proposal);
assert.throws(()=>cmd(p,'proposal',{...proposal,record:proposal.record}),/Review/);
p=cmd(p,'proposal',{...proposal,record:{...proposal.record,title:'Edited fixture ghost',owner:'Fixture owner',due:'2026-10-02'},reviewed:true});
assert.equal(p.finalReview.actions[1].id,'RA-002');assert.equal(p.finalReview.actions[1].title,'Edited fixture ghost');

const reviewTrace=(project,id)=>({requirementId:id,stamp:rv.reviewSourceStamp(project),visited:[0,1,2,3,4],reviewer:'Synthetic reviewer',notes:'Fixture links and gaps reviewed; no runtime execution.',reviewed:true});
assert.throws(()=>cmd(p,'trace',{...reviewTrace(p,'REQ-001'),visited:[0,4]}),/five/);
assert.throws(()=>cmd(p,'trace',{...reviewTrace(p,'REQ-001'),stamp:'old'}),/changed/);
for(const r of rv.reviewRequirements(p))p=cmd(p,'trace',reviewTrace(p,r.id));
assert.equal(p.finalReview.traces[0].id,'TRV-001');assert(rv.finalMilestones(p)[2].done);
assert.throws(()=>cmd(p,'record',record(p)),/checks/);
p=cmd(p,'checks');assert.throws(()=>cmd(p,'record',record(p,'Ready for governance')),/positive review/);
p=cmd(p,'record',record(p));assert.equal(p.finalReview.reviews[0].id,'FR-001');
p=cmd(p,'baseline',capture(p));const draft=p.finalReview.baselines.at(-1),frozenDraft=rv.exportSDD(p,draft.id);
assert.equal(draft.id,'BL-001');assert.equal(draft.classification,'Working draft');assert(!('finalReview' in draft.source));
assert.throws(()=>cmd(p,'governance',{baselineId:draft.id,outcome:'Approved',reviewer:'Test',reference:'Test',notes:'Test',reviewed:true}),/working draft/i);
assert.throws(()=>cmd(p,'handoff',{baselineId:draft.id,acknowledge:true}),/architect-reviewed/);

// A positive review is attainable only after explicit treatment of each error.
// This is an isolated synthetic fixture, never a claim about the reference bank.
for(const f of sourceErrors.slice(1))p=cmd(p,'disposition',treatment(p,f));
assert.equal(rv.reviewBlockers(p).length,0);assert.equal(rv.exportSDD(p,draft.id),frozenDraft);
assert(!rv.baselineCurrent(p,rv.baseline(p,draft.id)));assert(rv.baselineChanges(p,draft).length);
p=cmd(p,'checks');assert.throws(()=>cmd(p,'record',record(p,'Ready for governance')),/limitations/);
p=cmd(p,'record',record(p,'Ready with actions / limitations'));p=cmd(p,'baseline',capture(p));
const approvedBaseline=p.finalReview.baselines.at(-1);assert.equal(approvedBaseline.id,'BL-002');assert.equal(approvedBaseline.classification,'Architect reviewed');
const governance={baselineId:approvedBaseline.id,outcome:'Approved with conditions',reviewer:'Synthetic governance fixture',reference:'No external approval; automated fixture',notes:'Exercise conditional approval state.',conditions:'Complete and evidence delivery obligations before any real implementation.',reviewed:true};
assert.throws(()=>cmd(p,'governance',{...governance,conditions:''}),/conditions/);
p=cmd(p,'governance',governance);assert.equal(p.finalReview.governance[0].id,'GV-001');
assert.throws(()=>cmd(p,'handoff',{baselineId:approvedBaseline.id}),/Acknowledge/);
p=cmd(p,'handoff',{baselineId:approvedBaseline.id,acknowledge:true});assert(rv.finalHandoffCurrent(p));
assert(rv.finalMilestones(p).every(m=>m.done),JSON.stringify(rv.finalMilestones(p)));
assert.equal(p.finalReview.handoff.openActionIds.length,2,'Review completion does not assert implementation completion');
const frozenApproved=rv.exportSDD(p,approvedBaseline.id);
assert.throws(()=>cmd(p,'delivery',{id:'RA-001',status:'Verified',progress:'Test'}),/Verification/);
p=cmd(p,'delivery',{id:'RA-001',status:'Verified',progress:'Synthetic observed check only',reviewer:'Fixture verifier',reference:'Fixture evidence',reviewed:true});
assert(rv.actionComplete(p,p.finalReview.actions[0]));assert(rv.baselineCurrent(p,rv.baseline(p,approvedBaseline.id)));assert(rv.finalHandoffCurrent(p));
assert.equal(rv.exportSDD(p,approvedBaseline.id),frozenApproved,'Delivery events leave the captured SDD unchanged');
const revisedAction=cmd(p,'action',{...p.finalReview.actions[0],acceptance:'Revised fixture criterion'});
assert.equal(revisedAction.finalReview.actions[0].status,'Planned');assert(revisedAction.finalReview.actions[0].history.some(h=>h.verification));assert(!rv.finalHandoffCurrent(revisedAction));
const withdrawn=cmd(p,'governance',{...governance,outcome:'Withdrawn'});assert(!rv.finalHandoffCurrent(withdrawn));assert.equal(rv.latestGovernance(withdrawn,approvedBaseline.id).outcome,'Withdrawn');
const changed=rv.withFinalReview(applyRuntimeCommand(p,{type:'runtime.zone',payload:{...p.runtime.zones[0],isolation:'Changed source fixture'}}).document);
assert(!rv.reviewIntakeCurrent(changed));assert(!rv.narrativeCurrent(changed));assert(!rv.finalChecksCurrent(changed));assert(!rv.latestDesignReview(changed));assert(!rv.finalHandoffCurrent(changed));
assert(!rv.actionComplete(changed,changed.finalReview.actions[0]));assert(!rv.traceReviewCurrent(changed,changed.finalReview.traces[0]));assert(rv.baselineChanges(changed,approvedBaseline).includes('Deployment / Runtime'));
assert.equal(rv.findingTreatment(changed,rv.inheritedFindings(changed).find(f=>f.id===sourceErrors[0].id)),'Needs assessment');
assert.equal(rv.exportSDD(changed,approvedBaseline.id),frozenApproved);assert.throws(()=>cmd(changed,'baseline',capture(p)),/checks/);
const newOutcome=cmd(p,'record',record(p));assert(!rv.baselineCurrent(newOutcome,approvedBaseline));assert(rv.baselineChanges(newOutcome,approvedBaseline).includes('Architect review outcome'));
assert(!rv.exportReviewPackage(changed,approvedBaseline.id).currentAgainstWorkingProject);
assert.throws(()=>rv.exportSDD(p,'BL-missing'),/does not exist/);
const markdown=rv.assembleSDD(p);for(const term of ['Chapter 1 —','Chapter 10 —','REQ-001','QD-002','LR-001','APP-001','TC-001','TR-001','IF-001','DAT-001','SEC-001','RUN-001','RA-001','RF-001','FR-002'])assert(markdown.includes(term),term);
assert(!markdown.includes('undefined'));assert(rv.sddHTML('# Test\n\n<script>alert(1)</script> & "').includes('&lt;script&gt;'));assert(!rv.sddHTML('<img src=x onerror=alert(1)>').includes('<img'));
assert.equal(JSON.stringify(base),original);assert.deepEqual(rv.reviewSource(p),rv.reviewSource(base));assert.deepEqual(rv.withFinalReview(p),p);

// An uncovered requirement must not borrow a different object's description.
globalThis.document={addEventListener(){}};globalThis.window={addEventListener(){}};
const uncovered=structuredClone(base);uncovered.artefacts.push({...uncovered.artefacts.find(a=>a.id==='REQ-001'),id:'REQ-999',title:'Uncovered synthetic requirement'});
const studio=createReviewStudio({value:{document:uncovered}}),viewState={chapter:11,tab:'model',selected:'REQ-999',reviewRequirement:'REQ-999',visible:['logical'],cursor:true};
studio.bind({state:viewState,getNode:()=>({id:'api',description:'Wrong fallback description'})});
assert.equal(studio.graph().nodes.length,0);assert(studio.emptyState().includes('needs a linked responsibility'));assert(studio.inspector().includes('REQ-999'));assert(!studio.inspector().includes('Wrong fallback'));
viewState.reviewRequirement='REQ-001';viewState.selected='oauth';assert(studio.inspector().includes('Checks the initiating identity'));assert(!studio.inspector().includes('Wrong fallback'));

// Real Worker routes: private durable captures, revision conflicts, reopening,
// immutable exports, failure preservation, and bounded working-row growth.
const objects=new Map(),FILES={async put(key,value){objects.set(key,value)},async get(key){return objects.has(key)?{text:async()=>objects.get(key)}:null},async delete(key){objects.delete(key)}};
const DB=localDatabase(':memory:'),env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='reviewer-a',origin='https://aiw.test',bindings=env)=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),bindings)};
try{
 assert.equal((await api('/api/project','GET',null,null)).status,401);
 let state=await(await api('/api/project')).json();
 const post=async(type,payload={})=>{const res=await api('/api/commands','POST',{revision:state.revision,command:{type:'review.'+type,payload}});assert.equal(res.status,200,await res.clone().text());state=await res.json();};
 const request={revision:state.revision,command:{type:'review.narrative',payload:narrative}};
 assert.equal((await api('/api/commands','POST',request,'reviewer-a','https://other.test')).status,403);
 await post('narrative',narrative);assert.equal((await api('/api/commands','POST',request)).status,409);
 await post('checks');for(let i=0;i<4;i++)await post('baseline',capture(state.document));
 assert.equal(objects.size,4);assert.equal(state.document.finalReview.baselines.at(-1).id,'BL-004');
 const row=await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind('reviewer-a','bank-payment').first();
 assert(row.document.length<400000,'Repeated snapshots do not accumulate inside the working project row');
 assert(!row.document.includes('Detailed chapter registers'));
 const reopened=await(await api('/api/project')).json();assert.deepEqual(reopened.document.finalReview.baselines,state.document.finalReview.baselines);
 const ownerB=await(await api('/api/project','GET',null,'reviewer-b')).json();assert.equal(ownerB.document.finalReview.baselines.length,0);
 assert.equal((await api('/api/export?chapter=11&baseline=BL-001','GET',null,'reviewer-b')).status,404);
 const captured=state.document.finalReview.baselines[0].markdown;
 await post('narrative',{...narrative,summary:'Changed after capture'});
 for(const format of ['md','json','html']){
   const res=await api('/api/export?chapter=11&format='+format+'&baseline=BL-001');assert.equal(res.status,200);assert(res.headers.get('Content-Disposition').includes('attachment;'));assert.equal(res.headers.get('Cache-Control'),'no-store');
   if(format==='md')assert.equal(await res.text(),captured);
   else if(format==='json'){const out=await res.json();assert(!out.currentAgainstWorkingProject);assert.equal(out.baseline.markdown,captured);assert(!out.baseline.storageKey)}
   else{assert(res.headers.get('Content-Security-Policy').includes("default-src 'none'"));assert((await res.text()).includes('Use your browser'));}
 }
 const html=await api('/api/export?chapter=11&format=html&view=1');assert(html.headers.get('Content-Disposition').startsWith('inline;'));
 const working=await(await api('/api/export?chapter=11&format=json')).json();assert(working.connectedModel.nodes.length);assert(working.markdown.includes('Changed after capture'));
 assert.equal((await api('/api/export?chapter=11&format=exe')).status,400);assert.equal((await api('/api/export?chapter=11&baseline=BL-missing')).status,404);
 // Two captures derived from the same revision cannot overwrite one another.
 const raw=await DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind('reviewer-a','bank-payment').first();
 const loaded=await readStoredProject(env,'reviewer-a',raw.document),checked=cmd(loaded.document,'checks'),first=cmd(checked,'baseline',capture(checked)),second=cmd(checked,'baseline',{...capture(checked),title:'Losing concurrent capture'});
 assert.equal((await saveStoredProject(env,'reviewer-a','bank-payment',first,raw.revision,new Date().toISOString(),loaded.keys)).meta.changes,1);
 assert.equal((await saveStoredProject(env,'reviewer-a','bank-payment',second,raw.revision,new Date().toISOString(),loaded.keys)).meta.changes,0);
 assert.equal(objects.size,5);state=await(await api('/api/project')).json();assert.equal(state.document.finalReview.baselines.at(-1).title,'Synthetic frozen review');
 await assert.rejects(()=>readStoredProject(env,'reviewer-b',raw.document),/unavailable/);
 const offline={...env,FILES:{...FILES,async put(){throw Error('Synthetic object storage outage')}}};
 const failure=await api('/api/commands','POST',{revision:state.revision,command:{type:'review.baseline',payload:capture(state.document)}},'reviewer-a','https://aiw.test',offline);assert.equal(failure.status,503);
 assert.equal((await(await api('/api/project')).json()).revision,state.revision,'Failed capture preserves the saved project and revision');
 const priorCount=state.document.finalReview.baselines.length;
 const inherited=await api('/api/commands','POST',{revision:state.revision,command:{type:'runtime.intake'}});assert.equal(inherited.status,200);assert.equal((await inherited.json()).document.finalReview.baselines.length,priorCount,'Earlier chapter saves retain frozen baselines');
 console.log('PASS Review & Realize: explicit findings and owned actions; five-stage traceability; separate architect/governance/implementation evidence; immutable working and reviewed baselines; source and outcome invalidation; attainable conditional handoff; escaped SDD exports; private R2 snapshots, bounded D1 rows, owner isolation, CAS, failure preservation, and durable reopening.');
}finally{DB.close()}
