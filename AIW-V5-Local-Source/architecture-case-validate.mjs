import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createProject} from './public/projects-domain.js';
import {reviewSourceStamp,reviewDesignStamp} from './public/review-domain.js';
import {applyArchitectureCaseCommand,architectureCases,caseContextBasis,caseReviewBasis,caseObservationCurrent,architectureCaseExport,evaluateArchitectureCase,CASE_DIMENSIONS} from './public/architecture-case.js';
import {renderArchitectureCases,caseRequirementPicker} from './public/architecture-case-ui.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
const at=new Date().toISOString(),original=createProject({name:'Synthetic case verification',template:'bank-payment'},'case-verification',at);
let p=original;
const scope=()=>({title:'Payment trace',purpose:'Inspect the synthetic payment requirement trail and expose missing evidence.',requirementIds:['REQ-001'],basis:caseContextBasis(p)});
const apply=(type,payload)=>{p=applyArchitectureCaseCommand(p,{type,payload},at,'fixture-architect').document;};
const stale={...scope(),basis:'old'};assert.throws(()=>apply('case.save',stale),/changed/);
assert.throws(()=>apply('case.save',{...scope(),requirementIds:['REQ-missing']}),/in-scope/);
assert.throws(()=>apply('case.save',{...scope(),requirementIds:['REQ-001','REQ-001']}),/distinct/);
const sourceStamp=reviewSourceStamp(p),designStamp=reviewDesignStamp(p);
apply('case.save',scope());let c=architectureCases(p)[0];
assert.equal(c.id,'AC-001');assert.equal(architectureCases(original).length,0,'Commands do not mutate their input');
assert.equal(reviewSourceStamp(p),sourceStamp);assert.equal(reviewDesignStamp(p),designStamp,'Review observations must not invalidate SDD design authority');
let report=evaluateArchitectureCase(p,{requirementIds:c.requirementIds,sampleIds:['REQ-001','missing']});
assert.equal(report.requirements.inScope,1);assert.equal(report.rows.length,1);assert(report.rows[0].linkedStages.logicalApplication.length>0);
assert.equal(report.sample[1].found,false);assert.equal(report.chapterScope,'whole project');assert.equal(report.eligibleSignedRepositoryClaims,0);
assert(report.blockers.some(b=>b.includes('signed repository')));assert.equal(report.acceptance,'blocked');
const observation={id:c.id,basis:caseReviewBasis(p,c),dimension:CASE_DIMENSIONS[0],outcome:'gap',reviewer:'Fixture architect',notes:'Synthetic requirement lacks independent confirmation.',reference:'REQ-001 / illustrative fixture',reviewed:true};
assert.throws(()=>apply('case.observe',{...observation,reviewed:false}),/Confirm/);
assert.throws(()=>apply('case.observe',{...observation,reference:''}),/reference/);
apply('case.observe',observation);c=architectureCases(p)[0];assert(caseObservationCurrent(p,c,c.observations[0]));
assert.equal(reviewDesignStamp(p),designStamp);
const changed=structuredClone(p);changed.artefacts.find(r=>r.id==='REQ-001').title+=' changed';
assert(!caseObservationCurrent(changed,c,c.observations[0]));assert.throws(()=>applyArchitectureCaseCommand(changed,{type:'case.observe',payload:observation}),/changed/);
apply('case.save',{...scope(),id:c.id,purpose:'Reframed review question.'});c=architectureCases(p)[0];assert.equal(c.history.length,2);assert(!caseObservationCurrent(p,c,c.observations[0]));assert.equal(c.startingPoint.report.requirements.inScope,1);
const removed=structuredClone(p);removed.artefacts.find(r=>r.id==='REQ-001').scopeMode='out';const missing=evaluateArchitectureCase(removed,{requirementIds:c.requirementIds});assert.equal(missing.rows.length,0);assert.deepEqual(missing.missingRequirementIds,['REQ-001']);
const exported=architectureCaseExport(p,c.id);assert.equal(exported.observations[0].current,false);assert.equal(exported.current.projectId,p.id);
globalThis.window={location:{search:'?project=case-verification'}};
const html=renderArchitectureCases(p,c.id);assert(html.includes('Follow in Model')&&html.includes('Changed since review'));
const hostile=structuredClone(p);hostile.finalReview.architectureCases[0].title='<img src=x onerror=alert(1)>';assert(!renderArchitectureCases(hostile,c.id).includes('<img'));
const pickerProject=structuredClone(p);pickerProject.artefacts=Array.from({length:1400},(_,i)=>({id:'REQ-'+i,externalId:'FRD-'+i,title:'Synthetic '+i,type:'requirement'}));assert.equal((caseRequirementPicker(pickerProject,new Set(['REQ-1399'])).match(/type="checkbox"/g)||[]).length,40);assert(caseRequirementPicker(pickerProject,new Set(['REQ-1399']),'FRD-1399').includes('checked'));

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
 const recoveryResponse=await call('/api/recovery'),{status:recoveryStatus,...recovery}=recoveryResponse;assert.equal(recoveryStatus,200);
 const preview=await call('/api/recovery?action=preview',{body:{package:recovery}});assert.equal(preview.status,200,preview.error);
 const restored=await call('/api/recovery?action=restore',{body:{package:recovery,hash:preview.hash,reviewed:true,name:'Restored synthetic case'}});assert.equal(restored.status,201,restored.error);
 const restoredRow=await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,restored.id).first();
 const {readStoredProject}=await import('./project-storage.js'),restoredDocument=(await readStoredProject(env,owner,restoredRow.document)).document;
 assert.equal(architectureCases(restoredDocument)[0].observations.length,1);assert(!caseObservationCurrent(restoredDocument,architectureCases(restoredDocument)[0],architectureCases(restoredDocument)[0].observations[0]),'Restored observations remain historical in their new project');
 const foreign=await call('/api/commands',{actor:'stranger',body:{revision:loaded.revision,command:{type:'case.observe',payload:observation}}});assert.notEqual(foreign.status,200);
}finally{DB.close();await rm(root,{recursive:true,force:true});}
console.log('Architecture case: focused graph coverage, review history, stale evidence, bounded picker, persistence and authority checks passed.');
