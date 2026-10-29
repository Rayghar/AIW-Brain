// The current evaluation protocol is exercised on current native targets. The historical
// sol-heldout-v1 dataset remains retained as evidence; its retired implicit-workload cases
// now fail preflight explicitly. Generic scorer/adoption/production-boundary regressions
// below are retained from the earlier harness and do not depend on obsolete targets.
import './sol-current-evaluation-validate.mjs';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {scoreAssessment,adoptionMetrics} from './sol-evaluation.js';
const dataset=JSON.parse(readFileSync('evaluation/sol-current-v1.json','utf8'));
const checks=[];async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}

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
 // A refinement's own value restated in another unit of its knob is its own, whether the answer gives it as a
 // number (the Brain) or as text (the control arm): timeoutMs 30000 as "a 30-second timeout".
 const tp=(await import('./public/brain-reasoning.js')).reasoningPacket((await import('./sol-evaluation.js')).domainProject(dataset.domains['service-workflow']),{task:'decisions',ids:['M:8:if-001'],scope:'test',prompt:''}),t=tp.items[0];
 for(const value of [30000,'30000']){const s=scoreAssessment({id:t.id,verdict:'refine',headline:'Bound the wait.',reasoning:'The contract records no timeout.',risks:[],questions:[],refinements:[{key:'timeoutMs',value,why:'A 30-second timeout bounds how long a caller waits.'}],proposals:[],preferred:'none',sourceRefs:[t.ref]},tp,{expect:{}},dataset.defaults,typeof value==='string'?{known:new Set()}:{});
  assert.deepEqual(s.unsupportedNumbers,[],String(typeof value));}
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

await check('only the evaluation reaches the control arm: the application reasons through requestReasoning alone',async()=>{
 const files=[];
 const walk=dir=>{for(const e of readdirSync(dir,{withFileTypes:true})){if(['node_modules','dist','.git','evidence','test-results'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.m?js$/.test(e.name))files.push(p.replace(/\\/g,'/'));}};
 walk('.');
 // The application's code: suites (*-validate.mjs) may exercise the provider's call directly (a timeout test does), but no
 // module the application runs may reach the control arm except the evaluation itself.
 const reaching=files.filter(f=>readFileSync(f,'utf8').includes('requestDirectBaseline'));
 assert.deepEqual(reaching.filter(f=>!/-validate\.mjs$/.test(f)).sort(),['intelligence-provider.js','sol-evaluation.js']);
 assert.ok(reaching.includes('sol-evaluation-validate.mjs'));
});

await check('adoption rates come from what architects did with advice in a real project, not from this harness',async()=>{
 const m=adoptionMetrics({coauthoring:{assessments:[{runId:'r1',itemId:'F:a',chapter:10,kind:'record',verdict:'refine',outcome:'used',refinements:[{key:'maxReplicas'}],sources:[{kind:'chapter-reading'}]},{runId:'r1',itemId:'F:a',chapter:10,kind:'record',verdict:'refine',outcome:'applied',refinements:[{key:'maxReplicas'}],sources:[{kind:'chapter-reading'}]},{runId:'r2',itemId:'M:8:x',chapter:8,kind:'record',verdict:'reconsider',outcome:'dismissed',sources:[{kind:'chapter-reading'},{kind:'governed-claim'}]}]},knowledge:{stewardship:[{decision:'captured'}]}});
 // One advised item counts once, by its last outcome (used, then applied, is one item applied).
 const {byChapter,byVerdict,byField,bySource,...head}=m;
 assert.deepEqual(head,{records:3,advisedItems:2,taken:1,applied:1,disagreed:1,disagreementRate:0.5,appliedRate:0.5,learned:1});
 assert.deepEqual(byField,[{key:'maxReplicas',advised:1,taken:1,applied:1,dismissed:0,acceptance:1}]);
 assert.deepEqual(bySource.map(r=>[r.key,r.advised,r.taken,r.dismissed]),[['chapter-reading',2,1,1],['governed-claim',1,0,1]]);
 assert.deepEqual(byChapter.map(r=>[r.key,r.acceptance]).sort((a,b)=>a[0]-b[0]),[[8,0],[10,1]]);assert.deepEqual(byVerdict.map(r=>r.key).sort(),['reconsider','refine']);
});
console.log(JSON.stringify({status:'passed',retainedScorerChecks:checks.length,checksRun:checks},null,2));
