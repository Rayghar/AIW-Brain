import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {seedProject} from './public/requirements-domain.js';
import {createProject} from './public/projects-domain.js';
import {withFinalReview,reviewDesignStamp,exportSDD} from './public/review-domain.js';
import {applyLogicalCommand,logicalGraph} from './public/logical-domain.js';
import {applyTechnologyCommand} from './public/technology-domain.js';
import {modelEditSnapshot,previewModelChange,rebaseModelChange} from './public/model-impact.js';
import {changeEvents,changeSource,changeSummary} from './public/changes-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';

const p=withFinalReview(seedProject()),original=JSON.stringify(p);
const edit=(project,type,id,fields)=>({type,payload:{...modelEditSnapshot(project,{type,payload:{id}}),...fields,id}});
for(const [type,id] of [['logical.responsibility','api'],['realisation.component','api-pod'],['technology.capability','tc-001'],['techrealisation.plan','tr-001']]){
 const q=previewModelChange(p,edit(p,type,id,{owner:'Synthetic design reviewer'}));
 assert.equal(JSON.stringify(p),original,'A preview must not mutate saved records, baselines or counters');
 assert.equal(q.fields.length,1);assert.equal(q.after.owner,'Synthetic design reviewer');assert(q.items.some(i=>i.id===id));assert(q.items.some(i=>i.chapter===1));assert(q.items.some(i=>i.chapter===10));assert(q.items.every(i=>i.why&&i.via.length));
 assert.equal(q.document.quality.drivers[0].targetConfirmed,p.quality.drivers[0].targetConfirmed,'No inferred agreement');
}
const allocation=previewModelChange(p,edit(p,'realisation.component','api-pod',{allocations:[{logicalId:'risk',scope:'Proposed validation ownership'}]}));
assert(allocation.items.some(i=>i.id==='api')&&allocation.items.some(i=>i.id==='risk'),'Both old and proposed allocation paths need review');
assert(!allocation.document.logical.mappings.some(m=>m.logicalId==='api'&&m.physicalId==='api-pod'));
assert(logicalGraph(allocation.document).edges.some(e=>[e.from,e.to].includes('risk')&&[e.from,e.to].includes('api-pod')),'Proposed edges must be real');
assert(allocation.signals.some(s=>s.title.includes('Allocation')));
const logical=previewModelChange(p,edit(p,'logical.responsibility','api',{purpose:'Validate the request and retain the decision evidence.'}));
const other=applyLogicalCommand(p,edit(p,'logical.responsibility','api',{owner:'Concurrent owner'})).document;
const rebased=rebaseModelChange(other,logical);assert.equal(rebased.conflicts.length,0);assert.equal(rebased.command.payload.owner,'Concurrent owner');assert.equal(rebased.command.payload.purpose,logical.after.purpose);
const overlap=applyLogicalCommand(p,edit(p,'logical.responsibility','api',{purpose:'Competing purpose'})).document;
assert.equal(rebaseModelChange(overlap,logical).conflicts.length,1,'Overlapping edits must be disclosed');
const capability=previewModelChange(p,edit(p,'technology.capability','tc-001',{mappings:modelEditSnapshot(p,{type:'technology.capability',payload:{id:'tc-001'}}).mappings.slice(1)}));
const currentMappings=modelEditSnapshot(p,{type:'technology.capability',payload:{id:'tc-001'}}).mappings;
const modified=currentMappings.map((m,i)=>i===1?{...m,scope:'Concurrent scope to preserve'}:m);
const supportRebase=rebaseModelChange(applyTechnologyCommand(p,edit(p,'technology.capability','tc-001',{mappings:modified})).document,capability);
assert.equal(supportRebase.conflicts.length,0);assert(supportRebase.command.payload.mappings.some(m=>m.scope==='Concurrent scope to preserve'));
const blank=withFinalReview(createProject({name:'Museum archive',template:'blank'},'museum-qa'));
const authored=withFinalReview(applyLogicalCommand(blank,{type:'logical.responsibility',payload:{title:'Catalogue access',purpose:'Retrieve catalogue records',owner:'Collections team',requirementIds:[],decisionIds:[]}}).document);
const blankPreview=previewModelChange(authored,edit(authored,'logical.responsibility',authored.logical.responsibilities[0].id,{purpose:'Retrieve approved catalogue records'}));
assert(!JSON.stringify(blankPreview.items).match(/Payment|ledger|settlement/i),'Blank projects must not gain payment examples');

const preview=process.argv.includes('--preview'),DB=localDatabase(preview?'.aiw-local/project.sqlite':':memory:'),files=new Map(),FILES=preview?localFiles():{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}};
const owner=preview?'local-architect':'model-impact-owner',env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body,as=owner)=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{...(as?{'oai-authenticated-user-id':as}:{}),...(body?{'Content-Type':'application/json',Origin:'https://aiw.test'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
let state,id;
async function send(type,payload={}){const r=await api('/api/commands?project='+id,'POST',{revision:state.revision,command:{type,payload}});assert.equal(r.status,200,type+': '+await r.clone().text());state=await r.json();}
try{
 state=await(await api('/api/projects','POST',{name:'Model impact walkthrough · QA only',template:'bank-payment'})).json();id=state.document.id;
 if(preview){await mkdir('.aiw-local',{recursive:true});await writeFile('.aiw-local/model-impact-qa.json',JSON.stringify({projectId:id},null,2));console.log('Preview fixture: '+id);}
 else{
  await send('review.checks');await send('review.baseline',{title:'Before model changes',stamp:reviewDesignStamp(state.document),reviewed:true});const frozen=structuredClone(state.document.finalReview.baselines[0]);
  for(const [type,sourceId] of [['logical.responsibility','api'],['realisation.component','api-pod'],['technology.capability','tc-001'],['techrealisation.plan','tr-001']]){
   const c=edit(state.document,type,sourceId,{owner:'Reviewed model owner'}),q=previewModelChange(state.document,c),revision=state.revision;
   for(const payload of [{command:c,previewStamp:q.stamp,reviewed:false},{command:c,previewStamp:'stale',reviewed:true}])assert.equal((await api('/api/commands?project='+id,'POST',{revision,command:{type:'model.apply-impact',payload}})).status,400);
   await send('model.apply-impact',{command:c,previewStamp:q.stamp,reviewed:true});const event=changeEvents(state.document).at(-1);
   assert.equal(changeSource(event).id,sourceId);assert.equal(event.source.chapter,q.source.chapter);assert(event.preview.reviewed);assert.equal(changeEvents(state.document).filter(e=>e.id===event.id).length,1);assert(changeSummary(state.document).open>0);
   assert.equal(exportSDD(state.document,frozen.id),frozen.markdown,'Frozen SDD remains immutable');assert(exportSDD(state.document).includes('Reviewed model owner'));
   assert.equal((await api('/api/commands?project='+id,'POST',{revision,command:{type:'model.apply-impact',payload:{command:c,previewStamp:q.stamp,reviewed:true}}})).status,409);
  }
  const journal=JSON.stringify(state.document.changes);state=await(await api('/api/project?project='+id)).json();assert.equal(JSON.stringify(state.document.changes),journal);assert.equal((await api('/api/project?project='+id,'GET',null,'different-owner')).status,404);
  const html=await(await api('/api/export?project='+id+'&chapter=11&format=html&view=1')).text();assert(html.includes('explicitly reviewed before applying'));assert(html.includes('Reviewed model owner'));
  console.log('PASS Model impact: four chapters; saved/proposed separation; real allocation changes; old/new dependencies; implication checks; scalar and mapping rebase; overlap disclosure; blank-project grounding; explicit server acceptance; CHG/SDD persistence; frozen baselines; owner isolation; concurrent-save rejection.');
 }
}finally{DB.close();}
