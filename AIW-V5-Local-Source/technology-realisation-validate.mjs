import {browserSource} from './browser-source.mjs';
import * as projectContext from './public/project-context.js';
import * as projectScope from './public/model-scope.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {seedProject} from './public/requirements-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import {capability,supports,applyTechnologyCommand} from './public/technology-domain.js';
import {withTechnologyRealisation,realizations,realization,realizationMappings,realizationSources,realizationCriteria,realizationOption,realizationSourceChanged,selectionCurrent,approvalCurrent,realizationIntakeCurrent,realizationReviewCurrent,realizationHandoffCurrent,technologyRealisationFindings,technologyRealisationMilestones,technologyRealisationProposal,applyTechnologyRealisationCommand,exportTechnologyRealisationMarkdown} from './public/technology-realisation-domain.js';
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
let p=cmd(base,'intake');assert(realizationIntakeCurrent(p));
const id='tr-002',plan={...realization(p,id),mappings:realizationMappings(p,id),title:'Payment state service',owner:'Data platform team',rationale:'Test fixture: explicit transaction and recovery ownership.',risks:'Test fixture: shared dependency requires a rehearsed restore.',operationsPlan:'Named service owner, support rota, maintenance window.',accessPlan:'Separate writer and enquiry identities.',dataPlan:'Preserve payment references and verified authoritative records.',resiliencePlan:'Reconcile uncertain outcomes after verified restoration.',interfacePlan:'Versioned command and enquiry contracts.',lifecyclePlan:'Owned patching and tested data exit.',capacityValue:'250',capacityUnit:'test transactions/s',capacityBasis:'Synthetic workload assumption; not a measured target.',annualCost:'12000',currency:'USD',costBasis:'Synthetic cost fixture; no supplier quote.',estimatesConfirmed:false};
p=cmd(p,'plan',plan);assert.equal(realization(p,id).ref,'TR-002');assert.equal(realizationMappings(p,id)[0].id,'RM-002');
assert(technologyRealisationFindings(p).some(f=>f.objectId===id&&f.code==='estimate'));
assert.throws(()=>cmd(p,'plan',{...plan,mappings:[]}),/at least/);
assert.throws(()=>cmd(p,'plan',{...plan,mappings:[plan.mappings[0],plan.mappings[0]]}),/once/);
assert.throws(()=>cmd(p,'plan',{...plan,annualCost:'-1'}),/non-negative/);
assert.throws(()=>cmd(p,'plan',{...plan,capacityValue:'unlimited'}),/non-negative/);
const option={...realization(p,id).options[0],product:'Test-owned relational service',version:'Test service tier',vendor:'Test data platform',benefits:'Explicit operational and transaction boundary.',drawbacks:'Recovery still depends on an owned, tested procedure.',evidence:'Synthetic design verification fixture, not product certification.'};
p=cmd(p,'option',{id,option});assert.equal(realization(p,id).options[0].id,'TO-003');
assert.throws(()=>cmd(p,'option',{id,option:{...option,sourceUrl:'javascript:alert(1)'}}),/http/);
assert.throws(()=>cmd(p,'preference',{id,optionId:'missing'}),/existing/);
p=cmd(p,'preference',{id,optionId:option.id});
assert.equal(realizationOption(realization(p,id)).id,option.id);assert(!selectionCurrent(p,realization(p,id)));
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
const boundaryChanged=structuredClone(recorded);boundaryChanged.technology.version++;boundaryChanged.technology.boundaries[0].policy='Revised crossing obligation';assert(!selectionCurrent(boundaryChanged,realization(boundaryChanged,id)),'Technology policy changes require a new realization review');
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
for(const term of ['TR-002','TO-003','RM-002','TC-002','REQ-004','ADR-003','QD-004','Chapter 8','Annual cost','current external approval'])assert(exportTechnologyRealisationMarkdown(ready).includes(term),term);

// Exercise the shared renderer with the new same-layer realization records.
const g=logicalGraph(p),modelSource=fs.readFileSync('public/model.js','utf8').replaceAll('export const ','const '),appSource=fs.readFileSync('public/app.js','utf8').replace(/^import .*?;\n/gm,'').replace(/\npersist\(\);render\(\);\n/,'\n');
assert.equal(new Set(g.nodes.map(n=>n.id)).size,g.nodes.length);assert(g.edges.every(e=>g.nodes.some(n=>n.id===e.from)&&g.nodes.some(n=>n.id===e.to)));
const el={textContent:'',style:{},innerHTML:'',classList:{add(){},remove(){},toggle(){}},focus(){},click(){},setAttribute(){},scrollIntoView(){}};
const ctx={console,Set,Map,URL,URLSearchParams,location:{search:''},Blob,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:()=>null,setItem(){}},document:{body:el,querySelector:()=>el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el},window:{aiwLogicalStudio:{graph:()=>g,groups:p.logical.groups,bind(){}},addEventListener(){},matchMedia:()=>({matches:true})}};
const uxSource=browserSource('public/workspace-ux.js');
Object.assign(ctx,projectContext,projectScope);vm.createContext(ctx);vm.runInContext(uxSource,ctx);vm.runInContext(modelSource+'\n'+appSource+'\nglobalThis.layout=layoutModel;globalThis.testLayers=layers;',ctx);
for(const visible of [['technology'],['physical','technology'],['technology','data','interface'],['technology','security','deployment'],ctx.testLayers.map(l=>l.id)])for(const mobile of [false,true]){const l=ctx.layout(g.nodes.filter(n=>visible.includes(n.layer)),mobile,false,false),ps=[...l.positions.values()];for(const v of ps)assert(v.x>=0&&v.y>=0&&v.x+200<=l.width&&v.y+74<=l.height);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert(ps[i].x+200<=ps[j].x||ps[j].x+200<=ps[i].x||ps[i].y+74<=ps[j].y||ps[j].y+74<=ps[i].y);}

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
