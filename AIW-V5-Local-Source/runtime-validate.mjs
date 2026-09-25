import {browserSource} from './browser-source.mjs';
import * as projectContext from './public/project-context.js';
import * as projectScope from './public/model-scope.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
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

let p=cmd(base,'intake');assert(rt.runtimeIntakeCurrent(p));
p=cmd(p,'environment',{title:'Test environment fixture',stage:'Pre-production design',purpose:'Synthetic deployment scenario',owner:'Fixture owner',basis:'Test only',confirmed:true,assetIds:['api-pod']});
const second=rt.environments(p).at(-1),secondPlan=rt.plans(p,second.id)[0];
assert.equal(second.ref,'ENV-002');assert.equal(secondPlan.ref,'RUN-015');
p=cmd(p,'zone',{environmentId:second.id,title:'Fixture zone',failureDomain:'Fixture domain',isolation:'Synthetic isolation basis',owner:'Fixture owner',boundaryId:'tb-002'});
assert.equal(rt.zones(p,second.id)[0].ref,'ZON-003');
assert.throws(()=>cmd(p,'placement',{planId:runId,zoneId:rt.zones(p,second.id)[0].id,role:'active',replicas:1}),/same environment|its environment/);
assert.throws(()=>cmd(p,'environment',{...second,assetIds:['missing']}),/existing/);
assert.throws(()=>cmd(p,'environment',{...second,assetIds:[]}),/at least one/);
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
for(const term of ['ENV-001','ZON-001','RUN-001','PL-001','RP-001','RV-001','RS-001','REQ-001','QD-002','Review & Realize'])assert(rt.exportRuntimeMarkdown(ready).includes(term),term);
assert(!rt.exportRuntimeMarkdown(ready).includes('undefined'));assert.deepEqual(rt.withRuntime(ready),ready);assert.equal(JSON.stringify(base),original,'Commands do not mutate caller state');
for(const key of Object.keys(upstream))assert.deepEqual(ready[key],base[key]);
const g=logicalGraph(ready),nodeIds=new Set(g.nodes.map(n=>n.id));assert.equal(nodeIds.size,g.nodes.length);assert(g.edges.every(e=>nodeIds.has(e.from)&&nodeIds.has(e.to)));assert(g.edges.some(e=>e.runtimeKind==='dependency'));assert(g.edges.some(e=>e.runtimeKind==='control'));assert(g.edges.some(e=>e.runtimeKind==='path'));

// Test the shared graph geometry without presenting it as browser validation.
const source=fs.readFileSync('public/model.js','utf8').replaceAll('export const ','const '),app=fs.readFileSync('public/app.js','utf8').replace(/^import .*?;\n/gm,'').replace(/\npersist\(\);render\(\);\n/,'\n');
const el={textContent:'',style:{},innerHTML:'',classList:{add(){},remove(){},toggle(){}},focus(){},click(){},setAttribute(){},scrollIntoView(){}};
const ctx={console,Set,Map,URL,URLSearchParams,location:{search:''},Blob,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:()=>null,setItem(){}},document:{body:el,querySelector:()=>el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el},window:{aiwLogicalStudio:{graph:()=>g,groups:ready.logical.groups,bind(){}},addEventListener(){},matchMedia:()=>({matches:true})}};
const uxSource=browserSource('public/workspace-ux.js');
Object.assign(ctx,projectContext,projectScope);vm.createContext(ctx);vm.runInContext(uxSource,ctx);vm.runInContext(source+'\n'+app+'\nglobalThis.layout=layoutModel;globalThis.testLayers=layers;',ctx);
for(const visible of [['physical','technology','deployment'],['deployment','interface','physical'],['deployment','technology','data'],['deployment','security','interface'],ctx.testLayers.map(l=>l.id)])for(const mobile of [false,true]){
 const l=ctx.layout(g.nodes.filter(n=>visible.includes(n.layer)),mobile,false,false),ps=[...l.positions.values()];
 for(const v of ps)assert(v.x>=0&&v.y>=0&&v.x+200<=l.width&&v.y+74<=l.height);
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert(ps[i].x+200<=ps[j].x||ps[j].x+200<=ps[i].x||ps[i].y+74<=ps[j].y||ps[j].y+74<=ps[i].y);
}

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
 console.log('PASS Deployment / Runtime: stable ENV/ZON/RUN/PL/RP/RV/RS references; environment scoping; editing and reviewed ghosts; capacity and shared-domain simulation; state protection and prerequisite propagation; explicit quality assumptions; separate design/exercise evidence; source invalidation; attainable final-review handoff; desktop/mobile graph bounds; authenticated persistence, owner isolation, CAS, and exports.');
}finally{DB.close()}
