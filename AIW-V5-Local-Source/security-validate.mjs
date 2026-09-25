import {browserSource} from './browser-source.mjs';
import * as projectContext from './public/project-context.js';
import * as projectScope from './public/model-scope.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {seedProject} from './public/requirements-domain.js';
import {withInterfaces,applyInterfacesCommand} from './public/interfaces-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import {withSecurity,controls,control,threats,threat,securityTargets,securitySources,targetBoundaries,relatedControls,securityIntakeCurrent,securityReviewCurrent,securityHandoffCurrent,securitySourceChanged,controlStamp,threatStamp,securityGovernanceStamp,evidenceCurrent,latestEvidence,assuranceLabel,riskCurrent,latestRisk,latestGovernance,governanceCurrent,securitySimulationCurrent,securityFindings,securityMilestones,securityProposal,simulateSecurity,applySecurityCommand,exportSecurityMarkdown} from './public/security-domain.js';
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
for(const term of ['SEC-001','THR-001','EV-001','RR-001','SS-001','REQ-003','QD-004','Deployment / Runtime handoff'])assert(exportSecurityMarkdown(ready).includes(term),term);assert(!exportSecurityMarkdown(ready).includes('undefined'));
const g=logicalGraph(p),ids=new Set(g.nodes.map(n=>n.id));assert.equal(ids.size,g.nodes.length);assert(g.edges.every(e=>ids.has(e.from)&&ids.has(e.to)));assert(g.edges.some(e=>e.securityKind==='exposure'));assert(g.edges.some(e=>e.securityKind==='mitigation'));

// Shared graph bounds are checked at both layouts; this is not a browser walkthrough.
const source=fs.readFileSync('public/model.js','utf8').replaceAll('export const ','const '),app=fs.readFileSync('public/app.js','utf8').replace(/^import .*?;\n/gm,'').replace(/\npersist\(\);render\(\);\n/,'\n');
const el={textContent:'',style:{},innerHTML:'',classList:{add(){},remove(){},toggle(){}},focus(){},click(){},setAttribute(){},scrollIntoView(){}};
const ctx={console,Set,Map,URL,URLSearchParams,location:{search:''},Blob,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:()=>null,setItem(){}},document:{body:el,querySelector:()=>el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el},window:{aiwLogicalStudio:{graph:()=>g,groups:p.logical.groups,bind(){}},addEventListener(){},matchMedia:()=>({matches:true})}};const uxSource=browserSource('public/workspace-ux.js');
Object.assign(ctx,projectContext,projectScope);vm.createContext(ctx);vm.runInContext(uxSource,ctx);vm.runInContext(source+'\n'+app+'\nglobalThis.layout=layoutModel;globalThis.testLayers=layers;',ctx);
for(const visible of [['security','interface','physical'],['security','data','interface'],['security','technology','interface','physical'],['security','technology','deployment'],ctx.testLayers.map(l=>l.id)])for(const mobile of [false,true]){const l=ctx.layout(g.nodes.filter(n=>visible.includes(n.layer)),mobile,false,false),ps=[...l.positions.values()];for(const v of ps)assert(v.x>=0&&v.y>=0&&v.x+200<=l.width&&v.y+74<=l.height);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert(ps[i].x+200<=ps[j].x||ps[j].x+200<=ps[i].x||ps[i].y+74<=ps[j].y||ps[j].y+74<=ps[i].y);}

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
 console.log('PASS Security: stable THR/SEC/EV/RR/SG/SS identities; inherited protection scope; editing and source traceability; planned controls, evidence, residual risk, and governance separation; changed/withdrawn evidence invalidation; reviewed ghosts; degraded-control walkthroughs; attainable runtime handoff with explicit open evidence; shared desktop/mobile graph bounds; authenticated persistence, owner isolation, CAS, and exports.');
}finally{DB.close()}
