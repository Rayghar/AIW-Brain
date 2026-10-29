// An architecture case as context for the Brain (audit F2-08): the cases related to a set of requirements, a case as
// a context source, and whether that source is still current. Moved out of case-guidance.js, whose next-step guidance
// reads design tasks (design-task-state.js imports aiw-brain.js), so that aiw-brain.js can read cases without an
// import cycle.
import {digest} from './brain-integrity.js';

const definition=c=>({id:c.id,title:c.title,purpose:c.purpose,revision:c.revision,requirementIds:c.requirementIds});
export function relatedCaseContext(p,requirementIds){
 const ids=new Set(requirementIds);
 return (p.finalReview?.architectureCases||[]).filter(c=>c.requirementIds.some(id=>ids.has(id))).map(definition);
}
export function caseContextSource(p,c){return {id:'case:'+c.id,kind:'architecture-case',objectId:c.id,title:c.title,versionStamp:digest(definition(c)),posture:'Architect-defined case scope and question; no requirement, design or outcome approval',excerpt:JSON.stringify(definition(c)),truncated:false};}
export function caseContextSourceCurrent(p,s){const c=p.finalReview?.architectureCases?.find(c=>c.id===s.objectId);return !!c&&s.versionStamp===digest(definition(c));}
