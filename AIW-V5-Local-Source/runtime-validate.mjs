import assert from 'node:assert/strict';
import {driverLinksOf} from './public/driver-links.js';
import {seedProject} from './public/requirements-domain.js';
import {withSecurity,applySecurityCommand,control} from './public/security-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import * as rt from './public/runtime-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';

const cmd=(p,type,payload={})=>rt.applyRuntimeCommand(p,{type:'runtime.'+type,payload}).document;
const base=rt.withRuntime(seedProject()),original=JSON.stringify(base),upstream=withSecurity(seedProject());
const envId='env-001',runId='run-001';
assert.equal(rt.plans(base).length,14);assert.equal(rt.paths(base).length,7);assert.equal(rt.placements(base).length,3);
assert.equal(rt.zone(base,'zone-a').ref,'ZON-001');assert.equal(rt.zone(base,'zone-b').ref,'ZON-002');
assert.deepEqual(rt.withRuntime(base),base,'Reopening retains reference identities and assumptions');
for(const key of Object.keys(upstream))assert.deepEqual(base[key],upstream[key]);
assert.equal(rt.runtimeMilestones(base).filter(m=>m.done).length,0);
assert(rt.runtimeSources(base,rt.plan(base,runId)).requirements.some(r=>r.id==='REQ-001'));
assert(rt.runtimeSources(base,rt.plan(base,runId)).drivers.some(r=>r.id==='QD-002'));
assert(rt.runtimeFindings(base).some(f=>f.code==='missing-dependency')===false,'Reference scope includes all declared supporting realizations');
assert(rt.runtimeFindings(base).some(f=>f.code.startsWith('unbound-')));
// The scale readings (round 6, Contract K) join the chapter's checks as warnings: the reference records no demand target, so one SCALE-NO-TARGET for the project and none per plan (scale-readings-validate.mjs has the rest).
assert.deepEqual(rt.runtimeFindings(base).filter(f=>f.code.startsWith('SCALE-')).map(f=>[f.id,f.level]),[['SCALE-NO-TARGET:project','warning']]);

let p=cmd(base,'intake');assert(rt.runtimeIntakeCurrent(p));
p=cmd(p,'environment',{title:'Test environment fixture',stage:'Pre-production design',purpose:'Synthetic deployment scenario',owner:'Fixture owner',basis:'Test only',confirmed:true,assetIds:['api-pod']});
const second=rt.environments(p).at(-1),secondPlan=rt.plans(p,second.id)[0];
assert.equal(second.ref,'ENV-002');assert.equal(secondPlan.ref,'RUN-015');
p=cmd(p,'zone',{environmentId:second.id,title:'Fixture zone',failureDomain:'Fixture domain',isolation:'Synthetic isolation basis',owner:'Fixture owner',boundaryId:'tb-002'});
assert.equal(rt.zones(p,second.id)[0].ref,'ZON-003');
assert.throws(()=>cmd(p,'placement',{planId:runId,zoneId:rt.zones(p,second.id)[0].id,role:'active',replicas:1}),/same environment|its environment/);
assert.throws(()=>cmd(p,'environment',{...second,assetIds:['missing']}),/existing/);
// Round 12 (D-12): an environment may be saved before what runs in it is stated; the empty scope is an open item.
{const open=cmd(p,'environment',{...second,assetIds:[]});assert.deepEqual(rt.environment(open,second.id).assetIds,[]);assert.deepEqual(rt.runtimeFindings(open).filter(f=>f.objectId===second.id&&['scope-open','environment'].includes(f.code)).map(f=>[f.code,f.level]),[['scope-open','warning']]);assert.equal(rt.plans(open,second.id).length,0);}
const pl={planId:secondPlan.id,zoneId:rt.zones(p,second.id)[0].id,role:'active',replicas:1,basis:'Synthetic capacity fixture',confirmed:true};
p=cmd(p,'placement',pl);assert.equal(rt.placements(p).at(-1).id,'PL-004');
assert.throws(()=>cmd(p,'placement',pl),/existing placement/);
assert.throws(()=>cmd(p,'placement',{...pl,role:'standby',replicas:1.5}),/whole number/);
p=cmd(p,'remove-placement',{id:'PL-004'});p=cmd(p,'placement',pl);assert.equal(rt.placements(p).at(-1).id,'PL-005','Removed placement IDs are never reused');
p=cmd(p,'environment',{...second,assetIds:['tr-001']});assert.equal(rt.plans(p,second.id)[0].ref,'RUN-016');
assert(p.runtime.plans.some(r=>r.id===secondPlan.id),'Out-of-scope plans retain their history');
assert.equal(rt.paths(p,second.id).length,0,'Inactive contract paths do not block the current environment');
p=cmd(p,'environment',{...second,assetIds:['api-pod']});assert.equal(rt.plans(p,second.id)[0].id,secondPlan.id,'Reincluding an asset retains its plan ID');
const design={...rt.plan(p,runId),title:'Payment ingress runtime fixture',owner:'Synthetic on-call owner',releaseReference:'Fixture artifact v1',stateMode:'Stateless process',minReady:1,maxReplicas:2,capacityBasis:'Synthetic workload and headroom assumption',capacityConfirmed:true,scalingPolicy:'Synthetic maximum and load trigger',readiness:'Check required dependencies before accepting traffic',networkPolicy:'Named fixture caller policy',monitoring:'Named fixture alert and expected response',runbook:'Synthetic escalation and safe stop path',rollout:'Synthetic dependency and reconciliation checks',rollback:'Synthetic compatible version boundary',recoveryStrategy:'Failover',recoveryPlan:'Verify state and supporting services before resumption',assumptionsResolved:true,controlIds:['oauth'],securityEnforcement:'Synthetic runtime authority enforcement'};
p=cmd(p,'plan',design);assert.equal(rt.plan(p,runId).revision,2);assert.equal(rt.plan(p,runId).ref,'RUN-001');
assert.throws(()=>cmd(p,'plan',{...design,maxReplicas:0}),/whole number/);
assert.throws(()=>cmd(p,'plan',{...design,minReady:3,maxReplicas:2}),/below/);
assert.throws(()=>cmd(p,'plan',{...design,recoveryMinutes:'-1'}),/non-negative/);
// Round 11: the plan's recovery time and its capacity each name the Chapter 2 driver they serve; an unknown driver is refused.
assert.throws(()=>cmd(p,'plan',{...design,driverId:'QD-999'}),/existing quality drivers/);
assert.throws(()=>cmd(p,'plan',{...design,capacityDriverId:'nobody'}),/existing quality drivers/);
// Round 12 (DM-04): the two slots are now the plan's recovery-time and capacity targets; a save that names them sets
// those targets, and the plan keeps no slot.
{const linked=cmd(p,'plan',{...design,recoveryMinutes:'20',driverId:'QD-004',capacityDriverId:'QD-002'}),r=rt.plan(linked,runId);assert.equal(r.driverId,undefined);assert.equal(r.capacityDriverId,undefined);assert.deepEqual(r.targets.map(t=>[t.kind,t.driverId,t.value]),[['recovery-time','QD-004',''],['capacity','QD-002','']]);const ls=driverLinksOf(linked,runId);assert.deepEqual(ls.map(l=>[l.kind,l.state]),[['recovery-time','breaks'],['capacity','unknown']]);assert.match(ls[0].why,/20 min, longer than QD-004's 15 min/);assert.match(ls[1].why,/compare them by hand/);
 console.log('PASS a runtime plan names the drivers its recovery time and its capacity serve (round 11, as targets from round 12): unknown drivers are refused; 20 min against QD-004\'s 15 min reads as a disagreement, and replicas against a target in % are not compared');}
assert.throws(()=>cmd(p,'plan',{...design,backupZoneId:rt.zones(p,second.id)[0].id}),/same environment/);
assert.throws(()=>cmd(p,'plan',{...design,controlIds:['missing']}),/existing/);
const q=rt.runtimeProposal(p,'isolate',runId);assert(q);const beforeGhost=JSON.stringify(p);assert.throws(()=>cmd(p,'proposal',{...q,record:q.record}),/Review/);assert.equal(JSON.stringify(p),beforeGhost);
p=cmd(p,'proposal',{...q,record:{...q.record,replicas:2,basis:'Edited synthetic standby basis',confirmed:true},reviewed:true});
assert(rt.placements(p,runId).some(l=>l.role==='standby'&&l.replicas===2));
const route=rt.paths(p,envId)[0];p=cmd(p,'path',{...route,owner:'Synthetic route owner',route:'Fixture route alias',access:'Fixture identity and network policy',failureResponse:'Stop and enquire using original reference'});
assert.equal(rt.runtimePath(p,route.id).id,route.id);assert.equal(rt.runtimePath(p,route.id).revision,2);

// Numerical capacity and failure scope have observable, conservative consequences.
const isolated=structuredClone(base);isolated.runtime.environments[0].assetIds=['api-pod'];isolated.technology.needs=[];isolated.technology.dependencies=[];isolated.interfaces.contracts=[];isolated.runtime.paths=[];
const r=rt.plan(isolated,runId);Object.assign(r,{minReady:2,maxReplicas:3});
isolated.runtime.placements=[{id:'PL-A',planId:runId,zoneId:'zone-a',role:'active',replicas:2},{id:'PL-B',planId:runId,zoneId:'zone-b',role:'active',replicas:1}];
const probe={environmentId:envId,zoneId:'zone-a',mode:'zone',durationMinutes:10};
const state=(p,input=probe)=>rt.simulateRuntime(p,input).rows.find(r=>r.id===runId);
assert.equal(state(isolated).initial.state,'degraded');assert.equal(state(isolated,{...probe,zoneId:'zone-b'}).initial.state,'available');
r.minReady=4;assert.equal(state(isolated).initial.state,'unknown');r.minReady=2;
isolated.runtime.placements[1].role='standby';isolated.runtime.placements[1].replicas=2;
assert.equal(state(isolated).recovery.state,'unavailable');
Object.assign(r,{stateMode:'Stateless process',recoveryStrategy:'Failover',recoveryPlan:'Synthetic owned promotion sequence'});
assert.equal(state(isolated).recovery.state,'conditional');
r.stateMode='Provider managed';assert.equal(state(isolated).recovery.state,'unavailable','Provider-managed recovery is not inferred from replica labels');
r.stateMode='Stateful service';r.fencing='Synthetic write authority';assert.equal(state(isolated).recovery.state,'unavailable','Stateful promotion needs protected state as well as authority');
r.backupPlan='Synthetic protected state and reconciliation';r.backupZoneId='zone-b';assert.equal(state(isolated).recovery.state,'conditional');
r.backupZoneId='zone-a';assert.equal(state(isolated).recovery.state,'unavailable');r.backupZoneId='zone-b';
rt.zone(isolated,'zone-a').failureDomain=' Shared site ';rt.zone(isolated,'zone-b').failureDomain='shared SITE';
const shared=rt.simulateRuntime(isolated,{...probe,mode:'domain'});assert.equal(shared.failedZoneIds.length,2);assert.equal(shared.rows[0].recovery.state,'unavailable');
assert.throws(()=>rt.simulateRuntime(isolated,{...probe,durationMinutes:''}),/positive/);
assert.throws(()=>rt.simulateRuntime(isolated,{...probe,environmentId:second.id}),/Choose/);

// A healthy placement cannot conceal a missing, failed, or conditionally recovered prerequisite.
const dependencies=structuredClone(base);dependencies.runtime.placements=rt.plans(dependencies).map((r,i)=>({id:'PL-X'+i,planId:r.id,zoneId:'zone-b',role:'active',replicas:1}));
const idPlan=rt.planFor(dependencies,envId,'tr-006');assert(idPlan);
dependencies.runtime.placements.find(l=>l.planId===idPlan.id).zoneId='zone-a';
let depResult=rt.simulateRuntime(dependencies,probe);assert.equal(depResult.rows.find(r=>r.id===runId).initial.state,'unavailable');
dependencies.runtime.environments[0].assetIds=dependencies.runtime.environments[0].assetIds.filter(id=>id!=='tr-006');
depResult=rt.simulateRuntime(dependencies,probe);assert.equal(depResult.rows.find(r=>r.id===runId).initial.state,'unknown');
assert(rt.runtimeDependencies(dependencies,envId).some(d=>d.to===null));
const missingMapping=structuredClone(base);missingMapping.technologyRealisation.mappings=missingMapping.technologyRealisation.mappings.filter(m=>m.capabilityId!=='tc-006');
assert(rt.runtimeDependencies(missingMapping,envId).some(d=>d.source==='TD-002'&&d.to===null));
const buffered=structuredClone(base);buffered.technology.needs=[];buffered.technology.dependencies=[];
buffered.runtime.placements=rt.plans(buffered).map((r,i)=>({id:'PL-X'+i,planId:r.id,zoneId:'zone-b',role:'active',replicas:1}));
const event=rt.paths(buffered,envId).find(r=>r.mode==='buffered'),eventContract=buffered.interfaces.contracts.find(c=>c.id===event.contractId),provider=rt.planFor(buffered,envId,eventContract.to),caller=rt.planFor(buffered,envId,eventContract.from);
buffered.runtime.placements.find(l=>l.planId===provider.id).zoneId='zone-a';
assert.equal(rt.simulateRuntime(buffered,probe).rows.find(r=>r.id===caller.id).initial.state,'degraded');

// Quality comparisons use entered measurements and a basis, never invented estimates.
let sim=rt.simulateRuntime(base,probe);assert(sim.assessments.every(a=>a.result==='unassessed'));assert(sim.security.some(c=>c.state==='unmapped'));
const driver=base.quality.drivers.find(d=>d.id==='QD-002');
assert.throws(()=>rt.simulateRuntime(base,{...probe,measurements:[{driverId:driver.id,value:0}]}),/basis/);
assert.throws(()=>rt.simulateRuntime(base,{...probe,measurements:[{driverId:driver.id,value:101,basis:'Invalid fixture'}]}),/percentages/);
sim=rt.simulateRuntime(base,{...probe,measurements:[{driverId:driver.id,value:0,basis:'Synthetic failed availability assumption'}]});assert.equal(sim.assessments.find(a=>a.driverId===driver.id).result,'unmet-assumption');
sim=rt.simulateRuntime(base,{...probe,measurements:[{driverId:driver.id,value:100,basis:'Synthetic upper bound, not an observed result'}]});assert.equal(sim.assessments.find(a=>a.driverId===driver.id).result,'met-assumption');
assert.throws(()=>rt.simulateRuntime(base,{...probe,measurements:[{driverId:'QD-missing',value:1,basis:'Fixture'}]}),/affected/);

const evidence=(project,id,kind='design',result='pass')=>({id,kind,result,stamp:rt.runtimePlanStamp(project,rt.plan(project,id)),reviewer:'Synthetic reviewer',reference:'Synthetic review fixture; no infrastructure test',observations:'Fixture scope checked; operational evidence remains separate',reviewed:true});
assert.throws(()=>cmd(p,'evidence',{...evidence(p,runId),reviewed:false}),/explicit/);
p=cmd(p,'evidence',evidence(p,runId));assert.equal(p.runtime.evidence.at(-1).id,'RV-001');assert(rt.runtimeEvidenceCurrent(p,p.runtime.evidence.at(-1)));assert(!rt.latestRuntimeEvidence(p,runId,'exercise'));
const savedReview=p.runtime.evidence.at(-1),walk={...probe,stamp:rt.runtimeEnvironmentStamp(p,envId),visited:[0,1,2,3],observations:'Synthetic scenario review; unresolved exercise evidence retained',reviewed:true};
assert.throws(()=>cmd(p,'simulation',{...walk,visited:[0,3]}),/four/);assert.throws(()=>cmd(p,'simulation',{...walk,stamp:'old'}),/changed/);
p=cmd(p,'simulation',walk);assert.equal(p.runtime.simulations.at(-1).id,'RS-001');assert(rt.runtimeSimulationCurrent(p,p.runtime.simulations.at(-1)));assert.equal(p.runtime.evidence.length,1,'A simulation is not external exercise evidence');
const revised=cmd(p,'zone',{...rt.zone(p,'zone-b'),isolation:'Revised isolation assumption'});assert(!rt.runtimeEvidenceCurrent(revised,savedReview));assert(!rt.runtimeSimulationCurrent(revised,p.runtime.simulations.at(-1)));
const changedSource=rt.withRuntime(applySecurityCommand(p,{type:'security.control',payload:{...control(p,'oauth'),operatingObligations:'Revised enforcement obligation'}}).document);
assert(!rt.runtimeIntakeCurrent(changedSource));assert(!rt.runtimeEvidenceCurrent(changedSource,savedReview));assert(rt.runtimeSourceChanged(changedSource,rt.plan(changedSource,runId)));
assert.throws(()=>cmd(revised,'evidence',evidence(p,runId)),/changed/);

// Complete working-design handoff remains attainable with explicit actual-exercise gaps.
let ready=cmd(base,'intake');ready=cmd(ready,'environment',{...rt.environment(ready,envId),confirmed:true});
for(const r of rt.plans(ready)){
 ready=cmd(ready,'plan',{...design,...r,owner:design.owner,releaseReference:design.releaseReference,stateMode:'Stateless process',capacityBasis:design.capacityBasis,capacityConfirmed:true,scalingPolicy:design.scalingPolicy,readiness:design.readiness,networkPolicy:design.networkPolicy,monitoring:design.monitoring,runbook:design.runbook,rollout:design.rollout,rollback:design.rollback,recoveryStrategy:'Failover',recoveryPlan:design.recoveryPlan,assumptionsResolved:true,controlIds:ready.security.controls.map(c=>c.id),securityEnforcement:design.securityEnforcement});
 const old=rt.placements(ready,r.id).find(l=>l.role==='active');ready=cmd(ready,'placement',{...old,planId:r.id,zoneId:'zone-a',role:'active',replicas:1,basis:'Synthetic active capacity',confirmed:true});
 ready=cmd(ready,'placement',{planId:r.id,zoneId:'zone-b',role:'standby',replicas:1,basis:'Synthetic independent standby',confirmed:true});
}
for(const path of rt.paths(ready))ready=cmd(ready,'path',{...path,owner:'Synthetic route owner',route:'Fixture route',access:'Fixture admission',failureResponse:'Owned stop/buffer/enquiry fixture'});
for(const r of rt.plans(ready))ready=cmd(ready,'evidence',evidence(ready,r.id));
for(const mode of ['zone','domain'])ready=cmd(ready,'simulation',{...walk,mode,stamp:rt.runtimeEnvironmentStamp(ready,envId)});
assert.throws(()=>cmd(ready,'handoff',{acknowledge:true}),/checks/);ready=cmd(ready,'review');assert(rt.runtimeReviewCurrent(ready));
assert.throws(()=>cmd(ready,'handoff'),/Acknowledge/);ready=cmd(ready,'handoff',{acknowledge:true});assert(rt.runtimeHandoffCurrent(ready));
assert(rt.runtimeMilestones(ready).every(m=>m.done),JSON.stringify(rt.runtimeMilestones(ready).filter(m=>!m.done)));
assert(ready.runtime.handoff.findings.some(f=>f.code==='evidence-exercise'),'Open operational evidence follows the design into final review');
const failed=cmd(ready,'evidence',evidence(ready,runId,'exercise','fail'));assert(!rt.runtimeHandoffCurrent(failed));assert(rt.runtimeFindings(failed).some(f=>f.code==='evidence-result-exercise'&&f.level==='error'));
for(const term of ['ENV-001','ZON-001','RUN-001','PL-001','RP-001','RV-001','RS-001','REQ-001','QD-002','Review & realize'/* sentence-case chapter name, round 2 U2-26 */])assert(rt.exportRuntimeMarkdown(ready).includes(term),term);
assert(!rt.exportRuntimeMarkdown(ready).includes('undefined'));assert.deepEqual(rt.withRuntime(ready),ready);assert.equal(JSON.stringify(base),original,'Commands do not mutate caller state');
for(const key of Object.keys(upstream))assert.deepEqual(ready[key],base[key]);
const g=logicalGraph(ready),nodeIds=new Set(g.nodes.map(n=>n.id));assert.equal(nodeIds.size,g.nodes.length);assert(g.edges.every(e=>nodeIds.has(e.from)&&nodeIds.has(e.to)));assert(g.edges.some(e=>e.runtimeKind==='dependency'));assert(g.edges.some(e=>e.runtimeKind==='control'));assert(g.edges.some(e=>e.runtimeKind==='path'));


const DB=localDatabase(':memory:'),env={DB,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env)};
try{
 assert.equal((await api('/api/project','GET',null,null)).status,401);let state=await(await api('/api/project')).json();
 const body={revision:state.revision,command:{type:'runtime.plan',payload:design}};assert.equal((await api('/api/commands','POST',body,'architect-a','https://other.test')).status,403);
 let res=await api('/api/commands','POST',body);assert.equal(res.status,200);state=await res.json();assert.equal((await api('/api/commands','POST',body)).status,409);
 const reopened=await(await api('/api/project')).json();assert.equal(rt.plan(reopened.document,runId).title,design.title);assert.equal(rt.plan(reopened.document,runId).ref,'RUN-001');
 assert.notEqual(rt.plan((await(await api('/api/project','GET',null,'architect-b')).json()).document,runId).title,design.title);
 res=await api('/api/commands','POST',{revision:state.revision,command:{type:'runtime.evidence',payload:evidence(state.document,runId)}});assert.equal(res.status,200);state=await res.json();assert.equal(state.document.runtime.evidence[0].id,'RV-001');
 for(const format of ['json','md']){const res=await api('/api/export?chapter=10&format='+format);assert.equal(res.status,200);if(format==='json'){const b=await res.json();assert(b.connectedModel.nodes.some(n=>n.ref==='RUN-001'));assert(b.runtimeValidation.findings.some(f=>f.code==='evidence-exercise'));}else{assert(res.headers.get('Content-Disposition').includes('Deployment_Runtime.md'));assert((await res.text()).includes('RV-001'));}}
 res=await api('/api/commands','POST',{revision:state.revision,command:{type:'security.intake'}});assert.equal(res.status,200);assert.equal(rt.plan((await res.json()).document,runId).title,design.title,'Earlier chapter saves preserve runtime records');
 console.log('PASS Deployment / Runtime: stable ENV/ZON/RUN/PL/RP/RV/RS references; environment scoping; the scale readings as to confirm; editing and reviewed ghosts; capacity and shared-domain simulation; state protection and prerequisite propagation; explicit quality assumptions; separate design/exercise evidence; source invalidation; attainable final-review handoff; desktop/mobile graph bounds; authenticated persistence, owner isolation, CAS, and exports.');
}finally{DB.close()}

// ---------------------------------------------------------------- bounds (round 5, R5-G)
// A workspace keeps up to 500 records of a collection (2,000 relationships and fields): at the bound the next one is
// refused with the workspace's wording and nothing changes; one under it, the next is accepted and the bound is reached.
import * as boundsMemo from './public/document-memo.js';
import * as boundsReview from './public/review-domain.js';
import * as boundsSeed from './public/requirements-domain.js';
{
  const base = boundsReview.withFinalReview(boundsSeed.seedProject()), at = '2026-10-02T12:00:00.000Z';
  const filled = (limit, list, make) => { const p = boundsMemo.documentClone(base), xs = list(p); for (let n = 0; xs.length < limit; n++) xs.push(make(p, n)); return p; };
  const bound = (what, limit, list, make, apply, command, words) => {
    const full = filled(limit, list, make), before = JSON.stringify(full);
    assert.throws(() => apply(full, command(full), at), words, what + ': the ' + (limit + 1) + 'st is refused');
    assert.equal(JSON.stringify(full), before, what + ': a refused record changes nothing');
    const under = filled(limit - 1, list, make), after = apply(under, command(under), at).document;
    assert.equal(list(after).length, limit, what + ': the last one under the bound is accepted');
  };
  const {applyRuntimeCommand: applyRT, RUNTIME_LIMITS: RTL, plans: plansOf} = await import('./public/runtime-domain.js');
  assert.deepEqual({...RTL}, {environments: 500, zones: 2000, placements: 2000});
  bound('environments', RTL.environments, p => p.runtime.environments, (p, n) => ({...structuredClone(p.runtime.environments[0]), id: 'env-b' + n, ref: 'ENV-B' + n, title: 'Bound environment ' + n, assetIds: []}), applyRT, p => ({type: 'runtime.environment', payload: {title: 'One environment more', stage: 'Production design', assetIds: [p.realisation.components[0].id]}}), /^Error: This workspace keeps up to 500 environments\.$/);
  bound('zones', RTL.zones, p => p.runtime.zones, (p, n) => ({...structuredClone(p.runtime.zones[0]), id: 'zon-b' + n, ref: 'ZON-B' + n, title: 'Bound zone ' + n}), applyRT, p => ({type: 'runtime.zone', payload: {environmentId: p.runtime.environments[0].id, title: 'One zone more'}}), /^Error: This workspace keeps up to 2,000 zones\.$/);
  bound('placements', RTL.placements, p => p.runtime.placements, (p, n) => ({id: 'PL-B' + n, revision: 1, planId: 'bound-plan-' + n, zoneId: 'bound-zone-' + n, role: 'active', replicas: 1, basis: '', confirmed: false}), applyRT, p => { const r = plansOf(p, p.runtime.environments[0].id).find(r => !p.runtime.placements.some(l => l.planId === r.id && l.role === 'standby')); return {type: 'runtime.placement', payload: {planId: r.id, zoneId: p.runtime.zones.find(z => z.environmentId === r.environmentId).id, role: 'standby', replicas: 1}}; }, /^Error: This workspace keeps up to 2,000 placements\.$/);
  console.log('PASS environments are bounded at 500, zones and placements at 2,000, each refusing the next with "This workspace keeps up to …"');
}

// ---------------------------------------------------------------- Round 12 (D2): copies not stated, targets, crossings
{
  const {planTargets} = await import('./public/driver-links.js');
  let q = cmd(base, 'plan', {id: 'run-001', minReady: '', maxReplicas: '', targets: [{kind: 'availability', driverId: 'QD-002', operator: 'At least', value: '99.95', window: 'calendar month'}], schedule: {serviceHours: 'All day, every day'}});
  const r = rt.plan(q, 'run-001');
  assert.deepEqual([r.minReady, r.maxReplicas, planTargets(r).length, r.schedule.serviceHours], ['', '', 1, 'All day, every day']);
  assert.equal(rt.planOperation(q, r).availability.link.state, 'unknown', 'windows that differ are compared by hand');
  const node = logicalGraph(q).nodes.find(n => n.id === 'run-001');
  assert.deepEqual([node.attrs.Availability, node.attrs['Hours of service'], node.attrs.Readiness], ['at least 99.95 % over calendar month', 'All day, every day', 'Ready copies not stated · capacity basis unconfirmed'], 'the shared model reads the plan\'s target, hours and copies as stated');
  q = cmd(q, 'placement', {id: rt.placements(q, 'run-001')[0].id, replicas: ''});
  assert.match(rt.planCopies(q, rt.plan(q, 'run-001')).text, /without a stated role or count/);
  assert.ok(!rt.runtimeFindings(q).some(f => f.code === 'unplaced' && f.objectId === 'run-001'), 'copies not stated raise no unplaced error');
  const x = rt.pathCrossing(q, rt.paths(q).find(p => p.contractId === 'rest'));
  assert.equal(x.outside, true);
  console.log('PASS round 12: a plan\'s copies and a placement\'s replicas may be not stated (no count computed), a plan states its targets and schedule (the shared model reads them), and a path reads what it crosses from its contract');
}

// ---------------------------------------------------------------- Round 12 (D4): start-up apart from calls; delivery
// GR-RUN-06: two components calling each other synchronously raise no start-up cycle, unless their paths say they are
// needed at start-up.
{
  const {applyInterfacesCommand, contracts} = await import('./public/interfaces-domain.js');
  assert.deepEqual(rt.PATH_STARTUP, ['needed', 'not-needed']);
  const there = contracts(base).find(c => c.from === 'api-pod' && c.to === 'risk-engine');
  assert.ok(there, 'the reference has the API call the risk engine');
  let q = rt.withRuntime(applyInterfacesCommand(base, {type: 'interfaces.contract', payload: {title: 'Risk decision callback', kind: 'request', from: 'risk-engine', to: 'api-pod', exchanges: []}}).document);
  const back = contracts(q).find(c => c.title === 'Risk decision callback'), routeOf = id => rt.paths(q).find(r => r.environmentId === envId && r.contractId === id);
  for (const c of [there, back]) q = cmd(q, 'path', {id: routeOf(c.id).id, mode: 'required'});
  const cycles = doc => rt.runtimeFindings(doc).filter(f => f.code === 'cycle');
  assert.deepEqual(cycles(q), [], 'two required calls between two parts are calls, not a start-up cycle');
  const deps = rt.runtimeDependencies(q, envId).filter(d => [routeOf(there.id).id, routeOf(back.id).id].includes(d.source));
  assert.ok(deps.length === 2 && deps.every(d => d.mode === 'required' && d.startup === false), 'each still a required call, not needed at start-up');
  q = cmd(q, 'path', {id: routeOf(there.id).id, startup: 'needed'});
  assert.deepEqual(cycles(q), [], 'one way needed at start-up is no cycle');
  q = cmd(q, 'path', {id: routeOf(back.id).id, startup: 'needed'});
  assert.ok(cycles(q).length >= 1, 'both ways needed at start-up is a start-up cycle');
  assert.throws(() => cmd(q, 'path', {id: routeOf(back.id).id, startup: 'sometimes'}), /start-up need/);
  console.log('PASS round 12 (GR-RUN-06): two components calling each other synchronously raise no start-up cycle; only paths that say they are needed at start-up make start-up dependencies, and both ways needed is a cycle');
}
// GR-SEC-04: a plan that links requirements shows their delivery status, and resting on an undelivered requirement raises
// one grouped finding for the chapter.
{
  const {deliveryOf} = await import('./public/requirement-links.js');
  let q = structuredClone(base);
  const reqs = q.artefacts.filter(a => a.type === 'requirement');
  reqs[2].assessment = {...(reqs[2].assessment || {}), delivery: 'Later phase'};
  q = cmd(q, 'plan', {id: runId, requirementIds: [reqs[0].id, reqs[2].id]});
  q = cmd(q, 'plan', {id: 'run-002', requirementIds: [reqs[2].id]});
  assert.deepEqual(deliveryOf(q, rt.plan(q, runId)).rows.map(x => [x.id, x.delivery]), [[reqs[0].id, ''], [reqs[2].id, 'Later phase']], 'each linked requirement with its delivery status');
  const undelivered = rt.runtimeFindings(q).filter(f => f.code === 'undelivered');
  assert.equal(undelivered.length, 1, 'one grouped finding');
  assert.deepEqual(undelivered[0].items.map(x => x.objectId), [runId, 'run-002']);
  console.log('PASS round 12 (GR-SEC-04): a runtime plan shows the delivery status of the requirements it links, and resting on an undelivered requirement raises one grouped finding');
}
// GR-REQ-13: a plan and a path keep a reading of what they read, not the versions of Chapters 1-9. Changing one
// component's purpose marks only the plan of that component; a changed contract marks its paths; a control a plan names
// marks that plan; the evidence of an environment that holds none of them stays current. A stamp kept before is judged as it was.
{
  const {applyRealisationCommand, component} = await import('./public/realisation-domain.js');
  const {applyInterfacesCommand} = await import('./public/interfaces-domain.js');
  const at = '2026-10-08T10:00:00.000Z';
  let q = structuredClone(base);
  const marked = p => [...p.runtime.plans, ...p.runtime.paths].filter(r => rt.runtimeSourceChanged(p, r)).map(r => r.id);
  assert.deepEqual(marked(q), [], 'nothing is marked to begin with');
  assert.ok([...q.runtime.plans, ...q.runtime.paths].every(r => r.sourceSnapshot.startsWith('fp1:')), 'each keeps a reading (a fingerprint), not the versions of the chapters before');
  // A second environment that holds only notify-worker, with its plan reviewed.
  q = cmd(q, 'environment', {title: 'Notification design', assetIds: ['notify-worker']});
  const other = q.runtime.environments.at(-1).id, notify = rt.plans(q, other)[0];
  q = cmd(q, 'evidence', {id: notify.id, kind: 'design', result: 'pass', stamp: rt.runtimePlanStamp(q, notify), reviewer: 'Synthetic reviewer', reference: 'Synthetic review fixture; no infrastructure test', observations: 'Fixture scope checked', reviewed: true});
  q = cmd(q, 'evidence', {id: 'run-002', kind: 'design', result: 'pass', stamp: rt.runtimePlanStamp(q, rt.plan(q, 'run-002')), reviewer: 'Synthetic reviewer', reference: 'Synthetic review fixture; no infrastructure test', observations: 'Fixture scope checked', reviewed: true});
  const evidenceOf = (p, id) => p.runtime.evidence.filter(e => e.planId === id).at(-1);
  const api = component(q, 'api-pod');
  const changed = rt.withRuntime(applyRealisationCommand(q, {type: 'realisation.component', payload: {...api, purpose: api.purpose + ' It keeps the channel reference.'}}, at).document);
  assert.deepEqual(marked(changed), ['run-001'], 'only the plan of the component is marked, not every plan and path');
  assert.deepEqual(rt.runtimeFindings(changed).filter(f => f.code === 'source').map(f => f.objectId), ['run-001'], 'one "Review changed inputs" finding');
  assert.ok(!rt.runtimeEvidenceCurrent(changed, evidenceOf(changed, 'run-002')), 'the evidence of a plan reviews its environment, which holds the changed part');
  assert.ok(rt.runtimeEvidenceCurrent(changed, evidenceOf(changed, notify.id)), 'the evidence of an environment that does not hold it stays current');
  // A changed contract marks the paths of that contract; a control a plan names marks that plan.
  const contractChanged = rt.withRuntime(applyInterfacesCommand(q, {type: 'interfaces.contract', payload: {id: 'network', operation: 'POST /settlements'}}).document);
  assert.deepEqual(marked(contractChanged), contractChanged.runtime.paths.filter(r => r.contractId === 'network').map(r => r.id), 'the paths of the changed contract');
  const named = cmd(q, 'plan', {id: 'run-003', controlIds: ['mtls']});
  const controlChanged = rt.withRuntime(applySecurityCommand(named, {type: 'security.control', payload: {id: 'mtls', operatingObligations: 'Rotate the certificates each quarter.'}}).document);
  assert.deepEqual(marked(controlChanged), ['run-003'], 'the plan that names the changed control');
  // A record whose stamps were taken before (the versions of Chapters 1-9) is judged as before.
  const legacy = structuredClone(q), old = legacy.runtime.plans.find(r => r.id === 'run-002');
  old.sourceSnapshot = rt.runtimeInputStamp(legacy);
  assert.ok(!rt.runtimeSourceChanged(legacy, old), 'a stamp taken before reads as current while nothing before has changed');
  const legacyChanged = rt.withRuntime(applyRealisationCommand(legacy, {type: 'realisation.component', payload: {...api, purpose: api.purpose + ' It keeps the channel reference.'}}, at).document);
  assert.deepEqual(marked(legacyChanged), ['run-001', 'run-002'], 'and as changed after any change before, as it was');
  console.log('PASS round 12 (GR-REQ-13): changing one component\'s purpose marks only its plan (run-001), not every plan and path; a changed contract marks its paths and a changed control the plan that names it; evidence in an environment that does not hold the change stays current; a stamp kept before is judged as it was');
}
