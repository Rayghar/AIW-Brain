import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {applyEvidenceCommand,evidenceState,proposalFindings,bundleCanWithdraw,sourceCurrent,evidenceFindings} from './public/evidence-domain.js';
import {reviewDesignStamp,exportSDD,inheritedFindings} from './public/review-domain.js';
import {freezeBaseline} from './scripts/freeze-baseline.mjs';
import {evidenceMarkdown} from './public/evidence-domain.js';
import {recordCitations,citationTarget,briefVersionCited} from './public/provenance.js';
import {draftJourney} from './shared/journey-drafter.js';
import {interpretBrief} from './shared/brief-interpreter.js';
import {sha256} from './public/brain-integrity.js';

const preview=process.argv.includes('--preview'),DB=localDatabase(preview?'.aiw-local/project.sqlite':':memory:'),files=new Map();
const FILES=preview?localFiles():{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}};
const owner=preview?'local-architect':'evidence-owner',env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body,as=owner)=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{...(as?{'oai-authenticated-user-id':as}:{}),...(body?{'Content-Type':'application/json',Origin:'https://aiw.test'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
let state,id;
const source={title:'Operations workshop excerpt',location:'Synthetic QA workshop note, section 2',version:'Draft A',date:'2026-09-20',excerpt:'Repeated payment instructions must not produce repeated financial effects. Operations must be able to investigate a missing settlement response.',status:'Illustrative reference'};
// A baseline is frozen as a job (round 12, GR-STO-02): the baseline it froze is read back whole (frozenWhole).
let frozenWhole=null;
async function send(type,payload={}){if(type==='review.baseline'){const f=await freezeBaseline((path,body)=>api(path,body?'POST':'GET',body),{...payload,project:id});assert(!f.error,f.error);state=f.state;frozenWhole=f.baseline;return state;}const r=await api('/api/commands?project='+id,'POST',{revision:state.revision,command:{type,payload}});assert.equal(r.status,200,type+': '+await r.clone().text());state=await r.json();return state;}
async function reject(type,payload,expected=400,revision=state.revision){const r=await api('/api/commands?project='+id,'POST',{revision,command:{type,payload}});assert.equal(r.status,expected,await r.text());assert.equal((await(await api('/api/project?project='+id)).json()).revision,state.revision);}
const sha256Hex=async text=>sha256(text);
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
  await send('review.checks');await send('review.baseline',{title:'Evidence captured in SDD',stamp:reviewDesignStamp(state.document),reviewed:true});const frozen=frozenWhole;assert.equal(frozen.id,state.document.finalReview.baselines.at(-1).id);
  assert(frozen.markdown.includes('SRC-001'));assert(frozen.markdown.includes(ids.requirement));assert(frozen.markdown.includes('Expiry does not establish'));assert.match(frozen.markdown.slice(frozen.markdown.indexOf('\n## E. Provenance')),/\n- SRC-001 · [^\n]+\n[\s\S]*Co-authoring trail, each task a person applied or withdrew:\n\n- [^\n]*: applied by QA architect[^\n]*; cites SRC-001[^\n]*temporary-guard reject: Expiry does not establish the durable guarantee in this source/,'the frozen architecture edition lists the source and the applied task in Appendix E');
  await send('evidence.source',{...source,id:'SRC-001',version:'Draft B',excerpt:source.excerpt+' References are retained for an agreed recovery window.'});
  t=state.document.coauthoring.tasks[0];assert.equal(sourceCurrent(state.document,t),false);assert.equal(evidenceFindings(state.document).length,1);assert(inheritedFindings(state.document).some(f=>f.id.startsWith('EVIDENCE:')));assert.equal(await(await api('/api/export?project='+id+'&chapter=11&format=md&baseline='+frozen.id)).text(),frozen.markdown);assert(exportSDD(state.document).includes('Source changed; review required'));
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
  // Round 12 (GR-GOV-15, GR-GOV-10): a 15,000-character opening brief keeps its whole text in its evidence version, whose
  // excerpt says how much it shows and where the rest is; a brief changed by command adds a version with its whole text,
  // its hash and who changed it, and a record drafted from the earlier brief still cites the earlier version.
  {
    const sentence=i=>'Clause '+(i+1)+': the returns desk records each parcel once with its reference and tells the customer when the refund is paid. ';
    let long='';for(let i=0;long.length<15000;i++)long+=sentence(i);long=long.slice(0,15000).trim();
    assert.equal(long.length,15000);
    const made=await api('/api/projects','POST',{name:'Returns desk · long brief',template:'blank',brief:long});assert.equal(made.status,201);
    state=await made.json();id=state.document.id;
    let src=state.document.coauthoring.sources.find(x=>x.kind==='brief'),v1=src.versions[0];
    assert.equal(v1.excerpt.length,8000,'the excerpt shows 8,000 characters');assert.equal(v1.text,long,'the version keeps the whole text');assert.equal(v1.hash,await sha256Hex(long));
    assert.deepEqual(v1.excerptOf,{shown:8000,total:15000});
    assert.match(evidenceMarkdown(state.document),new RegExp('Shows the first 8,000 of 15,000 characters; the whole text is kept with '+src.id+' revision 1 \\(text SHA-256 '+v1.hash+'\\)\\.'));
    assert.match(v1.location,/Opening brief typed at project creation · text SHA-256/);assert.deepEqual(v1.author,{kind:'person',by:owner,account:'person'});
    // Records drafted from this brief (the journey drafter, read from the kept source), stored as the project.
    const drafted=draftJourney(state.document,{brief:interpretBrief(long,{name:'Returns desk'})}).document;
    await DB.prepare('UPDATE projects SET document=? WHERE owner_id=? AND id=?').bind(JSON.stringify(drafted),owner,id).run();
    state=await(await api('/api/project?project='+id)).json();
    const fromBrief=state.document.artefacts.find(a=>a.provenance?.journey&&a.provenance.journey.mode!=='model');assert.ok(fromBrief,'a record drafted from the brief');
    assert.deepEqual(recordCitations(state.document,fromBrief).filter(c=>c.kind==='source').map(c=>[c.sourceId,c.revision]),[[src.id,1]]);
    // The brief changed by command: a second version with its whole text, hash and author; the first is as it was.
    const revised=long.slice(0,9000)+' The desk also accepts returns by post.';
    await send('brief',{...state.document.brief,problem:revised},{});
    src=state.document.coauthoring.sources.find(x=>x.id===src.id);
    assert.equal(src.versions.length,2);assert.deepEqual([src.versions[0].text,src.versions[0].hash],[long,v1.hash],'the earlier version is unchanged');
    const v2=src.versions[1];assert.deepEqual([v2.revision,v2.text,v2.hash],[2,revised,await sha256Hex(revised)]);
    assert.deepEqual(v2.author,{kind:'person',by:owner,account:'person'});assert.match(v2.location,new RegExp('changed by '+owner));
    assert.deepEqual(v2.excerptOf,{shown:8000,total:revised.length});
    const still=state.document.artefacts.find(a=>a.id===fromBrief.id);
    assert.deepEqual(recordCitations(state.document,still).filter(c=>c.kind==='source').map(c=>[c.sourceId,c.revision]),[[src.id,1]],'a record drafted before the change still cites the earlier version');
    assert.match(citationTarget(state.document,{kind:'source',sourceId:src.id,revision:1}).label,new RegExp(src.id+' · revision 1'));
    // A record drafted after the change (its draft's time) cites the version current then.
    assert.deepEqual(briefVersionCited(state.document,new Date(Date.now()+1000).toISOString()),{sourceId:src.id,revision:2});
    assert.deepEqual(briefVersionCited(state.document,v1.at),{sourceId:src.id,revision:1});
    console.log('PASS a 15,000-character brief keeps its whole text in its evidence version, whose excerpt says it shows the first 8,000 and where the rest is; a brief changed by command adds a version with its whole text, hash and author, the earlier one unchanged, and a record drafted before still cites the earlier version');
  }
  console.log('Evidence QA passed: atomic linked drafts, no automatic confirmation, blank isolation, revisions, stale sources, frozen SDD, persistence, owner isolation, optimistic conflicts, and guarded withdrawal.');
 }
}finally{DB.close();}
