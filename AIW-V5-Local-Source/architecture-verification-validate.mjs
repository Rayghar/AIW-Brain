// Authored checks and supplied evidence only. No external test or provider runs.
import assert from 'node:assert/strict';
import {verificationFixture,observationPayload,comparisonReviewPayload,verificationSource,obligationAt} from './architecture-verification-fixtures.mjs';
import {reviewCommand,linkedAction,verificationPayload} from './architecture-obligation-fixtures.mjs';
import {architectureObligationsFor,architectureActionStamp} from './public/architecture-obligations.js';
import {normaliseVerificationContract,normaliseVerificationObservation,verificationContext,verificationResult,verificationForAction,verificationEvidence,verificationPackage} from './public/architecture-verification.js';
import {applyAssuranceCommand,assuranceCurrent} from './public/assurance-domain.js';
import {applyEvidenceCommand} from './public/evidence-domain.js';
import {actionComplete,finalFindings} from './public/review-domain.js';
import {previewFeedback,applyFeedbackCommand,deliveryExchange} from './public/delivery-feedback.js';
import {observedEvidenceForObject} from './public/model-conformance.js';
import {architectureMarkdown} from './public/sdd-architecture.js';
import {digest} from './public/brain-integrity.js';
const clone=structuredClone,record=(p,payload)=>applyAssuranceCommand(p,{type:'assurance.record',payload},obligationAt,'synthetic-operator').document,result=p=>verificationResult(p,p.assurance.records.at(-1));
const {p:base,contract}=verificationFixture(),action=base.finalReview.actions[0],original=JSON.stringify(base.coauthoring.designTasks[0].applied);
assert.equal(verificationForAction(base,action).state,'unknown');
for(const edit of [{expected:'250'},{expected:Infinity},{operator:'approx'},{environmentId:'foreign'},{release:''},{procedure:''},{kind:'assertion',expected:true,unit:'ms'},{kind:'assertion',expected:'true',unit:'',operator:'equals'}])assert.throws(()=>normaliseVerificationContract(base,action,{...contract,...edit}));
assert.throws(()=>normaliseVerificationContract(base,{...action,architectureObligation:null},contract),/accepted/);
assert.notEqual(architectureActionStamp(action),architectureActionStamp({...action,verificationContract:{...contract,expected:200}}));
let p=record(base,observationPayload(base));assert.equal(result(p).state,'pass');assert.equal(p.finalReview.actions[0].status,'Planned');assert(!actionComplete(p,p.finalReview.actions[0]));assert.equal(p.assurance.records[0].reviewed,false);
assert.equal(result(record(base,observationPayload(base,300))).state,'fail','Free-text pass claims cannot override the numeric comparison');
assert.equal(result(record(base,observationPayload(base,0))).state,'pass');
assert.equal(result(record(base,observationPayload(base,null))).state,'unknown');
assert.equal(result(record(base,observationPayload(base,200,{sourceId:'',verificationSource:null}))).state,'unknown');
assert.equal(result(record(base,observationPayload(base,0.2,{verificationObservation:{...observationPayload(base).verificationObservation,value:0.2,unit:'s'}}))).state,'unknown');
for(const bad of ['200',true,NaN,Infinity,1e16])assert.throws(()=>record(base,observationPayload(base,bad)),/number or boolean/);
const b=verificationFixture({kind:'assertion',expected:false}).p;assert.equal(result(record(b,observationPayload(b,false))).state,'pass');assert.equal(result(record(b,observationPayload(b,true))).state,'fail');assert.equal(result(record(b,observationPayload(b,null))).state,'unknown');
console.log('PASS exact numeric/boolean checks, zero and false, missing values, unit mismatch and no inferred pass or automatic approval');

const raw=observationPayload(base);
for(const patch of [{projectId:'other-project'},{actionId:'RA-foreign'},{actionStamp:'bad'},{contractStamp:'bad'},{basisStamp:'bad'},{contract:{...raw.verificationObservation.contract,expected:999}}])assert.throws(()=>record(base,{...raw,verificationObservation:{...raw.verificationObservation,...patch}}));
for(const patch of [{release:'other-release'},{environment:'Production'},{objectIds:[base.realisation.components[1].id]},{requirementIds:[]},{kind:'defect'},{sourceId:'SOURCE-foreign'},{verificationSource:{...raw.verificationSource,hash:'stale'}}])assert.throws(()=>record(base,{...raw,...patch}));
assert.throws(()=>normaliseVerificationObservation(base,{...raw,requirementGroupIds:['broader-scope']},raw.verificationObservation),/exact object and requirement scope/);
const sourceChanged=applyEvidenceCommand(base,{type:'evidence.source',payload:{...verificationSource,id:raw.sourceId,excerpt:'A different synthetic result.'}},obligationAt,'synthetic-operator').document;
assert.throws(()=>record(sourceChanged,raw),/exact evidence source revision/);
assert.equal(result(applyEvidenceCommand(p,{type:'evidence.source',payload:{...verificationSource,id:raw.sourceId,excerpt:'A new source revision.'}},obligationAt).document).state,'stale');
for(const mutate of [q=>{q.quality.drivers[0].targetValue='15';},q=>{q.runtime.environments[0].title+=' changed';},q=>{q.finalReview.actions[0].verificationContract.expected=100;},q=>{q.realisation.components[0].purpose+=' changed';}]){const changed=clone(p);mutate(changed);assert.equal(result(changed).state,'stale');assert(!assuranceCurrent(changed,changed.assurance.records[0]));assert.throws(()=>record(changed,raw),/changed|current/);}
console.log('PASS malformed/foreign scope and evidence rejected; source, threshold, environment and semantic architecture changes reopen observations');

assert.throws(()=>reviewCommand(base,'delivery',comparisonReviewPayload(base)),/Comparison incomplete/);
assert.throws(()=>reviewCommand(p,'delivery',{...comparisonReviewPayload(p),reviewed:false}),/explicit confirmation/);
assert.throws(()=>reviewCommand(p,'delivery',{...comparisonReviewPayload(p),evidenceSources:[]}),/original confirmed source/);
assert.throws(()=>reviewCommand(p,'delivery',{...comparisonReviewPayload(p),verificationEvidence:[]}),/observed evidence changed/);
let verified=reviewCommand(p,'delivery',comparisonReviewPayload(p));assert(actionComplete(verified,verified.finalReview.actions[0]));
const proof=clone(verified.finalReview.actions[0].verification),old=p.assurance.records[0],changed=record(verified,{...observationPayload(verified,150),id:old.id,recordStamp:digest(old)});
assert.equal(result(changed).state,'pass');assert(!actionComplete(changed,changed.finalReview.actions[0]),'A different passing result still requires an explicit new review');assert.deepEqual(changed.finalReview.actions[0].verification,proof);
assert.throws(()=>record(changed,{...observationPayload(changed,140),id:old.id,recordStamp:digest(old)}),/observation changed/);
assert.throws(()=>reviewCommand(changed,'delivery',{...comparisonReviewPayload(changed),verificationEvidence:verificationEvidence(verified,verified.finalReview.actions[0])}),/observed evidence changed/);
const failed=record(verified,observationPayload(verified,300));assert(!actionComplete(failed,failed.finalReview.actions[0]));assert(finalFindings(failed).some(f=>f.code==='verification-comparison'&&f.level==='error'));assert.throws(()=>reviewCommand(failed,'delivery',comparisonReviewPayload(failed)),/Comparison fails/);
let sibling=reviewCommand(failed,'action',linkedAction(failed,architectureObligationsFor(failed)[0]));sibling=reviewCommand(sibling,'delivery',verificationPayload(sibling,sibling.finalReview.actions.at(-1).id));assert.notEqual(architectureObligationsFor(sibling)[0].verificationState,'current-verified','A different action cannot conceal this obligation’s failing typed check');
const renewed=reviewCommand(changed,'delivery',comparisonReviewPayload(changed));assert(actionComplete(renewed,renewed.finalReview.actions[0]));assert.equal(JSON.stringify(renewed.coauthoring.designTasks[0].applied),original);assert.equal(renewed.assurance.records[0].history.length,1);
const projected=observedEvidenceForObject(failed,action.objectIds[0]);assert(projected.records.some(r=>r.comparison?.state==='fail'));assert.match(architectureMarkdown(failed).markdown,/Expected checks and observed evidence/);assert.match(architectureMarkdown(failed).markdown,/Comparison fails/);
console.log('PASS explicit manual verification captures exact observations; new results reopen it; history, model projection, Validate and SDD agree');

const exchange=deliveryExchange(p);assert.equal(exchange.verification.schema,'aiw.verification.v1');assert.equal(verificationPackage(p).checks[0].receipt.projectId,p.id);
const feed={schema:'aiw.delivery.v1',origin:'Synthetic test runner',records:[{externalId:'case-1',...exchange.records[0]}]},preview=previewFeedback(base,feed);
let imported=applyFeedbackCommand(base,{payload:{feed,stamp:preview.stamp,reviewed:true,sourceId:base.coauthoring.sources[0].id,verificationSource:raw.verificationSource}},obligationAt,'synthetic-importer').document;
assert.equal(result(imported).state,'pass');assert.equal(imported.assurance.records[0].reviewed,false);assert.equal(imported.finalReview.actions[0].status,'Planned');assert.equal(previewFeedback(imported,feed).counts.unchanged,1);
const foreign=clone(feed);foreign.records[0].verificationObservation.projectId='other-project';assert.throws(()=>previewFeedback(base,foreign),/exact project/);
assert.throws(()=>applyFeedbackCommand(base,{payload:{feed,stamp:preview.stamp,reviewed:true,sourceId:raw.sourceId}},obligationAt),/exact evidence source revision/);
const changedSourcePreview=previewFeedback(sourceChanged,feed);assert.throws(()=>applyFeedbackCommand(sourceChanged,{payload:{feed,stamp:changedSourcePreview.stamp,reviewed:true,sourceId:raw.sourceId,verificationSource:raw.verificationSource}},obligationAt),/exact evidence source revision/);
const altered=clone(base);altered.finalReview.actions[0].verificationContract.expected=100;const later=previewFeedback(altered,feed);assert.notEqual(later.stamp,preview.stamp);assert.throws(()=>applyFeedbackCommand(altered,{payload:{feed,stamp:preview.stamp,reviewed:true,sourceId:raw.sourceId,verificationSource:raw.verificationSource}},obligationAt),/Review the incoming/);
const historical=applyFeedbackCommand(altered,{payload:{feed,stamp:later.stamp,reviewed:true,sourceId:raw.sourceId,verificationSource:raw.verificationSource}},obligationAt).document;assert.equal(result(historical).state,'stale');
// A portable update cannot silently overwrite a local value correction.
imported=record(imported,{...observationPayload(imported,180),id:imported.assurance.records[0].id});const update=clone(feed);update.records[0].verificationObservation.value=190;const conflict=previewFeedback(imported,update);assert(conflict.conflicts.some(c=>c.field==='verificationObservation'));assert.throws(()=>applyFeedbackCommand(imported,{payload:{feed:update,stamp:conflict.stamp,reviewed:true,sourceId:raw.sourceId,verificationSource:raw.verificationSource}},obligationAt),/Resolve each/);
console.log('PASS portable expected-check/observation exchange, explicit intake, retained history, stale preview and three-way conflicts');

const {default:worker}=await import('./worker.js'),{localDatabase}=await import('./local-db.js'),{readStoredProject,saveStoredProject}=await import('./project-storage.js');
const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v);},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null;},async delete(k){files.delete(k);}},ASSETS:{fetch:()=>new Response('asset')}};
const owner='synthetic-check-owner',api=(path,method='GET',body,actor=owner)=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{'oai-authenticated-user-id':actor,Origin:'https://aiw.test',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
try{
 let response=await api('/api/projects','POST',{name:'Synthetic verification contract lifecycle',template:'blank'}),state=await response.json();assert.equal(response.status,201);
 const projectId=state.document.id,row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first(),loaded=await readStoredProject(env,owner,row.document),fixture=verificationFixture({action:false}).p;fixture.id=projectId;
 assert.equal((await saveStoredProject(env,owner,projectId,fixture,row.revision,obligationAt,loaded.keys)).meta.changes,1);
 const reload=async()=>{response=await api('/api/project?project='+projectId);assert.equal(response.status,200);state=await response.json();};await reload();
 const post=async(type,payload,status=200)=>{const r=await api('/api/commands?project='+projectId,'POST',{revision:state.revision,command:{type,payload}});assert.equal(r.status,status,await r.clone().text());if(r.ok)state=await r.json();return r;};
 await post('review.action',{...linkedAction(state.document,architectureObligationsFor(state.document)[0]),verificationContract:contract});await reload();assert(verificationContext(state.document,state.document.finalReview.actions[0]).ready);
 await post('assurance.record',observationPayload(state.document));await reload();assert.equal(result(state.document).state,'pass');assert(!actionComplete(state.document,state.document.finalReview.actions[0]));
 assert.equal((await api('/api/project?project='+projectId,'GET',undefined,'unrelated-owner')).status,404);
 assert.equal((await api('/api/commands?project='+projectId,'POST',{revision:state.revision,command:{type:'review.delivery',payload:comparisonReviewPayload(state.document)}},'unrelated-owner')).status,404);
 await post('review.delivery',{...comparisonReviewPayload(state.document),reviewed:false},400);await post('review.delivery',comparisonReviewPayload(state.document));await reload();assert(actionComplete(state.document,state.document.finalReview.actions[0]));
 const previous=observationPayload(state.document),a=state.document.finalReview.actions[0];await post('review.action',{...a,actionStamp:architectureActionStamp(a),verificationContract:{...a.verificationContract,expected:100}});await post('assurance.record',previous,400);await reload();assert.equal(result(state.document).state,'stale');assert.equal(state.document.finalReview.actions[0].status,'Planned');
 const bad=observationPayload(state.document);bad.verificationObservation.projectId='another-project';await post('assurance.record',bad,400);
 await post('assurance.record',observationPayload(state.document,90));await post('review.delivery',comparisonReviewPayload(state.document));await reload();assert(actionComplete(state.document,state.document.finalReview.actions[0]));
 const exportResponse=await api('/api/export?chapter=11&format=delivery&project='+projectId);assert.equal(exportResponse.status,200,await exportResponse.clone().text());const output=await exportResponse.json();assert(output.verification?.checks?.length);
 // The existing read-only runtime connector retains its original response and
 // supplies that exact new source revision to the same observation command.
 env.AIW_CONNECTIONS_JSON=JSON.stringify([{id:'typed-runtime',title:'Synthetic typed runtime source',kind:'runtime-json',owners:[owner],url:'https://example.org/synthetic-observations.json'}]);
 const runner=observationPayload(state.document,85),feedRecord={externalId:'synthetic-run-1',kind:runner.kind,title:runner.title,statement:runner.statement,requirements:runner.requirementIds,status:runner.status,release:runner.release,environment:runner.environment,cycle:runner.cycle,observedAt:runner.observedAt,verificationObservation:runner.verificationObservation};let connectorReads=0;
 env.CONNECTION_FETCH=async(url,options)=>{assert.equal(options.method,'GET');assert.equal(new URL(url).hostname,'example.org');connectorReads++;return new Response(JSON.stringify({schema:'aiw.delivery.v1',records:[feedRecord]}));};
 response=await api('/api/connections?project='+projectId,'POST',{profileId:'typed-runtime',title:'Synthetic observations',enabled:true});assert.equal(response.status,200);const connectionId=(await response.json()).id,jobId=crypto.randomUUID();
 response=await api('/api/jobs?action=create&project='+projectId,'POST',{kind:'sync',connectionId,requestId:jobId});assert.equal(response.status,201);response=await api('/api/jobs?action=run&project='+projectId,'POST',{id:jobId});assert.equal((await response.json()).job.status,'completed');assert.equal(connectorReads,1);
 const selection={id:jobId,selected:[feedRecord.externalId],mapping:{[feedRecord.externalId]:runner.requirementIds}};response=await api('/api/jobs?action=preview&project='+projectId,'POST',selection);assert.equal(response.status,200);const jobPreview=await response.json();response=await api('/api/jobs?action=apply&project='+projectId,'POST',{...selection,stamp:jobPreview.stamp,revision:jobPreview.revision,reviewed:true});assert.equal(response.status,200,await response.clone().text());await reload();assert.equal(result(state.document).state,'pass');assert.equal(state.document.assurance.records.at(-1).reviewed,false);assert(state.document.coauthoring.sources.at(-1).originalJob);assert(!actionComplete(state.document,state.document.finalReview.actions[0]),'A new imported result must be reviewed explicitly');
 console.log('PASS real Worker persistence, canonical action/evidence/review commands, owner isolation, stale form rejection and reopened verification');
 console.log('PASS existing runtime-json connector retains exact original evidence and requires review after typed observation intake');
}finally{env.DB.close();}
