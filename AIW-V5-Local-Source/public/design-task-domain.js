import {knowledgeReceipt,reviewGeneration} from './aiw-brain.js';
import {designTask,designTasks,withDesignTasks,designBasis,designBasisStamp,designBasisCurrent} from './design-task-state.js';
import {designHints,designAnswers,designMissing,DESIGN_APPROACHES,draftDesignSpec,cleanDesignSpec,previewDesignAlternative,operationAnswers,operationDefaults,validateOperationReferences} from './design-planner.js';
import {operationContext,operationGroupMembers} from './architecture-operations.js';
import {withModelAlternatives,modelAlternative,modelAlternatives} from './model-alternatives-state.js';

const text=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'',copy=v=>structuredClone(v);
const canonical=q=>q.changes.map(({command,source,before,after,fields})=>({command,source,before,after,fields}));
function archiveDrafts(p,t,at,note){for(const a of modelAlternatives(p).filter(a=>(a.taskId===t.id||a.design?.members?.some(m=>m.taskId===t.id))&&a.status==='draft')){a.status='archived';a.revision++;a.updatedAt=at;a.archived={at,reason:note};a.history.push({at,event:'Set aside',note});for(const m of a.design?.members||[]){const sibling=designTask(p,m.taskId);if(sibling&&sibling.id!==t.id){sibling.alternativeIds=sibling.alternativeIds.filter(id=>id!==a.id);if(sibling.status==='proposed')sibling.status='questions';sibling.revision++;sibling.updatedAt=at;}}}t.alternativeIds=[];}
// Called only after intelligence.adopt has loaded and validated its own saved
// run. Ordinary design commands cannot supply a generated operation or receipt.
export function startOperationTask(input,operation,generation,at=new Date().toISOString()){
 const p=withDesignTasks(copy(input)),existing=designTasks(p).find(t=>t.kind==='operation'&&t.generation?.runId===generation.runId&&t.operation.id===operation.id&&t.operation.optionId===operation.optionId);if(existing)return {document:input,selected:existing.id};
 if(designTasks(p).length>=60)throw Error('This project has reached its guided-task limit.');
 const contextIds=operation.affectedObjectIds.filter(id=>[...p.logical.responsibilities,...p.realisation.components,...p.technology.capabilities,...p.technologyRealisation.records].some(r=>r.id===id)),basis=designBasis(p,operation.requirementIds[0],undefined,undefined,undefined,contextIds);
 const t={id:'DES-'+String(++p.coauthoring.counters.design).padStart(3,'0'),kind:'operation',revision:1,title:operation.title,requirementId:operation.requirementIds[0],basis,initialBasis:copy(basis),operation:copy(operation),generation:copy(generation),answers:{},status:'questions',createdAt:at,updatedAt:at,alternativeIds:[],considerations:[],history:[{at,event:'Continued selected architecture operation',runId:generation.runId,operationId:operation.id,optionId:operation.optionId,note:operation.optionTitle,basis:copy(basis)}]};
 t.answers=operationDefaults(p,t);t.operationTargetContext=copy(operationContext(p,operation.kind,t.answers));p.coauthoring.designTasks.push(t);return {document:p,selected:t.id};
}
export function startOperationOption(input,operations,generation,at=new Date().toISOString()){
 if(!operations.length||operations.length>6||operations.some(o=>o.optionId!==operations[0].optionId))throw Error('Choose one complete saved architecture option.');
 if(operations.length===1)return startOperationTask(input,operations[0],{...generation,operationId:operations[0].id,optionId:operations[0].optionId,sourceRefs:copy(operations[0].sourceRefs)},at);
 let p=copy(input);const taskIds=[];
 for(const operation of operations){const r=startOperationTask(p,operation,{...generation,operationId:operation.id,optionId:operation.optionId,sourceRefs:copy(operation.sourceRefs)},at);p=r.document;taskIds.push(r.selected);}
 const group={runId:generation.runId,optionId:operations[0].optionId,operationIds:operations.map(o=>o.id),taskIds};
 for(const id of taskIds){const t=designTask(p,id);if(t.operationGroup&&JSON.stringify(t.operationGroup)!==JSON.stringify(group))throw Error('This operation belongs to a different coordinated option.');}
 if(taskIds.every(id=>designTask(p,id).operationGroup)){operationGroupMembers(p,designTask(p,taskIds[0]));return {document:input,selected:taskIds[0]};}
 if(taskIds.some(id=>['applied','dismissed'].includes(designTask(p,id).status)))throw Error('A related operation was already accepted or set aside separately. Continue its saved task or reassess the option.');
 for(const id of taskIds){const t=designTask(p,id);archiveDrafts(p,t,at,'Continue this complete option as a coordinated design.');t.operationGroup=copy(group);t.operationDependencies=[];t.status='questions';t.revision++;t.updatedAt=at;t.history.push({at,event:'Joined coordinated architecture option',runId:group.runId,optionId:group.optionId,operationIds:copy(group.operationIds),taskIds:copy(taskIds)});}
 return {document:p,selected:taskIds[0]};
}
function prepareOperationOption(p,t,at){
 const members=operationGroupMembers(p,t);
 if(members.some(m=>['applied','dismissed'].includes(m.status)))throw Error('Every operation in this option must remain available for a single coordinated review.');
 const active=modelAlternatives(p).find(a=>a.status==='draft'&&a.design?.family==='operation-group'&&a.design.group.runId===t.operationGroup.runId&&a.design.group.optionId===t.operationGroup.optionId);
 if(active){previewDesignAlternative(p,active,at);return active;}
 if(p.modelAlternatives.records.length>=60)throw Error('This project has reached its saved-alternative limit.');
 const a={id:'ALT-'+String(++p.modelAlternatives.counter).padStart(3,'0'),kind:'design',taskId:members[0].id,status:'draft',revision:1,name:t.operation.optionId+' · '+t.operation.optionTitle,rationale:members.map(m=>m.operation.id+': '+m.answers.rationale).join('\n'),createdAt:at,updatedAt:at,design:{family:'operation-group',approach:'coordinated-option',group:copy(t.operationGroup),members:members.map(m=>({taskId:m.id,operationId:m.operation.id,answers:copy(m.answers),dependencies:copy(m.operationDependencies||[]),basis:copy(m.sourceReview?.basis||m.basis),contextStamp:designBasisStamp(operationContext(p,m.operation.kind,m.answers,m))}))},designBasis:copy(members[0].sourceReview?.basis||members[0].basis),changes:[],history:[]};
 const q=previewDesignAlternative(p,a,at);if(!q.hasChanges)throw Error('This coordinated option makes no definition changes.');a.changes=canonical(q);a.history.push({at,event:'Prepared coordinated architecture option',runId:t.generation.runId,optionId:t.operation.optionId,taskIds:members.map(m=>m.id),note:a.rationale,changes:copy(a.changes)});p.modelAlternatives.records.push(a);
 for(const m of members){m.alternativeIds=[a.id];m.status='proposed';m.history.push({at,event:'Prepared coordinated '+a.id,note:'Review every related operation together.'});if(m.id!==t.id){m.revision++;m.updatedAt=at;}}
 return a;
}
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
  if(t.kind==='operation'){t.history.at(-1).targetBefore=copy(t.operationTargetContext);t.operationTargetContext=copy(operationContext(p,t.operation.kind,t.operationTargetSelection||t.answers,t));}
  if(t.status!=='applied'){archiveDrafts(p,t,at,'Source basis reviewed; regenerate proposals against the current requirement.');t.basis=basis;t.status='questions';}
 }else{
  if(['applied','dismissed'].includes(t.status))throw Error('This task is retained as '+t.status+'. Start another task for further design work.');
  if(!designBasisCurrent(p,t))throw Error('Review the changed requirement, drivers or decisions before continuing.');
  if(t.kind==='operation'){
   if(command.type==='design.answers'){
    const next=operationAnswers(t.operation.kind,{...t.answers,...raw.answers});
    validateOperationReferences(p,t.operation.kind,next,t);
    const dependencies=raw.dependencies===undefined?t.operationDependencies||[]:raw.dependencies;
    if(!Array.isArray(dependencies)||dependencies.length>5||dependencies.some(id=>typeof id!=='string'||id===t.id||!operationGroupMembers(p,t).some(m=>m.id===id)))throw Error('Choose only other operations in this saved option as prerequisites.');
    if(raw.contextStamp!==designBasisStamp(operationContext(p,t.operation.kind,next,t)))throw Error('The selected record or references changed while you edited. Reopen the draft and review current values; your input is retained.');
    if(JSON.stringify(next)!==JSON.stringify(t.answers)||JSON.stringify(dependencies)!==JSON.stringify(t.operationDependencies||[])){t.history.push({at,event:'Saved native operation draft',before:copy(t.answers),answers:copy(next),dependencies:copy(dependencies)});archiveDrafts(p,t,at,'The editable operation changed; its previous proposal is retained.');t.answers=next;if(t.operationGroup)t.operationDependencies=[...new Set(dependencies)];t.operationTargetContext=copy(operationContext(p,t.operation.kind,next,t));t.status='questions';}
   }else if(command.type==='design.prepare'){
    withModelAlternatives(p);
    if(t.operationGroup){prepareOperationOption(p,t,at);t.revision++;t.updatedAt=at;return {document:p,selected:t.id};}
    if(!t.alternativeIds.some(id=>modelAlternative(p,id)?.status==='draft')){if(p.modelAlternatives.records.length>=60)throw Error('This project has reached its saved-alternative limit.');const a={id:'ALT-'+String(++p.modelAlternatives.counter).padStart(3,'0'),kind:'design',taskId:t.id,status:'draft',revision:1,name:t.id+' · '+t.operation.optionId+' · '+t.answers.title,rationale:t.answers.rationale,createdAt:at,updatedAt:at,design:{family:'operation',approach:t.operation.kind,answers:copy(t.answers),contextStamp:designBasisStamp(operationContext(p,t.operation.kind,t.answers))},designBasis:copy(t.sourceReview?.basis||t.basis),designAnswers:copy(t.answers),changes:[],history:[]},q=previewDesignAlternative(p,a,at);if(!q.hasChanges)throw Error('This draft makes no definition changes. Edit the proposed fields before continuing.');a.changes=canonical(q);a.history.push({at,event:'Prepared selected architecture operation',runId:t.generation.runId,operationId:t.operation.id,optionId:t.operation.optionId,note:a.rationale,changes:copy(a.changes)});p.modelAlternatives.records.push(a);t.alternativeIds=[a.id];t.history.push({at,event:'Prepared '+a.id,note:a.rationale});}t.status='proposed';
   }else if(command.type==='design.dismiss'){archiveDrafts(p,t,at,text(raw.reason)||'Operation set aside.');t.status='dismissed';t.history.push({at,event:'Set aside operation',note:text(raw.reason)});}
   else throw Error('Use the native operation draft before preparing its review.');
  }else if(command.type==='design.answers'){
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
