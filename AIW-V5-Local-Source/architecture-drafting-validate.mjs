import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {createProject} from './public/projects-domain.js';
import {applyCanonical} from './public/canonical-command.js';
import {applyArchitectureCommand} from './public/architecture-design.js';
import {architectureDraftContract} from './public/architecture-drafting.js';
import {intelligencePacket,intelligenceSchema,validateIntelligenceOutput,adoptIntelligence,generationReceipt} from './public/intelligence-context.js';
import {requestIntelligence} from './intelligence-provider.js';
import {brainContext,generationCurrent} from './public/aiw-brain.js';
import {caseGuidance} from './public/case-guidance.js';
import {applyArchitectureCaseCommand,caseContextBasis} from './public/architecture-case.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {exportSDD} from './public/review-domain.js';

const at='2026-09-23T15:00:00Z',checks=[];
let base=createProject({name:'Synthetic notification case',template:'blank'},'draft-verification',at);
const cmd=(p,type,payload)=>applyCanonical(p,{type,payload},at).document;
base=cmd(base,'artefact',{type:'requirement',title:'Notify a changed reservation',description:'Notify the requester after an equipment reservation changes.',source:'Synthetic workshop; no production assertion',owner:'Unassigned',confirmed:false});
base=cmd(base,'quality.driver',{title:'Recover pending notifications',category:'recoverability',requirementIds:['REQ-001'],stimulus:'Publication is interrupted after a change.',conditions:'Controlled failure exercise; workload not yet agreed.',response:'Reconcile the pending notification against the changed reservation.',metric:'Unreconciled changes',operator:'At most',targetValue:'',unit:'changes',window:'Proposed failure exercise',measurement:'Compare original references before and after recovery.',owner:'Unassigned',confirmed:false,targetConfirmed:false});
base=applyArchitectureCaseCommand(base,{type:'case.save',payload:{title:'Notification case',purpose:'Explore recoverable notification delivery without claiming a tested result.',requirementIds:['REQ-001'],basis:caseContextBasis(base)}},at,'fixture-author').document;
const start=(p,topic)=>applyArchitectureCommand(p,{type:'architecture.start',payload:{requirementId:'REQ-001',driverId:'QD-001',topic}},at).document;
const raw=p=>({chapter:2,objectId:'QD-001',mode:'mind',architectureTaskId:p.coauthoring.designTasks.at(-1).id,prompt:'Draft the unanswered narrative conditions from this requirement and the comparison method.'});
for(const topic of ['interaction','reads','persistence','delivery','resilience','distribution','structure']){
 const p=start(base,topic),t=p.coauthoring.designTasks.at(-1),contract=architectureDraftContract(p,t),packet=intelligencePacket(p,raw(p));
 assert(contract?.fields.length>0);assert(packet.architectureDraft);assert(packet.sources.some(s=>s.kind==='architecture-case'));assert(packet.sources.some(s=>s.kind==='architecture-knowledge'));
 assert(!contract.fields.some(f=>/Id$|Seconds$/.test(f.key)||['owner','analysis','completion','duplicates','ordering','classification','maxAge','transactionScope'].includes(f.key)));
 assert(!contract.fields.some(f=>t.answers[f.key]));
 assert.deepEqual(intelligenceSchema(packet).properties.architectureDraft.items.properties.field.enum,contract.fields.map(f=>f.key));
}
checks.push('Seven architecture concerns expose only unanswered prose; owners, IDs, choices and numerical inputs cannot be generated into the task');
let p=start(base,'interaction'),packet=intelligencePacket(p,raw(p));
const refs=['S1',...packet.sources.filter(s=>['architecture-knowledge','architecture-case'].includes(s.kind)).map(s=>s.ref)];
const result={title:'Proposed recovery conditions',summary:'Delivery policy and ownership remain undecided.',passage:'The source asks for a notification after a reservation changes. A durable work path is one option to explore; its completion and duplicate-handling contracts remain open.',sourceRefs:refs,assumptions:['Recovery behaviour is a design proposal; no implementation has been verified.'],questions:['May the original request complete before the notification?'],options:[],architectureDraft:[{field:'failure',value:'Proposed: reconcile the original notification reference before replaying uncertain work. Retain unresolved outcomes for the accountable team to investigate.',rationale:'The notification need and method identify the uncertain-outcome obligation; the exact procedure needs architect review.',sourceRefs:refs},{field:'information',value:'Proposed: keep reservation state authoritative in its owning processor; notification delivery status does not rewrite the reservation.',rationale:'Separate notification status from the authoritative business change; ownership remains unassigned.',sourceRefs:refs}]};
validateIntelligenceOutput(result,packet);
for(const field of ['owner','processorId','completion','analysis'])assert.throws(()=>validateIntelligenceOutput({...result,architectureDraft:[{...result.architectureDraft[0],field}]},packet),/unanswered/);
assert.throws(()=>validateIntelligenceOutput({...result,architectureDraft:[result.architectureDraft[0],result.architectureDraft[0]]},packet),/once/);
assert.throws(()=>validateIntelligenceOutput({...result,architectureDraft:[{...result.architectureDraft[0],sourceRefs:['S999']}]},packet),/supplied/);
const run={id:'synthetic-run',status:'completed',provider:'mock',model:'synthetic-model',updatedAt:at,packet,result,groundingReview:{accepted:true,kind:'synthetic test result'}};
const adopt=(doc,r=run,more={})=>adoptIntelligence(doc,{kind:'architecture-answers',reviewed:true,fields:['failure'],...more},r,at);
assert.throws(()=>adopt(p,run,{reviewed:false}),/Review/);assert.throws(()=>adopt(p,{...run,groundingReview:{accepted:false}}),/source-checked/);assert.throws(()=>adopt(p,run,{fields:['owner']}),/saved response/);
const before=JSON.stringify(p),adopted=adopt(p);assert.equal(JSON.stringify(p),before);p=adopted.document;
let task=p.coauthoring.designTasks.at(-1);assert.equal(task.answers.failure,result.architectureDraft[0].value);assert.equal(task.answers.information,'');assert.equal(task.answers.completion,'unknown');assert.equal(task.answers.owner,'');
assert.equal(p.logical.responsibilities.length,0);assert.equal(p.realisation.components.length,0);assert.equal(p.decisions.records.length,0);assert.equal(p.finalReview.baselines.length,0);assert.equal(task.assistedDrafts[0].runId,run.id);
assert.throws(()=>adopt(p),/changed/);assert(!generationCurrent(p,generationReceipt(run)));
checks.push('Selected suggestions are retained as draft conditions with provenance; no design, target or approval changes, no replay over new answers');
for(const change of [doc=>{doc.artefacts[0].description+=' Changed.';},doc=>{doc.finalReview.architectureCases[0].purpose+=' Changed.';},doc=>{doc.coauthoring.designTasks.at(-1).answers.failure='Architect answer';}]){const changed=start(base,'interaction');change(changed);assert.throws(()=>adopt(changed),/changed/);}
let hidden=start(base,'interaction');hidden.workspace.aiPolicy={excludedObjectIds:['REQ-001']};assert.throws(()=>intelligencePacket(hidden,raw(hidden)),/disclosure/);
checks.push('Requirement, case scope and comparison edits invalidate saved drafts; disclosure exclusions fail closed');

// Exercise the provider's strict dynamic schema and withheld-response fallback.
const fresh=start(base,'interaction'),livePacket=intelligencePacket(fresh,raw(fresh));let requests=0;
const fetcher=async(url,options)=>{requests++;const body=JSON.parse(options.body);assert.equal(body.store,false);const review=body.text.format.name==='aiw_source_check';if(!review){assert(body.text.format.schema.properties.architectureDraft);assert(!body.text.format.schema.properties.questions.items.enum);}return new Response(JSON.stringify({id:'mock-'+requests,status:'completed',model:'synthetic-model',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(review?{supported:false,issues:['Synthetic rejection for fallback verification.']}:result)}]}],usage:{input_tokens:10,output_tokens:20}}));};
const response=await requestIntelligence({OPENAI_API_KEY:'synthetic',AIW_LLM_MODEL:'synthetic-model'},livePacket,{fetcher});assert.equal(requests,2);assert.equal(response.groundingReview.accepted,false);assert.deepEqual(response.result.architectureDraft,[]);
checks.push('Dynamic provider schema retains citation-only enums; rejected suggestions are withheld and cannot enter draft conditions');

let g=caseGuidance(base,brainContext(base,{chapter:2,id:'QD-001'}));assert.equal(g.next.chapter,3);assert(g.next.url.includes('guideSource=REQ-001'));assert.equal(caseGuidance(base,brainContext(base,{chapter:1,id:'project'})),null);
g=caseGuidance(fresh,brainContext(fresh,{chapter:2,id:'QD-001'}));assert.equal(g.next.taskId,fresh.coauthoring.designTasks.at(-1).id);
const unrelated=cmd(base,'artefact',{type:'requirement',title:'Unrelated need',description:'Another concern.',source:'Synthetic'});assert.equal(brainContext(unrelated,{chapter:1,id:'REQ-002'}).cases.length,0);
checks.push('Sol retains the related case question, follows actual chapter links and does not borrow unrelated scope');

// Continue through the existing model preview: proposals still need explicit acceptance.
const answers={completion:'deferred',duplicates:'deduplicated',ordering:'per-key',workload:'unknown',owner:'Unassigned',information:'Proposed reservation authority, to review.',capacity:'Agree capacity and admission limits before operation.',outcome:'Use the original reference to query delivery state.',reason:'Explore durable work with explicit delayed completion and recovery obligations.',trustName:'Proposed service boundary',trustPolicy:'Authenticate callers and restrict publication and consumption.'};
task=p.coauthoring.designTasks.at(-1);p=applyArchitectureCommand(p,{type:'architecture.answers',payload:{id:task.id,taskRevision:task.revision,answers}},at).document;task=p.coauthoring.designTasks.at(-1);p=applyArchitectureCommand(p,{type:'architecture.prepare',payload:{id:task.id,taskRevision:task.revision,optionId:'durable-queue'}},at).document;
const alt=p.modelAlternatives.records.at(-1),preview=previewAlternative(p,alt);assert(preview.changes.some(c=>c.source.chapter===5));assert.equal(p.realisation.components.length,0);assert.throws(()=>applyAlternativeCommand(p,{type:'alternative.apply',payload:{id:alt.id,alternativeRevision:alt.revision,previewStamp:preview.stamp,reviewed:false}},at),/Review/);
const accepted=applyAlternativeCommand(p,{type:'alternative.apply',payload:{id:alt.id,alternativeRevision:alt.revision,previewStamp:preview.stamp,reviewed:true,reviewer:'Synthetic test actor',reason:'Exercise explicit acceptance, not a real project decision.'}},at).document;
assert(accepted.realisation.components.length>0);assert.equal(accepted.quality.drivers[0].targetConfirmed,false);assert.equal(accepted.artefacts[0].confirmed,false);assert(exportSDD(accepted).includes('Queue-based load leveling'));assert(exportSDD(accepted).includes('synthetic-run'));
checks.push('Draft conditions continue into the existing topology preview and explicit model acceptance; SDD retains the drafting origin');
// The actual HTTP service must retain the draft response and require current
// project revision on adoption; test-only provider and storage are isolated.
const DB=localDatabase(':memory:'),files=new Map(),env={DB,OPENAI_API_KEY:'synthetic',AIW_LLM_MODEL:'synthetic-model',FILES:{async put(k,v){files.set(k,v);},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k);}}};
const owner='draft-http-fixture',origin='http://localhost:4173';
await DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,?,?)').bind(owner,fresh.id,JSON.stringify(fresh),1,at).run();
const http=async(route,body,actor=owner)=>{const r=await worker.fetch(new Request(origin+route+'?project='+fresh.id,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','oai-authenticated-user-id':actor},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,...await r.json()};};
const originalFetch=globalThis.fetch;
try{
 globalThis.fetch=async(url,options)=>{const b=JSON.parse(options.body),review=b.text.format.name==='aiw_source_check',ctx=JSON.parse(b.input[0].content),ids=review?[]:['S1',...ctx.sources.filter(s=>['architecture-knowledge','architecture-case'].includes(s.kind)).map(s=>s.ref)],r=review?{supported:true,issues:[]}:{...result,sourceRefs:ids,architectureDraft:result.architectureDraft.map(s=>({...s,sourceRefs:ids}))};return Response.json({id:'mock-http',status:'completed',model:'synthetic-model',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(r)}]}]});};
 const context=await http('/api/intelligence/context',raw(fresh));assert.equal(context.status,200,context.error);const generated=await http('/api/intelligence/generate',{...raw(fresh),packetStamp:context.packet.stamp,requestId:crypto.randomUUID()});assert.equal(generated.status,'completed',generated.error);assert(generated.groundingReview.accepted);
 const loaded=await http('/api/project'),body={revision:loaded.revision,command:{type:'intelligence.adopt',payload:{runId:generated.id,kind:'architecture-answers',reviewed:true,fields:['failure']}}};
 const foreign=await http('/api/commands',body,'foreign-fixture');assert([403,404].includes(foreign.status));const kept=await http('/api/commands',body);assert.equal(kept.status,200,kept.error);assert.equal(kept.document.coauthoring.designTasks[0].answers.failure,result.architectureDraft[0].value);assert.equal(kept.document.realisation.components.length,0);
 assert.equal((await http('/api/commands',body)).status,409);const reloaded=await http('/api/project');assert.equal(reloaded.document.coauthoring.designTasks[0].assistedDrafts[0].runId,generated.id);
}finally{globalThis.fetch=originalFetch;DB.close();}
checks.push('HTTP context, generated response, owner isolation, revision-checked adoption and private draft reload work through the shared backend');
console.log(JSON.stringify({passed:checks.length,checks,provider:'mock; no live LLM call'},null,2));
