import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withInterfaces,applyInterfacesCommand} from './public/interfaces-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import {withSecurity,controls,control,threats,threat,securityTargets,securitySources,targetBoundaries,relatedControls,securityIntakeCurrent,securityReviewCurrent,securityHandoffCurrent,securitySourceChanged,controlStamp,threatStamp,securityGovernanceStamp,evidenceCurrent,latestEvidence,assuranceLabel,riskCurrent,latestRisk,latestGovernance,governanceCurrent,securitySimulationCurrent,securityFindings,securityMilestones,securityProposal,simulateSecurity,applySecurityCommand,exportSecurityMarkdown,resilienceDrafts} from './public/security-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
const cmd=(p,type,payload={})=>applySecurityCommand(p,{type:'security.'+type,payload}).document;
const base=withSecurity(seedProject()),original=JSON.stringify(base),upstream=withInterfaces(seedProject());
assert.equal(threats(base).length,4);assert.equal(controls(base).length,3);assert.equal(control(base,'oauth').ref,'SEC-001');assert.equal(control(base,'audit').ref,'SEC-002');assert.equal(control(base,'mtls').ref,'SEC-003');
assert.deepEqual(withSecurity(base),base,'Reopening retains stable identities and records');
for(const key of ['artefacts','quality','decisions','logical','realisation','technology','technologyRealisation','interfaces'])assert.deepEqual(base[key],upstream[key]);
assert(Buffer.byteLength(original)<400000,'Security references remain compact');
assert.equal(securityMilestones(base).filter(m=>m.done).length,0,'Illustrative content does not silently complete confirmed milestones');
assert.equal(new Set(securityTargets(base).map(t=>t.id)).size,securityTargets(base).length);
assert(securitySources(base,threat(base,'thr-002')).requirements.some(r=>r.id==='REQ-003'));
assert(securitySources(base,threat(base,'thr-004')).drivers.some(r=>r.id==='QD-004'));
assert(targetBoundaries(base,'rest').some(b=>b.id===base.technology.applicationBoundaries['api-pod']),'Contracts expose their existing application trust assignment');assert(targetBoundaries(base,'gateway').some(b=>b.id==='tb-001'));
assert(securityFindings(base).some(f=>f.code==='uncovered'));assert(securityFindings(base).some(f=>f.code==='unassessed'));
// Resilience beside security (round 6, Contract K): each contract to a party outside the design is to confirm for its disruption until a Recovery & availability control names it or its own policies are recorded; the drafter has a threat and a control for each, and for each zone (resilience-validate.mjs has the rest).
assert.deepEqual(securityFindings(base).filter(f=>f.code==='RESILIENCE-MISSING').map(f=>[f.objectId,f.level]),[['rest','warning'],['posting-api','warning'],['network','warning']]);assert.equal(resilienceDrafts(base).length,3,'one pair per external contract; the zones join once Chapter 10 is designed (resilience-validate.mjs)');assert(resilienceDrafts(base).every(d=>d.threat.category==='Service disruption'&&d.control.category==='Recovery & availability'));
let p=cmd(base,'intake');assert(securityIntakeCurrent(p));
const originalThreat=threat(p,'thr-001'),threatPlan={...originalThreat,title:'Instruction authority test fixture',owner:'Risk owner fixture',priority:'Critical',priorityBasis:'Synthetic scenario: material unauthorised financial effect at an exposed entry point.',assumptionsResolved:true};
p=cmd(p,'threat',threatPlan);assert.equal(threat(p,'thr-001').ref,'THR-001');assert.equal(threat(p,'thr-001').revision,2);
assert.throws(()=>cmd(p,'threat',{...threatPlan,targetIds:['missing']}),/existing/);
assert.throws(()=>cmd(p,'threat',{...threatPlan,targetIds:[]}),/at least one/);
assert.throws(()=>cmd(p,'threat',{...threatPlan,priority:'automatic'}),/category and priority/);
const proposal=securityProposal(p,'authority','thr-001');assert(proposal);assert.equal(controls(p).length,3);assert.throws(()=>cmd(p,'proposal',{...proposal,record:proposal.record}),/Review/);
const controlPlan={...control(p,'oauth'),...proposal.record,id:'oauth',owner:'Security control owner fixture',assumptionsResolved:true,enforcement:'Synthetic entry authority check fixture'};
p=cmd(p,'control',controlPlan);assert.equal(control(p,'oauth').ref,'SEC-001');assert.equal(logicalGraph(p).nodes.find(n=>n.id==='oauth').title,controlPlan.title);
assert.throws(()=>cmd(p,'control',{...controlPlan,targetIds:[]}),/at least one/);
assert.throws(()=>cmd(p,'control',{...controlPlan,threatIds:['missing']}),/existing/);
assert.throws(()=>cmd(p,'control',{...controlPlan,category:'unrecognised'}),/category/);
const misScoped=cmd(p,'control',{...controlPlan,targetIds:['network']});assert(securityFindings(misScoped).some(f=>f.code==='control-scope'&&f.objectId==='oauth'));
const evidence=(project,id,kind='design',result='pass')=>({id,kind,result,stamp:controlStamp(project,control(project,id)),reviewer:'Evidence reviewer fixture',reference:'Synthetic report fixture; no real banking test performed.',observations:'Reviewed defined scope and expected outcomes for the synthetic fixture.',reviewed:true});
assert.throws(()=>cmd(p,'evidence',{...evidence(p,'oauth'),reviewed:false}),/explicit/);
assert.throws(()=>cmd(p,'evidence',{...evidence(p,'oauth'),stamp:'old'}),/changed/);
p=cmd(p,'evidence',evidence(p,'oauth'));assert.equal(p.security.evidence.at(-1).id,'EV-001');assert.equal(assuranceLabel(p,control(p,'oauth')),'Design review recorded');assert(!latestEvidence(p,'oauth','verification'));
p=cmd(p,'evidence',evidence(p,'oauth','implementation','partial'));assert.equal(assuranceLabel(p,control(p,'oauth')),'Implementation evidence recorded');
p=cmd(p,'evidence',evidence(p,'oauth','verification'));assert.equal(assuranceLabel(p,control(p,'oauth')),'Test pass recorded');assert(evidenceCurrent(p,p.security.evidence[0]));
const risk=(project,id,treatment='mitigate')=>({id,stamp:threatStamp(project,threat(project,id)),treatment,owner:'Accountable fixture risk owner',residual:'The fixture does not prove runtime enforcement or operational detection.',nextReview:'2099-12-31',reviewer:'Architect fixture',reference:'Synthetic architecture review record.',observations:'Continue the owned verification plan and review remaining exposure.',reviewed:true});
assert.throws(()=>cmd(p,'risk',{...risk(p,'thr-001'),nextReview:'2099-02-30'}),/valid/);
assert.throws(()=>cmd(p,'risk',{...risk(p,'thr-001'),stamp:'old'}),/changed/);
assert.throws(()=>cmd(p,'risk',{...risk(p,'thr-001'),reviewed:false}),/explicit/);
p=cmd(p,'risk',risk(p,'thr-001','accept'));const accepted=p.security.risks.at(-1);assert.equal(accepted.id,'RR-001');assert(riskCurrent(p,accepted));assert(securityFindings(p).some(f=>f.code==='risk-approval'&&f.objectId==='thr-001'));
const governance=(project,id,decision='approved')=>({id,stamp:securityGovernanceStamp(project,threat(project,id)),decision,reviewer:'Independent governance fixture',reference:'Synthetic external approval record fixture.',observations:'Recorded approval scope for the synthetic test only.',reviewed:true});
p=cmd(p,'governance',governance(p,'thr-001'));const approved=p.security.governance.at(-1);assert(governanceCurrent(p,approved));assert.equal(latestGovernance(p,'thr-001').decision,'approved');
const beforeFailure=p;p=cmd(p,'evidence',evidence(p,'oauth','verification','fail'));const failed=p.security.evidence.at(-1);assert.equal(assuranceLabel(p,control(p,'oauth')),'Test failure recorded');assert(!riskCurrent(p,accepted));assert(!governanceCurrent(p,approved));assert(!latestRisk(p,'thr-001'));assert(securityFindings(p).some(f=>f.code==='evidence-result-verification'&&f.level==='error'));
assert.throws(()=>cmd(p,'withdraw-evidence',{evidenceId:failed.id,reason:'',reviewed:true}),/Explain/);
p=cmd(p,'withdraw-evidence',{evidenceId:failed.id,reason:'Fixture evidence superseded; retained in history.',reviewed:true});assert(p.security.evidence.at(-1).withdrawn);assert(!riskCurrent(p,accepted),'Withdrawing newer evidence must not resurrect an old risk acceptance');assert(!governanceCurrent(p,approved));
p=cmd(p,'risk',risk(p,'thr-001'));assert.equal(latestRisk(p,'thr-001').id,'RR-002');assert.throws(()=>cmd(p,'governance',governance(beforeFailure,'thr-001')),/changed/);
const cChanged=cmd(p,'control',{...control(p,'oauth'),mechanism:'Revised control mechanism fixture'});assert(!latestEvidence(cChanged,'oauth','verification'));assert(!latestRisk(cChanged,'thr-001'));assert(!evidenceCurrent(cChanged,cChanged.security.evidence[0]));
const threatChanged=cmd(p,'threat',{...threat(p,'thr-001'),scenario:'Revised threat actor scenario'});assert(!latestEvidence(threatChanged,'oauth','design'),'Linked threat changes invalidate control evidence scope');
const field=p.interfaces.data.find(d=>d.id==='instruction').fields[0],upstreamChanged=withSecurity(applyInterfacesCommand(p,{type:'interfaces.field',payload:{id:'instruction',field:{...field,description:'Revised source data definition'}}}).document);assert(securitySourceChanged(upstreamChanged,control(upstreamChanged,'oauth')));assert(!securityIntakeCurrent(upstreamChanged));assert(!latestEvidence(upstreamChanged,'oauth','verification'));assert(!latestRisk(upstreamChanged,'thr-001'));
const beforeGhost=JSON.stringify(p),ghost=securityProposal(p,'replay','thr-002');assert.equal(JSON.stringify(p),beforeGhost);p=cmd(p,'proposal',{key:ghost.key,objectId:ghost.objectId,record:{...ghost.record,title:'Edited replay protection fixture',owner:'Payments integrity owner fixture'},reviewed:true});assert.equal(controls(p).at(-1).ref,'SEC-004');assert.equal(controls(p).at(-1).title,'Edited replay protection fixture');assert(!latestEvidence(p,controls(p).at(-1).id,'design'),'Accepted ghost is only a control design');
for(const mode of ['planned','unavailable']){const result=simulateSecurity(p,'thr-002',mode);assert.equal(result.steps.length,4);assert(result.controlIds.includes('sec-004'));assert(result.expected);}
const sim={id:'thr-002',mode:'unavailable',stamp:threatStamp(p,threat(p,'thr-002')),observations:'Synthetic degraded-control design reviewed; implementation tests still open.',reviewed:true,visited:[0,1,2,3]};assert.throws(()=>cmd(p,'simulation',{...sim,visited:[0,3]}),/four/);assert.throws(()=>cmd(p,'simulation',{...sim,stamp:'old'}),/changed/);p=cmd(p,'simulation',sim);assert.equal(p.security.simulations.at(-1).id,'SS-001');assert(securitySimulationCurrent(p,p.security.simulations.at(-1)));assert(!p.security.evidence.some(e=>e.controlId==='sec-004'),'Simulation cannot become verification evidence');
p=cmd(p,'threat',{...threatPlan,id:null,title:'Additional stable scenario fixture'});assert.equal(threats(p).at(-1).ref,'THR-005');
for(const key of ['artefacts','quality','decisions','logical','realisation','technology','technologyRealisation','interfaces'])assert.deepEqual(p[key],base[key]);assert.equal(JSON.stringify(base),original,'Commands and proposals do not mutate the caller state');

// Full design completion remains attainable without claiming runtime certification.
let ready=cmd(base,'intake');
for(const t of [...threats(ready)])ready=cmd(ready,'threat',{...t,assumptionsResolved:true,targetIds:t.id==='thr-001'?[...t.targetIds,...ready.interfaces.contracts.map(c=>c.id),...ready.interfaces.data.map(d=>d.id)]:t.targetIds});
for(const c of [...controls(ready)]){const t=threat(ready,c.threatIds[0]||'thr-001');ready=cmd(ready,'control',{...controlPlan,...c,mechanism:'Synthetic controlled enforcement fixture.',verificationPlan:'Synthetic permit, deny, and unavailable-path expected outcomes.',telemetry:'Synthetic owned event and alert fixture.',operatingObligations:'Synthetic runtime ownership and evidence review fixture.',failureMode:'Deny or contain',failureResponse:'Synthetic contained failure with an accountable next action.',targetIds:[...t.targetIds],threatIds:[t.id],assumptionsResolved:true});}
for(const id of ['thr-002','thr-003']){const q=securityProposal(ready,id==='thr-002'?'replay':'minimise',id);ready=cmd(ready,'proposal',{...q,record:{...q.record,owner:'Synthetic control owner',assumptionsResolved:true},reviewed:true});}
for(const c of controls(ready))ready=cmd(ready,'evidence',evidence(ready,c.id));
for(const t of threats(ready)){ready=cmd(ready,'risk',risk(ready,t.id));ready=cmd(ready,'simulation',{...sim,id:t.id,stamp:threatStamp(ready,threat(ready,t.id))});}
assert.throws(()=>cmd(ready,'handoff',{acknowledge:true}),/checks/);ready=cmd(ready,'review');assert(securityReviewCurrent(ready));assert.throws(()=>cmd(ready,'handoff'),/Acknowledge/);ready=cmd(ready,'handoff',{acknowledge:true});assert(securityHandoffCurrent(ready));assert(securityMilestones(ready).every(m=>m.done),JSON.stringify(securityMilestones(ready).filter(m=>!m.done)));assert(ready.security.handoff.findings.some(f=>f.code==='evidence-verification'),'Open runtime evidence gaps travel with a completed design handoff');
const nextEvidence=cmd(ready,'evidence',evidence(ready,'oauth','verification'));assert(!securityReviewCurrent(nextEvidence));assert(!securityHandoffCurrent(nextEvidence));
for(const term of ['SEC-001','THR-001','EV-001','RR-001','SS-001','REQ-003','QD-004','Deployment / runtime handoff'/* sentence-case chapter name, round 2 U2-26 */])assert(exportSecurityMarkdown(ready).includes(term),term);assert(!exportSecurityMarkdown(ready).includes('undefined'));
const g=logicalGraph(p),ids=new Set(g.nodes.map(n=>n.id));assert.equal(ids.size,g.nodes.length);assert(g.edges.every(e=>ids.has(e.from)&&ids.has(e.to)));assert(g.edges.some(e=>e.securityKind==='exposure'));assert(g.edges.some(e=>e.securityKind==='mitigation'));


const DB=localDatabase(':memory:'),env={DB,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env)};
try{
 assert.equal((await api('/api/project','GET',null,null)).status,401);let state=await(await api('/api/project')).json();
 const body={revision:state.revision,command:{type:'security.control',payload:controlPlan}};assert.equal((await api('/api/commands','POST',body,'architect-a','https://other.test')).status,403);
 let res=await api('/api/commands','POST',body);assert.equal(res.status,200);state=await res.json();assert.equal((await api('/api/commands','POST',body)).status,409);
 const reopened=await(await api('/api/project')).json();assert.equal(control(reopened.document,'oauth').title,controlPlan.title);assert.equal(control(reopened.document,'oauth').ref,'SEC-001');
 assert.notEqual(control((await(await api('/api/project','GET',null,'architect-b')).json()).document,'oauth').title,controlPlan.title);
 res=await api('/api/commands','POST',{revision:state.revision,command:{type:'security.evidence',payload:evidence(state.document,'oauth')}});assert.equal(res.status,200);state=await res.json();assert.equal(state.document.security.evidence[0].id,'EV-001');
 for(const format of ['json','md']){const r=await api('/api/export?chapter=9&format='+format);assert.equal(r.status,200);if(format==='json'){const b=await r.json();assert(b.connectedModel.nodes.some(n=>n.ref==='SEC-001'));assert(b.securityValidation.findings.some(f=>f.code==='evidence-verification'));}else{assert(r.headers.get('Content-Disposition').includes('Security.md'));assert((await r.text()).includes('EV-001'));}}
 res=await api('/api/commands','POST',{revision:state.revision,command:{type:'interfaces.intake'}});assert.equal(res.status,200);assert.equal(control((await res.json()).document,'oauth').title,controlPlan.title);
 console.log('PASS Security: stable THR/SEC/EV/RR/SG/SS identities; inherited protection scope; resilience to confirm beside it; editing and source traceability; planned controls, evidence, residual risk, and governance separation; changed/withdrawn evidence invalidation; reviewed ghosts; degraded-control walkthroughs; attainable runtime handoff with explicit open evidence; shared desktop/mobile graph bounds; authenticated persistence, owner isolation, CAS, and exports.');
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
  const {applySecurityCommand: applyS, SECURITY_LIMITS: SL} = await import('./public/security-domain.js');
  assert.deepEqual({...SL}, {threats: 500, controls: 500});
  bound('threats', SL.threats, p => p.security.threats, (p, n) => ({...structuredClone(p.security.threats[0]), id: 'thr-b' + n, ref: 'THR-B' + n, title: 'Bound threat ' + n}), applyS, p => ({type: 'security.threat', payload: {title: 'One threat more', category: 'Data disclosure', priority: 'Low', targetIds: [p.interfaces.data[0].id]}}), /^Error: This workspace keeps up to 500 threats\.$/);
  bound('controls', SL.controls, p => p.security.controls, (p, n) => ({...structuredClone(p.security.controls[0]), id: 'sec-b' + n, ref: 'SEC-B' + n, title: 'Bound control ' + n}), applyS, p => ({type: 'security.control', payload: {title: 'One control more', category: 'Data protection', failureMode: 'Deny or contain', targetIds: [p.interfaces.data[0].id], threatIds: []}}), /^Error: This workspace keeps up to 500 controls\.$/);
  console.log('PASS threats and controls are bounded at 500, each refusing the next with "This workspace keeps up to …"');
}

// ---------------------------------------------------------------- Round 12 (D2): priority not stated, personal data
{
  const {applyInterfacesCommand} = await import('./public/interfaces-domain.js');
  let q = cmd(base, 'threat', {id: 'thr-002', priority: '', category: ''});
  assert.deepEqual([threat(q, 'thr-002').priority, threat(q, 'thr-002').category], ['', '']);
  assert.ok(securityFindings(q).some(f => f.code === 'not-stated' && f.items.some(x => x.objectId === 'thr-002' && x.field === 'priority')));
  assert.ok(!securityFindings(q).some(f => f.code === 'threat-definition' && f.objectId === 'thr-002'), 'no basis is asked of a priority not stated');
  q = cmd(q, 'threat', {id: 'thr-002', priority: 'Low'});
  assert.equal(threat(q, 'thr-002').prioritySource, 'person', 'a person who sets the priority is its basis');
  q = applyInterfacesCommand(q, {type: 'interfaces.data', payload: {id: 'posting', personalData: 'yes'}}).document;
  const personal = securityFindings(q).filter(f => f.code === 'personal-data');
  assert.ok(personal.some(f => f.objectId === 'posting'), 'personal data with no disclosure threat is a warning');
  q = cmd(q, 'threat', {id: 'thr-003', targetIds: {add: ['posting']}});
  assert.ok(!securityFindings(q).some(f => f.code === 'personal-data' && f.objectId === 'posting'), 'a data disclosure threat that names it answers it');
  console.log('PASS round 12: a threat\'s priority and category may be not stated (no basis asked), a person who sets the priority is recorded as its basis, and personal data with no data disclosure threat is a warning until one names it');
}

// ---------------------------------------------------------------- Round 12 (D4): dual control; delivery and parameters
// GR-SEC-03: a control and a threat of category "dual control & segregation of duties" save, with checks of their own: a
// control names the role that makes and the role that checks, two roles; a threat of the category asks for such a control.
{
  const {DUAL_CONTROL, CONTROL_CATEGORIES, THREAT_CATEGORIES} = await import('./public/security-domain.js');
  assert.equal(DUAL_CONTROL, 'Dual control & segregation of duties');
  assert.ok(CONTROL_CATEGORIES.includes(DUAL_CONTROL) && THREAT_CATEGORIES.includes(DUAL_CONTROL), 'a category of controls and of threats');
  const run = (q, type, payload) => applySecurityCommand(q, {type: 'security.' + type, payload});
  let r = run(base, 'threat', {title: 'One officer enters and releases a payment', category: DUAL_CONTROL, actor: 'An officer acting alone', scenario: 'The officer who enters a payment also releases it.', consequence: 'A fraudulent payment leaves the bank.', owner: 'Operations risk', priority: 'High', priorityBasis: 'Fraud loss.', targetIds: ['rest']});
  let q = r.document; const thr = r.selected;
  const codes = (doc, id) => securityFindings(doc).filter(f => f.objectId === id).map(f => f.code);
  assert.equal(threat(q, thr).category, DUAL_CONTROL, 'the threat saves with its category');
  assert.ok(codes(q, thr).includes('dual-control-uncovered'), 'a dual control threat no dual control covers is its own finding');
  r = run(q, 'control', {title: 'Maker-checker on payment release', category: DUAL_CONTROL, purpose: 'No payment leaves on one person\'s word.', owner: 'Payments operations', enforcement: 'The release step', mechanism: 'A second officer approves each release.', targetIds: ['rest'], threatIds: [thr]});
  q = r.document; const ctl = r.selected;
  assert.equal(control(q, ctl).category, DUAL_CONTROL, 'the control saves with its category');
  assert.ok(codes(q, ctl).includes('dual-control-roles'), 'it is asked who makes and who checks');
  assert.ok(!codes(q, thr).includes('dual-control-uncovered'), 'and it covers the threat');
  q = cmd(q, 'control', {id: ctl, makerRole: 'Payments officer', checkerRole: 'payments officer'});
  assert.ok(codes(q, ctl).includes('dual-control-same'), 'one role on both sides is a finding');
  q = cmd(q, 'control', {id: ctl, checkerRole: 'Payments supervisor'});
  assert.ok(!codes(q, ctl).some(c => c.startsWith('dual-control')), 'two roles: its own checks pass');
  assert.match(exportSecurityMarkdown(q), /Maker: Payments officer · Checker: Payments supervisor/);
  assert.ok(!codes(cmd(q, 'control', {id: 'oauth', makerRole: 'x'}), 'oauth').some(c => c.startsWith('dual-control')), 'another category is never asked');
  console.log('PASS round 12 (GR-SEC-03): a control and a threat of category "dual control & segregation of duties" save; the control is asked for a maker role and a different checker role, the threat for a dual control to cover it');
}
// GR-SEC-04: a control that links requirements shows their delivery status; resting on an undelivered requirement raises
// one grouped finding for the chapter; a control keeps parameters.
{
  const {deliveryOf} = await import('./public/requirement-links.js');
  let q = structuredClone(base);
  const reqs = q.artefacts.filter(a => a.type === 'requirement');
  reqs[0].assessment = {...(reqs[0].assessment || {}), delivery: 'Delivered'}; reqs[1].assessment = {...(reqs[1].assessment || {}), delivery: 'Partly delivered'};
  q = cmd(q, 'control', {id: 'oauth', requirementIds: [reqs[0].id, reqs[1].id, reqs[2].id]});
  q = cmd(q, 'control', {id: 'audit', requirementIds: [reqs[1].id]});
  const d = deliveryOf(q, control(q, 'oauth'));
  assert.deepEqual(d.rows.map(x => [x.id, x.delivery, x.delivered]), [[reqs[0].id, 'Delivered', true], [reqs[1].id, 'Partly delivered', false], [reqs[2].id, '', false]], 'each linked requirement with its delivery status');
  assert.deepEqual([d.undelivered, d.notStated], [[reqs[1].id], [reqs[2].id]], 'the undelivered read apart from the not stated');
  const undelivered = securityFindings(q).filter(f => f.code === 'undelivered');
  assert.equal(undelivered.length, 1, 'one grouped finding');
  assert.deepEqual(undelivered[0].items, [{objectId: 'oauth', requirementIds: [reqs[1].id]}, {objectId: 'audit', requirementIds: [reqs[1].id]}]);
  assert.match(exportSecurityMarkdown(q), new RegExp('Requirements and their delivery: ' + reqs[0].id + ' Delivered; ' + reqs[1].id + ' Partly delivered; ' + reqs[2].id + ' delivery not stated'));
  // Parameters: named, with value, unit and basis; sent whole, null clears them.
  q = cmd(q, 'control', {id: 'oauth', parameters: [{name: 'Token lifetime', value: '15', unit: 'minutes', basis: 'Security standard'}, {name: 'Failed attempts before lock', value: '5'}]});
  assert.deepEqual(control(q, 'oauth').parameters.map(x => [x.name, x.value, x.unit]), [['Token lifetime', '15', 'minutes'], ['Failed attempts before lock', '5', '']]);
  assert.match(exportSecurityMarkdown(q), /Parameters: Token lifetime 15 minutes \(Security standard\); Failed attempts before lock 5/);
  assert.throws(() => cmd(q, 'control', {id: 'oauth', parameters: [{value: '3'}]}), /Name each parameter/);
  assert.throws(() => cmd(q, 'control', {id: 'oauth', parameters: [{name: 'A'}, {name: 'a'}]}), /Name each parameter once/);
  assert.deepEqual(control(cmd(q, 'control', {id: 'oauth', parameters: null}), 'oauth').parameters, []);
  console.log('PASS round 12 (GR-SEC-04): a control shows the delivery status of each requirement it links (undelivered apart from not stated), resting on an undelivered requirement raises one grouped finding, and a control keeps named parameters with value, unit and basis');
}
// GR-REQ-13: a threat and a control keep a reading of what they read, not the versions of Chapters 1-8. Changing one
// component's purpose marks only the controls and threats that name it, with their evidence, risk treatments and
// walkthroughs; the others stay current. A stamp kept before (the versions) is judged as it was.
{
  const {applyRealisationCommand, component} = await import('./public/realisation-domain.js');
  const {interfaceSourceChanged} = await import('./public/interfaces-domain.js');
  const at = '2026-10-08T10:00:00.000Z';
  let q = structuredClone(base);
  q = cmd(q, 'evidence', evidence(q, 'oauth'));
  q = cmd(q, 'evidence', evidence(q, 'mtls'));
  q = cmd(q, 'risk', risk(q, 'thr-004'));
  q = cmd(q, 'simulation', {id: 'thr-004', mode: 'planned', stamp: threatStamp(q, threat(q, 'thr-004')), observations: 'Synthetic walk-through of the fixture.', reviewed: true, visited: [0, 1, 2, 3]});
  const marked = p => [...threats(p), ...controls(p)].filter(r => securitySourceChanged(p, r)).map(r => r.id);
  assert.deepEqual(marked(q), [], 'nothing is marked to begin with');
  assert.ok([...threats(q), ...controls(q)].every(r => r.sourceSnapshot.startsWith('fp1:')), 'each keeps a reading (a fingerprint), not the versions of the chapters before');
  // api-pod's purpose changes: oauth protects it (and rest); no threat names it.
  const api = component(q, 'api-pod');
  const changed = withSecurity(applyRealisationCommand(q, {type: 'realisation.component', payload: {...api, purpose: api.purpose + ' It keeps the channel reference.'}}, at).document);
  assert.deepEqual(marked(changed), ['oauth'], 'only the control that reads the component is marked, not every Chapter 9 record');
  assert.deepEqual(securityFindings(changed).filter(f => f.code === 'source').map(f => f.objectId), ['oauth'], 'one "Review changed inputs" finding');
  assert.deepEqual([...changed.interfaces.contracts, ...changed.interfaces.data].filter(r => interfaceSourceChanged(changed, r)).map(r => r.id), ['rest', 'if-004', 'instruction'], 'and in Chapter 8 the contracts and the data definition that read it');
  assert.ok(!evidenceCurrent(changed, changed.security.evidence.find(e => e.controlId === 'oauth')), 'the evidence of the control that reads it is no longer current');
  assert.ok(evidenceCurrent(changed, changed.security.evidence.find(e => e.controlId === 'mtls')), 'another control\'s evidence stays current');
  assert.ok(riskCurrent(changed, latestRisk(q, 'thr-004')) && securitySimulationCurrent(changed, changed.security.simulations.at(-1)), 'a risk treatment and a walkthrough of a threat that does not read it stay current');
  // A change to a data definition a contract carries marks the controls and threats on that contract or that data.
  const field = q.interfaces.data.find(d => d.id === 'settlement').fields[0];
  const dataChanged = withSecurity(applyInterfacesCommand(q, {type: 'interfaces.field', payload: {id: 'settlement', field: {...field, description: 'Revised settlement key'}}}).document);
  assert.deepEqual(marked(dataChanged), ['thr-003', 'thr-004', 'audit', 'mtls'], 'the threats and controls on settlement or on the contract that carries it');
  // A record whose stamps were taken before (the versions of Chapters 1-8) is judged as before.
  const legacy = structuredClone(q), old = legacy.security.controls.find(c => c.id === 'mtls'), I = await import('./public/interfaces-domain.js');
  old.sourceSnapshot = JSON.stringify([I.inputStamp(legacy), legacy.interfaces.version]);
  const ev = legacy.security.evidence.find(e => e.controlId === 'mtls');
  ev.stamp = JSON.stringify([old.revision, old.sourceSnapshot, old.threatIds.map(id => [id, threat(legacy, id)?.revision])]);
  assert.ok(!securitySourceChanged(legacy, old) && evidenceCurrent(legacy, ev), 'a stamp taken before reads as current while nothing before has changed');
  const legacyChanged = withSecurity(applyRealisationCommand(legacy, {type: 'realisation.component', payload: {...api, purpose: api.purpose + ' It keeps the channel reference.'}}, at).document);
  assert.deepEqual(marked(legacyChanged), ['oauth', 'mtls'], 'and as changed after any change before, as it was');
  assert.ok(!evidenceCurrent(legacyChanged, legacyChanged.security.evidence.find(e => e.controlId === 'mtls')));
  console.log('PASS round 12 (GR-REQ-13): changing one component\'s purpose marks only the control that reads it (oauth) and, in Chapter 8, the contracts and data that read it; that control\'s evidence follows, while other evidence, risk treatments and walkthroughs stay current; a changed data definition marks the threats and controls on it or on its contract; a stamp kept before is judged as it was');
}
