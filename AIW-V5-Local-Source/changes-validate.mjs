import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {changeEvents,changeSummary,changeItemState,changeTargetStamp,isCurrentChange,withChanges} from './public/changes-domain.js';
import {reviewDesignStamp,exportSDD} from './public/review-domain.js';

const preview=process.argv.includes('--preview'),DB=localDatabase(preview?'.aiw-local/project.sqlite':':memory:');
const bytes=new Map(),FILES=preview?localFiles():{async put(k,v){bytes.set(k,v)},async get(k){return bytes.has(k)?{text:async()=>bytes.get(k)}:null},async delete(k){bytes.delete(k)}};
const owner=preview?'local-architect':'change-author',env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body,as=owner,extra={})=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{...(as?{'oai-authenticated-user-id':as}:{}),...(body?{'Content-Type':'application/json',Origin:'https://aiw.test'}:{})},...(body?{body:JSON.stringify(body)}:{})}),{...env,...extra});
let state,id;
async function command(type,payload={}){const r=await api('/api/commands?project='+id,'POST',{revision:state.revision,command:{type,payload}});assert.equal(r.status,200,type+': '+await r.clone().text());state=await r.json();return state;}
const entry=()=>changeEvents(state.document).at(-1),item=()=>entry().items.find(i=>i.chapter===2);
const review=(extra={})=>({changeId:entry().id,itemKey:item().key,targetStamp:changeTargetStamp(state.document,item()),outcome:'unchanged',reviewer:'Synthetic architect',rationale:'The scenario remains applicable to the revised repeat-request criterion.',evidence:'Synthetic model walkthrough, no bank verification',reviewed:true,...extra});
async function rejected(payload,status=400){const revision=state.revision,r=await api('/api/commands?project='+id,'POST',{revision,command:{type:'change.review',payload}});assert.equal(r.status,status,await r.clone().text());assert.equal((await(await api('/api/project?project='+id)).json()).revision,revision);}
try{
  state=await(await api('/api/projects','POST',{name:'Bank payment · Change review QA',template:'bank-payment'})).json();id=state.document.id;
  assert.equal(changeEvents(state.document).length,0);
  await command('review.checks');await command('review.baseline',{title:'Before requirement revision · QA only',stamp:reviewDesignStamp(state.document),reviewed:true});
  const frozen=state.document.finalReview.baselines[0],frozenText=frozen.markdown;
  const requirement=state.document.artefacts.find(a=>a.id==='REQ-001'),originalAcceptance=requirement.acceptance;
  await command('artefact',{...requirement,acceptance:'Given a repeated instruction during a timeout, when its reference is reused, then return the original payment reference and an explicit pending status without a second debit.',confirmed:false});
  assert.equal(entry().id,'CHG-001');assert.equal(entry().fields.find(f=>f.key==='acceptance').before,originalAcceptance);
  assert.equal(new Set(entry().items.map(i=>i.chapter)).size,9);assert(entry().items.find(i=>i.chapter===5).via.length);
  const stored=JSON.parse((await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,id).first()).document);
  assert(stored.changes.storageKey.startsWith('changes/'));assert(!stored.changes.events,'Journal bytes stay out of the D1 row');
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
    const reviewedSnapshot=state.document.finalReview.baselines.at(-1);assert.equal(reviewedSnapshot.review.changes.events.at(-1).id,onceClosed);assert(reviewedSnapshot.markdown.includes('affected reviews resolved'));
    const liveBefore=JSON.stringify(state.document.changes);
    state=await(await api('/api/project?project='+id)).json();assert.equal(JSON.stringify(state.document.changes),liveBefore,'Saved assessments reopen intact');
    const firstEvent=entry().id,priorReviews=entry().items.reduce((n,i)=>n+i.reviews.length,0);
    await command('artefact',{...state.document.artefacts.find(a=>a.id==='REQ-001'),owner:'Payments operations architect'});
    assert.equal(entry().id,'CHG-002');assert(!isCurrentChange(state.document,changeEvents(state.document)[0]));assert.equal(changeEvents(state.document)[0].items.reduce((n,i)=>n+i.reviews.length,0),priorReviews);
    await rejected(review({changeId:firstEvent}));assert(changeSummary(state.document).open>0);
    assert.equal(exportSDD(state.document,frozen.id),frozenText,'Earlier SDD stays immutable');assert.equal(exportSDD(state.document,reviewedSnapshot.id),reviewedSnapshot.markdown);
    const link=state.document.relationships.find(l=>l.from==='REQ-001'||l.to==='REQ-001');
    await command('deleteRelationship',{id:link.id});assert(entry().fields.some(f=>f.key==='relationships'),'Relationship changes are reviewable');
    await command('deleteArtefact',{id:'REQ-001'});assert.equal(entry().after,null);assert(entry().items.length,'Removed requirement preserves its previous downstream trail');
    assert.equal((await api('/api/export?project='+id+'&chapter=11&format=html&view=1')).status,200);
    const html=await(await api('/api/export?project='+id+'&chapter=11&format=html&view=1')).text();assert(html.includes('Architecture change review'));assert(html.includes('Synthetic architect'));
    const revision=state.revision;
    const failed=await api('/api/commands?project='+id,'POST',{revision,command:{type:'change.review',payload:review({outcome:'unlinked'})}},owner,{FILES:{...FILES,put(){throw Error('Synthetic journal write failure')}}});
    assert.equal(failed.status,503);assert.equal((await(await api('/api/project?project='+id)).json()).revision,revision,'Storage failure does not commit an incomplete journal');
    const raw=structuredClone(state.document);delete raw.changes;raw.workspace.lastImpact={at:'2026-09-19T00:00:00Z',requirements:[{id:'REQ-002',title:'Earlier edited requirement'}],groups:[]};
    const legacy=withChanges(raw);assert(legacy.changes.events[0].legacy);assert.equal(legacy.changes.events[0].before,null,'Migration never fabricates missing previous wording');
    console.log('PASS Change review: real field/link diffs, nine chapters, evidence gates, owned follow-up, complete review, scoped invalidation, retained history, superseded edits, removed requirements, durable private journals, owner isolation, CAS, failed-write preservation, SDD inclusion, and immutable baselines.');
  }
}finally{DB.close();}
