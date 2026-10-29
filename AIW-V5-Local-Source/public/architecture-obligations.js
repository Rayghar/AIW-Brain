// Applied solution recipes already live in guided-task history. Specifications
// and product comparisons read those same records; no second solution register.
import {digest} from './brain-integrity.js';
import {architectureActionStamp,architectureObligationBasis,acceptedObligation as accepted,obligationContent as semantic} from './architecture-obligation-basis.js';
export {deliveryActionDefinition,architectureActionStamp,architectureObligationBasis} from './architecture-obligation-basis.js';
import {verificationForAction,verificationEvidence} from './architecture-verification.js';
const list = value => Array.isArray(value) ? value : [];
const unique=values=>[...new Set(values.filter(Boolean))];
const same=(a,b)=>['projectId','taskId','solutionId','obligationId'].every(key=>a?.[key]===b?.[key]);
export const OBLIGATION_STATES=Object.freeze({'open':'Open obligation','evidence-awaiting':'Evidence awaiting review','current-verified':'Current verification recorded','review-required':'Evidence needs review'});

// Product criteria read the adopted duty, as before. Evidence changes its
// current fulfilment, never the criterion or an existing product selection.
export function architectureObligationDefinition(o){const {reference,verificationState,verificationBasis,verificationActions,evidenceRefs,evidenceSourceIds,verificationReasons,...definition}=o;return {...definition,verification:'pending'};}
export function architectureObligationReference(p,o){return {projectId:p.id,taskId:o.taskId,solutionId:o.solutionId,obligationId:o.id};}
export function architectureEvidenceSources(p,receipts=[]){
 if(!Array.isArray(receipts)||receipts.length>20)throw Error('Choose up to twenty exact verification evidence sources.');
 const out=[];
 for(const ref of receipts){
  if(!ref||typeof ref.sourceId!=='string'||!Number.isInteger(ref.revision)||out.some(r=>r.sourceId===ref.sourceId))throw Error('Name each exact verification evidence source once.');
  const source=list(p.coauthoring?.sources).find(s=>s.id===ref.sourceId),version=source?.versions?.at(-1);
  if(!version||version.revision!==ref.revision||version.status!=='Confirmed')throw Error('Choose the current confirmed revision of each verification evidence source.');
  const stamp=digest(semantic(version));if(ref.stamp&&ref.stamp!==stamp)throw Error('The verification evidence source changed. Review its current revision.');
  out.push({sourceId:source.id,revision:version.revision,stamp,title:version.title,location:version.location||'',hash:version.hash||null});
 }
 return out;
}
export function architectureObligationActionState(p,a){
 const ref=a?.architectureObligation,basis=architectureObligationBasis(p,ref),reasons=[...basis.reasons],v=a?.verification,comparison=verificationForAction(p,a);
 const current=basis.ready&&ref?.basisStamp===basis.stamp;
 if(!current&&!reasons.length)reasons.push('The obligation’s linked source, driver, boundary, conditions or selected configuration changed.');
 let evidenceCurrent=true;
 if(v?.architectureObligation){
  if(!same(v.architectureObligation,ref)||v.architectureObligation.basisStamp!==basis.stamp||v.actionStamp!==architectureActionStamp(a))evidenceCurrent=false;
  try{architectureEvidenceSources(p,v.evidenceSources);}catch{evidenceCurrent=false;}
  if(comparison&&(comparison.state!=='pass'||digest(v.verificationEvidence)!==digest(verificationEvidence(p,a))))evidenceCurrent=false;
  if(p.finalReview?.imported&&!(v.actor&&!v.importedActor&&v.at>p.finalReview.imported.at))evidenceCurrent=false;
 }else if(a?.status==='Verified')evidenceCurrent=false;
 if(!evidenceCurrent)reasons.push('The captured verification no longer identifies this current obligation, action and evidence.');
 const targetIds=accepted(p,ref)?.obligation.targetIds||[],defined=['title','owner','due','acceptance'].every(key=>typeof a?.[key]==='string'&&a[key].trim())&&targetIds.length>0&&targetIds.every(id=>list(a?.objectIds).includes(id));
 const verified=current&&defined&&evidenceCurrent&&a?.status==='Verified'&&v?.reviewed===true&&!!v?.reviewer&&!!v?.reference&&!!v?.architectureObligation;
 if(a?.status==='Verified'&&!defined){evidenceCurrent=false;reasons.push('The verification action no longer defines every required target, owner, date and acceptance criterion.');}
 if(comparison&&comparison.state!=='pass')reasons.push(comparison.label+': '+comparison.reasons.join(' '));
 return {id:a?.id,state:!current||!evidenceCurrent?'review-required':verified?'current-verified':'evidence-awaiting',current,verified,reasons,verification:v||null,history:list(a?.history),basis,...(comparison?{comparison}:{})};
}
export function architectureObligationReading(p,ref){
 const found=accepted(p,ref);if(!found)return null;
 const basis=architectureObligationBasis(p,ref),actions=list(p.finalReview?.actions).filter(a=>same(a.architectureObligation,ref)),states=actions.map(a=>architectureObligationActionState(p,a));
 const state=states.some(a=>a.verified)&&states.filter(a=>a.comparison).every(a=>a.verified)?'current-verified':!basis.ready||states.some(a=>a.state==='review-required')?'review-required':states.length?'evidence-awaiting':'open';
 return {state,label:OBLIGATION_STATES[state],actions:states,evidenceRefs:states.filter(a=>a.verified).map(a=>({actionId:a.id,reference:a.verification.reference,reviewer:a.verification.reviewer,at:a.verification.at,evidenceSources:list(a.verification.evidenceSources)})),evidenceSourceIds:unique(states.flatMap(a=>list(a.verification?.evidenceSources).map(s=>s.sourceId))),reasons:unique([...basis.reasons,...states.flatMap(a=>a.reasons)]),basis};
}
export function architectureObligationAction(p,ref){
 const found=accepted(p,ref),basis=architectureObligationBasis(p,ref);if(!found||!basis.ready)return null;
 const o=found.obligation;return {title:o.action,owner:'',due:'',acceptance:o.evidence||'',objectIds:[...o.targetIds],findingId:'',architectureObligation:{...basis.reference,basisStamp:basis.stamp}};
}

export function architectureSolutionsFor(p, objectIds) {
  const ids = new Set(Array.isArray(objectIds) ? objectIds : [objectIds]);
  return list(p?.coauthoring?.designTasks).filter(t => t.status === 'applied' && t.applied?.reasoningGraph?.solution).map(t => ({task: t, solution: t.applied.reasoningGraph.solution}))
    .filter(({solution: s}) => objectIds==null || list(s.placement).some(x => ids.has(x.componentId)) || list(s.specifications).some(x => ids.has(x.componentId) || list(x.capabilityIds).some(id => ids.has(id))) || list(s.obligations).some(o => list(o.targetIds).some(id => ids.has(id))))
    .map(({task, solution}) => ({...solution, taskId: task.id, alternativeId: task.applied.alternativeId, appliedAt: task.applied.at || task.updatedAt, sourceReceipt: solution.receipt || task.methodReceipt || null}));
}

export function architectureObligationsFor(p, objectIds) {
  const ids = new Set(Array.isArray(objectIds) ? objectIds : [objectIds]);
  return architectureSolutionsFor(p, objectIds==null?null:[...ids]).flatMap(s => {
    const named = new Set(list(s.specifications).filter(x => ids.has(x.componentId) || list(x.capabilityIds).some(id => ids.has(id))).flatMap(x => list(x.obligationIds)));
    return list(s.obligations).filter(o => objectIds==null || named.has(o.id) || list(o.targetIds).some(id => ids.has(id)))
      .map(o => {const ref={projectId:p.id,taskId:s.taskId,solutionId:s.id,obligationId:o.id},reading=architectureObligationReading(p,ref);return {...o,solutionId:s.id,taskId:s.taskId,alternativeId:s.alternativeId,sourceReceipt:s.sourceReceipt,reference:ref,verification:reading?.state==='current-verified'?'verified':'pending',verificationState:reading?.state||'open',verificationBasis:reading?.basis||null,verificationActions:reading?.actions||[],evidenceRefs:reading?.evidenceRefs||[],evidenceSourceIds:reading?.evidenceSourceIds||[],verificationReasons:reading?.reasons||[]};});
  });
}
