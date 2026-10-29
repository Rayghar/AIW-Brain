import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {analyseQuality,analysisModelStamp,measurementCurrent} from './public/quality-analysis.js';
import {applyArchitectureCaseCommand,caseContextBasis,caseReviewBasis,caseObservationCurrent,evaluateArchitectureCase} from './public/architecture-case.js';

const at='2026-10-11T00:00:00.000Z';
const makeProject=()=>createProject({name:'Synthetic focused case regression',template:'bank-payment'},'focused-case-regression',at);
const saveCase=p=>applyArchitectureCaseCommand(p,{type:'case.save',payload:{title:'Payment submission',purpose:'Review only the selected payment requirement and its evidence.',requirementIds:['REQ-001'],basis:caseContextBasis(p)}},at,'architect-one').document;

test('an unrelated environment cannot silently turn current case evidence historical',()=>{
 const p=makeProject(),task={id:'DT-regression',requirementId:'REQ-001',driverId:p.quality.drivers[0].id,topic:'interaction',answers:{analysis:{}},applied:{records:[]},measurements:[]};
 p.coauthoring??={};p.coauthoring.designTasks=[task];
 p.knowledge={version:0,counter:0,sources:[{id:'S-regression',hash:'fixture-hash',revision:'1'}],suggestions:[],claims:[],contradictions:[],releases:[],pins:[],withdrawals:[],links:[],history:[]};
 task.measurements=[{id:'M-regression',optionId:'fixture-option',metricLabel:'Synthetic latency',mean:1,unit:'ms',samples:[1],environment:'Fixture',workload:'Fixture',reason:'Synthetic only',reviewer:'Fixture',source:{id:'S-regression',hash:'fixture-hash',revision:'1'},analysisStamp:analyseQuality(task.topic,task.answers.analysis,'fixture-option').stamp,modelStamp:analysisModelStamp(p,task)}];
 let caseProject=saveCase(p),c=caseProject.finalReview.architectureCases[0];
 caseProject=applyArchitectureCaseCommand(caseProject,{type:'case.observe',payload:{id:c.id,basis:caseReviewBasis(caseProject,c),dimension:'Evidence precision',outcome:'observed',reviewer:'Fixture reviewer',notes:'The measurement is only a synthetic regression fixture.',reference:'M-regression',reviewed:true}},at,'architect-two').document;
 c=caseProject.finalReview.architectureCases[0];
 assert.equal(measurementCurrent(caseProject,caseProject.coauthoring.designTasks[0],caseProject.coauthoring.designTasks[0].measurements[0]),true);
 assert.equal(evaluateArchitectureCase(caseProject,{caseId:c.id}).testObservations[0].current,true);
 const unrelated=structuredClone(caseProject);
 unrelated.runtime.environments.push({...unrelated.runtime.environments[0],id:'environment-unrelated',assetIds:[],title:'Unrelated new environment'});
 const uc=unrelated.finalReview.architectureCases[0];
 assert.equal(caseReviewBasis(unrelated,uc),caseReviewBasis(caseProject,c),'The unrelated environment must not stale the focused case.');
 assert.equal(caseObservationCurrent(unrelated,uc,uc.observations[0]),true);
 assert.equal(measurementCurrent(unrelated,unrelated.coauthoring.designTasks[0],unrelated.coauthoring.designTasks[0].measurements[0]),true,'The linked measurement must not be marked historical by an unrelated environment.');
 assert.equal(evaluateArchitectureCase(unrelated,{caseId:uc.id}).testObservations[0].current,true,'The dossier and case basis must agree on evidence currency.');
});

test('a source locator and requirement confirmation alone do not assert permission to use the original',()=>{
 const p=makeProject(),r=p.artefacts.find(x=>x.id==='REQ-001');
 r.confirmed=true;
 r.provenance={sheet:'Synthetic requirements',sourceRow:4,cells:{description:'D4'},workbookHash:'fixture-hash'};
 const q=saveCase(p),report=evaluateArchitectureCase(q,{caseId:q.finalReview.architectureCases[0].id});
 assert.equal(report.requirements.sourceLocated,1);
 assert(report.sourceEvidence.some(x=>/permitted use|rights/i.test(x.rightsStatus||'')));
 assert(report.blockers.some(x=>/permitted use|rights|permission/i.test(x)), 'Keep source-use review as an explicit human gate before a positive case finding.');
});
