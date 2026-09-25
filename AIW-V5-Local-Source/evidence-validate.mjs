import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {applyEvidenceCommand,evidenceState,proposalFindings,bundleCanWithdraw,sourceCurrent,evidenceFindings} from './public/evidence-domain.js';
import {reviewDesignStamp,exportSDD,inheritedFindings} from './public/review-domain.js';

const preview=process.argv.includes('--preview'),DB=localDatabase(preview?'.aiw-local/project.sqlite':':memory:'),files=new Map();
const FILES=preview?localFiles():{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}};
const owner=preview?'local-architect':'evidence-owner',env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body,as=owner)=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{...(as?{'oai-authenticated-user-id':as}:{}),...(body?{'Content-Type':'application/json',Origin:'https://aiw.test'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
let state,id;
const source={title:'Operations workshop excerpt',location:'Synthetic QA workshop note, section 2',version:'Draft A',date:'2026-09-20',excerpt:'Repeated payment instructions must not produce repeated financial effects. Operations must be able to investigate a missing settlement response.',status:'Illustrative reference'};
async function send(type,payload={}){const r=await api('/api/commands?project='+id,'POST',{revision:state.revision,command:{type,payload}});assert.equal(r.status,200,type+': '+await r.clone().text());state=await r.json();return state;}
async function reject(type,payload,expected=400,revision=state.revision){const r=await api('/api/commands?project='+id,'POST',{revision,command:{type,payload}});assert.equal(r.status,expected,await r.text());assert.equal((await(await api('/api/project?project='+id)).json()).revision,state.revision);}
async function create(name,template){state=await(await api('/api/projects','POST',{name,template})).json();id=state.document.id;return id;}
try{
 if(preview){const bank=await create('Bank Payment Journey · Evidence QA','bank-payment');await send('evidence.source',source);const blank=await create('Service onboarding · Evidence QA','blank');await mkdir('.aiw-local',{recursive:true});await writeFile('.aiw-local/evidence-qa.json',JSON.stringify({bank,blank},null,2));console.log(JSON.stringify({bank,blank}));}
 else{
  await create('Evidence integration test','bank-payment');
  const before=JSON.stringify(state.document);
  assert.throws(()=>applyEvidenceCommand(state.document,{type:'evidence.source',payload:{...source,status:'Confirmed'}}),/reviewer/);assert.equal(JSON.stringify(state.document),before);
  await send('evidence.source',source);assert.equal(state.selected,'SRC-001');
  const savedRevision=state.revision,failed=await worker.fetch(new Request('https://aiw.test/api/commands?project='+id,{method:'POST',headers:{'oai-authenticated-user-id':owner,'Content-Type':'application/json',Origin:'https://aiw.test'},body:JSON.stringify({revision:state.revision,command:{type:'evidence.source',payload:{...source,id:'SRC-001',version:'Failed write'}}})}),{...env,FILES:{...FILES,put:async()=>{throw Error('Synthetic evidence write failure');}}});assert.equal(failed.status,503);state=await(await api('/api/project?project='+id)).json();assert.equal(state.revision,savedRevision);assert.equal(state.document.coauthoring.sources[0].versions.length,1,'Failed evidence write preserves the last saved revision');
  const designBeforeTask=reviewDesignStamp(state.document);
  await send('evidence.task',{sourceId:'SRC-001',intent:'duplicate',title:'Protect repeated instructions'});
  assert.equal(reviewDesignStamp(state.document),designBeforeTask,'Starting a draft task does not invalidate design review');
  await send('evidence.answers',{id:'SOL-001',need:'A repeated instruction shall reuse the original result.',acceptance:'Given the original reference, concurrent repeated attempts return one authoritative effect.',owner:'QA operations',unknowns:'Retention duration and concurrency evidence require review.',outcomeId:'OUT-002'});
  await send('evidence.prepare',{id:'SOL-001'});let t=state.document.coauthoring.tasks[0];
  assert.equal(t.proposal.driver.targetValue,'','No numerical target is invented');assert.equal(t.proposal.requirement.owner,'QA operations');
  const q=structuredClone(t.proposal);q.requirement.title='Stable financial effect during repeated delivery';q.driver.unit='unintended effects';q.driver.targetValue='0';q.driver.window='Each instruction over its retained lifetime';q.driver.measurement='Concurrent replay and restart verification against the durable result';
  await send('evidence.proposal',{id:t.id,proposal:q});assert.equal(state.document.coauthoring.tasks[0].versions.length,1);
  await send('evidence.pattern',{id:t.id,patternId:'temporary-guard',outcome:'Reject',reason:'Expiry does not establish the durable guarantee in this source.'});
  await reject('evidence.apply',{id:t.id,reviewer:'QA architect',reason:'Reviewed',reviewed:false});
  const oldRevision=state.revision,counts=[state.document.artefacts.length,state.document.quality.drivers.length,state.document.decisions.records.length];
  await send('evidence.apply',{id:t.id,reviewer:'QA architect',reason:'Use linked drafts to test the design; targets and source remain unconfirmed.',reviewed:true});
  t=state.document.coauthoring.tasks[0];const ids=t.applied.ids;
  assert.deepEqual([state.document.artefacts.length,state.document.quality.drivers.length,state.document.decisions.records.length],counts.map(n=>n+1));
  const r=state.document.artefacts.find(r=>r.id===ids.requirement),d=state.document.quality.drivers.find(d=>d.id===ids.driver),a=state.document.decisions.records.find(d=>d.id===ids.decision);
  assert.equal(r.confirmed,false);assert.equal(d.targetConfirmed,false);assert.equal(a.status,'draft');assert.equal(a.governance,null);assert.deepEqual(d.requirementIds,[r.id]);assert.deepEqual(a.driverIds,[d.id]);assert.deepEqual(a.requirementIds,[r.id]);assert.equal(a.topic,'duplicates');
  assert(state.document.relationships.some(e=>e.from===r.id&&e.to==='OUT-002'));
  assert(bundleCanWithdraw(state.document,t));assert.notEqual(reviewDesignStamp(state.document),designBeforeTask);
  await reject('evidence.apply',{id:t.id,reviewed:true,reviewer:'QA',reason:'Duplicate click'});
  await reject('evidence.source',source,409,oldRevision);
  const snapshot=JSON.stringify(state.document.coauthoring);state=await(await api('/api/project?project='+id)).json();assert.equal(JSON.stringify(state.document.coauthoring),snapshot);
  const row=await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,id).first(),stored=JSON.parse(row.document);assert(stored.coauthoring.storageKey.startsWith('evidence/'+owner+'/'+id+'/'));assert(!stored.coauthoring.sources,'Evidence payload stays in private object storage');
  await send('review.checks');await send('review.baseline',{title:'Evidence captured in SDD',stamp:reviewDesignStamp(state.document),reviewed:true});const frozen=state.document.finalReview.baselines.at(-1);
  assert(frozen.markdown.includes('SRC-001'));assert(frozen.markdown.includes(ids.requirement));assert(frozen.markdown.includes('Expiry does not establish'));
  await send('evidence.source',{...source,id:'SRC-001',version:'Draft B',excerpt:source.excerpt+' References are retained for an agreed recovery window.'});
  t=state.document.coauthoring.tasks[0];assert.equal(sourceCurrent(state.document,t),false);assert.equal(evidenceFindings(state.document).length,1);assert(inheritedFindings(state.document).some(f=>f.id.startsWith('EVIDENCE:')));assert.equal(exportSDD(state.document,frozen.id),frozen.markdown);assert(exportSDD(state.document).includes('Source changed; review required'));
  await reject('evidence.reconcile',{id:t.id,reviewed:false,reason:'Assumed unchanged',reviewer:'QA'});
  await send('evidence.reconcile',{id:t.id,reviewed:true,reason:'Reviewed all three records; retention remains an explicit unresolved assumption.',reviewer:'QA architect'});assert(sourceCurrent(state.document,state.document.coauthoring.tasks[0]));
  await send('artefact',{...r,acceptance:r.acceptance+' Retention evidence is required.'});assert.equal(bundleCanWithdraw(state.document,state.document.coauthoring.tasks[0]),false);await reject('evidence.withdraw',{id:t.id,reviewed:true,reason:'Must preserve revised work'});
  assert.equal((await api('/api/project?project='+id,'GET',null,'another-owner')).status,404);assert.equal((await api('/api/project?project='+id,'GET',null,'')).status,401);
  const jsonExport=await api('/api/export?project='+id+'&chapter=11&format=json');assert.equal(jsonExport.status,200);assert((await jsonExport.text()).includes('SRC-001'));
  await create('Non-payment service','blank');await send('evidence.source',{...source,title:'Onboarding need',excerpt:'New staff need to request access to a learning service.',location:'Synthetic onboarding brief'});
  await reject('evidence.task',{sourceId:'SRC-001',intent:'duplicate'});await send('evidence.task',{sourceId:'SRC-001',intent:'custom'});
  await send('evidence.answers',{id:'SOL-001',need:'Staff shall request access to the learning service.',acceptance:'An authorised request is acknowledged with a traceable reference.',owner:'Learning owner'});await send('evidence.prepare',{id:'SOL-001'});
  t=state.document.coauthoring.tasks[0];assert(!/payment|settlement|ledger/i.test(JSON.stringify(t.proposal)));assert.equal(t.proposal.driver.targetValue,'');assert(proposalFindings(state.document,t).some(f=>f.level==='error'));
  const generic=structuredClone(t.proposal);generic.driver.stimulus='A staff member requests access.';generic.driver.conditions='During the agreed service hours.';await send('evidence.proposal',{id:t.id,proposal:generic});
  const modelBefore=JSON.stringify([state.document.artefacts,state.document.quality,state.document.decisions]);
  await send('evidence.source',{...source,id:'SRC-001',title:'Onboarding need',excerpt:'New staff need to request and track learning access.',location:'Synthetic onboarding brief'});await reject('evidence.apply',{id:t.id,reviewed:true,reviewer:'QA',reason:'Stale must not apply'});assert.equal(JSON.stringify([state.document.artefacts,state.document.quality,state.document.decisions]),modelBefore);
  await send('evidence.refresh',{id:t.id,reviewed:true,reason:'The draft already uses a traceable reference; tracking detail remains open.'});await send('evidence.apply',{id:t.id,reviewed:true,reviewer:'QA',reason:'Apply drafts with an incomplete measurement target explicitly retained.'});
  assert.equal(state.document.quality.drivers[0].targetValue,'');assert(bundleCanWithdraw(state.document,state.document.coauthoring.tasks[0]));await send('evidence.withdraw',{id:t.id,reviewed:true,reason:'QA confirms a bounded withdrawal.'});assert.equal(state.document.artefacts.length,0);assert.equal(state.document.quality.drivers.length,0);assert.equal(state.document.decisions.records.length,0);assert.equal(evidenceState(state.document).tasks[0].status,'withdrawn');
  console.log('Evidence QA passed: atomic linked drafts, no automatic confirmation, blank isolation, revisions, stale sources, frozen SDD, persistence, owner isolation, optimistic conflicts, and guarded withdrawal.');
 }
}finally{DB.close();}
