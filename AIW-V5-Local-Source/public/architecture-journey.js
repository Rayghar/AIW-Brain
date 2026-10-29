import {evaluateArchitectureCase} from './architecture-case.js';
import {assessInteraction,architectureOptions} from './architecture-knowledge.js';
const reports=new WeakMap();
function scopedReport(p,id){let entries=reports.get(p);if(!entries){entries=new Map();reports.set(p,entries);}if(!entries.has(id))entries.set(id,evaluateArchitectureCase(p,{requirementIds:[id]}));return entries.get(id);}

// Derived from a saved delivery-design task in any project. Source assertions
// keep their confirmation status; an accepted working design is not proof.
export function deliveryJourney(p,selectedId=null){
 const tasks=(p.coauthoring?.designTasks||[]).filter(t=>t.kind==='architecture'&&t.topic==='delivery');
 if(!tasks.length)return null;
 const related=t=>t.requirementId===selectedId||t.driverId===selectedId||t.applied?.decisionId===selectedId||t.applied?.records?.some(r=>r.id===selectedId)||Object.values(t.answers||{}).includes(selectedId);
 const task=[...tasks].reverse().find(related)||(tasks.length===1||!selectedId?tasks.at(-1):null);if(!task)return null;
 const requirement=p.artefacts.find(r=>r.id===task.requirementId),driver=p.quality.drivers.find(d=>d.id===task.driverId);
 if(!requirement)return null;
 const row=(()=>{try{return JSON.parse(requirement.provenance?.sourceExcerpt||'{}');}catch{return {};}})();
 const conflict=!!row.delivery&&!!row.comments&&/deliver/i.test(row.delivery)&&/yet to be completed|not (?:completed|delivered)|pending/i.test(row.comments);
 const report=scopedReport(p,requirement.id);
 return {task,requirement,driver,report,sourceRow:requirement.provenance?.sourceRow||null,sourceSheet:requirement.provenance?.sheet||'',delivery:row.delivery||'',sourceComment:row.comments||'',conflict,
  options:architectureOptions(task).map(option=>({option,assessment:assessInteraction(p,task,option.id),alternative:(p.modelAlternatives?.records||[]).find(a=>a.taskId===task.id&&a.design?.approach===option.id&&a.status==='draft')}))};
}

export function objectReasoning(p,journey,id,record=null){
 if(!journey)return null;
 const {task,requirement,driver,report}=journey;
 const records=task.applied?.records||[],candidate=p.decisions.records.find(d=>record?.decisionIds?.includes(d.id)&&d.requirementIds?.includes(requirement.id)),linked=records.some(r=>r.id===id)||!!candidate||record?.requirementIds?.includes(requirement.id)||[task.requirementId,task.driverId,task.applied?.decisionId,...Object.entries(task.answers||{}).filter(([k])=>k.endsWith('Id')).map(([,v])=>v)].includes(id);
 if(!linked)return null;
 const decision=p.decisions.records.find(d=>d.id===task.applied?.decisionId)||candidate,chosen=journey.options.find(x=>x.option.id===(task.applied?.reasoningGraph?.assessment?.optionId||task.alternativeIds?.map(aid=>p.modelAlternatives?.records.find(a=>a.id===aid)?.design?.approach).find(Boolean)));
 return {requirement,driver,decision,task,chosen,claimLinks:report.knowledgeLinks.filter(l=>l.objectId===id||l.objectId===requirement.id),records:records.filter(r=>r.id===id),assumptions:[record?.assumptions,decision?.assumptions,driver?.conditions,task.answers?.information].filter(Boolean),obligations:chosen?.assessment?.effects.map(e=>({title:e.quality,verify:e.verify}))||[],confirmedRequirement:requirement.confirmed===true};
}
