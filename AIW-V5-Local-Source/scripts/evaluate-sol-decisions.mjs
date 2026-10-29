// Evaluate current architecture regression cases (evaluation/sol-current-v1.json), beside the same model
// answering the same questions without the Brain (the control arm; --brain-only skips it).
//   node scripts/evaluate-sol-decisions.mjs                         test double: plumbing, guards and metrics; no network
//   node --env-file=.env scripts/evaluate-sol-decisions.mjs --live  the configured provider (sends each case's packet, and the control arm's question)
//   node scripts/evaluate-sol-decisions.mjs --rescore report.json    the kept answers of an earlier report, scored again by this scorer; no model is asked
//   node scripts/evaluate-sol-decisions.mjs --recheck report.json    as --rescore, and the Brain's kept answers pass today's deterministic checks again;
//                                                                    the second pass is not asked again, so the defects it named stand
// Options: --dataset historical-case-set.json  --preflight  --cases PAY-01,SVC-01  --brain-only  --project exported-project.json (adds real adoption rates)  --out report.json
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runEvaluation,rescoreReport,adoptionMetrics,evaluationReadiness,preflightEvaluation} from '../sol-evaluation.js';
import {answer,providerEnv,wireFor} from '../mock-llm-provider.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),argv=process.argv.slice(2);
const opt=name=>{const i=argv.indexOf('--'+name);return i>=0?argv[i+1]:null;};
const live=argv.includes('--live'),only=opt('cases')?opt('cases').split(','):null,direct=!argv.includes('--brain-only');
// The historical case set remains available with --dataset; its retired targets fail
// preflight rather than silently acquiring the old implicit example workload.
const dataset=JSON.parse(await readFile(opt('dataset')||path.join(root,'evaluation','sol-current-v1.json'),'utf8'));
if(argv.includes('--preflight')){const preflight=await preflightEvaluation(dataset,{only});console.log(JSON.stringify({preflight,provider:evaluationReadiness(process.env),providerCalls:0},null,2));process.exit(preflight.valid?0:1);}
const pct=x=>x.rate==null?'n/a':Math.round(x.rate*100)+'% of '+x.of;
const brief=(out,report)=>{const s=report.summary,d=report.direct?.summary,c=report.comparison;return JSON.stringify({report:out,mode:report.mode,model:report.model,cases:s.cases,...(report.rescored?{rescored:report.rescored}:{}),
 brain:{requestFailures:s.requestFailures,assessments:s.assessments,withheld:pct(s.withheld),withheldReasons:s.withheld.reasons,verdictAgreement:pct(s.verdictAgreement),addressesTheIssue:pct(s.addressesTheIssue),expectedSupportCited:pct(s.expectedSupportCited),falseSupport:pct(s.falseSupport),tokens:s.tokens},
 ...(d?{direct:{requestFailures:d.requestFailures,assessments:d.assessments,missing:d.missing,verdictAgreement:pct(d.verdictAgreement),addressesTheIssue:pct(d.addressesTheIssue),falseSupport:pct(d.falseSupport),wouldFailBrainChecks:pct(d.brainChecks.wouldWithhold),failsBrainChecksOnSubstance:pct(d.brainChecks.onSubstance),brainCheckReasons:d.brainChecks.reasons,tokens:d.tokens},
  comparison:{assessments:c.assessments,advised:c.advised,agreesWithExpected:c.agreesWithExpected,soundAsScored:c.soundAsScored,whereBothAdvised:c.whereBothAdvised,whereBrainWithheld:c.whereBrainWithheld}}:{})},null,2);};
if(opt('rescore')||opt('recheck')){
 const recheck=!!opt('recheck'),from=opt('recheck')||opt('rescore'),report=rescoreReport(JSON.parse(await readFile(from,'utf8')),dataset,{recheck}),out=opt('out')||from.replace(/\.json$/,'')+(recheck?'.rechecked.json':'.rescored.json');
 await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(brief(out,report));process.exit(0);
}
let env,fetcher;
if(live){
 const ready=evaluationReadiness(process.env);if(!ready.remoteEligible)throw Error('A live evaluation needs configured remote reasoning draft/check routes. Missing: '+(ready.missing.join(', ')||'a non-test remote transport')+'. Use --preflight to inspect the public configuration without sending requests.');
 env=process.env;fetcher=fetch;
 console.error('Live evaluation: the selected case packets'+(direct?' and scoped control questions':'')+' are sent through '+JSON.stringify(ready.routes)+'. Provider retention: '+ready.providers.map(p=>p.name+': '+p.retention).join(' '));
}else{
 env=providerEnv({OPENAI_API_KEY:'test-double',AIW_LLM_MODEL:'mock-sol',AIW_LLM_BASE_URL:'http://127.0.0.1:9/v1'});
 fetcher=wireFor(env,async(url,init)=>new Response(JSON.stringify(answer(JSON.parse(init.body))),{status:200,headers:{'Content-Type':'application/json'}}));
}
const line=r=>r.error?'failed: '+r.detail:r.assessments.map(a=>a.missing?'not answered':a.withheld?'withheld ('+a.withheldReasons.join(', ')+')':a.verdict+(a.verdictAgrees===false?' ✗':'')+(a.falseSupport?' ⚑':'')+(a.brainChecks?.length?' (Brain checks: '+a.brainCheckReasons.join(', ')+')':'')).join('; ');
const report=await runEvaluation(dataset,env,{fetcher,only,direct,mode:live?'live-provider':'test-double',log:r=>console.error(`${r.id} · ${r.arm==='direct'?'direct':'Brain '} · ${line(r)}`)});
if(opt('project')){const raw=JSON.parse(await readFile(opt('project'),'utf8'));report.adoption=adoptionMetrics(raw.project||raw.document||raw);}
const out=opt('out')||path.join(root,'evidence','brain-evaluation',`sol-${report.mode}-${report.at.slice(0,10)}.json`);
await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(brief(out,report));
