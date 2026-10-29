// Coherent native variants, shared analytical assumptions, stale evidence and
// three-way acceptance. Uses the production command/domain path, no fake model.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyCanonical} from './public/canonical-command.js';
import {analysisNumber} from './public/architecture-analysis.js';
import {applyWorkbenchCommand,previewScenarioAlternative,compareWorkingAlternatives,rebaseWorkingAlternative,workingBasis,scenarioComparisonCurrent,scenarioProjection,setChangeField} from './public/workbench-domain.js';
const at='2026-10-21T12:00:00Z',checks=[],pass=s=>{checks.push(s);console.log('PASS',s);};
const work=(p,type,payload)=>applyWorkbenchCommand(p,{type,payload},at,'architect').document;
let p=withFinalReview(seedProject());const original=structuredClone(p),component=p.realisation.components[0],contract=p.interfaces.contracts[0],control=p.security.controls[0],plan=p.runtime.plans.find(r=>r.assetId===component.id),placement=p.runtime.placements.find(r=>r.planId===plan.id),path=p.runtime.paths.find(r=>r.contractId===contract.id),realization=p.technologyRealisation.records[0];
function variant(name,replicas,annualCost){const commands=[
 {type:'realisation.component',payload:{id:component.id,boundary:name+' owns instruction admission'}},
 {type:'interfaces.contract',payload:{id:contract.id,timeoutMs:400,timeoutBasis:'October test plan',timeoutPolicy:'Resolve original outcome after a missing acknowledgement'}},
 {type:'security.control',payload:{id:control.id,enforcement:'Authenticate before instruction admission in '+name}},
 {type:'runtime.plan',payload:{id:plan.id,minReady:1,maxReplicas:replicas,scalingPolicy:'Fixed scope for the experiment'}},
 {type:'runtime.placement',payload:{id:placement.id,replicas,basis:'Declared '+name+' capacity; measured rates are supplied separately'}},
 {type:'runtime.path',payload:{id:path.id,failureResponse:'Stop admission and enquire about the original outcome'}},
 {type:'techrealisation.plan',payload:{id:realization.id,annualCost:String(annualCost),currency:'USD',costBasis:'21 October quote; recurring platform only'}}
 ];const scenario={capacity:{planId:plan.id,perReplica:100,downstream:500,unit:'requests / second',basis:'21 October repeatable instruction-admission benchmark assumption'},cost:{realizationIds:[realization.id],currency:'USD',upfront:100,migration:50,exit:25,basis:'21 October estimate; transition engineering included; tax excluded'}};const q=previewScenarioAlternative(p,commands,scenario);p=work(p,'workspace.alternative',{commands,scenario:q.scenario,stamp:q.stamp,title:name,reason:'Compare one coherent instruction-admission architecture'});return p.workbench.alternatives.at(-1).id;}
const left=variant('Four replicas',4,1200),right=variant('Two replicas',2,2400),inputs={alternativeIds:[left,right],scope:'Production instruction admission, identical request mix and 12-month scope',capacity:{demand:150,growth:100,loss:1,unit:'requests / second'},cost:{months:12,currency:'USD'}};
assert.deepEqual(p.realisation,original.realisation);assert.deepEqual(p.runtime,original.runtime);assert.deepEqual(p.interfaces,original.interfaces);assert.deepEqual(p.security,original.security);assert.deepEqual(p.technologyRealisation,original.technologyRealisation);
let q=compareWorkingAlternatives(p,inputs);assert.equal(q.rows[0].metrics.capacity.inputs.replicas,4);assert.equal(q.rows[0].metrics.capacity.cases.at(-1).headroom,0);assert.equal(q.rows[1].metrics.capacity.cases.at(-1).headroom,-200);assert.equal(q.rows[0].metrics.cost.total,1375);assert.equal(q.rows[1].metrics.cost.total,2575);assert(q.rows[0].diff.records.some(r=>r.id===control.id));assert.equal(q.rows[0].currentness,'current');
p=work(p,'workspace.analysis',{title:'Admission alternatives',kind:'alternatives',inputs,stamp:q.stamp,basis:'Joint review of the 21 October workload and quotes'});let analysis=p.workbench.analyses.at(-1);assert(scenarioComparisonCurrent(p,analysis));assert.deepEqual(JSON.parse(JSON.stringify(p)).workbench.analyses.at(-1).inputs,q.inputs);
pass('Seven native component, contract, security, runtime and realization specifications remain isolated; common capacity and cost estimates use actual proposed values');

const beforeBasis=workingBasis(p),a=p.workbench.alternatives.find(a=>a.id===left),scenario={...a.scenario,capacity:{...a.scenario.capacity,perReplica:120}},revised=previewScenarioAlternative(p,a.commands,scenario);
p=work(p,'workspace.revise-alternative',{id:a.id,revision:a.revision,title:a.title,reason:'New benchmark assumption',commands:a.commands,scenario,stamp:revised.stamp,reviewed:true});assert.equal(workingBasis(p),beforeBasis);assert(!scenarioComparisonCurrent(p,analysis));assert.equal(analysis.result.rows[0].metrics.capacity.inputs.perReplica,100);assert.throws(()=>work(p,'workspace.analysis',{title:'Stale result',kind:'alternatives',inputs,stamp:q.stamp,basis:'Outdated result'}),/changed/);assert.equal(scenarioProjection(p).comparisons[0].current,false);
pass('A variant-only revision invalidates the saved comparison and stale save stamp while preserving the original result and shared assumptions');

p=applyCanonical(p,{type:'realisation.component',payload:{id:component.id,boundary:'Accepted emergency admission boundary',owner:'Incident team'}},at,'operator').document;
q=compareWorkingAlternatives(p,inputs);assert(q.rows.every(r=>r.currentness==='conflict'));assert(q.rows.every(r=>!r.metrics));
let draft=p.workbench.alternatives.find(a=>a.id===left),r=rebaseWorkingAlternative(p,draft);const commands=structuredClone(r.commands),resolutions=Object.fromEntries(r.conflicts.map(c=>{setChangeField(commands[c.index].payload,c.field,c.current);return [c.index+':'+c.field,'current'];}));const preview=previewScenarioAlternative(p,commands,draft.scenario),revise={id:draft.id,revision:draft.revision,title:draft.title,reason:'Preserve the incident response boundary',commands,scenario:draft.scenario,stamp:preview.stamp,reviewed:true};
assert.throws(()=>work(p,'workspace.revise-alternative',revise),/rebased/);assert.throws(()=>work(p,'workspace.revise-alternative',{...revise,basisStamp:r.stamp}),/overlapping/);p=work(p,'workspace.revise-alternative',{...revise,basisStamp:r.stamp,resolutions});draft=p.workbench.alternatives.find(a=>a.id===left);assert.equal(draft.basis,workingBasis(p));assert.equal(draft.targets[0].boundary,'Accepted emergency admission boundary');assert.equal(draft.history.at(-1).basis,beforeBasis);
p=applyCanonical(p,{type:'realisation.component',payload:{id:component.id,owner:'Service operations'}},at,'operator').document;r=rebaseWorkingAlternative(p,p.workbench.alternatives.find(a=>a.id===left));assert.equal(r.conflicts.length,0);assert.equal(previewScenarioAlternative(p,r.commands,draft.scenario).document.realisation.components[0].owner,'Service operations');
pass('Concurrent semantic changes withhold estimates, demand explicit choices, refresh the saved basis, and preserve later unrelated operational ownership');

for(const bad of [null,false,true,[],{},'','  ','0x10','Infinity',Infinity,-1])assert.throws(()=>analysisNumber(bad,'rate'));
assert.equal(analysisNumber(' .5 ','rate'),.5);
let altered=structuredClone(p);altered.workbench.alternatives.find(a=>a.id===left).scenario.capacity.unit='transactions / minute';q=compareWorkingAlternatives(altered,inputs);assert.equal(q.rows[0].metrics.capacity.status,'unassessed');assert.match(q.rows[0].metrics.capacity.reason,/units differ/);
altered=structuredClone(p);altered.workbench.alternatives.find(a=>a.id===left).commands.find(c=>c.type==='techrealisation.plan').payload.annualCost='';q=compareWorkingAlternatives(altered,inputs);assert.equal(q.rows[0].metrics.cost.status,'unassessed');assert.equal(q.rows[0].metrics.cost.total,undefined);
altered=structuredClone(p);altered.workbench.alternatives.find(a=>a.id===left).scenario.cost.currency='NGN';q=compareWorkingAlternatives(altered,inputs);assert.equal(q.rows[0].metrics.cost.status,'unassessed');
pass('Nulls, booleans, malformed quantities, mismatched rate units, blank recurring costs and mixed currencies cannot become plausible estimates');

draft=p.workbench.alternatives.find(a=>a.id===left);r=rebaseWorkingAlternative(p,draft);assert.throws(()=>work(p,'workspace.merge',{id:left,stamp:r.stamp,reviewed:false,reason:'Apply candidate'}),/Review/);const accepted=work(p,'workspace.merge',{id:left,stamp:r.stamp,reviewed:true,reason:'Retain accepted admission boundary and adopt the reviewed specification',resolutions:{}});assert.equal(accepted.runtime.placements.find(r=>r.id===placement.id).replicas,4);assert.equal(accepted.realisation.components[0].owner,'Service operations');assert.equal(accepted.realisation.components[0].boundary,'Accepted emergency admission boundary');assert.equal(accepted.workbench.alternatives.find(a=>a.id===left).status,'accepted');assert.equal(accepted.workbench.alternatives.find(a=>a.id===right).status,'draft');assert(!scenarioComparisonCurrent(accepted,analysis));
pass('Only explicit acceptance changes the working design; accepted values, alternative history and earlier comparisons remain traceable');
console.log(JSON.stringify({passed:checks.length,checks}));
