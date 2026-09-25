import {digest} from './brain-integrity.js';
import {journeyIndex,journeyTargets,journeyObjectURL} from './journey-context.js';
import {designBasisCurrent} from './design-task-state.js';

const definition=c=>({id:c.id,title:c.title,purpose:c.purpose,revision:c.revision,requirementIds:c.requirementIds});
export function relatedCaseContext(p,requirementIds){
 const ids=new Set(requirementIds);
 return (p.finalReview?.architectureCases||[]).filter(c=>c.requirementIds.some(id=>ids.has(id))).map(definition);
}
export function caseContextSource(p,c){return {id:'case:'+c.id,kind:'architecture-case',objectId:c.id,title:c.title,versionStamp:digest(definition(c)),posture:'Architect-defined case scope and question; no requirement, design or outcome approval',excerpt:JSON.stringify(definition(c)),truncated:false};}
export function caseContextSourceCurrent(p,s){const c=p.finalReview?.architectureCases?.find(c=>c.id===s.objectId);return !!c&&s.versionStamp===digest(definition(c));}

// The next action comes from the selected requirement's actual graph. Shared
// infrastructure must not borrow progress from neighbouring requirements.
export function caseGuidance(p,c){
 if(!c.cases?.length||!c.requirements.length)return null;
 const requirement=c.requirements.find(r=>r.id===c.selected.id)||c.requirements[0],index=journeyIndex(p);
 const stages=Array.from({length:10},(_,i)=>({chapter:i+1,objects:journeyTargets(index,requirement.id,i+1).map(x=>x.node)}));
 const tasks=(p.coauthoring?.designTasks||[]).filter(t=>t.kind==='architecture'&&t.requirementId===requirement.id&&t.status!=='dismissed');
 const stale=tasks.find(t=>!designBasisCurrent(p,t)),pending=[...tasks].reverse().find(t=>t.status!=='applied');
 let next;
 if(stale)next={title:'Review what changed in the comparison',detail:'The saved source or knowledge basis changed. Reconcile it before developing this design further.',taskId:stale.id};
 else if(pending)next={title:pending.status==='proposed'?'Review the proposed model changes':'Continue the architectural comparison',detail:'Keep the alternatives, unanswered conditions and quality consequences together.',taskId:pending.id};
 else {
  const empty=stages.slice(1).find(s=>!s.objects.length),chapter=empty?.chapter||11;
  const actions={2:['Frame a measurable quality scenario','Agree the stimulus, operating conditions and response measure before selecting a mechanism.'],3:['Compare the architectural approaches','Consider the simplest viable structure and the obligations each alternative introduces.'],4:['Define the responsibilities','Give the behaviour an owned boundary and connect it to the design decision.'],5:['Allocate responsibilities to applications','Reuse existing components where their boundaries fit.'],6:['Derive the required capabilities','Explain why each application needs its technology support.'],7:['Compare implementation options','Evaluate products and operating models against the required capabilities.'],8:['Define the information agreement','Make the contract, authoritative information and uncertain-outcome behaviour explicit.'],9:['Develop protection for the design','Connect threats and controls to the saved objects and define verification.'],10:['Place the operating design','Describe runtime placement, readiness, failure domains and recovery.'],11:['Review this case and its open obligations','Traceability is visible. Assess correctness, evidence, trade-offs and usefulness before accepting the design.']};
  const sourceChapter=({2:1,3:1,4:1,5:4,6:5,7:6,8:5,9:8,10:5})[chapter],source=sourceChapter?stages[sourceChapter-1].objects[0]:null;
  next={title:actions[chapter][0],detail:actions[chapter][1],chapter,url:'/?chapter='+chapter+'&tab=work'+(source?'&guideSource='+encodeURIComponent(source.id):'')};
 }
 return {requirementId:requirement.id,requirementTitle:requirement.title,cases:c.cases,stages:stages.map(s=>({...s,objects:s.objects.map(n=>({id:n.id,title:n.title,url:journeyObjectURL(n)}))})),next};
}
