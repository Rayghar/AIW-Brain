import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {changeEvents,changeSummary,changeItemState,changeTargetStamp,isCurrentChange,latestChange,withChanges,changeCauses,causeStamp} from './public/changes-domain.js';
import {changeDigest,changeSummaryMarkdown,CAUSE_ROWS} from './public/change-summary.js';
import {changeJournalPage} from './change-journal.js';
import {reviewDesignStamp} from './public/review-domain.js';
import {freezeBaseline} from './scripts/freeze-baseline.mjs';

const preview=process.argv.includes('--preview'),DB=localDatabase(preview?'.aiw-local/project.sqlite':':memory:');
const bytes=new Map(),FILES=preview?localFiles():{async put(k,v){bytes.set(k,v)},async get(k){return bytes.has(k)?{text:async()=>bytes.get(k)}:null},async delete(k){bytes.delete(k)}};
const owner=preview?'local-architect':'change-author',env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body,as=owner,extra={})=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{...(as?{'oai-authenticated-user-id':as}:{}),...(body?{'Content-Type':'application/json',Origin:'https://aiw.test'}:{})},...(body?{body:JSON.stringify(body)}:{})}),{...env,...extra});
let state,id;
// A baseline is frozen as a job (round 12, GR-STO-02); the baseline it froze is read back whole (frozenWhole).
let frozenWhole=null;
async function command(type,payload={}){if(type==='review.baseline'){const f=await freezeBaseline((path,body)=>api(path,body?'POST':'GET',body),{...payload,project:id});assert(!f.error,f.error);state=f.state;frozenWhole=f.baseline;return state;}const r=await api('/api/commands?project='+id,'POST',{revision:state.revision,command:{type,payload}});assert.equal(r.status,200,type+': '+await r.clone().text());state=await r.json();return state;}
const entry=()=>changeEvents(state.document).at(-1),item=()=>entry().items.find(i=>i.chapter===2);
const review=(extra={})=>({changeId:entry().id,itemKey:item().key,targetStamp:changeTargetStamp(state.document,item()),outcome:'unchanged',reviewer:'Synthetic architect',rationale:'The scenario remains applicable to the revised repeat-request criterion.',evidence:'Synthetic model walkthrough, no bank verification',reviewed:true,...extra});
async function rejected(payload,status=400){const revision=state.revision,r=await api('/api/commands?project='+id,'POST',{revision,command:{type:'change.review',payload}});assert.equal(r.status,status,await r.clone().text());assert.equal((await(await api('/api/project?project='+id)).json()).revision,revision);}
try{
  state=await(await api('/api/projects','POST',{name:'Bank payment · Change review QA',template:'bank-payment'})).json();id=state.document.id;
  assert.equal(changeEvents(state.document).length,0);
  await command('review.checks');await command('review.baseline',{title:'Before requirement revision · QA only',stamp:reviewDesignStamp(state.document),reviewed:true});
  const frozen=frozenWhole,frozenText=frozen.markdown;assert.equal(frozen.id,state.document.finalReview.baselines[0].id);
  const requirement=state.document.artefacts.find(a=>a.id==='REQ-001'),originalAcceptance=requirement.acceptance;
  await command('artefact',{...requirement,acceptance:'Given a repeated instruction during a timeout, when its reference is reused, then return the original payment reference and an explicit pending status without a second debit.',confirmed:false});
  assert.equal(entry().id,'CHG-001');assert.equal(entry().fields.find(f=>f.key==='acceptance').before,originalAcceptance);
  assert.equal(new Set(entry().items.map(i=>i.chapter)).size,9);assert(entry().items.find(i=>i.chapter===5).via.length);
  const stored=JSON.parse((await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,id).first()).document);
  assert.equal(stored.changes.schemaVersion,2);assert(stored.changes.head.key.startsWith('changes/')&&stored.changes.head.count===1&&stored.changes.eventCount===1,'the journal head segment holds the event');assert(!stored.changes.events,'Journal bytes stay out of the D1 row');
  if(preview){await mkdir('.aiw-local',{recursive:true});await writeFile('.aiw-local/change-qa.json',JSON.stringify({projectId:id,changeId:entry().id,itemKey:item().key},null,2));console.log('Preview fixture: '+id);}
  else{
    const total=changeSummary(state.document).total;
    await command('review.checks');
    const unreviewed=await api('/api/commands?project='+id,'POST',{revision:state.revision,command:{type:'review.record',payload:{stamp:reviewDesignStamp(state.document),outcome:'Ready for governance',reviewer:'Synthetic architect',reference:'QA walkthrough',rationale:'Synthetic gate check',reviewed:true}}});
    assert.equal(unreviewed.status,400);assert((await unreviewed.json()).error.includes('open architecture-change reviews'),'Open change reviews prevent an unconditional readiness claim');
    await rejected(review({reviewed:false}));await rejected(review({evidence:''}));await rejected(review({targetStamp:'stale'}));await rejected(review({outcome:'updated'}));await rejected(review({outcome:'follow-up',owner:'',action:''}));
    assert.equal((await api('/api/commands?project='+id,'POST',{revision:state.revision,command:{type:'change.review',payload:review()}},'other-owner')).status,404);
    assert.equal((await api('/api/project?project='+id,'GET',null,null)).status,401);
    await command('change.review',review({outcome:'follow-up',owner:'Payments architect',action:'Compare the pending response to the repeated-delivery scenario and record the result.'}));
    assert.equal(changeSummary(state.document).open,total);assert.equal(changeSummary(state.document).followUp,1);
    const staleRevision=state.revision;
    await command('change.review',review());assert.equal(changeSummary(state.document).open,total-1);assert.equal(item().reviews.length,2);
    assert.equal((await api('/api/commands?project='+id,'POST',{revision:staleRevision,command:{type:'change.review',payload:review()}})).status,409);
    const driver=state.document.quality.drivers.find(d=>d.id===item().id);
    await command('quality.driver',{...driver,response:driver.response+' Preserve an explicit pending response during the timeout.'});
    assert.equal(changeItemState(state.document,entry(),item()).status,'stale');assert.equal(item().reviews.length,2);
    await command('change.review',review({outcome:'updated'}));assert(changeItemState(state.document,entry(),item()).complete);
    const beforeClosure=JSON.stringify(state.document.quality);
    for(const target of entry().items.filter(i=>!changeItemState(state.document,entry(),i).complete))await command('change.review',review({itemKey:target.key,targetStamp:changeTargetStamp(state.document,target),rationale:'Synthetic review of the recorded boundary and its requirement links. No production evidence claimed.'}));
    assert.equal(changeSummary(state.document).open,0);assert.equal(JSON.stringify(state.document.quality),beforeClosure,'Assessments do not silently repair the underlying design');
    const onceClosed=entry().id;
    await command('review.checks');await command('review.baseline',{title:'Recorded change review · QA only',stamp:reviewDesignStamp(state.document),reviewed:true});
    const reviewedSnapshot=frozenWhole;assert.equal(reviewedSnapshot.id,state.document.finalReview.baselines.at(-1).id);assert.equal(reviewedSnapshot.review.changes.events.at(-1).id,onceClosed);assert(reviewedSnapshot.markdown.includes('affected reviews resolved'));
    const liveBefore=JSON.stringify(state.document.changes);
    state=await(await api('/api/project?project='+id)).json();assert.equal(JSON.stringify(state.document.changes),liveBefore,'Saved assessments reopen intact');
    const firstEvent=entry().id,priorReviews=entry().items.reduce((n,i)=>n+i.reviews.length,0);
    await command('artefact',{...state.document.artefacts.find(a=>a.id==='REQ-001'),owner:'Payments operations architect'});
    assert.equal(entry().id,'CHG-002');assert(!isCurrentChange(state.document,changeEvents(state.document)[0]));assert.equal(changeEvents(state.document)[0].items.reduce((n,i)=>n+i.reviews.length,0),priorReviews);
    await rejected(review({changeId:firstEvent}));assert(changeSummary(state.document).open>0);
    const frozenSDD=async b=>(await api('/api/export?project='+id+'&chapter=11&format=md&baseline='+b)).text();
    assert.equal(await frozenSDD(frozen.id),frozenText,'Earlier SDD stays immutable');assert.equal(await frozenSDD(reviewedSnapshot.id),reviewedSnapshot.markdown);
    const link=state.document.relationships.find(l=>l.from==='REQ-001'||l.to==='REQ-001');
    await command('deleteRelationship',{id:link.id});assert(entry().fields.some(f=>f.key==='relationships'),'Relationship changes are reviewable');
    // Round 12 (GR-GOV-24): REQ-001 leaves the design only through the one retire path, and not while its trail names it:
    // the hard delete is refused, and so is the retirement, naming who names it. Its latest change keeps the trail to review.
    {const refuse=async(type,payload,pattern)=>{const revision=state.revision,r=await api('/api/commands?project='+id,'POST',{revision,command:{type,payload}});assert.equal(r.status,400);assert.match((await r.json()).error,pattern);assert.equal((await(await api('/api/project?project='+id)).json()).revision,revision);};
     await refuse('deleteArtefact',{id:'REQ-001'},/leaves the design through Retire/);await refuse('record.retire',{ids:['REQ-001'],chapter:1,reason:'Replaced by a later requirement.'},/REQ-001 is still named by .*Chapter 2 · QD-/);}
    await command('artefact',{...state.document.artefacts.find(a=>a.id==='REQ-001'),acceptance:'Given a held instruction, when it is released, then the original reference is kept.'});assert(entry().items.length,'The latest change of the requirement keeps its downstream trail to review');
    assert.equal((await api('/api/export?project='+id+'&chapter=11&format=html&view=1')).status,200);
    // Round 12 (D-05): the SDD prints the latest change of each record and what it leaves to review, counted by change;
    // every change and every recorded review, superseded ones included, is in the change journal annex.
    const html=await(await api('/api/export?project='+id+'&chapter=11&format=html&view=1')).text();assert(html.includes('Architecture change review'));assert(html.includes('Changes to review')&&html.includes('remain open across 1 change'),'the SDD counts the change still to review once');
    const annex=await api('/api/export?project='+id+'&chapter=11&document=changes&format=md&page=1');assert.equal(annex.status,200);const annexText=await annex.text();
    // Round 12 (A3: GR-STO-07, accepted by test:journal-archive): the three saves of REQ-001 one person made after the
    // review (its owner, a link, its acceptance) fold into one change under the id of the first, CHG-002, and a superseded
    // change names the latest change of its record. The reviewed CHG-001 is never folded, and none of its reviews is lost.
    const latestId=latestChange(state.document,'REQ-001').id;assert.equal(latestId,'CHG-002');assert.equal(entry().id,latestId);assert.equal(entry().folded,3);assert.deepEqual(entry().fields.map(f=>f.key),['owner','relationships','acceptance']);
    const section=ref=>annexText.split('\n## ').find(s=>s.startsWith(ref+' · '))||'',superseded=section(firstEvent),reviewLines=superseded.split('\n').filter(l=>l.startsWith('  Review '));
    assert(superseded.includes('superseded by '+latestId)&&superseded.includes('Reviews recorded on this change before it was superseded')&&reviewLines.length===priorReviews&&reviewLines.every(l=>l.includes(' · Synthetic architect · ')),'the journal annex keeps every recorded review, the superseded ones included');
    assert(section(latestId).includes('latest change of this record')&&section(latestId).includes('Given a held instruction, when it is released, then the original reference is kept.'),'the annex prints the latest save of the folded change');
    const revision=state.revision;
    const failed=await api('/api/commands?project='+id,'POST',{revision,command:{type:'change.review',payload:review({outcome:'unlinked'})}},owner,{FILES:{...FILES,put(){throw Error('Synthetic journal write failure')}}});
    assert.equal(failed.status,503);assert.equal((await(await api('/api/project?project='+id)).json()).revision,revision,'Storage failure does not commit an incomplete journal');
    const raw=structuredClone(state.document);delete raw.changes;raw.workspace.lastImpact={at:'2026-09-19T00:00:00Z',requirements:[{id:'REQ-002',title:'Earlier edited requirement'}],groups:[]};
    const legacy=withChanges(raw);assert(legacy.changes.events[0].legacy);assert.equal(legacy.changes.events[0].before,null,'Migration never fabricates missing previous wording');
    // Round 12 (D-05): the journal annex, a page at a time, as Markdown, CSV and JSON; pages are numbered from 1.
    const page=await(await api('/api/export?project='+id+'&chapter=11&document=changes&format=json&page=1')).json();
    assert.equal(page.schema,'aiw.change-journal-page.v1');assert.equal(page.eventCount,changeEvents(state.document).length);assert.equal(page.pages,1);assert.deepEqual(page.events.map(e=>e.id),changeEvents(state.document).map(e=>e.id));
    assert.deepEqual(page,JSON.parse(JSON.stringify(changeJournalPage(state.document,{page:1}))),'the route serves the journal page the domain reads');
    assert(page.events[0].status==='superseded'&&page.events[0].items.every(i=>i.reviews.length),'an earlier change lists the records reviewed on it');assert(page.events.at(-1).status==='latest'&&page.events.at(-1).items.length===page.events.at(-1).affected,'the latest change lists every affected record');
    const csv=await api('/api/export?project='+id+'&chapter=11&document=changes&format=csv');assert.equal(csv.status,200);assert.match(csv.headers.get('content-type'),/text\/csv/);const csvText=await csv.text();assert(csvText.startsWith('"change","recorded","by"')&&csvText.split('\r\n').length===page.eventCount+2,'one row per change');
    for(const [query,status] of [['&page=2',404],['&page=0',400],['&page=x',400],['&format=xml',400]])assert.equal((await api('/api/export?project='+id+'&chapter=11&document=changes'+query)).status,status,query);
    assert.equal((await api('/api/export?project='+id+'&chapter=11&document=changes&format=md','GET',null,'other-owner')).status,404,'another account reads no journal');
    // Round 12 (D-05, G-33): one review for a whole change. Every open affected record of the latest change gets the review with
    // its own stamp; the stamp of what the reviewer saw is checked first; a later edit of one record reopens it alone.
    const req2=state.document.artefacts.find(a=>a.id==='REQ-002');
    await command('artefact',{...req2,acceptance:(req2.acceptance||'')+' The status is returned within the agreed response time.'});
    const cause=entry(),causes=changeCauses(state.document);assert.equal(cause.source?.id||cause.requirementId,'REQ-002');assert(causes.some(c=>c.id===cause.id&&c.open===cause.items.length&&c.affected===cause.items.length),'the change is one cause with its affected count');
    const whole=(extra={})=>({scope:'cause',changeId:cause.id,stamp:causeStamp(state.document,cause),outcome:'unchanged',reviewer:'Synthetic architect',rationale:'Every linked record still meets the revised acceptance criterion.',evidence:'Synthetic walkthrough of the linked records',reviewed:true,...extra});
    await rejected(whole({stamp:'stale'}));await rejected(whole({reviewed:false}));await rejected(whole({outcome:'updated'}));await rejected(whole({outcome:'follow-up'}));
    await command('change.review',whole());
    assert.equal(changeSummary(state.document,entry()).open,0,'one review closes every affected record of the change');assert(!changeCauses(state.document).some(c=>c.id===cause.id));
    assert(entry().items.every(i=>i.reviews.at(-1).scope==='cause'&&i.reviews.at(-1).targetStamp===changeTargetStamp(state.document,i)),'each record keeps the review with its own stamp');
    await rejected(whole({stamp:causeStamp(state.document,entry())}));
    const reopened=entry().items.find(i=>i.chapter===2),scenario=state.document.quality.drivers.find(d=>d.id===reopened.id);
    await command('quality.driver',{...scenario,requirementIds:scenario.requirementIds.filter(r=>r!=='REQ-001'),response:scenario.response+' Within the agreed response time.'});
    assert.deepEqual(entry().items.filter(i=>!changeItemState(state.document,entry(),i).complete).map(i=>i.key),[reopened.key],'a later edit reopens that record alone');
    assert.equal(changeCauses(state.document).find(c=>c.id===cause.id)?.open,1,'the change is to review again, for one record');
    // The SDD's summary names the CAUSE_ROWS changes that leave the most records open and counts the rest (SDD-SPEC
    // principle 4); the reader gives the open reviews by chapter and the changed records by their own chapter.
    const many=structuredClone(state.document);
    for(let k=0;k<CAUSE_ROWS+3;k++)many.changes.events.push({id:'CHG-9'+String(k).padStart(2,'0'),source:{chapter:8,id:'synthetic-'+k,ref:'IF-9'+String(k).padStart(2,'0'),kind:'contract',title:'Synthetic contract '+k},title:'Synthetic contract '+k,at:'2026-10-07T00:00:'+String(k).padStart(2,'0')+'.000Z',actor:'change-author',before:{title:'a'},after:{title:'b'},fields:[{key:'title',label:'Name',before:'a',after:'b'}],items:Array.from({length:k+1},(_,i)=>({id:'REQ-001',ref:'REQ-001',title:'Synthetic',chapter:1+(i%2),key:(1+(i%2))+':synthetic-'+k+'-'+i,why:'',via:[],capturedStamp:'x',reviews:[]}))});
    const digest=changeDigest(many),summary=changeSummaryMarkdown(many),rows=summary.split('\n').filter(l=>/^\| CHG-/.test(l));
    const order=digest.latest.filter(c=>c.open).sort((a,b)=>b.open-a.open||String(b.at).localeCompare(String(a.at))||b.id.localeCompare(a.id)),left=order.slice(CAUSE_ROWS);
    assert.equal(rows.length,CAUSE_ROWS,'twelve changes to review are listed');assert.deepEqual(rows.map(r=>r.split(' | ')[0].slice(2)),order.slice(0,CAUSE_ROWS).map(c=>c.id),'the largest first');assert(rows.some(r=>r.startsWith('| CHG-914 |')));
    assert(summary.includes('And '+left.length+' more changes to review, with '+left.reduce((n,c)=>n+c.open,0)+' affected records open, are listed in the change journal annex.'),'the rest are counted with a pointer to the annex');
    assert.deepEqual(digest.sources.find(s=>s.chapter===8),{chapter:8,title:'Interfaces & data',records:CAUSE_ROWS+3,removed:0,requested:0,causes:CAUSE_ROWS+3});
    assert.equal(digest.chapters.reduce((n,c)=>n+c.open,0),digest.open);assert.equal(digest.causes,changeCauses(many).length);
    console.log('PASS Change review: real field/link diffs, nine chapters, evidence gates, owned follow-up, complete review, scoped invalidation, retained history, superseded edits, removed requirements, durable private journals, owner isolation, CAS, failed-write preservation, SDD summary by change (the twelve largest, the rest counted), the paged journal annex (Markdown, CSV, JSON), one review for a whole change, and immutable baselines.');
  }
}finally{DB.close();}
