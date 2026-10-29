// The review plan (round 12, GR-GOV-04, -13, -19, -16, -11; workstream D3): the review a drafted or imported design waits
// for, counted by kind and chapter and grouped so that a person reviews it in tens of judgements, each with its scope
// stated, rather than one save per record. Every step names what it covers in words and the one command that records it:
//   records    the records of one chapter and kind that Sol drafted (or guidance proposed) and no person has reviewed:
//              one grouped judgement (review.judgement), each record kept with its fingerprint (provenance.js);
//   confirm    the imported requirements of one requirement group not confirmed yet: one bulk confirmation
//              (requirements.confirm, journalled once);
//   proposals  the records AIW proposed in one chapter (D2's seeds) and the proposals Sol's architecture draft applied
//              (workstream E): kept in one step through the one lifecycle family (record.keep, at most 500 a step),
//              or dismissed (record.retire) one by one with why;
//   changes    one change and every record it reaches: one review for the whole change (change.review, scope cause);
//   findings   one rule's findings in one chapter: one treatment for the cause (review.disposition, scope cause);
//   trails     the requirement trails of one requirement group: one trace review (review.trace, scope group);
//   person     a person's own step the plan lists but never runs (a chapter's intake or handoff review).
// The steps are ranked as the desk ranks its vitals (desk-vitals.js RANK: critical first, then to watch, then silent),
// then by size, so the plan opens on its largest causes; each step's command is worked out when it is opened
// (planCommand), with the stamp of what the reviewer is shown, so the plan itself stays cheap at any size. Nothing here
// records anything: the commands keep their own gates, and a person records every judgement.
import {memoPass,remember} from './document-memo.js';
import {eachRecord,authorOf,reviewOf,judgementMembers,judgementStamp,scopeWords,lowerFirst,RECORD_NOUNS,AUTHOR_WORDS} from './provenance.js';
import {changeCauses,causeStamp,changeEvents} from './changes-domain.js';
import {CHAPTER_TITLES} from './chapter-names.js';
import {inheritedFindings,findingTreatment,findingCause,causeFindings,causeFindingStamp,reviewRequirements,traceReviewFor,traceScope,groupTraceStamp} from './review-domain.js';
import {seededRecords} from './runtime-domain.js';
import {requirementGroups,groupIndex} from './requirement-groups.js';
import {RANK} from './desk-vitals.js';

const count=n=>n.toLocaleString('en-GB');
const plural=(n,one,many=one+'s')=>count(n)+' '+(n===1?one:many);
const chapterName=c=>c===11?'Review & realize':CHAPTER_TITLES[c]||'Chapter '+c;
// The kinds of record whose review is a grouped judgement: what Sol drafted, and what guidance proposed that no person
// has confirmed. Imported requirements are confirmed (their chapter reads the confirmation); AIW's seeds are kept or
// dismissed; a person's own record is judged by its chapter's checks.
const JUDGED=['sol-draft','guidance'];
// A keep names at most 500 records (record-lifecycle.js): a larger set is planned as several steps.
const KEEP_LIMIT=500;
const PERSON_RULES=new Set(['intake','handoff']);
export function reviewPlan(p){return memoPass(p,()=>remember(p,'review-plan','',()=>planOf(p)));}
function planOf(p){
 const steps=[],byChapter=new Map(),byKind={};
 const tally=(chapter,kind,n)=>{const c=byChapter.get(chapter)||{chapter,title:chapterName(chapter),total:0};c[kind]=(c[kind]||0)+n;c.total+=n;byChapter.set(chapter,c);byKind[kind]=(byKind[kind]||0)+n;};
 // 1. Records drafted by Sol or proposed by guidance, not reviewed: one judgement per chapter and kind of record.
 const groups=new Map(),unconfirmed=[],drafted=new Map();
 eachRecord(p,(r,chapter,path)=>{
  const kind=authorOf(r);
  if(path==='artefacts'&&r.type==='requirement'){if(kind==='import'&&!r.confirmed&&r.scopeMode!=='out')unconfirmed.push(r);if(kind==='import')return;}
  if(!JUDGED.includes(kind)||reviewOf(p,r,chapter))return;
  // Sol's proposals (workstream E's draft, applied as proposals) are kept, not judged: a judgement would leave them out of
  // every check. They join AIW's proposals below.
  if(r.state==='proposed'&&r.id!=null){let xs=drafted.get(chapter);if(!xs)drafted.set(chapter,xs=[]);xs.push(r.id);return;}
  const key=kind+'|'+chapter+'|'+path;let g=groups.get(key);if(!g)groups.set(key,g={kind,chapter,path,n:0});g.n++;
 });
 for(const g of groups.values()){
  const scope={kind:'author',author:g.kind,chapter:g.chapter,path:g.path};
  steps.push({id:'records:'+g.kind+':'+g.chapter+':'+g.path,kind:'records',chapter:g.chapter,count:g.n,severity:g.kind==='sol-draft'?'bad':'warn',title:'Review '+plural(g.n,RECORD_NOUNS[g.path]||'record')+' '+lowerFirst(AUTHOR_WORDS[g.kind]),scope:scopeWords(scope,g.n),commandType:'review.judgement',target:{scope}});
  tally(g.chapter,'records',g.n);
 }
 // 2. Imported requirements to confirm: one bulk confirmation per requirement group (those in none, together).
 if(unconfirmed.length){
  const index=groupIndex(p),byGroup=new Map();
  for(const r of unconfirmed){const g=(index.of.get(r.id)||[])[0]||'';let xs=byGroup.get(g);if(!xs)byGroup.set(g,xs=[]);xs.push(r.id);}
  const titles=new Map(requirementGroups(p).map(g=>[g.id,g.title]));
  for(const [g,ids] of byGroup)steps.push({id:'confirm:'+(g||'ungrouped'),kind:'confirm',chapter:1,count:ids.length,severity:'warn',title:'Confirm '+plural(ids.length,'imported requirement')+(g?' of '+g+' · '+(titles.get(g)||''):' in no requirement group'),scope:plural(ids.length,'imported requirement')+(g?' of the requirement group '+g:' that no requirement group holds')+', not confirmed yet',commandType:'requirements.confirm',target:{ids}});
  tally(1,'confirmations',unconfirmed.length);
 }
 // 3. AIW's proposals, by chapter: kept or dismissed in one step.
 // A chapter's proposals read by state include the ones Sol's draft applied: those are planned as Sol's, below.
 const sols=new Set([...drafted].flatMap(([chapter,ids])=>ids.map(id=>chapter+':'+id)));
 const seeds=new Map();for(const x of seededRecords(p)){if(sols.has(x.chapter+':'+x.id))continue;let xs=seeds.get(x.chapter);if(!xs)seeds.set(x.chapter,xs=[]);xs.push(x.id);}
 const keepSteps=(who,by,chapter,all)=>{for(let i=0;i<all.length;i+=KEEP_LIMIT){const ids=all.slice(i,i+KEEP_LIMIT),part=all.length>KEEP_LIMIT?' (part '+(i/KEEP_LIMIT+1)+' of '+Math.ceil(all.length/KEEP_LIMIT)+')':'';steps.push({id:'proposals:'+who+':'+chapter+':'+(i/KEEP_LIMIT+1),kind:'proposals',chapter,count:ids.length,severity:who==='sol'?'bad':'warn',title:'Keep or dismiss '+plural(ids.length,'proposal')+' '+by+' made in Chapter '+chapter+part,scope:plural(ids.length,'record')+' '+by+' proposed in '+chapterName(chapter)+' that no person has kept, completed or dismissed'+part,commandType:'record.keep',target:{ids,chapter}});}tally(chapter,'proposals',all.length);};
 for(const [chapter,ids] of seeds)keepSteps('aiw','AIW',chapter,ids);
 for(const [chapter,ids] of drafted)keepSteps('sol','Sol\'s draft',chapter,ids);
 // 4. Changes to review, one step per change however many records it reaches.
 for(const c of changeCauses(p)){steps.push({id:'changes:'+c.id,kind:'changes',chapter:c.source.chapter,count:c.open,severity:'warn',title:'Review '+c.id+' · '+(c.source.ref||c.source.id)+' changed · '+plural(c.open,'affected record'),scope:plural(c.open,'record')+' that '+c.id+' ('+(c.source.ref||c.source.id)+', '+String(c.at||'').slice(0,10)+(c.actor?', by '+c.actor:'')+') reaches, not yet reviewed against it',commandType:'change.review',target:{changeId:c.id}});tally(c.source.chapter,'changes',c.open);}
 // 5. Findings to fix or treat, one step per cause (a chapter's intake and handoff reviews are a person's own steps).
 const causes=new Map();
 for(const f of inheritedFindings(p)){if(findingTreatment(p,f)!=='Needs assessment')continue;const c=findingCause(f);let x=causes.get(c.key);if(!x)causes.set(c.key,x={...c,n:0,first:f});x.n++;}
 for(const c of causes.values()){
  const person=PERSON_RULES.has(c.kind);
  const like=c.n>1?' like “'+c.title+'”':' “'+c.title+'”';
  steps.push({id:(person?'person:':'findings:')+c.key,kind:person?'person':'findings',chapter:c.chapter,count:c.n,severity:c.level==='error'?'bad':person?'none':'warn',title:person?c.title:'Treat '+plural(c.n,'finding')+like+' in Chapter '+c.chapter,scope:plural(c.n,c.level==='error'?'content gap':'review item')+like+' in '+chapterName(c.chapter)+' (one rule), not treated yet',commandType:person?null:'review.disposition',target:{cause:c.key}});
  tally(c.chapter,person?'person':'findings',c.n);
 }
 // 6. Requirement trails to review, one step per requirement group (those in no group, together).
 const index=groupIndex(p),trails=new Map();
 for(const r of reviewRequirements(p)){if(traceReviewFor(p,r.id))continue;const g=(index.of.get(r.id)||[])[0]||'';let xs=trails.get(g);if(!xs)trails.set(g,xs=[]);xs.push(r.id);}
 for(const [g,ids] of trails){steps.push({id:'trails:'+(g||'ungrouped'),kind:'trails',chapter:11,count:ids.length,severity:'none',title:'Review '+plural(ids.length,'requirement trail')+(g?' of '+g:' in no requirement group'),scope:plural(ids.length,'requirement trail')+(g?' of the requirement group '+g:' of requirements that no group holds')+', not reviewed yet',commandType:'review.trace',target:g?{scope:{kind:'group',id:g}}:{scope:{kind:'requirements',ids}}});tally(11,'trails',ids.length);}
 // Ranked as the desk ranks its vitals, then the largest first.
 const rank=s=>{const i=RANK.indexOf(s.severity);return i<0?RANK.length:i;};
 steps.sort((a,b)=>rank(a)-rank(b)||b.count-a.count||a.id.localeCompare(b.id));
 steps.forEach((s,i)=>{s.rank=i+1;});
 const items=steps.reduce((n,s)=>n+s.count,0);
 return {steps,total:steps.length,items,judgements:steps.filter(s=>s.commandType).length,byKind,chapters:[...byChapter.values()].sort((a,b)=>a.chapter-b.chapter),first:steps[0]||null,
  summary:steps.length?plural(items,'item')+' to review in '+plural(steps.length,'step')+' ('+steps.filter(s=>s.commandType).length+' of them one recorded judgement each), the largest causes first.':'Nothing is waiting for review.'};
}
// The command a step records, ready for the person's own words (outcome, rationale, evidence, exceptions): its scope and
// the stamp of what the person is shown now. A step that is a person's own (no command) answers null.
export function planCommand(p,step){
 if(!step?.commandType)return null;
 return memoPass(p,()=>{
  const t=step.target;
  switch(step.commandType){
   case 'review.judgement':return {type:'review.judgement',payload:{scope:t.scope,stamp:judgementStamp(p,judgementMembers(p,t.scope))}};
   case 'requirements.confirm':return {type:'requirements.confirm',payload:{ids:t.ids,count:t.ids.length}};
   case 'change.review':{const e=changeEvents(p).find(x=>x.id===t.changeId);return e?{type:'change.review',payload:{scope:'cause',changeId:e.id,stamp:causeStamp(p,e)}}:null;}
   case 'review.disposition':return {type:'review.disposition',payload:{scope:'cause',cause:t.cause,stamp:causeFindingStamp(p,causeFindings(p,t.cause))}};
   case 'review.trace':{const {ids}=traceScope(p,t.scope);return {type:'review.trace',payload:{scope:t.scope,stamp:groupTraceStamp(p,ids)}};}
   default:return {type:step.commandType,payload:{ids:t.ids,...(t.chapter?{chapter:t.chapter}:{})}};
  }
 });
}
// What a step covers, record by record, for a sample to open before judging it (at most `limit`).
export function stepRecords(p,step,limit=12){
 const t=step?.target||{};
 if(step?.commandType==='review.judgement')return judgementMembers(p,t.scope).slice(0,limit).map(m=>({chapter:m.chapter,id:m.id,ref:m.record.ref||m.record.code||m.id,title:m.record.title||m.record.question||m.record.name||m.id}));
 if(step?.commandType==='review.disposition')return causeFindings(p,t.cause).slice(0,limit).map(f=>({chapter:f.chapter,id:f.objectId,ref:f.objectId,title:f.title+': '+f.detail}));
 if(Array.isArray(t.ids))return t.ids.slice(0,limit).map(id=>({id,ref:id,title:id}));
 if(t.scope?.kind==='group')return traceScope(p,t.scope).ids.slice(0,limit).map(id=>({chapter:1,id,ref:id,title:id}));
 return [];
}
