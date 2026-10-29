import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyQualityCommand,orderedDrivers} from './public/quality-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {applyTechnologyRealisationCommand} from './public/technology-realisation-domain.js';
import {applyTechnologyCommand,simulationCurrent} from './public/technology-domain.js';
import {applyRuntimeCommand,runtimeEnvironmentStamp,runtimeSimulationCurrent} from './public/runtime-domain.js';
import {applyLogicalCommand,scenarioCurrent} from './public/logical-domain.js';
import {scenarioSteps} from './public/model-scope.js';
import {attachActionUndo,applyActionUndoCommand,availableActionUndo} from './public/action-undo-domain.js';
import {commandHandler} from './worker.js';
import {applyValidationConfirmationCommand} from './public/validation-confirmation-domain.js';
const seed=()=>withFinalReview(seedProject()),at='2026-10-16T12:00:00.000Z',actor='synthetic-authenticated-account',checks=[];
assert.equal(commandHandler('action.undo'),applyActionUndoCommand);assert.equal(commandHandler('validation.confirm'),applyValidationConfirmationCommand);
function run(p,handler,command){const before=JSON.stringify(p),result=handler(p,command,at),saved=attachActionUndo(p,result,command,{at,actor,revision:2}).document;assert.equal(JSON.stringify(p),before);const receipt=availableActionUndo(saved,2);assert.ok(receipt);const request={type:'action.undo',payload:{receiptId:receipt.id}};
 assert.throws(()=>applyActionUndoCommand(saved,request,at,'another-account',{revision:2}),/account/);
 assert.throws(()=>applyActionUndoCommand(saved,request,at,actor,{revision:3}),/changed/);
 const changed=structuredClone(saved);changed.name+=' changed';assert.throws(()=>applyActionUndoCommand(changed,request,at,actor,{revision:2}),/changed/);
 const restored=applyActionUndoCommand(saved,request,'2026-10-16T12:01:00.000Z',actor,{revision:2}).document;
 assert.equal(restored.workbench.history.at(-1).undoOf,receipt.id);assert.ok(restored.workbench.history.at(-2).undo.used);
 assert.throws(()=>applyActionUndoCommand(restored,request,at,actor,{revision:2}),/latest/);return {saved,restored};}
{
 const p=seed(),{restored}=run(p,applyQualityCommand,{type:'quality.intake',payload:{}});assert.deepEqual(restored.quality.intake,p.quality.intake);assert.equal(restored.quality.review,null);checks.push('intake restores only server-recorded prior receipt');
}
{
 const p=seed(),rows=orderedDrivers(p),d=rows.find(x=>rows.filter(y=>y.priority===x.priority).length>1);assert.ok(d);const {restored}=run(p,applyQualityCommand,{type:'quality.move',payload:{id:d.id,direction:'down'}});assert.deepEqual(restored.quality.drivers.map(x=>[x.id,x.rank]),p.quality.drivers.map(x=>[x.id,x.rank]));checks.push('priority order restores exact prior ranks');
}
{
 const p=seed(),d=p.decisions.records[0];d.status='accepted';d.governance={status:'approved',revision:d.revision,reviewer:'synthetic fixture',evidence:'fixture'};const original=d.selectedAlternativeId;const a=d.alternatives.find(x=>x.id!==original);const {restored}=run(p,applyDecisionCommand,{type:'decision.choose',payload:{id:d.id,alternativeId:a.id}});const got=restored.decisions.records[0];assert.equal(got.selectedAlternativeId,original||null);assert.equal(got.status,'draft');assert.ok(got.revision>d.revision);assert.notEqual(got.governance?.revision,got.revision,'old approval remains historical');checks.push('choice undo never restores acceptance or current approval');
}
{
 const p=seed(),r=p.technologyRealisation.records.find(x=>x.options.length);assert.ok(r);const {restored}=run(p,applyTechnologyRealisationCommand,{type:'techrealisation.preference',payload:{id:r.id,optionId:r.options[0].id}});assert.equal(restored.technologyRealisation.records.find(x=>x.id===r.id).selectedOptionId,r.selectedOptionId||null);checks.push('draft preference can be explicitly cleared or restored');
}
{
 const p=seed(),{saved,restored}=run(p,applyTechnologyCommand,{type:'technology.simulation',payload:{capabilityId:p.technology.capabilities[0].id,mode:'capability',durationMinutes:20,visited:[0,1,2,3],reviewed:true}});assert.ok(simulationCurrent(saved,saved.technology.simulations.at(-1)));assert.ok(!simulationCurrent(restored,restored.technology.simulations.at(-1)));assert.ok(restored.technology.simulations.at(-1).withdrawn);assert.equal(restored.technology.simulations.length,saved.technology.simulations.length);checks.push('technology walkthrough retained and withdrawn, never erased');
}
{
 const p=seed(),environmentId=p.runtime.environments[0].id,zoneId=p.runtime.zones.find(z=>z.environmentId===environmentId).id,{restored}=run(p,applyRuntimeCommand,{type:'runtime.simulation',payload:{environmentId,zoneId,mode:'zone',durationMinutes:60,stamp:runtimeEnvironmentStamp(p,environmentId),visited:[0,1,2,3],reviewed:true,observations:'Synthetic test observation; no operational measurement.'}});assert.ok(!runtimeSimulationCurrent(restored,restored.runtime.simulations.at(-1)));assert.match(restored.runtime.simulations.at(-1).observations,/Synthetic/);checks.push('runtime observation retained with withdrawal');
}
{
 const p=seed(),scenario='success',previous={at:'2026-10-15T12:00:00.000Z',version:p.logical.version,sourceVersion:p.contentVersion,visited:scenarioSteps(p,scenario),simulated:true};p.logical.scenarios[scenario]=previous;
 const {saved,restored}=run(p,applyLogicalCommand,{type:'logical.scenario',payload:{scenario,visited:scenarioSteps(p,scenario)}});
 assert.deepEqual(restored.logical.scenarios[scenario],previous,'restore only the previously saved walkthrough receipt');
 assert.equal(scenarioCurrent(restored,scenario),scenarioCurrent(p,scenario));
 assert.deepEqual(restored.workbench.history.at(-2).undo.previous.recorded,saved.logical.scenarios[scenario],'undone walkthrough remains in audit history');
 checks.push('logical walkthrough restores prior receipt and retains the undone observation');
}
console.log(JSON.stringify({ok:true,checks}));
