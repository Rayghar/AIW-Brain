import assert from 'node:assert/strict';
import {driverLinksOf} from './public/driver-links.js';
import {seedProject} from './public/requirements-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import {components,component,allocations,applyRealisationCommand} from './public/realisation-domain.js';
import {withTechnology,capabilities,capability,needsFor,supports,needChanged,technologySources,capabilityChanged,technologyFindings,technologyMilestones,technologyIntakeCurrent,technologyReviewCurrent,technologyHandoffCurrent,simulationCurrent,technologyProposal,simulateTechnology,applyTechnologyCommand,exportTechnologyMarkdown} from './public/technology-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {applyRecordLifecycleCommand} from './public/record-lifecycle.js';
import {TECHNOLOGY_LIFECYCLE,needIsSeed} from './public/technology-domain.js';

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
const stillUnconfirmed=cmd(p,'needs',needPayload);
assert(needsFor(stillUnconfirmed,'api-pod').every(n=>!n.confirmed),'a bulk flag does not override an explicit unconfirmed row');
needPayload.needs=needPayload.needs.map(n=>({...n,confirmed:true}));
p=cmd(p,'needs',needPayload);assert(needsFor(p,'api-pod').every(n=>n.confirmed&&!needChanged(p,n)),'each explicitly reviewed row is confirmed against the current application');
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
// Round 11: the recovery target names the Chapter 2 driver it serves; an unknown driver is refused, and the link reads the figure against the target.
assert.throws(()=>cmd(p,'capability',{...payload,id,driverId:'QD-999'}),/existing quality driver/);
{let q=cmd(p,'capability',{...payload,id,recoveryMinutes:'30',driverId:'QD-004'});assert.equal(capability(q,id).driverId,'QD-004');let ls=driverLinksOf(q,id);assert.equal(ls.length,1);assert.equal(ls[0].state,'breaks');assert.match(ls[0].why,/30 min, longer than QD-004's 15 min/);
 q=cmd(q,'capability',{...payload,id,recoveryMinutes:'10',driverId:'QD-004'});assert.equal(driverLinksOf(q,id)[0].state,'holds');q=cmd(q,'capability',{...payload,id,recoveryMinutes:'',driverId:'QD-004'});assert.equal(driverLinksOf(q,id)[0].state,'unknown');q=cmd(q,'capability',{...payload,id,driverId:''});assert.equal(driverLinksOf(q,id).length,0);
 console.log('PASS a capability\'s recovery target may name the Chapter 2 driver it serves (round 11): an unknown driver is refused; the link reads 30 min against QD-004\'s 15 min as a disagreement, 10 min as agreement, and no figure as not compared');}
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
// Synthetic lifecycle fixture: keeping one proposed need is distinct from reviewing its design.
const offeredNeed=needsFor(inherited,app.id)[0];
const keptNeedProject=applyRecordLifecycleCommand(inherited,{type:'record.keep',payload:{id:offeredNeed.id,chapter:6}},'2026-10-17T00:00:00.000Z','synthetic-test-actor',TECHNOLOGY_LIFECYCLE).document;
const keptNeed=needsFor(keptNeedProject,app.id).find(n=>n.id===offeredNeed.id);
assert(!keptNeed.confirmed&&!needIsSeed(keptNeedProject,keptNeed),'keeping makes the proposal an editable draft, never a reviewed need');
assert.deepEqual(needsFor(keptNeedProject,app.id).filter(n=>n.id!==offeredNeed.id),needsFor(inherited,app.id).filter(n=>n.id!==offeredNeed.id),'keeping a selected need leaves the other proposals unchanged');
const reviewedNeedProject=cmd(keptNeedProject,'needs',{applicationId:app.id,needs:needsFor(keptNeedProject,app.id).map(n=>n.id===offeredNeed.id?{...n,confirmed:true}:n)});
assert(needsFor(reviewedNeedProject,app.id).find(n=>n.id===offeredNeed.id).confirmed,'the kept draft becomes reviewed only through explicit per-need confirmation');
assert(needsFor(reviewedNeedProject,app.id).filter(n=>n.id!==offeredNeed.id).every(n=>!n.confirmed),'reviewing one need does not confirm the other proposals');
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
let ready=cmd(base,'intake');for(const a of components(ready))ready=cmd(ready,'needs',{applicationId:a.id,boundaryId:'tb-002',confirmed:true,needs:needsFor(ready,a.id).map(n=>({...n,confirmed:true}))});
for(const capId of ['postgres','queue']){const q=technologyProposal(ready,'restore',capId);ready=cmd(ready,'proposal',{...q,record:{...q.record,recoveryMinutes:'15',lossMinutes:'0'},reviewed:true});}
for(const mode of ['capability','domain'])ready=cmd(ready,'simulation',{...scenario,mode,reviewed:true,visited:[0,1,2,3]});
ready=cmd(cmd(ready,'review'),'handoff',{acknowledge:true});assert(technologyMilestones(ready).every(m=>m.done));
const md=exportTechnologyMarkdown(p);for(const term of ['TC-010','TN-001','TM-029','TD-005','TB-004','QD-004','ADR-003','Chapter 7','unmet-assumption','All mapped capabilities'])assert(md.includes(term),term);


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
  const {applyTechnologyCommand: applyT, TECHNOLOGY_LIMITS: TL} = await import('./public/technology-domain.js');
  assert.deepEqual({...TL}, {capabilities: 500, dependencies: 2000});
  bound('technology capabilities', TL.capabilities, p => p.technology.capabilities, (p, n) => ({...structuredClone(p.technology.capabilities[0]), id: 'tc-b' + n, ref: 'TC-B' + n, title: 'Bound capability ' + n}), applyT, () => ({type: 'technology.capability', payload: {title: 'One capability more', category: 'compute', mappings: [], driverIds: [], decisionIds: []}}), /^Error: This workspace keeps up to 500 technology capabilities\.$/);
  bound('technology dependencies', TL.dependencies, p => p.technology.dependencies, (p, n) => ({id: 'TD-B' + n, from: 'bound-a' + n, to: 'bound-b' + n, type: 'data', label: 'bound ' + n, policy: '', critical: false, origin: 'user'}), applyT, p => ({type: 'technology.dependency', payload: {from: p.technology.capabilities[0].id, to: p.technology.capabilities[1].id, type: 'data', label: 'one dependency more'}}), /^Error: This workspace keeps up to 2,000 technology dependencies\.$/);
  console.log('PASS technology capabilities are bounded at 500 and dependencies at 2,000, each refusing the next with "This workspace keeps up to …"');
}

// ---------------------------------------------------------------- Round 12 (D2): not stated, several needs per category
{
  const q = cmd(base, 'needs', {applicationId: 'worker', needs: [...needsFor(base, 'worker').map(n => ({id: n.id, category: n.category})), {category: 'compute', description: 'Run the reconciliation batch apart from dispatch.'}]});
  const ns = needsFor(q, 'worker');
  assert.equal(ns.filter(n => n.category === 'compute').length, 2, 'two needs in one category, each kept by its id');
  assert.equal(ns.at(-1).criticality, '', 'a new need\'s consequence is not stated until someone states it');
  assert.equal(ns.at(-1).origin, 'user');
  const r = cmd(q, 'capability', {id: 'tc-001', continuity: null});
  assert.equal(capability(r, 'tc-001').continuity, '');
  assert.ok(!technologyFindings(r).some(f => f.code === 'single-point' && f.objectId === 'tc-001'), 'no single-point warning on a continuity not stated');
  assert.ok(technologyFindings(r).some(f => f.code === 'not-stated' && f.items.some(x => x.objectId === 'tc-001' && x.field === 'continuity')));
  const unchanged = cmd(r, 'capability', {id: 'tc-001', continuity: ''});
  assert.equal(unchanged.technology.version, r.technology.version, 'a save that changes nothing keeps the version');
  console.log('PASS round 12: an application holds several needs per category, a new need\'s consequence and a capability\'s continuity may be not stated (no single-point warning computed on it, one grouped warning instead), and an unchanged save keeps the version');
}

// ---------------------------------------------------------------- Round 12 (D4, GR-TEC-05): five more categories, own checks
// Scheduling, workflow, search, reporting data and archive save as categories of their own and raise their own checks,
// not the transactional or messaging ones; a workflow queue recorded as messaging needed a backup link, as workflow it does
// not. The reference still seeds its nine.
{
  const {ADDED_TECHNOLOGY_CATEGORIES, TECHNOLOGY_CATEGORIES} = await import('./public/technology-domain.js');
  assert.deepEqual(ADDED_TECHNOLOGY_CATEGORIES.map(([id]) => id), ['scheduling', 'workflow', 'search', 'reporting', 'archive']);
  // Fifteen with K's application platform (round 12, GR-DOM-04), which follows these five.
  assert.equal(TECHNOLOGY_CATEGORIES.length, 15); assert.deepEqual(TECHNOLOGY_CATEGORIES.slice(9).map(([id]) => id), ['scheduling', 'workflow', 'search', 'reporting', 'archive', 'application-platform']);
  assert.equal(capabilities(base).length, 9, 'the reference seeds a capability for its nine categories only');
  const OWN = {scheduling: 'schedule-policy', workflow: 'workflow-state', search: 'search-rebuild', reporting: 'reporting-refresh', archive: 'archive-recovery'};
  const defined = {purpose: 'Serves the operations team.', boundary: 'Owns its own records only.', owner: 'Platform team', rationale: 'Named in the design workshop.', source: 'Design workshop', boundaryId: 'tb-002', failureDomain: 'Zone A'};
  let q = base;
  for (const [category, name] of ADDED_TECHNOLOGY_CATEGORIES) q = cmd(q, 'capability', {title: name + ' service', category, ...defined});
  const added = capabilities(q).slice(-5);
  assert.deepEqual(added.map(c => c.category), Object.keys(OWN), 'each saves with its category');
  const codes = c => technologyFindings(q).filter(f => f.objectId === c.id).map(f => f.code);
  for (const c of added) {
    assert.ok(codes(c).includes(OWN[c.category]), c.category + ' raises its own check, ' + OWN[c.category]);
    assert.ok(!['backup', 'recovery-plan', 'recovery-path'].some(x => codes(c).includes(x)), c.category + ' is not checked as transactional storage or messaging');
  }
  // A workflow queue: recorded as messaging it needs a backup link; recorded as workflow it does not, and its own check
  // clears once it says where work in flight is kept.
  const asMessaging = cmd(base, 'capability', {title: 'Case work queue', category: 'messaging', ...defined}), queue = capabilities(asMessaging).at(-1).id;
  assert.ok(technologyFindings(asMessaging).some(f => f.code === 'backup' && f.objectId === queue), 'as messaging it needs a backup link');
  const asWorkflow = cmd(asMessaging, 'capability', {id: queue, category: 'workflow'});
  assert.ok(!technologyFindings(asWorkflow).some(f => f.code === 'backup' && f.objectId === queue), 'as workflow it gets no backup error');
  assert.ok(technologyFindings(asWorkflow).some(f => f.code === 'workflow-state' && f.objectId === queue));
  const kept = cmd(asWorkflow, 'capability', {id: queue, recoveryPlan: 'Resume each case from its last committed step.', recoveryOwner: 'Operations team'});
  assert.ok(!technologyFindings(kept).some(f => f.code === 'workflow-state' && f.objectId === queue), 'stated, the check clears');
  console.log('PASS round 12: scheduling, workflow, search, reporting data and archive save as categories with their own checks (missed runs, work in flight, rebuild, refresh, restore), not those of transactional storage or messaging; a workflow queue gets no backup error; the reference still seeds its nine');
}

// ---------------------------------------------------------------- Round 12 (D4, GR-RUN-08): a consequence not stated
// The failure simulation reads a need whose consequence nobody stated as "not stated", never degraded; the platform view
// keeps those components apart from the degraded ones, and draws such a need as its own kind.
{
  const {platformSource, failureOf} = await import('./public/platform-model.js');
  const obs = needsFor(base, 'notify-worker').find(n => n.category === 'observability');
  const q = cmd(base, 'needs', {applicationId: 'notify-worker', needs: needsFor(base, 'notify-worker').map(n => n.id === obs.id ? {id: n.id, category: n.category, criticality: null} : {id: n.id, category: n.category})});
  assert.equal(needsFor(q, 'notify-worker').find(n => n.id === obs.id).criticality, '', 'the consequence is not stated');
  const s = simulateTechnology(q, {capabilityId: 'tc-007', mode: 'capability', durationMinutes: 30, measurements: []}), a = s.applications.find(x => x.id === 'notify-worker');
  assert.equal(a.state, 'not-stated', 'the application the loss reaches only through that need reads "not stated"');
  assert.deepEqual(a.needs.map(n => [n.id, n.consequence]), [[obs.id, 'not-stated']]);
  assert.ok(s.applications.filter(x => x.id !== 'notify-worker').every(x => x.state === 'degraded'), 'the others keep their stated consequence');
  assert.equal(simulateTechnology(base, {capabilityId: 'tc-007', mode: 'capability', durationMinutes: 30, measurements: []}).applications.find(x => x.id === 'notify-worker').state, 'degraded', 'as stated in the reference, degraded');
  const P = platformSource(q), F = failureOf(P, {id: 'tc-007', mode: 'capability'});
  assert.deepEqual(F.unstated, ['notify-worker']); assert.ok(!F.degrades.includes('notify-worker') && !F.stops.includes('notify-worker'), 'drawn apart from degraded and stopped');
  assert.equal(P.needs.get(obs.id).criticality, 'not-stated', 'the need is drawn as a need whose consequence is not stated, not as essential');
  console.log('PASS round 12: the failure simulation reads a need whose consequence is not stated as "not stated", never degraded; the platform view keeps such components apart from degraded and stopped ones and draws the need as its own kind');
}

// ---------------------------------------------------------------- rc39 (W3 step 2, PLAN §4.3.2): the Design basis on the record card
// The card's first disclosure is the design basis, read from the design-questions projection: the drivers reaching the
// record, the questions as rows with their state, the drivers that opened them, their answers with chapter and state,
// the story once decided, the caution behind "?", and one action per open or draft question (Decide → Co-design for a
// method topic, Open → Chapter N for another chapter's record). Every count printed is the projection's; the other
// disclosures stay as they were.
{
  const {recordCardHTML} = await import('./public/record-card.js');
  const {designQuestions} = await import('./public/design-questions.js');
  const {withFinalReview} = await import('./public/review-domain.js');
  const {seedProject: seedForBasis} = await import('./public/requirements-domain.js');
  const {Window} = await import('happy-dom');
  const w = new Window({url: 'https://aiw.test/'}), make = html => { const t = w.document.createElement('template'); t.innerHTML = html; return t.content; };
  const ref = withFinalReview(seedForBasis());
  const card = (p, chapter, id) => make(recordCardHTML(p, chapter, id, '<div class="t-dock-body"><p>native</p></div>', {nodes: [], edges: []}));
  try {
    const dq = designQuestions(ref, 'queue'), c = card(ref, 6, 'queue');
    const basis = c.querySelector('.record-card > details:first-of-type');
    assert.equal(basis.dataset.cardSection, 'design-basis', 'the design basis is the first disclosure on a capability');
    assert.equal(basis.open, dq.counts.open > 0);
    assert.deepEqual([...basis.querySelectorAll('.design-q')].map(li => li.dataset.designQuestion), ['handoff'], 'a messaging capability answers the hand-off question only');
    assert.deepEqual([...basis.querySelectorAll('[data-design-driver]')].map(li => li.dataset.designDriver), dq.drivers.map(d => d.id));
    const row = basis.querySelector('.design-q');
    assert.equal(row.querySelector('.chip.design-state').textContent, dq.questions[0].state === 'draft' ? 'Draft' : dq.questions[0].state === 'open' ? 'Open' : 'Decided');
    const action = row.querySelector('button[data-action="design-decide"]');
    assert.ok(action && action.dataset.topic === 'interaction' && action.dataset.record === 'queue', 'Decide opens the interaction comparison for the capability');
    assert.ok([...row.querySelectorAll('.design-answers li')].some(li => /Chapter 6 · (draft|decided)$/.test(li.textContent)), 'its own answer with Chapter 6: ' + row.textContent);
    const caching = card(ref, 6, 'tc-004').querySelector('[data-card-section="design-basis"]');
    assert.ok(caching && !caching.open && /No design question opens from its drivers\./.test(caching.textContent), 'a caching capability no component needs yet: no question, closed');
    console.log('PASS rc39: the Chapter 6 capability card opens on its Design basis (the hand-off question for the messaging capability, with Decide → Co-design on the interaction topic), from the design-questions projection');
  } finally { await w.happyDOM.close(); }
}

// ---------------------------------------------------------------- rc39 (W3 step 3, PLAN §4.3.2): the need's words from its drivers
// One function (technology-domain.js needWording) derives a need's words from the drivers that reach its application
// and open a design question the need's category answers; the template sentence is the fallback when no driver
// applies. The seeding of a person's project uses it; the reference keeps its illustrative words; a need already
// recorded is never rewritten: the Needs register offers "Wording from drivers available", which opens the needs
// editor with the wording in place, and only saving accepts it. The editor's new need takes it as its default.
{
  const {needWording, withTechnology: withTech} = await import('./public/technology-domain.js');
  const {withFinalReview} = await import('./public/review-domain.js');
  const {seedProject: seedRef} = await import('./public/requirements-domain.js');
  const ref = withFinalReview(seedRef());
  const w = needWording(ref, 'api-pod', 'transactional');
  assert.deepEqual(w, {text: 'Transactional persistence for QD-001 (preserve one financial effect), QD-003 (acknowledge a payment predictably) and QD-006 (retain the payment trail across boundaries).', fromDrivers: true, driverIds: ['QD-001', 'QD-003', 'QD-006']}, 'the drivers that open the persistence question for the Payment service, in the projection\'s order, each with its title');
  assert.deepEqual(needWording(ref, 'api-pod', 'compute'), {text: 'Execute this component with workload isolation and controlled restart.', fromDrivers: false, driverIds: []}, 'no question answers a compute need: the template');
  assert.equal(needWording(ref, 'notify-worker', 'transactional').fromDrivers, false, 'no driver opens the persistence question for the notification worker: the template');
  assert.equal(needWording(ref, 'nobody', 'transactional').text, 'Persist this component’s authoritative records and original references consistently.', 'an unknown application: the template');
  assert.equal(needWording(ref, 'api-pod', 'nonsense').text, '', 'an unknown category has no words');
  assert.equal(ref.technology.needs.find(n => n.id === 'TN-002').description, 'Persist this component’s authoritative records and original references consistently.', 'the reference keeps its illustrative words');
  // A person's project: the seeded need of a component the drivers reach takes the derived words; a category no
  // driver opens keeps the template; every seed is still a proposal (state proposed).
  // The reference's components under other ids (so that none is the reference's own), everywhere they are named.
  const own = JSON.parse(JSON.stringify(ref).replaceAll('"api-pod"', '"own-api-pod"')); own.workspace = {...(own.workspace || {}), template: 'blank'}; delete own.technology;
  const seeded = withTech(own), mine = seeded.technology.needs.filter(n => n.applicationId === 'own-api-pod');
  assert.ok(mine.length >= 2 && mine.every(n => n.state === 'proposed'), 'the needs AIW proposes from the component\'s words are proposals: ' + mine.map(n => n.category + ':' + n.state).join(', '));
  const stored = mine.find(n => n.category === 'transactional');
  assert.equal(stored.description, 'Transactional persistence for QD-001 (preserve one financial effect), QD-003 (acknowledge a payment predictably) and QD-006 (retain the payment trail across boundaries).', 'the seeded need says which drivers ask for it');
  const ident = mine.find(n => n.category === 'identity');
  assert.ok(ident, 'the identity cue still seeds a need'); assert.equal(ident.description, 'Identity and access decisions for QD-005 (reject an unauthorised instruction).');
  const quiet = structuredClone(own); quiet.quality.drivers = [];
  assert.equal(withTech(quiet).technology.needs.find(n => n.applicationId === 'own-api-pod' && n.category === 'transactional').description, 'Persist this component’s authoritative records and original references consistently.', 'without a driver the template is the fallback');
  // The Needs register and its editor, through the Chapter 6 studio in a document.
  const {Window} = await import('happy-dom');
  const win = new Window({url: 'http://fixture.local/?chapter=6&tab=work&section=needs'});
  const held = {};
  for (const k of ['window', 'document', 'location', 'history', 'FormData', 'Event', 'CustomEvent', 'HTMLElement', 'requestAnimationFrame']) held[k] = globalThis[k];
  Object.assign(globalThis, {window: win, document: win.document, location: win.location, history: win.history, FormData: win.FormData, Event: win.Event, CustomEvent: win.CustomEvent, HTMLElement: win.HTMLElement, requestAnimationFrame: win.requestAnimationFrame.bind(win)});
  try {
    const {createTechnologyStudio} = await import('./public/technology-ui.js');
    const {logicalGraph: graphOf} = await import('./public/logical-domain.js');
    const store = {value: {document: ref}}, studio = createTechnologyStudio(store);
    const bridge = {state: {chapter: 6, tab: 'work', selected: 'api-pod', visible: ['physical', 'technology'], cursor: true}, getNode: key => graphOf(store.value.document).nodes.find(n => n.id === key), closeModal() {}, pauseFlow() {}, render() {}, toast() {}, setTab() {}};
    studio.bind(bridge);
    document.body.innerHTML = '<div id="app">' + studio.work() + '</div><div id="dialog-host"></div>';
    const row = id => document.querySelector('[data-work-need="' + id + '"]');
    const chip = row('TN-002').querySelector('[data-t-action="need-wording"]');
    assert.ok(chip && chip.textContent === 'Wording from drivers available' && chip.title === w.text, 'the need row offers the derived wording as an edit');
    assert.equal(row('TN-001').querySelector('[data-t-action="need-wording"]'), null, 'a need no driver rewords offers nothing');
    assert.equal(row('TN-002').querySelector('p').textContent, 'Persist this component’s authoritative records and original references consistently.', 'the recorded words stand until the person accepts');
    chip.click();
    const form = document.querySelector('dialog #t-needs-form'); assert.ok(form, 'the chip opens the needs editor');
    assert.equal(form.elements['need:TN-002'].value, w.text, 'with the derived wording in that need\'s field');
    assert.equal(form.elements['need:TN-001'].value, 'Execute this component with workload isolation and controlled restart.', 'the other needs keep their words');
    assert.match(document.querySelector('[data-t-wording="TN-002"]').textContent, /save to accept it, or edit it first/);
    assert.equal(store.value.document, ref, 'nothing is saved by opening the editor');
    // The new need's default: choosing a category fills its words from the drivers; a category no driver opens leaves
    // them empty; words the person wrote are kept.
    const category = form.elements.newCategory, words = form.elements.newNeed;
    const choose = v => { category.value = v; category.dispatchEvent(new win.Event('change', {bubbles: true})); };
    choose('caching'); assert.equal(words.value, needWording(ref, 'api-pod', 'caching').text); assert.match(words.value, /^Disposable read acceleration for QD-003 \(acknowledge a payment predictably\)\.$/);
    choose('compute'); assert.equal(words.value, '', 'no driver, no default: the person writes the need');
    words.value = 'My own words.'; choose('caching'); assert.equal(words.value, 'My own words.', 'words the person wrote are kept');
    document.querySelector('dialog [data-t-action="close"]').click();
    studio.dispose();
  } finally { Object.assign(globalThis, held); await win.happyDOM.close(); }
  console.log('PASS rc39: a need\'s words derive from the drivers that open a question its category answers (needWording), the template the fallback; a person\'s seeded need says which drivers ask for it while the reference keeps its words; the Needs register offers the wording as an edit the person accepts in the editor, and a new need takes it as its default');
}

// ---------------------------------------------------------------- rc39 (W3 step 4, PLAN §4.3.3): the Validate rule
// "A driver asks a design question no decision answers": one finding per open question per record, to confirm, its
// object the record, its detail the question and the drivers, through the chapter's own findings function; it leaves
// when the question is decided. Every count is the projection's.
{
  const {designQuestions, projectQuestions, DESIGN_QUESTION_RULE} = await import('./public/design-questions.js');
  const {withFinalReview} = await import('./public/review-domain.js');
  const {seedProject: seedForRule} = await import('./public/requirements-domain.js');
  const ref = withFinalReview(seedForRule());
  const fs = technologyFindings(ref).filter(f => f.code === 'design-question');
  assert.equal(fs.length, projectQuestions(ref).byChapter[6].open, 'one finding per open question on Chapter 6: ' + fs.length);
  for (const f of fs) assert.ok(f.level === 'warning' && f.title === DESIGN_QUESTION_RULE && designQuestions(ref, f.objectId)?.questions.some(q => q.id === f.questionId && q.state === 'open'), JSON.stringify(f));
  assert.equal(technologyFindings(ref).filter(f => f.level === 'error').length, technologyFindings(ref).filter(f => f.level === 'error' && f.code !== 'design-question').length, 'the rule never adds to what is to fix');
  console.log('PASS rc39: Chapter 6 checks carry "A driver asks a design question no decision answers" per capability, to confirm, counted from the design-questions projection (' + fs.length + ' on the reference, whose capabilities answer their questions through their needs)');
}
