// The held-out evaluation of Sol's advice: every case builds its packet from a real reference design and
// runs the Brain's own reasoning path against the provider test double; the metrics detect injected
// faults (wrong verdict, invented number, guarantee, missing citation, out-of-bounds refinement,
// missing support) and the teaching-domain cases expose advice that ignores an example objective.
// Run: npm run test:sol-evaluation
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runEvaluation,adoptionMetrics,summarise} from './sol-evaluation.js';
import {answer} from './mock-llm-provider.mjs';

const checks=[],started=Date.now();
async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
const dataset=JSON.parse(readFileSync('evaluation/sol-heldout-v1.json','utf8'));
const env={OPENAI_API_KEY:'test-double',AIW_LLM_MODEL:'mock-sol',AIW_LLM_BASE_URL:'http://127.0.0.1:9/v1'};
const double=(faults={})=>async(url,init)=>new Response(JSON.stringify(answer(JSON.parse(init.body),{faults})),{status:200,headers:{'Content-Type':'application/json'}});
let report;

await check('every held-out case builds its packet from a real reference design and runs the full reasoning path',async()=>{
 report=await runEvaluation(dataset,env,{fetcher:double()});
 assert.equal(report.summary.cases,26);assert.equal(report.summary.requestFailures,0,JSON.stringify(report.results.filter(r=>r.error)));
 assert.equal(report.summary.assessments,28);assert.equal(new Set(report.results.map(r=>r.domain)).size,3);
 assert(report.results.every(r=>r.packet.sources>0&&r.packet.kinds.includes(r.assessments[0].kind==='record'?'chapter-reading':'instrument-reading')||r.assessments[0].kind==='decision'));
 assert.equal(report.summary.ownReadingCited.rate,1);assert.match(report.dataset.authority,/not independent expert review/);
});

await check('the teaching-domain capacity drafts expose advice that takes the Playbook example objective at face value',async()=>{
 for(const id of ['SP-01','WF-01']){const a=report.results.find(r=>r.id===id).assessments[0];assert.equal(a.withheld,false);assert.equal(a.verdictAgrees,false,id+': the test double refines instead of questioning the objective');assert.equal(a.addresses,false);}
 assert(report.summary.verdictAgreement.rate<1&&report.summary.verdictAgreement.rate>0.5);
});

await check('injected faults are caught: guards withhold invented numbers, guarantees, missing citations and out-of-bounds refinements',async()=>{
 const only=['BP-01','BP-02','BP-03','BP-11'];
 const r=await runEvaluation(dataset,env,{only,fetcher:double({'F:capacity:run-001':'invented-number','F:integrity:if-004+rest':'guarantee','F:observability:run-001':'no-own-citation','M:10:run-001':'out-of-bounds'})});
 const reason=id=>r.results.find(x=>x.id===id).assessments[0];
 for(const id of only)assert.equal(reason(id).withheld,true,id+' is withheld');
 assert(reason('BP-01').withheldReasons.includes('number'));assert(reason('BP-02').withheldReasons.includes('guarantee'));
 assert(reason('BP-03').withheldReasons.includes('citation'));assert(reason('BP-11').withheldReasons.includes('bounds'));
 assert.equal(r.summary.withheld.rate,1);
});

await check('the metrics catch what the guards let through: a wrong verdict and advice missing its expected support',async()=>{
 const r=await runEvaluation(dataset,env,{only:['BP-05','BP-07'],fetcher:double({'D:ADR-001':'wrong-verdict','F:switch:tr-003':'reading-only'})});
 const a=id=>r.results.find(x=>x.id===id).assessments[0];
 assert.equal(a('BP-05').withheld,false);assert.equal(a('BP-05').verdictAgrees,false);
 assert.equal(a('BP-07').withheld,false);assert.equal(a('BP-07').citesExpectedKinds,false);
 assert.equal(summarise(r.results).verdictAgreement.rate,0.5);
});

await check('false-support proxy: numbers not in the cited sources and overclaiming words are flagged',async()=>{
 const {scoreAssessment}=await import('./sol-evaluation.js');
 const packet={items:[{id:'X',kind:'fix',ref:'S1',knobs:[{key:'n',type:'number',value:4}],allowed:{}}],sources:[{ref:'S1',kind:'instrument-reading',excerpt:'3,125 req/s'},{ref:'S2',kind:'playbook-entry',excerpt:'text'}]};
 const base={id:'X',verdict:'apply',headline:'Keep it',reasoning:'At 3,125 req/s the draft holds.',refinements:[],proposals:[],risks:[],questions:[],sourceRefs:['S1'],preferred:'none'};
 assert.equal(scoreAssessment(base,packet,{expect:{}},dataset.defaults).falseSupport,false);
 assert.equal(scoreAssessment({...base,reasoning:'It holds 48,000 req/s.'},packet,{expect:{}},dataset.defaults).falseSupport,true);
 assert.equal(scoreAssessment({...base,reasoning:'This guarantees the target.'},packet,{expect:{}},dataset.defaults).falseSupport,true);
});

await check('adoption rates come from what architects did with advice in a real project, not from this harness',async()=>{
 const m=adoptionMetrics({coauthoring:{assessments:[{runId:'r1',itemId:'F:a',outcome:'used'},{runId:'r1',itemId:'F:a',outcome:'applied'},{runId:'r2',itemId:'M:8:x',outcome:'dismissed'}]},knowledge:{stewardship:[{decision:'captured'}]}});
 assert.deepEqual(m,{records:3,advisedItems:2,taken:1,applied:1,disagreed:1,disagreementRate:0.5,appliedRate:0.5,learned:1});
});
console.log(JSON.stringify({status:'passed',checks:checks.length,seconds:Math.round((Date.now()-started)/1000),summary:report.summary,authority:'Provider test double: verifies the path, guards and metrics, not the quality of advice.',checksRun:checks},null,2));
