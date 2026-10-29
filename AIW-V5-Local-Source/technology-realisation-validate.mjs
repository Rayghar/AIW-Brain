import assert from 'node:assert/strict';
import {driverLinksOf} from './public/driver-links.js';
import {seedProject} from './public/requirements-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import {capability,supports,applyTechnologyCommand} from './public/technology-domain.js';
import {withTechnologyRealisation,inputSnapshot,realizations,realization,realizationMappings,realizationSources,realizationCriteria,realizationOption,selectionPreparation,optionSpecification,realizationSourceChanged,selectionCurrent,approvalCurrent,realizationIntakeCurrent,realizationReviewCurrent,realizationHandoffCurrent,technologyRealisationFindings,technologyRealisationMilestones,technologyRealisationProposal,applyTechnologyRealisationCommand,exportTechnologyRealisationMarkdown} from './public/technology-realisation-domain.js';
import {componentSpecDocument} from './public/component-spec-document.js';
import {fieldOf,recordField} from './public/record-fields.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';

const cmd=(p,type,payload={})=>applyTechnologyRealisationCommand(p,{type:'techrealisation.'+type,payload}).document;
const base=withTechnologyRealisation(seedProject()),original=JSON.stringify(base);
assert.equal(realizations(base).length,9);
assert.equal(base.technologyRealisation.mappings.length,9);
assert.equal(new Set(realizations(base).flatMap(r=>r.options.map(o=>o.id))).size,18);
assert(realizations(base).every(r=>!r.selectedOptionId&&!r.recorded&&!r.approval));
assert(!technologyRealisationMilestones(base).find(m=>m.id==='evidence').done,'Empty comparisons are not completed evidence');
assert.deepEqual(withTechnologyRealisation(base),base,'Reopening preserves every stable reference');
assert(Buffer.byteLength(original)<400000,'Shared source references must remain compact');
const src=realizationSources(base,'tr-002');
assert(src.capabilities.some(c=>c.ref==='TC-002'));
assert(src.applications.some(a=>a.ref==='APP-004'));
assert(src.requirements.some(q=>q.id==='REQ-004'));
assert(src.drivers.some(q=>q.id==='QD-004'));
assert(src.decisions.some(q=>q.id==='ADR-003'));
assert(realizationCriteria(base,'tr-002').some(c=>c.id==='recovery'));
assert(!exportTechnologyRealisationMarkdown(base).includes('undefined'));
{
 let g=cmd(base,'plan',{title:'Selection gate fixture',mappings:[{capabilityId:base.technology.capabilities[0].id,scope:'Synthetic capability'}]});
 const rid=realizations(g).at(-1).id;
 assert.equal(selectionPreparation(realization(g,rid)),'option');
 assert.throws(()=>cmd(g,'record',{id:rid,reviewed:true}),/Choose an option/);
 g=cmd(g,'option',{id:rid,option:{title:'Candidate service'}});
 assert.equal(selectionPreparation(realization(g,rid)),'preference');
 g=cmd(g,'preference',{id:rid,optionId:realization(g,rid).options[0].id});
 assert.equal(selectionPreparation(realization(g,rid)),'definition');
 g=cmd(g,'plan',{id:rid,purpose:'Synthetic implementation',owner:'Test architect'});
 assert.equal(selectionPreparation(realization(g,rid)),'rationale');
 g=cmd(g,'plan',{id:rid,rationale:'  '});
 assert.equal(selectionPreparation(realization(g,rid)),'rationale');
 assert.throws(()=>cmd(g,'record',{id:rid,reviewed:true}),/rationale/);
 g=cmd(g,'plan',{id:rid,rationale:'Selected for a test of an explicitly considered trade-off.'});
 assert.equal(selectionPreparation(realization(g,rid)),'ready');
 g=cmd(g,'record',{id:rid,reviewed:true});
 assert(selectionCurrent(g,realization(g,rid)));
 console.log('PASS selection prerequisites: option, preference, purpose and owner, nonblank rationale, then current record');
}
let p=cmd(base,'intake');assert(realizationIntakeCurrent(p));
const id='tr-002',plan={...realization(p,id),mappings:realizationMappings(p,id),title:'Payment state service',owner:'Data platform team',rationale:'Test fixture: explicit transaction and recovery ownership.',risks:'Test fixture: shared dependency requires a rehearsed restore.',operationsPlan:'Named service owner, support rota, maintenance window.',accessPlan:'Separate writer and enquiry identities.',dataPlan:'Preserve payment references and verified authoritative records.',resiliencePlan:'Reconcile uncertain outcomes after verified restoration.',interfacePlan:'Versioned command and enquiry contracts.',lifecyclePlan:'Owned patching and tested data exit.',capacityValue:'250',capacityUnit:'test transactions/s',capacityBasis:'Synthetic workload assumption; not a measured target.',annualCost:'12000',currency:'USD',costBasis:'Synthetic cost fixture; no supplier quote.',estimatesConfirmed:false};
p=cmd(p,'plan',plan);assert.equal(realization(p,id).ref,'TR-002');assert.equal(realizationMappings(p,id)[0].id,'RM-002');
assert(technologyRealisationFindings(p).some(f=>f.objectId===id&&f.code==='estimate'));
assert.throws(()=>cmd(p,'plan',{...plan,mappings:[]}),/at least/);
assert.throws(()=>cmd(p,'plan',{...plan,mappings:[plan.mappings[0],plan.mappings[0]]}),/once/);
// Round 11: the capacity names the Chapter 2 driver it serves; an unknown driver is refused, and the link reads the figure against the target in the same unit.
assert.throws(()=>cmd(p,'plan',{...plan,id,driverId:'QD-999'}),/existing quality driver/);
{const linked=cmd(p,'plan',{...plan,id,capacityValue:'2',capacityUnit:'seconds',driverId:'QD-003'});assert.equal(realization(linked,id).driverId,'QD-003');assert.equal(driverLinksOf(linked,id)[0].state,'holds');const more=cmd(linked,'plan',{...plan,id,capacityValue:'5',capacityUnit:'seconds',driverId:'QD-003'});assert.equal(driverLinksOf(more,id)[0].state,'breaks');const other=cmd(linked,'plan',{...plan,id,capacityValue:'5',capacityUnit:'nodes',driverId:'QD-003'});assert.equal(driverLinksOf(other,id)[0].state,'unknown');
 console.log('PASS a realization\'s capacity names the Chapter 2 driver it serves (round 11): an unknown driver is refused; the link reads the figure against the target in the same unit and compares nothing across units');}
assert.throws(()=>cmd(p,'plan',{...plan,annualCost:'-1'}),/non-negative/);
assert.throws(()=>cmd(p,'plan',{...plan,capacityValue:'unlimited'}),/non-negative/);
const option={...realization(p,id).options[0],product:'Test-owned relational service',version:'17-test',serviceTier:'Self managed test profile',vendor:'Test data platform',operatingModel:'Self managed',topology:'Synthetic primary and standby topology; no running deployment.',replicaCount:'2',failureDomains:'Two proposed test zones; independence unverified.',workloadProfile:'Synthetic 250 test transactions/s peak, not a measured capacity.',specEvidence:'Synthetic architecture verification plan, not a supplier guarantee.',benefits:'Explicit operational and transaction boundary.',drawbacks:'Recovery still depends on an owned, tested procedure.',evidence:'Synthetic design verification fixture, not product certification.'};
p=cmd(p,'option',{id,option});assert.equal(realization(p,id).options[0].id,'TO-003');
assert.equal(optionSpecification(realization(p,id).options[0]).replicaCount,2);
for(const name of ['serviceTier','topology','replicaCount','failureDomains','workloadProfile','specEvidence'])assert(fieldOf('techrealisation.option',name),name+' has an editor descriptor');
assert.match(recordField('techrealisation.option','replicaCount','2'),/name="replicaCount"[^>]*min="1"[^>]*max="1000"[^>]*step="1"/);
assert.throws(()=>cmd(p,'option',{id,option:{id:option.id,replicaCount:'0'}}),/whole number/);
assert.throws(()=>cmd(p,'option',{id,option:{id:option.id,replicaCount:'1.5'}}),/whole number/);
assert.throws(()=>cmd(p,'option',{id,option:{id:option.id,replicaCount:'1001'}}),/whole number/);
const legacy=cmd(base,'preference',{id,optionId:base.technologyRealisation.records.find(r=>r.id===id).options[0].id});
assert(technologyRealisationFindings(legacy).some(f=>f.objectId===id&&f.code==='specification'),'Old options remain readable and expose their configuration gaps.');
assert.throws(()=>cmd(p,'option',{id,option:{...option,sourceUrl:'javascript:alert(1)'}}),/http/);
assert.throws(()=>cmd(p,'preference',{id,optionId:'missing'}),/existing/);
p=cmd(p,'preference',{id,optionId:option.id});
assert.equal(realizationOption(realization(p,id)).id,option.id);assert(!selectionCurrent(p,realization(p,id)));
assert(!technologyRealisationFindings(p).some(f=>f.objectId===id&&f.code==='specification'));
const specification=componentSpecDocument(p,'api-pod');
assert(specification.markdown.includes('service tier Self managed test profile')&&specification.markdown.includes('planned instances 2')&&specification.markdown.includes('not independent verification'));
assert(specification.json.products.some(x=>x.configuration?.replicaCount===2&&x.configuration.workloadProfile===option.workloadProfile));
assert.equal(logicalGraph(p).nodes.find(n=>n.id===id).title,option.product,'Preference visibly changes the shared projection without replacing its identity');
assert.throws(()=>cmd(p,'record',{id}),/Review/);
assert.throws(()=>cmd(p,'approval',{id,confirmed:true}),/Record/);
for(const c of realizationCriteria(p,id))p=cmd(p,'assessment',{id,optionId:option.id,criterionId:c.id,effect:c.id==='cost'?'tension':'supports',reason:'Explicit synthetic comparison rationale for '+c.title,evidence:'Synthetic verification reference '+c.id});
assert(!technologyRealisationFindings(p).some(f=>f.objectId===id&&f.code==='criterion'));
assert.throws(()=>cmd(p,'assessment',{id,optionId:option.id,criterionId:'invented',effect:'supports'}),/current/);
p=cmd(p,'record',{id,reviewed:true});assert(selectionCurrent(p,realization(p,id)));assert(!approvalCurrent(p,realization(p,id)));
assert.throws(()=>cmd(p,'approval',{id,reviewer:'Test reviewer',authority:'Test authority',evidence:'Synthetic fixture'}),/explicit/);
p=cmd(p,'approval',{id,reviewer:'Test reviewer',authority:'Test authority',evidence:'Synthetic approval fixture only',confirmed:true});assert(approvalCurrent(p,realization(p,id)));
const recorded=p;
const changedConfig=cmd(recorded,'option',{id,option:{id:option.id,replicaCount:'3'}});
assert(!selectionCurrent(changedConfig,realization(changedConfig,id))&&!approvalCurrent(changedConfig,realization(changedConfig,id)),'Changing an option assumption invalidates selection and approval.');
p=cmd(p,'assessment',{id,optionId:option.id,criterionId:'cost',effect:'unknown',reason:'Quote now needs review.',evidence:''});
assert(!selectionCurrent(p,realization(p,id)));assert(!approvalCurrent(p,realization(p,id)));assert(realization(p,id).history.some(h=>h.action.startsWith('Record selection')));
const connection={title:'Posting commands',from:id,to:'tr-001',protocol:'HTTPS design obligation',contract:'Versioned posting request and result reference.',security:'Named workload identities; least privilege.',failure:'Enquire using the original reference before retry.',data:'Payment identifier and posting status.',owner:'Payments architecture'};
p=cmd(recorded,'connection',connection);assert.equal(p.technologyRealisation.connections[0].id,'TI-001');assert(!selectionCurrent(p,realization(p,id)),'New interface obligations invalidate endpoint selections');
p=cmd(p,'connection',{...connection,id:'TI-001',title:'Controlled posting commands'});assert.equal(p.technologyRealisation.connections.length,1);
assert.throws(()=>cmd(p,'connection',{...connection,to:id}),/different/);
assert.throws(()=>cmd(p,'connection',{...connection,title:'Controlled posting commands'}),/already/);
p=cmd(p,'record',{id,reviewed:true});p=cmd(p,'remove-connection',{id:'TI-001'});assert(!selectionCurrent(p,realization(p,id)));
p=cmd(p,'connection',connection);assert.equal(p.technologyRealisation.connections[0].id,'TI-002','Removed stable IDs are never reused');
const previewBefore=JSON.stringify(p),q=technologyRealisationProposal(p,'operate','tr-001');assert(q);assert.equal(JSON.stringify(p),previewBefore);
assert.throws(()=>cmd(p,'proposal',{...q}),/Review/);
p=cmd(p,'proposal',{...q,record:{...q.record,operationsPlan:'Edited proposal: platform team owns monitoring and escalation.'},reviewed:true});
assert.equal(realization(p,'tr-001').operationsPlan,'Edited proposal: platform team owns monitoring and escalation.');
const caps=structuredClone(p);caps.technology.capabilities.push({...capability(caps,'tc-001'),id:'tc-010',ref:'TC-010',title:'Enquiry execution'});caps.technology.counters.capability=10;
assert(technologyRealisationFindings(caps).some(f=>f.code==='unrealized'&&f.objectId==='tc-010'));
const missing=technologyRealisationProposal(caps,'missing',id);p=cmd(caps,'proposal',{...missing,reviewed:true});
assert.equal(realizations(p).at(-1).ref,'TR-010');assert.equal(realizationMappings(p,'tr-010')[0].id,'RM-010');
assert.equal(realizations(p).at(-1).origin,'suggestion');
const sourceChanged=withTechnologyRealisation(applyTechnologyCommand(recorded,{type:'technology.capability',payload:{...capability(recorded,'postgres'),purpose:'Revised authoritative state boundary',mappings:supports(recorded,'postgres')}}).document);
// A trust boundary's policy is read by the realizations whose capabilities cross it (round 12, A3: GR-STO-08: readings
// record by record, where a realization read the versions of whole chapters): a change to it requires their review again,
// and a change at a boundary they do not cross leaves it current.
const crossed=capability(recorded,'postgres').boundaryId,boundaryChanged=structuredClone(recorded);boundaryChanged.technology.version++;boundaryChanged.technology.boundaries.find(b=>b.id===crossed).policy='Revised crossing obligation';assert(!selectionCurrent(boundaryChanged,realization(boundaryChanged,id)),'Technology policy changes require a new realization review');
const elsewhere=structuredClone(recorded);elsewhere.technology.version++;elsewhere.technology.boundaries.find(b=>b.id!==crossed).policy='Revised crossing obligation elsewhere';assert(selectionCurrent(elsewhere,realization(elsewhere,id)),'a policy change at a boundary the realization does not cross leaves its review current');
assert(realizationSourceChanged(sourceChanged,realization(sourceChanged,id)));assert(!selectionCurrent(sourceChanged,realization(sourceChanged,id)));assert(!approvalCurrent(sourceChanged,realization(sourceChanged,id)));assert(!realizationIntakeCurrent(sourceChanged));
for(const key of ['artefacts','quality','decisions','logical','realisation'])assert.deepEqual(p[key],base[key],'Chapter 7 leaves upstream '+key+' intact');
assert.deepEqual(recorded.technology,base.technology,'Selecting a technology does not rewrite logical capabilities');
assert.equal(JSON.stringify(base),original,'Commands and proposals do not mutate caller state');

// Readiness can reach completion with explicitly carried review assumptions.
let ready=cmd(base,'intake');
for(const r of realizations(base)){
 ready=cmd(ready,'plan',{...plan,...r,mappings:realizationMappings(ready,r.id),rationale:'Synthetic selection fixture',risks:'Synthetic risk fixture',operationsPlan:plan.operationsPlan,accessPlan:plan.accessPlan,dataPlan:plan.dataPlan,resiliencePlan:plan.resiliencePlan,interfacePlan:plan.interfacePlan,lifecyclePlan:plan.lifecyclePlan});
 ready=cmd(ready,'option',{id:r.id,option:{...option,id:r.options[0].id,title:'Test service for '+r.ref}});
 ready=cmd(ready,'preference',{id:r.id,optionId:r.options[0].id});
 for(const c of realizationCriteria(ready,r.id))ready=cmd(ready,'assessment',{id:r.id,optionId:r.options[0].id,criterionId:c.id,effect:'supports',reason:'Synthetic comparison reason',evidence:'Synthetic verification record'});
 ready=cmd(ready,'record',{id:r.id,reviewed:true});
}
assert.throws(()=>cmd(ready,'handoff',{acknowledge:true}),/checks/);
ready=cmd(ready,'review');assert(realizationReviewCurrent(ready));assert.throws(()=>cmd(ready,'handoff'),/Acknowledge/);
ready=cmd(ready,'handoff',{acknowledge:true});assert(realizationHandoffCurrent(ready));assert(technologyRealisationMilestones(ready).every(m=>m.done));
assert(ready.technologyRealisation.handoff.findings.some(f=>f.code==='approval'),'Working handoff must carry unresolved governance explicitly');
const revised=cmd(ready,'preference',{id,optionId:'TO-004'});assert(!realizationReviewCurrent(revised));assert(!realizationHandoffCurrent(revised));assert(!selectionCurrent(revised,realization(revised,id)));
for(const term of ['TR-002','TO-003','RM-002','TC-002','REQ-004','ADR-003','QD-004','Chapter 8','Annual cost','current external approval','Service tier: Self managed test profile','Planned data or service instances, including primary: 2','Configuration basis: Synthetic architecture verification plan'])assert(exportTechnologyRealisationMarkdown(ready).includes(term),term);

const g=logicalGraph(p);
assert.equal(new Set(g.nodes.map(n=>n.id)).size,g.nodes.length);assert(g.edges.every(e=>g.nodes.some(n=>n.id===e.from)&&g.nodes.some(n=>n.id===e.to)));

const storedFiles=new Map(),FILES={async put(k,v){storedFiles.set(k,v)},async get(k){return storedFiles.has(k)?{text:async()=>storedFiles.get(k)}:null},async delete(k){storedFiles.delete(k)}};
const DB=localDatabase(':memory:'),env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env)};
try{
 assert.equal((await api('/api/project','GET',null,null)).status,401);
 let state=await(await api('/api/project')).json();const body={revision:state.revision,command:{type:'techrealisation.plan',payload:plan}};
 assert.equal((await api('/api/commands','POST',body,'architect-a','https://other.test')).status,403);
 const saved=await api('/api/commands','POST',body);assert.equal(saved.status,200);state=await saved.json();assert.equal((await api('/api/commands','POST',body)).status,409);
 const reopened=await(await api('/api/project')).json();assert.equal(realization(reopened.document,id).title,plan.title);assert.equal(realizationMappings(reopened.document,id)[0].id,'RM-002');
 assert.notEqual(realization((await(await api('/api/project','GET',null,'architect-b')).json()).document,id).title,plan.title);
 for(const format of ['json','md']){const res=await api('/api/export?chapter=7&format='+format);assert.equal(res.status,200);if(format==='json'){const b=await res.json();assert(b.connectedModel.nodes.some(n=>n.ref==='TR-002'));assert(b.technologyRealisationValidation.findings.some(f=>f.code==='choice'));}else{assert(res.headers.get('Content-Disposition').includes('Technology_Realization.md'));assert((await res.text()).includes('TR-002'));}}
 const earlier=await api('/api/commands','POST',{revision:state.revision,command:{type:'technology.intake'}});assert.equal(earlier.status,200);assert.equal(realization((await earlier.json()).document,id).title,plan.title,'Earlier chapters retain Chapter 7 data');
 console.log('PASS Technology realization: stable TR/TO/RM/TI identities; upstream traceability; explicit comparisons and estimates; separate draft, selection, and approval evidence; revision and interface invalidation; editable ghosts; attainable handoff; desktop/mobile graph layouts; private persistence, owner isolation, CAS, and exports.');
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
  const {applyTechnologyRealisationCommand: applyTR, REALIZATION_LIMITS: TRL} = await import('./public/technology-realisation-domain.js');
  assert.deepEqual({...TRL}, {records: 500, connections: 2000});
  bound('realizations', TRL.records, p => p.technologyRealisation.records, (p, n) => ({...structuredClone(p.technologyRealisation.records[0]), id: 'tr-b' + n, ref: 'TR-B' + n, title: 'Bound realization ' + n}), applyTR, p => ({type: 'techrealisation.plan', payload: {title: 'One realization more', mappings: [{capabilityId: p.technology.capabilities[0].id, scope: 'Whole capability'}]}}), /^Error: This workspace keeps up to 500 realizations\.$/);
  bound('realization interfaces', TRL.connections, p => p.technologyRealisation.connections, (p, n) => ({id: 'TI-B' + n, from: 'bound-a' + n, to: 'bound-b' + n, title: 'bound ' + n}), applyTR, p => ({type: 'techrealisation.connection', payload: {from: p.technologyRealisation.records[0].id, to: p.technologyRealisation.records[1].id, title: 'one interface more'}}), /^Error: This workspace keeps up to 2,000 realization interfaces\.$/);
  console.log('PASS realizations are bounded at 500 and realization interfaces at 2,000, each refusing the next with "This workspace keeps up to …"');
}

// ---------------------------------------------------------------- Round 12 (D2): operating model not stated, 12 options
{
  const {withTechnologyRealisation, applyTechnologyRealisationCommand, realization, technologyRealisationFindings, OPTION_LIMIT, OPERATING_MODELS} = await import('./public/technology-realisation-domain.js');
  const {seedProject} = await import('./public/requirements-domain.js');
  const run = (q, type, payload) => applyTechnologyRealisationCommand(q, {type: 'techrealisation.' + type, payload}).document;
  let q = withTechnologyRealisation(seedProject());
  assert.equal(OPTION_LIMIT, 12); assert.deepEqual(OPERATING_MODELS, ['Self managed', 'Provider managed', 'Shared group service']);
  q = run(q, 'option', {id: 'tr-001', option: {title: 'An option nobody runs yet'}});
  assert.equal(realization(q, 'tr-001').options.at(-1).operatingModel, '');
  assert.ok(technologyRealisationFindings(q).some(f => f.code === 'not-stated' && f.items.some(x => x.field === 'operatingModel')));
  assert.throws(() => run(q, 'option', {id: 'tr-001', option: {title: 'x'.repeat(161)}}), /The option name holds up to 160 characters; 161 were sent\./);
  const grounded = run(q, 'plan', {id: 'tr-001', requirementIds: ['REQ-001']});
  assert.deepEqual(realization(grounded, 'tr-001').requirementIds, ['REQ-001']);
  assert.equal(realization(grounded, 'tr-001').options.length, realization(q, 'tr-001').options.length, 'a plan save that leaves the options and mappings out keeps them');
  console.log('PASS round 12: an option\'s operating model may be not stated (one grouped warning), its name is refused past 160 characters, a realization compares up to 12 options and names the requirements it answers');
}

// ---------------------------------------------------------------- Round 12 (D4): requirement fit and targets
// GR-TEC-06: a requirement group a realization names is a criterion of its comparison, and an option records how it
// covers the group: meets, configurable, custom or gap; a gap in the preferred option is a finding.
// GR-TEC-09: a realization records targets of several kinds with the drivers they serve, in the shape of a Chapter 10
// plan's (driver-links.js), and reads "not stated" when it states none; one that kept the capacity slot reads it as a
// capacity target, unchanged until a save states a list.
{
  const {withTechnologyRealisation, applyTechnologyRealisationCommand, realization, realizationCriteria, realizationTargets, technologyRealisationFindings, exportTechnologyRealisationMarkdown, COVERAGE} = await import('./public/technology-realisation-domain.js');
  const {applyRequirementsCommand} = await import('./public/requirement-commands.js');
  const {seedProject} = await import('./public/requirements-domain.js');
  const run = (q, type, payload) => applyTechnologyRealisationCommand(q, {type: 'techrealisation.' + type, payload}).document;
  let q = withTechnologyRealisation(seedProject());
  const reqs = q.artefacts.filter(a => a.type === 'requirement').map(a => a.id);
  q = applyRequirementsCommand(q, {type: 'requirements.group', payload: {title: 'Statement retention', kind: 'theme', memberIds: [reqs[0], reqs[1]]}}, '2026-10-08T09:00:00.000Z', 'tester').document;
  const gid = q.requirementGroups.records.at(-1).id;
  q = run(q, 'plan', {id: 'tr-002', requirementGroupIds: [gid]});
  const fit = realizationCriteria(q, 'tr-002').find(c => c.id === gid);
  assert.ok(fit && fit.kind === 'requirement-group', 'the group is a criterion of the comparison');
  assert.deepEqual(COVERAGE.map(([k]) => k), ['meets', 'configurable', 'custom', 'gap']);
  const [o1, o2] = realization(q, 'tr-002').options;
  for (const [o, coverage] of [[o1, 'configurable'], [o2, 'gap']]) q = run(q, 'assessment', {id: 'tr-002', optionId: o.id, criterionId: gid, coverage, reason: 'Read against the group.', evidence: 'Vendor documentation review'});
  assert.deepEqual(realization(q, 'tr-002').options.slice(0, 2).map(o => o.assessments[gid].coverage), ['configurable', 'gap'], 'each option records its coverage');
  for (const coverage of ['meets', 'custom']) assert.equal(realization(run(q, 'assessment', {id: 'tr-002', optionId: o1.id, criterionId: gid, coverage, reason: 'r', evidence: 'e'}), 'tr-002').options[0].assessments[gid].coverage, coverage);
  assert.throws(() => run(q, 'assessment', {id: 'tr-002', optionId: o1.id, criterionId: gid, coverage: 'mostly', reason: 'r', evidence: 'e'}), /meets, configurable, custom or gap/);
  assert.throws(() => run(q, 'assessment', {id: 'tr-002', optionId: o1.id, criterionId: 'operations', effect: 'meets', reason: 'r', evidence: 'e'}), /comparison effect/, 'the other criteria keep their effects');
  q = run(q, 'preference', {id: 'tr-002', optionId: o2.id});
  assert.ok(technologyRealisationFindings(q).some(f => f.code === 'coverage-gap' && f.criterionId === gid), 'a gap in the preferred option is a finding');
  assert.match(exportTechnologyRealisationMarkdown(q), /Not covered \(gap\)/);
  // Targets: none stated reads "not stated"; several kinds with their drivers; the capacity slot of an earlier record.
  assert.equal(realizationTargets(q, realization(q, 'tr-001')).text, 'Targets: not stated.');
  const [d1, d2, d3] = q.quality.drivers.map(d => d.id);
  q = run(q, 'plan', {id: 'tr-001', capacityValue: '400', capacityUnit: 'requests per second', targets: [{kind: 'availability', driverId: d1, operator: 'At least', value: '99.9', window: 'per month'}, {kind: 'latency', driverId: d2, operator: 'At most', value: '2', unit: 'seconds'}, {kind: 'capacity', driverId: d3, operator: 'At least'}]});
  const t = realizationTargets(q, realization(q, 'tr-001'));
  assert.deepEqual(t.targets.map(x => [x.kind, x.driverId]), [['availability', d1], ['latency', d2], ['capacity', d3]], 'targets of several kinds, each with its driver');
  assert.match(t.text, /Availability: at least 99\.9 % over per month; serves/); assert.match(t.text, /Capacity: at least 400 requests per second; serves/, 'a capacity target with no value reads the capacity');
  assert.equal(driverLinksOf(q, 'tr-001').filter(l => l.field === 'targets').length, 3, 'each target is read against its driver');
  assert.throws(() => run(q, 'plan', {id: 'tr-001', targets: [{kind: 'speed'}]}), /what each target measures/);
  assert.throws(() => run(q, 'plan', {id: 'tr-001', targets: [{kind: 'latency', driverId: 'QD-999'}]}), /existing quality drivers/);
  assert.equal(realization(run(q, 'plan', {id: 'tr-001', title: realization(q, 'tr-001').title}), 'tr-001').targets.length, 3, 'a save that leaves them out keeps them');
  assert.equal(realizationTargets(q, realization(run(q, 'plan', {id: 'tr-001', targets: null}), 'tr-001')).text, 'Targets: not stated.', 'null clears them');
  // An earlier record's capacity slot reads as a capacity target; a save that states the same list changes nothing.
  const slotted = run(q, 'plan', {id: 'tr-003', capacityValue: '3', capacityUnit: 'seconds', driverId: d2}), r3 = realization(slotted, 'tr-003');
  assert.deepEqual(realizationTargets(slotted, r3).targets.map(x => [x.kind, x.driverId]), [['capacity', d2]]);
  const same = realization(run(slotted, 'plan', {id: 'tr-003', targets: [{kind: 'capacity', driverId: d2}]}), 'tr-003');
  assert.deepEqual([same.revision, same.targets, same.driverId], [r3.revision, undefined, d2], 'the same list as the slot keeps the record as it is');
  const listed = realization(run(slotted, 'plan', {id: 'tr-003', targets: [{kind: 'capacity', driverId: d2}, {kind: 'latency', driverId: d1, operator: 'At most', value: '1', unit: 'seconds'}]}), 'tr-003');
  assert.deepEqual([listed.targets.length, listed.driverId], [2, ''], 'a list that says more replaces the slot');
  // One component's change marks only the realizations that read it (round 12, A3: GR-STO-08): a realization reads the
  // records behind its capabilities one by one (technology-realisation-domain.js inputSnapshot), where it read the versions
  // of five whole chapters and every realization was marked by any change in them.
  {
    const {applyRealisationCommand} = await import('./public/realisation-domain.js'), {withReadingsDefinition} = await import('./public/source-fingerprint.js');
    const before = withTechnologyRealisation(seedProject()), c = before.realisation.components.find(x => x.id === 'risk-engine');
    const readers = realizations(before).filter(r => realizationSources(before, r.id).applications.some(a => a.id === c.id)).map(r => r.id);
    assert(readers.length > 0 && readers.length < realizations(before).length, 'some realizations read the component and some do not');
    assert(realizations(before).every(r => !realizationSourceChanged(before, r)));
    const after = withTechnologyRealisation(applyRealisationCommand(before, {type: 'realisation.component', payload: {...c, purpose: c.purpose + ' Revised for the reading check.'}}).document);
    assert.deepEqual(realizations(after).filter(r => realizationSourceChanged(after, r)).map(r => r.id), readers, 'one component\'s change marks only the realizations that read it');
    // Under the definition before (whole-chapter versions), the same change marked every realization.
    const old = withReadingsDefinition(2, () => { const b = structuredClone(before); for (const r of realizations(b)) r.sourceSnapshot = inputSnapshot(b, r); const a = structuredClone(b); const x = a.realisation.components.find(y => y.id === c.id); x.purpose += ' Revised.'; x.revision++; a.realisation.version++; return realizations(a).filter(r => realizationSourceChanged(a, r)).length; });
    assert.equal(old, realizations(before).length, 'before, every realization was marked');
    console.log(`PASS round 12 (GR-STO-08): one component's change marks only the ${readers.length} of ${realizations(before).length} realizations that read it (before: all ${old})`);
  }
  console.log('PASS round 12: a requirement group is a comparison criterion and each option records its coverage (meets, configurable, custom or gap), a gap in the preferred option is a finding; a realization states targets of several kinds with their drivers in the plan shape, reads "not stated" without any, and an earlier capacity slot reads as a capacity target');
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
    const dq = designQuestions(ref, 'tr-002'), c = card(ref, 7, 'tr-002');
    const basis = c.querySelector('.record-card > details:first-of-type');
    assert.equal(basis.dataset.cardSection, 'design-basis', 'the design basis is the first disclosure on a realization');
    assert.deepEqual([...basis.querySelectorAll('.design-q')].map(li => li.dataset.designQuestion + ':' + li.dataset.designState), dq.questions.map(q => q.id + ':' + q.state));
    const row = basis.querySelector('.design-q[data-design-question="persistence"]');
    assert.ok(row, 'the realization of the transactional capability faces the persistence question');
    const action = row.querySelector('button[data-action="design-decide"]');
    assert.ok(action && action.dataset.topic === 'persistence' && action.dataset.record === 'tr-002' && action.dataset.question === 'persistence');
    assert.ok([...row.querySelectorAll('.design-answers li')].some(li => /^TR-002 → .+, Chapter 7 · (draft|decided)$/.test(li.textContent)), 'its own selection is an answer with Chapter 7: ' + [...row.querySelectorAll('.design-answers li')].map(li => li.textContent).join(' | '));
    assert.equal(basis.querySelector('summary').textContent, 'Design basis · ' + ['open', 'draft', 'decided'].filter(k => dq.counts[k]).map(k => dq.counts[k] + ' ' + k).join(' · '));
    console.log('PASS rc39: the Chapter 7 realization card opens on its Design basis (the persistence question with its Chapter 7 selection as an answer and Decide → Co-design on the persistence topic), from the design-questions projection');
  } finally { await w.happyDOM.close(); }
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
  const fs = technologyRealisationFindings(ref).filter(f => f.code === 'design-question');
  assert.equal(fs.length, projectQuestions(ref).byChapter[7].open, 'one finding per open question on Chapter 7: ' + fs.length);
  for (const f of fs) assert.ok(f.level === 'warning' && f.title === DESIGN_QUESTION_RULE && designQuestions(ref, f.objectId)?.questions.some(q => q.id === f.questionId && q.state === 'open'), JSON.stringify(f));
  console.log('PASS rc39: Chapter 7 checks carry "A driver asks a design question no decision answers" per realization, to confirm, counted from the design-questions projection (' + fs.length + ' on the reference, whose realizations answer their questions through their capabilities and selections)');
}
