// Shared requirement-side basis for existing guided tasks. Interface and
// security additions stay in design-basis; a result read imports no domain cycle.
import {copy} from './util.js';
import {driversForRequirement,driversForComponent,driverScope} from './driver-scope.js';
const pick=(r,keys)=>Object.fromEntries(keys.map(k=>[k,copy(r?.[k]??null)]));
export function designRequirementBasis(p,requirementId,contextIds){
 const r=p.artefacts.find(r=>r.id===requirementId&&r.type==='requirement');if(!r)throw Error('Choose a current project requirement.');
 // Every reader uses the same positive scope: a direct link adds scope, while
 // responsibility and requirement-group links retain their recorded meaning.
 const contextual=(contextIds||[]).flatMap(id=>driversForComponent(p,id));
 const drivers=[...new Map([...driversForRequirement(p,r.id),...contextual].map(d=>[d.id,d])).values()],driverIds=new Set(drivers.map(d=>d.id));
 const decisions=p.decisions.records.filter(d=>d.requirementIds.includes(r.id)||d.driverIds.some(id=>driverIds.has(id)));
 const tasks=(p.coauthoring?.tasks||[]).filter(t=>t.status==='applied'&&t.applied.ids.requirement===r.id);
 const contextLists=[[p.logical.responsibilities,['boundary','requirementIds']],[p.realisation.components,['inputs','outputs','owner','purpose','boundary']],[p.technology.capabilities,['category','purpose','boundaryId','driverIds']],[p.technologyRealisation.records,['operationsPlan','resiliencePlan','options','selectedOptionId']]];
 const designContext=contextIds?.map(id=>{for(const [records,fields] of contextLists){const r=records.find(r=>r.id===id);if(r)return pick(r,['id','ref','title',...fields]);}return {id,removed:true};});
 return {...(contextIds?.length?{contextIds:[...contextIds],designContext}:{}),requirement:pick(r,['id','title','description','acceptance','owner','priority','source','origin','confirmed']),drivers:drivers.map(d=>({...pick(d,['id','kind','title','description','impact','category','stimulus','conditions','response','metric','operator','targetValue','unit','window','measurement','priority','priorityBasis','rationale','confirmed','targetConfirmed','requirementIds','requirementGroupIds','responsibilityIds','componentIds','constraintIds','outcomeIds']),scope:driverScope(p,d)})),decisions:decisions.map(d=>pick(d,['id','question','context','status','revision','selectedAlternativeId','rationale','assumptions','risks','driverIds','requirementIds','alternatives','accepted'])),constraints:p.artefacts.filter(a=>a.type==='constraint').map(a=>pick(a,['id','title','description','priority','source','confirmed'])),sources:tasks.flatMap(t=>{const s=p.coauthoring.sources.find(s=>s.id===t.sourceId),v=s?.versions.at(-1);return v?[{id:s.id,...copy(v)}]:[]})};
}
