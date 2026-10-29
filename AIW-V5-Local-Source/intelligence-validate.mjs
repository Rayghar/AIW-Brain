// Sol's generate path end to end, on both providers (round 5, Contract P): the same suite runs on the OpenAI Responses
// wire and on the Anthropic Messages wire (the mock speaks both). Then the Anthropic provider's own probes: the request
// it sends (cached blocks in stable-first order, structured output, adaptive thinking, effort, the refusal fallback),
// a refusal that stands is a withheld draft with its reason, a 429 is the service's retry answer, usage with cache reads
// reaches the run record and the token accounting, a fallback-served answer names the model that answered, the
// connection probe and status for both providers; and Sol's model review (Contract R) with its routes and budget.
// Round 12: the model-assisted architecture draft per requirement group (one bounded request per group).
// Run: npm run test:intelligence. Mock providers only; no live LLM call.
import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {createProject} from './shared/projects-domain.js';
import {applyCommand,seedProject} from './public/requirements-domain.js';
import {withFinalReview,assembleSDD} from './public/review-domain.js';
import {validateIntelligenceOutput,SUGGESTED_FIELDS,intelligencePacket,journeyPacket,reviewPacket,reviewFindingBasis,adoptReviewFinding} from './public/intelligence-context.js';
import {requestIntelligence,intelligenceStatus,verifyConnection,modelCall,requestModelReview,validateReviewDraft,reviewInstructionsPin,REVIEW_PROMPT_VERSION,OPENAI_DEFAULT_MODEL} from './intelligence-provider.js';
import {structuredSchema,userBlocks,anthropicRequest,anthropicUsage} from './intelligence-anthropic.js';
import {brainContext,noteCurrent} from './public/aiw-brain.js';
import {applyDesignCommand} from './public/design-task-domain.js';
import {designBasisCurrent} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {answer,viaAnthropic,asResponsesBody,asMessage,messageEvents,providerEnv} from './mock-llm-provider.mjs';
import http from 'node:http';
import path from 'node:path';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {localFiles} from './local-files.js';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';
import {requirementGroups,groupMembers} from './public/requirement-groups.js';
import {draftArchitecture,groupDraftPackets,GROUP_SOL_LIMITS} from './public/architecture-drafter.js';
import {draftGroupWording} from './intelligence-service.js';
import {processDraftingQueue} from './drafting-service.js';

const checks=[];
const pass=name=>{checks.push(name);console.log('PASS',name);};
const header=(init,name)=>new Headers(init?.headers||{}).get(name);

// ---------------------------------------------------------------- the generate path, once per provider
async function suite(provider){
 const anthropic=provider==='anthropic',keyName=anthropic?'ANTHROPIC_API_KEY':'OPENAI_API_KEY',label=anthropic?'Anthropic':'OpenAI';
 const owner='intelligence-test-'+provider,id='equipment-llm';
 let p=withFinalReview(createProject({name:'Equipment reservation',template:'blank'},id));
 p=applyCommand(p,{type:'artefact',payload:{type:'requirement',title:'Reserve equipment',description:'Reserve available equipment and retain its original outcome.',acceptance:'Repeated requests return the recorded reservation outcome.',source:'Equipment workshop'}}).document;
 p.coauthoring.sources.push({id:'SRC-001',versions:[{revision:1,title:'Equipment workshop',excerpt:'The equipment reservation outcome must remain identifiable. Uncertain outcomes need investigation.',location:'Workshop note',status:'Unconfirmed'}]});
 const files=new Map(),env={DB:localDatabase(':memory:'),...providerEnv({OPENAI_API_KEY:'test-key-never-returned',AIW_LLM_MODEL:'test-structured-model'},provider),FILES:{async put(k,v){files.set(k,v);},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}};
 await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind(owner,id,JSON.stringify(p),new Date().toISOString()).run();
 const raw={objectId:'REQ-001',chapter:4,mode:'design',prompt:'Develop the equipment reservation boundary and its uncertain outcome.'};
 const valid=packet=>({title:'Reservation boundary proposal',summary:'Keep the original reservation outcome identifiable.',passage:'The saved requirement is to reserve equipment and retain its original outcome. A cohesive reservation boundary is proposed; ownership and implementation remain to be confirmed.',sourceRefs:['S1'],assumptions:['The reservation outcome has one authority; confirm this design choice.'],questions:['Who owns the reservation boundary?'],options:packet.canDesign&&packet.request.mode!=='author'?[{title:'Keep reservation coordination together',approach:'cohesive',rationale:'Keep responsibility for the original outcome within one boundary.',tradeoffs:['Shared change and failure boundaries require review.'],sourceRefs:['S1'],answers:Object.fromEntries(SUGGESTED_FIELDS.map(k=>[k,k==='boundary'?'Own reservation acceptance and outcome lookup.':k==='information'?'Proposed reservation record authority.':'']))}]:[]});
 let calls=0,behaviour='valid',release;
 const providerResponse=packet=>new Response(JSON.stringify({id:'test-response',model:'test-structured-model',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(valid(packet))}]}],usage:{input_tokens:100,output_tokens:180}}));
 // The provider's own wire is checked first; then the request is answered as the Responses request it stands for.
 const responses=async(url,options)=>{calls++;const lastBody=JSON.parse(options.body);assert.equal(lastBody.store,false);assert.equal(lastBody.text.format.strict,true);if(lastBody.text.format.name==='aiw_source_check')return new Response(JSON.stringify({id:'test-review',model:'test-structured-model',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({supported:true,defects:[],notes:[]})}]}],usage:{input_tokens:50,output_tokens:20}}));const props=lastBody.text.format.schema.properties;assert(props.sourceRefs.items.enum?.includes('S1'));assert.equal(props.assumptions.items.enum,undefined);assert.equal(props.questions.items.enum,undefined);assert.equal(props.options.items.properties.tradeoffs.items.enum,undefined);const packet=JSON.parse(lastBody.input[0].content);if(behaviour==='hold')await new Promise(r=>release=r);if(behaviour==='refuse')return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'refusal',refusal:'test refusal'}]}]}));return providerResponse(packet);};
 const messages=viaAnthropic(responses);
 const previousFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  assert.equal(options.redirect,'error');
  if(!anthropic){assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer test-key-never-returned');assert.equal(JSON.parse(options.body).max_output_tokens,6000);return responses(url,options);}
  const body=JSON.parse(options.body);
  assert.equal(url,'https://api.anthropic.com/v1/messages?beta=true');assert.equal(header(options,'x-api-key'),'test-key-never-returned');assert.equal(header(options,'authorization'),null);assert.match(header(options,'anthropic-beta'),/server-side-fallback-2026-07-01/);
  assert.equal(body.model,'test-structured-model');assert.deepEqual(body.thinking,{type:'adaptive'});assert.equal(body.output_config.effort,'medium');assert.equal(body.output_config.format.type,'json_schema');assert.equal(body.fallbacks,'default');assert.equal(body.betas,undefined,'betas travel as the header, not in the body');
  assert.equal(body.stream,true,'the generate mode streams');assert.equal(body.max_tokens,32000);assert.deepEqual(body.system[0].cache_control,{type:'ephemeral'});assert.equal(body.output_format,undefined,'the deprecated output_format is not sent');
  return messages(url,options);
 };
 const req=async(path,body,{user=owner,origin='https://aiw.test',bindings=env}={})=>{const response=await worker.fetch(new Request('https://aiw.test'+path+(path.includes('?')?'&':'?')+'project='+id,{method:body?'POST':'GET',headers:{...(user?{'oai-authenticated-user-id':user}:{}),Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),bindings);return {status:response.status,data:await response.json()};};
 const command=(revision,type,payload)=>req('/api/commands',{revision,command:{type,payload}});
 try{
  assert.equal((await req('/api/intelligence/status',null,{user:''})).status,401);
  const status=await req('/api/intelligence/status',null,{bindings:{...env,[keyName]:undefined}});assert.equal(status.data.configured,false);assert.deepEqual(status.data.missing,[keyName]);assert(!JSON.stringify(status).includes('test-key-never-returned'));
  const configured=(await req('/api/intelligence/status')).data;assert.equal(configured.provider,label);assert.equal(configured.providerId,provider);assert.equal(configured.model,'test-structured-model');assert.equal(configured.effort,anthropic?'medium':null);assert.equal(configured.defaultHourlyRequests,30);assert(!JSON.stringify(configured).includes('test-key-never-returned'));
  assert.equal((await req('/api/intelligence/context',raw,{origin:'https://other.test'})).status,403);
  const prepared=await req('/api/intelligence/context',raw);assert.equal(prepared.status,200);const packet=prepared.data.packet;
  assert(packet.sources.some(s=>s.kind==='project-source'));assert(packet.sources.filter(s=>s.kind==='catalogue-description').every(s=>s.receipt?.recordHash&&s.receipt?.sourceHash),'catalogue guidance carries exact native source receipts');assert(!packet.sources.some(s=>s.kind==='knowledge'),'generic boundary wording does not insert the old pilot-style fallback');assert(!JSON.stringify(packet).includes('Bank Payment'));assert(packet.sources.reduce((n,s)=>n+s.excerpt.length,0)<=28000);
  assert.throws(()=>validateIntelligenceOutput({...valid(packet),sourceRefs:['S999']},packet),/outside/);
  assert.throws(()=>validateIntelligenceOutput({...valid(packet),commands:[{type:'review.accept'}]},packet),/structure/);
  {const labelled=validateIntelligenceOutput({...valid(packet),assumptions:['S1','A reasoned assumption.']},packet);assert.deepEqual(labelled.assumptions,['A reasoned assumption.']);assert.match(labelled.setAside.join(' '),/only listed citation labels/);}
  assert.equal(calls,0);
  const requestId=crypto.randomUUID(),generation={...raw,packetStamp:packet.stamp,requestId};
  assert.equal((await req('/api/intelligence/generate',generation,{bindings:{...env,[keyName]:undefined}})).status,503);assert.equal(calls,0);
  assert.equal((await req('/api/intelligence/generate',{...generation,packetStamp:'changed'})).status,409);assert.equal(calls,0);
  const generated=await req('/api/intelligence/generate',generation);assert.equal(generated.status,200,JSON.stringify(generated.data));assert.equal(generated.data.status,'completed');assert.equal(calls,2);
  assert.equal(generated.data.provider,label);assert.equal(generated.data.providerReceipt.provider,provider);assert.equal(generated.data.providerReceipt.calls.length,2);assert.deepEqual(generated.data.providerReceipt.prompt,{promptVersion:'sol-generate-1',sha256:generated.data.instructions.sha256});
  if(anthropic){assert.equal(generated.data.providerReceipt.api,'messages');assert.equal(generated.data.providerReceipt.streamed,true);assert(generated.data.providerReceipt.calls.every(c=>/^msg_mock_/.test(c.responseId)&&c.stopReason==='end_turn'));assert(Number.isInteger(generated.data.usage.cacheWriteTokens)&&generated.data.usage.cacheWriteTokens>0,'the first sight of a cached prefix is a cache write');}
  else assert.deepEqual(Object.keys(generated.data.usage).sort(),['inputTokens','outputTokens'],'the OpenAI usage is as before');
  assert.equal((await req('/api/project')).data.revision,1,'Generation must not mutate the model');
  const replay=await req('/api/intelligence/generate',generation);assert.equal(replay.data.id,requestId);assert.equal(calls,2,'An idempotent replay must not bill again');
  assert.equal((await req('/api/intelligence/runs?id='+requestId,null,{user:'other-user'})).status,404);
  const adopted=await command(1,'intelligence.adopt',{runId:requestId,kind:'passage',body:'Injected client body',provider:'Forged provider'});assert.equal(adopted.status,200,JSON.stringify(adopted.data));let doc=adopted.data.document,n=doc.coauthoring.narratives[0];assert(n.body.includes('The saved requirement'));assert(!n.body.includes('Injected'));assert.equal(n.generation.provider,label);assert.equal(n.accepted,undefined);assert(noteCurrent(doc,n));assert(!assembleSDD(doc).includes('Drafting origin: '+label));
  const accepted=await command(2,'brain.accept',{id:n.id,revision:n.revision,reviewer:'Architect',reason:'Reviewed against the requirement and source excerpt.',reviewed:true});assert.equal(accepted.status,200);assert(assembleSDD(accepted.data.document).includes('Drafting origin: '+label));
  const design=await command(3,'intelligence.adopt',{runId:requestId,kind:'design',option:0});assert.equal(design.status,200,JSON.stringify(design.data));const t=design.data.document.coauthoring.designTasks[0];assert.equal(t.answers.boundary,'Own reservation acceptance and outcome lookup.');assert.equal(t.answers.owner,'');assert.equal(t.status,'questions');assert.equal(design.data.document.logical.responsibilities.length,0);assert.equal(t.generation.runId,requestId);
  let modelDraft=structuredClone(design.data.document);const answerTask=(type,payload={})=>{const task=modelDraft.coauthoring.designTasks[0];modelDraft=applyDesignCommand(modelDraft,{type,payload:{id:task.id,taskRevision:task.revision,...payload}}).document;};
  answerTask('design.answers',{answers:{boundary:'Own reservation acceptance.',exclusions:'Exclude equipment maintenance.',information:'Reservation register owns outcomes.',interaction:'event',failure:'Reconcile unknown outcomes before retry.',owner:'Equipment services',category:'compute',support:'Execute the reservation responsibility.',trustName:'Equipment environment',trustPolicy:'Named service identities.',operations:'Review restoration and operational ownership.',unknowns:'Operating evidence remains open.'}});answerTask('design.prepare');
  const alternative=modelDraft.modelAlternatives.records[0],preview=previewAlternative(modelDraft,alternative);
  const acceptedModel=applyAlternativeCommand(modelDraft,{type:'alternative.apply',payload:{id:alternative.id,alternativeRevision:alternative.revision,previewStamp:preview.stamp,reviewed:true,reviewer:'Architect',reason:'Reviewed the generated suggestions, confirmed the choices and accepted the proposed records.'}}).document;
  assert(designBasisCurrent(acceptedModel,acceptedModel.coauthoring.designTasks[0]),'Accepted changes must not immediately invalidate their own generation basis');
  acceptedModel.artefacts.find(r=>r.id==='REQ-001').description+=' A new obligation.';assert(!designBasisCurrent(acceptedModel,acceptedModel.coauthoring.designTasks[0]));
  const changed=structuredClone(design.data.document);changed.coauthoring.sources[0].versions.push({...changed.coauthoring.sources[0].versions[0],revision:2,excerpt:'A changed reservation source.'});assert(!noteCurrent(changed,changed.coauthoring.narratives[0]),'Extra retrieved source changes must invalidate the passage');
  await env.DB.prepare('UPDATE projects SET document=?,revision=5 WHERE owner_id=? AND id=?').bind(JSON.stringify(changed),owner,id).run();
  const stale=await command(5,'intelligence.adopt',{runId:requestId,kind:'design',option:0});assert.equal(stale.status,400);assert.match(stale.data.error,/context changed/);
  const context=brainContext(changed,changed.coauthoring.narratives[0].context);
  const refreshed=await command(5,'brain.refresh',{id:n.id,revision:changed.coauthoring.narratives[0].revision,basisStamp:context.stamp,reason:'Reviewed revised source and retained draft.',reviewed:true});assert.equal(refreshed.status,200);assert(noteCurrent(refreshed.data.document,refreshed.data.document.coauthoring.narratives[0]));assert(!noteCurrent(refreshed.data.document,{...refreshed.data.document.coauthoring.narratives[0],...refreshed.data.document.coauthoring.narratives[0].accepted}),'Draft source review must not refresh accepted text');
  const fresh=(await req('/api/intelligence/context',raw)).data.packet;behaviour='hold';const pendingId=crypto.randomUUID(),pendingBody={...raw,packetStamp:fresh.stamp,requestId:pendingId};const pending=req('/api/intelligence/generate',pendingBody);for(let i=0;i<50&&!release;i++)await new Promise(r=>setTimeout(r,5));assert(release);const whileRunning=await req('/api/intelligence/generate',pendingBody);assert.equal(whileRunning.data.status,'pending');assert.equal(calls,3);release();assert.equal((await pending).data.status,'completed');
  behaviour='refuse';const refused=await req('/api/intelligence/generate',{...raw,packetStamp:fresh.stamp,requestId:crypto.randomUUID()});
  if(anthropic){
   // A refusal that stands (the provider's fallback did not answer) is a withheld draft with its reason, receipted.
   assert.equal(refused.status,200,JSON.stringify(refused.data));assert.equal(refused.data.status,'completed');assert.equal(refused.data.groundingReview.accepted,false);assert.equal(refused.data.groundingReview.declined,true);assert.match(refused.data.groundingReview.issues[0],/declined to answer.*nothing was drafted/);
   assert.match(refused.data.result.summary,/^The provider declined to draft this explanation/);assert.equal(refused.data.providerReceipt.calls[0].stopReason,'refusal');assert.equal(refused.data.providerReceipt.calls[0].declined,true);
  }else{assert.equal(refused.status,502);assert.equal(refused.data.status,'failed');assert.equal(refused.data.result,undefined);assert.match(refused.data.error,/declined/);}
  const direct=f=>anthropic?viaAnthropic(f):f;
  await assert.rejects(requestIntelligence(env,fresh,{timeoutMs:10,fetcher:async(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('abort'))))}),/too long/);
  await assert.rejects(requestIntelligence(env,fresh,{fetcher:direct(async()=>new Response(JSON.stringify({status:'incomplete',output:[]}),{headers:{'Content-Type':'application/json'}}))}),/incomplete/);
  await assert.rejects(requestIntelligence(env,fresh,{fetcher:direct(async()=>new Response('private upstream detail',{status:401}))}),/server-side key/);
  const before=calls;env.FILES.put=async()=>{throw Error('storage fixture');};behaviour='valid';const failed=await req('/api/intelligence/generate',{...raw,packetStamp:fresh.stamp,requestId:crypto.randomUUID()});assert.equal(failed.status,502);assert.equal(calls,before,'No provider call when the request cannot be persisted');
  // The budget: a project without a policy gets thirty requests an hour, counted across Sol's modes.
  const count=(await env.DB.prepare('SELECT COUNT(*) AS count FROM intelligence_runs WHERE owner_id=?').bind(owner).first()).count;
  for(let i=count;i<30;i++)await env.DB.prepare("INSERT INTO intelligence_runs (owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at) VALUES (?,?,?,?,?,?,'failed',?,?,?,?,?)").bind(owner,crypto.randomUUID(),id,'REQ-001',i%2?'review':'design','budget-test',label,'test-model','unused',new Date().toISOString(),new Date().toISOString()).run();
  assert.equal((await req('/api/intelligence/generate',{...raw,packetStamp:fresh.stamp,requestId:crypto.randomUUID()})).status,429);assert.equal(calls,before);
  pass(`${label}: reviewed context, bounded retrieval, server-only credentials, output/source validation, no automatic changes, durable runs with provider receipts, duplicate protection, owner isolation, draft/accepted provenance, stale sources, ${anthropic?'refusal as a withheld draft':'refusal'}, timeout, incomplete, authentication, request budget of 30 an hour and storage failure`);
 }finally{globalThis.fetch=previousFetch;env.DB.close();}
}
await suite('openai');
await suite('anthropic');

// ---------------------------------------------------------------- the Anthropic provider's own probes
const anthropicEnv={ANTHROPIC_API_KEY:'test-key-never-returned'};
const reference=withFinalReview(seedProject());
{
 // The request body: the pinned instructions as a cached system block, then for a journey the brief's passages in
 // their own cached block, then the rest of the packet; the same order for the journey's check. Elsewhere one block.
 const status=intelligenceStatus(anthropicEnv),journey={task:'journey-draft',passages:[{id:'P1',text:'A stable brief passage.'}],records:[{key:'r1',fields:[]}],stamp:'s'};
 const draftBody=anthropicRequest(status,{instructions:'pinned',input:journey,schema:{type:'object',properties:{answers:{type:'array',maxItems:3,items:{type:'string'}}},required:['answers'],additionalProperties:false},name:'aiw_journey_draft',mode:'journey'});
 assert.deepEqual(draftBody.system,[{type:'text',text:'pinned',cache_control:{type:'ephemeral'}}]);
 assert.deepEqual(draftBody.messages[0].content.map(b=>[JSON.parse(b.text),!!b.cache_control]),[[{passages:journey.passages},true],[{task:'journey-draft',records:journey.records,stamp:'s'},false]]);
 assert.equal(draftBody.model,'claude-opus-5-5');assert.equal(draftBody.max_tokens,32000);assert.deepEqual(draftBody.betas,['server-side-fallback-2026-07-01']);assert.equal(draftBody.fallbacks,'default');
 const checkBlocks=userBlocks('journey',{packet:journey,candidate:{answers:[]}});
 assert.deepEqual(checkBlocks.map(b=>[JSON.parse(b.text),!!b.cache_control]),[[{packet:{passages:journey.passages}},true],[{packet:{task:'journey-draft',records:journey.records,stamp:'s'},candidate:{answers:[]}},false]]);
 assert.equal(userBlocks('field',{passages:[1]}).length,1,'only the journey lifts its passages');
 // The structured-output format keeps types, enums and closed objects; limits it does not take move to the description.
 const schema=structuredSchema({type:'object',properties:{refs:{type:'array',maxItems:2,items:{type:'string',enum:['S1','S2']}},title:{type:'string',maxLength:9}},required:['refs','title'],additionalProperties:false},'aiw_x');
 assert.equal(schema.title,'aiw_x');assert.deepEqual(schema.properties.refs.items.enum,['S1','S2']);assert.equal(schema.properties.refs.maxItems,undefined);assert.match(schema.properties.refs.description,/maxItems: 2/);assert.equal(schema.properties.title.maxLength,undefined);assert.equal(schema.additionalProperties,false);
 // Through the seam and the mock, with the SDK: the bodies the provider received, in stable-first order, streamed.
 const bodies=[],seen=async(url,init)=>{bodies.push(JSON.parse(init.body));return new Response(JSON.stringify({id:'r',model:'m',status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{"answers":[]}'}]}],usage:{input_tokens:10,output_tokens:5}}),{headers:{'Content-Type':'application/json'}});};
 const wire=viaAnthropic(seen),call={signal:new AbortController().signal,aborted:false,attempts:0};
 const r=await modelCall(anthropicEnv,status,{instructions:'pinned instructions',input:{passages:journey.passages,records:journey.records,note:'api_key=sk-test-never-sent-123456789'},schema:{type:'object',properties:{answers:{type:'array',items:{type:'string'}}},required:['answers'],additionalProperties:false},name:'aiw_journey_draft',mode:'journey'},call,wire);
 assert.deepEqual(r.raw,{answers:[]});assert.equal(r.stopReason,'end_turn');assert.equal(wire.bodies[0].stream,true);assert(!JSON.stringify(wire.bodies[0]).includes('sk-test-never-sent'),'secrets are redacted before either wire');
 assert.equal(wire.bodies[0].messages[0].content[0].cache_control.type,'ephemeral');assert.match(wire.bodies[0].messages[0].content[0].text,/^\{"passages":/);assert.equal(wire.bodies[0].messages[0].content[1].cache_control,undefined);
 assert.equal(bodies[0].text.format.name,'aiw_journey_draft','the contract name travels as the schema title');
 pass('Anthropic request: pinned instructions and a journey\'s brief passages in cached blocks, stable first (draft and check); structured output with enums kept and limits described; adaptive thinking, medium effort, the refusal fallback beta; streamed journey; secrets redacted');
}
{
 // Usage: whole prompt = uncached + cache reads + writes; after a refusal fallback the per-attempt iterations count.
 assert.deepEqual(anthropicUsage({},{input_tokens:10,output_tokens:5,cache_read_input_tokens:100,cache_creation_input_tokens:20}),{inputTokens:130,outputTokens:5,cacheReadTokens:100,cacheWriteTokens:20});
 assert.deepEqual(anthropicUsage({},{input_tokens:7,output_tokens:3,iterations:[{type:'message',input_tokens:50,output_tokens:0,cache_read_input_tokens:0,cache_creation_input_tokens:0},{type:'fallback_message',input_tokens:7,output_tokens:3,cache_read_input_tokens:40,cache_creation_input_tokens:0}]}),{inputTokens:97,outputTokens:3,cacheReadTokens:40,cacheWriteTokens:0});
 assert.deepEqual(anthropicUsage({AIW_LLM_PRICE_INPUT_PER_MTOK:'4',AIW_LLM_PRICE_OUTPUT_PER_MTOK:'20',AIW_LLM_PRICE_CACHE_READ_PER_MTOK:'0.2'},{input_tokens:1000000,output_tokens:0,cache_read_input_tokens:1000000}).cost.amount,4.2,'cache reads at their own rate');
 // A fallback-served answer: the text after the switch point is the answer, the receipt names who answered.
 const status=intelligenceStatus(anthropicEnv),call={signal:new AbortController().signal,aborted:false,attempts:0};
 const served=async()=>new Response(JSON.stringify({id:'msg_fb',type:'message',role:'assistant',model:'fallback-model',content:[{type:'text',text:'{"partial":'},{type:'fallback',from:{model:'claude-opus-5-5'},to:{model:'fallback-model'}},{type:'text',text:'{"answers":["kept"]}'}],stop_reason:'end_turn',usage:{input_tokens:5,output_tokens:4,iterations:[{type:'message',input_tokens:30,output_tokens:2,cache_read_input_tokens:0,cache_creation_input_tokens:0},{type:'fallback_message',model:'fallback-model',input_tokens:5,output_tokens:4,cache_read_input_tokens:0,cache_creation_input_tokens:0}]}}),{headers:{'Content-Type':'application/json'}});
 const r=await modelCall(anthropicEnv,status,{instructions:'x',input:{},schema:{type:'object'},name:'aiw_probe',mode:'field'},call,served);
 assert.deepEqual(r.raw,{answers:['kept']});assert.equal(r.model,'fallback-model');assert.deepEqual(r.fallback,{servedBy:'fallback-model',switches:[{from:'claude-opus-5-5',to:'fallback-model'}]});assert.equal(r.usage.inputTokens,35);assert.equal(r.usage.outputTokens,6);
 // Typed errors in the seam's codes; a 429 is retried once, then answered as the provider's limit.
 const statusOf=s=>async()=>new Response(JSON.stringify({type:'error',error:{type:'x',message:'upstream detail'}}),{status:s,headers:{'Content-Type':'application/json'}});
 let hits=0;const limited=async()=>{hits++;return new Response(JSON.stringify({type:'error',error:{type:'rate_limit_error',message:'slow down'}}),{status:429,headers:{'Content-Type':'application/json','retry-after':'0'}});};
 await assert.rejects(modelCall(anthropicEnv,status,{instructions:'x',input:{},schema:{type:'object'},name:'p',mode:'field'},{...call,attempts:0},limited),e=>e.code==='provider_limit'&&!/slow down/.test(e.message));assert.equal(hits,2,'one bounded retry, then the limit');
 await assert.rejects(modelCall(anthropicEnv,status,{instructions:'x',input:{},schema:{type:'object'},name:'p',mode:'field'},{...call},statusOf(401)),e=>e.code==='authentication');
 await assert.rejects(modelCall(anthropicEnv,status,{instructions:'x',input:{},schema:{type:'object'},name:'p',mode:'field'},{...call},statusOf(400)),e=>e.code==='provider_unavailable'&&!/upstream detail/.test(e.message));
 await assert.rejects(modelCall(anthropicEnv,status,{instructions:'x',input:{},schema:{type:'object'},name:'p',mode:'field'},{...call},async()=>{throw TypeError('connection refused');}),e=>e.code==='provider_unavailable');
 await assert.rejects(modelCall({...anthropicEnv,AIW_ANTHROPIC_BASE_URL:'http://gateway.example'},status,{instructions:'x',input:{},schema:{type:'object'},name:'p',mode:'field'},{...call},served),e=>e.code==='not_configured','a gateway must be https, or http on loopback');
 pass('Anthropic receipts and errors: usage counts cache reads and writes (and every attempt after a fallback), priced at their own rates; a fallback-served answer is read after its switch point and names the model that answered; 429 retried once then provider_limit; 401 authentication; other statuses and lost connections provider_unavailable without upstream text; a gateway must be https or loopback');
}
{
 // Status and the connection probe for both providers; the provider choice and its settings.
 assert.equal(intelligenceStatus({}).providerId,'anthropic');assert.deepEqual(intelligenceStatus({}).missing,['ANTHROPIC_API_KEY']);
 assert.equal(intelligenceStatus({OPENAI_API_KEY:'k',AIW_LLM_MODEL:'m'}).providerId,'openai','only an OpenAI key: OpenAI, as before');
 assert.equal(intelligenceStatus({OPENAI_API_KEY:'k',ANTHROPIC_API_KEY:'k'}).providerId,'anthropic','both keys: Anthropic unless named');
 assert.equal(intelligenceStatus({OPENAI_API_KEY:'k',ANTHROPIC_API_KEY:'k',AIW_LLM_PROVIDER:'openai',AIW_LLM_MODEL:'m'}).providerId,'openai');
 // Round 11, decision 7: an OpenAI key alone connects; the documented default model is one named constant, and status
 // says the model was defaulted. What is missing is exactly the selected provider's variables, never the other's.
 assert.deepEqual(intelligenceStatus({OPENAI_API_KEY:'k',AIW_LLM_PROVIDER:'OpenAI'}).missing,[],'a key alone connects: AIW_LLM_MODEL is no longer required');
 assert.deepEqual([intelligenceStatus({OPENAI_API_KEY:'k'}).configured,intelligenceStatus({OPENAI_API_KEY:'k'}).model,intelligenceStatus({OPENAI_API_KEY:'k'}).modelDefaulted,OPENAI_DEFAULT_MODEL],[true,'gpt-4.1-mini',true,'gpt-4.1-mini'],'the default model is the documented constant');
 assert.deepEqual([intelligenceStatus({OPENAI_API_KEY:'k',AIW_LLM_MODEL:'m'}).model,intelligenceStatus({OPENAI_API_KEY:'k',AIW_LLM_MODEL:'m'}).modelDefaulted],['m',false],'AIW_LLM_MODEL still names another');
 assert.deepEqual([intelligenceStatus({AIW_LLM_PROVIDER:'openai'}).provider,intelligenceStatus({AIW_LLM_PROVIDER:'openai'}).missing],['OpenAI',['OPENAI_API_KEY']],'OpenAI selected without a key: the missing list names that key only');
 assert.deepEqual([intelligenceStatus({OPENAI_API_KEY:'k',AIW_LLM_PROVIDER:'anthropic'}).provider,intelligenceStatus({OPENAI_API_KEY:'k',AIW_LLM_PROVIDER:'anthropic'}).missing],['Anthropic',['ANTHROPIC_API_KEY']],'Anthropic selected with only an OpenAI key: its own key is what is missing');
 assert.equal(intelligenceStatus({OPENAI_API_KEY:'k'}).modelDefaulted,true);assert.equal(intelligenceStatus({ANTHROPIC_API_KEY:'k'}).modelDefaulted,true);assert.equal(intelligenceStatus({}).modelDefaulted,true);
 assert.equal(intelligenceStatus({ANTHROPIC_API_KEY:'k',AIW_LLM_PROVIDER:'gemini'}).configured,false);
 assert.equal(intelligenceStatus({ANTHROPIC_API_KEY:'k',AIW_LLM_EFFORT:'XHIGH'}).effort,'xhigh');assert.equal(intelligenceStatus({ANTHROPIC_API_KEY:'k',AIW_LLM_EFFORT:'turbo'}).configured,false);
 assert.equal(intelligenceStatus({ANTHROPIC_API_KEY:'k',AIW_LLM_MODEL:'claude-sonnet-5-5'}).model,'claude-sonnet-5-5');
 assert.equal(intelligenceStatus({ANTHROPIC_API_KEY:'k',AIW_LLM_REFUSAL_FALLBACK:'off'}).refusalFallback,'off');
 assert.equal(anthropicRequest(intelligenceStatus({ANTHROPIC_API_KEY:'k',AIW_LLM_REFUSAL_FALLBACK:'off'}),{instructions:'x',input:{},schema:{type:'object'},name:'p',mode:'field'}).fallbacks,undefined);
 const probes=[];const probe=await verifyConnection(anthropicEnv,{fetcher:async(url,init)=>{probes.push([url,header(init,'x-api-key')]);return new Response(JSON.stringify({type:'model',id:'claude-opus-5-5'}),{headers:{'Content-Type':'application/json'}});},force:true});
 assert.equal(probe.ok,true);assert.deepEqual(probes,[['https://api.anthropic.com/v1/models/claude-opus-5-5','test-key-never-returned']]);assert.equal(intelligenceStatus(anthropicEnv).connectionVerified.ok,true);
 assert.equal((await verifyConnection(anthropicEnv,{fetcher:async()=>new Response('{}',{status:401,headers:{'Content-Type':'application/json'}}),force:true})).code,'authentication');
 assert.equal(intelligenceStatus({OPENAI_API_KEY:'k',AIW_LLM_MODEL:'claude-opus-5-5'}).connectionVerified,null,'a probe of one provider is not reported for the other');
 assert.equal((await verifyConnection({OPENAI_API_KEY:'k',AIW_LLM_MODEL:'m'},{fetcher:async url=>{assert.equal(url,'https://api.openai.com/v1/models/m');return new Response('{}');},force:true})).ok,true);
 pass('status and probe: the provider is chosen by AIW_LLM_PROVIDER, else by the key present (Anthropic first); status names provider, model and effort; settings are validated; the connection probe asks each provider for its model, with its own key');
}
// rc39 (W3 step 5, PLAN §4.3.4), before the model-review block below, which fails at the baseline (line 200) on a
// connected model the reference no longer draws that way: Sol's packet carries the design basis (design-questions.js) for a record on Chapters 5–7
// and for a driver on Chapter 2, as one visible source placed with the decision context; the review packet of
// Chapters 5–7 carries the chapter's design basis (each record with its drivers and question counts) so a finding can
// say a selection has no driver behind it; two starters on Chapters 5–7 draft the question with the basis in it.
{
 const {designBasisSource,designStarters,DESIGN_BASIS_POSTURE}=await import('./public/intelligence-context.js');
 const packet=intelligencePacket(reference,{chapter:5,objectId:'api-pod',mode:'mind',prompt:'Why this kind of component here?'});
 const basis=packet.sources.find(s=>s.kind==='design-questions');
 assert.ok(basis&&basis.objectId==='api-pod'&&basis.id==='design-questions:api-pod'&&basis.title==='Design basis · APP-001'&&basis.posture===DESIGN_BASIS_POSTURE,'the record\'s design basis is one source of the packet: '+JSON.stringify(basis&&{id:basis.id,title:basis.title}));
 const x=JSON.parse(basis.excerpt);
 assert.deepEqual(x.drivers.map(d=>d.id),['QD-001','QD-002','QD-003','QD-005','QD-006'],'the drivers reaching it');
 assert.ok(x.questions.some(q=>q.id==='read-path'&&q.state==='open'&&q.because.join()==='QD-003'&&q.caution&&q.story===''),'the questions with their state, openers, caution and (empty) story');
 assert.ok(x.questions.some(q=>q.id==='persistence'&&q.state==='draft'&&q.answers.some(a=>a.ref==='TN-002'&&a.chapter===6)),'the answers with their chapter');
 assert.deepEqual(x.counts,{open:3,draft:6,decided:0});
 {const firstOptional=packet.sources.findIndex(s=>['knowledge','catalogue-description','governed-claim','project-source','workbook-row'].includes(s.kind));assert.ok(firstOptional===-1||packet.sources.indexOf(basis)<firstOptional,'placed with the decision context, before the optional knowledge: '+packet.sources.map(s=>s.kind).join(','));}
 assert.equal(intelligencePacket(reference,{chapter:5,objectId:'api-pod',mode:'mind',prompt:'Why this kind of component here?'}).stamp,packet.stamp,'deterministic');
 const driver=intelligencePacket(reference,{chapter:2,objectId:'QD-003',mode:'design',prompt:'What does this driver ask of the design?'}),ds=driver.sources.find(s=>s.kind==='design-questions'),y=JSON.parse(ds.excerpt);
 assert.ok(ds.title==='What QD-003 asks of the design'&&y.driver.id==='QD-003'&&y.driver.shape==='latency'&&y.driver.attribute.family==='Performance and scale','a driver\'s packet carries what it asks: '+ds.title);
 assert.deepEqual(y.questions.map(q=>q.id),['read-path','persistence','handoff','protected-call']);
 assert.ok(y.questions[0].lands.some(l=>l.ref==='APP-001'&&l.state==='open')&&y.questions[0].tactics.length>=2,'where it lands and the playbook tactics');
 assert.ok(!intelligencePacket(reference,{chapter:4,objectId:'api',mode:'design',prompt:'Examine this responsibility.'}).sources.some(s=>s.kind==='design-questions'),'a Chapter 4 record has no design basis source');
 assert.equal(designBasisSource(reference,{id:'project'}),null);
 const hidden=structuredClone(reference);hidden.workspace={...hidden.workspace,aiPolicy:{excludedObjectIds:['QD-003']}};
 assert.ok(!JSON.stringify(intelligencePacket(hidden,{chapter:5,objectId:'api-pod',mode:'mind',prompt:'Why this kind of component here?'})).includes('QD-003'),'the disclosure policy masks an excluded driver in the basis too');
 // The review packet of a chapter: every record with its drivers and counts; the totals the projection's; the connected model still last.
 const review=reviewPacket(reference,{chapter:5}),rs=review.sources.find(s=>s.kind==='design-questions'),z=JSON.parse(rs.excerpt);
 assert.ok(rs.title==='Chapter 5’s design basis'&&rs.posture===DESIGN_BASIS_POSTURE&&review.sources.at(-1).kind==='connected-model');
 assert.equal(z.records.length,reference.realisation.components.length);assert.deepEqual(z.totals,{open:6,draft:15,decided:0});
 assert.ok(z.records.every(r=>Array.isArray(r.driverIds)&&typeof r.noDriver==='boolean'&&['open','draft','decided','none'].includes(r.state))&&z.records.find(r=>r.id==='api-pod').open===3,'each record says which drivers reach it and what is open');
 const lonely=structuredClone(reference);lonely.quality.drivers=[];
 assert.ok(JSON.parse(reviewPacket(lonely,{chapter:5}).sources.find(s=>s.kind==='design-questions').excerpt).records.every(r=>r.noDriver&&r.state==='none'),'with no driver every selection is marked as having none behind it');
 assert.ok(!reviewPacket(reference,{chapter:4}).sources.some(s=>s.kind==='design-questions'),'Chapter 4\'s review packet is as it was');
 assert.equal(reviewPacket(reference,{chapter:5}).stamp,review.stamp,'deterministic');
 // The starters.
 const st=designStarters(reference,5,'api-pod');
 assert.deepEqual(st.map(x=>[x[0],x[1]]),[['design-why','Why this kind of component here?'],['design-tighten','What would change if QD-001 tightened?']]);
 assert.ok(/^Why is APP-001 the kind of component it is/.test(st[0][2])&&/Its design basis: QD-001 \(Preserve one financial effect, At most 0 extra debits\); QD-002/.test(st[0][2])&&/Open questions: Read from the authority or keep a bounded read copy\? \(QD-003\); Relational records or an aggregate document, and which product\? \(QD-001, QD-003, QD-006, a draft answer recorded\)/.test(st[0][2])&&/Decided: nothing yet\./.test(st[0][2])&&/propose nothing as decided\.$/.test(st[0][2]),'the first drafts the question with the basis in it: '+st[0][2]);
 assert.ok(/^If QD-001 \(Preserve one financial effect, now At most 0 extra debits\) tightened, which of APP-001’s design questions/.test(st[1][2])&&/ask me for the new target rather than inventing one\.$/.test(st[1][2]),'the second follows a tighter target through the basis: '+st[1][2]);
 assert.deepEqual(designStarters(reference,4,'api'),[]);assert.deepEqual(designStarters(reference,5,'nobody'),[]);assert.deepEqual(designStarters(lonely,5,'api-pod'),[],'none without a driver');
 pass('rc39: Sol\'s packet carries the design basis of a record (Chapters 5–7) and of a driver (Chapter 2) as one visible source with the decision context, masked by the disclosure policy; the chapter review packet carries the chapter\'s design basis so a selection with no driver behind it can be named; two starters on Chapters 5–7 draft the question with the basis; nothing is sent by any of it');
}
{
 // Sol's model review (Contract R): the packet, the contract, the guard and the check; a refusal withholds; the route.
 const packet=reviewPacket(reference,{chapter:4},{instructions:reviewInstructionsPin()});
 assert.equal(packet.task,'model-review');assert(packet.sources[0].kind==='chapter-checks');assert(packet.sources.some(s=>s.kind==='connected-model'));
 const records=packet.sources.filter(s=>s.kind==='record');assert(records.length>0&&records.every(s=>packet.elementIds.includes(s.objectId)));
 const model=JSON.parse(packet.sources.at(-1).excerpt);assert(model.elements.length>records.length&&model.relationships.length>0);assert(model.relationships.every(e=>packet.elementIds.includes(e.from)&&packet.elementIds.includes(e.to)));
 assert.equal(packet.brainReceipt.instructions.promptVersion,REVIEW_PROMPT_VERSION);assert.equal(packet.brainReceipt.scoring,false);
 assert.deepEqual(reviewPacket(reference,{chapter:4},{instructions:reviewInstructionsPin()}).stamp,packet.stamp,'the packet is deterministic');
 const historicalRun={id:'historical-review-fixture',mode:'review',status:'completed',request:{chapter:4},packet,instructions:reviewInstructionsPin(),result:{findings:[{id:'F1',elementId:records[0].objectId,severity:'confirm',title:'Confirm the responsibility boundary',reason:'The boundary needs a named acceptance condition.'}]}};
 assert.equal(reviewFindingBasis(reference,historicalRun).current,true);
 const withdrawnReceipt={...historicalRun,packet:{...packet,sources:[...packet.sources,{kind:'knowledge',receipt:{patternId:'withdrawn',releaseId:'old'}}]}};
 assert.equal(reviewFindingBasis(reference,withdrawnReceipt).current,false,'a stale knowledge receipt cannot authorize current adoption');
 const staleProject=structuredClone(reference),changedResponsibility=staleProject.logical.responsibilities.find(r=>r.id===records[0].objectId);
 assert(changedResponsibility);changedResponsibility.boundary+=' The new boundary requires additional review.';
 assert.equal(reviewFindingBasis(staleProject,historicalRun).current,false);
 const historicalPayload={reviewed:true,findingId:'F1'};
 assert.throws(()=>adoptReviewFinding(staleProject,historicalPayload,historicalRun),/historical finding/);
 assert.throws(()=>adoptReviewFinding(staleProject,{...historicalPayload,historicalAcknowledged:true,historicalReason:'too brief'},historicalRun),/at least 20 characters/);
 const historical=adoptReviewFinding(staleProject,{...historicalPayload,historicalAcknowledged:true,historicalReason:'The changed responsibility still needs its acceptance condition examined.'},historicalRun),historicalAction=historical.document.finalReview.actions.find(a=>a.id===historical.selected);
 assert.equal(historicalAction.provenance.solReview.basis.currentAtAdoption,false);assert.equal(historicalAction.provenance.solReview.basis.savedStamp,packet.stamp);assert.match(historicalAction.acceptance,/historical basis acknowledged/i);
 assert.equal(adoptReviewFinding(historical.document,historicalPayload,historicalRun).selected,historical.selected,'a recorded action remains idempotent');
 const excluded=structuredClone(reference);excluded.workspace={...excluded.workspace,aiPolicy:{enabled:true,hourlyRequests:30,dailyTokens:1000000,excludedObjectIds:[records[0].objectId]}};
 const excludedReview=reviewPacket(excluded,{chapter:4});
 assert(!excludedReview.elementIds.includes(records[0].objectId),'the disclosure policy keeps an excluded record out');
 const excludedIntelligence=intelligencePacket(excluded,{chapter:4,objectId:records[1].objectId,mode:'mind',prompt:'Examine the responsibility boundary and its evidence.'});
 const excludedJourney=journeyPacket(excluded,{chapter:4},{chapter:4,title:'Logical application',records:[],citations:[]},{passages:[]});
 for(const candidate of [excludedReview,excludedIntelligence,excludedJourney]){
  assert.equal(candidate.disclosure.excludedObjectCount,1);
  assert(!('excludedObjectIds' in candidate.disclosure),'excluded object IDs must not be sent as provider metadata');
 }
 const hiddenRequirement=structuredClone(reference);hiddenRequirement.workspace={...hiddenRequirement.workspace,aiPolicy:{excludedObjectIds:['REQ-001']}};
 const hiddenPacket=intelligencePacket(hiddenRequirement,{chapter:5,objectId:'api-pod',mode:'mind',prompt:'Explain REQ-001 and the payment path.'});
 assert(!JSON.stringify(hiddenPacket).includes('REQ-001'),'a linked excluded identifier is masked throughout the exact preview/provider packet');
 assert.notEqual(hiddenPacket.requirementId,'REQ-001','the default design requirement is an eligible source');
 assert.equal(hiddenPacket.coverage.sourceCount,hiddenPacket.sources.length);
 assert.throws(()=>intelligencePacket(hiddenRequirement,{chapter:5,objectId:'api-pod',mode:'mind',prompt:'Compare the requirement.',requirementId:'REQ-001'}),/excludes this requirement/);
 assert.throws(()=>intelligencePacket(hiddenRequirement,{chapter:1,objectId:'REQ-001',mode:'mind',prompt:'Examine this.'}),/excludes this object/);
 assert.throws(()=>reviewPacket(reference,{chapter:12}),/1 to 11/);
 const f=(over={})=>({elementId:records[0].objectId,severity:'confirm',title:'Confirm the boundary',reason:`The record in ${records[0].ref} is unconfirmed.`,sourceRefs:[records[0].ref],...over});
 const v=validateReviewDraft({findings:[f(),f({elementId:'invented'}),f({sourceRefs:['S999']}),f({severity:'critical'}),f({reason:'See https://example.test'}),...Array.from({length:22},()=>f())]},packet);
 assert.equal(v.findings.length,16);assert.deepEqual(v.findings.map(x=>x.id).slice(0,2),['F1','F2']);assert.equal(v.setAside.length,4);assert.deepEqual(v.trimmed,['findings']);
 assert.throws(()=>validateReviewDraft({findings:[{...f(),extra:1}]},packet),/unsupported review finding/);assert.throws(()=>validateReviewDraft({notes:[]},packet),/unsupported review structure/);
 // Through the provider on the Anthropic wire: one finding names a number the packet lacks, one guarantees; both withheld.
 const draft={findings:[f(),f({elementId:records[1]?.objectId||records[0].objectId,sourceRefs:[records[1]?.ref||records[0].ref],title:'Size the hub',reason:'It needs 987654 messages a second.'}),f({severity:'fix',title:'Make it idempotent',reason:'Keying on the reference ensures exactly-once processing.'})]};
 const reviewer=viaAnthropic(async(url,init)=>{const b=JSON.parse(init.body);const body=b.text.format.name==='aiw_model_review'?draft:answer(b).output?JSON.parse(answer(b).output[0].content[0].text):{};return new Response(JSON.stringify({id:'r',model:'m',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(body)}]}],usage:{input_tokens:900,output_tokens:100}}),{headers:{'Content-Type':'application/json'}});});
 const run=await requestModelReview(anthropicEnv,packet,{fetcher:reviewer});
 assert.equal(run.result.findings.length,1);assert.equal(run.result.withheld.length,2);assert.match(run.result.withheld[0].issues.join(' '),/987654/);assert.match(run.result.withheld[1].issues.join(' '),/guaranteeing/);
 assert.equal(run.groundingReview.accepted,false);assert.deepEqual(run.instructions,reviewInstructionsPin());assert.equal(run.providerReceipt.calls.length,2);assert.equal(reviewer.bodies[0].stream,undefined,'the review is not a streamed mode');assert.equal(reviewer.bodies[0].max_tokens,16000);
 assert.deepEqual(reviewer.bodies[0].output_config.format.schema.properties.findings.items.properties.elementId.enum,packet.elementIds);
 // A refusal that stands: no finding, the reason recorded.
 const declined=await requestModelReview(anthropicEnv,packet,{fetcher:async()=>new Response(JSON.stringify({id:'msg_no',type:'message',role:'assistant',model:'claude-opus-5-5',content:[],stop_reason:'refusal',stop_details:{type:'refusal',category:'cyber',explanation:'model words never recorded'},usage:{input_tokens:12,output_tokens:0}}),{headers:{'Content-Type':'application/json'}})});
 assert.deepEqual(declined.result.findings,[]);assert.match(declined.result.declined,/declined to answer \(refusal category: cyber\)/);assert(!JSON.stringify(declined).includes('model words never recorded'));assert.equal(declined.groundingReview.accepted,false);assert.equal(declined.usage.inputTokens,12);
 pass('model review: the packet holds the chapter\'s records with their checks and the connected model, every element and source by id, deterministic and disclosure-bound; findings outside the packet, of an unknown severity or with a link are set aside, past twenty cut; a number the packet lacks or a guarantee withholds the finding; a refusal withholds all with its category, never the model\'s words');
}
{
 // The review routes: the preview needs no key, the request does; the run is saved as a review, counted in the
 // budget, listed for the picture, receipted with cache reads, and a 429 from the provider is the service's retry answer.
 const owner='review-test',id='review-project',files=new Map(),cache=new Set();
 let mode='valid';const base=async(url,init)=>{const b=JSON.parse(init.body);if(mode==='limit')return new Response('{}',{status:429,headers:{'retry-after':'0'}});return new Response(JSON.stringify(answer(b)),{headers:{'Content-Type':'application/json'}});};
 const wire=viaAnthropic(base,{cache});
 const steps=[],env={DB:localDatabase(':memory:'),ANTHROPIC_API_KEY:'test-key-never-returned',FILES:{async put(k,v){files.set(k,v);try{const x=JSON.parse(v);if(x.status==='pending'&&x.step)steps.push(x.step);}catch{/* not a run */}},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}};
 const doc={...structuredClone(reference),id};await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind(owner,id,JSON.stringify(doc),new Date().toISOString()).run();
 const previousFetch=globalThis.fetch;globalThis.fetch=wire;
 const req=async(path,body,{bindings=env,origin='https://aiw.test'}={})=>{const response=await worker.fetch(new Request('https://aiw.test'+path+(path.includes('?')?'&':'?')+'project='+id,{method:body?'POST':'GET',headers:{'oai-authenticated-user-id':owner,Origin:origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),bindings);return {status:response.status,data:await response.json()};};
 try{
  const noKey={...env,ANTHROPIC_API_KEY:undefined};
  const preview=await req('/api/intelligence/review-context',{chapter:4},{bindings:noKey});assert.equal(preview.status,200);assert.equal(preview.data.configuration.configured,false);assert.equal(preview.data.packet.task,'model-review');
  assert.equal((await req('/api/intelligence/review-context',{chapter:4},{origin:'https://other.test'})).status,403);assert.equal((await req('/api/intelligence/review-context',{chapter:0})).status,400);
  const packet=preview.data.packet,send=extra=>req('/api/intelligence/review',{chapter:4,packetStamp:packet.stamp,requestId:crypto.randomUUID(),...extra});
  assert.equal((await req('/api/intelligence/review',{chapter:4,packetStamp:packet.stamp,requestId:crypto.randomUUID()},{bindings:noKey})).status,503);assert.equal(wire.bodies.length,0,'no key, no provider call');
  assert.equal((await send({packetStamp:'changed'})).status,409);assert.equal(wire.bodies.length,0);
  const first=await send({});assert.equal(first.status,200,JSON.stringify(first.data));assert.equal(wire.bodies.length,2,'a draft call then a check call');assert.deepEqual(steps,['drafting','checking'],'the pending run records its step for the progress line: drafting, then checking');assert.equal(first.data.usage.cacheReadTokens,0);
  const second=await send({});assert.equal(second.status,200,JSON.stringify(second.data));assert.equal(second.data.mode,'review');assert.equal(second.data.status,'completed');assert(second.data.result.findings.length>0);assert(second.data.result.findings.every(x=>packet.elementIds.includes(x.elementId)));
  assert(second.data.usage.cacheReadTokens>0,'the second review reads the cached instructions');assert(second.data.providerReceipt.calls[0].usage.cacheReadTokens>0);
  const row=await env.DB.prepare('SELECT mode,object_id,used_tokens FROM intelligence_runs WHERE owner_id=? AND id=?').bind(owner,second.data.id).first();assert.equal(row.mode,'review');assert.equal(row.object_id,'review:4');assert.equal(row.used_tokens,second.data.usage.inputTokens+second.data.usage.outputTokens,'the token accounting counts the whole prompt, cache reads included');
  const listed=await req('/api/intelligence/review-runs?chapter=4');assert.equal(listed.status,200);assert.equal(listed.data.runs.length,2);assert.equal(listed.data.runs[0].id,second.data.id);assert.equal((await req('/api/intelligence/review-runs?chapter=5')).data.runs.length,0);
  const adopt=await req('/api/commands',{revision:1,command:{type:'intelligence.adopt',payload:{runId:second.data.id,kind:'passage'}}});assert.equal(adopt.status,400);assert.match(adopt.data.error,/advice on the model/);
  assert.equal((await req('/api/project')).data.revision,1,'a review changes nothing');
  // A person adopts one finding (round 5, R5-E): one Chapter 11 action through review.action, naming the element, the
  // severity, the title, the reason and the run; only with the review confirmed, only an offered finding, once.
  const finding=second.data.result.findings[0],adoptFinding=(revision,extra={})=>req('/api/commands',{revision,command:{type:'intelligence.adopt',payload:{runId:second.data.id,kind:'review-finding',findingId:finding.id,reviewed:true,...extra}}});
  assert.equal((await adoptFinding(1,{reviewed:false})).status,400,'not without the person confirming');assert.equal((await adoptFinding(1,{findingId:'F99'})).status,400,'not a finding the review did not offer');
  const adopted=await adoptFinding(1);assert.equal(adopted.status,200,JSON.stringify(adopted.data));
  const actions=adopted.data.document.finalReview.actions.filter(a=>a.provenance?.solReview),action=actions[0];
  assert.equal(actions.length,1);assert.equal(adopted.data.selected,action.id);assert.deepEqual(action.objectIds,[finding.elementId]);assert.equal(action.title,finding.title);assert.equal(action.status,'Planned');assert.equal(action.owner,'');
  assert.match(action.acceptance,new RegExp(`\\(${finding.severity==='fix'?'to fix':finding.severity==='confirm'?'to confirm':'a note to weigh'}\\)[\\s\\S]*${second.data.id}[\\s\\S]*${finding.id}`));assert(action.acceptance.includes(finding.reason));
  assert.deepEqual([action.provenance.solReview.runId,action.provenance.solReview.findingId,action.provenance.solReview.elementId,action.provenance.solReview.severity],[second.data.id,finding.id,finding.elementId,finding.severity]);
  assert.equal(action.provenance.solReview.basis.currentAtAdoption,true,'the current packet basis is recorded');
  const again=await adoptFinding(adopted.data.revision);assert.equal(again.status,200);assert.equal(again.data.document.finalReview.actions.filter(a=>a.provenance?.solReview).length,1,'adopting it again returns the action already recorded');assert.equal(again.data.selected,action.id);
  assert.equal(JSON.stringify(adopted.data.document.finalReview.checks??null),'null','no check is written');
  pass('a review finding is adopted only by a person, through intelligence.adopt kind review-finding: one Chapter 11 action through review.action naming the element, the severity, the title, the reason and the run; once; nothing else changes');
  mode='limit';const limited=await send({});assert.equal(limited.status,429,JSON.stringify(limited.data));assert.equal(limited.data.status,'failed');assert.match(limited.data.error,/request limit/);
  const ops=await req('/api/operations');assert.equal(ops.status,200);assert.equal(ops.data.policy.hourlyRequests,30);
  pass('review routes: review-context previews without a key; review needs the key (503), the same packet (409), saves a run of mode review counted in the budget with its receipts and cache reads in the token accounting; review-runs lists it for the picture; it cannot be adopted as a passage; a provider 429 is the service\'s retry answer (429)');
 }finally{globalThis.fetch=previousFetch;env.DB.close();}
}
{
 // The mock speaks both wires faithfully enough for the SDK: a message, its event stream, the Responses request.
 const body={model:'m',max_tokens:10,system:[{type:'text',text:'i',cache_control:{type:'ephemeral'}}],messages:[{role:'user',content:[{type:'text',text:'{"a":{"x":1}}',cache_control:{type:'ephemeral'}},{type:'text',text:'{"a":{"y":2},"b":3}'}]}],output_config:{format:{type:'json_schema',schema:{title:'aiw_t',type:'object'}}}};
 assert.deepEqual(JSON.parse(asResponsesBody(body).input[0].content),{a:{x:1,y:2},b:3});assert.equal(asResponsesBody(body).text.format.name,'aiw_t');
 const cache=new Set(),m1=asMessage({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{}'}]}],usage:{input_tokens:3,output_tokens:1}},body,cache),m2=asMessage({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'{}'}]}]},body,cache);
 assert(m1.usage.cache_creation_input_tokens>0&&m1.usage.cache_read_input_tokens===0&&m2.usage.cache_read_input_tokens>0);assert.match(messageEvents(m1),/event: message_start[\s\S]*event: message_stop/);
 pass('mock: a Messages request is read as its Responses request (blocks merged, title as the name), answered as a message or its event stream, with cache writes then reads');
}
{
 // Round 12 (GR-DRF-18): the model-assisted architecture draft works per requirement group. A synthetic workbook of
 // 1,400 requirements in 18 domain groups: Chapter 4's draft is worded in 18 bounded requests, one per group, each on the
 // journey contract (a draft call and a check call), its context the group's own requirements and its answers wording
 // only; the accepted wording makes a new draft, previewed and applied like any other, each reworded field marked. A
 // loopback provider double answers; a live run is verified only with live model access.
 const calls=[];
 const llm=http.createServer((q,s)=>{let body='';q.on('data',c=>{body+=c;});q.on('end',()=>{
  const r=JSON.parse(body||'{}'),name=r.text?.format?.name,input=JSON.parse(r.input?.[0]?.content||'{}');
  calls.push({name,group:(input.packet||input).request?.group||null});
  const out=name==='aiw_journey_draft'?{answers:input.records.map(rec=>({record:rec.key,field:(rec.fields.find(f=>f.key==='title')||rec.fields[0]).key,value:'Worded by group: '+rec.title,passages:[],sourceRefs:[input.upstream[0].ref]}))}:{supported:true,defects:[],notes:['Each value follows from the cited requirement.']};
  s.writeHead(200,{'Content-Type':'application/json'});s.end(JSON.stringify({id:'resp-'+calls.length,status:'completed',model:'mock-sol',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(out)}]}],usage:{input_tokens:40,output_tokens:20}}));
 });});
 await new Promise(r=>llm.listen(0,'127.0.0.1',r));
 const root=await mkdtemp(path.join(tmpdir(),'aiw-wording-')),db=localDatabase(path.join(root,'w.sqlite'));
 const plain={DB:db,FILES:localFiles(path.join(root,'files')),ASSETS:{fetch:()=>new Response('asset')}},keyed={...plain,OPENAI_API_KEY:'test-key',AIW_LLM_MODEL:'mock-sol',AIW_LLM_BASE_URL:`http://127.0.0.1:${llm.address().port}/v1`};
 const origin='https://aiw.test',owner='architect-w';
 const api=async(route,{body,bytes,bindings=keyed,project}={})=>{const r=await worker.fetch(new Request(origin+route+(route.includes('?')?'&':'?')+'project='+project,{method:body||bytes?'POST':'GET',headers:{'oai-authenticated-user-id':owner,Origin:origin,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:bytes?{body:bytes}:{})}),bindings);return {status:r.status,data:await r.json()};};
 const poll=async(id,project)=>{for(let i=0;i<4000;i++){const s=await api('/api/drafting?action=status&id='+id,{project});if(!['queued','running'].includes(s.data.job.status))return s.data.job;if(s.data.job.status==='queued'&&s.data.job.progress?.phase==='awaiting-next')await processDraftingQueue(keyed);await new Promise(r=>setTimeout(r,25));}throw Error('The job did not finish.');};
 try{
  const made=await worker.fetch(new Request(origin+'/api/projects',{method:'POST',headers:{'oai-authenticated-user-id':owner,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({name:'Synthetic wording',template:'blank'})}),keyed),pid=(await made.json()).document.id;
  const {bytes,manifest}=syntheticWorkbook({rows:1400});
  const up=(await api('/api/intake?action=upload&filename=Synthetic.xlsx',{bytes,project:pid})).data,ins=(await api('/api/intake?action=inspect',{body:{uploadId:up.id,sheet:manifest.sheet},project:pid})).data;
  const input={uploadId:up.id,sheet:ins.sheet,headerRow:ins.headerRow,mapping:ins.mapping,priorityMap:ins.bands.map,groups:{domain:true,capabilityTheme:false}};
  const pre=(await api('/api/intake?action=preview',{body:input,project:pid})).data,imported=await api('/api/intake?action=apply',{body:{...input,revision:pre.projectRevision,previewStamp:pre.stamp,reviewed:true},project:pid});
  assert.equal(imported.status,200,JSON.stringify(imported.data).slice(0,200));
  const p=withFinalReview(imported.data.document),groups=requirementGroups(p);
  assert.equal(groups.length,18,'eighteen domain groups');
  // The packets: one per group of the chapter, each bounded, its context the group's own requirements, wording only.
  const d=draftArchitecture(p),packets=groupDraftPackets(p,d,4),ch4=d.chapters.find(c=>c.chapter===4).records;
  assert.equal(packets.length,18,'a chapter of 18 groups is 18 requests');
  const usedRefs=new Set(ch4.filter(r=>packets[0].packet.records.some(w=>w.key===r.key)).flatMap(r=>r.cites));
  const excludedRef=packets[0].packet.upstream.find(u=>!usedRefs.has(u.ref))?.ref,privateId='private-excluded-wording-id';
  assert(excludedRef,'the synthetic group has an uncited requirement for the retained-packet test');
  const privateProject=structuredClone(p);privateProject.workspace.aiPolicy={excludedObjectIds:[excludedRef,privateId]};
  const privatePackets=groupDraftPackets(privateProject,d,4);
  const privatePacket=privatePackets.find(x=>x.groupId===packets[0].groupId).packet;
  assert.equal(privatePacket.disclosure.excludedObjectCount,2);
  assert(!('excludedObjectIds' in privatePacket.disclosure),'the wording packet does not send exclusion IDs as metadata');
  assert(!JSON.stringify(privatePacket).includes(privateId),'a private exclusion ID is absent from the provider packet');
  assert(!privatePacket.upstream.some(u=>u.ref===excludedRef),'the excluded requirement is filtered from the wording context');
  assert.notEqual(privatePacket.stamp,packets[0].packet.stamp,'excluding source context changes the packet stamp');
  const citedRef=packets[0].packet.upstream.find(u=>usedRefs.has(u.ref)).ref;
  const citedProject=structuredClone(p);citedProject.workspace.aiPolicy={excludedObjectIds:[citedRef]};
  const citedPackets=groupDraftPackets(citedProject,d,4);
  const withheldKeys=new Set(ch4.filter(r=>r.cites.includes(citedRef)).map(r=>r.key));
  assert(citedPackets.length>0,'other permitted groups can still be worded');
  assert(!citedPackets.flatMap(x=>x.packet.records).some(r=>withheldKeys.has(r.key)),'wording derived from an excluded requirement is withheld');
  assert.deepEqual(packets.map(x=>x.groupId).sort(),groups.map(g=>g.id).sort());
  const WORDS=new Set(['title','question','description','purpose','boundary','context','scenario','consequence','summary']);
  const wordable=ch4.filter(r=>[...WORDS].some(k=>typeof r.commands[0]?.payload?.[k]==='string'&&r.commands[0].payload[k].trim()));
  assert.deepEqual(packets.flatMap(x=>x.packet.records.map(r=>r.key)).sort(),wordable.map(r=>r.key).sort(),'every wording-bearing record of the chapter in exactly one packet');
  for(const {groupId,packet} of packets){
   const members=new Set(groupMembers(p,groupId)),size=JSON.stringify(packet).length;
   assert.equal(packet.request.group,groupId);assert.equal(packet.task,'journey-draft');assert.deepEqual(packet.passages,[]);
   assert.ok(packet.records.length<=GROUP_SOL_LIMITS.records&&packet.upstream.length<=GROUP_SOL_LIMITS.requirements&&size<40000,`bounded: ${packet.records.length} records, ${packet.upstream.length} requirements, ${size} characters`);
   assert.ok(packet.upstream.every(u=>members.has(u.ref)),'its context is the group\'s own requirements');
   assert.ok(packet.records.every(r=>r.fields.length&&r.fields.every(f=>WORDS.has(f.key)&&!f.options)),'wording fields only: no link, kind, count, priority or choice');
   assert.equal(packet.brainReceipt.scoring,false);
  }
  // Over HTTP: a draft, then Sol asked to word Chapter 4; no model, nothing sent.
  const draftId=crypto.randomUUID();
  assert.equal((await api('/api/drafting?action=start',{body:{requestId:draftId},project:pid})).status,202);
  assert.equal((await poll(draftId,pid)).status,'completed');
  const noKey=await api('/api/drafting?action=assist',{body:{id:draftId,chapter:4,requestId:crypto.randomUUID()},bindings:plain,project:pid});
  assert.equal(noKey.status,503);assert.match(noKey.data.error,/not configured/);assert.equal(calls.length,0,'without a model nothing is sent');
  assert.equal((await api('/api/drafting?action=assist',{body:{id:draftId,chapter:12,requestId:crypto.randomUUID()},project:pid})).status,400,'a chapter of the draft');
  const wordId=crypto.randomUUID(),started=await api('/api/drafting?action=assist',{body:{id:draftId,chapter:4,requestId:wordId},project:pid});
  assert.equal(started.status,202,JSON.stringify(started.data));
  const worded=await poll(wordId,pid);
  assert.equal(worded.status,'completed',worded.error);
  const drafts=calls.filter(c=>c.name==='aiw_journey_draft'),checks2=calls.filter(c=>c.name==='aiw_journey_draft_check');
  assert.equal(drafts.length,18,'eighteen bounded requests, one per group');assert.equal(checks2.length,18,'each answer checked');
  assert.deepEqual(new Set(drafts.map(c=>c.group)).size,18,'each for its own group');
  assert.equal(worded.progress.groups.length,18);assert.ok(worded.progress.groups.every(g=>g.status==='accepted'&&g.answers===1&&g.runId),'progress per group');
  assert.equal(worded.summary.assisted.reworded,18);
  const runs=(await db.prepare("SELECT COUNT(*) AS n FROM intelligence_runs WHERE owner_id=? AND project_id=? AND mode='journey' AND object_id LIKE 'draft-group:4:%' AND status='completed'").bind(owner,pid).first()).n;
  assert.equal(runs,18,'each request is a run of its own, in the budget, with its receipt');
  // The worded draft is previewed and applied like any other; each reworded field says Sol worded it, with its run.
  const pv=await api('/api/drafting?action=preview&id='+wordId,{project:pid});
  assert.equal(pv.status,200);assert.equal(pv.data.stale,false);
  assert.ok(pv.data.preview.notes.some(n=>/18 values of Chapter 4 reworded by Sol with the model/.test(n)));
  const applyId=crypto.randomUUID();
  assert.equal((await api('/api/drafting?action=apply',{body:{id:wordId,requestId:applyId,stamp:pv.data.preview.stamp,revision:pv.data.revision,reviewed:true},project:pid})).status,409,'the full proposal pages must be reviewed first');
  let opened=0;
  for(const chapter of pv.data.preview.chapters)for(let offset=0;offset<chapter.records;offset+=20){
   const page=await api('/api/drafting?action=records&id='+wordId+'&chapter='+encodeURIComponent(chapter.chapter)+'&offset='+offset,{project:pid});
   assert.equal(page.status,200);assert.equal(page.data.records.length,Math.min(20,chapter.records-offset));
   const marked=await api('/api/drafting?action=review-page',{body:{id:wordId,chapter:chapter.chapter,offset,stamp:pv.data.preview.stamp},project:pid});
   assert.equal(marked.status,200,JSON.stringify(marked.data));opened++;
  }
  assert.equal(opened,pv.data.review.total,'every proposal page was opened and marked');
  assert.equal((await api('/api/drafting?action=apply',{body:{id:wordId,requestId:applyId,stamp:pv.data.preview.stamp,revision:pv.data.revision,reviewed:true},project:pid})).status,202);
  assert.equal((await poll(applyId,pid)).status,'completed');
  const doc=(await api('/api/project',{project:pid})).data.document,resp=doc.logical.responsibilities;
  assert.equal(resp.length,18);
  for(const r of resp){const w=r.provenance?.draft?.wording;assert.match(r.title,/^Worded by group: /);assert.ok(Array.isArray(w)&&w.length===1&&w[0].field==='title'&&w[0].by==='sol'&&w[0].kind==='model-assisted'&&/^[a-f0-9-]{36}$/.test(w[0].runId),r.title+': the reworded field names its run');assert.equal(r.state,'proposed');assert.equal(r.provenance.draft.reviewed,false);}
  const source=draftArchitecture(p);
  assert.deepEqual(doc.realisation.components.map(c=>c.title).sort(),source.chapters.find(c=>c.chapter===5).records.map(r=>r.commands[0].payload.title).sort(),'every other chapter is the deterministic draft\'s');
  pass('GR-DRF-18: the model-assisted architecture draft works per requirement group: Chapter 4 of 1,400 requirements in 18 groups is 18 bounded packets (at most '+GROUP_SOL_LIMITS.records+' records and '+GROUP_SOL_LIMITS.requirements+' of the group\'s own requirements each, wording fields only), sent as 18 checked requests, each a run in the budget; nothing is sent without a model; the accepted wording makes a new draft, previewed and applied like any other, each reworded field marked with its run, every other chapter unchanged');
  // The budget bounds it: a project allowing 20 requests an hour sends two more, then stops; the rest keep their wording.
  const bounded=await draftGroupWording(keyed,owner,pid,{workspace:{aiPolicy:{enabled:true,hourlyRequests:20,dailyTokens:1000000}}},packets.slice(0,5),{actor:owner});
  assert.deepEqual(bounded.map(r=>r.status),['accepted','accepted','not-sent'],'the requests stop at the budget');
  assert.match(bounded.at(-1).error,/hourly request budget/);
  pass('GR-DRF-18: the hourly request budget bounds the per-group requests: they stop at the first group it refuses, and the groups after it keep the deterministic wording');
 }finally{llm.close();db.close?.();await rm(root,{recursive:true,force:true});}
}
console.log(JSON.stringify({passed:checks.length,checks},null,1));
