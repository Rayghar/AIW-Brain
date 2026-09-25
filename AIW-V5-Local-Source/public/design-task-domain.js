import {knowledgeReceipt,reviewGeneration} from './aiw-brain.js';
import {designTask,designTasks,withDesignTasks,designBasis,designBasisStamp,designBasisCurrent} from './design-task-state.js';
import {designHints,designAnswers,designMissing,DESIGN_APPROACHES,draftDesignSpec,cleanDesignSpec,previewDesignAlternative} from './design-planner.js';
import {withModelAlternatives,modelAlternative,modelAlternatives} from './model-alternatives-state.js';

const text=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'',copy=v=>structuredClone(v);
const canonical=q=>q.changes.map(({command,source,before,after,fields})=>({command,source,before,after,fields}));
function archiveDrafts(p,t,at,note){for(const a of modelAlternatives(p).filter(a=>a.taskId===t.id&&a.status==='draft')){a.status='archived';a.revision++;a.updatedAt=at;a.archived={at,reason:note};a.history.push({at,event:'Set aside',note});}t.alternativeIds=[];}
export function applyDesignCommand(input,command,at=new Date().toISOString()){
 const p=withDesignTasks(copy(input)),raw=command.payload||{};let t;
 if(command.type==='design.start'){
  if(designTasks(p).length>=60)throw Error('This project has reached its guided-task limit.');
  const basis=designBasis(p,raw.requirementId);
  t={id:'DES-'+String(++p.coauthoring.counters.design).padStart(3,'0'),revision:1,title:basis.requirement.title,requirementId:basis.requirement.id,basis,initialBasis:copy(basis),knowledge:['STYLE-LAYERED','STYLE-MICROSERVICES'].map(knowledgeReceipt),answers:designAnswers({}),status:'questions',createdAt:at,updatedAt:at,alternativeIds:[],considerations:[],history:[{at,event:'Started from saved requirement',basis:copy(basis)}]};
  const hints=designHints(p,t);for(const h of hints)t.answers[h.field]=h.value;t.inherited=hints.map(h=>({field:h.field,ref:h.ref,title:h.title}));
  const records=[...p.logical.responsibilities,...p.realisation.components,...p.technology.capabilities,...p.technologyRealisation.records];const contextIds=[...new Set(hints.map(h=>records.find(r=>(r.ref||r.id)===h.ref)?.id).filter(Boolean))];if(contextIds.length){t.basis=designBasis(p,t.requirementId,undefined,undefined,undefined,contextIds);t.initialBasis=copy(t.basis);t.history[0].basis=copy(t.basis);t.history[0].inherited=copy(t.inherited);}
  p.coauthoring.designTasks.push(t);return {document:p,selected:t.id};
 }
 t=designTask(p,raw.id);if(!t)throw Error('Choose a saved design task.');if(['exchange','security','architecture'].includes(t.kind)&&!['design.source-review','design.dismiss'].includes(command.type))throw Error('Use the chapter task actions for this design.');
 if(t.revision!==raw.taskRevision)throw Error('This task changed. Reopen it before saving your preserved answers.');
 if(command.type==='design.source-review'){
  const basis=designBasis(p,t.requirementId,t.basis.contractId,t.basis.payloadId,(t.sourceReview?.basis||t.basis).securityIds,(t.sourceReview?.basis||t.basis).contextIds);
  if(raw.basisStamp!==designBasisStamp(basis))throw Error('The source changed again. Review its current definition.');
  if(raw.reviewed!==true||!text(raw.reviewer)||!text(raw.reason))throw Error('Record the reviewer, the source-review conclusion and explicit confirmation.');
  t.history.push({at,event:'Reviewed changed sources',note:text(raw.reason),reviewer:text(raw.reviewer,180),before:copy(t.sourceReview?.basis||t.basis),after:copy(basis)});
  t.sourceReview={at,basis,reviewer:text(raw.reviewer,180),reason:text(raw.reason)};
  if(t.generation){t.history.at(-1).generation=copy(t.generation);reviewGeneration(p,t.generation);}
  if(t.status!=='applied'){archiveDrafts(p,t,at,'Source basis reviewed; regenerate proposals against the current requirement.');t.basis=basis;t.status='questions';}
 }else{
  if(['applied','dismissed'].includes(t.status))throw Error('This task is retained as '+t.status+'. Start another task for further design work.');
  if(!designBasisCurrent(p,t))throw Error('Review the changed requirement, drivers or decisions before continuing.');
  if(command.type==='design.answers'){
   const next=designAnswers({...t.answers,...raw.answers});
   if(JSON.stringify(next)!==JSON.stringify(t.answers)){
    t.history.push({at,event:'Saved design answers',before:copy(t.answers),answers:copy(next)});
    archiveDrafts(p,t,at,'Architect answers changed; earlier proposals retained for reference.');t.answers=next;t.status=designMissing(p,t).length?'questions':'ready';
   }
  }else if(command.type==='design.prepare'){
   if(designMissing(p,t).length)throw Error('Answer the remaining design questions before comparing approaches.');
   if(t.answers.boundaryId&&!p.technology.boundaries.some(b=>b.id===t.answers.boundaryId))throw Error('Choose a current trust boundary.');
   withModelAlternatives(p);
   if(!t.alternativeIds.some(id=>modelAlternative(p,id)?.status==='draft')){
    if(p.modelAlternatives.records.length>58)throw Error('This project has reached its saved-alternative limit.');
    t.alternativeIds=DESIGN_APPROACHES.map(approach=>{
     const a={id:'ALT-'+String(++p.modelAlternatives.counter).padStart(3,'0'),kind:'design',taskId:t.id,revision:1,createdAt:at,updatedAt:at,status:'draft',name:t.id+' · '+approach.title,rationale:'Unselected approach. '+approach.prerequisites,knowledge:[knowledgeReceipt(approach.id==='cohesive'?'STYLE-LAYERED':'STYLE-MICROSERVICES')],design:draftDesignSpec(p,t,approach.id),designBasis:copy(t.basis),designAnswers:copy(t.answers),changes:[],history:[]};
     // Definitions may still need editing (for example, a reused name). They are
     // retained as proposals and must pass a fresh preview before acceptance.
     try{a.changes=canonical(previewDesignAlternative(p,a,at));}catch(e){a.preparationNote=e.message;}
     a.history.push({at,event:'Prepared editable approach',note:a.rationale,design:copy(a.design)});p.modelAlternatives.records.push(a);return a.id;
    });
    t.history.push({at,event:'Prepared two boundary approaches',alternativeIds:[...t.alternativeIds]});
   }
   t.status='proposed';
  }else if(command.type==='design.update'){
   const a=modelAlternative(p,raw.alternativeId);
   if(!a||a.taskId!==t.id||a.status!=='draft'||a.revision!==raw.alternativeRevision)throw Error('This alternative changed. Reopen it before editing.');
   const rationale=text(raw.rationale);if(!rationale)throw Error('Record why this approach fits and the trade-off you accept.');
   const design=cleanDesignSpec(raw.design);if(design.approach!==a.design.approach)throw Error('Edit the selected approach or open the other alternative.');
   a.knowledge||=[knowledgeReceipt(design.approach==='cohesive'?'STYLE-LAYERED':'STYLE-MICROSERVICES')];t.knowledge||=['STYLE-LAYERED','STYLE-MICROSERVICES'].map(knowledgeReceipt);a.design=design;a.rationale=rationale;a.revision++;a.updatedAt=at;
   const q=previewDesignAlternative(p,a,at);a.changes=canonical(q);delete a.preparationNote;
   a.history.push({at,event:'Edited design proposal',note:rationale,design:copy(design),revision:a.revision,changes:copy(a.changes)});
   t.considerations.push({at,approach:design.approach,outcome:'Developed for review',reason:rationale,alternativeId:a.id});
   t.history.push({at,event:'Developed '+a.id,note:rationale});
  }else if(command.type==='design.dismiss'){
   if(!text(raw.reason))throw Error('Record why this task is being set aside.');
   archiveDrafts(p,t,at,text(raw.reason));t.status='dismissed';t.history.push({at,event:'Set aside',note:text(raw.reason)});
  }else throw Error('Choose a supported guided-design action.');
 }
 t.revision++;t.updatedAt=at;return {document:p,selected:t.id};
}
