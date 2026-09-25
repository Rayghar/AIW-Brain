// Evaluate Sol's advice on the held-out decisions (evaluation/sol-heldout-v1.json).
//   node scripts/evaluate-sol-decisions.mjs                         test double: plumbing, guards and metrics; no network
//   node --env-file=.env scripts/evaluate-sol-decisions.mjs --live  the configured provider (sends each case's packet)
// Options: --cases BP-01,SP-01  --project exported-project.json (adds real adoption rates)  --out report.json
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runEvaluation,adoptionMetrics} from '../sol-evaluation.js';
import {answer} from '../mock-llm-provider.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),argv=process.argv.slice(2);
const opt=name=>{const i=argv.indexOf('--'+name);return i>=0?argv[i+1]:null;};
const live=argv.includes('--live'),only=opt('cases')?opt('cases').split(','):null;
const dataset=JSON.parse(await readFile(path.join(root,'evaluation','sol-heldout-v1.json'),'utf8'));
let env,fetcher;
if(live){
 if(!process.env.OPENAI_API_KEY||!process.env.AIW_LLM_MODEL)throw Error('A live evaluation needs OPENAI_API_KEY and AIW_LLM_MODEL (for example node --env-file=.env ...).');
 env=process.env;fetcher=fetch;
 console.error(`Live evaluation: each case's packet (the same packet an architect is shown) is sent to ${process.env.AIW_LLM_BASE_URL||'https://api.openai.com/v1'} with store:false, model ${process.env.AIW_LLM_MODEL}.`);
}else{
 env={OPENAI_API_KEY:'test-double',AIW_LLM_MODEL:'mock-sol',AIW_LLM_BASE_URL:'http://127.0.0.1:9/v1'};
 fetcher=async(url,init)=>new Response(JSON.stringify(answer(JSON.parse(init.body))),{status:200,headers:{'Content-Type':'application/json'}});
}
const report=await runEvaluation(dataset,env,{fetcher,only,log:r=>console.error(`${r.id} · ${r.error?'failed: '+r.detail:r.assessments.map(a=>a.withheld?'withheld ('+a.withheldReasons.join(', ')+')':a.verdict+(a.verdictAgrees===false?' ✗':'')).join('; ')}`)});
report.mode=live?'live-provider':'test-double';
if(!live)report.limitations.unshift('Test double: the answers are canned. This run verifies the path, the guards and the metrics, not the quality of advice.');
if(opt('project')){const raw=JSON.parse(await readFile(opt('project'),'utf8'));report.adoption=adoptionMetrics(raw.project||raw.document||raw);}
const out=opt('out')||path.join(root,'evidence','brain-evaluation',`sol-${report.mode}-${report.at.slice(0,10)}.json`);
await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');
const s=report.summary,pct=x=>x.rate==null?'n/a':Math.round(x.rate*100)+'% of '+x.of;
console.log(JSON.stringify({report:out,mode:report.mode,model:report.model,cases:s.cases,requestFailures:s.requestFailures,assessments:s.assessments,withheld:pct(s.withheld),verdictAgreement:pct(s.verdictAgreement),addressesTheIssue:pct(s.addressesTheIssue),expectedSupportCited:pct(s.expectedSupportCited),falseSupport:pct(s.falseSupport),tokens:s.tokens},null,2));
