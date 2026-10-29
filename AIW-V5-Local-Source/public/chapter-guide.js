import {creationState,creationDefaults,validateCreationAnswer,compileCreation} from './guided-creation.js';
import {applyEvidenceCommand} from './evidence-domain.js';
import {digest} from './brain-integrity.js';
import {applyCommand} from './requirements-domain.js';
import {applyQualityCommand,isQualityDriver,driverKind,driverKindOf} from './quality-domain.js';
import {applyDecisionCommand} from './decisions-domain.js';
import {applyLogicalCommand} from './logical-domain.js';
import {applyRealisationCommand} from './realisation-domain.js';
import {applyTechnologyCommand} from './technology-domain.js';
import {applyTechnologyRealisationCommand} from './technology-realisation-domain.js';
import {applyInterfacesCommand} from './interfaces-domain.js';
import {applySecurityCommand} from './security-domain.js';
import {applyRuntimeCommand} from './runtime-domain.js';
import {applyFinalReviewCommand,chapterSummaries} from './review-domain.js';
import {journeyIndex,journeyTargets,journeyChapters,journeyObjectURL} from './journey-context.js';
import {sourceAssurance} from './assurance-domain.js';
import {guideBasis} from './guidance-record.js';
import {CHAPTER_METHODS} from './chapter-methods.js';
import {refExists} from './field-suggestions.js';

// Where a record came from when the journey drafted it (round 4, Contract 3; shared/journey-drafter.js): the mode
// (the deterministic rules, Sol and its run, or a model and its source), the passages and the upstream records its
// values rest on, and the governed claims and Playbook passages cited beside it. Optional on guide.commit-draft; checked
// here, never trusted: only these keys, bounded lists of identifiers, upstream records the project holds, a run id for
// Sol, and for a model draft (round 6, Contract I) the id of an evidence source of kind 'model' this project keeps,
// whose passages the ids name. It is written to each created record as provenance.journey and to the guide session's
// history; it confirms nothing.
export const JOURNEY_PROVENANCE_LIMITS={passages:40,upstream:40,claimIds:20,playbook:20,runId:64};
const PROVENANCE_KEYS=['mode','passages','upstream','claimIds','playbook','runId','sourceId'];
const PROVENANCE_MODES=['deterministic','sol','model'];
export function journeyProvenance(p,raw){
 if(raw===undefined||raw===null)return null;
 if(typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!PROVENANCE_KEYS.includes(k)))throw Error('Journey provenance names its mode, passages, upstream records, claims, Playbook passages and source only.');
 if(!PROVENANCE_MODES.includes(raw.mode))throw Error('Journey provenance names its mode: deterministic, sol or model.');
 const ids=(key,label,pattern)=>{const v=raw[key]??[],max=JOURNEY_PROVENANCE_LIMITS[key];if(!Array.isArray(v)||v.length>max||v.some(x=>typeof x!=='string'||!pattern.test(x)))throw Error('Journey provenance lists at most '+max+' '+label+'.');return [...new Set(v)];};
 const passages=ids('passages','passage ids',/^P-\d{1,5}$/),upstream=ids('upstream','upstream record ids',/^[\w:.-]{1,120}$/),claimIds=ids('claimIds','claim ids',/^[\w:.-]{1,160}$/),playbook=ids('playbook','Playbook passage ids',/^[\w:.-]{1,160}$/);
 const missing=upstream.find(id=>!refExists(p,id));if(missing)throw Error('Journey provenance names '+missing.slice(0,60)+', which this project does not hold.');
 if(raw.runId!==undefined&&(typeof raw.runId!=='string'||!/^[\w-]{1,64}$/.test(raw.runId)))throw Error('Journey provenance names its Sol run by an id of at most 64 characters.');
 if(raw.mode==='sol'&&!raw.runId)throw Error('A Sol journey draft names the run it came from.');
 if(raw.sourceId!==undefined&&raw.mode!=='model')throw Error('Only a model journey draft names the source it was read from.');
 if(raw.mode==='model'){const source=typeof raw.sourceId==='string'&&/^SRC-\d{1,5}$/.test(raw.sourceId)?(p?.coauthoring?.sources||[]).find(s=>s?.id===raw.sourceId):null;if(!source||source.kind!=='model')throw Error('A model journey draft names the model source this project keeps.');}
 return {mode:raw.mode,passages,upstream,claimIds,playbook,...(raw.runId?{runId:raw.runId}:{}),...(raw.mode==='model'?{sourceId:raw.sourceId}:{})};
}
// Writes the checked provenance to the records the commit created (and, for Chapter 11, to the narrative the commit
// fills). A commit's `created` also names records it only updated — Chapter 6 adds technology needs to the application
// component it supports — so a record that existed before the commit (`before`, the document it was applied to) is
// left as it is, and a provenance.journey a record already carries is never written over: it says which chapter drafted
// the record. The journey drafter, the guide and the reference journeys all mark through this one function.
const createdIn=p=>[p.artefacts,p.quality?.drivers,p.decisions?.records,(p.decisions?.records||[]).flatMap(d=>d.alternatives||[]),p.logical?.responsibilities,p.realisation?.components,p.technology?.needs,p.technology?.capabilities,p.technology?.boundaries,p.technologyRealisation?.records,p.interfaces?.contracts,p.interfaces?.data,p.interfaces?.parties,p.security?.threats,p.security?.controls,p.runtime?.environments,p.runtime?.zones,p.runtime?.plans,p.runtime?.placements];
export function withJourneyProvenance(p,chapter,created,provenance,at,{before=null}={}){
 if(!provenance)return p;
 const existed=before?new Set(createdIn(before).flatMap(xs=>(xs||[]).map(r=>r?.id).filter(Boolean))):new Set();
 const entry={...provenance,chapter:Number(chapter),...(at?{at}:{})},ids=new Set((created||[]).filter(id=>!existed.has(id))),mark=r=>{if(r.provenance?.journey)return;r.provenance={...(r.provenance&&typeof r.provenance==='object'&&!Array.isArray(r.provenance)?r.provenance:{}),journey:structuredClone(entry)};};
 for(const xs of createdIn(p))for(const r of xs||[])if(r&&ids.has(r.id))mark(r);
 if(Number(chapter)===11&&p.finalReview?.narrative)mark(p.finalReview.narrative);
 return p;
}

const lists={2:p=>p.quality.drivers,3:p=>p.decisions.records,4:p=>p.logical.responsibilities,5:p=>p.realisation.components,6:p=>p.technology.capabilities,7:p=>p.technologyRealisation.records,8:p=>[...p.interfaces.contracts,...p.interfaces.data],9:p=>[...p.security.controls,...p.security.threats],10:p=>p.runtime.plans};
const commands={2:'quality.driver',3:'decision.save',4:'logical.responsibility',5:'realisation.component',6:'technology.capability',7:'techrealisation.plan',10:'runtime.plan'};
const handlers={1:applyCommand,2:applyQualityCommand,3:applyDecisionCommand,4:applyLogicalCommand,5:applyRealisationCommand,6:applyTechnologyCommand,7:applyTechnologyRealisationCommand,8:applyInterfacesCommand,9:applySecurityCommand,10:applyRuntimeCommand,11:applyFinalReviewCommand};
export function chapterGuide(p,chapter,objectId){
 const method=CHAPTER_METHODS[chapter];if(!method)throw Error('Choose an architecture chapter.');
 const node=objectId?journeyIndex(p).nodes.get(objectId):null,record=node?.chapter===chapter?node.record:null,session=p.guidance?.sessions?.find(s=>s.chapter===chapter&&s.objectId===(objectId||'project')),basis=guideBasis(p,chapter,objectId);
 const creation=session?.creation?creationState(p,chapter,session.creation):null;let question=null;
 if(chapter===1){const q=method.questions.find(([key])=>!p.brief[key]?.trim());if(q)question={key:'brief.'+q[0],text:q[1],field:q[0],command:'brief',record:p.brief};}
 else if(record&&commands[chapter]){const fields=chapter===2&&!isQualityDriver(record)?[['description','What '+driverKindOf(driverKind(record)).name.toLowerCase()+' need must the design address?'],['impact','How does this driver change the architecture or constrain its choices?']]:method.fields;const q=fields.find(([field])=>!record[field]?.trim?.());if(q)question={key:record.id+'.'+q[0],text:q[1],field:q[0],command:commands[chapter],record};}
 const summary=chapterSummaries(p).find(c=>c.id===chapter),requirements=p.artefacts.filter(a=>a.type==='requirement'),source=sourceAssurance(p.artefacts);
 const openLoops=(p.guidance?.loops||[]).filter(l=>l.chapter<=chapter&&(l.status!=='Met'||l.basis!==guideBasis(p,l.chapter,l.objectId==='project'?null:l.objectId)));
 return {creation,chapter,title:journeyChapters[chapter],aim:chapter===2&&record&&!isQualityDriver(record)?'Describe the driver and its impact on design choices.':method.aim,next:question?.text||method.action,question,basis,session,sessionCurrent:session?.basis===basis,readiness:{content:summary?{done:summary.done,total:summary.total}:null,findings:summary?(summary.errors+summary.warnings):0,confirmedRequirements:requirements.filter(r=>r.confirmed).length,totalRequirements:requirements.length,sourceEvidenceMissing:source.counts.missingEvidence},openLoops,route:'/?chapter='+chapter+'&tab='+method.route,limits:'The current design and source assertions guide this chapter. AIW does not infer stakeholder agreement, measured performance or independent approval.'};
}
export function guidePreview(p,raw){const chapter=Number(raw.chapter),guide=chapterGuide(p,chapter,raw.objectId),answer=String(raw.answer||'').trim();if(!guide.question)throw Error('There is no unanswered field in this context. Use the chapter tools to refine the design.');if(!answer||answer.length>2000)throw Error('Answer this question in 1–2,000 characters.');if(raw.basis!==guide.basis)throw Error('The source context changed. Review the current question.');const q=guide.question,command={type:q.command,payload:{...q.record,[q.field]:answer,...(chapter===1?{confirmed:false}:{confirmed:false})}};if(chapter===5)command.payload.allocations=p.logical.mappings.filter(m=>m.physicalId===q.record.id).map(m=>({logicalId:m.logicalId,scope:m.scope}));if(chapter===6)command.payload.mappings=p.technology.mappings.filter(m=>m.capabilityId===q.record.id).map(m=>({needId:m.needId,scope:m.scope}));if(chapter===7)command.payload.mappings=p.technologyRealisation.mappings.filter(m=>m.realizationId===q.record.id).map(m=>({capabilityId:m.capabilityId,scope:m.scope}));const result=handlers[chapter](p,command);return {command,document:result.document,field:q.field,before:q.record[q.field]||'',after:answer,basis:guide.basis,stamp:digest([guide.basis,command])};}
export function applyGuideCommand(input,command,at,actor){
 const raw=command.payload||{},chapter=Number(raw.chapter);if(!CHAPTER_METHODS[chapter])throw Error('Choose a chapter.');let p=structuredClone(input);p.guidance??={version:1,sessions:[],loops:[]};const g=p.guidance;
 if(command.type==='guide.start'){
  let session=g.sessions.find(s=>s.chapter===chapter&&s.objectId===(raw.objectId||'project'));if(!session){session={id:crypto.randomUUID(),chapter,objectId:raw.objectId||'project',answers:[],history:[]};g.sessions.push(session);}if(session.creation)throw Error('Resume or discard the existing draft first.');session.creation={answers:creationDefaults(p,chapter,raw.objectId),at,actor};session.basis=guideBasis(p,chapter,raw.objectId);session.history.push({at,actor,event:'Started a guided chapter draft'});
 }else if(command.type==='guide.draft-answer'){
  const session=g.sessions.find(s=>s.chapter===chapter&&s.objectId===(raw.objectId||'project'));if(!session?.creation)throw Error('Start a chapter draft first.');if(session.basis!==guideBasis(p,chapter,raw.objectId)||raw.basis!==session.basis)throw Error('The source context changed. Review it before resuming this draft.');const state=creationState(p,chapter,session.creation),field=raw.field||state.question?.key;if(!field)throw Error('Review the completed draft.');const answer=validateCreationAnswer(p,chapter,session.creation.answers,field,raw.answer);session.creation.answers[field]=answer;session.history.push({at,actor,event:'Answered '+field,answer});
 }else if(command.type==='guide.revise-answer'){
  const session=g.sessions.find(s=>s.chapter===chapter&&s.objectId===(raw.objectId||'project'));if(!session?.creation||!Object.hasOwn(session.creation.answers,raw.field))throw Error('Choose a saved answer to revise.');session.history.push({at,actor,event:'Reopened '+raw.field,previousAnswer:session.creation.answers[raw.field]});delete session.creation.answers[raw.field];
 }else if(command.type==='guide.refresh-draft'){
  const session=g.sessions.find(s=>s.chapter===chapter&&s.objectId===(raw.objectId||'project'));if(!session?.creation||raw.reviewed!==true)throw Error('Review the changed source context before resuming.');session.history.push({at,actor,event:'Reviewed current sources for retained draft',previousBasis:session.basis});session.basis=guideBasis(p,chapter,raw.objectId);
 }else if(command.type==='guide.discard-draft'){
  const session=g.sessions.find(s=>s.chapter===chapter&&s.objectId===(raw.objectId||'project'));if(!session?.creation)throw Error('Choose a saved draft.');session.history.push({at,actor,event:'Set aside chapter draft',answers:session.creation.answers});delete session.creation;
 }else if(command.type==='guide.commit-draft'){
  const session=g.sessions.find(s=>s.chapter===chapter&&s.objectId===(raw.objectId||'project'));if(!session?.creation||session.basis!==guideBasis(p,chapter,raw.objectId))throw Error('Review the current source context and draft first.');const preview=compileCreation(p,chapter,session.creation.answers);if(raw.reviewed!==true||raw.stamp!==preview.stamp)throw Error('Review the proposed objects and relationships before applying.');const provenance=journeyProvenance(p,raw.provenance);const result=compileCreation(p,chapter,session.creation.answers,at);p=withJourneyProvenance(result.document,chapter,result.created,provenance,at,{before:p});const saved=p.guidance.sessions.find(s=>s.id===session.id);saved.history.push({at,actor,event:'Applied reviewed chapter draft',commands:result.commands,created:result.created,basis:session.basis,answers:session.creation.answers,...(provenance?{provenance}:{})});saved.lastCreated=result.created;delete saved.creation;
 }else if(command.type==='guide.answer'){
  const preview=guidePreview(p,raw);let session=g.sessions.find(s=>s.chapter===chapter&&s.objectId===(raw.objectId||'project'));if(!session){session={id:crypto.randomUUID(),chapter,objectId:raw.objectId||'project',answers:[],history:[]};g.sessions.push(session);}session.basis=preview.basis;session.pending={answer:String(raw.answer).trim(),field:preview.field,stamp:preview.stamp,before:preview.before,after:preview.after};session.history.push({at,actor,event:'Saved answer for review'});
 }else if(command.type==='guide.accept'){
  const session=g.sessions.find(s=>s.chapter===chapter&&s.objectId===(raw.objectId||'project'));if(!session?.pending)throw Error('Save an answer before reviewing it.');const preview=guidePreview(p,{...raw,answer:session.pending.answer,basis:session.basis});if(raw.stamp!==preview.stamp||raw.reviewed!==true)throw Error('Review this answer and its effect before applying.');p=handlers[chapter](p,preview.command,at,actor).document;const saved=p.guidance.sessions.find(s=>s.id===session.id);saved.answers.push({...session.pending,at,actor});saved.history.push({at,actor,event:'Accepted answer into chapter'});delete saved.pending;if(chapter===1&&preview.field==='source'){const source=applyEvidenceCommand(p,{type:'evidence.source',payload:{title:'Project brief — '+p.name,location:preview.after,excerpt:'Problem: '+p.brief.problem+'\nExpected outcome: '+p.brief.goal,version:'Architect brief',status:'Unconfirmed'}},at);p=source.document;} 
 }else if(command.type==='guide.loop'){
  if(!['Met','Partial','Refused'].includes(raw.status)||!String(raw.question||'').trim()||!String(raw.reason||'').trim())throw Error('Record the question, outcome and reason.');
  const old=raw.id?g.loops.find(l=>l.id===raw.id):null;if(raw.id&&!old)throw Error('This question is no longer available.');const loop={id:old?.id||crypto.randomUUID(),chapter,objectId:raw.objectId||'project',question:String(raw.question).slice(0,1500),status:raw.status,reason:String(raw.reason).slice(0,2000),owner:String(raw.owner||'').slice(0,180),basis:guideBasis(p,chapter,raw.objectId),at,actor,history:old?[...(old.history||[]),(({history,...v})=>v)(old)]:[]};if(old)g.loops[g.loops.indexOf(old)]=loop;else g.loops.push(loop);
 }else throw Error('Unknown chapter guidance action.');
 p.guidance.version++;return {document:p};
}
export function designThread(p,id){
 const index=journeyIndex(p),node=index.nodes.get(id);if(!node)return [];
 return Array.from({length:11},(_,i)=>i+1).map(chapter=>({chapter,title:journeyChapters[chapter],objects:journeyTargets(index,id,chapter).map(x=>({id:x.node.id,title:x.node.title,url:journeyObjectURL(x.node),path:x.path})),comparisons:(p.coauthoring?.designTasks||[]).filter(t=>t.kind==='architecture'&&(t.requirementId===id||t.applied?.records?.some(r=>r.id===id))).filter(t=>chapter===3).map(t=>({id:t.id,title:t.title,topic:t.topic,status:t.status}))}));
}
