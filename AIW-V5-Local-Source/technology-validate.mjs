import {browserSource} from './browser-source.mjs';
import * as projectContext from './public/project-context.js';
import * as projectScope from './public/model-scope.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {seedProject} from './public/requirements-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import {components,component,allocations,applyRealisationCommand} from './public/realisation-domain.js';
import {withTechnology,capabilities,capability,needsFor,supports,needChanged,technologySources,capabilityChanged,technologyFindings,technologyMilestones,technologyIntakeCurrent,technologyReviewCurrent,technologyHandoffCurrent,simulationCurrent,technologyProposal,simulateTechnology,applyTechnologyCommand,exportTechnologyMarkdown} from './public/technology-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';

const cmd=(p,type,payload={})=>applyTechnologyCommand(p,{type:'technology.'+type,payload}).document;
const base=withTechnology(seedProject()),original=JSON.stringify(base);
assert(Buffer.byteLength(JSON.stringify(base))<400000,'Source tracking must stay compact as capabilities share rationale');
assert.equal(capabilities(base).length,9);assert.equal(base.technology.needs.length,28);
assert.equal(base.technology.mappings.length,28);
assert.equal(capability(base,'postgres').ref,'TC-002');assert.equal(capability(base,'queue').ref,'TC-003');
assert.equal(new Set(logicalGraph(base).nodes.map(n=>n.id)).size,39);
assert.deepEqual(withTechnology(base),base,'Reopening must not recreate technology records');
assert.deepEqual(base.artefacts,seedProject().artefacts);
assert(technologySources(base,'postgres').requirements.some(r=>r.id==='REQ-004'));
assert(technologySources(base,'postgres').drivers.some(r=>r.id==='QD-004'));
assert(technologySources(base,'postgres').decisions.some(r=>r.id==='ADR-003'));
assert.equal(technologyFindings(base).filter(f=>f.level==='error').length,4);
assert.equal(new Set(technologyFindings(base).map(f=>f.id)).size,technologyFindings(base).length);

let p=cmd(base,'intake');assert(technologyIntakeCurrent(p));
const needPayload={applicationId:'api-pod',boundaryId:'tb-002',confirmed:true,needs:needsFor(p,'api-pod')};
p=cmd(p,'needs',needPayload);assert(needsFor(p,'api-pod').every(n=>n.confirmed&&!needChanged(p,n)));
assert.deepEqual(needsFor(p,'api-pod').map(n=>n.id),needsFor(base,'api-pod').map(n=>n.id));
assert.deepEqual(p.technology.mappings,base.technology.mappings);
assert.throws(()=>cmd(p,'needs',{...needPayload,needs:[]}),/at least/);
assert.throws(()=>cmd(p,'needs',{...needPayload,needs:[needPayload.needs[0],needPayload.needs[0]]}),/once/);
const payload={title:'Isolated case execution',category:'compute',purpose:'Run controlled payment investigations.',boundary:'Own scheduled enquiries, without authorising a replay.',owner:'Payments operations',rationale:'Keep investigation capacity and recovery authority explicit.',source:'Illustrative architecture review',boundaryId:'tb-002',failureDomain:'Investigation primary',continuity:'single',status:'candidate',recoveryMinutes:'',lossMinutes:'',driverIds:['QD-004'],decisionIds:['ADR-003'],mappings:[{needId:'TN-001',scope:'Provide controlled workload execution'}]};
p=cmd(p,'capability',payload);let c=capabilities(p).at(-1),id=c.id;assert.equal(c.ref,'TC-010');
assert.equal(supports(p,id)[0].id,'TM-029');
p=cmd(p,'capability',{...payload,id,title:'Controlled investigation execution'});c=capability(p,id);
assert.equal(c.revision,2);assert.equal(c.history[0].title,payload.title);assert.equal(supports(p,id)[0].id,'TM-029');
assert.equal(logicalGraph(p).nodes.find(n=>n.id===id).title,c.title);
assert.throws(()=>cmd(p,'capability',{...payload,title:''}),/Name/);
assert.throws(()=>cmd(p,'capability',{...payload,driverIds:['missing']}),/existing/);
assert.throws(()=>cmd(p,'capability',{...payload,recoveryMinutes:-1}),/non-negative/);
assert.throws(()=>cmd(p,'capability',{...payload,mappings:[{needId:'missing'}]}),/existing/);
assert.throws(()=>cmd(p,'capability',{...payload,mappings:[payload.mappings[0],payload.mappings[0]]}),/once/);
assert.throws(()=>cmd(p,'capability',{...payload,purpose:'',status:'reviewed'}),/before review/);
const bp={title:'Investigation control',owner:'Payments security',policy:'Only named investigators can enquire; resumption needs separate authority.'};
p=cmd(p,'boundary',bp);const boundary=p.technology.boundaries.at(-1);assert.equal(boundary.ref,'TB-004');
p=cmd(p,'boundary',{...boundary,title:'Controlled investigation'});assert.equal(p.technology.boundaries.at(-1).id,boundary.id);
const dp={from:id,to:'tc-006',type:'trust',critical:true,label:'requires investigator authority',policy:'Deny enquiries if investigator authority cannot be established.'};
p=cmd(p,'dependency',dp);const dep=p.technology.dependencies.at(-1);assert.equal(dep.id,'TD-005');
p=cmd(p,'dependency',{...dep,label:'requires explicit enquiry authority'});assert.equal(p.technology.dependencies.at(-1).id,dep.id);
assert.throws(()=>cmd(p,'dependency',dp),/already/);
assert.throws(()=>cmd(p,'dependency',{...dp,to:id}),/different/);
assert.throws(()=>cmd(p,'dependency',{...dp,to:'missing'}),/existing/);
assert.throws(()=>cmd(p,'dependency',{...dp,to:'api-pod'}),/connect capabilities/);
assert(!cmd(p,'remove-dependency',{id:dep.id}).technology.dependencies.some(d=>d.id===dep.id));
const cycle=cmd(p,'dependency',{...dp,from:'tc-006',to:id});assert(technologyFindings(cycle).some(f=>f.code==='cycle'));
const badIsolation=cmd(p,'capability',{...capability(p,id),mappings:supports(p,id),continuity:'redundant',alternateDomain:'investigation primary',continuityPlan:'Use another copy.'});
assert(technologyFindings(badIsolation).some(f=>f.code==='isolation'&&f.objectId===id));
const unsafe=cmd(p,'capability',{...capability(p,'tc-006'),mappings:supports(p,'tc-006'),continuity:'bypass',continuityPlan:'Allow operations.'});assert(technologyFindings(unsafe).some(f=>f.code==='unsafe-bypass'));
const indirect=cmd(p,'capability',{...payload,title:'Indirect authority prerequisite',mappings:[]});const indirectId=capabilities(indirect).at(-1).id;
const indirectLinked=cmd(indirect,'dependency',{...dp,from:id,to:indirectId});assert(technologyFindings(indirectLinked).some(f=>f.code==='single-point'&&f.objectId===indirectId),'Indirect essential prerequisites also need continuity review');

const newAppPayload={title:'Investigation application',kind:'worker',purpose:'Own investigation cases',boundary:'Pending enquiries only',owner:'Operations',inputs:'Pending reference',outputs:'Verified outcome',source:'Reference review',rationale:'Make the owner explicit',technologyNeeds:'Durable case storage, enquiry connectivity and evidence alerts',status:'candidate',dataIds:[],decisionIds:['ADR-003'],allocations:[{logicalId:'hub',scope:'Coordinate pending enquiries'}]};
const inherited=withTechnology(applyRealisationCommand(p,{type:'realisation.component',payload:newAppPayload}).document);const app=components(inherited).at(-1);
assert(needsFor(inherited,app.id).length>0);assert(needsFor(inherited,app.id).every(n=>!n.confirmed&&n.origin==='suggestion'));
assert(needsFor(inherited,app.id).every(n=>!inherited.technology.mappings.some(m=>m.needId===n.id)));
const beforeGhost=JSON.stringify(inherited),ghost=technologyProposal(inherited,'missing',app.id);
assert(ghost);assert.equal(JSON.stringify(inherited),beforeGhost);assert.throws(()=>cmd(inherited,'proposal',{...ghost}),/Review/);
const accepted=cmd(inherited,'proposal',{...ghost,record:{...ghost.record,title:'Reviewed '+ghost.record.title},reviewed:true});
assert(accepted.technology.mappings.some(m=>m.needId===ghost.needId));assert.equal(capability(accepted,ghost.record.id).title,'Reviewed '+ghost.record.title);
assert.equal(accepted.logical.version,inherited.logical.version);assert.equal(accepted.realisation.version,inherited.realisation.version);
for(const key of ['isolate','restore']){const q=technologyProposal(p,key,'postgres');assert(q);p=cmd(p,'proposal',{...q,reviewed:true});}
assert(p.technology.dependencies.some(d=>d.from==='postgres'&&d.type==='resilience'&&d.to==='tc-008'));
assert(technologyFindings(p).some(f=>f.code==='shared-recovery-domain'&&f.objectId==='postgres'));
assert.equal(JSON.stringify(base),original,'Commands and proposals must not mutate their input');

const scenario={capabilityId:'postgres',mode:'capability',durationMinutes:20};
const outage=simulateTechnology(base,scenario);assert(outage.simulated);assert.equal(outage.applications.length,3);
assert(outage.applications.every(a=>a.state==='unavailable'));
assert.equal(outage.assessments.find(a=>a.driverId==='QD-004').result,'unmet-assumption');
assert(outage.assessments.filter(a=>a.driverId!=='QD-004').every(a=>a.result==='unassessed'&&a.value===''));
const met=simulateTechnology(base,{...scenario,measurements:[{driverId:'QD-004',value:'2',basis:'Assume the enquiry service remains usable after two minutes.'}]});assert.equal(met.assessments.find(a=>a.driverId==='QD-004').result,'met-assumption');
assert.throws(()=>simulateTechnology(base,{...scenario,measurements:[{driverId:'QD-004',value:'2',basis:''}]}),/basis/);
assert.throws(()=>simulateTechnology(base,{...scenario,measurements:[{driverId:'missing',value:'2',basis:'Assumed'}]}),/affected/);
assert.throws(()=>simulateTechnology(base,{...scenario,durationMinutes:0}),/positive/);
const identityLoss=simulateTechnology(base,{...scenario,capabilityId:'tc-006'});assert(identityLoss.capabilities.some(c=>c.id==='gateway'&&c.state==='unavailable'));assert(identityLoss.capabilities.some(c=>c.id==='tc-001'&&c.state==='unavailable'));
const evidenceLoss=simulateTechnology(base,{...scenario,capabilityId:'tc-007'});assert(!evidenceLoss.capabilities.some(c=>c.id==='tc-001'),'Data movement must not propagate an outage');assert(evidenceLoss.applications.every(a=>a.state==='degraded'));
const backupLoss=simulateTechnology(p,{...scenario,capabilityId:'tc-008'});assert(!backupLoss.capabilities.some(c=>c.id==='postgres'),'Recovery dependencies do not automatically block normal operation');
const domainLoss=simulateTechnology(p,{...scenario,mode:'domain'});assert.equal(domainLoss.capabilities.find(c=>c.id==='postgres').state,'degraded');assert.equal(simulateTechnology(p,scenario).capabilities.find(c=>c.id==='postgres').state,'unavailable','Whole capability loss includes its declared copies');
assert.throws(()=>cmd(p,'simulation',{...scenario,reviewed:true,visited:[0,3]}),/Walk through/);
for(const mode of ['capability','domain'])p=cmd(p,'simulation',{...scenario,mode,reviewed:true,visited:[0,1,2,3]});
assert(p.technology.simulations.every(s=>simulationCurrent(p,s)));p=cmd(p,'review');assert(technologyReviewCurrent(p));
assert.throws(()=>cmd(p,'handoff'),/Acknowledge/);p=cmd(p,'handoff',{acknowledge:true});assert(technologyHandoffCurrent(p));assert(p.technology.handoff.capabilityRefs.includes('TC-010'));
const revised=cmd(p,'capability',{...capability(p,id),mappings:supports(p,id),purpose:'Revised execution boundary'});assert(!technologyReviewCurrent(revised));assert(!technologyHandoffCurrent(revised));assert(revised.technology.simulations.every(s=>!simulationCurrent(revised,s)));
const sourceChanged=withTechnology(applyRealisationCommand(p,{type:'realisation.component',payload:{...component(p,'api-pod'),allocations:allocations(p,'api-pod'),technologyNeeds:'Revised state protection requirement'}}).document);
assert(needsFor(sourceChanged,'api-pod').every(n=>needChanged(sourceChanged,n)));assert(capabilityChanged(sourceChanged,capability(sourceChanged,'postgres')));assert(!technologyIntakeCurrent(sourceChanged));assert(!technologyHandoffCurrent(sourceChanged));
const qualityChanged=structuredClone(p);qualityChanged.quality.version++;qualityChanged.quality.drivers.find(d=>d.id==='QD-004').targetValue='1';assert(capabilityChanged(qualityChanged,capability(qualityChanged,'postgres')));assert(!technologyReviewCurrent(qualityChanged));

// Progress is attainable, with open reference assumptions still carried explicitly.
let ready=cmd(base,'intake');for(const a of components(ready))ready=cmd(ready,'needs',{applicationId:a.id,boundaryId:'tb-002',confirmed:true,needs:needsFor(ready,a.id)});
for(const capId of ['postgres','queue']){const q=technologyProposal(ready,'restore',capId);ready=cmd(ready,'proposal',{...q,record:{...q.record,recoveryMinutes:'15',lossMinutes:'0'},reviewed:true});}
for(const mode of ['capability','domain'])ready=cmd(ready,'simulation',{...scenario,mode,reviewed:true,visited:[0,1,2,3]});
ready=cmd(cmd(ready,'review'),'handoff',{acknowledge:true});assert(technologyMilestones(ready).every(m=>m.done));
const md=exportTechnologyMarkdown(p);for(const term of ['TC-010','TN-001','TM-029','TD-005','TB-004','QD-004','ADR-003','Chapter 7','unmet-assumption','All mapped capabilities'])assert(md.includes(term),term);

// Exercise the actual renderer with expanded capability and trust-boundary records.
const g=logicalGraph(p),modelSource=fs.readFileSync('public/model.js','utf8').replaceAll('export const ','const '),appSource=fs.readFileSync('public/app.js','utf8').replace(/^import .*?;\n/gm,'').replace(/\npersist\(\);render\(\);\n/,'\n');
const el={textContent:'',style:{},innerHTML:'',classList:{add(){},remove(){},toggle(){}},focus(){},click(){},setAttribute(){},scrollIntoView(){}};
const ctx={console,Set,Map,URL,URLSearchParams,location:{search:''},Blob,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:()=>null,setItem(){}},document:{body:el,querySelector:()=>el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el},window:{aiwLogicalStudio:{graph:()=>g,groups:p.logical.groups,bind(){}},addEventListener(){},matchMedia:()=>({matches:true})}};
const uxSource=browserSource('public/workspace-ux.js');
Object.assign(ctx,projectContext,projectScope);vm.createContext(ctx);vm.runInContext(uxSource,ctx);vm.runInContext(modelSource+'\n'+appSource+'\nglobalThis.layout=layoutModel;globalThis.testLayers=layers;',ctx);
for(let mask=0;mask<256;mask++)for(const mobile of [false,true]){const visible=ctx.testLayers.filter((_,i)=>mask&(1<<i)).map(l=>l.id),l=ctx.layout(g.nodes.filter(n=>visible.includes(n.layer)),mobile,false,false),ps=[...l.positions.values()];for(const v of ps)assert(v.x>=0&&v.y>=0&&v.x+200<=l.width&&v.y+74<=l.height);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert(ps[i].x+200<=ps[j].x||ps[j].x+200<=ps[i].x||ps[i].y+74<=ps[j].y||ps[j].y+74<=ps[i].y);}

const DB=localDatabase(':memory:'),env={DB,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env)};
try{
 assert.equal((await api('/api/project','GET',null,null)).status,401);
 let state=await(await api('/api/project')).json();const body={revision:state.revision,command:{type:'technology.capability',payload}};
 assert.equal((await api('/api/commands','POST',body,'architect-a','https://other.test')).status,403);
 const saved=await api('/api/commands','POST',body);assert.equal(saved.status,200);state=await saved.json();assert.equal((await api('/api/commands','POST',body)).status,409);
 const reopened=await(await api('/api/project')).json();assert.equal(capabilities(reopened.document).at(-1).ref,'TC-010');assert.equal(capabilities(reopened.document).at(-1).purpose,payload.purpose);assert.deepEqual(reopened.document.artefacts,base.artefacts);
 assert.equal(capabilities((await(await api('/api/project','GET',null,'architect-b')).json()).document).length,9);
 for(const format of ['json','md']){const res=await api('/api/export?chapter=6&format='+format);assert.equal(res.status,200);if(format==='json'){const bundle=await res.json();assert(bundle.connectedModel.nodes.some(n=>n.ref==='TC-010'));assert(bundle.technologyValidation.findings.some(f=>f.code==='recovery-plan'));}else assert((await res.text()).includes('TC-010'));}
 const downstream=await api('/api/commands','POST',{revision:state.revision,command:{type:'realisation.component',payload:newAppPayload}});assert.equal(downstream.status,200);const updated=(await downstream.json()).document;assert(needsFor(updated,components(updated).at(-1).id).length>0);
 console.log('PASS Logical technology: stable capability/need/mapping/dependency/boundary identities; inherited traceability and invalidation; explicit editable ghosts; direct and indirect support gaps; trust, recovery and failure propagation; assumption-based quality comparisons; attainable handoff; 512 layered layouts; authenticated persistence, owner isolation, CAS, and exports.');
}finally{DB.close()}
