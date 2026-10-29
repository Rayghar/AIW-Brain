import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {applyArchitectureCaseCommand,architectureCases,CASE_DIMENSIONS,caseConclusionBasis,caseContextBasis,caseReviewBasis,evaluateArchitectureCase} from './public/architecture-case.js';
import {renderArchitectureCases,renderArchitectureCaseDossier,renderFocusedCaseValidation,caseScopeForm} from './public/architecture-case-ui.js';
import {recordStamp,driverStamp} from './public/source-fingerprint.js';
import {inputSnapshot} from './public/technology-realisation-domain.js';
import {runtimePlanStamp} from './public/runtime-domain.js';

const at='2026-10-11T09:00:00.000Z';
const create=()=>createProject({name:'Synthetic payment trail',template:'bank-payment'},'journey-fixture',at);
const save=(p,mode,ids=['REQ-001'])=>applyArchitectureCaseCommand(p,{type:'case.save',payload:{title:'Payment handoff',purpose:'Trace a recorded payment design and its evidence.',...(mode?{mode}:{}),requirementIds:ids,basis:caseContextBasis(p)}},at,'first-architect').document;

test('old cases retain focused depth, while the declared journey prevents unsupported support',()=>{
 const p=create(),old=save(p),focused=evaluateArchitectureCase(old,{caseId:'AC-001'});
 assert.equal(architectureCases(old)[0].mode,'focused');
 assert.equal(focused.journey,null);
 assert.match(caseScopeForm(old,architectureCases(old)[0]),/value="focused" checked/);
 const journey=save(p,'end-to-end'),c=architectureCases(journey)[0],report=evaluateArchitectureCase(journey,{caseId:c.id});
 assert.equal(report.journey.mode,'end-to-end');
 assert(report.blockers.some(x=>/current test or exercise/i.test(x)));
 assert(report.blockers.some(x=>/specified technology choice/i.test(x)));
 assert.match(renderArchitectureCases(journey,c.id),/End-to-end evidence journey/);
 assert.match(renderFocusedCaseValidation(journey,c.id),/End-to-end evidence journey/);
 assert.match(renderArchitectureCaseDossier(journey,c.id),/End-to-end evidence journey/);
 assert.throws(()=>applyArchitectureCaseCommand(p,{type:'case.save',payload:{title:'Bad mode',purpose:'Invalid review depth',mode:'auto-approved',requirementIds:['REQ-001'],basis:caseContextBasis(p)}},at,'first-architect'),/Choose focused review/);
 assert.throws(()=>applyArchitectureCaseCommand(journey,{type:'case.conclude',payload:{id:c.id,basis:'wrong',outcome:'support',notes:'No real evidence',reference:'none',reviewed:true}},at,'second-architect'),/changed/);
});

test('a second actor cannot support an evidence journey by observations alone',()=>{
 const p=create(),r=p.artefacts.find(x=>x.id==='REQ-001');r.confirmed=true;r.provenance={sheet:'Fixture',sourceRow:9,cells:{description:'D9'},workbookHash:'synthetic-only'};
 let q=save(p,'end-to-end');
 for(const dimension of CASE_DIMENSIONS){const c=architectureCases(q)[0];q=applyArchitectureCaseCommand(q,{type:'case.observe',payload:{id:c.id,basis:caseReviewBasis(q,c),dimension,outcome:'observed',reviewer:'Second fixture actor',notes:'Synthetic observations only; no actual product comparison or exercise.',reference:'Synthetic D9',sourceRightsReviewed:dimension==='Evidence precision',reviewed:true}},at,'second-architect').document;}
 const c=architectureCases(q)[0],report=evaluateArchitectureCase(q,{caseId:c.id});
 assert.equal(report.sourceUse.acknowledged,true);
 assert.equal(report.architectAssessment.status,'independent-observations-recorded');
 assert(report.blockers.some(x=>/technology choice|test or exercise/i.test(x)));
 assert.throws(()=>applyArchitectureCaseCommand(q,{type:'case.conclude',payload:{id:c.id,basis:caseConclusionBasis(q,c),outcome:'support',notes:'Unsupported synthetic support.',reference:'Synthetic D9',reviewed:true}},at,'second-architect'),/readiness blockers/);
});

function recordedSyntheticTrail(){
 const p=create(),req=p.artefacts.find(x=>x.id==='REQ-001');
 req.confirmed=true;req.provenance={sheet:'Synthetic requirements',sourceRow:9,cells:{description:'D9'},workbookHash:'synthetic-only'};
 const decision=p.decisions.records.find(d=>d.id==='ADR-001'),driver=p.quality.drivers.find(d=>d.id===decision.driverIds[0]);
 driver.confirmed=true;driver.targetConfirmed=true;
 decision.selectedAlternativeId=decision.alternatives[1].id;decision.rationale='Fixture comparison only; validate under an actual payment workload.';decision.status='recorded';
 decision.sourceSnapshot={requirements:Object.fromEntries(decision.requirementIds.map(id=>[id,recordStamp(p,p.artefacts.find(r=>r.id===id))])),drivers:Object.fromEntries(decision.driverIds.map(id=>[id,driverStamp(p,p.quality.drivers.find(r=>r.id===id))]))};
 const r=p.technologyRealisation.records.find(r=>r.id==='tr-002');
 for(const [i,o] of r.options.entries()){
  Object.assign(o,{product:i?'MongoDB':'PostgreSQL',version:'fixture-version',serviceTier:'fixture-tier',operatingModel:'Self managed',topology:'Two fixture zones',failureDomains:'Separate fixture zones',workloadProfile:'Synthetic payment load',specEvidence:'Synthetic specification reference'});
  o.assessments[driver.id]={effect:i?'tension':'supports',reason:'Fixture driver comparison only',evidence:'Fixture documentation location'};
 }
 r.selectedOptionId=r.options[0].id;r.rationale='Synthetic trade-off for a reader regression.';
 r.recorded={revision:r.revision,optionId:r.selectedOptionId,sourceSnapshot:inputSnapshot(p,r),rationale:r.rationale};
 p.runtime.placements.push({id:'PL-fixture',revision:1,planId:'run-007',zoneId:'zone-a',role:'active',replicas:1,basis:'Synthetic technology placement only',confirmed:false});
 const plan=p.runtime.plans.find(x=>x.id==='run-001');
 p.runtime.evidence.push({id:'RV-fixture',planId:plan.id,kind:'exercise',result:'partial',reference:'Synthetic exercise record',observations:'Fixture result requires human review',reviewer:'Fixture architect',stamp:runtimePlanStamp(p,plan),at});
 return p;
}

test('the journey accepts a single connected trail with a current recorded exercise, without declaring achieved quality',()=>{
 const p=save(recordedSyntheticTrail(),'end-to-end'),c=architectureCases(p)[0],report=evaluateArchitectureCase(p,{caseId:c.id});
 assert.equal(report.journey.complete,true,JSON.stringify(report.journey.checks.filter(x=>!x.done)));
 assert.equal(report.journey.done,9);
 assert.equal(report.journey.anchorRequirementId,'REQ-001');
 assert.equal(report.projectGate.ready,false);
 assert(report.blockers.some(x=>/permitted use/i.test(x)),'Human source-use judgement remains open');
 assert.equal(report.acceptance,'blocked');
 assert.match(report.journey.authority,/has not tested the product/);
 const stale=structuredClone(p),zone=stale.runtime.zones.find(x=>x.id==='zone-a');zone.failureDomain='Changed fixture failure domain';zone.revision++;
 const changed=evaluateArchitectureCase(stale,{caseId:c.id});
 assert.equal(changed.journey.checks.find(x=>x.key==='recorded-test').done,false);
 assert(changed.blockers.some(x=>/current test or exercise/i.test(x)));
});

test('one disconnected selected requirement cannot borrow another requirement’s design trail',()=>{
 const p=recordedSyntheticTrail();p.artefacts.push({...structuredClone(p.artefacts.find(x=>x.id==='REQ-001')),id:'REQ-UNLINKED',externalId:'FRD-UNLINKED',title:'Unconnected fixture requirement',modelRef:'',provenance:{sheet:'Synthetic requirements',sourceRow:10,cells:{description:'D10'},workbookHash:'synthetic-only'}});
 const q=save(p,'end-to-end',['REQ-UNLINKED','REQ-001']),report=evaluateArchitectureCase(q,{caseId:'AC-001'});
 assert.equal(report.journey.anchorRequirementId,'REQ-001');
 assert.equal(report.journey.checks.find(x=>x.key==='continuous-trail').done,true);
 assert.equal(report.journey.checks.find(x=>x.key==='selected-links').done,false);
 assert(report.blockers.some(x=>/FRD-UNLINKED/.test(x)));
});

test('chapter tags without implementation mappings are not an end-to-end trail',()=>{
 const p=recordedSyntheticTrail();p.logical.mappings=p.logical.mappings.filter(m=>m.logicalId!=='api');
 const q=save(p,'end-to-end'),report=evaluateArchitectureCase(q,{caseId:'AC-001'});
 assert.equal(report.journey.checks.find(x=>x.key==='continuous-trail').done,false);
 assert.equal(report.journey.checks.find(x=>x.key==='product-selection').done,false);
 assert(report.blockers.some(x=>/Trace one requirement through design and runtime/.test(x)));
});

test('the dossier cites the applied source revision when a source gets a newer revision',()=>{
 const p=create();p.coauthoring={schemaVersion:1,sources:[{id:'SRC-1',versions:[{revision:1,title:'Original v1',location:'Fixture page 1',excerpt:'First revision',status:'Confirmed'},{revision:2,title:'Original v2',location:'Fixture page 2',excerpt:'Later revision',status:'Confirmed'}]}],tasks:[{id:'SOL-1',status:'applied',sourceId:'SRC-1',sourceRevision:1,applied:{sourceRevision:1,ids:{requirement:'REQ-001'}}}],designTasks:[]};
 const q=save(p,'end-to-end'),c=architectureCases(q)[0],report=evaluateArchitectureCase(q,{caseId:c.id}),source=report.sourceEvidence.find(x=>x.kind==='project-original');
 assert.equal(source.title,'Original v1');assert.equal(source.revision,1);
 assert.match(source.status,/newer source revision/);
 assert.doesNotMatch(renderArchitectureCaseDossier(q,c.id),/Original v2/);
 const first=caseReviewBasis(q,c),unrelated=structuredClone(q);unrelated.coauthoring.sources.push({id:'SRC-unrelated',versions:[{revision:1,title:'Other original',excerpt:'Other'}]});
 assert.equal(caseReviewBasis(unrelated,architectureCases(unrelated)[0]),first);
});
