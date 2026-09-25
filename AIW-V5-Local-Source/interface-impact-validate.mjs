import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {previewInterfaceChange,rebaseInterfaceChange} from './public/interface-impact.js';
import {applyInterfacesCommand,contract,dataRecord} from './public/interfaces-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import {changeEvents,changeSource,changeSummary,changeItemState,changeTargetStamp,isCurrentChange} from './public/changes-domain.js';
import {reviewDesignStamp,exportSDD} from './public/review-domain.js';

const preview=process.argv.includes('--preview'),DB=localDatabase(preview?'.aiw-local/project.sqlite':':memory:'),files=new Map();
const FILES=preview?localFiles():{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}};
const owner=preview?'local-architect':'impact-owner',env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body,as=owner)=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{...(as?{'oai-authenticated-user-id':as}:{}),...(body?{'Content-Type':'application/json',Origin:'https://aiw.test'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
let state,id;
async function send(type,payload={}){const r=await api('/api/commands?project='+id,'POST',{revision:state.revision,command:{type,payload}});assert.equal(r.status,200,type+': '+await r.clone().text());state=await r.json();return state;}
try{
  state=await(await api('/api/projects','POST',{name:'Bank payment · Impact preview QA',template:'bank-payment'})).json();id=state.document.id;
  await send('review.checks');await send('review.baseline',{title:'Before interface changes · QA only',stamp:reviewDesignStamp(state.document),reviewed:true});
  if(preview){await mkdir('.aiw-local',{recursive:true});await writeFile('.aiw-local/impact-qa.json',JSON.stringify({projectId:id},null,2));console.log('Preview fixture: '+id);}
  else{
    const p=state.document,original=JSON.stringify(p),f=dataRecord(p,'instruction').fields.find(f=>f.name==='paymentReference');
    const command={type:'interfaces.field',payload:{id:'instruction',field:{...f,name:'instructionReference'}}};
    const q=previewInterfaceChange(p,command);assert.equal(JSON.stringify(p),original,'Preview leaves the project, histories, and counters unchanged');
    assert.equal(q.after.fields.find(x=>x.id===f.id).name,'instructionReference');assert(q.signals.some(s=>s.title.includes('Field renamed')));
    assert.equal(q.findings.introduced.filter(f=>f.code==='correlation').length,4);
    for(const chapter of [1,2,3,4,5,8,9,10])assert(q.items.some(i=>i.chapter===chapter));
    assert(q.items.find(i=>i.id==='rest').via.includes('DX-001'));assert(q.items.every(i=>i.why&&i.via.length));
    assert(!q.items.some(i=>i.id==='notify-worker'),'Unlinked consumers are not invented');
    const boundary={type:'interfaces.contract',payload:{...contract(p,'rest'),to:'worker'}},b=previewInterfaceChange(p,boundary);
    assert(logicalGraph(p).edges.some(e=>e.id==='IF-001-provider'&&e.to==='api-pod'));
    assert(logicalGraph(b.document).edges.some(e=>e.id==='IF-001-provider'&&e.to==='worker'));assert(b.items.some(i=>i.id==='api-pod')&&b.items.some(i=>i.id==='worker'),'Old and proposed endpoints remain in review');
    const changedElsewhere=applyInterfacesCommand(p,{type:'interfaces.data',payload:{...dataRecord(p,'instruction'),owner:'New accountable owner'}}).document;
    const rebased=rebaseInterfaceChange(changedElsewhere,q);assert.equal(rebased.conflicts.length,0);const rq=previewInterfaceChange(changedElsewhere,rebased.command);assert.equal(rq.after.owner,'New accountable owner');assert.equal(rq.after.fields.find(x=>x.id===f.id).name,'instructionReference');
    const overlap=applyInterfacesCommand(p,{type:'interfaces.field',payload:{id:'instruction',field:{...f,name:'externalPaymentId',description:'Concurrent meaning that must survive.'}}}).document;
    const merge=rebaseInterfaceChange(overlap,q);assert.equal(merge.conflicts.length,1);assert.equal(merge.conflicts[0].current,'externalPaymentId');assert.equal(merge.command.payload.field.description,'Concurrent meaning that must survive.');
    for(const payload of [{command,previewStamp:q.stamp,reviewed:false},{command,previewStamp:'wrong',reviewed:true}]){const r=await api('/api/commands?project='+id,'POST',{revision:state.revision,command:{type:'interfaces.apply-impact',payload}});assert.equal(r.status,400);assert.equal((await(await api('/api/project?project='+id)).json()).revision,state.revision);}
    const previousRevision=state.revision,frozen=state.document.finalReview.baselines[0],priorContract=JSON.stringify(state.document.interfaces.contracts),priorApplications=JSON.stringify(state.document.realisation);
    await send('interfaces.apply-impact',{command,previewStamp:q.stamp,reviewed:true});
    const event=changeEvents(state.document).at(-1);assert.equal(changeSource(event).id,'instruction');assert.equal(event.source.chapter,8);assert(event.preview.reviewed);assert.equal(event.fields[0].before,'paymentReference');assert.equal(event.fields[0].after,'instructionReference');
    assert.equal(JSON.stringify(state.document.interfaces.contracts),priorContract,'Acceptance does not silently repair consumers');assert.equal(JSON.stringify(state.document.realisation),priorApplications);
    assert.equal(exportSDD(state.document,frozen.id),frozen.markdown);assert(exportSDD(state.document).includes('instructionReference'));assert(changeSummary(state.document).open>0);
    const target=event.items.find(i=>i.chapter===1),assessment={changeId:event.id,itemKey:target.key,targetStamp:changeTargetStamp(state.document,target),outcome:'follow-up',reviewer:'Synthetic QA architect',rationale:'Revisit acceptance evidence for the renamed payment reference.',evidence:'Illustrative walkthrough only',owner:'Interface design owner',action:'Agree the consumer migration and record its evidence.',reviewed:true};
    await send('change.review',assessment);assert.equal(changeItemState(state.document,changeEvents(state.document).at(-1),changeEvents(state.document).at(-1).items.find(i=>i.key===target.key)).status,'follow-up');
    const persisted=JSON.stringify(state.document.changes);state=await(await api('/api/project?project='+id)).json();assert.equal(JSON.stringify(state.document.changes),persisted);
    assert.equal((await api('/api/commands?project='+id,'POST',{revision:previousRevision,command:{type:'interfaces.apply-impact',payload:{command,previewStamp:q.stamp,reviewed:true}}})).status,409);
    assert.equal((await api('/api/project?project='+id,'GET',null,'another-owner')).status,404);
    const d=dataRecord(state.document,'instruction'),removal={type:'interfaces.remove-field',payload:{id:d.id,fieldId:f.id}},removed=previewInterfaceChange(state.document,removal);
    assert(removed.signals.some(s=>s.title.includes('Field removed')));assert.equal(dataRecord(state.document,d.id).fields.length,removed.after.fields.length+1);
    await send('interfaces.apply-impact',{command:removal,previewStamp:removed.stamp,reviewed:true});assert(!isCurrentChange(state.document,changeEvents(state.document)[0]));assert(changeEvents(state.document)[0].items.some(i=>i.reviews.length));
    const requirement=state.document.artefacts.find(r=>r.id==='REQ-001');await send('artefact',{...requirement,owner:'Synthetic requirement reviewer'});assert.equal(changeEvents(state.document).filter(e=>isCurrentChange(state.document,e)).length,2,'Requirement and dictionary change histories coexist');
    const html=await(await api('/api/export?project='+id+'&chapter=11&format=html&view=1')).text();assert(html.includes('Architecture change review'));assert(html.includes('DF-001'));assert(html.includes('Field renamed'));assert(html.includes('explicitly reviewed before applying'));assert(html.includes('Synthetic QA architect'));
    const stored=JSON.parse((await DB.prepare('SELECT document FROM projects WHERE owner_id=? AND id=?').bind(owner,id).first()).document);assert(stored.changes.storageKey);assert(!stored.changes.events);
    assert.throws(()=>previewInterfaceChange(state.document,{type:'interfaces.data',payload:{...dataRecord(state.document,'instruction')}}),/No definition changes/);
    console.log('PASS Interface impact: non-mutating preview, real edge changes, grounded links, new findings, stable field IDs, explicit acceptance, no automatic consumer repairs, safe rebase, overlapping-edit disclosure, private journal, retained reviews, mixed-source history, SDD, immutable baseline, owner isolation, and CAS.');
  }
}finally{DB.close();}
