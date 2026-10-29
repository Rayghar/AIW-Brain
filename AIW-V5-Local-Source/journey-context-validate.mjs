import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {journeyIndex,journeyTargets,journeyObjectURL,journeyStatus} from './public/journey-context.js';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';
import {draftArchitecture} from './public/architecture-drafter.js';
import {withFinalReview} from './public/review-domain.js';
const p=createProject({name:'Journey validation',template:'bank-payment'},'journey-test');
const before=JSON.stringify(p),index=journeyIndex(p);
assert.equal(JSON.stringify(p),before,'Exploration must not mutate project records');
assert.deepEqual(journeyTargets(index,'ledger',5).map(t=>t.node.id),['core-adapter']);
assert.deepEqual(journeyTargets(index,'core-adapter',4).map(t=>t.node.id),['ledger']);
assert.equal(journeyTargets(index,'core-adapter',1)[0].node.id,'REQ-003');
assert.equal(journeyTargets(index,'postgres',7)[0].node.id,'tr-002');
assert.ok(journeyTargets(index,'ledger',9).some(t=>t.node.id==='audit'));
assert.ok(journeyTargets(index,'worker',10).some(t=>t.node.id==='run-004'));
assert.ok(journeyTargets(index,'ledger',1).every(t=>t.path.length>0));
assert.ok(journeyTargets(index,'REQ-003',3).some(t=>t.node.id==='ADR-002'));
for(const chapter of [1,2,3,4,5,6,7,8,9,10])for(const item of journeyTargets(index,'ledger',chapter)){
 assert.ok(item.path.every(e=>index.nodes.has(e.from)&&index.nodes.has(e.to)));
 assert.equal(item.node.chapter,chapter);
 const u=new URL(journeyObjectURL(item.node),'https://example.test');
 assert.equal(Number(u.searchParams.get('chapter')),chapter);
 assert.equal(u.searchParams.get(chapter===1?'artefact':chapter===2?'driver':chapter===3?'decision':'object'),item.node.id);
}
assert.equal(journeyStatus(index.nodes.get('REQ-003')),'Illustrative reference');
assert.equal(journeyStatus(index.nodes.get('ADR-002')),'draft decision');
assert.equal(journeyTargets(index,'unsaved-ghost',5).length,0);
const blank=createProject({name:'Blank service design',template:'blank'},'blank-test');
assert.equal(journeyIndex(blank).nodes.size,0,'Blank project has no bank context');
// Two unrelated responsibilities share compute. Forward-and-back topology must
// not imply that one fulfils the other responsibility's requirement.
const custom={nodes:new Map([
 ['qa',{id:'qa',chapter:1}],['qb',{id:'qb',chapter:1}],
 ['la',{id:'la',chapter:4}],['lb',{id:'lb',chapter:4}],
 ['aa',{id:'aa',chapter:5}],['ab',{id:'ab',chapter:5}],['compute',{id:'compute',chapter:6}],['realization',{id:'realization',chapter:7}]
]),edges:[['qa','la'],['qb','lb'],['la','aa'],['lb','ab'],['aa','compute'],['ab','compute'],['compute','realization']].map(([from,to])=>({from,to,label:'test link'}))};
assert.deepEqual(journeyTargets(custom,'aa',1).map(t=>t.node.id),['qa']);
assert.deepEqual(journeyTargets(custom,'qa',5).map(t=>t.node.id),['aa']);
assert.deepEqual(journeyTargets(custom,'qa',7).map(t=>t.node.id),['realization']);
assert.deepEqual(journeyTargets(custom,'compute',5).map(t=>t.node.id),['aa','ab'],'Shared technology exposes both consumers explicitly');
const changed=structuredClone(p);changed.logical.mappings=changed.logical.mappings.filter(m=>m.logicalId!=='ledger');
assert.deepEqual(journeyTargets(journeyIndex(changed),'ledger',5),[],'Removed allocation is not reconstructed from a reference example');
console.log('PASS Connected journey: saved trace paths, reverse navigation, unambiguous stable references, shared-capability isolation, removed-link handling, ghost exclusion, blank-project isolation, and non-mutating exploration.');

// Round 12 (GR-DRF-06): a workbook-only project with no brief drafts Chapters 2-11 from its records, and only Chapter 1
// asks for a brief. Over the journey route for a project of typed requirements (each chapter drafted from the records
// before it), and over the architecture draft for a project whose requirements were imported from a workbook.
{
 const root=await mkdtemp(path.join(tmpdir(),'aiw-journey-')),db=localDatabase(path.join(root,'j.sqlite')),env={DB:db,FILES:localFiles(path.join(root,'files')),ASSETS:{fetch:()=>new Response('asset')}};
 try{
 const origin='https://aiw.test',owner='architect-n';
 const make=async name=>{const r=await worker.fetch(new Request(origin+'/api/projects',{method:'POST',headers:{'oai-authenticated-user-id':owner,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name,template:'blank'})}),env);const b=await r.json();return {id:b.document.id,revision:b.revision,document:b.document};};
 const call=async(project,path,body)=>{const r=await worker.fetch(new Request(origin+path+(path.includes('?')?'&':'?')+'project='+project,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':owner,Origin:origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,data:await r.json()};};
 const typed=await make('Workbook only, typed');let rev=typed.revision;
 assert.equal(typed.document.brief.problem,'','no brief');
 for(const [title,description] of [['Record each payment instruction','The service shall record each payment instruction with its reference and amount.'],['Show the payment status','The service shall show the current status of a payment to the customer.'],['Report the day-end totals','The service shall report the day-end totals to operations.'],['Restrict refunds to supervisors','The service shall allow only supervisors to approve a refund.']]){const r=await call(typed.id,'/api/commands',{revision:rev,command:{type:'artefact',payload:{type:'requirement',title,description,owner:'Payments owner',source:'Workbook',priority:'Must'}}});assert.equal(r.status,200,JSON.stringify(r.data));rev=r.data.revision;}
 const one=await call(typed.id,'/api/intelligence/journey-context',{chapter:1});
 assert.equal(one.status,400);assert.match(one.data.error,/Write the project brief/,'Chapter 1 asks for the brief');
 const answered={};
 for(let chapter=2;chapter<=11;chapter++){const r=await call(typed.id,'/api/intelligence/journey-context',{chapter});assert.equal(r.status,200,`Chapter ${chapter} is drafted without a brief: ${JSON.stringify(r.data).slice(0,200)}`);assert.equal(r.data.packet,null,'nothing is prepared for Sol without a brief');assert.match(r.data.brief.note,/No brief is written: this chapter is drafted from the records before it/);assert.doesNotMatch(JSON.stringify(r.data.draft),/Write the project brief/);answered[chapter]=r.data.draft.records.length;}
 assert.ok(answered[2]>=1&&answered[4]>=1&&answered[11]===1,'drivers and responsibilities from the requirements, and the narrative: '+JSON.stringify(answered));
 const sent=await call(typed.id,'/api/intelligence/journey',{chapter:2,requestId:'11111111-2222-4333-8444-555555555555',packetStamp:'none'});
 assert.equal(sent.status,400);assert.match(sent.data.error,/Write the project brief before asking Sol to draft from it/);
 // Imported from a workbook: the architecture draft, brief or not; the journey route answers it grouped on every chapter.
 const imported=await make('Workbook only, imported'),{bytes,manifest}=syntheticWorkbook({rows:40});
 const up=(await worker.fetch(new Request(origin+'/api/intake?action=upload&filename=Small.xlsx&project='+imported.id,{method:'POST',headers:{'oai-authenticated-user-id':owner,Origin:origin},body:bytes}),env).then(r=>r.json()));
 const ins=(await call(imported.id,'/api/intake?action=inspect',{uploadId:up.id,sheet:manifest.sheet})).data,input={uploadId:up.id,sheet:ins.sheet,headerRow:ins.headerRow,mapping:ins.mapping,priorityMap:ins.bands.map,groups:{domain:true,capabilityTheme:true}};
 const pre=(await call(imported.id,'/api/intake?action=preview',input)).data;
 const done=await call(imported.id,'/api/intake?action=apply',{...input,revision:pre.projectRevision,previewStamp:pre.stamp,reviewed:true});assert.equal(done.status,200,JSON.stringify(done.data).slice(0,300));
 assert.equal(done.data.document.brief.problem,'','the workbook proposes a brief; none is accepted');
 for(let chapter=1;chapter<=11;chapter++){const r=await call(imported.id,'/api/intelligence/journey-context',{chapter});assert.equal(r.status,200,JSON.stringify(r.data).slice(0,200));assert.equal(r.data.draft.grouped,true);assert.match(r.data.draft.empty,/drafts its architecture from the groups/);}
 const start=await call(imported.id,'/api/drafting?action=start',{requestId:'21111111-2222-4333-8444-555555555555'});assert.equal(start.status,202,JSON.stringify(start.data));
 let job;for(let i=0;i<2000;i++){job=(await call(imported.id,'/api/drafting?action=status&id='+start.data.id)).data.job;if(!['queued','running'].includes(job.status))break;await new Promise(r=>setTimeout(r,20));}
 assert.equal(job.status,'completed',job.error);
 const preview=(await call(imported.id,'/api/drafting?action=preview&id='+start.data.id)).data.preview,byChapter=Object.fromEntries(preview.chapters.map(c=>[c.chapter,c.records]));
 for(const chapter of [2,3,4,5,6,7,8,10,11])assert.ok(byChapter[chapter]>0,`Chapter ${chapter} drafted from the workbook's records without a brief: `+JSON.stringify(byChapter));
 assert.deepEqual(preview.asks.map(a=>[a.chapter,a.field]),[[1,'brief']],'only Chapter 1 asks for the brief');
 assert.equal(job.summary.stamp,draftArchitecture(withFinalReview(done.data.document)).stamp,'the job drafts what the drafter drafts');
 console.log('PASS GR-DRF-06: a workbook-only project with no brief drafts Chapters 2-11 from its records (typed requirements over the journey route, chapter by chapter; imported requirements as the architecture draft), and only Chapter 1 asks for the brief; nothing is sent to Sol without one');
 }finally{db.close?.();await rm(root,{recursive:true,force:true});}
}
