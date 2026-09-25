// Held-out evaluation of Sol's advice through the Brain's own reasoning path: the packet the architect
// would see (reasoningPacket), the provider call with its deterministic guard and second-pass check
// (requestReasoning), the chapter's own rules on refinements (checkRecordRefinements), and settlement.
// Each assessment is scored against implementation-authored expectations. The metrics are proxies:
// they detect structural and grounding failures and disagreement with the expected class of advice;
// they do not certify architectural judgement.
import {reasoningPacket,checkRecordRefinements} from './public/brain-reasoning.js';
import {requestReasoning} from './intelligence-provider.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './public/projects-domain.js';
import {digest} from './public/brain-integrity.js';

export const EVALUATION_VERSION='aiw-sol-evaluation-v1';
const list=v=>Array.isArray(v)?v:[];
const numbers=text=>[...String(text).matchAll(/\d[\d,]*(?:\.\d+)?/g)].map(m=>m[0].replace(/,/g,'')).filter(n=>Number(n)>=13);
// Why an assessment was withheld, from the guard's own wording (brain-reasoning.js), most specific first.
const WITHHELD=[['number',/states [\d,.]+|which no reading|not in the packet/i],['guarantee',/guarantee|verified outcome|\bproves?\b/i],['citation',/does not cite|\bcit(?:e|es|ation)\b/i],['bounds',/outside [\d.,]+/i],['refinement',/proposes no change|unknown knob|refin/i],['verdict',/verdict/i],['proposals',/threat|target/i],['second-pass',/second|not supported|overstate/i],['chapter-rules',/chapter|rule|reject/i]];
const reasonsOf=issues=>[...new Set(list(issues).map(i=>(WITHHELD.find(([,re])=>re.test(i))||['other'])[0]))];

export function domainProject(domain){
 const template=domain.template;
 if(template==='bank-payment')return withFinalReview(seedProject());
 return createProject({name:'Evaluation · '+template,template},'eval-'+template,'2026-09-26T00:00:00.000Z');
}

// One assessment against its case's expectations.
export function scoreAssessment(a,packet,c,defaults={}){
 const item=packet.items.find(i=>i.id===a.id),exp=c.expect||{},out={id:a.id,kind:item?.kind||null,verdict:a.verdict,withheld:!!a.withheld};
 if(a.withheld)return {...out,withheldReasons:reasonsOf(a.issues),issues:list(a.issues).slice(0,6)};
 const cited=list(a.sourceRefs).map(r=>packet.sources.find(s=>s.ref===r)).filter(Boolean),text=[a.headline,a.reasoning,...list(a.risks),...list(a.questions)].join(' ');
 const forbidden=[...list(defaults.forbid),...list(exp.forbid)].filter(re=>new RegExp(re,'i').test(text));
 const known=new Set([...cited.flatMap(s=>numbers(s.excerpt)),...list(item?.knobs).flatMap(k=>numbers(k.value)),...list(a.refinements).flatMap(r=>numbers(r.value))]);
 const unsupported=numbers(text).filter(n=>!known.has(n));
 return {...out,
  verdictAgrees:exp.verdicts?exp.verdicts.includes(a.verdict):null,
  citesOwnReading:!!item&&list(a.sourceRefs).includes(item.ref),
  citesExpectedKinds:exp.cite?exp.cite.every(k=>cited.some(s=>s.kind===k)):null,
  numbersInBand:exp.numbers?Object.entries(exp.numbers).every(([k,[lo,hi]])=>{const r=list(a.refinements).find(x=>x.key===k);return !r||Number(r.value)>=lo&&Number(r.value)<=hi;}):null,
  proposalsOk:exp.proposals?list(a.proposals).length>=exp.proposals.min&&list(a.proposals).every(x=>list(x.targetIds).every(t=>list(item?.allowed?.proposals?.targets).includes(t))):null,
  preferredOk:exp.preferredIn?(a.preferred==='none'||exp.preferredIn.includes(a.preferred)):null,
  addresses:exp.mention?new RegExp(exp.mention,'i').test(text):null,
  forbidden,unsupportedNumbers:unsupported,falseSupport:forbidden.length>0||unsupported.length>0,
  citedKinds:[...new Set(cited.map(s=>s.kind))],refinements:list(a.refinements).map(r=>r.key)};
}

export async function evaluateCase(p,c,env,{fetcher=fetch,defaults={}}={}){
 const started=Date.now();let packet;
 try{packet=reasoningPacket(p,{task:'decisions',ids:c.ids,scope:'evaluation:'+c.id,prompt:c.prompt||''});}
 catch(e){return {id:c.id,domain:c.domain,error:'packet',detail:e.message,ms:Date.now()-started};}
 let run;
 try{run=await requestReasoning(env,packet,{fetcher,check:r=>checkRecordRefinements(p,packet,r)});}
 catch(e){return {id:c.id,domain:c.domain,error:e.code||'provider',detail:e.message,ms:Date.now()-started,packet:{stamp:packet.stamp,sources:packet.sources.length}};}
 return {id:c.id,domain:c.domain,ms:Date.now()-started,provider:run.provider,model:run.model,usage:run.usage,
  packet:{stamp:packet.stamp,sources:packet.sources.length,kinds:[...new Set(packet.sources.map(s=>s.kind))],chars:packet.sources.reduce((n,s)=>n+String(s.excerpt||'').length,0)},
  review:{accepted:run.groundingReview?.accepted,withheld:list(run.groundingReview?.withheld)},
  assessments:list(run.result?.assessments).map(a=>scoreAssessment(a,packet,c,defaults))};
}

const rate=(xs,f)=>{const ys=xs.filter(x=>f(x)!==null&&f(x)!==undefined);return ys.length?{rate:Number((ys.filter(f).length/ys.length).toFixed(3)),of:ys.length}:{rate:null,of:0};};
export function summarise(results){
 const all=results.flatMap(r=>list(r.assessments)),shown=all.filter(a=>!a.withheld),ms=results.map(r=>r.ms).sort((a,b)=>a-b),q=f=>ms.length?ms[Math.min(ms.length-1,Math.floor(ms.length*f))]:null;
 const reasons={};for(const a of all.filter(a=>a.withheld))for(const k of a.withheldReasons)reasons[k]=(reasons[k]||0)+1;
 return {cases:results.length,requestFailures:results.filter(r=>r.error).length,assessments:all.length,
  withheld:{rate:all.length?Number((all.filter(a=>a.withheld).length/all.length).toFixed(3)):null,of:all.length,reasons},
  verdictAgreement:rate(shown,a=>a.verdictAgrees),ownReadingCited:rate(shown,a=>a.citesOwnReading),expectedSupportCited:rate(shown,a=>a.citesExpectedKinds),
  addressesTheIssue:rate(shown,a=>a.addresses),numbersWithinBand:rate(shown,a=>a.numbersInBand),proposalsValid:rate(shown,a=>a.proposalsOk),preferenceWithinOptions:rate(shown,a=>a.preferredOk),
  falseSupport:rate(shown,a=>a.falseSupport),
  tokens:results.reduce((n,r)=>n+(Number(r.usage?.inputTokens)||0)+(Number(r.usage?.outputTokens)||0),0),latencyMs:{p50:q(0.5),p95:q(0.95)},
  byDomain:Object.fromEntries([...new Set(results.map(r=>r.domain))].map(d=>{const xs=results.filter(r=>r.domain===d).flatMap(r=>list(r.assessments)).filter(a=>!a.withheld);return [d,{verdictAgreement:rate(xs,a=>a.verdictAgrees),addressesTheIssue:rate(xs,a=>a.addresses)}];}))};
}

// What architects did with Sol's advice in a real project (its exported JSON), not in this harness.
export function adoptionMetrics(p){
 const xs=list(p?.coauthoring?.assessments),n=k=>xs.filter(a=>a.outcome===k).length,items=new Set(xs.map(a=>a.runId+'|'+a.itemId));
 return {records:xs.length,advisedItems:items.size,taken:n('used'),applied:n('applied'),disagreed:n('dismissed'),disagreementRate:items.size?Number((n('dismissed')/items.size).toFixed(3)):null,appliedRate:items.size?Number((n('applied')/items.size).toFixed(3)):null,
  learned:list(p?.knowledge?.stewardship).filter(d=>d.decision==='captured').length};
}

export async function runEvaluation(dataset,env,{fetcher=fetch,only=null,log=()=>{}}={}){
 if(dataset?.schema!=='aiw-sol-heldout-v1'||!Array.isArray(dataset.cases))throw Error('Expected an aiw-sol-heldout-v1 dataset.');
 const projects=new Map(),results=[];
 for(const c of dataset.cases.filter(c=>!only||only.includes(c.id))){
  if(!projects.has(c.domain)){const d=dataset.domains?.[c.domain];if(!d)throw Error('Unknown domain '+c.domain+'.');projects.set(c.domain,domainProject(d));}
  const r=await evaluateCase(projects.get(c.domain),c,env,{fetcher,defaults:dataset.defaults||{}});results.push(r);log(r);
 }
 return {schema:EVALUATION_VERSION,at:new Date().toISOString(),dataset:{title:dataset.title,digest:digest(dataset),cases:dataset.cases.length,authority:dataset.authority},
  provider:results.find(r=>r.provider)?.provider||null,model:results.find(r=>r.model)?.model||null,summary:summarise(results),results,
  limitations:['Expectations are implementation-authored and need independent architect review.','Metrics are automated proxies: they detect grounding and structural failures and disagreement with the expected class of advice, not the quality of architectural judgement.','The designs are reference and teaching examples, not a production system.']};
}
