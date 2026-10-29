import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createProject} from './shared/projects-domain.js';
import {reviewSourceStamp,reviewDesignStamp} from './public/review-domain.js';
import {applyArchitectureCaseCommand,architectureCases,caseContextBasis,caseReviewBasis,caseConclusionBasis,caseObservationCurrent,architectureCaseAssessment,architectureCaseExport,evaluateArchitectureCase,CASE_DIMENSIONS} from './public/architecture-case.js';
import {renderArchitectureCases,caseRequirementPicker,settlementHTML,settlementStep,settlementProposal} from './public/architecture-case-ui.js';
import {settlementInvestigation,settlementPolicyCommand} from './public/settlement-investigation.js';
import {architectureModel,relationshipFindings} from './public/architecture-model.js';
import {notationDiagram} from './public/notation-model.js';
import {previewInterfaceChange} from './public/interface-impact.js';
import {analyseQuality,analysisModelStamp,measurementCurrent} from './public/quality-analysis.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
const at=new Date().toISOString(),original=createProject({name:'Synthetic case verification',template:'bank-payment'},'case-verification',at);
let p=original;
const scope=()=>({title:'Payment trace',purpose:'Inspect the synthetic payment requirement trail and expose missing evidence.',requirementIds:['REQ-001'],basis:caseContextBasis(p)});
const apply=(type,payload)=>{p=applyArchitectureCaseCommand(p,{type,payload},at,'fixture-architect').document;};
const stale={...scope(),basis:'old'};assert.throws(()=>apply('case.save',stale),/Reopen the case scope/);
assert.throws(()=>apply('case.save',{...scope(),requirementIds:['REQ-missing']}),/in-scope/);
assert.throws(()=>apply('case.save',{...scope(),requirementIds:['REQ-001','REQ-001']}),/distinct/);
const sourceStamp=reviewSourceStamp(p),designStamp=reviewDesignStamp(p);
apply('case.save',scope());let c=architectureCases(p)[0];
assert.equal(c.id,'AC-001');assert.equal(architectureCases(original).length,0,'Commands do not mutate their input');
assert.equal(reviewSourceStamp(p),sourceStamp);assert.equal(reviewDesignStamp(p),designStamp,'Review observations must not invalidate SDD design authority');
let report=evaluateArchitectureCase(p,{requirementIds:c.requirementIds,sampleIds:['REQ-001','missing']});
assert.equal(report.requirements.inScope,1);assert.equal(report.rows.length,1);assert(report.rows[0].linkedStages.logicalApplication.length>0);
assert.equal(report.sample[1].found,false);assert.equal(report.chapterScope,'case');assert.equal(report.eligibleSignedRepositoryClaims,0);
assert(report.projectGate.blockers.some(b=>b.includes('SDD baseline')));
assert(!report.blockers.some(b=>b.includes('SDD baseline')||b.includes('Project-wide')),'Project approval is not a focused-case blocker');
assert(report.blockers.some(b=>b.includes('original source')));assert.equal(report.acceptance,'blocked');
const observation={id:c.id,basis:caseReviewBasis(p,c),dimension:CASE_DIMENSIONS[0],outcome:'gap',reviewer:'Fixture architect',notes:'Synthetic requirement lacks independent confirmation.',reference:'REQ-001 / illustrative fixture',reviewed:true};
assert.throws(()=>apply('case.observe',{...observation,reviewed:false}),/Confirm/);
assert.throws(()=>apply('case.observe',{...observation,reference:''}),/reference/);
apply('case.observe',observation);c=architectureCases(p)[0];assert(caseObservationCurrent(p,c,c.observations[0]));
assert.equal(reviewDesignStamp(p),designStamp);
assert.equal(architectureCaseAssessment(p,c).status,'gaps-identified');
const conclusion={id:c.id,basis:caseConclusionBasis(p,c),outcome:'support',notes:'Review of the current scope and source limitations.',reference:'REQ-001 source and observations',reviewed:true};
assert.throws(()=>apply('case.conclude',conclusion),/different authenticated architect/);
assert.throws(()=>applyArchitectureCaseCommand(p,{type:'case.conclude',payload:conclusion},at,'second-architect'),/readiness blockers/);
apply('case.conclude',{...conclusion,outcome:'rework'});c=architectureCases(p)[0];
assert.equal(architectureCaseAssessment(p,c).conclusion.outcome,'rework');
let reviewed=p;
for(const dimension of CASE_DIMENSIONS){
 const current=architectureCases(reviewed)[0];
 reviewed=applyArchitectureCaseCommand(reviewed,{type:'case.observe',payload:{id:current.id,basis:caseReviewBasis(reviewed,current),dimension,outcome:'observed',reviewer:'Independent fixture architect',notes:'Fixture-only evidence inspection; no real project approval.',reference:'Synthetic object and source review',reviewed:true}},at,'second-architect').document;
}
assert.equal(architectureCaseAssessment(reviewed,architectureCases(reviewed)[0]).status,'independent-observations-recorded');
assert.equal(architectureCaseAssessment(reviewed,architectureCases(reviewed)[0]).conclusion,null,'A new observation invalidates the earlier case conclusion');
assert.equal(evaluateArchitectureCase(reviewed,{caseId:c.id,requirementIds:c.requirementIds}).acceptance,'blocked','Independent observations cannot override unconfirmed scope or absent original source');
assert.throws(()=>applyArchitectureCaseCommand(reviewed,{type:'case.conclude',payload:{...conclusion,basis:caseConclusionBasis(reviewed,architectureCases(reviewed)[0])}},at,'second-architect'),/readiness blockers/);
// A source-located, confirmed requirement can receive independent case support
// without a complete SDD or an eligible repository claim. No human sign-off is
// simulated beyond this deliberately synthetic command fixture.
let focused=structuredClone(p);focused.artefacts.find(r=>r.id==='REQ-001').confirmed=true;
focused.artefacts.find(r=>r.id==='REQ-001').provenance={sheet:'Synthetic requirements',sourceRow:4,cells:{description:'D4'},workbookHash:'synthetic-sha256'};
const beforeReview=evaluateArchitectureCase(focused,{caseId:c.id,requirementIds:['REQ-002']});
assert.deepEqual(beforeReview.caseScope.requirementIds,['REQ-001'],'Saved scope wins over caller-supplied IDs');
assert.equal(beforeReview.requirements.sourceLocated,1);assert(beforeReview.blockers.some(x=>/permitted use/.test(x)));
assert.equal(beforeReview.sourceUse.acknowledged,false);
assert.equal(beforeReview.projectGate.ready,false);
assert.equal(beforeReview.eligibleSignedRepositoryClaims,0);
assert.equal(beforeReview.sourceEvidence[0].location,'Synthetic requirements · row 4 · D4');
for(const dimension of CASE_DIMENSIONS){const current=architectureCases(focused)[0];focused=applyArchitectureCaseCommand(focused,{type:'case.observe',payload:{id:current.id,basis:caseReviewBasis(focused,current),dimension,outcome:'observed',reviewer:'Independent fixture architect',notes:'Synthetic source and model only; no actual quality target proven.',reference:'Synthetic requirements D4 / linked model',sourceRightsReviewed:dimension==='Evidence precision',reviewed:true}},at,'second-architect').document;}
assert.equal(evaluateArchitectureCase(focused,{caseId:c.id}).sourceUse.acknowledged,true);
const readyCase=architectureCases(focused)[0],supportBasis=caseConclusionBasis(focused,readyCase);
focused=applyArchitectureCaseCommand(focused,{type:'case.conclude',payload:{id:readyCase.id,basis:supportBasis,outcome:'support',notes:'Synthetic scoped case only; no SDD approval.',reference:'Synthetic requirements D4',reviewed:true}},at,'second-architect').document;
assert.equal(evaluateArchitectureCase(focused,{caseId:c.id}).acceptance,'independent case review recorded');
assert.equal(evaluateArchitectureCase(focused,{caseId:c.id}).projectGate.ready,false,'Whole-project approval remains separate');
const invalidApproval=structuredClone(focused);invalidApproval.finalReview.baselines.push({id:'BL-synthetic',classification:'Architect reviewed',stamp:reviewDesignStamp(invalidApproval),reviewId:null,actor:'same-person'});
invalidApproval.finalReview.governance.push({id:'GV-synthetic',baselineId:'BL-synthetic',outcome:'Approved',actor:'same-person'});
assert(evaluateArchitectureCase(invalidApproval,{caseId:c.id}).projectGate.blockers.some(x=>x.includes('second authenticated person')),'A same-person whole-project approval cannot pass the separate gate');
const rightsTampered=structuredClone(focused),precision=rightsTampered.finalReview.architectureCases[0].observations.find(o=>o.dimension==='Evidence precision');
precision.sourceRightsReviewed=false;
assert.equal(evaluateArchitectureCase(rightsTampered,{caseId:c.id}).sourceUse.acknowledged,false,'A rights acknowledgement cannot be inferred from a source locator');
assert.equal(architectureCaseAssessment(rightsTampered,architectureCases(rightsTampered)[0]).conclusion,null,'Changing an observation invalidates its prior conclusion');
const referenceTampered=structuredClone(focused);referenceTampered.finalReview.architectureCases[0].observations.find(o=>o.dimension==='Evidence precision').reference='different cited original';
assert.equal(architectureCaseAssessment(referenceTampered,architectureCases(referenceTampered)[0]).conclusion,null,'A changed evidence reference invalidates the case conclusion');
const unrelated=structuredClone(focused);unrelated.artefacts.find(r=>r.id==='REQ-002').title+=' unrelated edit';
unrelated.finalReview.version++;unrelated.finalReview.baselines.push({id:'BL-unrelated',classification:'Working draft',stamp:'stale'});
unrelated.knowledge={version:0,counter:0,sources:[],suggestions:[],claims:[],contradictions:[],releases:[{id:'KR-unlinked',claims:[],checksum:'unlinked'}],pins:[],withdrawals:[],links:[],history:[]};
assert.equal(caseReviewBasis(unrelated,architectureCases(unrelated)[0]),caseReviewBasis(focused,architectureCases(focused)[0]));
assert.equal(architectureCaseAssessment(unrelated,architectureCases(unrelated)[0]).conclusion.outcome,'support','Unrelated requirement, baseline and release edits leave case review current');
const targetChanged=structuredClone(focused),driverId=beforeReview.rows[0].linkedStages.quality[0]?.id;
assert(driverId);targetChanged.quality.drivers.find(d=>d.id===driverId).targetValue='999';
assert.equal(architectureCaseAssessment(targetChanged,architectureCases(targetChanged)[0]).conclusion,null,'Connected quality target change invalidates case review');
const edgeChanged=structuredClone(focused);edgeChanged.relationships.find(e=>e.from==='REQ-001'||e.to==='REQ-001').label='Changed relation';
assert.equal(architectureCaseAssessment(edgeChanged,architectureCases(edgeChanged)[0]).conclusion,null,'Connected relationship edits invalidate case review');
const sourceChanged=structuredClone(focused);sourceChanged.artefacts.find(r=>r.id==='REQ-001').provenance.workbookHash='revised-original';
assert.equal(architectureCaseAssessment(sourceChanged,architectureCases(sourceChanged)[0]).conclusion,null,'Changed original source invalidates case review');
const linkedSource=structuredClone(focused);linkedSource.coauthoring={schemaVersion:1,counters:{source:1,task:1},sources:[{id:'SRC-fixture',versions:[{revision:1,title:'Permitted fixture original',location:'Fixture / line 4',excerpt:'Synthetic payment obligation',status:'Confirmed',confirmedBy:'Fixture architect'}]}],tasks:[{id:'SOL-fixture',status:'applied',sourceId:'SRC-fixture',applied:{ids:{requirement:'REQ-001'}}}]};
assert.equal(evaluateArchitectureCase(linkedSource,{caseId:c.id}).sourceEvidence.length,2,'Linked source revision joins the case dossier');
assert.equal(architectureCaseAssessment(linkedSource,architectureCases(linkedSource)[0]).conclusion,null);
const unrelatedOriginal=structuredClone(focused);unrelatedOriginal.coauthoring={schemaVersion:1,counters:{source:1,task:0},sources:[{id:'SRC-other',versions:[{revision:1,title:'Unrelated original',location:'Fixture / line 10',excerpt:'Unrelated',status:'Confirmed'}]}],tasks:[]};
assert.equal(caseReviewBasis(unrelatedOriginal,architectureCases(unrelatedOriginal)[0]),caseReviewBasis(focused,architectureCases(focused)[0]),'Unlinked original does not stale case observations');
const runtimePlan=beforeReview.rows[0].linkedStages.runtime[0]?.id;
assert(runtimePlan);const observedRuntime=structuredClone(focused);observedRuntime.runtime.evidence.push({id:'RV-fixture',planId:runtimePlan,kind:'exercise',result:'partial',reference:'synthetic exercise',observations:'Fixture outcome',reviewer:'Fixture architect',stamp:'historical',at});
assert(evaluateArchitectureCase(observedRuntime,{caseId:c.id}).testObservations.some(x=>x.id==='RV-fixture'&&x.current===false),'Dossier identifies captured but stale exercise evidence');
assert.equal(architectureCaseAssessment(observedRuntime,architectureCases(observedRuntime)[0]).conclusion,null,'Connected exercise changes the case basis');
// A new measurement reads the requirement's actual connected operating/control
// context. Its own currency and the case review agree when that context changes.
{
 const measured=structuredClone(original),t={id:'DT-measured',requirementId:'REQ-001',driverId:measured.quality.drivers[0].id,topic:'interaction',answers:{analysis:{inputs:{arrival:20,service:15,workers:2,backlog:120}}},applied:{records:[]},measurements:[]};
 measured.coauthoring??={};measured.coauthoring.designTasks=[t];
 measured.knowledge={version:0,counter:0,sources:[{id:'S-measured',hash:'synthetic-original-hash',revision:'1'}],suggestions:[],claims:[],contradictions:[],releases:[],pins:[],withdrawals:[],links:[],history:[]};
 const estimate=analyseQuality(t.topic,t.answers.analysis,'queued'),m={id:'M-measured',optionId:'queued',analysisStamp:estimate.stamp,modelStamp:analysisModelStamp(measured,t),source:{id:'S-measured',hash:'synthetic-original-hash',revision:'1'}};
 t.measurements.push(m);assert(measurementCurrent(measured,t,m));
 const elsewhere=structuredClone(measured);elsewhere.runtime.environments.push({...elsewhere.runtime.environments[0],id:'env-elsewhere',assetIds:[],title:'Unrelated environment'});
 assert(measurementCurrent(elsewhere,elsewhere.coauthoring.designTasks[0],m));
 const changedPlan=structuredClone(measured);changedPlan.runtime.plans.find(r=>r.id==='run-001').owner='Different operating owner';
 assert(!measurementCurrent(changedPlan,changedPlan.coauthoring.designTasks[0],m),'A connected runtime change stales the measurement');
 const changedControl=structuredClone(measured);changedControl.security.controls.find(r=>r.id==='oauth').owner='Different control owner';
 assert(!measurementCurrent(changedControl,changedControl.coauthoring.designTasks[0],m),'A connected control change stales the measurement');
 const changedMeasureSource=structuredClone(measured);changedMeasureSource.knowledge.sources[0].hash='revised-original-hash';
 assert(!measurementCurrent(changedMeasureSource,changedMeasureSource.coauthoring.designTasks[0],m),'The exact measurement source revision remains bound');
}
const staleAssessment=structuredClone(reviewed);staleAssessment.artefacts.find(r=>r.id==='REQ-001').title+=' updated';
assert.equal(architectureCaseAssessment(staleAssessment,architectureCases(staleAssessment)[0]).status,'assessment-incomplete');
assert.equal(architectureCaseAssessment(staleAssessment,architectureCases(staleAssessment)[0]).conclusion,null);
const changed=structuredClone(p);changed.artefacts.find(r=>r.id==='REQ-001').title+=' changed';
assert(!caseObservationCurrent(changed,c,c.observations[0]));assert.throws(()=>applyArchitectureCaseCommand(changed,{type:'case.observe',payload:observation}),/changed/);
apply('case.save',{...scope(),id:c.id,purpose:'Reframed review question.'});c=architectureCases(p)[0];assert.equal(c.history.length,2);assert(!caseObservationCurrent(p,c,c.observations[0]));assert.equal(c.startingPoint.report.requirements.inScope,1);
const removed=structuredClone(p);removed.artefacts.find(r=>r.id==='REQ-001').scopeMode='out';const missing=evaluateArchitectureCase(removed,{requirementIds:c.requirementIds});assert.equal(missing.rows.length,0);assert.deepEqual(missing.missingRequirementIds,['REQ-001']);
const exported=architectureCaseExport(p,c.id);assert.equal(exported.observations[0].current,false);assert.equal(exported.current.projectId,p.id);
globalThis.window={location:{search:'?project=case-verification'}};
const html=renderArchitectureCases(p,c.id);assert(html.includes('Follow in Model')&&html.includes('Changed since review'));
const hostile=structuredClone(p);hostile.finalReview.architectureCases[0].title='<img src=x onerror=alert(1)>';assert(!renderArchitectureCases(hostile,c.id).includes('<img'));
const pickerProject=structuredClone(p);pickerProject.artefacts=Array.from({length:1400},(_,i)=>({id:'REQ-'+i,externalId:'FRD-'+i,title:'Synthetic '+i,type:'requirement'}));assert.equal((caseRequirementPicker(pickerProject,new Set(['REQ-1399'])).match(/type="checkbox"/g)||[]).length,40);assert(caseRequirementPicker(pickerProject,new Set(['REQ-1399']),'FRD-1399').includes('checked'));

// The settlement investigation (round 5, R5-C) is part of the case: the recovery question, the same payment followed
// through Chapters 4–11 on their own models, the recorded approaches compared, and the contract change previewed through
// the interface impact review. Comparing and previewing record nothing; a blind retry is never proposed.
{
 assert.match(renderArchitectureCases(p,c.id),/data-rv-action="settle-start"/);assert.match(renderArchitectureCases(p,'',{}),/data-rv-action="settle-start"/);
 let st=settlementStep({},'settle-start');const open=settlementHTML(p,st);
 assert.equal((open.match(/data-rv-action="settle-stage"/g)||[]).length,8);assert.match(open,/data-rv-action="settle-trace"/);assert.match(open,/data-rv-id="4" aria-current="step"/);
 st=settlementStep(st,'settle-stage','8');const eighth=settlementHTML(p,st);assert.match(eighth,/Chapter 8 · What does the external contract promise\?/);assert.match(eighth,/chapter=8&amp;tab=model&amp;object=network/);
 const f=settlementInvestigation(p,architectureModel(p)),enquire=f.options.find(o=>o.strategy==='enquire_first'),retry=f.options.find(o=>o.strategy==='blind_retry');
 st=settlementStep(st,'settle-compare',f.options[0].id);assert.equal(st.compare,true);assert.match(settlementHTML(p,st),/aria-expanded="true"/);
 st=settlementStep(st,'settle-option',retry.id);assert.match(settlementHTML(p,st),/no proposal is offered/);assert.doesNotMatch(settlementHTML(p,st),/settle-policy/);assert.match(settlementProposal(p,st).error,/provider evidence/);
 st=settlementStep(st,'settle-option',enquire.id);assert.match(settlementHTML(p,st),/data-rv-action="settle-policy"/);
 const {command}=settlementProposal(p,st);assert.deepEqual(command,settlementPolicyCommand(f));
 assert.deepEqual(previewInterfaceChange(p,command).fields.map(x=>x.key),['timeoutPolicy','retryPolicy','failurePolicy','assumptions']);
 assert.equal(p.interfaces.contracts.find(x=>x.id==='network').timeoutPolicy,'','Comparing and previewing record nothing');
 assert.deepEqual(settlementStep(st,'settle-close'),{open:false,stage:null,compare:false,option:null});
 assert.equal(settlementHTML(createProject({name:'Blank',template:'blank'},'blank-case',at),{open:true}),'','Only the Bank Payment Journey carries the investigation');
}

// Round 6 (Contract T): the typed relationships and the sequence picture the investigation can follow are readings of the
// same records — they change no basis stamp and raise no finding on the case project — and the settlement contract's
// sequence draws the worker, the network and the two payloads it exchanges, request then response.
{
 const basis=caseContextBasis(p),M=architectureModel(p),trail=M.relationships.filter(e=>e.from==='REQ-001'||e.to==='REQ-001');
 assert(trail.length>0&&trail.every(e=>e.archimate?.type&&/ArchiMate 3\.1/.test(e.archimate.rule)),'every relationship on the followed requirement\'s trail is typed with its rule');
 assert.deepEqual(relationshipFindings(p),[],'no recorded relationship of the case project is one the standard forbids');
 assert.equal(caseContextBasis(p),basis,'reading the typing changes no basis');
 const S=notationDiagram(p,'sequence',{objectId:'network'});
 assert.deepEqual(S.nodes.map(n=>n.id),['worker','ext-network','instruction','settlement']);assert.equal(S.edges.length,4);assert(S.edges.every((e,i)=>e.step===i+1)&&S.edges.at(-1).reply,'four messages in order, the last a response');
}

// Persist the actual HTTP command, enforce project revision, and reject foreign
// identities. This fixture creates no approval and calls no external service.
const root=await mkdtemp(path.join(tmpdir(),'aiw-case-')),DB=localDatabase(path.join(root,'project.sqlite')),env={DB,FILES:localFiles(path.join(root,'files'))},origin='http://localhost:4173',owner='case-owner';
async function call(route,{body,actor=owner}={}){const r=await worker.fetch(new Request(origin+route+(route.includes('?')?'&':'?')+'project='+original.id,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','oai-authenticated-user-id':actor},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,...await r.json()};}
try{
 await DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,?,?)').bind(owner,original.id,JSON.stringify(original),1,at).run();
 let loaded=await call('/api/project');assert.equal(loaded.status,200);
 let result=await call('/api/commands',{body:{revision:loaded.revision,command:{type:'case.save',payload:{title:'Saved case',purpose:'Exercise case persistence.',requirementIds:['REQ-001'],basis:caseContextBasis(loaded.document)}}}});assert.equal(result.status,200,result.error);assert.equal(result.selected,'AC-001');
 const duplicate=await call('/api/commands',{body:{revision:loaded.revision,command:{type:'case.save',payload:scope()}}});assert.equal(duplicate.status,409);
 const storedRow=await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,original.id).first(),storedDocument=JSON.parse(storedRow.document);assert(storedDocument.caseExtensions.storageKey);assert(!storedDocument.finalReview.architectureCases,'Case history stays outside the database row');
 loaded=await call('/api/project');c=architectureCases(loaded.document)[0];assert.equal(c.title,'Saved case');
 result=await call('/api/commands',{body:{revision:loaded.revision,command:{type:'case.observe',payload:{...observation,id:c.id,basis:caseReviewBasis(loaded.document,c)}}}});assert.equal(result.status,200,result.error);assert.equal(result.document.finalReview.architectureCases[0].observations[0].actor,owner);
 loaded=await call('/api/project');assert(caseObservationCurrent(loaded.document,architectureCases(loaded.document)[0],architectureCases(loaded.document)[0].observations[0]));
 c=architectureCases(loaded.document)[0];result=await call('/api/commands',{body:{revision:loaded.revision,command:{type:'case.conclude',payload:{id:c.id,basis:caseConclusionBasis(loaded.document,c),outcome:'rework',notes:'More source evidence and confirmed scope needed.',reference:'REQ-001 and case observation',reviewed:true}}}});assert.equal(result.status,200,result.error);
 loaded=await call('/api/project');assert.equal(architectureCases(loaded.document)[0].conclusions[0].actor,owner);
 // A recovery package is NDJSON, its manifest last (round 12, GR-STO-03: recovery-package.js); a small one is sent whole.
 const recoveryResponse=await worker.fetch(new Request(origin+'/api/recovery?project='+original.id,{headers:{Origin:origin,'oai-authenticated-user-id':owner}}),env),recovery=await recoveryResponse.text();assert.equal(recoveryResponse.status,200);assert.equal(JSON.parse(recovery.trim().split('\n').at(-1)).schema,'aiw.recovery.v2');
 const preview=await call('/api/recovery?action=preview',{body:{package:recovery}});assert.equal(preview.status,200,preview.error);
 const restored=await call('/api/recovery?action=restore',{body:{package:recovery,hash:preview.hash,reviewed:true,name:'Restored synthetic case'}});assert.equal(restored.status,201,restored.error);
 const restoredRow=await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,restored.id).first();
 const {readStoredProject}=await import('./project-storage.js'),restoredDocument=(await readStoredProject(env,owner,restoredRow.document)).document;
 assert.equal(architectureCases(restoredDocument)[0].observations.length,1);assert.equal(architectureCases(restoredDocument)[0].conclusions.length,1);assert(!caseObservationCurrent(restoredDocument,architectureCases(restoredDocument)[0],architectureCases(restoredDocument)[0].observations[0]),'Restored observations remain historical in their new project');
 const foreign=await call('/api/commands',{actor:'stranger',body:{revision:loaded.revision,command:{type:'case.observe',payload:observation}}});assert.notEqual(foreign.status,200);
}finally{DB.close();await rm(root,{recursive:true,force:true});}
console.log('Architecture case: focused graph coverage, review history, stale evidence, bounded picker, settlement investigation, persistence and authority checks passed.');
