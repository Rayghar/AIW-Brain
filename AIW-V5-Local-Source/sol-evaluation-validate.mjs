// The held-out evaluation of Sol's advice: every case builds its packet from a real reference design and
// runs the Brain's own reasoning path against the provider test double; the metrics detect injected
// faults (wrong verdict, invented number, guarantee, missing citation, out-of-bounds refinement,
// missing support) and the teaching-domain cases expose advice that ignores an example objective.
// The scorer reads numbers and guarantees as the guard does and keeps every answer and flagged sentence;
// the control arm asks the same model the same questions without the Brain, and only the evaluation reaches it.
// Run: npm run test:sol-evaluation
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {runEvaluation,rescoreReport,adoptionMetrics,summarise,scoreAssessment,DIRECT_INSTRUCTIONS} from './sol-evaluation.js';
import {answer,envelope} from './mock-llm-provider.mjs';

const checks=[],started=Date.now();
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
const dataset=JSON.parse(readFileSync('evaluation/sol-heldout-v1.json','utf8'));
const env={OPENAI_API_KEY:'test-double',AIW_LLM_MODEL:'mock-sol',AIW_LLM_BASE_URL:'http://127.0.0.1:9/v1'};
const double=(faults={})=>async(url,init)=>new Response(JSON.stringify(answer(JSON.parse(init.body),{faults})),{status:200,headers:{'Content-Type':'application/json'}});
let report;

await check('every held-out case builds its packet from a real reference design and runs the full reasoning path',async()=>{
 report=await runEvaluation(dataset,env,{fetcher:double()});
 assert.equal(report.schema,'aiw-sol-evaluation-v2');
 assert.equal(report.summary.cases,26);assert.equal(report.summary.requestFailures,0,JSON.stringify(report.results.filter(r=>r.error)));
 assert.equal(report.summary.assessments,28);assert.equal(new Set(report.results.map(r=>r.domain)).size,3);
 assert(report.results.every(r=>r.packet.sources>0&&r.packet.kinds.includes(r.assessments[0].kind==='record'?'chapter-reading':'instrument-reading')||r.assessments[0].kind==='decision'));
 assert.equal(report.summary.ownReadingCited.rate,1);assert.match(report.dataset.authority,/not independent expert review/);
 // Every assessment keeps its wording, as shown or as the draft the checks withheld, so its scores can be checked against the answer itself.
 assert(report.results.flatMap(r=>r.assessments).every(a=>(a.answerIs==='shown'||a.answerIs==='withheld-draft')&&a.answer.headline&&a.answer.reasoning&&a.answer.sourceRefs.length));
});

await check('advice that sizes a teaching design for the Playbook example objective is withheld, where the design records its own workload',async()=>{
 // The test double refines the capacity draft as drafted, taking the example at face value, as a model can.
 for(const id of ['SP-01','WF-01']){const a=report.results.find(r=>r.id===id).assessments[0];assert.equal(a.withheld,true,id);assert.deepEqual(a.withheldReasons,['example-objective'],id);assert.equal(a.answerIs,'withheld-draft');assert.equal(a.draftVerdict,'refine');}
 // The bank payment reference records no workload of its own, so the same advice there is shown, with the example named in the packet.
 const bp=report.results.find(r=>r.id==='BP-01').assessments[0];assert.equal(bp.withheld,false);
 assert.deepEqual(report.summary.withheld.reasons,{'example-objective':2});
});

await check('injected faults are caught: guards withhold invented numbers, guarantees, missing citations and out-of-bounds refinements',async()=>{
 const only=['BP-01','BP-02','BP-03','BP-11'];
 const r=await runEvaluation(dataset,env,{only,fetcher:double({'F:capacity:run-001':'invented-number','F:integrity:if-004+rest':'guarantee','F:observability:run-001':'no-own-citation','M:10:run-001':'out-of-bounds'})});
 const reason=id=>r.results.find(x=>x.id===id).assessments[0];
 for(const id of only)assert.equal(reason(id).withheld,true,id+' is withheld');
 assert(reason('BP-01').withheldReasons.includes('number'));assert(reason('BP-02').withheldReasons.includes('guarantee'));
 assert(reason('BP-03').withheldReasons.includes('citation'));assert(reason('BP-11').withheldReasons.includes('bounds'));
 assert.equal(r.summary.withheld.rate,1);
 // What was withheld is kept from the draft the checks read, so the withholding can be checked too.
 assert.equal(reason('BP-01').answerIs,'withheld-draft');assert.match(reason('BP-01').answer.reasoning,/987654/);
 assert.match(reason('BP-02').answer.reasoning,/guarantees a verified outcome/);assert.equal(reason('BP-01').draftVerdict,'refine');
});

await check('the metrics catch what the guards let through: a wrong verdict and advice missing its expected support',async()=>{
 const r=await runEvaluation(dataset,env,{only:['BP-05','BP-07'],fetcher:double({'D:ADR-001':'wrong-verdict','F:switch:tr-003':'reading-only'})});
 const a=id=>r.results.find(x=>x.id===id).assessments[0];
 assert.equal(a('BP-05').withheld,false);assert.equal(a('BP-05').verdictAgrees,false);
 assert.equal(a('BP-07').withheld,false);assert.equal(a('BP-07').citesExpectedKinds,false);
 assert.equal(summarise(r.results).verdictAgreement.rate,0.5);
});

const packet={items:[{id:'X',kind:'fix',ref:'S1',knobs:[{key:'n',type:'number',value:4}],allowed:{}}],sources:[{ref:'S1',kind:'instrument-reading',excerpt:'3,125 req/s'},{ref:'S2',kind:'playbook-entry',excerpt:'text'}]};
const base={id:'X',verdict:'apply',headline:'Keep it',reasoning:'At 3,125 req/s the draft holds.',refinements:[],proposals:[],risks:[],questions:[],sourceRefs:['S1'],preferred:'none'};
const score=reasoning=>scoreAssessment({...base,reasoning},packet,{expect:{}},dataset.defaults);

await check('false-support proxy: numbers not in the cited sources and overclaiming words are flagged',async()=>{
 assert.equal(scoreAssessment(base,packet,{expect:{}},dataset.defaults).falseSupport,false);
 assert.equal(score('It holds 48,000 req/s.').falseSupport,true);
 assert.equal(score('This guarantees the target.').falseSupport,true);
});

await check('the scorer reads numbers as the guard does: a citation label is not a number, and every flag keeps its sentence',async()=>{
 const labels=score('As S13, S14 and S15 show, the draft holds at 3,125 req/s.');
 assert.equal(labels.falseSupport,false);assert.deepEqual(labels.flags,[]);
 const invented=score('The draft holds. It will carry 48,000 req/s at peak.');
 assert.deepEqual(invented.unsupportedNumbers,['48000']);assert.deepEqual(invented.flags,[{kind:'number',match:'48000',sentence:'It will carry 48,000 req/s at peak.'}]);
});

await check('a negated or hedged guarantee passes, as in the guard; an asserted one is flagged with its sentence',async()=>{
 for(const t of ['An outbox does not guarantee ordering.','There is no guarantee of delivery until a load test confirms the rate.','Nothing here is proven.','It cannot be certified from the design alone.','The target is drafted as an objective to be proven in testing.','Are there atomicity guarantees around the duplicate policy?'])assert.equal(score(t).falseSupport,false,t);
 // A question asserts nothing, but a figure nobody recorded is still flagged in one.
 assert.equal(scoreAssessment({...base,questions:['Is every repeat guaranteed to return the first outcome?']},packet,{expect:{}},dataset.defaults).falseSupport,false);
 assert.deepEqual(scoreAssessment({...base,questions:['Should it carry 48,000 req/s?']},packet,{expect:{}},dataset.defaults).unsupportedNumbers,['48000']);
 const g=score('Keep it. This design guarantees the target.');
 assert.equal(g.falseSupport,true);assert.deepEqual(g.flags,[{kind:'forbidden',match:'guarantee',sentence:'This design guarantees the target.'}]);
 // A negation in another clause does not excuse the assertion.
 assert.equal(score('It is not cheap, but it guarantees delivery.').falseSupport,true);
});

await check('the control arm asks the same model the same questions without the Brain’s packet, instructions or format of citations',async()=>{
 const bodies=[];
 const capture=async(url,init)=>{const b=JSON.parse(init.body);bodies.push(b);return new Response(JSON.stringify(answer(b)),{status:200,headers:{'Content-Type':'application/json'}});};
 await runEvaluation(dataset,env,{only:['BP-01','BP-05'],fetcher:capture});
 const sol=bodies.filter(b=>b.text.format.name==='aiw_desk_assessment'),ctl=bodies.filter(b=>b.text.format.name==='aiw_direct_assessment');
 assert.equal(sol.length,2);assert.equal(ctl.length,2);assert(ctl.every(b=>b.model===sol[0].model&&b.store===false));
 for(const b of ctl){
  const input=JSON.parse(b.input[0].content);
  assert.equal(b.instructions,DIRECT_INSTRUCTIONS);assert.doesNotMatch(b.instructions,/\bSol\b|packet|\bcite/i);
  assert.deepEqual(Object.keys(input).sort(),['decisions','project','question']);
  assert.doesNotMatch(JSON.stringify(input),/"sources"|"reading"|"brainReceipt"|"omissions"|"coverage"|"disclosure"|"stamp"/);
  assert.equal(JSON.stringify(b.text.format.schema).includes('sourceRefs'),false);
 }
 // A recorded decision reaches the control arm with its question and alternatives, and nothing the Brain computed about them.
 const adr=JSON.parse(ctl[1].input[0].content).decisions[0];
 assert.equal(adr.decision.alternatives.length,2);assert.equal('lean' in adr.decision||'drivers' in adr.decision||'effects' in adr.decision.alternatives[0],false);
 assert.match(JSON.parse(ctl[0].input[0].content).project,/bank payment reference design/);
});

await check('the Brain’s checks run on the control arm’s answers to measure what it would withhold, and the comparison pairs every assessment',async()=>{
 const d=report.direct,c=report.comparison;
 assert.equal(d.summary.cases,26);assert.equal(d.summary.requestFailures,0);assert.equal(d.summary.missing,0);
 assert.equal(c.assessments,28);assert.equal(c.rows.length,26);assert.equal(c.advised.direct,28);
 const numeric=d.results.find(x=>x.id==='BP-01').assessments[0],hedged=d.results.find(x=>x.id==='BP-05').assessments[0];
 assert.equal(numeric.falseSupport,true);assert(numeric.unsupportedNumbers.includes('99.99'));assert(numeric.brainCheckReasons.includes('guarantee'));
 assert.equal(numeric.citesOwnReading,null,'the control arm has nothing to cite');assert.match(numeric.answer.reasoning,/guarantees 99\.99% availability/);
 assert.equal(hedged.falseSupport,false);assert.deepEqual(hedged.brainChecks,[]);
 assert(d.summary.brainChecks.wouldWithhold.rate>0&&d.summary.brainChecks.reasons.guarantee>0);
 assert.equal(c.soundAsScored.brain,report.results.flatMap(r=>r.assessments).filter(a=>!a.withheld&&a.verdictAgrees&&!a.falseSupport).length);
});

await check('each withheld assessment is labelled by the check that raised its issue, not by the words in it',async()=>{
 // The second pass words its own issue freely: this one names a target and a threat.
 const fetcher=async(url,init)=>{const b=JSON.parse(init.body);let out=answer(b,{faults:{'F:capacity:run-001':'invented-number'}});
  if(b.text.format.name==='aiw_desk_assessment_check'){const input=JSON.parse(b.input[0].content);out=envelope({assessments:input.candidate.assessments.map(a=>({id:a.id,supported:a.id!=='M:2:QD-003',defects:a.id==='M:2:QD-003'?['It restates the 2-second target as if a threat had been measured.']:[],notes:[]}))});}
  return new Response(JSON.stringify(out),{status:200,headers:{'Content-Type':'application/json'}});};
 const r=await runEvaluation(dataset,env,{only:['BP-01','BP-09'],direct:false,fetcher});
 const bp01=r.results.find(x=>x.id==='BP-01').assessments[0],bp09=r.results.find(x=>x.id==='BP-09').assessments[0];
 assert.deepEqual(bp01.withheldReasons,['number']);
 assert.equal(bp09.withheld,true);assert.deepEqual(bp09.withheldReasons,['second-pass'],'a second-pass issue is not a proposal because it says "target"');
});

await check('a kept report scores again to the same result without asking any model, and only while the design reads as it did',async()=>{
 const again=rescoreReport(JSON.parse(JSON.stringify(report)),dataset);
 assert.deepEqual(again.summary,report.summary);assert.deepEqual(again.direct.summary,report.direct.summary);assert.deepEqual(again.comparison,report.comparison);
 assert.match(again.rescored.note,/no model was asked/);
 const moved=JSON.parse(JSON.stringify(report));moved.results[0].packet.stamp='sha256:0';
 assert.throws(()=>rescoreReport(moved,dataset),/no longer reads as it did/);
 assert.throws(()=>rescoreReport({...report,schema:'aiw-sol-evaluation-v1'},dataset),/keeps its answers/);
});

await check('a kept report checked again by today’s checks: a withholding they no longer raise is shown, with what they set aside, and a defect the second pass named stands',async()=>{
 const kept=JSON.parse(JSON.stringify(report)),at=id=>kept.results.find(r=>r.id===id).assessments[0];
 // As the guard read it before: a claim in one refinement's reason withheld the whole assessment.
 const old=at('BP-12');assert.equal(old.answerIs,'shown');assert(old.answer.refinements.length>0);
 old.answer.refinements[0].why='It clarifies responsibilities and ensures compliance and auditability.';
 Object.assign(old,{withheld:true,verdict:null,draftVerdict:old.verdict,answerIs:'withheld-draft',issues:['It presents a mechanism or draft as guaranteeing a verified outcome.']});
 // A defect the second pass named, in its own words.
 const second=at('BP-09');Object.assign(second,{withheld:true,verdict:null,draftVerdict:second.verdict,answerIs:'withheld-draft',issues:['It restates the 2-second target as if it had been measured.']});
 const again=rescoreReport(kept,dataset,{recheck:true}),now=id=>again.results.find(r=>r.id===id).assessments[0];
 assert.equal(now('BP-12').withheld,false);assert.deepEqual(now('BP-12').recheck.was,['guarantee']);assert.deepEqual(now('BP-12').setAside,[old.answer.refinements[0].key]);
 assert.equal(now('BP-09').withheld,true);assert.deepEqual(now('BP-09').withheldReasons,['second-pass']);
 // What was right before is still right, and what the example objective withheld still is.
 assert.equal(now('BP-01').withheld,false);assert.equal(now('SP-01').withheld,true);assert.deepEqual(now('SP-01').withheldReasons,['example-objective']);
 assert.match(again.rescored.note,/checked again[\s\S]*second pass named stand/);assert.equal(again.rescored.recheck,true);
});

await check('only the evaluation reaches the control arm: the application reasons through requestReasoning alone',async()=>{
 const files=[];
 const walk=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){if(['node_modules','dist','.git','evidence','test-results'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.m?js$/.test(e.name))files.push(p.replace(/\\/g,'/'));}};
 walk('.');
 assert.deepEqual(files.filter(f=>readFileSync(f,'utf8').includes('requestDirectBaseline')).sort(),['intelligence-provider.js','sol-evaluation-validate.mjs','sol-evaluation.js']);
});

await check('adoption rates come from what architects did with advice in a real project, not from this harness',async()=>{
 const m=adoptionMetrics({coauthoring:{assessments:[{runId:'r1',itemId:'F:a',outcome:'used'},{runId:'r1',itemId:'F:a',outcome:'applied'},{runId:'r2',itemId:'M:8:x',outcome:'dismissed'}]},knowledge:{stewardship:[{decision:'captured'}]}});
 assert.deepEqual(m,{records:3,advisedItems:2,taken:1,applied:1,disagreed:1,disagreementRate:0.5,appliedRate:0.5,learned:1});
});
console.log(JSON.stringify({status:'passed',checks:checks.length,seconds:Math.round((Date.now()-started)/1000),summary:report.summary,direct:report.direct.summary,authority:'Provider test double: verifies the path, guards and metrics, not the quality of advice.',checksRun:checks},null,2));
