// Sol's checks, as the live comparison of 27 September 2026 found they must behave
// (release-evidence/sol-direct-comparison/ANSWER_REVIEW.md):
// 1. threats proposed for a decision that takes none are set aside, and the rest of the advice stands;
// 2. the guard reads a question as a question, and a guarantee in any tense ("ensuring exactly-once");
// 3. a second pass that contradicts itself is recorded, not relied on: its concrete defects decide;
// 4. the SA Playbook's example objective is named as the example everywhere, and where a design records a
//    workload of its own, advice that sizes it for the example is withheld.
// Run: npm run test:sol-checks
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {reasoningPacket,validateReasoningOutput,guardReasoning,overclaim,reviewFinding} from './public/brain-reasoning.js';
import {assessmentHTML} from './public/brain-reasoning-ui.js';
import {requestReasoning,requestIntelligence} from './intelligence-provider.js';
import {answer,envelope} from './mock-llm-provider.mjs';
import {domainProject} from './sol-evaluation.js';
import {fixDrafts} from './public/desk-fixes.js';
import {deskModel} from './public/desk-model.js';
import {readyComposition} from './composition-fixtures.mjs';
import {intelligencePacket} from './public/intelligence-context.js';

const checks=[],started=Date.now();
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
const dataset=JSON.parse(readFileSync('evaluation/sol-heldout-v1.json','utf8'));
const bank=domainProject(dataset.domains['bank-payment']),permits=domainProject(dataset.domains['service-permits']),warehouse=domainProject(dataset.domains['warehouse-fulfilment']);
const packetFor=(p,ids)=>reasoningPacket(p,{task:'decisions',ids,scope:'test',prompt:''});
const env={OPENAI_API_KEY:'test-double',AIW_LLM_MODEL:'mock-sol'};
const assessment=(item,over={})=>({id:item.id,verdict:'apply',headline:'Sound as drafted.',reasoning:`The reading in ${item.ref} supports the draft.`,refinements:[],proposals:[],preferred:'none',risks:[],questions:[],sourceRefs:[item.ref],...over});
const raw=(packet,assessments)=>({summary:'Test.',sourceRefs:[packet.items[0].ref],assessments});
const threat={title:'Unauthorised use of the decision',category:'Unauthorised action',priority:'High',targetIds:['none'],scenario:'A caller without authority acts.',consequence:'A payment is misrouted.'};

await check('1 · threats proposed for a decision that takes none are set aside; the advice stands and says what was set aside',async()=>{
 const packet=packetFor(bank,['D:ADR-001']),item=packet.items[0];
 assert.equal(item.kind,'decision');assert.equal(item.allowed.proposals??null,null);
 const result=guardReasoning(packet,validateReasoningOutput(raw(packet,[assessment(item,{verdict:'judge',proposals:[threat,{...threat,title:'Replay of an acknowledgement'}]})]),packet));
 const a=result.assessments[0];
 assert.deepEqual(a.problems,[],'no problem: nothing here withholds the assessment');assert.deepEqual(a.proposals,[]);
 assert.equal(a.setAside.length,1);assert.equal(a.setAside[0].label,'Proposed threats');assert.match(a.setAside[0].value,/Unauthorised use of the decision; Replay of an acknowledgement/);assert.match(a.setAside[0].reason,/takes no threats/);
 // End to end: the draft carries the misplaced threats, the second pass supports the rest, and it is shown.
 const fetcher=async(url,init)=>{const b=JSON.parse(init.body);if(b.text.format.name==='aiw_desk_assessment')return new Response(JSON.stringify(envelope(raw(packet,[assessment(item,{verdict:'judge',proposals:[threat]})]))));return new Response(JSON.stringify(answer(b)));};
 const run=await requestReasoning(env,packet,{fetcher}),shown=run.result.assessments[0];
 assert.equal(shown.withheld,false);assert.equal(shown.verdict,'judge');assert.equal(shown.setAside.length,1);
 const html=assessmentHTML({run:{...run,id:'r1',createdAt:'2026-09-27T00:00:00Z',packet},a:shown,item,current:true},{id:item.id});
 assert.match(html,/Set aside · 1/);assert.match(html,/Proposed threats/);assert.match(html,/takes no threats/);
 // A threat judgement still takes its proposals.
 const jp=packetFor(bank,['J:security:run-002']),j=jp.items[0],target=j.allowed.proposals.targets[0];
 const jr=guardReasoning(jp,validateReasoningOutput(raw(jp,[assessment(j,{verdict:'judge',proposals:[{...threat,targetIds:[target]}]})]),jp)).assessments[0];
 assert.equal(jr.proposals.length,1);assert.equal(jr.setAside,undefined);
});

await check('2 · the guard reads a question as a question, and a guarantee in any tense',async()=>{
 assert.equal(overclaim('What is the current measured 95th percentile acknowledgement latency under peak load?'),null);
 assert.equal(overclaim('Does the plan ensure recovery within 15 minutes?'),null);
 assert.equal(overclaim('Use the submission id as the key, ensuring exactly-once processing.'),'guarantee');
 assert.equal(overclaim('The replicas achieved the target under load.'),'guarantee');
 assert.equal(overclaim('Retries guaranteed zero loss.'),'guarantee');
 assert.equal(overclaim('An idempotency key does not ensure exactly-once processing on its own.'),null);
 assert.equal(overclaim('The latency was measured at 180 ms in production.'),'verified');
 // In an assessment: a question about a measurement no longer withholds it; an ensuring claim still does.
 const packet=packetFor(bank,['M:2:QD-003']),item=packet.items[0];
 const asked=guardReasoning(packet,validateReasoningOutput(raw(packet,[assessment(item,{questions:['What is the current measured 95th percentile acknowledgement latency under peak load?']})]),packet)).assessments[0];
 assert.deepEqual(asked.problems,[]);
 const claimed=guardReasoning(packet,validateReasoningOutput(raw(packet,[assessment(item,{reasoning:`The reading in ${item.ref} holds, ensuring exactly-once processing.`})]),packet)).assessments[0];
 assert.match(claimed.problems.join(' '),/guaranteeing a verified outcome/);
});

await check('3 · a second pass that contradicts itself is recorded, not relied on; its concrete defects decide',async()=>{
 // Unsupported, naming no defect: the flag is not relied on.
 let f=reviewFinding({supported:false,defects:[],notes:['Each statement follows from S1.']});
 assert.deepEqual(f.defects,[]);assert.match(f.contradiction.note,/unsupported but named no defect; its flag was not relied on/);
 // The defects a live second pass wrote for BP-09, every one of them confirming support: read as notes.
 const bp09=['The suggestion to add explicit timeout settings is a refinement proposal, not a claim of a current measurement, so it is supported as advice.','The assessment indicates lack of explicit timeout recordings in critical components; this is directly supported by the packet\'s readings.','The assessment correctly identifies the assumption of the latency target as a draft value, and warns about presenting it as verified; this matches the packet\'s warnings, so it is supported.','No invented owners, products, or measurements are presented; the assessment uses only packet data and its own refinement proposals.'];
 f=reviewFinding({supported:false,defects:bp09,notes:[]});
 assert.deepEqual(f.defects,[]);assert.equal(f.notes.length,4);assert.match(f.contradiction.note,/4 of the defects it named read as support/);
 // Real defects stay defects, however they are worded.
 for(const d of ['The 30-second timeout is not supported by the packet.','It states 48,000, which no reading in the packet contains.','The claim that the rate is supported by S3 is false.','It invents an operations team as the owner.'])assert.deepEqual(reviewFinding({supported:false,defects:[d],notes:[]}).defects,[d],d);
 // Defects named while the flag says supported: the defects decide, and the disagreement is recorded.
 f=reviewFinding({supported:true,defects:['It invents Prometheus as the monitoring product.'],notes:[]});
 assert.equal(f.defects.length,1);assert.match(f.contradiction.note,/while marking it supported; the defects decide/);
 assert.equal(reviewFinding({supported:true,defects:[],notes:['Fine.']}).contradiction,null);
 // End to end through the desk's path: the draft is shown, with the note, and the run records the contradiction.
 const packet=packetFor(bank,['F:capacity:run-001']),item=packet.items[0];
 const run=await requestReasoning(env,packet,{fetcher:async(url,init)=>new Response(JSON.stringify(answer(JSON.parse(init.body),{contradict:[item.id]})))});
 const a=run.result.assessments[0];assert.equal(a.withheld,false);assert.match(a.checkNote,/read as support/);
 assert.equal(run.groundingReview.contradictions.length,1);assert.equal(run.groundingReview.contradictions[0].id,item.id);
 assert.match(assessmentHTML({run:{...run,id:'r2',createdAt:'2026-09-27T00:00:00Z',packet},a,item,current:true},{id:item.id}),/data-sol-check-note[^>]*>The source check marked it unsupported but named no defect, and 1 of the defects it named read as support/);
 // A verbose second pass — twelve notes, one of 2,000 characters — is kept to eight notes of 1,600 and costs nothing:
 // the live check of 27 September lost four answers to it before this.
 const verbose=async(url,init)=>{const b=JSON.parse(init.body);if(b.text.format.name!=='aiw_desk_assessment_check')return new Response(JSON.stringify(answer(b)));
  const input=JSON.parse(b.input[0].content);return new Response(JSON.stringify(envelope({assessments:input.candidate.assessments.map(x=>({id:x.id,supported:true,defects:[],notes:[...Array(11).fill('Checked against S1.'),'x'.repeat(2000)]}))})));};
 const long=await requestReasoning(env,packet,{fetcher:verbose});
 assert.equal(long.result.assessments[0].withheld,false);assert.equal(long.groundingReview.notes[0].notes.length,8);assert(long.groundingReview.notes[0].notes.every(n=>n.length<=1600));
 // A second pass with the wrong shape is still refused.
 await assert.rejects(requestReasoning(env,packet,{fetcher:async(url,init)=>{const b=JSON.parse(init.body);return new Response(JSON.stringify(b.text.format.name==='aiw_desk_assessment_check'?envelope({assessments:[{id:item.id,supported:true,defects:'none',notes:[]}]}):answer(b)));}}),/unsupported assessment/);
 // And on Sol's other path, for a selected saved object: the defects decide there too.
 const p=readyComposition('delivery',{deliveryContract:'best-effort'});
 const ip=intelligencePacket(p,{chapter:2,objectId:'QD-001',mode:'mind',architectureTaskId:p.coauthoring.designTasks[0].id,prompt:'Compare publication choices and their delivery obligations.'});
 const ref=ip.sources.find(s=>s.kind==='architecture-knowledge').ref;
 const draft={title:'Publication choices',summary:'Loss tolerance does not waive duplicate protection.',passage:'Best-effort publication permits the declared notification loss. The recorded consumer duplicate protection remains necessary. The outbox retains intent in one transaction but does not establish ordered or exactly-once downstream effects.',sourceRefs:['S1',ref],assumptions:[],questions:['How will duplicate protection be verified under uncertain publication?'],options:[],...(ip.architectureDraft?{architectureDraft:[]}:{})};
 let n=0;const r=await requestIntelligence(env,ip,{fetcher:async()=>Response.json(envelope(++n===1?draft:{supported:false,defects:[],notes:['Every assertion is attributed to the packet.']}))});
 assert.equal(r.groundingReview.accepted,r.groundingReview.deterministic.accepted,'the bare flag no longer decides');
 assert.match(r.groundingReview.contradiction.note,/named no defect/);assert.deepEqual(r.groundingReview.notes,['Every assertion is attributed to the packet.']);
});

await check('4 · the Playbook example is named as the example; a design with its own workload is not sized for it',async()=>{
 // The desk: a teaching design records its workload, and says the example is not its load; the bank reference records none.
 const DP=deskModel(permits),DB=deskModel(bank);
 assert.equal(DP.cap.example,true);assert.deepEqual(DP.cap.workload,{driverId:'QD-001',value:10,text:'10 applications a second'});
 assert.match(DP.cap.objBasis,/100,000 concurrent users, the SA Playbook's example — not this project's load: QD-001 records 10 applications a second/);
 assert.equal(DB.cap.example,true);assert.equal(DB.cap.workload,null);assert.match(DB.cap.objBasis,/the SA Playbook's example — this project records no objective of its own/);
 const fixP=fixDrafts(deskModel(permits)).byId.get('capacity:run-001'),fixB=fixDrafts(deskModel(bank)).byId.get('capacity:run-001');
 assert.match(fixP.title,/^Let RUN-001 grow to \d+ replicas for the SA Playbook's example load$/);assert.match(fixP.why,/not this project's load: QD-001 records 10 applications a second/);
 assert.equal(fixB.title,'Let RUN-001 grow to 24 replicas','the bank reference keeps its title');assert.match(fixB.why,/the SA Playbook's example — this project records no objective of its own/);
 const basis=fixP.build(permits,Object.fromEntries(fixP.knobs.map(k=>[k.key,k.value])))[0].payload.capacityBasis;
 assert.match(basis,/Drafted on the review desk for 100,000 concurrent users, the SA Playbook's example — not this project's load/,'what the fix writes into the project says so too');
 // Sol's packet names the example and what the project records instead.
 const packet=packetFor(permits,['F:capacity:run-001']),objective=packet.sources.find(s=>s.kind==='planning-assumptions');
 assert.match(objective.title,/the SA Playbook’s example/);assert.match(objective.posture,/not this project’s load: QD-001 records 10 applications a second/);
 assert.equal(JSON.parse(objective.excerpt).recordedByThisProject,false);assert.equal(JSON.parse(objective.excerpt).thisProjectRecordsInstead,'QD-001: 10 applications a second');
 assert.deepEqual(packet.objective.conflict,{driverId:'QD-001',text:'10 applications a second'});
 // Taking or adjusting the example-sized draft is withheld; questioning it is advice.
 const item=packet.items[0],guard=a=>guardReasoning(packet,validateReasoningOutput(raw(packet,[a]),packet)).assessments[0].problems.join(' ');
 assert.match(guard(assessment(item)),/sizes for the SA Playbook’s example objective, but QD-001 records 10 applications a second/);
 assert.match(guard(assessment(item,{verdict:'refine',refinements:[{key:'maxReplicas',value:item.knobs[0].value+2,why:'Headroom.'}]})),/example objective/);
 assert.equal(guard(assessment(item,{verdict:'reconsider',reasoning:`The ${item.knobs[0].value} replicas in ${item.ref} rest on the Playbook's example of 100,000 users, not the recorded 10 applications a second.`})),'');
 // A chapter record in the same design: a knob set to one of the example's figures is withheld; one set for the recorded load is not.
 const rp=packetFor(permits,['M:10:run-001']),plan=rp.items[0],need=String(item.knobs[0].value),g2=v=>guardReasoning(rp,validateReasoningOutput(raw(rp,[assessment(plan,{verdict:'refine',refinements:[{key:'maxReplicas',value:v,why:'Sized.'}]})]),rp)).assessments[0].problems.join(' ');
 assert(rp.objective.figures.includes(need),'the draft\'s replica count is one of the example\'s figures');
 assert.match(g2(Number(need)),new RegExp(`${need} comes from the example`));assert.doesNotMatch(g2(3),/example/);
 // The bank reference records no workload of its own: the same advice there is not withheld for the example.
 const bp=packetFor(bank,['F:capacity:run-001']);assert.equal(bp.objective.recorded,false);assert.equal(bp.objective.conflict,undefined);
 assert.doesNotMatch(guardReasoning(bp,validateReasoningOutput(raw(bp,[assessment(bp.items[0])]),bp)).assessments[0].problems.join(' '),/example/);
 // The warehouse design is read the same way.
 assert.deepEqual(deskModel(warehouse).cap.workload,{driverId:'QD-001',value:20,text:'20 requests a second'});
});

await check('5 · Sol’s panel always answers: a long response is shortened and says so, a part that fails its rule is set aside, and a response that does not fit is replaced by the method’s guidance with the reason',async()=>{
 // The live check of 27 September lost three panel answers to an oversized list and an inexact challenge.
 const p=readyComposition('delivery',{deliveryContract:'best-effort'}),ask=mode=>intelligencePacket(p,{chapter:2,objectId:'QD-001',mode,prompt:'Explain this record.',...(mode==='mind'?{architectureTaskId:p.coauthoring.designTasks[0].id}:{})});
 const {mockProposal}=await import('./mock-llm-provider.mjs'),{resultHTML}=await import('./public/intelligence-ui.js');
 const run=async(packet,draft)=>{let n=0;return requestIntelligence(env,packet,{fetcher:async(url,init)=>{const b=JSON.parse(init.body);return Response.json(envelope(++n===1?draft:answer(b).output?JSON.parse(answer(b).output[0].content[0].text):{supported:true,defects:[],notes:[]}));}});};
 const html=(r,packet)=>resultHTML({run:{...r,id:'r5',status:'completed',createdAt:'2026-09-27T00:00:00Z',packet}},p);
 // Twelve assumptions and a 300-character title: kept to eight and to 180 characters, and the panel says so.
 let packet=ask('design');const long={...mockProposal(packet),title:'T'.repeat(300),assumptions:Array.from({length:12},(_,i)=>`Assumption ${i+1} about the record.`)};
 let r=await run(packet,long);
 assert.equal(r.result.assumptions.length,8);assert(r.result.title.length<=180);assert.deepEqual([...r.result.trimmed].sort(),['assumptions','title']);
 assert.match(html(r,packet),/data-intel-trimmed>Shortened to fit: title, assumptions/);
 // A challenge without an exact passage is set aside; the exact one stands.
 packet=ask('challenge');const S1=packet.sources[0],other=packet.sources.find(s=>s.ref!=='S1');
 const exact={title:'Scope to reconcile',kind:'applicability question',explanation:'The two passages may concern different scopes.',leftRef:'S1',leftQuote:S1.excerpt.slice(0,40),rightRef:other.ref,rightQuote:other.excerpt.slice(0,40),question:'Which scope applies?'};
 r=await run(packet,{...mockProposal(packet),challenges:[exact,{...exact,rightQuote:'An invented quote that is not in the source.'}]});
 assert.equal(r.result.challenges.length,1);assert.match(html(r,packet),/data-intel-set-aside>Set aside: 1 source challenge without an exact passage from each cited source/);
 // A response that ignores the selected record does not fit: the method's structured guidance is shown, with the reason, not an error.
 packet=ask('design');r=await run(packet,{...mockProposal(packet),sourceRefs:packet.sources.filter(s=>s.ref!=='S1').slice(0,1).map(s=>s.ref)});
 assert.equal(r.groundingReview.accepted,false);assert.match(r.groundingReview.issues[0],/did not fit the contract: The proposal must cite the selected saved object/);
 assert.match(r.result.title,/Structured guidance|Source review/);assert.match(html(r,packet),/Why structured guidance was used[\s\S]*did not fit the contract/);
});

console.log(JSON.stringify({status:'passed',checks:checks.length,seconds:Math.round((Date.now()-started)/1000),checksRun:checks},null,2));
