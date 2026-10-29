import assert from 'node:assert/strict';
import {acceptedObligationFixture,reviewCommand,linkedAction,verificationPayload,obligationAt} from './architecture-obligation-fixtures.mjs';
import {architectureObligationsFor,architectureObligationAction,architectureObligationBasis,architectureActionStamp,architectureEvidenceSources,architectureObligationDefinition} from './public/architecture-obligations.js';
import {actionComplete,actionCurrent,finalFindings} from './public/review-domain.js';
import {applyEvidenceCommand} from './public/evidence-domain.js';
import {applyKnowledgeCommand,knowledgeImpactStamp,knowledgeStamp,releasedClaims,claimReceipt} from './public/knowledge-governance.js';
import {applyTechnologyRealisationCommand,inputSnapshot,selectionCurrent} from './public/technology-realisation-domain.js';
import {componentSpecDocument} from './public/component-spec-document.js';
import {applyRuntimeCommand,withRuntime} from './public/runtime-domain.js';
import {architectureIntelligence} from './public/architecture-intelligence.js';
const clone=structuredClone;
let p=acceptedObligationFixture();
const original=JSON.stringify(p.coauthoring.designTasks[0].applied),receipt=JSON.stringify(p.coauthoring.designTasks[0].methodReceipt),read=(doc,id)=>architectureObligationsFor(doc).find(o=>o.id===id);
let [first,second]=architectureObligationsFor(p);const id=first.id,id2=second.id,ref=first.reference;
const unchanged=doc=>{assert.equal(JSON.stringify(doc.coauthoring.designTasks[0].applied),original);assert.equal(JSON.stringify(doc.coauthoring.designTasks[0].methodReceipt),receipt);};
assert.equal(first.verificationState,'open');assert.equal(first.verification,'pending');assert.deepEqual(first.targetIds,second.targetIds);
const source={title:'Synthetic observed exercise',location:'fixture://observations/original-identity',excerpt:'Fixture: repeated attempts retained the original identity. The observed log contains one authoritative effect.',status:'Confirmed',confirmedBy:'Synthetic evidence reviewer',reviewed:true};
p=applyEvidenceCommand(p,{type:'evidence.source',payload:source},obligationAt,'synthetic-reviewer').document;
const evidence=architectureEvidenceSources(p,[{sourceId:p.coauthoring.sources[0].id,revision:1}]);
const productBefore=inputSnapshot(p,p.technologyRealisation.records[0]);assert(selectionCurrent(p,p.technologyRealisation.records[0]));
// A similar title and the same evidence text cannot attach proof to another duty.
const independent={...linkedAction(p,first)};delete independent.architectureObligation;
p=reviewCommand(p,'action',independent);p=reviewCommand(p,'delivery',verificationPayload(p,'RA-001'));
assert(actionComplete(p,p.finalReview.actions[0]));assert.equal(read(p,id).verificationState,'open');
const draft=linkedAction(p,first);
assert.throws(()=>reviewCommand(p,'action',{...draft,architectureObligation:{...draft.architectureObligation,projectId:'another-project'}}),/unavailable|accepted/);
assert.throws(()=>reviewCommand(p,'action',{...draft,architectureObligation:{...draft.architectureObligation,solutionId:'another-solution'}}),/unavailable|accepted/);
assert.throws(()=>reviewCommand(p,'action',{...draft,architectureObligation:{...draft.architectureObligation,obligationId:'another-obligation'}}),/unavailable|accepted/);
assert.throws(()=>reviewCommand(p,'action',{...draft,objectIds:[p.realisation.components[1].id]}),/every exact target/);
p=reviewCommand(p,'action',{...draft,status:'Verified',verification:{reviewed:true}});const actionId=p.finalReview.actions.at(-1).id;
assert.equal(read(p,id).verificationState,'evidence-awaiting');assert.equal(p.finalReview.actions.at(-1).status,'Planned');assert.equal(p.finalReview.actions.at(-1).verification,null);
p=reviewCommand(p,'action',linkedAction(p,second));const actionId2=p.finalReview.actions.at(-1).id;
assert.equal(read(p,id2).verificationState,'evidence-awaiting');
console.log('PASS exact obligation identities, native action creation, identical-title non-equivalence and no draft verification');

const verify=verificationPayload(p,actionId,evidence);
assert.throws(()=>reviewCommand(p,'delivery',{...verify,reviewed:false}),/explicit confirmation/);
assert.throws(()=>reviewCommand(p,'delivery',{...verify,reference:''}),/evidence reference/);
assert.throws(()=>reviewCommand(p,'delivery',{...verify,architectureObligation:{...verify.architectureObligation,obligationId:id2}}),/exact architecture obligation/);
assert.throws(()=>reviewCommand(p,'delivery',{...verify,architectureObligation:{...verify.architectureObligation,projectId:'different'}}),/exact architecture obligation/);
assert.throws(()=>reviewCommand(p,'delivery',{...verify,actionStamp:'stale'}),/action definition changed/);
assert.throws(()=>reviewCommand(p,'delivery',{...verify,evidenceSources:[{...evidence[0],revision:2}]}),/current confirmed revision/);
assert.throws(()=>reviewCommand(p,'delivery',{...verify,evidenceSources:[{...evidence[0],stamp:'stale'}]}),/evidence source changed/);
p=reviewCommand(p,'delivery',verify);
assert.equal(read(p,id).verificationState,'current-verified');assert.equal(read(p,id).verification,'verified');assert(actionComplete(p,p.finalReview.actions.find(a=>a.id===actionId)));
assert.equal(read(p,id2).verificationState,'evidence-awaiting');assert.deepEqual(read(p,id).evidenceSourceIds,[evidence[0].sourceId]);
assert.equal(inputSnapshot(p,p.technologyRealisation.records[0]),productBefore,'Evidence does not redefine a product criterion');assert(selectionCurrent(p,p.technologyRealisation.records[0]),'Evidence does not stale the recorded product selection');
assert.equal(architectureObligationDefinition(read(p,id)).verification,'pending','The adopted criterion remains a duty; its current fulfilment is a projection');
assert.match(componentSpecDocument(p,first.targetIds[0]).markdown,/Current evidence state: Current verification recorded/);
assert(!finalFindings(p).some(f=>f.code==='architecture-obligation'&&f.objectId===id));
assert(finalFindings(p).some(f=>f.code==='architecture-obligation'&&f.objectId===id2));unchanged(p);
console.log('PASS explicit evidence review closes only its linked obligation; product selection and immutable adoption remain current');

const verified=clone(p),proof=clone(p.finalReview.actions.find(a=>a.id===actionId).verification);
const both=reviewCommand(verified,'delivery',{...verificationPayload(verified,actionId2),reference:'fixture://observations/explicit-fallback'});assert.equal(read(both,id2).verificationState,'current-verified');
let q=clone(verified);q.quality.drivers.push({...clone(q.quality.drivers[0]),id:'QD-unrelated',requirementIds:[],componentIds:[],title:'Unrelated operational intent'});q.quality.drivers.at(-1).targetValue='999';assert.equal(read(q,id).verificationState,'current-verified');
q=reviewCommand(verified,'delivery',{...verificationPayload(verified,actionId2),status:'In progress',progress:'Gathering a different obligation’s exercise evidence.',reviewed:false});assert.equal(read(q,id).verificationState,'current-verified');
q=clone(verified);q.finalReview.narrative.summary='Reframing the review document only.';assert.equal(read(q,id).verificationState,'current-verified');
q=clone(verified);q.coauthoring.designTasks[0].answers.fallbackPlan+=' A different fallback observation is needed.';assert.equal(read(q,id).verificationState,'current-verified');assert.equal(read(q,id2).verificationState,'review-required');
q=clone(verified);q.coauthoring.designTasks[0].answers.deadlinePlan+=' Reduce the end-to-end budget.';assert.equal(read(q,id).verificationState,'review-required');assert.equal(read(q,id2).verificationState,'evidence-awaiting');
q=clone(both);q.coauthoring.designTasks[0].answers.deadlinePlan+=' Reduce the end-to-end budget.';assert.equal(read(q,id).verificationState,'review-required');assert.equal(read(q,id2).verificationState,'current-verified','Independent evidence for the same target keeps its own conditions');
q=reviewCommand(verified,'delivery',{...verificationPayload(verified,actionId),status:'In progress',reviewed:false,progress:'An explicit follow-up exercise is now in progress.'});assert(actionCurrent(q,q.finalReview.actions.find(a=>a.id===actionId)));assert.equal(read(q,id).verificationState,'evidence-awaiting','Recording progress is not verification or a stale design');assert.equal(read(q,id).verificationBasis.stamp,read(verified,id).verificationBasis.stamp);
q=applyTechnologyRealisationCommand(verified,{type:'techrealisation.option',payload:{id:verified.technologyRealisation.records[0].id,option:{id:verified.technologyRealisation.records[0].options[1].id,replicaCount:'3'}}},obligationAt).document;assert.equal(read(q,id).verificationState,'current-verified','An unselected configuration is not the tested design');
q=applyTechnologyRealisationCommand(verified,{type:'techrealisation.option',payload:{id:verified.technologyRealisation.records[0].id,option:{id:verified.technologyRealisation.records[0].selectedOptionId,replicaCount:'3'}}},obligationAt).document;assert.equal(read(q,id).verificationState,'review-required');
q=clone(verified);q.technology.boundaries.find(b=>read(q,id).verificationBasis.recordIds.includes(b.id)).policy+=' Synthetic boundary change.';assert.equal(read(q,id).verificationState,'review-required');
q=clone(verified);q.interfaces.contracts[0].retryPolicy='One retry with a different deadline.';assert.equal(read(q,id).verificationState,'review-required');
console.log('PASS narrow conditions, independent same-target obligations, unrelated driver/progress, selected configuration and boundary currentness');

q=clone(verified);q.quality.drivers[0].targetValue='15';assert.equal(read(q,id).verificationState,'review-required');assert.deepEqual(q.finalReview.actions.find(a=>a.id===actionId).verification,proof);
assert.throws(()=>reviewCommand(q,'delivery',verificationPayload(q,actionId,evidence)),/obligation basis changed/);
const oldAction=q.finalReview.actions.find(a=>a.id===actionId),freshDraft=architectureObligationAction(q,ref);
assert.throws(()=>reviewCommand(q,'action',{...oldAction,actionStamp:architectureActionStamp(oldAction)}),/obligation changed/);
q=reviewCommand(q,'action',{...oldAction,architectureObligation:freshDraft.architectureObligation,actionStamp:architectureActionStamp(oldAction)});assert.equal(read(q,id).verificationState,'evidence-awaiting');
assert.equal(q.finalReview.actions.find(a=>a.id===actionId).verification,null);assert(q.finalReview.actions.find(a=>a.id===actionId).history.some(h=>h.verification?.reference===proof.reference));
q=reviewCommand(q,'delivery',verificationPayload(q,actionId,evidence));assert.equal(read(q,id).verificationState,'current-verified');unchanged(q);
const tampered=clone(q);tampered.finalReview.actions.find(a=>a.id===actionId).objectIds=[];assert.equal(read(tampered,id).verificationState,'review-required');
const crossed=clone(q);crossed.id='copied-project';assert.equal(read(crossed,id).verificationState,'open');assert(!actionCurrent(crossed,crossed.finalReview.actions.find(a=>a.id===actionId)));
const imported=clone(q);imported.finalReview.imported={at:'2026-10-21T00:00:00.000Z'};assert.equal(read(imported,id).verificationState,'review-required');
console.log('PASS changed target requires explicit re-review; historical proof and accepted source receipts remain immutable');

q=applyEvidenceCommand(verified,{type:'evidence.source',payload:{...source,id:evidence[0].sourceId,excerpt:source.excerpt+' A new observation supersedes this revision.'}},obligationAt,'synthetic-reviewer').document;
assert.equal(read(q,id).verificationState,'review-required');assert.equal(read(q,id2).verificationState,'evidence-awaiting');assert.deepEqual(q.finalReview.actions.find(a=>a.id===actionId).verification,proof);
q=applyEvidenceCommand(both,{type:'evidence.source',payload:{...source,id:evidence[0].sourceId,excerpt:source.excerpt+' Revised observation.'}},obligationAt,'synthetic-reviewer').document;assert.equal(read(q,id).verificationState,'review-required');assert.equal(read(q,id2).verificationState,'current-verified','Only evidence depending on this exact saved source loses currency');
q=applyEvidenceCommand(verified,{type:'evidence.source',payload:{...source,id:evidence[0].sourceId,status:'Unconfirmed',confirmedBy:'',reviewed:false}},obligationAt).document;assert.equal(read(q,id).verificationState,'review-required');
q=clone(verified);q.coauthoring.sources=[];assert.equal(read(q,id).verificationState,'review-required');
q=applyKnowledgeCommand(verified,{type:'knowledge.withdraw',payload:{id:'MS-CIRCUIT',stamp:knowledgeImpactStamp(verified,'MS-CIRCUIT'),reviewed:true,reviewer:'Synthetic steward',reason:'Synthetic withdrawal test.'}},obligationAt,'synthetic-steward').document;assert.equal(read(q,id).verificationState,'review-required');assert(!architectureObligationBasis(q,ref).ready);unchanged(q);
q=clone(verified);q.coauthoring.designTasks[0].methodReceipt.sources.evaluationRevision--;assert.equal(read(q,id).verificationState,'review-required');assert(!architectureObligationBasis(q,ref).ready);
console.log('PASS evidence revisions, loss of confirmation/removal, method withdrawal and interpretation revision all fail closed');

// A released concern owns its own receipt even when no requirement knowledge
// link exists. Exercise that saved receipt slot with real governed provenance.
let governed=clone(verified);const kr={reviewed:true,reviewer:'Synthetic second reviewer',reason:'Check exact fixture source and conditions.',sourceChecked:true,rightsChecked:true,conditionsChecked:true,decision:'verified'},kc=(type,payload,actor='synthetic-author')=>{const r=applyKnowledgeCommand(governed,{type:'knowledge.'+type,payload},obligationAt,actor);governed=r.document;return r.selected;};
const ks=kc('source',{title:'Synthetic operation protection source',body:'A repeated operation retains its original identity and one authoritative effect.',revision:'1',path:'fixture/protection.md'}),cl=kc('claim',{sourceId:ks,lineStart:1,lineEnd:1,subjectId:'synthetic-repeat-protection',predicate:'requires',statement:'A repeated operation retains its original identity.',claimType:'obligation',polarity:'requires',conditions:['The effect can be repeated.'],limitations:['This source establishes no observed outcome.']});
kc('review',{...kr,id:cl},'synthetic-second-reviewer');const rel=kc('release',{...kr,title:'Synthetic source support',claimIds:[cl]});kc('activate',{...kr,id:rel,stamp:knowledgeStamp(governed)});const hit=releasedClaims(governed).find(h=>h.claim.id===cl),cr=claimReceipt(governed,hit.claim,hit.release);
governed.coauthoring.designTasks[0].governedConcern={id:'synthetic-concern-receipt',receipt:cr};
assert.equal(governed.coauthoring.designTasks[0].governedKnowledge.length,0);assert(architectureObligationBasis(governed,ref).ready);assert(architectureObligationBasis(governed,ref).sourceIds.includes(cl));
kc('withdraw',{...kr,id:ks,stamp:knowledgeImpactStamp(governed,ks)});assert(!architectureObligationBasis(governed,ref).ready);assert.equal(read(governed,id).verificationState,'review-required');
console.log('PASS released-concern receipt withdrawal without any requirement knowledge link');

let all=clone(verified);for(const o of architectureObligationsFor(all)){if(o.verificationState==='current-verified')continue;let actionId=o.verificationActions[0]?.id;if(!actionId){all=reviewCommand(all,'action',linkedAction(all,o));actionId=all.finalReview.actions.at(-1).id;}all=reviewCommand(all,'delivery',verificationPayload(all,actionId,evidence));}
const solution=all.coauthoring.designTasks[0].applied.reasoningGraph.solution,readingFor=doc=>architectureIntelligence(doc,{chapter:5,id:first.targetIds[0]},{limit:24}),reading=readingFor(all),insight=reading.insights.find(i=>i.kind==='verification'&&i.solutionId===solution.id);
assert.equal(insight?.state,'current-verified');assert(insight.obligations.every(o=>o.verificationState==='current-verified'));
for(const o of architectureObligationsFor(all))for(const a of o.verificationActions.filter(a=>a.verified)){assert(insight.sourceRefs.includes('model:'+a.id),'Verification insight must name action '+a.id);assert(reading.sources.some(s=>s.id==='model:'+a.id),'Verification insight must carry action '+a.id);}
assert(insight.sourceRefs.includes('source:obligation:'+evidence[0].sourceId));assert(reading.sources.some(s=>s.id==='source:obligation:'+evidence[0].sourceId));
const sourceChanged=applyEvidenceCommand(all,{type:'evidence.source',payload:{...source,id:evidence[0].sourceId,excerpt:source.excerpt+' The observation changed.'}},obligationAt,'synthetic-reviewer').document,newReading=readingFor(sourceChanged),changedInsight=newReading.insights.find(i=>i.kind==='verification'&&i.solutionId===solution.id);
assert.equal(changedInsight.state,'stale');assert.notEqual(newReading.receipt.basisStamp,reading.receipt.basisStamp);unchanged(all);unchanged(sourceChanged);
console.log('PASS shared intelligence follows all current verification actions and exact source revisions, then becomes stale without changing adoption');

let runtime=applyRuntimeCommand(verified,{type:'runtime.environment',payload:{title:'Synthetic execution environment',assetIds:[first.targetIds[0]],purpose:'Currentness fixture',owner:'Synthetic owner'}},obligationAt).document;
const environmentId=runtime.runtime.environments.at(-1).id;
runtime=withRuntime(runtime);runtime=applyRuntimeCommand(runtime,{type:'runtime.plan',payload:{id:runtime.runtime.plans.find(r=>r.assetId===first.targetIds[0]&&r.environmentId===environmentId)?.id,assetId:first.targetIds[0],environmentId,purpose:'Protected caller',owner:'Synthetic runtime owner',readiness:'Probe the protected path'}},obligationAt).document;
const runtimeAction=runtime.finalReview.actions.find(a=>a.id===actionId);runtime=reviewCommand(runtime,'action',{...runtimeAction,architectureObligation:architectureObligationAction(runtime,ref).architectureObligation,actionStamp:architectureActionStamp(runtimeAction)});runtime=reviewCommand(runtime,'delivery',verificationPayload(runtime,actionId,evidence));assert.equal(read(runtime,id).verificationState,'current-verified');
q=clone(runtime);q.runtime.plans[0].readiness='Probe a different path';assert.equal(read(q,id).verificationState,'review-required');
q=clone(runtime);q.runtime.environments[0].stage='Production';assert.equal(read(q,id).verificationState,'review-required');
q=clone(runtime);q.runtime.environments[0].assetIds.push('unrelated-synthetic-asset');assert.equal(read(q,id).verificationState,'current-verified','Unrelated environment membership does not widen evidence scope');unchanged(runtime);
console.log('PASS runtime asset/environment scope, save/resume, exact currentness and preserved immutable adoption');

// The same definitions survive the existing private Worker storage path. The
// fixture alone is installed directly; every action/evidence update is native.
const {default:worker}=await import('./worker.js'),{localDatabase}=await import('./local-db.js'),{readStoredProject,saveStoredProject}=await import('./project-storage.js');
const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v);},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null;},async delete(k){files.delete(k);}},ASSETS:{fetch:()=>new Response('asset')}};
const owner='synthetic-obligation-reviewer',api=(path,method='GET',body)=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{'oai-authenticated-user-id':owner,Origin:'https://aiw.test',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
try{
 let response=await api('/api/projects','POST',{name:'Synthetic obligation lifecycle',template:'blank'});assert(response.ok,await response.clone().text());let state=await response.json();
 const projectId=state.document.id,row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first(),loaded=await readStoredProject(env,owner,row.document),fixture=acceptedObligationFixture();fixture.id=projectId;
 assert.equal((await saveStoredProject(env,owner,projectId,fixture,row.revision,obligationAt,loaded.keys)).meta.changes,1);
 const reload=async()=>{response=await api('/api/project?project='+projectId);assert.equal(response.status,200,await response.clone().text());state=await response.json();};await reload();
 const adopted=JSON.stringify(state.document.coauthoring.designTasks[0].applied),method=JSON.stringify(state.document.coauthoring.designTasks[0].methodReceipt),post=async(type,payload,expected=200)=>{const r=await api('/api/commands?project='+projectId,'POST',{revision:state.revision,command:{type,payload}});assert.equal(r.status,expected,await r.clone().text());if(r.ok)state=await r.json();return r;};
 await post('evidence.source',source);const sourceReceipt=architectureEvidenceSources(state.document,[{sourceId:state.document.coauthoring.sources[0].id,revision:1}]),obligation=architectureObligationsFor(state.document)[0],nativeDraft=linkedAction(state.document,obligation);
 await post('review.action',{...nativeDraft,architectureObligation:{...nativeDraft.architectureObligation,projectId:'cross-project'}},400);
 await post('review.action',nativeDraft);const nativeId=state.document.finalReview.actions.at(-1).id;await reload();assert.equal(read(state.document,id).verificationState,'evidence-awaiting');
 await post('review.delivery',{...verificationPayload(state.document,nativeId,sourceReceipt),reviewed:false},400);
 await post('review.delivery',verificationPayload(state.document,nativeId,sourceReceipt));await reload();assert.equal(read(state.document,id).verificationState,'current-verified');
 const capturedProof=JSON.stringify(state.document.finalReview.actions.at(-1).verification),oldRequest=verificationPayload(state.document,nativeId,sourceReceipt);
 await post('quality.driver',{...state.document.quality.drivers[0],targetValue:'12'});await reload();assert.equal(read(state.document,id).verificationState,'review-required');
 await post('review.delivery',oldRequest,400);assert.equal(JSON.stringify(state.document.finalReview.actions.at(-1).verification),capturedProof);
 const a=state.document.finalReview.actions.at(-1);await post('review.action',{...a,architectureObligation:architectureObligationAction(state.document,read(state.document,id).reference).architectureObligation,actionStamp:architectureActionStamp(a)});
 await post('review.delivery',verificationPayload(state.document,nativeId,sourceReceipt));await reload();assert.equal(read(state.document,id).verificationState,'current-verified');assert(state.document.finalReview.actions.at(-1).history.some(h=>h.verification));
 assert.equal(JSON.stringify(state.document.coauthoring.designTasks[0].applied),adopted);assert.equal(JSON.stringify(state.document.coauthoring.designTasks[0].methodReceipt),method);
 console.log('PASS Worker persistence and HTTP gates: exact links, explicit review, stale evidence rejection, reopened current verification and retained original receipts');
}finally{env.DB.close();}
