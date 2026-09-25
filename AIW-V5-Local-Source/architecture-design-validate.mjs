import assert from 'node:assert/strict';
import {createProject} from './public/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {withFinalReview,exportSDD} from './public/review-domain.js';
import {applyArchitectureCommand,architectureSourceStamp} from './public/architecture-design.js';
import {assessInteraction,interactionReasoningGraph,interactionContextCurrent} from './public/architecture-knowledge.js';
import {designTask,designBasisCurrent} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {modelAlternative} from './public/model-alternatives-state.js';
import {intelligencePacket} from './public/intelligence-context.js';
import {generationCurrent,reviewGeneration} from './public/aiw-brain.js';
import {applyRealisationCommand} from './public/realisation-domain.js';
import {modelEditSnapshot} from './public/model-impact.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';

const at='2026-09-20T17:00:00.000Z';
export const interactionFixture=()=>{
  let p=applyCommand(createProject({name:'Equipment reservation',template:'blank',brief:'Reserve shared equipment.'},'interaction-fixture'),{type:'artefact',payload:{type:'requirement',title:'Reserve equipment',description:'Accept a reservation request and report its authoritative outcome.',acceptance:'The original reference identifies one reservation result.',owner:'Facilities',source:'Equipment workshop',confirmed:true}},at).document;
  p=applyQualityCommand(p,{type:'quality.driver',payload:{title:'Recover delayed reservations',category:'recoverability',requirementIds:['REQ-001'],stimulus:'Processing becomes unavailable after intake.',conditions:'A burst of reservation requests.',response:'Retain accepted work and complete it after processing recovers.',metric:'Completion delay',operator:'At most',targetValue:'30',unit:'minutes',window:'For each accepted request',measurement:'Recovery exercise with acknowledged references',targetConfirmed:true,confirmed:true,owner:'Facilities operations'}},at).document;
  return withFinalReview(p);
};
export const interactionFixtureAnswers={completion:'deferred',duplicates:'deduplicated',ordering:'per-key',workload:'bursty',owner:'Facilities operations',information:'The reservation register is authoritative; only the processor writes outcomes.',failure:'Bound retries. Recover the original result before repeating a business effect. Escalate poison work for supervised replay.',capacity:'Bound oldest pending age by the recorded completion window. Stop intake if durable capacity is exhausted.',outcome:'Return a reference; the caller checks the reservation register for the final outcome.',reason:'Permit delayed completion during short processor outages; accept the extra broker and recovery operations.',trustName:'Facilities services',trustPolicy:'Authenticated service identities; only the intake may enqueue and the processor may consume.'};
const task=p=>p.coauthoring.designTasks.at(-1);
const command=(p,type,payload={})=>applyArchitectureCommand(p,{type,payload:{id:task(p)?.id,taskRevision:task(p)?.revision,...payload}},at);
const start=p=>applyArchitectureCommand(p,{type:'architecture.start',payload:{requirementId:'REQ-001',driverId:'QD-001'}},at).document;
const ready=()=>command(start(interactionFixture()),'architecture.answers',{answers:interactionFixtureAnswers}).document;
const accept=(p,a,override={})=>applyAlternativeCommand(p,{type:'alternative.apply',payload:{id:a.id,alternativeRevision:a.revision,previewStamp:previewAlternative(p,a).stamp,reviewed:true,reviewer:'Architecture QA',reason:'Reviewed both alternatives, conditions, model changes and expected trade-offs.',...override}},at).document;

let base=interactionFixture(),untouched=JSON.stringify(base),p=start(base);
assert.equal(JSON.stringify(base),untouched,'Starting a comparison cannot mutate its input');
assert.equal(p.realisation.components.length,0);
assert.equal(assessInteraction(p,task(p),'durable-queue').ready,false);
assert.throws(()=>command(p,'architecture.prepare',{optionId:'durable-queue'}),/Completion contract|Repeated delivery/);
p=command(p,'architecture.answers',{answers:{...interactionFixtureAnswers,completion:'immediate'}}).document;
assert.equal(assessInteraction(p,task(p),'durable-queue').blockers[0].id,'completion');
assert(assessInteraction(p,task(p),'request-reply').ready);
p=command(p,'architecture.answers',{answers:interactionFixtureAnswers}).document;
const graph=interactionReasoningGraph(p,task(p),'durable-queue'),ids=new Set(graph.nodes.map(n=>n.id));
assert(graph.edges.every(e=>ids.has(e.from)&&ids.has(e.to)),'Every reasoning path endpoint resolves');
assert.equal(graph.assessment.score,null);
const beforePrepare=JSON.stringify(p.realisation),prepared=command(p,'architecture.prepare',{optionId:'durable-queue'});
p=prepared.document;const a=modelAlternative(p,prepared.selected),q=previewAlternative(p,a);
assert.equal(JSON.stringify(p.realisation),beforePrepare,'A saved alternative does not apply model objects');
assert.equal(q.document.realisation.components.filter(c=>c.kind==='queue').length,1);
assert.equal(q.document.realisation.connections.length,2);
assert.equal(q.document.decisions.records.length,1);
assert.equal(q.document.decisions.records[0].alternatives.length,2);
assert.equal(q.document.decisions.records[0].status,'draft');
assert(q.document.technology.capabilities.some(c=>c.category==='messaging'));
assert.equal(q.document.quality.drivers[0].targetValue,'30');
assert.throws(()=>accept(p,a,{reviewed:false}),/Review every/);
let applied=accept(p,a);assert.equal(task(applied).status,'applied');assert(designBasisCurrent(applied,task(applied)),'A proposal must remain current after its own accepted changes');
assert(interactionContextCurrent(applied,task(applied)));
assert(task(applied).applied.reasoningGraph.edges.length>10);
assert.deepEqual(task(applied).applied.methodReceipt,a.methodReceipt,'Accepted reasoning retains its own source receipt');
assert(exportSDD(applied).includes('Queue-based load leveling'));
assert(exportSDD(applied).includes('Expected effects and verification'));
assert.throws(()=>accept(applied,modelAlternative(applied,a.id)),/draft|accepted|applied|current|changed/i);
const packet=intelligencePacket(applied,{chapter:2,objectId:'QD-001',mode:'mind',prompt:'Explain the queued interaction and the trade-offs for this quality scenario.'});
const grounding=packet.sources.find(s=>s.kind==='architecture-knowledge');assert(grounding);assert(grounding.excerpt.includes('grounded-in'));assert.equal(packet.canDesign,false,'An architecture question cannot become an unrelated boundary proposal');
assert(packet.sources.some(s=>s.objectId==='QD-001'),'The project target remains in the source packet');
assert(packet.sources.some(s=>s.objectId==='REQ-001'),'The driving requirement remains in the source packet');
assert(packet.sources.reduce((n,s)=>n+s.excerpt.length,0)<=28000);
const generation={context:packet.context,basisStamp:packet.basisStamp,sources:copy(packet.sources)};
assert(generationCurrent(applied,generation));
const newer=applyQualityCommand(applied,{type:'quality.driver',payload:{...applied.quality.drivers[0],targetValue:'5'}},at).document;
assert(!generationCurrent(newer,generation),'Architecture grounding becomes stale when the quality target changes');
const newerPacket=intelligencePacket(newer,{...packet.request,architectureTaskId:task(newer).id});
assert.equal(JSON.parse(newerPacket.sources.find(s=>s.kind==='architecture-knowledge').excerpt).task.current,false);
reviewGeneration(newer,generation);assert(generationCurrent(newer,generation),'Reviewed source receipts retain architecture identity');
assert.equal(generation.reviewed.sources.find(s=>s.kind==='architecture-knowledge').objectId,task(newer).id);
const verbose=ready();for(const k of ['information','failure','capacity','outcome','reason','contextReview'])task(verbose).answers[k]='Recorded plan '.repeat(180);
const bounded=intelligencePacket(verbose,{chapter:2,objectId:'QD-001',mode:'mind',prompt:'Compare the queued interaction',architectureTaskId:task(verbose).id});
assert(bounded.sources.some(s=>s.kind==='architecture-knowledge'),'Long answers cannot crowd out the reasoning graph');
assert(bounded.sources.some(s=>s.objectId==='REQ-001')&&bounded.sources.some(s=>s.objectId==='QD-001'));

// Changed source targets invalidate the exact prepared proposal and require review.
let changed=applyQualityCommand(p,{type:'quality.driver',payload:{...p.quality.drivers[0],targetValue:'5'}},at).document;
assert(!designBasisCurrent(changed,task(changed)));
assert.throws(()=>previewAlternative(changed,modelAlternative(changed,a.id)),/sources changed/i);
changed=command(changed,'architecture.refresh',{reviewed:true,reviewer:'Architecture QA',reason:'The new target needs another comparison.',stamp:architectureSourceStamp(changed,task(changed))}).document;
assert.equal(modelAlternative(changed,a.id).status,'archived');assert(designBasisCurrent(changed,task(changed)));

// The simpler option contains no queue or invented messaging support.
const syncPrepared=command(ready(),'architecture.prepare',{optionId:'request-reply'}),sync=previewAlternative(syncPrepared.document,modelAlternative(syncPrepared.document,syncPrepared.selected));
assert.equal(sync.document.realisation.components.length,2);assert.equal(sync.document.realisation.connections[0].interaction,'sync');assert(!sync.document.realisation.components.some(c=>c.kind==='queue'));

// Reuse keeps the existing definition, and a concurrent edit invalidates it.
let reuse=ready(),made=applyRealisationCommand(reuse,{type:'realisation.component',payload:{title:'Existing intake',kind:'service',owner:'Existing owner',purpose:'Receive facility work',boundary:'Existing bounded intake',status:'candidate',allocations:[]}},at);reuse=made.document;
reuse=command(reuse,'architecture.answers',{answers:{callerId:made.selected}}).document;
const existing=copy(reuse.realisation.components.find(c=>c.id===made.selected));
const rp=command(reuse,'architecture.prepare',{optionId:'durable-queue'}),rq=previewAlternative(rp.document,modelAlternative(rp.document,rp.selected));
assert.deepEqual(rq.document.realisation.components.find(c=>c.id===made.selected),existing);
const snap=modelEditSnapshot(rp.document,{type:'realisation.component',payload:{id:made.selected}});
const concurrent=applyRealisationCommand(rp.document,{type:'realisation.component',payload:{...snap,id:made.selected,owner:'Changed owner'}},at).document;
assert.throws(()=>previewAlternative(concurrent,modelAlternative(concurrent,rp.selected)),/sources changed/i);
console.log('PASS architecture reasoning, source gates, topology composition, reuse, decision and SDD traceability.');

// Exercise the deployed Worker route and owner-scoped blob persistence.
const blobs=new Map(),DB=localDatabase(':memory:'),FILES={put:async(k,v)=>blobs.set(k,v),get:async k=>blobs.has(k)?{text:async()=>blobs.get(k)}:null,delete:async k=>blobs.delete(k)};
let env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}},projectId='',state;
const api=(path,method='GET',body,owner='architecture-qa')=>worker.fetch(new Request('https://aiw.test'+path+(projectId?'?project='+projectId:''),{method,headers:{'oai-authenticated-user-id':owner,Origin:'https://aiw.test','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);
state=await(await api('/api/projects','POST',{name:'Interaction QA',template:'blank',brief:'Equipment reservations'})).json();projectId=state.document.id;
async function send(type,payload){const r=await api('/api/commands','POST',{revision:state.revision,command:{type,payload}});assert.equal(r.status,200,await r.clone().text());state=await r.json();return state;}
await send('artefact',{...base.artefacts[0],id:undefined});await send('quality.driver',{...base.quality.drivers[0],id:undefined});
await send('architecture.start',{requirementId:'REQ-001',driverId:'QD-001'});
await send('architecture.answers',{id:'DES-001',taskRevision:1,answers:interactionFixtureAnswers});
await send('architecture.prepare',{id:'DES-001',taskRevision:2,optionId:'durable-queue'});
state=await(await api('/api/project')).json();assert.equal(task(state.document).status,'proposed');
assert.equal((await api('/api/project','GET',null,'other-owner')).status,404);
const savedAlt=state.document.modelAlternatives.records[0],savedPreview=previewAlternative(state.document,savedAlt),payload={id:savedAlt.id,alternativeRevision:savedAlt.revision,previewStamp:savedPreview.stamp,reviewed:true,reviewer:'Architecture QA',reason:'Review completed.'};
env={...env,FILES:{...FILES,put:async()=>{throw Error('Synthetic storage failure')}}};const failure=await api('/api/commands','POST',{revision:state.revision,command:{type:'alternative.apply',payload}});assert.equal(failure.status,503);env={DB,FILES,ASSETS:{fetch:()=>new Response('asset')}};
const afterFailure=await(await api('/api/project')).json();assert.equal(afterFailure.revision,state.revision);assert.equal(afterFailure.document.realisation.components.length,0);
await send('alternative.apply',payload);state=await(await api('/api/project')).json();assert.equal(task(state.document).status,'applied');assert.equal(state.document.decisions.records.length,1);assert(designBasisCurrent(state.document,task(state.document)));
console.log('PASS architecture API ownership, saved alternatives, atomic failure recovery and accepted graph persistence.');
function copy(v){return structuredClone(v);}
