// Held-out evaluation of Sol's advice through the Brain's own reasoning path: the packet the architect
// would see (reasoningPacket), the provider call with its deterministic guard and second-pass check
// (requestReasoning), the chapter's own rules on refinements (checkRecordRefinements), and settlement.
// A control arm asks the same model the same questions without the Brain (directQuestion), so the report
// shows what the Brain adds. Every assessment keeps its wording, and every flag the sentence that raised it,
// so each score can be checked against the answer itself. Each assessment is scored against
// implementation-authored expectations. The metrics are proxies: they detect structural and grounding
// failures and disagreement with the expected class of advice; they do not certify architectural judgement.
import {reasoningPacket,checkRecordRefinements,reasoningSchema,validateReasoningOutput,guardReasoning,restated} from './public/brain-reasoning.js';
import {requestReasoning,requestDirectBaseline} from './intelligence-provider.js';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './public/projects-domain.js';
import {digest} from './public/brain-integrity.js';

export const EVALUATION_VERSION='aiw-sol-evaluation-v2';
const list=v=>Array.isArray(v)?v:[];
// Numbers as the guard reads them (brain-reasoning.js): a digit run inside a word or a label such as S13 is not a number.
const NUMBER=/(?<![\w.])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.,])\d+(?:\.\d+)?/g;
const numbers=text=>[...String(text).matchAll(NUMBER)].map(m=>String(Number(m[0].replace(/,/g,'')))).filter(n=>Number(n)>=13);
const SENTENCE=/(?<=[.!?])\s+|\n+/;
// A negation or hedge earlier in the same clause: "does not guarantee", "no guarantee", "until a load test
// replaces it", "an objective to be proven in testing".
const NEGATED=/\b(?:not|never|no|none|nothing|cannot|can't|can’t|doesn't|doesn’t|isn't|isn’t|won't|won’t|without|nor|neither|unverified|until|unless|to be|yet|awaits?|awaiting|pending|subject to)\b/i;
const CLAUSE=/[,;:()—–]|\b(?:but|however|although|though|while|whereas)\b/i;
// Each clause that asserts a forbidden phrase, with its sentence. A question asserts nothing.
function asserted(text,pattern){
 const hits=[];
 for(const sentence of String(text).split(SENTENCE)){
  if(/\?\s*$/.test(sentence))continue;
  const re=new RegExp(pattern,'gi');let m;
  while((m=re.exec(sentence))){
   if(!NEGATED.test(sentence.slice(0,m.index).split(CLAUSE).pop()))hits.push({pattern,match:m[0],sentence:sentence.trim().slice(0,400)});
   if(!m[0])re.lastIndex++;
  }
 }
 return hits;
}
// Each number the known set does not hold, with its sentence.
function unsupportedNumbers(text,known){
 const hits=[];
 for(const sentence of String(text).split(SENTENCE))for(const n of numbers(sentence))if(!known.has(n)&&!hits.some(h=>h.number===n))hits.push({number:n,sentence:sentence.trim().slice(0,400)});
 return hits;
}
// Why an assessment was withheld: which check raised each issue, read from the deterministic checks' own
// sentences (brain-reasoning.js); anything else is the second pass's own wording.
const CHECKS=[['number',/^It states [\d., ]+, which no reading in the packet contains\.$/],['guarantee',/^It presents a mechanism or draft as guaranteeing a verified outcome\.$/],['verified',/^It presents an assumption or drafted value as verified\.$/],
 ['citation',/^It (?:cites a source outside the reviewed packet|does not cite the decision’s own reading)\.$/],['bounds',/ is outside [\d.,-]+–[\d.,-]+\.$/],
 ['refinement',/^It (?:asks to refine the draft but proposes no change within its knobs|refines “.*”, which this draft does not have)\.$|: its wording is (?:longer than|empty)/],
 ['proposals',/^(?:It proposes threats for a decision that does not take them|A proposed threat (?:names no listed target, or an unknown category or priority|has no title, scenario or consequence))\.$/],
 ['preference',/^It prefers an alternative this decision does not have\.$/],['verdict',/^“.*” is not a verdict for this kind of decision\.$/],['structure',/^It gives no headline or no reasoning\.$/],
 ['chapter-rules',/^The chapter’s own rules reject its refinements/],['not-reached',/^The source check did not reach it\.$/],
 ['example-objective',/^It sizes for the SA Playbook’s example objective/]];
const reasonOf=issue=>(CHECKS.find(([,re])=>re.test(String(issue)))||['second-pass'])[0];
const reasonsOf=issues=>[...new Set(list(issues).map(reasonOf))];
// Failures of substance (an unsupported number, a guaranteed or verified outcome, a value out of bounds)
// against failures of the desk's contract (a field misused, a verdict the decision does not take).
const SUBSTANTIVE=new Set(['number','guarantee','verified','bounds','example-objective']);
// The wording of an assessment, as shown or as withheld.
const answerOf=a=>({headline:a.headline||'',reasoning:a.reasoning||'',risks:list(a.risks),questions:list(a.questions),
 refinements:list(a.refinements).map(r=>({key:r.key,value:r.value,why:r.why})),
 proposals:list(a.proposals).map(x=>({title:x.title,category:x.category,priority:x.priority,targetIds:list(x.targetIds),scenario:x.scenario,consequence:x.consequence})),
 preferred:a.preferred||'none',sourceRefs:list(a.sourceRefs)});

export function domainProject(domain){
 const template=domain.template;
 if(template==='bank-payment')return withFinalReview(seedProject());
 return createProject({name:'Evaluation · '+template,template},'eval-'+template,'2026-09-26T00:00:00.000Z');
}

// One assessment against its case's expectations. For the Brain, a number is supported when a source it
// cites, its draft or its own refinement holds it (in another unit too, as the guard reads it); for the control
// arm (known), when what it was given holds it.
export function scoreAssessment(a,packet,c,defaults={},{known:given=null}={}){
 const item=packet.items.find(i=>i.id===a.id),exp=c.expect||{},out={id:a.id,kind:item?.kind||null,verdict:a.verdict,withheld:!!a.withheld};
 if(a.withheld)return {...out,withheldReasons:reasonsOf(a.issues),issues:list(a.issues).slice(0,6)};
 const cited=given?[]:list(a.sourceRefs).map(r=>packet.sources.find(s=>s.ref===r)).filter(Boolean);
 // Claims are what the advice asserts; its questions assert nothing, but a figure in one still counts.
 const claims=[a.headline,a.reasoning,...list(a.risks),...list(a.refinements).map(r=>r.why),...list(a.proposals).flatMap(x=>[x.title,x.scenario,x.consequence])].filter(Boolean).join('\n');
 const text=[claims,...list(a.questions)].filter(Boolean).join('\n');
 const forbidden=[...list(defaults.forbid),...list(exp.forbid)].flatMap(re=>asserted(claims,re));
 const known=new Set([...(given?[...given]:cited.flatMap(s=>numbers(s.excerpt))),...list(item?.knobs).flatMap(k=>numbers(k.value)),...list(a.refinements).flatMap(r=>numbers(r.value)),
  ...list(a.refinements).filter(r=>typeof r.value==='number').flatMap(r=>restated(r.value,list(item?.knobs).find(k=>k.key===r.key)?.unit))]);
 const unsupported=unsupportedNumbers(text,known);
 return {...out,
  verdictAgrees:exp.verdicts?exp.verdicts.includes(a.verdict):null,
  citesOwnReading:given?null:!!item&&list(a.sourceRefs).includes(item.ref),
  citesExpectedKinds:given?null:exp.cite?exp.cite.every(k=>cited.some(s=>s.kind===k)):null,
  numbersInBand:exp.numbers?Object.entries(exp.numbers).every(([k,[lo,hi]])=>{const r=list(a.refinements).find(x=>x.key===k);return !r||Number(r.value)>=lo&&Number(r.value)<=hi;}):null,
  proposalsOk:exp.proposals?list(a.proposals).length>=exp.proposals.min&&list(a.proposals).every(x=>list(x.targetIds).every(t=>list(item?.allowed?.proposals?.targets).includes(t))):null,
  preferredOk:exp.preferredIn?(a.preferred==='none'||exp.preferredIn.includes(a.preferred)):null,
  addresses:exp.mention?new RegExp(exp.mention,'i').test(text):null,
  forbidden:[...new Set(forbidden.map(f=>f.pattern))],unsupportedNumbers:unsupported.map(u=>u.number),falseSupport:forbidden.length>0||unsupported.length>0,
  flags:[...forbidden.map(f=>({kind:'forbidden',match:f.match,sentence:f.sentence})),...unsupported.map(u=>({kind:'number',match:u.number,sentence:u.sentence}))],
  citedKinds:[...new Set(cited.map(s=>s.kind))],refinements:list(a.refinements).map(r=>r.key)};
}

export async function evaluateCase(p,c,env,{fetcher=fetch,defaults={}}={}){
 const started=Date.now();let packet;
 try{packet=reasoningPacket(p,{task:'decisions',ids:c.ids,scope:'evaluation:'+c.id,prompt:c.prompt||''});}
 catch(e){return {id:c.id,domain:c.domain,error:'packet',detail:e.message,ms:Date.now()-started};}
 let run;
 try{run=await requestReasoning(env,packet,{fetcher,check:r=>checkRecordRefinements(p,packet,r)});}
 catch(e){return {id:c.id,domain:c.domain,error:e.code||'provider',detail:e.message,ms:Date.now()-started,packet:{stamp:packet.stamp,sources:packet.sources.length}};}
 // What was withheld is kept from the draft the checks read, so a withheld verdict can be read too.
 const drafts=new Map(list(run.groundingReview?.draft?.assessments).map(a=>[a.id,a]));
 return {id:c.id,domain:c.domain,ms:Date.now()-started,provider:run.provider,model:run.model,usage:run.usage,
  packet:{stamp:packet.stamp,sources:packet.sources.length,kinds:[...new Set(packet.sources.map(s=>s.kind))],chars:packet.sources.reduce((n,s)=>n+String(s.excerpt||'').length,0)},
  review:{accepted:run.groundingReview?.accepted,withheld:list(run.groundingReview?.withheld)},
  assessments:list(run.result?.assessments).map(a=>{const d=a.withheld?drafts.get(a.id):null;
   return {...scoreAssessment(a,packet,c,defaults),answerIs:a.withheld?(d?'withheld-draft':'not-assessed'):'shown',...(d?{draftVerdict:d.verdict}:{}),answer:answerOf(d||a)};})};
}

// ---------------------------------------------------------------- the control arm: the same model without the Brain

export const DIRECT_INSTRUCTIONS=`You are an experienced solution architect. An architect asks you to assess each design decision below and advise them; they decide. For each decision return one assessment with a verdict from that decision's list:
- apply: the draft is sound as drafted.
- refine: the draft is right in direction but should change; give new values for its draft fields, and why.
- reconsider: the approach itself is questionable; say what to consider instead.
- judge: it needs the architect's or the business's judgement; give the options and the questions to settle, and for a threat judgement up to three threat scenarios on the listed targets.
- insufficient: there is not enough to advise; say what is missing.
For a decision with alternatives you may name a preferred one; otherwise preferred is "none". Be concise: a headline of one sentence, reasoning of two to five sentences, at most four risks and four questions.`;
export const DIRECT_RECEIVES='The project’s own description, each decision’s title, kind, verdicts and draft values, a recorded decision’s question, context and alternatives, and any listed options or threat targets. Not the Brain’s readings, objective and assumptions, drivers, mechanisms, tactics or governed knowledge; not Sol’s instructions, guard, second pass or chapter rules.';

// What an architect would bring to a general-purpose model about the same decisions.
export function directQuestion(packet,description=''){
 const recorded=it=>{if(it.kind!=='decision')return null;try{const d=JSON.parse(packet.sources.find(s=>s.ref===it.ref)?.excerpt||'{}').decision;
  return d?{question:d.question,context:d.context,alternatives:list(d.alternatives).map(x=>({id:x.id,title:x.title,pattern:x.pattern,avoid:x.avoid,consequences:x.consequences}))}:null;}catch{return null;}};
 return {project:description,question:packet.request?.prompt||'Assess each decision and advise the architect.',
  decisions:packet.items.map(it=>{const d=recorded(it);return {id:it.id,kind:it.kind,title:it.title,verdicts:it.allowed.verdicts,
   draft:list(it.knobs).map(k=>({key:k.key,label:k.label,value:k.value,...(k.unit?{unit:k.unit}:{}),...(k.type==='number'?{min:k.min,max:k.max}:{})})),
   ...(d?{decision:d}:{}),...(it.names?{options:it.names}:{}),...(it.allowed.proposals?{threatTargets:it.allowed.proposals.targets}:{})};})};
}
// The desk's answer format without citations: there is no packet to cite.
export function directSchema(packet){
 const s=structuredClone(reasoningSchema(packet));
 for(const o of [s,s.properties.assessments.items]){delete o.properties.sourceRefs;o.required=o.required.filter(k=>k!=='sourceRefs');}
 return s;
}
// The Brain's own deterministic checks, run on the control arm's answers to measure what the Brain would have
// withheld; nothing is withheld from it, and its missing citations are not held against it.
function brainChecks(packet,raw){
 const out=new Map();
 try{
  const result=guardReasoning(packet,validateReasoningOutput({...raw,sourceRefs:[],assessments:list(raw?.assessments).map(a=>({...a,sourceRefs:[]}))},packet));
  for(const a of result.assessments)out.set(a.id,a.problems.filter(x=>!/own reading/.test(x)));
 }catch(e){for(const it of packet.items)out.set(it.id,['Its answer does not fit the desk’s contract: '+e.message]);}
 return out;
}

export async function evaluateDirect(p,c,env,{fetcher=fetch,defaults={},description=''}={}){
 const started=Date.now();let packet;
 try{packet=reasoningPacket(p,{task:'decisions',ids:c.ids,scope:'evaluation:'+c.id,prompt:c.prompt||''});}
 catch(e){return {id:c.id,domain:c.domain,error:'packet',detail:e.message,ms:Date.now()-started};}
 const input=directQuestion(packet,description);
 let run;
 try{run=await requestDirectBaseline(env,{instructions:DIRECT_INSTRUCTIONS,input,schema:directSchema(packet),name:'aiw_direct_assessment'},{fetcher});}
 catch(e){return {id:c.id,domain:c.domain,error:e.code||'provider',detail:e.message,ms:Date.now()-started};}
 const given=new Set(numbers(JSON.stringify(input))),checks=brainChecks(packet,run.raw),raw=list(run.raw?.assessments);
 return {id:c.id,domain:c.domain,ms:Date.now()-started,model:run.model,usage:run.usage,given:{characters:JSON.stringify(input).length,recordedDecisions:input.decisions.filter(d=>d.decision).length},
  assessments:packet.items.map(it=>{const a=raw.find(x=>x?.id===it.id);if(!a)return {id:it.id,kind:it.kind,verdict:null,withheld:false,missing:true};
   const problems=checks.get(it.id)||[];return {...scoreAssessment(a,packet,c,defaults,{known:given}),brainChecks:problems,brainCheckReasons:reasonsOf(problems),answer:answerOf(a)};})};
}

// Scores a kept report again with this scorer, without asking any model: each packet is rebuilt and must
// carry the stamp it had when the answers were given, so the answers are scored against what they saw.
// With recheck, every kept answer of the Brain also passes today's deterministic checks again, so a change to
// them is measured on answers a model already gave. The second pass is a model and is not asked again: the
// defects it named stand, including any about a part today's checks set aside.
export function rescoreReport(report,dataset,{recheck=false}={}){
 if(dataset?.schema!=='aiw-sol-heldout-v1')throw Error('Expected an aiw-sol-heldout-v1 dataset.');
 if(report?.schema!==EVALUATION_VERSION)throw Error('Only a report that keeps its answers ('+EVALUATION_VERSION+') can be scored again.');
 if(report.dataset?.digest!==digest(dataset))throw Error('The report was produced from a different dataset.');
 const projects=new Map(),defaults=dataset.defaults||{},packets=new Map();
 const packetOf=c=>{if(!packets.has(c.id)){if(!projects.has(c.domain))projects.set(c.domain,domainProject(dataset.domains[c.domain]));packets.set(c.id,reasoningPacket(projects.get(c.domain),{task:'decisions',ids:c.ids,scope:'evaluation:'+c.id,prompt:c.prompt||''}));}return packets.get(c.id);};
 const asAssessment=(a)=>({id:a.id,verdict:a.verdict,...a.answer});
 const checkAgain=(a,packet,c)=>{
  const was=a.withheld?reasonsOf(a.issues):[],second=list(a.issues).filter(i=>['second-pass','not-reached'].includes(reasonOf(i)));
  let now;
  try{now=checkRecordRefinements(projects.get(c.domain),packet,guardReasoning(packet,validateReasoningOutput({summary:'',sourceRefs:[],assessments:[{...asAssessment(a),verdict:a.withheld?a.draftVerdict:a.verdict}]},packet))).assessments[0];}
  catch(e){now={withheld:true,issues:['Its answer does not fit the desk’s contract: '+e.message]};}
  const issues=[...list(now.withheld?now.issues:now.problems),...second];
  if(issues.length)return {id:a.id,kind:a.kind,verdict:null,withheld:true,withheldReasons:reasonsOf(issues),issues:issues.slice(0,6),answerIs:'withheld-draft',draftVerdict:a.withheld?a.draftVerdict:a.verdict,answer:a.answer,recheck:{was}};
  return {...scoreAssessment(now,packet,c,defaults),answerIs:'shown',answer:a.answer,...(now.setAside?{setAside:now.setAside.map(x=>x.key)}:{}),recheck:{was}};
 };
 const results=report.results.map(r=>{
  if(r.error)return r;
  const c=dataset.cases.find(x=>x.id===r.id),packet=packetOf(c);
  if(packet.stamp!==r.packet?.stamp)throw Error(r.id+': the design no longer reads as it did when Sol answered; this report cannot be scored again.');
  return {...r,assessments:r.assessments.map(a=>recheck&&a.answerIs!=='not-assessed'?checkAgain(a,packet,c):a.withheld?{...a,withheldReasons:reasonsOf(a.issues)}:{...scoreAssessment(asAssessment(a),packet,c,defaults),answerIs:a.answerIs,answer:a.answer})};
 });
 const control=report.direct?report.direct.results.map(r=>{
  if(r.error)return r;
  const c=dataset.cases.find(x=>x.id===r.id),packet=packetOf(c),input=directQuestion(packet,dataset.domains[c.domain].description||'');
  const given=new Set(numbers(JSON.stringify(input))),checks=brainChecks(packet,{summary:'',assessments:r.assessments.filter(a=>!a.missing).map(a=>({id:a.id,verdict:a.verdict,headline:a.answer.headline,reasoning:a.answer.reasoning,refinements:a.answer.refinements,proposals:a.answer.proposals,preferred:a.answer.preferred,risks:a.answer.risks,questions:a.answer.questions}))});
  return {...r,assessments:r.assessments.map(a=>{if(a.missing)return a;const problems=checks.get(a.id)||[];return {...scoreAssessment(asAssessment(a),packet,c,defaults,{known:given}),brainChecks:problems,brainCheckReasons:reasonsOf(problems),answer:a.answer};})};
 }):null;
 return {...report,rescored:{at:new Date().toISOString(),scorer:EVALUATION_VERSION,recheck,note:recheck?'The same answers, checked again by today’s deterministic checks and scored again by this scorer; no model was asked, so the defects the second pass named stand.':'The same answers, scored again by this scorer; no model was asked.'},
  summary:summarise(results),results,...(control?{direct:{...report.direct,summary:summariseDirect(control),results:control},comparison:compareArms(results,control)}:{})};
}

// ---------------------------------------------------------------- summaries and the paired comparison

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
export function summariseDirect(results){
 const all=results.flatMap(r=>list(r.assessments)).filter(a=>!a.missing),reasons={};
 for(const a of all)for(const k of list(a.brainCheckReasons))reasons[k]=(reasons[k]||0)+1;
 const {withheld,ownReadingCited,expectedSupportCited,...s}=summarise(results);
 return {...s,missing:results.flatMap(r=>list(r.assessments)).filter(a=>a.missing).length,
  brainChecks:{wouldWithhold:rate(all,a=>list(a.brainChecks).length>0),onSubstance:rate(all,a=>list(a.brainCheckReasons).some(k=>SUBSTANTIVE.has(k))),reasons}};
}
// Assessment by assessment: the Brain's advice, or its withholding, beside the control arm's answer.
export function compareArms(brain,direct){
 const rows=brain.map(b=>{const d=direct.find(x=>x.id===b.id);return {id:b.id,domain:b.domain,assessments:list(b.assessments).map(x=>{const y=list(d?.assessments).find(z=>z.id===x.id);return {id:x.id,
  brain:{verdict:x.withheld?null:x.verdict,withheld:!!x.withheld,agrees:x.withheld?null:x.verdictAgrees,falseSupport:x.withheld?null:x.falseSupport,inBand:x.withheld?null:x.numbersInBand},
  direct:y&&!y.missing?{verdict:y.verdict,agrees:y.verdictAgrees,falseSupport:y.falseSupport,inBand:y.numbersInBand,failsBrainChecks:list(y.brainChecks).length>0,failsOnSubstance:list(y.brainCheckReasons).some(k=>SUBSTANTIVE.has(k))}:null};})};});
 const pairs=rows.flatMap(r=>r.assessments),n=f=>pairs.filter(f).length;
 // Sound as scored: the expected class of verdict, no flagged claim, and any number the case bounds inside its band.
 const sound=s=>!!s&&s.agrees===true&&s.falseSupport===false&&s.inBand!==false;
 return {rows,assessments:pairs.length,
  advised:{brain:n(x=>!x.brain.withheld),direct:n(x=>!!x.direct)},
  agreesWithExpected:{brain:n(x=>x.brain.agrees===true),direct:n(x=>x.direct?.agrees===true)},
  soundAsScored:{brain:n(x=>sound(x.brain)),direct:n(x=>sound(x.direct)),directAndPassesBrainChecksOnSubstance:n(x=>sound(x.direct)&&!x.direct.failsOnSubstance)},
  whereBothAdvised:{bothAgree:n(x=>x.brain.agrees===true&&x.direct?.agrees===true),onlyBrainAgrees:n(x=>x.brain.agrees===true&&x.direct?.agrees===false),onlyDirectAgrees:n(x=>x.brain.agrees===false&&x.direct?.agrees===true),neither:n(x=>x.brain.agrees===false&&x.direct?.agrees===false)},
  whereBrainWithheld:{assessments:n(x=>x.brain.withheld),directAgrees:n(x=>x.brain.withheld&&x.direct?.agrees===true),directFailsBrainChecksOnSubstance:n(x=>x.brain.withheld&&!!x.direct?.failsOnSubstance)}};
}

// What architects did with Sol's advice in a real project (its exported JSON), not in this harness.
export function adoptionMetrics(p){
 const xs=list(p?.coauthoring?.assessments),n=k=>xs.filter(a=>a.outcome===k).length,items=new Set(xs.map(a=>a.runId+'|'+a.itemId));
 return {records:xs.length,advisedItems:items.size,taken:n('used'),applied:n('applied'),disagreed:n('dismissed'),disagreementRate:items.size?Number((n('dismissed')/items.size).toFixed(3)):null,appliedRate:items.size?Number((n('applied')/items.size).toFixed(3)):null,
  learned:list(p?.knowledge?.stewardship).filter(d=>d.decision==='captured').length};
}

export async function runEvaluation(dataset,env,{fetcher=fetch,only=null,direct=true,log=()=>{}}={}){
 if(dataset?.schema!=='aiw-sol-heldout-v1'||!Array.isArray(dataset.cases))throw Error('Expected an aiw-sol-heldout-v1 dataset.');
 const projects=new Map(),results=[],control=[];
 for(const c of dataset.cases.filter(c=>!only||only.includes(c.id))){
  const d=dataset.domains?.[c.domain];if(!d)throw Error('Unknown domain '+c.domain+'.');
  if(!projects.has(c.domain))projects.set(c.domain,domainProject(d));
  const r=await evaluateCase(projects.get(c.domain),c,env,{fetcher,defaults:dataset.defaults||{}});results.push(r);log({arm:'brain',...r});
  if(direct){const x=await evaluateDirect(projects.get(c.domain),c,env,{fetcher,defaults:dataset.defaults||{},description:d.description||''});control.push(x);log({arm:'direct',...x});}
 }
 return {schema:EVALUATION_VERSION,at:new Date().toISOString(),dataset:{title:dataset.title,digest:digest(dataset),cases:dataset.cases.length,authority:dataset.authority},
  provider:results.find(r=>r.provider)?.provider||null,model:results.find(r=>r.model)?.model||null,summary:summarise(results),results,
  direct:direct?{receives:DIRECT_RECEIVES,instructions:DIRECT_INSTRUCTIONS,model:control.find(r=>r.model)?.model||null,summary:summariseDirect(control),results:control}:null,
  comparison:direct?compareArms(results,control):null,
  limitations:['Expectations are implementation-authored and need independent architect review.','Metrics are automated proxies: they detect grounding and structural failures and disagreement with the expected class of advice, not the quality of architectural judgement.','The designs are reference and teaching examples, not a production system.',...(direct?['The control arm is one plain prompt to the same model; a different prompt or model would answer differently.']:[])]};
}
