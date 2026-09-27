// Sol on every chapter, against the configured model: one target of every kind Sol assesses on each chapter model
// and the review desk, and one saved object of each chapter on Sol's panel in each mode. Each answer is checked as
// the product checks it and rendered as the page renders it; the report says what the architect would see.
//   node scripts/evaluate-sol-coverage.mjs                         test double: the path and the rendering; no network
//   node --env-file=.env scripts/evaluate-sol-coverage.mjs --live  the configured provider
// Options: --out report.json
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {reasoningPacket,checkRecordRefinements} from '../public/brain-reasoning.js';
import {solTarget} from '../public/chapter-reasoning.js';
import {assessmentHTML} from '../public/brain-reasoning-ui.js';
import {intelligencePacket} from '../public/intelligence-context.js';
import {resultHTML} from '../public/intelligence-ui.js';
import {journeyIndex} from '../public/journey-context.js';
import {deskModel} from '../public/desk-model.js';
import {fixDrafts} from '../public/desk-fixes.js';
import {requestReasoning,requestIntelligence} from '../intelligence-provider.js';
import {answer} from '../mock-llm-provider.mjs';
import {domainProject} from '../sol-evaluation.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),argv=process.argv.slice(2);
const opt=name=>{const i=argv.indexOf('--'+name);return i>=0?argv[i+1]:null;};
const live=argv.includes('--live'),list=v=>Array.isArray(v)?v:[];
let env,fetcher;
if(live){
 if(!process.env.OPENAI_API_KEY||!process.env.AIW_LLM_MODEL)throw Error('A live run needs OPENAI_API_KEY and AIW_LLM_MODEL (for example node --env-file=.env ...).');
 env=process.env;fetcher=fetch;console.error(`Live coverage: each request's packet goes to ${process.env.AIW_LLM_BASE_URL||'https://api.openai.com/v1'} with store:false, model ${process.env.AIW_LLM_MODEL}.`);
}else{env={OPENAI_API_KEY:'test-double',AIW_LLM_MODEL:'mock-sol',AIW_LLM_BASE_URL:'http://127.0.0.1:9/v1'};fetcher=async(url,init)=>new Response(JSON.stringify(answer(JSON.parse(init.body))),{status:200,headers:{'Content-Type':'application/json'}});}
const dataset=JSON.parse(await readFile(path.join(root,'evaluation','sol-heldout-v1.json'),'utf8'));
const bank=domainProject(dataset.domains['bank-payment']),permits=domainProject(dataset.domains['service-permits']);
const usage={input:0,output:0},add=u=>{usage.input+=u?.inputTokens||0;usage.output+=u?.outputTokens||0;};

// The targets: what each chapter model and the desk offer, one of each kind.
const first=xs=>list(xs)[0];
const F=fixDrafts(deskModel(bank)),perm=fixDrafts(deskModel(permits));
const driver=first(bank.quality?.drivers),rec=list(bank.technologyRealisation?.records).find(r=>list(r.options).length>1)||first(bank.technologyRealisation?.records);
const targets=[
 ['bank',2,'quality driver',driver?.id],['bank',2,'What if move',driver?.id,{whatIf:true}],['bank',3,'decision',first(bank.decisions?.records)?.id],
 ['bank',4,'responsibility',first(bank.logical?.responsibilities)?.id],['bank',5,'component',first(bank.realisation?.components)?.id],
 ['bank',6,'platform capability',first(bank.technology?.capabilities)?.id],['bank',7,'realisation, selected by an option',rec&&first(rec.options)?`${rec.id}/${first(rec.options).id}`:rec?.id],
 ['bank',8,'contract',first(bank.interfaces?.contracts)?.id],['bank',8,'data definition',first(bank.interfaces?.data)?.id],
 ['bank',9,'threat',first(bank.security?.threats)?.id],['bank',9,'control',first(bank.security?.controls)?.id],['bank',9,'exposure of a component',first(bank.realisation?.components)?.id],
 ['bank',9,'exposure, selected by a contract\'s link',first(bank.interfaces?.contracts)?'C:'+first(bank.interfaces.contracts).id:null],['bank',10,'runtime plan',first(bank.runtime?.plans)?.id],
 ['bank',11,'desk fix',F.drafts.find(d=>!d.switchPoint)&&'F:'+F.drafts.find(d=>!d.switchPoint).id],['bank',11,'desk switch point',F.drafts.find(d=>d.switchPoint)&&'F:'+F.drafts.find(d=>d.switchPoint).id],
 ['bank',11,'desk judgement',first(F.judgements)&&'J:'+first(F.judgements).id],
 ['service-permits',11,'capacity fix sized for the Playbook example',perm.byId.get('capacity:run-001')&&'F:capacity:run-001'],['service-permits',10,'runtime plan beside the Playbook example',first(permits.runtime?.plans)?.id]];
const route2=[];
for(const [name,chapter,what,sel,o={}] of targets){
 if(!sel){route2.push({project:name,chapter,what,skipped:'the design holds none'});continue;}
 const p=name==='bank'?bank:permits,id=/^[FJD]:/.test(sel)?sel:solTarget(p,chapter,sel,o),t0=Date.now();
 if(!id){route2.push({project:name,chapter,what,selection:sel,error:'no Sol target'});continue;}
 const values=id.endsWith('|whatif')?{[id]:{targetValue:String(Math.max(1,Math.round(Number(driver.targetValue)*0.8)||2)),priority:'High'}}:null;
 try{
  const packet=reasoningPacket(p,{task:'decisions',ids:[id],scope:'coverage',prompt:'',...(values?{values}:{})});
  const run=await requestReasoning(env,packet,{fetcher,check:r=>checkRecordRefinements(p,packet,r)});add(run.usage);
  const a=run.result.assessments[0],item=packet.items[0];
  const html=assessmentHTML({run:{...run,id:'coverage',createdAt:new Date().toISOString(),packet},a,item,current:true},{id,knobs:item.knobs});
  route2.push({project:name,chapter,what,selection:sel,id,kind:item.kind,ms:Date.now()-t0,shown:!a.withheld,verdict:a.withheld?null:a.verdict,headline:a.headline,
   ...(a.withheld?{withheldFor:list(a.issues).slice(0,4)}:{}),...(a.setAside?{setAside:a.setAside.map(x=>x.label)}:{}),...(a.checkNote?{checkNote:a.checkNote}:{}),
   rendered:/Sol’s assessment/.test(html)&&/dk-solv /.test(html),contradictions:list(run.groundingReview?.contradictions).length});
 }catch(e){route2.push({project:name,chapter,what,selection:sel,id,error:e.code||'failed',detail:e.message,ms:Date.now()-t0});}
 console.error(`route 2 · Chapter ${chapter} · ${what} · ${route2.at(-1).error?'failed: '+route2.at(-1).detail:route2.at(-1).shown?route2.at(-1).verdict:'withheld'}`);
}

// Sol's panel: one saved object of each chapter, in design mode; the other modes once.
const nodes=[...journeyIndex(bank).nodes.values()].filter(n=>n.id!=='project'),byChapter=new Map();
for(const n of nodes)if(n.chapter>=1&&n.chapter<=11&&!byChapter.has(n.chapter))byChapter.set(n.chapter,n);
const asks=[...[...byChapter.values()].map(n=>[n,'design',n.chapter]),[byChapter.get(2),'mind',2],[byChapter.get(1),'author',1],[byChapter.get(8)||byChapter.get(2),'challenge',8],[byChapter.get(5)||byChapter.get(4),'design',11]].filter(([n])=>n);
const route1=[];
for(const [n,mode,chapter] of asks){
 const t0=Date.now();
 try{
  const packet=intelligencePacket(bank,{chapter,objectId:n.id,mode,prompt:mode==='challenge'?'Where do the sources on this record disagree?':'Explain this record and what the architect should decide next.'});
  const run=await requestIntelligence(env,packet,{fetcher});add(run.usage);
  const html=resultHTML({run:{...run,id:'coverage-'+n.id,status:'completed',createdAt:new Date().toISOString(),packet}},bank);
  route1.push({chapter,mode,objectId:n.id,title:n.title||n.ref,ms:Date.now()-t0,accepted:!!run.groundingReview?.accepted,shownAs:run.groundingReview?.accepted?'Sol’s response':'structured guidance from the reviewed method (the response did not pass the source check)',
   title_:run.result?.title,...(run.groundingReview?.accepted?{}:{issues:list(run.groundingReview?.issues).slice(0,3)}),...(run.groundingReview?.contradiction?{contradiction:run.groundingReview.contradiction.note}:{}),rendered:/intel-result/.test(html)});
 }catch(e){route1.push({chapter,mode,objectId:n.id,error:e.code||'failed',detail:e.message,ms:Date.now()-t0});}
 console.error(`route 1 · Chapter ${chapter} · ${mode} · ${route1.at(-1).error?'failed: '+route1.at(-1).detail:route1.at(-1).accepted?'accepted':'fallback'}`);
}

const r2=route2.filter(x=>!x.skipped),r1=route1;
const report={schema:'aiw-sol-coverage-v1',at:new Date().toISOString(),mode:live?'live-provider':'test-double',model:live?process.env.AIW_LLM_MODEL:'mock-sol',
 summary:{route2:{asked:r2.length,failed:r2.filter(x=>x.error).length,shown:r2.filter(x=>x.shown).length,withheld:r2.filter(x=>x.shown===false).length,rendered:r2.filter(x=>x.rendered).length,chapters:[...new Set(r2.map(x=>x.chapter))].sort((a,b)=>a-b)},
  route1:{asked:r1.length,failed:r1.filter(x=>x.error).length,accepted:r1.filter(x=>x.accepted).length,fallback:r1.filter(x=>!x.error&&!x.accepted).length,rendered:r1.filter(x=>x.rendered).length,chapters:[...new Set(r1.map(x=>x.chapter))].sort((a,b)=>a-b),modes:[...new Set(r1.map(x=>x.mode))]},tokens:usage},
 route2,route1,
 limitations:['One target of each kind per chapter, from the reference designs; not every record.','A withheld assessment is displayed as withheld: the architect sees that Sol\'s advice did not pass the checks, and the reading stands.','A panel response that fails its source check is displayed as structured guidance from the reviewed method, not as Sol\'s response.']};
const out=opt('out')||path.join(root,'evidence','brain-evaluation',`sol-coverage-${report.mode}-${report.at.slice(0,10)}.json`);
await mkdir(path.dirname(out),{recursive:true});await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({report:out,...report.summary},null,2));
if(report.summary.route2.failed||report.summary.route1.failed||report.summary.route2.rendered<r2.filter(x=>!x.error).length||report.summary.route1.rendered<r1.filter(x=>!x.error).length)process.exitCode=1;
