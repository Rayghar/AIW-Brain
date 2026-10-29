// Continuity belongs to saved project runs. Prior model prose is advisory history,
// never a current claim, source release, selected design or human review.
import {digest} from './brain-integrity.js';
import {redactSecretsDeep} from './secret-redaction.js';
import {hideExcludedReferences,disclosureSourceExcluded,maskContactText} from './intelligence-context.js';
const list=x=>Array.isArray(x)?x:[];
const text=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
const ID=/^[\w:|.-]{1,160}$/;
export function normalizeDraftScope(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Choose the draft context.');
 const chapter=Number(raw.chapter),tab=raw.tab||'work',mode=raw.mode,objectId=String(raw.objectId||''),field=String(raw.field||''),taskId=String(raw.taskId||'');
 if(!Number.isInteger(chapter)||chapter<1||chapter>11||!['work','model','validate','output'].includes(tab)||!['design','mind','author','challenge','reason','field'].includes(mode)||!ID.test(objectId)||field&&!ID.test(field)||taskId&&!ID.test(taskId))throw Error('Choose a valid project, chapter, object and field context.');
 return {chapter,tab,objectId,field,mode,taskId};
}
export const draftScopeKey=scope=>digest(normalizeDraftScope(scope));
export function normalizeContextDraft(raw){
 if(raw===null)return null;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||typeof raw.prompt!=='string'||raw.prompt.length>2000)throw Error('Keep the contextual draft within 2,000 characters.');
 const priorRunId=raw.priorRunId?String(raw.priorRunId):null;
 if(priorRunId&&!/^[a-f0-9-]{36}$/i.test(priorRunId))throw Error('Choose a saved Sol response for this follow-up.');
 return {prompt:raw.prompt,priorRunId,semantic:raw.semantic===true,challenge:raw.challenge===true};
}
const subject=id=>String(id||'').replace(/^M:\d{1,2}:/,'').replace(/^[FJD]:/,'');
export function requestSubjectIds(request){return [...new Set(list(request?.ids).map(subject).concat(request?.objectId||request?.recordId||[]).filter(Boolean))];}
function boundedHistory(run,request,current){
 const subjects=new Set(requestSubjectIds(request)),prior=run.packet?.request||run.request||{},matches=a=>subjects.has(subject(a.id));
 const assessments=list(run.result?.assessments).filter(matches).slice(0,4).map(a=>({id:a.id,verdict:a.verdict,withheld:!!a.withheld,headline:text(a.headline,240),reasoning:text(a.reasoning,1800),alternativeChecks:list(a.alternativeChecks).slice(0,3).map(x=>({alternativeId:x.alternativeId,admissibility:x.admissibility,constraint:text(x.constraint,350),reason:text(x.reason,500)})),assumptions:list(a.assumptions).slice(0,5).map(x=>text(x,220)),questions:list(a.questions).slice(0,5).map(x=>text(x,220)),issues:list(a.issues).slice(0,4).map(x=>text(x,220)),sourceRefs:list(a.sourceRefs).slice(0,8)}));
 const single=requestSubjectIds(prior).length<=1;
 return {version:1,runId:run.id,createdAt:run.createdAt||null,mode:run.mode,authority:'Prior model advice only. Not a design fact, evidence, approval or current source. Reassess using the current packet. Historical source references cannot be cited as current sources.',sourceStatus:current===true?'previous-context-still-current':'changed-or-unverified-use-current-sources',question:text(prior.prompt,2000),assessments,summary:single?text(run.result?.summary||run.result?.basis,1000):'',reasoning:single?text(run.result?.passage||run.result?.value,1600):'',alternatives:single?list(run.result?.options).slice(0,3).map(o=>({title:text(o.title,180),approach:text(o.approach,80),rationale:text(o.rationale,650),tradeoffs:list(o.tradeoffs).slice(0,4).map(x=>text(x,220)),sourceRefs:list(o.sourceRefs).slice(0,8)})):[],operations:single?list(run.result?.architectureOperations).slice(0,4).map(o=>({id:o.id,kind:o.kind,optionId:o.optionId,title:text(o.title,180),intent:text(o.intent,350),mechanism:text(o.mechanism,550),assumptions:list(o.assumptions).slice(0,4).map(x=>text(x,220)),sourceRefs:list(o.sourceRefs).slice(0,8)})):[],assumptions:single?list(run.result?.assumptions).slice(0,6).map(x=>text(x,220)):[],questions:single?list(run.result?.questions).slice(0,6).map(x=>text(x,220)):[],sourceReceipts:[]};
}
export function appendAdvisoryHistory(packet,run,{projectId,actorId,request=packet?.request,current=false,policy={}}={}){
 if(!run||run.status!=='completed'||!run.result||run.projectId!==projectId||!actorId||run.actor!==actorId)throw Error('That saved response does not belong to this authenticated project context.');
 if(request?.priorRunId!==run.id)throw Error('The follow-up does not match the selected saved response.');
 const prior=run.packet?.request||run.request||{},wanted=requestSubjectIds(request),held=new Set(requestSubjectIds(prior));
 if(!wanted.length||wanted.some(id=>!held.has(id)))throw Error('Choose a saved response about the same model object.');
 if((request.architectureTaskId||prior.architectureTaskId)&&request.architectureTaskId!==prior.architectureTaskId)throw Error('Choose a response from this architecture task.');
 if((request.field||prior.field)&&(request.field!==prior.field||request.command!==prior.command))throw Error('Choose a response for the same record field.');
 const excluded=new Set(policy.excludedObjectIds||[]);if(wanted.some(id=>excluded.has(id)))throw Error('This context is excluded from external AI processing.');
 const sourceExcluded=s=>{
  if(disclosureSourceExcluded(s,excluded))return true;
  const receiptExcluded=v=>v&&typeof v==='object'&&(disclosureSourceExcluded({receipt:v},excluded)||Object.values(v).some(receiptExcluded));
  return receiptExcluded(s.receipt);
 };
 // Hiding an ID does not hide a paraphrase derived from it. If any source in
 // the earlier packet is now excluded, none of its generated prose or question
 // is verified safe to carry forward. An inherited advisory chain is also
 // conservatively withheld when exclusions apply: its bounded receipts cannot
 // establish complete provenance for every paraphrase in the newer response.
 const withheldPrior=list(run.packet?.sources).some(sourceExcluded)||(excluded.size>0&&!!run.packet?.advisoryHistory);
 if(withheldPrior){
  const advisoryHistory={version:1,runId:run.id,createdAt:run.createdAt||null,mode:run.mode,basePacketStamp:packet.stamp,authority:'Prior model advice is not a current source, design fact, evidence or approval.',sourceStatus:'previous-content-omitted-under-current-disclosure-policy',contentOmitted:true,omissionReason:'The previous question and advice were omitted because their source provenance cannot be safely carried across the current exclusions. Answer only from the current question and eligible current packet.',question:'',assessments:[],summary:'',reasoning:'',alternatives:[],operations:[],assumptions:[],questions:[],sourceReceipts:[]};
  const {stamp,...base}=packet,next={...base,advisoryHistory:redactSecretsDeep(hideExcludedReferences(advisoryHistory,excluded))};
  return {...next,stamp:digest(next)};
 }
 const history={...boundedHistory(run,request,current),basePacketStamp:packet.stamp},cited=new Set(history.assessments.flatMap(a=>a.sourceRefs).concat(history.alternatives.flatMap(a=>a.sourceRefs),history.operations.flatMap(a=>a.sourceRefs),held.size<=1?list(run.result.sourceRefs):[]));
 history.sourceReceipts=list(run.packet?.sources).filter(s=>cited.has(s.ref)&&!disclosureSourceExcluded(s,excluded)).slice(0,10).map(s=>({priorRef:s.ref,id:s.id,kind:s.kind,objectId:s.objectId||null,title:text(s.title,180),posture:text(s.posture,240),versionStamp:text(s.versionStamp,160)||null,receipt:s.receipt?Object.fromEntries(['releaseId','claimId','sourceId','sourceHash','hash','locator','version','revision','status'].filter(k=>s.receipt[k]!=null).map(k=>[k,text(typeof s.receipt[k]==='string'?s.receipt[k]:JSON.stringify(s.receipt[k]),300)])):null}));
 // A previous S1 is not the current packet's S1. Historical refs deliberately
 // cannot satisfy the current response schema's source-reference enum.
 for(const x of [...history.assessments,...history.alternatives,...history.operations])x.sourceRefs=x.sourceRefs.map(r=>'prior:'+text(r,80));
 for(const r of history.sourceReceipts)r.priorRef='prior:'+text(r.priorRef,80);
 // No original excerpts and no recursive history. Trimming is explicit and the
 // current disclosure policy also applies to the old question and receipts.
 while(JSON.stringify(history).length>12000&&(history.sourceReceipts.length||history.operations.length||history.alternatives.length)){if(history.sourceReceipts.length)history.sourceReceipts.pop();else if(history.operations.length)history.operations.pop();else history.alternatives.pop();history.truncated=true;}
 while(JSON.stringify(history).length>12000&&history.assessments.length>1){history.assessments.pop();history.truncated=true;}
 for(const key of ['reasoning','summary','questions','assumptions'])if(JSON.stringify(history).length>12000){history[key]=Array.isArray(history[key])?[]:'';history.truncated=true;}
 if(JSON.stringify(history).length>12000){history.assessments=history.assessments.map(a=>({id:text(a.id,160),withheld:a.withheld,headline:text(a.headline,240),reasoning:a.withheld?'':text(a.reasoning,1200),sourceRefs:a.sourceRefs.slice(0,4).map(r=>text(r,80))}));history.truncated=true;}
 const mask=v=>typeof v==='string'?maskContactText(v):Array.isArray(v)?v.map(mask):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,mask(x)])):v;
 const clean=redactSecretsDeep(hideExcludedReferences(policy.redactContacts?mask(history):history,excluded));
 const {stamp,...base}=packet;const next={...base,advisoryHistory:clean};return {...next,stamp:digest(next)};
}
