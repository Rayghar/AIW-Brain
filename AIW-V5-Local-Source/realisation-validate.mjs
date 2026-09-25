import {browserSource} from './browser-source.mjs';
import * as projectContext from './public/project-context.js';
import * as projectScope from './public/model-scope.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {seedProject} from './public/requirements-domain.js';
import {applyLogicalCommand,logicalGraph,logicalProposal,mappingCurrent,physicalObjects} from './public/logical-domain.js';
import {withRealisation,components,component,allocations,componentSources,componentSourceChanged,realisationIntakeCurrent,realisationFindings,realisationMilestones,realisationProposal,applyRealisationCommand,realisationReviewCurrent,realisationHandoffCurrent,realisationScenarioCurrent,exportRealisationMarkdown} from './public/realisation-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
const cmd=(p,type,payload={})=>applyRealisationCommand(p,{type:'realisation.'+type,payload}).document;
const legacy=seedProject(),base=withRealisation(legacy);
assert.equal(legacy.realisation,undefined);assert.deepEqual(base.artefacts,legacy.artefacts);
assert.deepEqual(components(base).map(c=>[c.id,c.ref]),[['api-pod','APP-001'],['risk-engine','APP-002'],['core-adapter','APP-003'],['worker','APP-004'],['notify-worker','APP-005']]);
assert.equal(new Set(logicalGraph(base).nodes.map(n=>n.id)).size,30);
const payload={title:'Pending-case coordinator',kind:'worker',purpose:'Coordinate pending-case enquiries',boundary:'Own case assignment and enquiry evidence, without repeating financial instructions',owner:'Payments operations',inputs:'Pending instruction and original reference',outputs:'Verified outcome or accountable escalation',rationale:'A separate work boundary makes pending cases visible and assignable.',source:'Illustrative review of recovery responsibilities',technologyNeeds:'Durable case dispatch and enquiry connectivity',assumptions:'Confirm investigation targets',status:'candidate',dataIds:[],decisionIds:['ADR-003'],allocations:[{logicalId:'hub',scope:'Own assignment and enquiry evidence for pending cases'}]};
let p=cmd(base,'intake');assert(realisationIntakeCurrent(p));
p=cmd(p,'component',payload);let c=components(p).at(-1),id=c.id;assert.equal(c.ref,'APP-006');assert(realisationIntakeCurrent(p),'Component edits must not force re-entry of the inherited intake');
assert.equal(allocations(p,id)[0].id,'MAP-006');assert(mappingCurrent(p,allocations(p,id)[0]));
assert(componentSources(p,id).requirements.some(q=>q.id==='REQ-004'));assert(componentSources(p,id).decisions.some(d=>d.id==='ADR-003'));
assert(realisationFindings(p).some(f=>f.code==='isolated'&&f.objectId===id));
p=cmd(p,'interaction',{from:'worker',to:id,label:'dispatch pending enquiry',interaction:'event',condition:'Only an uncertain outcome',failure:'Keep pending and escalate before any replay'});const interaction=p.realisation.connections.at(-1);
assert(!realisationFindings(p).some(f=>f.code==='isolated'&&f.objectId===id));
p=cmd(p,'interaction',{...interaction,label:'assign a pending case'});assert.equal(p.realisation.connections.at(-1).id,interaction.id);
assert.throws(()=>cmd(p,'interaction',{...interaction,id:null,to:'worker'}),/different/);
assert.throws(()=>cmd(p,'interaction',{...interaction,id:null,to:'hub'}),/allocations/);
assert.throws(()=>cmd(p,'interaction',{...interaction,id:null,to:'missing'}),/existing/);
assert.throws(()=>cmd(p,'component',{...payload,title:'',status:'reviewed'}),/Name/);
assert.throws(()=>cmd(p,'component',{...payload,dataIds:['missing']}),/data records/);
assert.throws(()=>cmd(p,'component',{...payload,decisionIds:['missing']}),/decisions/);
assert.throws(()=>cmd(p,'component',{...payload,allocations:[] ,status:'reviewed'}),/before marking/);
p=cmd(p,'component',{...payload,id,title:'Revised pending-case coordinator',status:'reviewed'});c=component(p,id);assert.equal(c.ref,'APP-006');assert.equal(c.revision,2);assert.equal(c.history[0].title,payload.title);
assert.equal(allocations(p,id)[0].id,'MAP-006');assert.equal(physicalObjects(p).find(n=>n.id===id).title,c.title);assert.equal(logicalGraph(p).nodes.find(n=>n.id===id).ref,'APP-006');
const overlap=cmd(p,'component',{...payload,id,dataIds:['instruction'],allocations:[{logicalId:'hub',scope:allocations(p,'worker')[0].scope}]});
assert(realisationFindings(overlap).some(f=>f.code.startsWith('data-owner')&&f.objectId===id));assert(realisationFindings(overlap).some(f=>f.code==='overlap'));
const original=JSON.stringify(p);for(const key of ['review','dedup','recovery'])assert(realisationProposal(p,key));assert.equal(JSON.stringify(p),original);
assert.throws(()=>cmd(p,'candidate',{...realisationProposal(p,'dedup')}),/Review/);
for(const key of ['review','dedup','recovery']){const q=realisationProposal(p,key);p=cmd(p,'candidate',{...q,reviewed:true});assert(realisationProposal(p,key).existingId);assert.throws(()=>cmd(p,'candidate',{...q,reviewed:true}),/already/);}
const dedup=components(p).find(c=>c.patternKey==='dedup');assert.equal(dedup.kind,'store');assert(dedup.dataIds.some(id=>logicalGraph(p).nodes.some(n=>n.id===id&&n.title==='Idempotency result')));
p=cmd(p,'component',{...dedup,title:'Authoritative duplicate result store',allocations:allocations(p,dedup.id)});assert.equal(realisationProposal(p,'dedup').existingId,dedup.id);assert(component(p,dedup.id).boundary.includes('atomic'));
const ownershipRemoved=cmd(p,'component',{...component(p,dedup.id),allocations:allocations(p,dedup.id),dataIds:[]});assert(!logicalGraph(ownershipRemoved).edges.some(e=>e.from===dedup.id&&e.label==='owns'),'Ownership changes must remove the derived relationship');assert(logicalProposal(p,'dedup').existingId);assert(logicalProposal(p,'recovery').existingId);
const current=component(p,id);const changed=applyLogicalCommand(p,{type:'logical.responsibility',payload:{...p.logical.responsibilities.find(r=>r.id==='hub'),purpose:'Revised settlement responsibility'}}).document;
assert(componentSourceChanged(changed,component(changed,id)));assert(!realisationIntakeCurrent(changed));assert(realisationFindings(changed).some(f=>f.code==='mapping'));
assert.throws(()=>cmd(p,'scenario',{scenario:'success',visited:[0,4]}),/every/);
assert.throws(()=>cmd(p,'scenario',{scenario:'hold',visited:[0,1,2]}),/every/);
for(const [scenario,visited] of [['success',[0,1,2,3,4]],['hold',[0,1]],['timeout',[0,1,2,3]]])p=cmd(p,'scenario',{scenario,visited});
p=cmd(p,'review');assert(realisationReviewCurrent(p));assert.throws(()=>cmd(p,'handoff'),/Acknowledge/);p=cmd(p,'handoff',{acknowledge:true});assert(realisationHandoffCurrent(p));assert(p.realisation.handoff.componentRefs.includes('APP-006'));assert(realisationHandoffCurrent(cmd(p,'review')));
const revised=cmd(p,'component',{...component(p,id),allocations:allocations(p,id),inputs:'Updated pending input'});
assert(!realisationReviewCurrent(revised));assert(!realisationHandoffCurrent(revised));assert(!realisationScenarioCurrent(revised,'success'));
let ready=cmd(base,'intake');for(const [scenario,visited] of [['success',[0,1,2,3,4]],['hold',[0,1]],['timeout',[0,1,2,3]]])ready=cmd(ready,'scenario',{scenario,visited});ready=cmd(cmd(ready,'review'),'handoff',{acknowledge:true});assert(realisationMilestones(ready).every(m=>m.done),'Milestones must be attainable while reference assumptions remain openly labelled');
const md=exportRealisationMarkdown(p);for(const term of ['APP-006','MAP-006','REQ-004','ADR-003','Technology needs','Chapter 6 intake','Simulation reviews'])assert(md.includes(term));
const removed=cmd(p,'remove-interaction',{id:interaction.id});assert(realisationFindings(removed).some(f=>f.code==='isolated'&&f.objectId===id));
// The shared renderer must keep added stores, queues, workers, and data records distinct in every layer combination.
const g=logicalGraph(p),modelSource=fs.readFileSync('public/model.js','utf8').replaceAll('export const ','const '),appSource=fs.readFileSync('public/app.js','utf8').replace(/^import .*?;\n/gm,'').replace(/\npersist\(\);render\(\);\n/,'\n');
const el={textContent:'',style:{},innerHTML:'',classList:{add(){},remove(){},toggle(){}},focus(){},click(){},setAttribute(){},scrollIntoView(){}};
const ctx={console,Set,Map,URL,URLSearchParams,location:{search:''},Blob,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:()=>null,setItem(){}},document:{body:el,querySelector:()=>el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>el},window:{aiwLogicalStudio:{graph:()=>g,groups:p.logical.groups,bind(){}},addEventListener(){},matchMedia:()=>({matches:true})}};
const uxSource=browserSource('public/workspace-ux.js');
Object.assign(ctx,projectContext,projectScope);vm.createContext(ctx);vm.runInContext(uxSource,ctx);vm.runInContext(modelSource+'\n'+appSource+'\nglobalThis.layout=layoutModel;globalThis.testLayers=layers;',ctx);
for(let mask=0;mask<256;mask++)for(const mobile of [false,true])for(const grouped of [false,true]){const visible=ctx.testLayers.filter((_,i)=>mask&(1<<i)).map(l=>l.id),l=ctx.layout(g.nodes.filter(n=>visible.includes(n.layer)),mobile,false,grouped),ps=[...l.positions.values()];for(const v of ps)assert(v.x>=0&&v.y>=0&&v.x+200<=l.width&&v.y+74<=l.height);for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert(ps[i].x+200<=ps[j].x||ps[j].x+200<=ps[i].x||ps[i].y+74<=ps[j].y||ps[j].y+74<=ps[i].y);}
const DB=localDatabase(':memory:'),env={DB,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env)};
try{
 assert.equal((await api('/api/project','GET',null,null)).status,401);
 let state=await(await api('/api/project')).json();const body={revision:state.revision,command:{type:'realisation.component',payload}};
 assert.equal((await api('/api/commands','POST',body,'architect-a','https://other.test')).status,403);
 const saved=await api('/api/commands','POST',body);assert.equal(saved.status,200);state=await saved.json();
 assert.equal((await api('/api/commands','POST',body)).status,409);
 const reopened=await(await api('/api/project')).json();assert.equal(components(reopened.document).at(-1).ref,'APP-006');assert.equal(components(reopened.document).at(-1).inputs,payload.inputs);assert.deepEqual(reopened.document.artefacts,base.artefacts);
 assert.equal(components((await(await api('/api/project','GET',null,'architect-b')).json()).document).length,5);
 for(const format of ['json','md']){const res=await api('/api/export?chapter=5&format='+format);assert.equal(res.status,200);assert(res.headers.get('Content-Disposition').includes(format==='md'?'Application_Realisation.md':'.json'));if(format==='json'){const bundle=await res.json();assert(bundle.connectedModel.nodes.some(n=>n.ref==='APP-006'));assert(bundle.realisationValidation.findings.some(f=>f.code==='isolated'));}else assert((await res.text()).includes('APP-006'));}
 const mapCommand={revision:state.revision,command:{type:'logical.mapping',payload:{logicalId:'hub',newComponent:true,componentTitle:'Later Chapter 4 candidate',componentPurpose:'A later logical allocation',scope:'Additional recovery role',owner:'Operations',evidence:'Reference',status:'candidate'}}};
 const sync=await api('/api/commands','POST',mapCommand);assert.equal(sync.status,200);const synced=await sync.json();const later=components(synced.document).find(c=>c.title==='Later Chapter 4 candidate');assert(later);assert.equal(later.technologyNeeds,'');assert(realisationFindings(synced.document).some(f=>f.code==='technology'&&f.objectId===later.id));
 console.log('PASS Application realisation: stable component and allocation identities; ownership and interaction validation; editable ghosts with explicit acceptance; source/review/scenario/handoff invalidation; 1024 layered layouts; Chapter 4 compatibility; authenticated persistence, isolation, concurrency, and exports.');
}finally{DB.close()}

