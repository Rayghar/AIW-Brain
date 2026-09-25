import assert from 'node:assert/strict';
import {seedProject,applyCommand,findings,milestones,exportMarkdown,proposals,guidance} from './public/requirements-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
const files=new Map();
const FILES={async put(key,value){files.set(key,value)},async get(key){return files.has(key)?{text:async()=>files.get(key)}:null},async delete(key){files.delete(key)}};
const DB=localDatabase(':memory:'),env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const request=async(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{
  const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}
  const r=await worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,body:await r.json()};
};
try{
  assert.equal((await request('/api/project','GET',null,null)).status,401);
  let loaded=await request('/api/project');assert.equal(loaded.status,200);let state=loaded.body;
  assert.equal(state.document.artefacts.filter(a=>a.type==='requirement').length,5);
  assert.equal(milestones(state.document).filter(m=>m.done).length,0);
  const send=async(type,payload)=>{const result=await request('/api/commands','POST',{revision:state.revision,command:{type,payload}});if(result.status===200)state=result.body;return result};
  assert.equal((await request('/api/commands','POST',{revision:1,command:{type:'review'}},'architect-a','https://elsewhere.test')).status,403);
  const created=await send('artefact',{type:'requirement',title:'Test a status enquiry',description:'The service shall expose the current status for an authorised request reference.',owner:'Payments owner',source:'Architecture workshop',priority:'Must',acceptance:'Given an existing reference, when an authorised user enquires, then the current recorded status is returned.',confirmed:true});
  assert.equal(created.status,200);const id=state.selected;assert.equal(id,'REQ-006');
  await send('relationship',{from:'JRN-004',to:id,kind:'requires'});await send('relationship',{from:id,to:'OUT-001',kind:'delivers'});
  const record=state.document.artefacts.find(a=>a.id===id);await send('artefact',{...record,title:'Enquire using the original reference',confirmed:false});assert.equal(state.selected,id);assert.equal(state.document.artefacts.find(a=>a.id===id).confirmed,false);
  assert.equal((await send('relationship',{from:id,to:'MISSING',kind:'delivers'})).status,400);
  assert.equal((await send('relationship',{from:id,to:id,kind:'delivers'})).status,400);
  assert.equal((await send('relationship',{from:id,to:'OUT-001',kind:'delivers'})).status,400);
  const before=state.revision;const old=await request('/api/commands','POST',{revision:1,command:{type:'review'}});assert.equal(old.status,409);assert.equal((await request('/api/project')).body.revision,before);
  await send('review',{});assert.equal(state.document.review.contentVersion,state.document.contentVersion);
  assert.equal((await send('handoff',{})).status,400);await send('handoff',{acknowledge:true});assert.equal(state.document.handoff.contentVersion,state.document.contentVersion);
  await send('artefact',{...state.document.artefacts.find(a=>a.id===id),description:'A revised status enquiry description.'});assert.equal(state.document.review,null);assert.equal(state.document.handoff,null);
  const reopened=(await request('/api/project')).body;assert.equal(reopened.document.artefacts.find(a=>a.id===id).description,'A revised status enquiry description.');
  assert.equal((await request('/api/project','GET',null,'architect-b')).body.document.artefacts.some(a=>a.id===id),false);
  await send('deleteArtefact',{id});assert(!state.document.relationships.some(r=>r.from===id||r.to===id));
  await send('artefact',{type:'requirement',title:'Accept a traceable payment instruction'});assert.equal(state.selected,'REQ-007');assert(findings(state.document).some(f=>f.code==='duplicate'));
  const p=seedProject();p.relationships.push({id:'BROKEN',from:'MISSING',to:'REQ-001',kind:'supports'});assert(findings(p).some(f=>f.code==='broken-link'));
  let ready=applyCommand(seedProject(),{type:'brief',payload:{problem:'A verified problem',goal:'A verified outcome',source:'Workshop record',confirmed:true}}).document;
  for(const a of [...ready.artefacts]){ready=applyCommand(ready,{type:'artefact',payload:{...a,title:a.id==='REQ-005'?'Notify the customer of the recorded outcome':a.title,description:a.id==='REQ-005'?'The service shall expose the recorded payment outcome to the customer.':a.description,acceptance:a.type==='requirement'?(a.acceptance||'Given a recorded outcome, when the customer enquires, then the recorded status and payment reference are returned.'):'',confirmed:true}}).document;}
  assert.deepEqual(findings(ready),[]);ready=applyCommand(ready,{type:'review'}).document;ready=applyCommand(ready,{type:'handoff'}).document;assert(milestones(ready).every(m=>m.done));
  const duplicateContext=applyCommand(ready,{type:'artefact',payload:{...ready.artefacts.find(a=>a.type==='outcome'),id:undefined}}).document;assert(!milestones(duplicateContext).find(m=>m.id==='context').done,'Confirmed duplicate context must not count as ready');
  const snapshot=JSON.stringify(ready);proposals(ready,ready.artefacts[0]);assert.equal(JSON.stringify(ready),snapshot,'Ghost previews must not mutate the project');
  const incomplete=seedProject();incomplete.artefacts=incomplete.artefacts.filter(a=>!['constraint','assumption'].includes(a.type));
  const missing=findings(incomplete).filter(f=>f.code==='missing-type');assert.equal(new Set(missing.map(f=>f.id)).size,2);assert.deepEqual(missing.map(f=>f.artefactType),['constraint','assumption'],'Each missing category must identify its own creation target');
  assert.equal(findings(incomplete).find(f=>f.code==='broken-link').relationshipId,'REL-008','Broken links need a repair target');
  const unreviewed=seedProject(),notify=unreviewed.artefacts.find(a=>a.id==='REQ-005');
  assert.equal(guidance(unreviewed,notify,'model').attention,'Describe the starting condition, action, and observable expected result.','A concrete acceptance gap takes priority over confirmation');
  assert.notEqual(guidance(unreviewed,null,'work').heading,guidance(unreviewed,null,'model').heading);assert.notEqual(guidance(unreviewed,null,'validate').next,guidance(unreviewed,null,'output').next);
  const ghost=proposals(unreviewed,notify,'validate').find(p=>p.id==='acceptance');assert.notEqual(ghost.record.title,notify.title);assert.equal(notify.acceptance,'');
  const contextGhost=proposals(unreviewed,unreviewed.artefacts.find(a=>a.id==='CON-001'),'model')[0];assert.equal(contextGhost.record.type,'assumption');assert.deepEqual(contextGhost.links,[['new','informs','CON-001']]);
  const applied=applyCommand(unreviewed,{type:'artefact',payload:{...contextGhost.record,origin:'suggestion',links:contextGhost.links}}).document;assert(!proposals(applied,applied.artefacts.find(a=>a.id==='CON-001'),'model').some(p=>p.id==='context-evidence'),'Do not repeatedly suggest an existing artefact');
  const md=exportMarkdown(ready);assert(md.includes('REQ-005'));assert(md.includes('Acceptance criteria'));assert(md.includes('REL-001'));assert(md.includes('Chapter 2 handoff'));
  const jsonExport=await worker.fetch(new Request('https://aiw.test/api/export?format=json',{headers:{'oai-authenticated-user-id':'architect-a'}}),env);assert.equal(jsonExport.status,200);assert(jsonExport.headers.get('Content-Disposition').includes('.json'));const bundle=await jsonExport.json();assert.equal(bundle.project.id,'bank-payment');assert(Array.isArray(bundle.validation.findings));
  const mdExport=await worker.fetch(new Request('https://aiw.test/api/export?format=md',{headers:{'oai-authenticated-user-id':'architect-a'}}),env);assert.equal(mdExport.status,200);assert(mdExport.headers.get('Content-Disposition').includes('.md'));assert((await mdExport.text()).includes('REQ-007'));
  const unavailable=await worker.fetch(new Request('https://aiw.test/api/project',{headers:{'oai-authenticated-user-id':'x'}}),{});assert.equal(unavailable.status,503);
  console.log('PASS Private authentication and owner isolation; durable create/edit/reopen; stable and non-reused IDs; explicit confirmation; duplicate and broken-link findings; invalid endpoints rejected; concurrent edits protected; handoff and invalidation; complete milestone progression; ghost non-mutation; JSON/Markdown content; storage failure states.');
}finally{DB.close()}
