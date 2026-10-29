import assert from 'node:assert/strict';
import {sddDocument as sddDocumentForRoadmap} from './public/sdd-document.js';
import {seedProject,applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyLogicalCommand} from './public/logical-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {withRuntime,applyRuntimeCommand} from './public/runtime-domain.js';
import {withProcessModel} from './public/process-model.js';
import {logicalGraph} from './public/logical-domain.js';
import * as rv from './public/review-domain.js';
import {readStoredProject,saveStoredProject} from './project-storage.js';
import {freezeBaseline} from './scripts/freeze-baseline.mjs';
import {localDatabase} from './local-db.js';
import worker from './worker.js';
import {createReviewStudio} from './public/review-ui.js';
import {createProject} from './shared/projects-domain.js';

// Two signed-in people: the architect records the review; a second person records approval evidence.
const cmd=(p,type,payload={},actor='architect-a')=>rv.applyFinalReviewCommand(p,{type:'review.'+type,payload},undefined,actor).document;
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
assert.throws(()=>cmd(p,'governance',governance),/second signed-in person[\s\S]*architect-a recorded the architect review/,'the architect who recorded the review cannot also approve it');
assert.throws(()=>cmd(p,'governance',governance,null),/Sign in/,'approval evidence needs a signed-in person');
p=cmd(p,'governance',governance,'approver-b');assert.equal(p.finalReview.governance[0].id,'GV-001');assert.equal(p.finalReview.governance[0].actor,'approver-b');assert.equal(p.finalReview.governance[0].reviewAuthor,'architect-a');
assert.equal(approvedBaseline.actor,'architect-a');assert.equal(p.finalReview.reviews.at(-1).actor,'architect-a');
{const typedOnly=structuredClone(p);delete typedOnly.finalReview.governance[0].actor;assert.throws(()=>cmd(typedOnly,'handoff',{baselineId:approvedBaseline.id,acknowledge:true}),/second signed-in person/,'a typed reviewer name alone never unlocks the handoff');}
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
assert(!rv.actionComplete(changed,changed.finalReview.actions[0]));assert(!rv.traceReviewCurrent(changed,changed.finalReview.traces[0]));// Chapter names are sentence case everywhere (round 2, U2-26): Chapter 10 reads 'Deployment / runtime'.
assert(rv.baselineChanges(changed,approvedBaseline).includes('Deployment / runtime'));
// Round 12 (GR-GOV-05): a treatment holds while its own finding's inputs read the same. The zone is not one of them, so
// the treatment of sourceErrors[0] (REQ-005's acceptance) stands, and only the action it carries, stamped with the whole
// design, needs review (before round 12 any edit anywhere reopened every treatment). A change to REQ-005 itself reopens it.
assert.equal(rv.findingTreatment(changed,rv.inheritedFindings(changed).find(f=>f.id===sourceErrors[0].id)),'Action needs review');
{const req5=p.artefacts.find(a=>a.id===sourceErrors[0].objectId),own=rv.withFinalReview(applyCommand(p,{type:'artefact',payload:{...req5,description:req5.description+' It is recorded once.'}}).document);
 assert.equal(rv.findingTreatment(own,rv.inheritedFindings(own).find(f=>f.id===sourceErrors[0].id)),'Needs assessment','a change to the finding\'s own record reopens its treatment');}
assert.equal(rv.exportSDD(changed,approvedBaseline.id),frozenApproved);assert.throws(()=>cmd(changed,'baseline',capture(p)),/checks/);
const newOutcome=cmd(p,'record',record(p));assert(!rv.baselineCurrent(newOutcome,approvedBaseline));assert(rv.baselineChanges(newOutcome,approvedBaseline).includes('Architect review outcome'));
assert(!rv.exportReviewPackage(changed,approvedBaseline.id).currentAgainstWorkingProject);
assert.throws(()=>rv.exportSDD(p,'BL-missing'),/does not exist/);
const markdown=rv.assembleSDD(p);for(const term of ['Chapter 1 —','Chapter 10 —','REQ-001','QD-002','LR-001','APP-001','TC-001','TR-001','IF-001','DAT-001','SEC-001','RUN-001','RA-001','RF-001','FR-002'])assert(markdown.includes(term),term);
assert(!markdown.includes('undefined'));assert(rv.sddHTML('# Test\n\n<script>alert(1)</script> & "').includes('&lt;script&gt;'));assert(!rv.sddHTML('<img src=x onerror=alert(1)>').includes('<img'));
assert.equal(JSON.stringify(base),original);assert.deepEqual(rv.reviewSource(p),rv.reviewSource(base));assert.deepEqual(rv.withFinalReview(p),p);

// Round 12 (GR-GOV-05, GR-GOV-12, GR-GOV-13, GR-SRC-07): a review is stamped with the records it judged, one review may
// cover a whole scope or cause with its exceptions, a finding the source cannot answer is raised with its owner, and every
// review records the signed-in person.
{let q=cmd(structuredClone(base),'intake');
 // One trace review for three trails, each kept with its own stamp.
 const scope={kind:'requirements',ids:['REQ-001','REQ-002','REQ-003']},{ids}=rv.traceScope(q,scope);
 assert.throws(()=>cmd(q,'trace',{scope,stamp:'old',reviewed:true,reviewer:'R',notes:'n'}),/changed/);
 assert.throws(()=>cmd(q,'trace',{scope,stamp:rv.groupTraceStamp(q,ids),reviewed:true,reviewer:'R',notes:'n',exceptions:[{id:'REQ-002'}]}),/reason/);
 q=cmd(q,'trace',{scope,stamp:rv.groupTraceStamp(q,ids),reviewed:true,reviewer:'Synthetic reviewer',notes:'Followed every trail of the three.',exceptions:[{id:'REQ-002',reason:'Its risk engine is being redesigned.'}]},'reviewer-b');
 const t=q.finalReview.traces.at(-1);assert.deepEqual([t.actor,t.requirementIds,t.exceptions],['reviewer-b',['REQ-001','REQ-003'],[['REQ-002','Its risk engine is being redesigned.']]]);
 assert(rv.traceReviewFor(q,'REQ-001')&&rv.traceReviewFor(q,'REQ-003')&&!rv.traceReviewFor(q,'REQ-002'),'the exception stays open');
 // A record on none of the trails changes (QD-004): every trail stays reviewed. A record on one trail changes (LR ledger,
 // on REQ-003's): that trail alone is open again.
 const qd4=q.quality.drivers.find(d=>d.id==='QD-004');let u=rv.withFinalReview(applyQualityCommand(q,{type:'quality.driver',payload:{...qd4,title:qd4.title+' (restated)'}}).document);
 assert(rv.traceReviewFor(u,'REQ-001')&&rv.traceReviewFor(u,'REQ-003'),'an unrelated edit leaves the trace reviews current');
 const ledger=u.logical.responsibilities.find(r=>r.id==='ledger');u=rv.withFinalReview(applyLogicalCommand(u,{type:'logical.responsibility',payload:{...ledger,boundary:ledger.boundary+' It never posts twice.'}}).document);
 assert(rv.traceReviewFor(u,'REQ-001')&&!rv.traceReviewFor(u,'REQ-003'),'a change on one trail reopens that trail alone');
 // One treatment for a whole cause, with an exception; each finding keeps its own stamp.
 const cause='3|choice|error',members=rv.causeFindings(q,cause);assert.equal(members.length,3);
 const treat={scope:'cause',cause,treatment:'Accepted design limitation',rationale:'The choices are made in a later workshop.',reviewer:'Synthetic reviewer',reference:'Workshop plan, fixture',reviewed:true};
 assert.throws(()=>cmd(q,'disposition',{...treat,stamp:'old'}),/changed/);
 assert.throws(()=>cmd(q,'disposition',{...treat,stamp:rv.causeFindingStamp(q,members),treatment:'Carry as action'}),/own action/);
 q=cmd(q,'disposition',{...treat,stamp:rv.causeFindingStamp(q,members),exceptions:[{findingId:'C3:choice:ADR-003',reason:'Its alternatives are not drafted yet.'}]},'reviewer-b');
 const d=q.finalReview.dispositions.at(-1);assert.deepEqual([d.scope,d.actor,d.findings.length,d.cause.key],['cause','reviewer-b',2,cause]);
 const treatment=(doc,id)=>rv.findingTreatment(doc,rv.inheritedFindings(doc).find(f=>f.id===id));
 assert.deepEqual(['C3:choice:ADR-001','C3:choice:ADR-002','C3:choice:ADR-003'].map(id=>treatment(q,id)),['Accepted design limitation','Accepted design limitation','Needs assessment']);
 const adr1=q.decisions.records.find(x=>x.id==='ADR-001'),v=rv.withFinalReview(applyDecisionCommand(q,{type:'decision.save',payload:{...adr1,context:adr1.context+' The channel owner asked again.'}}).document);
 assert.deepEqual(['C3:choice:ADR-001','C3:choice:ADR-002'].map(id=>treatment(v,id)),['Needs assessment','Accepted design limitation'],'a member\'s change reopens that member alone');
 // A finding the source cannot answer, raised with its owner: treated, with who, when and with whom, listed as raised.
 const silent=rv.inheritedFindings(q).find(f=>f.id==='C10:scope-review:env-001');
 assert.throws(()=>cmd(q,'disposition',{findingId:silent.id,stamp:silent.stamp,treatment:rv.SOURCE_SILENT,rationale:'The source states no recovery target.',reviewer:'Synthetic reviewer',reviewed:true}),/with whom/);
 q=cmd(q,'disposition',{findingId:silent.id,stamp:silent.stamp,treatment:rv.SOURCE_SILENT,rationale:'The source states no recovery target or window.',reviewer:'Synthetic reviewer',reference:'The workbook owner, request 12 of 2026-10-08',reviewed:true},'reviewer-b');
 assert.equal(treatment(q,silent.id),rv.SOURCE_SILENT);assert(!rv.reviewBlockers(q).some(f=>f.id===silent.id),'raised, not unfinished work');
 assert.deepEqual(rv.raisedFindings(q).map(x=>[x.finding.id,x.disposition.actor]),[[silent.id,'reviewer-b']]);
 const sdd=rv.assembleSDD(q);assert.match(sdd,/### Raised with their owners\n\n1 finding asks what the source does not say[\s\S]*C10:scope-review:env-001 · [^\n]* — raised by reviewer-b on \d{4}-\d{2}-\d{2} with The workbook owner, request 12/);
 // The SDD's architecture edition lists it under its open items (Appendix B) as raised, with who and when, and not among
 // the checks to fix.
 const arch=sddDocumentForRoadmap(q,{figures:false}).markdown,openB=arch.slice(arch.indexOf('## B. Open items'),arch.indexOf('## C. Domain lens'));
 assert.match(openB,/### Raised with their owners\n\n1 finding asks what the source does not say[\s\S]*- C10:scope-review:env-001 · [^\n]*: raised by reviewer-b on \d{4}-\d{2}-\d{2} with The workbook owner, request 12/,openB.slice(0,1200));
 // Every review records the signed-in person; an agent account is never an independent approver.
 assert.equal(q.finalReview.dispositions.at(-1).actor,'reviewer-b');
 assert.equal(rv.independentApproval({actor:'architect-a',review:{outcome:{actor:'architect-a'}}},{actor:'drafter-c',account:'agent'}),false);
 assert.equal(rv.independentApproval({actor:'architect-a',review:{outcome:{actor:'architect-a',account:'agent'}}},{actor:'approver-b'}),false);
 console.log('PASS review stamps per record (GR-GOV-05): a trace review covers named requirements (or a group or a responsibility) with each trail\'s own stamp and its exceptions, and stays current when an unrelated record changes; one treatment covers a cause with its exceptions and lapses for the one member whose inputs change; a finding the source cannot answer is raised with its owner and listed as raised; every review records the signed-in person; an agent account is never an independent approver');
}

// An uncovered requirement must not borrow a different object's description.
globalThis.document={addEventListener(){}};globalThis.window={addEventListener(){}};
const uncovered=structuredClone(base);uncovered.artefacts.push({...uncovered.artefacts.find(a=>a.id==='REQ-001'),id:'REQ-999',title:'Uncovered synthetic requirement'});
const studio=createReviewStudio({value:{document:uncovered}}),viewState={chapter:11,tab:'model',selected:'REQ-999',reviewRequirement:'REQ-999',visible:['logical'],cursor:true};
studio.bind({state:viewState,getNode:()=>({id:'api',description:'Wrong fallback description'})});
assert.equal(studio.graph().nodes.length,0);assert(studio.inspector().includes('REQ-999'));assert(!studio.inspector().includes('Wrong fallback'));
viewState.reviewRequirement='REQ-001';viewState.selected='oauth';assert(studio.inspector().includes('Checks the initiating identity'));assert(!studio.inspector().includes('Wrong fallback'));

// Chapter 11 uses the shared Output workspace: document preview and export, then
// the disclosed sources/readiness and the separate baseline/delivery workflow.
{const outStudio=createReviewStudio({value:{document:base}}),outState={chapter:11,tab:'output',selected:'api',reviewRequirement:'REQ-001',visible:['logical'],cursor:true};
 outStudio.bind({state:outState,getNode:()=>null});
 const out=outStudio.output(),at=t=>{const i=out.indexOf(t);assert(i>=0,'Output shows '+t);return i;};
 assert.equal((out.match(/<li class="rv-tile /g)||[]).length,11,'one tile for each chapter');
 assert(at('Open preview in new tab')<at('Download or export')&&at('Download or export')<at('Sources and readiness')&&at('Sources and readiness')<at('SDD readiness')&&at('SDD readiness')<at('Freeze baseline'),'document preview/export precedes disclosed readiness and the separate baseline workflow');
 assert(at('Freeze needs')>at('Freeze baseline')&&out.includes('Current review checks: run them on Validate'),'what freezing needs sits beside Freeze');
 for(let n=1;n<=11;n++)assert(out.includes('href="/?chapter='+n+'&amp;tab=validate">Chapter '+n+' checks'),'tile '+n+' opens its checks');
 // Every count names its unit since round 12 (G, GR-UX-02): SDD passages, findings to fix, items to confirm.
 assert(/<b>1<\/b> of 22 SDD passages passing<\/span><span class="fix"><b>1<\/b> finding to fix<\/span><span class="confirm"><b>22<\/b> items to confirm/.test(out),'Chapter 1 in the three words, each count with its unit');
 assert(out.includes('<small>Next</small><a href="/?chapter=1&amp;tab=work&amp;artefact=REQ-005">Make acceptance testable · REQ-005</a>'),'the next action opens the record that fills it');
 assert(/<b>0<\/b> of 11 chapters passing<\/span><span class="fix"><b>213<\/b> findings to fix/.test(out));
 assert(at('What Chapter 11 puts in the SDD')>at('Sources and readiness')&&at('What Chapter 11 puts in the SDD')<at('Freeze baseline'),'Chapter 11 passages belong to the source/readiness disclosure');
 assert(!/block/i.test(out.slice(at('SDD readiness'),at('Freeze baseline'))),'the board says to fix, never blocking');
 const blankStudio=createReviewStudio({value:{document:createProject({name:'Blank',template:'blank'},'blank-rv')}});blankStudio.bind({state:{...outState},getNode:()=>null});
 const blankOut=blankStudio.output();assert.equal((blankOut.match(/<li class="rv-tile /g)||[]).length,11);assert(!/block/i.test(blankOut),'nothing blocks on a project with no records');
}

// Real Worker routes: private durable captures, revision conflicts, reopening,
// immutable exports, failure preservation, and bounded working-row growth.
const objects=new Map(),FILES={async put(key,value){objects.set(key,value)},async get(key){return objects.has(key)?{text:async()=>objects.get(key)}:null},async delete(key){objects.delete(key)}};
const DB=localDatabase(':memory:'),env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='reviewer-a',origin='https://aiw.test',bindings=env)=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),bindings)};
try{
 assert.equal((await api('/api/project','GET',null,null)).status,401);
 let state=await(await api('/api/project')).json();
 // A baseline is frozen as a job (round 12, GR-STO-02: baseline-service.js): its receipt is read until it is saved.
 const post=async(type,payload={})=>{if(type==='baseline'){const f=await freezeBaseline((path,body)=>api(path,body?'POST':'GET',body),payload);assert(!f.error,f.error);state=f.state;return;}const res=await api('/api/commands','POST',{revision:state.revision,command:{type:'review.'+type,payload}});assert.equal(res.status,200,await res.clone().text());state=await res.json();};
 const request={revision:state.revision,command:{type:'review.narrative',payload:narrative}};
 assert.equal((await api('/api/commands','POST',request,'reviewer-a','https://other.test')).status,403);
 await post('narrative',narrative);assert.equal((await api('/api/commands','POST',request)).status,409);
 await post('checks');for(let i=0;i<4;i++)await post('baseline',capture(state.document));
 assert.equal(state.document.finalReview.baselines.at(-1).id,'BL-004');
 // Each part of a baseline is stored once, named by its SHA-256 (project-storage.js): four freezes of one design keep one
 // copy of its source, findings and model, and a part of each that differs (its frozen SDD names it).
 const frozenEntries=state.document.finalReview.baselines,partObject=sha=>objects.get([...objects.keys()].find(k=>k.endsWith('/parts/'+sha+'.json'))),stored=new Set(frozenEntries.flatMap(b=>Object.values(b.frozen.parts).map(p=>p.sha256)));
 for(const b of frozenEntries)for(const c of JSON.parse(partObject(b.frozen.parts.journal.sha256)).chunks)stored.add(c.sha256);
 assert.equal([...objects.keys()].filter(k=>k.startsWith('baselines/')).length,stored.size,'every stored part is a part a baseline names');assert.equal(new Set(frozenEntries.map(b=>b.frozen.parts.source.sha256)).size,1,'one copy of the design source for four freezes');assert.equal(new Set(frozenEntries.map(b=>b.frozen.parts.markdown.sha256)).size,4);
 const row=await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind('reviewer-a','bank-payment').first();
 assert(row.document.length<400000,'Repeated snapshots do not accumulate inside the working project row');
 assert(!row.document.includes('Detailed chapter registers'));
 const reopened=await(await api('/api/project')).json();assert.deepEqual(reopened.document.finalReview.baselines,state.document.finalReview.baselines);
 const ownerB=await(await api('/api/project','GET',null,'reviewer-b')).json();assert.equal(ownerB.document.finalReview.baselines.length,0);
 assert.equal((await api('/api/export?chapter=11&baseline=BL-001','GET',null,'reviewer-b')).status,404);
 const captured=await(await api('/api/baselines?action=open&part=markdown&id=BL-001')).json();assert.equal(state.document.finalReview.baselines[0].markdown,undefined,'a read carries a baseline\'s metadata, not its parts');
 await post('narrative',{...narrative,summary:'Changed after capture'});
 for(const format of ['md','json','html']){
   const res=await api('/api/export?chapter=11&format='+format+'&baseline=BL-001');assert.equal(res.status,200);assert(res.headers.get('Content-Disposition').includes('attachment;'));assert.equal(res.headers.get('Cache-Control'),'no-store');
   if(format==='md')assert.equal(await res.text(),captured);
   else if(format==='json'){const out=await res.json();assert(!out.currentAgainstWorkingProject);assert.equal(out.baseline.markdown,captured);assert(!out.baseline.storageKey)}
   else{assert(res.headers.get('Content-Security-Policy').includes("default-src 'none'"));const printed=await res.text();assert.match(printed,/<aside class="print-note">[\s\S]*Use Output[\s\S]*Markdown, HTML, Word or PDF edition/,'the saved HTML explains where matching document editions are available');assert.match(printed,/Printing this preview does not change its assumptions or review status/,'printing cannot imply design approval');assert(!printed.includes('Changed after capture'),'the frozen HTML retains captured content after a working edit');}
 }
 const html=await api('/api/export?chapter=11&format=html&view=1');assert(html.headers.get('Content-Disposition').startsWith('inline;'));
 const working=await(await api('/api/export?chapter=11&format=json&embed=project')).json();assert(working.connectedModel.nodes.length);assert(working.project.finalReview.narrative.summary==='Changed after capture');assert(working.markdown.includes('Changed after capture'));
 assert.equal((await api('/api/export?chapter=11&format=exe')).status,400);assert.equal((await api('/api/export?chapter=11&baseline=BL-missing')).status,404);
 // Two captures derived from the same revision cannot overwrite one another.
 const raw=await DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind('reviewer-a','bank-payment').first();
 const loaded=await readStoredProject(env,'reviewer-a',raw.document),checked=cmd(loaded.document,'checks'),first=cmd(checked,'baseline',capture(checked)),second=cmd(checked,'baseline',{...capture(checked),title:'Losing concurrent capture'});
 assert.equal((await saveStoredProject(env,'reviewer-a','bank-payment',first,raw.revision,new Date().toISOString(),loaded.keys)).meta.changes,1);
 assert.equal((await saveStoredProject(env,'reviewer-a','bank-payment',second,raw.revision,new Date().toISOString(),loaded.keys)).meta.changes,0);
 state=await(await api('/api/project')).json();assert.equal(state.document.finalReview.baselines.at(-1).title,'Synthetic frozen review');assert.equal(state.document.finalReview.baselines.length,5);
 assert.equal((await(await api('/api/baselines?action=verify&id=BL-005')).json()).verified,true,'the winning capture\'s parts are intact');
 await assert.rejects(()=>readStoredProject(env,'reviewer-b',raw.document),/unavailable/);
 const offline={...env,FILES:{...FILES,async put(){throw Error('Synthetic object storage outage')}}};
 assert.equal((await api('/api/commands','POST',{revision:state.revision,command:{type:'review.baseline',payload:capture(state.document)}})).status,400,'a save does not freeze a baseline: the freeze is a job');
 const failure=await freezeBaseline((path,body)=>api(path,body?'POST':'GET',body,'reviewer-a','https://aiw.test',offline),capture(state.document));assert.equal(failure.job?.status,'failed');assert.match(failure.error,/Synthetic object storage outage/);
 assert.equal((await(await api('/api/project')).json()).revision,state.revision,'Failed capture preserves the saved project and revision');
 const priorCount=state.document.finalReview.baselines.length;
 const inherited=await api('/api/commands','POST',{revision:state.revision,command:{type:'runtime.intake'}});assert.equal(inherited.status,200);assert.equal((await inherited.json()).document.finalReview.baselines.length,priorCount,'Earlier chapter saves retain frozen baselines');
 // A reference journey's working SDD (round 4, shared/reference-journeys.js), on its own store: created from its template
 // id, exported as Markdown, JSON and HTML with its own title and the chapter registers, nothing frozen or approved.
 {const refFiles=new Map(),refEnv={DB:localDatabase(':memory:'),FILES:{async put(k,v){refFiles.set(k,v)},async get(k){return refFiles.has(k)?{text:async()=>refFiles.get(k)}:null},async delete(k){refFiles.delete(k)}},ASSETS:env.ASSETS};
  try{
   const created=await api('/api/projects','POST',{name:'Clinic appointments export',template:'clinic-appointments'},'reviewer-a','https://aiw.test',refEnv);assert.equal(created.status,201);const rid=(await created.json()).document.id,out=format=>api('/api/export?project='+rid+'&chapter=11&format='+format,'GET',null,'reviewer-a','https://aiw.test',refEnv);
   const mdRes=await out('md'),md=await mdRes.text();assert.equal(mdRes.status,200);assert.match(mdRes.headers.get('Content-Disposition'),/^attachment; filename="AIW_Clinic_appointments_export_Working_SDD\.md"$/);
   assert(md.startsWith('<!-- aiw:cover -->\n# CLINIC APPOINTMENTS EXPORT\n'),'the reference SDD carries its own title on its cover');assert(!md.includes('undefined'));
   const regs=await(await api('/api/export?project='+rid+'&chapter=11&annex=registers&format=md','GET',null,'reviewer-a','https://aiw.test',refEnv)).text();assert(regs.includes('## Detailed chapter registers'),'the chapter registers are the review registers annex');for(const c of rv.CHAPTERS)assert(regs.includes('\n# Chapter '+c.id+' — '+c.title+'\n'),'register '+c.id);for(const term of ['REQ-001','QD-001','ADR-001','LR-001','APP-001','TC-001','TR-001','IF-001','DAT-001','SEC-001','RUN-001','SRC-001'])assert(regs.includes(term),term);assert(!regs.includes('undefined'));
   const json=await(await api('/api/export?project='+rid+'&chapter=11&format=json&embed=project','GET',null,'reviewer-a','https://aiw.test',refEnv)).json();assert.equal(json.markdown,md);assert.equal(json.project.workspace.reference.verified,false);assert.deepEqual([json.project.finalReview.baselines.length,json.project.finalReview.governance.length,json.project.finalReview.handoff],[0,0,null]);assert(json.connectedModel.nodes.length);
   const htmlRes=await out('html'),page=await htmlRes.text();assert(htmlRes.headers.get('Content-Security-Policy').includes("default-src 'none'"));for(const token of ['<svg','<table','CLINIC APPOINTMENTS EXPORT','5. Architecture models'])assert(page.includes(token),token);assert(!/<script/i.test(page));
  }finally{refEnv.DB.close()}
 }
 console.log('PASS Review & Realize: Output\'s SDD readiness board (one tile per chapter in passing, to fix and to confirm, with its next action and its checks) within Sources and readiness, with preview/export and a separate Freeze workflow; explicit findings and owned actions; five-stage traceability; separate architect/governance/implementation evidence; immutable working and reviewed baselines; source and outcome invalidation; attainable conditional handoff; escaped SDD exports; the working SDD of a reference journey exported as Markdown, JSON and HTML with its own title, its chapter registers the review registers annex; private R2 snapshots, bounded D1 rows, owner isolation, CAS, failure preservation, and durable reopening.');
}finally{DB.close()}

// The SDD's editions (round 12, workstream F; audit/round12/SDD-SPEC.md), on a reference journey drafted by the pipeline
// (shared/reference-journeys.js): the architecture edition, which replaces the round-5 full edition (its registers are
// the review registers annex), and the executive edition, each for three audiences; what the review owes the gap register
// (GR-SDD-09, 16, 17, 18, 20, 21, 22, 23); the export route, the Output tab's form, and the Word and PDF builders.
// sdd-architecture-validate.mjs, sdd-formats-validate.mjs and sdd-size-validate.mjs hold the edition's sections, its formats
// and its size; this block holds what the review reads from it.
{
 const ed=await import('./public/sdd-document.js'),{architectureFigureSet,frozenFigureSet,isArchitectureEdition}=ed,{makeReviewDOCX,figureBlocks,exportChoice}=await import('./public/review-documents.js'),{makeReviewPDF}=await import('./public/review-pdf.js');
 const {refList}=await import('./public/util.js'),{sddOpenCounts,sddBoard}=await import('./public/readiness-model.js'),{exportRuntimeMarkdown}=await import('./public/runtime-domain.js'),{richProject}=await import('./sdd-fixtures.mjs');
 const FIG=/<figure id="figure-\d+"[\s\S]*?<\/figure>/g,text=md=>md.replace(FIG,''),words=md=>text(md).split(/\s+/).filter(Boolean).length,count=(s,re)=>(s.match(re)||[]).length,section=(md,h,next='\n## ')=>{const i=md.indexOf('\n'+h+'\n');if(i<0)return '';const j=md.indexOf(next,i+h.length+2);return md.slice(i,j<0?md.length:j);};
 const ref=rv.withFinalReview(createProject({name:'Clinic appointments',template:'clinic-appointments'},'clinic-sdd','2026-10-01T09:00:00Z')),frozenRef=JSON.stringify(ref);
 // Editions and audiences: the defaults; a link to the retired full edition, or to the retired summary view, opens the
 // edition that replaced it; anything else is refused.
 assert.deepEqual(ed.sddEdition(new URLSearchParams('')),{edition:'architecture',audience:'all'});
 assert.deepEqual(ed.sddEdition(new URLSearchParams('edition=full')),{edition:'architecture',audience:'all'},'a link to the retired full edition opens the architecture edition');
 assert.deepEqual(ed.sddEdition(new URLSearchParams('detail=summary')),{edition:'executive',audience:'all'});
 assert.deepEqual(ed.sddEdition({edition:'executive',audience:'review'}),{edition:'executive',audience:'review'});
 assert.throws(()=>ed.sddEdition({edition:'short'}),/architecture or the executive/);assert.throws(()=>ed.sddEdition({audience:'board'}),/audience/);
 // The architecture edition for everyone: titled on its cover, the SDD-SPEC sections in order, a marker where a gap is.
 const doc=ed.sddDocument(ref),md=doc.markdown,body=text(md);
 assert(isArchitectureEdition(md)&&md.startsWith('<!-- aiw:cover -->\n# CLINIC APPOINTMENTS\n')&&md.includes('Architecture edition · For everyone'),'titled on its cover, with its edition');
 assert.deepEqual([...md.matchAll(/^# (\d)\. /gm)].map(m=>Number(m[1])),[1,2,3,4,5,6,7],'the SDD-SPEC sections in order');
 assert(!/\bundefined\b|\[object Object\]/.test(md));
 assert.equal(count(body,/Unassigned|Open question: /g),0,'no "Unassigned" or open-question sentence in the text: a marker stands where the gap is');
 // Format 2 (round 24, D-24-06): no marker stands beside a record's field; sections 1 to 4 each end with their open
 // questions, which name the gaps (more than ten records and fields) each once, a range read as its members.
 {const lists=[...md.matchAll(/^## Open questions\n\n[^\n]*\n\n((?:- [^\n]*\n)+)/gm)].map(m=>m[1].trim().split('\n')),gaps=lists.flat(),members=r=>r.split(/, | and /).flatMap(x=>{const m=/^(.*?)(\d+)–\1(\d+)$/.exec(x.trim());return m?Array.from({length:Number(m[3])-Number(m[2])+1},(_,i)=>m[1]+(Number(m[2])+i)):[x.trim()];});
  const pairs=l=>{const i=l.lastIndexOf(' ('),t=l.slice(i+2,-1);if(l.startsWith('- Not stated: ')){const f=l.slice(14,i).split(/, | and /).length,all=/^(?:all ([\d,]+)|both) /.exec(t);return f*(all?(all[1]?Number(all[1].replace(/,/g,'')):2):members(t.includes(': ')?t.slice(t.indexOf(': ')+2):t).length);}return t.split('; ').reduce((n,x)=>{const j=x.indexOf(': ');return n+members(x.slice(0,j)).length*x.slice(j+2).split(/, | and /).length;},0);};
  assert(lists.length===4&&gaps.reduce((n,l)=>n+pairs(l),0)>10&&new Set(gaps).size===gaps.length,'the gaps are named in the sections\' open questions, each once');
  assert(!/open: /.test(body.slice(body.indexOf('\n# 2. '),body.indexOf('\n# 5. '))),'and no marker stands in a record of sections 2 to 4');}
 // Figures: the C4 levels of section 5 as inline SVG, each with the SHA-256 of the drawn figure.
 const set=architectureFigureSet(ref),blocks=figureBlocks(md);
 assert(set.figures.length>=3&&blocks.length===set.figures.length,'every figure of the set is in the Markdown');assert.deepEqual(blocks.map(b=>b.sha256),set.figures.map(f=>f.sha256),'with the SHA-256 of the drawn figure');
 for(const b of blocks){const at=md.indexOf('<figure id="figure-'+b.n+'"');assert(at>md.indexOf('\n# 5. Architecture models')&&at<md.indexOf('\n# 6. '),'figure '+b.n+' in section 5');}
 assert(!/\n[ \t]*\n/.test(blocks.map(b=>b.svg).join('\n')),'no blank line inside a figure, so a Markdown reader keeps it whole');
 // Who wrote it (SDD-SPEC principle 3): the provenance line in document control, from the records; a journey draft a
 // person edited counts as the person's.
 assert(doc.provenance.by.rules>0&&md.includes('Provenance: '+doc.provenance.line),'the journey rules\' drafts are said to be theirs');
 {const edited=structuredClone(ref),r=edited.artefacts.find(a=>a.id==='REQ-001');r.provenance.journey={...r.provenance.journey,edited:true,editedAt:'2026-10-02T08:00:00Z',editedFields:['title']};r.title='Book an appointment online, checked';const e2=ed.sddDocument(edited,{figures:false}).provenance;assert.deepEqual([e2.by.rules,e2.by.person],[doc.provenance.by.rules-1,doc.provenance.by.person+1],'an edit by hand makes the record a person\'s');}
 assert.equal(JSON.stringify(ref),frozenRef,'assembling an edition changes nothing');
 // No change section before a baseline; after one, what was added, changed and removed since its snapshot (section 6).
 assert(!/\n## Since BL-/.test(md));
 let fz=cmd(ref,'checks');fz=cmd(fz,'baseline',capture(fz));const bl=fz.finalReview.baselines.at(-1);
 assert(isArchitectureEdition(bl.markdown)&&figureBlocks(bl.markdown).length===set.figures.length,'a freeze keeps the architecture edition with its figures');
 assert.deepEqual(figureBlocks(bl.markdown).map(b=>b.sha256),frozenFigureSet(bl.source,bl).figures.map(f=>f.sha256),'drawn from the frozen source, so its HTML draws the same figures again');
 {const changed=structuredClone(fz),d=changed.quality.drivers[0];d.title+=' (checked)';changed.logical.responsibilities.pop();const c=ed.changesSinceBaseline(changed);
  assert.deepEqual(c.chapters.find(x=>x.chapter===2).changed,[{ref:d.id,fields:['title']}]);assert.equal(c.chapters.find(x=>x.chapter===4).removed.length,1);
  const cm=ed.sddDocument(changed,{figures:false}).markdown,since=section(cm,'## Since '+bl.id);assert(since.includes('Compared with '+bl.id)&&since.includes('| 2 · Architectural drivers | — | '+d.id+' (title) | — |')&&cm.indexOf('\n## Since '+bl.id)>cm.indexOf('\n# 6. '),'the change section in section 6');}
 // The figure set is drawn once for a document's content and a filter (document-memo.js per document object; by the
 // content's SHA-256 across documents, as the server reads every request afresh): a second assembly of the same content
 // returns the same figure markup from the memo, faster than drawing; other content is drawn; a kept set cannot be changed.
 {const {traceabilityFigure,MATRIX_ROWS}=await import('./public/sdd-figures.js'),renamed=structuredClone(ref);renamed.name='Clinic appointments (renamed)';
  const d0={...ed.figureMemo},t0=performance.now(),first=ed.sddDocument(renamed),drawnMs=performance.now()-t0;
  assert.equal(ed.figureMemo.drawn,d0.drawn+1,'new content is drawn');
  const d1={...ed.figureMemo},t1=performance.now(),second=ed.sddDocument(structuredClone(renamed));let memoMs=performance.now()-t1;
  assert.equal(second.markdown,first.markdown,'the same content assembles the same edition');assert.deepEqual(figureBlocks(second.markdown).map(b=>b.svg),figureBlocks(first.markdown).map(b=>b.svg),'with the same figure markup');
  assert.deepEqual([ed.figureMemo.drawn,ed.figureMemo.reused],[d1.drawn,d1.reused+1],'nothing drawn again: the kept set is reused');
  // Round 12 (F): the figures are drawn in about 30 ms now (each figure's layout worked out once), so one timing of a
  // reused assembly sits within the machine's noise under load; every reused assembly does the same work, so the fastest
  // of three is the one compared with the drawn one.
  for(let i=0;i<2;i++){const t=performance.now();ed.sddDocument(structuredClone(renamed));memoMs=Math.min(memoMs,performance.now()-t);}
  assert(memoMs<drawnMs,'the second assembly is faster ('+Math.round(memoMs)+' ms against '+Math.round(drawnMs)+' ms)');
  assert.equal(ed.sddDocument(structuredClone(ref)).markdown,md,'and the first document still assembles as it did');
  assert(Object.isFrozen(second.figures)&&Object.isFrozen(second.figures.figures)&&Object.isFrozen(second.figures.figures[0]));assert.throws(()=>{second.figures.figures.push(null);},TypeError);
  // Round 12 (P): up to MATRIX_ROWS requirements the matrix draws one row each; above it, it is drawn by requirement group
  // with every requirement counted in its group's row (no longer the first MATRIX_ROWS in id order), the complete matrix
  // being the annex; either prints at 7 pt or more at the A4 text width.
  const many=Array.from({length:MATRIX_ROWS+1},(_,i)=>({ref:'REQ-'+String(i+1).padStart(3,'0'),title:'Requirement '+(i+1),confirmed:false,counts:{},ids:{}})),grouped=traceabilityFigure(ref,many,{n:1}),few=traceabilityFigure(ref,many.slice(0,3),{n:1});
  assert.match(grouped.caption,new RegExp((MATRIX_ROWS+1)+' requirements by requirement group'));assert.equal(grouped.elements,MATRIX_ROWS+1,'every requirement is counted');assert.equal(grouped.by,'requirement-group');assert(!/the first|at most/.test(grouped.caption+few.caption));
  assert.match(few.caption,/3 requirements × 10 layers/);assert.equal(few.elements,3);for(const f of [grouped,few])assert(f.print.minLabelPt>=7&&f.print.widthPx<=680,'the matrix prints at 7 pt or more at A4 width');
  globalThis.__figureMemoMs={drawnMs:Math.round(drawnMs),memoMs:Math.round(memoMs)};}
 // The executive edition: a concise story and one context figure, every statement naming its records, drafts kept as drafts.
 const ex=ed.sddDocument(ref,{edition:'executive'}),xm=ex.markdown,xt=text(xm);
 assert(words(xm)<=3000,'executive edition: '+words(xm)+' words');
 ['## Document control','## What the solution is','## The requirements that matter most','## The drivers that matter most','## Decisions','## The shape','## Where it runs','## What protects it','## Risks and open items','## Boundary'].reduce((at,h)=>{const i=xm.indexOf('\n'+h+'\n');assert(i>at,h+' in order');return i;},0);
 assert.deepEqual(ex.figures.figures.map(f=>f.key),['context'],'the executive edition includes only its bounded system-context figure');
 assert.equal(figureBlocks(xm).length,1,'the context figure is placed once in the document');
 const textOnlyExecutive=ed.sddDocument(ref,{edition:'executive',figures:false});assert.equal(textOnlyExecutive.figures,null);assert.equal(figureBlocks(textOnlyExecutive.markdown).length,0,'the explicit figure-free edition remains available');
 for(const part of ['## The requirements that matter most','## The drivers that matter most'])for(const line of section(xm,part).split('\n').filter(l=>/^- /.test(l)))assert(/\b(?:[A-Z]{2,5}-\d{3,}|[A-Z]{1,2}\d+)\b/.test(line),'every statement names its records: '+line);
 assert(!/\b(?:all are confirmed|it is confirmed|chose)\b/.test(xt),'drafts stay drafts in words');assert.equal(count(xt,/Unassigned|Open question: /g),0);
 {const pref=structuredClone(ref),d=pref.decisions.records.find(x=>x.alternatives.length>1&&x.status!=='accepted');d.selectedAlternativeId=d.alternatives[1].id;assert.match(ed.sddDocument(pref,{edition:'executive'}).markdown,new RegExp('^\\| '+d.id+' \\| .* \\| '+d.alternatives[1].id+' [^|]*\\(working choice\\) \\|$','m'),'a working choice in a draft decision is said to be one, not an accepted choice');}
 // GR-SDD-09 (on the synthetic workbook): the requirements that matter most are the gaps of the highest band and score,
 // and the sentence names how they were ranked.
 const {document:rich}=await richProject(),rx=ed.sddDocument(rich,{edition:'executive'}).markdown;
 {const BANDS=['critical','high','medium','low'],band=a=>{const i=BANDS.indexOf(String(a?.assessment?.priorityBand??'').trim().toLowerCase());return i<0?9:i;},score=a=>{const n=Number(a?.assessment?.priorityScore);return Number.isFinite(n)&&String(a?.assessment?.priorityScore??'').trim()!==''?n:-1;},gap=a=>{const s=String(a?.assessment?.delivery??'').trim();return !!s&&s.toLowerCase()!=='delivered';};
  const byId=new Map(rich.artefacts.map(a=>[a.id,a])),top=[...section(rx,'## The requirements that matter most').matchAll(/^- (REQ-\d{3,})/gm)].map(m=>byId.get(m[1]));
  const gaps=rv.reviewRequirements(rich).filter(gap),best=Math.min(...gaps.map(band)),bestScore=Math.max(...gaps.filter(a=>band(a)===best).map(score));
  assert(top.length===5&&top.every(gap)&&band(top[0])===best&&score(top[0])===bestScore,'the first is a gap of the highest band with the highest score in it');
  for(let i=1;i<top.length;i++)assert(band(top[i])>band(top[i-1])||band(top[i])===band(top[i-1])&&score(top[i])<=score(top[i-1]),'by band, then by score');
  assert.match(rx,/The five that matter most, ranked by the source assessment: the requirements not yet delivered first, by the source’s priority band \(Critical, High, Medium, Low\) and its score within a band, then the others by their priority/,'the sentence names the ranking basis');}
 // GR-SDD-22: the recorded threats count as security risks by priority, and the most important list ranks critical
 // threats and critical gaps before the checks to fix and to confirm.
 {const risks=section(rx,'## Risks and open items'),ts=rich.security.threats,critical=ts.filter(t=>t.priority==='Critical').length;
  assert(critical>0&&risks.includes('| Security risks: recorded threats by priority | '+ts.length+' ('+critical+' Critical'),'threats counted as risks by priority');
  const list=[...risks.matchAll(/^(\d+)\. (.*)$/gm)].map(m=>m[2]),kind=l=>/— critical threat/.test(l)?0:/critical delivery gap/.test(l)?1:/— high threat/.test(l)?2:/to fix$/.test(l)?3:/to confirm$/.test(l)?4:9;
  assert(list.length&&kind(list[0])===0&&list.some(l=>kind(l)===1)&&list.every((l,i)=>i===0||kind(l)>=kind(list[i-1])),'critical threats, then critical gaps, before the checks: '+list.map(kind).join(','));}
 // GR-SDD-18: what is left is counted once (readiness-model.js sddOpenCounts) and read with its unit by the executive
 // risks, the architecture edition's Appendix B, the registers' At a glance and the Output card; a range of references
 // crosses digit widths.
 {const C=sddOpenCounts(ref),B=sddBoard(ref),n=v=>Number(v).toLocaleString('en-GB'),reg=rv.exportSDD(ref,null);
  assert.deepEqual([B.toFix,B.toConfirm],[C.toFix,C.toConfirm],'the Output card counts what the SDD counts');assert.deepEqual(C.unit,{fix:'finding to fix',confirm:'item to confirm'});
  assert(xm.includes('| Findings to fix | '+C.toFix+' |')&&xm.includes('| Items to confirm | '+C.toConfirm+' |'),'the executive risks');
  assert(md.includes('The chapters’ checks leave '+n(C.toFix)+' finding'+(C.toFix===1?'':'s')+' to fix and '+n(C.toConfirm)+' item'+(C.toConfirm===1?'':'s')+' to confirm'),'Appendix B');
  assert(reg.includes('| Content gaps | '+C.toFix+' findings to fix across ')&&reg.includes('| Review items | '+C.toConfirm+' items to confirm |'),'At a glance');
  assert.equal(refList(['REQ-998','REQ-999','REQ-1000','REQ-1001']),'REQ-998–REQ-1001','a range across a change of digit width');}
 // GR-SDD-16: a layer counts as traced only through a curated link (a record of the layer that names the requirement or
 // its group) or the realising component; the trails derived from the component are counted apart, as inherited.
 {const cov=rv.traceCoverage(ref),L=k=>cov.layers.find(l=>l.key===k),n=cov.requirements,reg=rv.exportSDD(ref,null);
  assert(L('applications').direct===n&&L('realizations').direct===0&&L('realizations').inherited===n&&L('runtime').direct===0&&L('runtime').inherited===n,'the reference names its requirements on responsibilities, so its technology and runtime are inherited: '+JSON.stringify(cov.layers));
  assert(reg.includes('| Traced to technology realization | 0 of '+n+' through a record that names them · '+n+' more inherited through their components |'),'direct and inherited side by side');
  const named=structuredClone(ref);named.technologyRealisation.records[0].requirementIds=['REQ-001'];const c2=rv.traceCoverage(rv.withFinalReview(named)).layers.find(l=>l.key==='realizations');
  assert.deepEqual([c2.direct,c2.inherited],[1,n-1],'a realisation that names a requirement traces it');}
 // GR-SDD-17: a group of findings whose details differ prints each record's detail, twelve at most and then a count; a
 // cause every record shares prints once with its count.
 {const asked=structuredClone(ref);asked.artefacts.forEach((a,i)=>{a.open={owner:{state:'open-question',question:'Who owns record '+(i+1)+'?'}};});
  const reg=rv.exportSDD(rv.withFinalReview(asked),null),n=asked.artefacts.length,group=reg.slice(reg.indexOf('Answer the open questions — '+n+' records, each with its own detail:'));
  assert(n>12&&group.length&&count(group.slice(0,group.indexOf('Treatment:')),/^ {2}[A-Z]{2,5}-\d{3}: Open: Who owns record \d+\?$/gm)===12&&group.includes('And '+(n-12)+' more records, each in its chapter’s Validate.'),'each record\'s own detail, twelve, then the count');
  const shared=rv.findingGroups(ref).find(g=>g.items.length>12&&g.items.every(x=>x.detail===g.items[0].detail)),said=shared&&'— '+shared.items.length+' records, one cause: '+shared.items[0].detail;
  assert(shared&&count(reg,new RegExp(said.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))===1,'a shared cause once, with its count');}
 // GR-SDD-20: no internal id, raw value or orphan label reaches a reader: the editions name records by their references,
 // the registers' findings too, and a runtime route names its contract and both its ends.
 {const internal=new Set();for(const xs of [ref.logical.responsibilities,ref.realisation.components,ref.technology.capabilities,ref.technology.boundaries,ref.technologyRealisation.records,ref.interfaces.contracts,ref.interfaces.data,ref.security.threats,ref.security.controls,ref.runtime.plans])for(const r of xs||[])if(/^[a-z]+-\d{3}$/.test(r.id)&&r.id!==r.ref)internal.add(r.id);
  const reg=rv.exportSDD(ref,null),applies=reg.split('\n').filter(l=>/^ {2}Applies to \d+: /.test(l)).join('\n'),found=(t,ids)=>[...ids].filter(id=>new RegExp('(^|[^A-Za-z0-9_-])'+id+'(?![A-Za-z0-9_-])').test(t));
  assert(internal.size>20,'the reference keeps internal ids apart from its references');
  for(const [name,t] of [['architecture',body],['executive',xt],['the registers\' findings',applies]])assert.deepEqual(found(t,internal),[],name+': no internal id');
  for(const t of [body,xt])assert(!/\{"|":\s*"|\[object Object\]|\bundefined\b|\bnull\b|Owner: (?:event|request|batch)\b/.test(t),'no raw value and no orphan label');
  const routes=exportRuntimeMarkdown(ref).split('\n').filter(l=>/^- RP-\d{3} /.test(l));assert(routes.length&&routes.every(l=>/^- RP-\d{3} · IF-\d{3} [^(]+ \((?:APP|EXT)-\d{3} [^→]+ → (?:APP|EXT)-\d{3} [^)]+\) · ENV-\d{3} /.test(l)),'each route names its contract and both its ends');}
 // GR-SDD-21: a project's own records print no sample wording; "illustrative" appears only where reference content is.
 {const own=structuredClone(ref);const all=[];for(const k of ['artefacts'])all.push(...own[k]);for(const [k,c] of [['quality','drivers'],['decisions','records'],['logical','responsibilities'],['realisation','components'],['technology','capabilities'],['technologyRealisation','records'],['interfaces','contracts'],['interfaces','data'],['security','threats'],['security','controls'],['runtime','plans']])all.push(...(own[k]?.[c]||[]));
  assert(all.length&&all.every(r=>r.origin!=='reference'),'the clinic journey is the project\'s own, drafted by the journey rules');// The clinic's brief is written as a teaching example and says so: the project's own brief here says what it needs.
  const brief='Book, change and cancel appointments online.';own.brief={...own.brief,problem:brief};own.coauthoring.sources=own.coauthoring.sources.map(x=>({...x,text:brief,versions:(x.versions||[]).map(v=>({...v,excerpt:brief}))}));
  // The chapters' checks keep two pre-round-12 wordings ("includes illustrative or draft content", "Review the illustrative or
  // draft requirements") that the legacy readings pin word for word (fingerprint-validate.mjs); they are quoted wherever the
  // registers list findings. Every other word of the registers, and the editions, are read here.
  const PINNED=/includes illustrative or draft content|Review the illustrative or draft requirements/g,reg=rv.exportSDD(rv.withFinalReview(own),null).replace(PINNED,''),arch=ed.sddDocument(rv.withFinalReview(own),{figures:false}).markdown,exe=ed.sddDocument(rv.withFinalReview(own),{edition:'executive'}).markdown;
  for(const [name,t] of [['architecture',arch],['executive',exe],['registers',reg]])assert(!/[Ii]llustrative|\bBank\b|[Pp]ayment/.test(t),name+': no sample wording: '+(t.match(/.{0,60}(?:[Ii]llustrative|\bBank\b|[Pp]ayment).{0,40}/)||[''])[0]);
  assert(/[Ii]llustrative/.test(rv.exportSDD(base,null)),'the bank reference, whose records are reference content, still says so');}
 // GR-SDD-23: a statement holding a tag prints it escaped in Markdown, as the HTML edition prints it.
 {const tagged=structuredClone(ref),r=tagged.artefacts.find(a=>a.id==='REQ-001');r.title='Show <b>bold</b> totals';const tm=ed.sddDocument(rv.withFinalReview(tagged),{figures:false}).markdown;
  assert(tm.includes('Show \\<b\\>bold\\</b\\> totals')&&!/Show <b>/.test(text(tm)),'the tag escaped in the Markdown');const th=rv.sddHTML(tm,null,{figures:{figures:[],manifest:[],omitted:[]}});assert(th.includes('Show &lt;b&gt;bold&lt;/b&gt; totals')&&!th.includes('<b>bold</b>'),'and printed as text in the HTML');}
 // Audiences keep their sections (sdd-architecture-validate.mjs holds them whole).
 const del=ed.sddDocument(ref,{audience:'delivery'}),dm=del.markdown,rev=ed.sddDocument(ref,{audience:'review'}),rm=rev.markdown;
 assert(dm.includes('\n# 4. ')&&dm.includes('\n# 5. ')&&!dm.includes('\n# 2. ')&&dm.includes('\n# Delivery obligations\n')&&del.figures.figures.length===set.figures.length,'delivery: the components, the models with their figures and the obligations');
 assert(rm.includes('\n# 2. ')&&rm.includes('\n# 3. ')&&rm.includes('\n# 6. ')&&!rm.includes('\n# 4. ')&&rev.figures===null,'review: the drivers, the decisions and the refinements, the shape in brief');
 assert(words(dm)<words(md)&&words(rm)<words(md),'each audience reads less');
 const exd=ed.sddDocument(ref,{edition:'executive',audience:'delivery'}).markdown,exr=ed.sddDocument(ref,{edition:'executive',audience:'review'}).markdown;
 assert(exd.includes('## Interfaces and data')&&exd.includes('## Where it runs')&&!exd.includes('## Decisions')&&exd.includes('## Delivery obligations'));
 assert(exr.includes('## Decisions')&&exr.includes('## What protects it')&&!exr.includes('## Delivery obligations'));
 // The route: every edition and audience in Markdown, HTML and JSON; the project only when asked; a frozen baseline only
 // as it was frozen; every file named after the project, the chapter exports too.
 const files=new Map(),renv={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:env.ASSETS},rapi=(path,method='GET',payload=null)=>api(path,method,payload,'reviewer-a','https://aiw.test',renv);
 try{
  const rid=(await(await rapi('/api/projects','POST',{name:'Clinic appointments',template:'clinic-appointments'})).json()).document.id,get=q=>rapi('/api/export?project='+rid+'&chapter=11&'+q);
  for(const edition of ['architecture','executive'])for(const audience of ['all','delivery','review']){
   const q='edition='+edition+'&audience='+audience,suffix=(edition==='executive'?'_Executive':'')+(audience==='all'?'':audience==='delivery'?'_Delivery':'_Review');
   const mres=await get('format=md&'+q),mdo=await mres.text();assert.equal(mres.status,200);assert.match(mres.headers.get('Content-Disposition'),new RegExp('^attachment; filename="AIW_Clinic_appointments_Working_SDD'+suffix+'\\.md"$'));
   assert.equal(figureBlocks(mdo).length,figureBlocks(ed.sddDocument(ref,{edition,audience}).markdown).length);
   const hres=await get('format=html&'+q),html=await hres.text();assert(hres.headers.get('Content-Security-Policy').includes("default-src 'none'")&&!/<script/i.test(html));
   assert.equal(count(html,/<figure class="model-figure notation-figure"/g),figureBlocks(mdo).length,edition+'/'+audience+': every figure drawn in the HTML');assert(!html.includes('&lt;svg'),'figures rendered, not printed');
   const j=await(await get('format=json&'+q)).json();assert.equal(j.markdown,mdo);assert.deepEqual([j.edition,j.audience],[edition,audience]);assert.equal(j.figures?.manifest.length||0,figureBlocks(mdo).length);assert.equal(j.project,undefined,'the project travels only when asked');
  }
  const asked=await(await get('format=json&embed=project')).json();assert(asked.project?.id===rid&&asked.connectedModel?.nodes?.length,'embed=project: the project and its connected model');
  const view=await get('view=1&edition=executive');assert(view.headers.get('Content-Disposition').startsWith('inline;')&&(await view.text()).includes('Executive edition'),'view=1 opens the HTML');
  assert((await(await get('format=md&detail=summary')).text()).includes('· Executive edition'),'the retired summary link opens the executive edition');
  assert(isArchitectureEdition(await(await get('format=md&edition=full')).text()),'the retired full edition link opens the architecture edition');
  assert.equal((await get('format=md&edition=short')).status,400);assert.equal((await get('format=md&audience=board')).status,400);
  for(let chapter=1;chapter<=10;chapter++){const r=await rapi('/api/export?project='+rid+'&chapter='+chapter+'&format=md');assert.equal(r.status,200);assert.match(r.headers.get('Content-Disposition'),/^attachment; filename="AIW_Clinic_appointments_[A-Za-z_]+\.md"$/,'chapter '+chapter+': named after the project');}
  let st=await(await rapi('/api/project?project='+rid)).json();let frozenWhole=null;const rpost=async(type,payload={})=>{if(type==='baseline'){const f=await freezeBaseline((path,body)=>rapi(path,body?'POST':'GET',body),{...payload,project:rid});assert(!f.error,f.error);st=f.state;frozenWhole=f.baseline;return;}const r=await rapi('/api/commands?project='+rid,'POST',{revision:st.revision,command:{type:'review.'+type,payload}});assert.equal(r.status,200);st=await r.json();};
  await rpost('checks');await rpost('baseline',capture(st.document));const b=frozenWhole;assert.equal(b.id,st.document.finalReview.baselines.at(-1).id);
  assert.equal((await get('format=md&baseline='+b.id+'&edition=executive')).status,400,'a baseline is kept as frozen');assert.equal(await(await get('format=md&baseline='+b.id)).text(),b.markdown);
  const fh=await(await get('format=html&baseline='+b.id)).text();assert.equal(count(fh,/<figure class="model-figure notation-figure"/g),figureBlocks(b.markdown).length);assert(!fh.includes('the copy kept in the Markdown'),'the frozen figures drawn again are the frozen bytes');
 }finally{renv.DB.close()}
 // The shared Output tab carries the selected edition/audience in its preview link
 // and export form; the baseline workflow remains separate.
 {const s2=createReviewStudio({value:{document:base}});s2.bind({state:{chapter:11,tab:'output',selected:'api',reviewRequirement:'REQ-001',visible:['logical'],cursor:true},getNode:()=>null});const out=s2.output(),at=t=>{const i=out.indexOf(t);assert(i>=0,'Output shows '+t);return i;};
  assert(at('Open preview in new tab')<at('<form class="rv-export-form" action="/api/export" method="get"')&&at('Download or export')<at('Freeze baseline'));
  for(const t of ['name="edition"','value="executive"','value="architecture" selected','name="audience"','value="delivery"','value="review"','data-output-open','name="format" value="md"','name="format" value="html"','name="format" value="json"','data-wb-action="docx"','data-wb-action="pdf"','<input type="hidden" name="chapter" value="11">','Capture an architecture edition'])at(t);
  assert.deepEqual(exportChoice(null),{edition:'architecture',audience:'all'});const fake=v=>({querySelector:()=>({elements:{edition:{value:v},audience:{value:'review'}}})});assert.deepEqual(exportChoice(fake('executive')),{edition:'executive',audience:'review'});assert.deepEqual(exportChoice(fake('full')),{edition:'architecture',audience:'review'},'a form still holding the retired edition asks for the architecture edition');}
 // Word and PDF from the Markdown: the figures as images where the browser drew them (a stand-in image here).
 {const zip=buf=>{const b=Buffer.from(buf);let e=b.length-22;while(e>0&&b.readUInt32LE(e)!==0x06054b50)e--;const n=b.readUInt16LE(e+10);let o=b.readUInt32LE(e+16);const names=[];for(let i=0;i<n;i++){const l=b.readUInt16LE(o+28),x=b.readUInt16LE(o+30),c=b.readUInt16LE(o+32);names.push(b.toString('utf8',o+46,o+46+l));o+=46+l+x+c;}return names;};
  const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64')),jpeg=Uint8Array.from(Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=','base64'));
  for(const m of [md,xm]){
   const fb=figureBlocks(m),made=await makeReviewDOCX(m,'Clinic appointments Solution Design',{figures:new Map(fb.map((f,i)=>[f.n,{type:'image/png',width:800,height:400,pixelWidth:1,pixelHeight:1,data:Uint8Array.from([...png.slice(0,-12),i&255,...png.slice(-11)])}]))}),names=zip(made instanceof Blob?Buffer.from(await made.arrayBuffer()):made);
   assert.equal(names.filter(n=>/^word\/media\/.+\.png$/.test(n)).length,fb.length,'every figure embedded as an image');assert(names.includes('word/document.xml'));
   const pdf=Buffer.from(makeReviewPDF(m,'Clinic appointments Solution Design',{figures:new Map(fb.map(f=>[f.n,{type:'image/jpeg',width:800,height:400,pixelWidth:1,pixelHeight:1,data:jpeg}]))})).toString('latin1');
   assert.equal(count(pdf,/\/Subtype \/Image/g),fb.length,'every figure embedded in the PDF');
   const plain=Buffer.from(makeReviewPDF(m,'Clinic appointments Solution Design')).toString('latin1');assert.equal(count(plain,/\/Subtype \/Image/g),0,'without drawings the PDF names its figures instead');
  }}
 console.log('PASS SDD editions: the architecture edition (the full edition retired; its registers the review registers annex) titled on its cover with the SDD-SPEC sections in order, its '+set.figures.length+' C4 figures as inline SVG in section 5, markers where gaps sit, who wrote it from the records, a change section against the last frozen baseline (a freeze keeps the architecture edition, drawn from its frozen source); the executive edition in '+words(xm)+' words with every statement naming its records and drafts kept as drafts; GR-SDD-09 the requirements that matter most by band and score with the basis said; GR-SDD-22 threats as risks by priority, critical threats and gaps first; GR-SDD-18 one count read everywhere; GR-SDD-16 direct and inherited coverage; GR-SDD-17 each record\'s detail, twelve then a count, a shared cause once; GR-SDD-20 references, never internal ids, routes with their contract and ends; GR-SDD-21 no sample wording on a project\'s own records; GR-SDD-23 tags escaped; audiences keep their sections; the route serves every edition and audience and a baseline only as frozen, every file named after the project; the Output form carries the choice; Word and PDF embed the figures the browser drew.');
}

// The roadmap (round 6, Contract S) as a review record: kept beside the review and outside the design's fingerprint,
// changed only through the review commands (each a review version), carried by a frozen baseline, written into the SDD.
{let p=cmd(structuredClone(base),'action',{title:'Earlier action',owner:'Fixture owner',due:'2026-10-01',acceptance:'Recorded.',objectIds:['api'],findingId:''});const stamp=rv.reviewSourceStamp(p),version=p.finalReview.version;
 assert.equal('roadmap' in rv.reviewSource(p),false,'the roadmap is not part of the design source');
 p=cmd(p,'plateau',{title:'As is',kind:'current',order:1});p=cmd(p,'plateau',{title:'Target',kind:'target',order:2,due:'2027-06-30'});p=cmd(p,'plateau-assign',{objectId:'api',introducedIn:'PLT-002',retiredIn:null});
 assert.equal(rv.reviewSourceStamp(p),stamp,'plateaus do not change the design stamp');assert.equal(p.finalReview.version,version+3,'each roadmap command bumps the review version');assert.equal(p.finalReview.checks,null);
 assert(rv.actionCurrent(p,p.finalReview.actions[0]),'an earlier action stays current');assert.equal(p.finalReview.actions[0].plateauId,'','an action saved before the roadmap names no plateau');
 assert.deepEqual(p.roadmap.history.map(h=>[h.action,h.actor]),[['added','architect-a'],['added','architect-a'],['assigned','architect-a']],'each change is a history entry with who made it');
 assert.deepEqual(rv.finalFindings(p).filter(f=>f.code.startsWith('ROADMAP')).map(f=>[f.id,f.level]),[['ROADMAP-NO-ACTION:PLT-002','warning']],'the plan\'s findings join the final checks as review items: the target has no action yet (api is named by the earlier action, so it is planned)');
 p=cmd(p,'action',{...rv.actionDefinition(p.finalReview.actions[0]),plateauId:'PLT-002'});assert.equal(p.finalReview.actions[0].plateauId,'PLT-002');assert.equal(p.finalReview.actions[0].revision,2);
 assert.throws(()=>cmd(p,'action',{...rv.actionDefinition(p.finalReview.actions[0]),plateauId:'PLT-009'}),/existing plateau/);
 assert.deepEqual(rv.finalFindings(p).filter(f=>f.code.startsWith('ROADMAP')),[],'the action now names the target, which settles the plan\'s finding');
 p=cmd(p,'checks',{});p=cmd(p,'baseline',{title:'With a roadmap',reviewed:true,stamp:rv.reviewDesignStamp(p)});const b=p.finalReview.baselines.at(-1);
 assert.deepEqual(b.review.roadmap.plateaus.map(x=>x.id),['PLT-001','PLT-002'],'a frozen baseline carries the roadmap as it stood');assert.match(b.markdown,/\n## Plateaus\n[\s\S]*\| PLT-002 · Target \| [^|]+ \| 2027-06-30 \| 1 \| 0 \|/,'and its architecture edition prints the plateaus in section 6 (round 12, F)');
 const md=rv.assembleSDD(p);assert(md.indexOf('## Transition')>md.indexOf('## Delivery and verification obligations')&&md.indexOf('## Transition')<md.indexOf('## Source findings and review treatments'),'the Transition section follows the delivery obligations');
 assert.equal(rv.assembleSDD(structuredClone(base)).includes('## Transition'),false,'without plateaus the SDD has no Transition section');
 // The architecture edition (round 12, F; SDD-SPEC §6) prints the plateaus, what each introduces and retires and the
 // delivery actions towards it, in its section 6, for everyone and for reviewers; the delivery team reads each obligation with its plateau. The executive
 // edition, two pages, prints no plan.
 for(const audience of ['all','review'])assert.match(sddDocumentForRoadmap(p,{audience,figures:false}).markdown,/\n## Plateaus\n\n\| Plateau \| Kind \| Due \| Introduces \| Retires \| Actions \|\n[\s\S]*\| PLT-001 · As is \| [^|]+ \| — \| 0 \| 0 \| 0 \|\n\| PLT-002 · Target \| [^|]+ \| 2027-06-30 \| 1 \| 0 \| 1 \|/,audience+' prints the plateaus');
 assert.match(sddDocumentForRoadmap(p,{audience:'delivery',figures:false}).markdown,/\*\*RA-001 · [^*]+\*\*: [^\n]*Objects: LR-001\.[^\n]* Plateau: PLT-002 · Target/,'delivery: the obligation with its objects by reference and its plateau');
 assert.equal(sddDocumentForRoadmap(structuredClone(base),{figures:false}).markdown.includes('\n## Plateaus\n'),false,'without plateaus the architecture edition prints none');
 console.log('PASS roadmap as a review record: outside the design fingerprint, each command a review version with its history entry, an action names a plateau that exists, the plan\'s findings join the final checks, the frozen baseline and the assembled SDD carry it');}
