import {interactionAnswers,architectureOptions} from './architecture-knowledge.js';
import {COMPOSITION_TOPICS} from './composition-knowledge.js';
import {designBasisCurrent} from './design-task-state.js';
import {digest} from './brain-integrity.js';

// Sol may propose prose for unanswered conditions. Typed choices, object IDs,
// accountable owners and quantitative inputs stay in the architect's controls.
const labels={
 information:'Information authority and permitted writers',failure:'Failure and uncertain-outcome agreement',reason:'Proposed rationale and trade-off',contextReview:'Fit with existing decisions and constraints',
 trustName:'Proposed trust-boundary name',trustPolicy:'Proposed access and crossing policy',capacity:'Backlog and admission policy',outcome:'How the final outcome is discovered',
 callerTitle:'Proposed caller name',processorTitle:'Proposed processor name',queueTitle:'Proposed queue name',cacheTitle:'Proposed cache name',storeTitle:'Proposed store name',recoveryTitle:'Proposed recovery component name',relayTitle:'Proposed relay name',routerTitle:'Proposed router name',secondaryTitle:'Proposed collaborating component name',
 dataScope:'Information scope',readScope:'Read scope',retention:'Retention policy to agree',isolation:'Information isolation and protection',accessPattern:'Access patterns',invariant:'Business invariant',writePolicy:'Permitted writers and conflict handling',concurrency:'Concurrent update policy',schemaPlan:'Schema evolution',aggregateBound:'Aggregate boundary and size limits',recoveryPlan:'Recovery procedure',restoreTest:'Restore verification',zeroLossPlan:'Recovery evidence needed for a zero-loss objective',
 directPlan:'Direct call deadline, uncertain outcome and reconciliation',
 freshnessPlan:'Freshness verification',authorityPolicy:'Write-authority policy',invalidation:'Invalidation procedure',cacheFailure:'Behaviour when the cache is unavailable',originFailure:'Behaviour when the authority is unavailable',recovery:'Cache recovery procedure'
};
export function architectureDraftContract(p,t){
 if(t?.kind!=='architecture'||['applied','dismissed'].includes(t.status)||!designBasisCurrent(p,t))return null;
 const allowed={...labels,...Object.fromEntries((COMPOSITION_TOPICS[t.topic]?.fields||[]).filter(f=>!f.values).map(f=>[f.key,f.label]))};
 const fields=Object.entries(interactionAnswers(t.answers,t.topic)).filter(([key,value])=>allowed[key]&&!value).map(([key])=>({key,label:allowed[key],maxLength:/Title$/.test(key)||['trustName','readScope','dataScope'].includes(key)?160:2400}));
 if(!fields.length)return null;
 const options=architectureOptions(t).map(o=>({id:o.id,title:o.title,pattern:o.pattern,cost:o.cost}));
 return {taskId:t.id,revision:t.revision,topic:t.topic||'interaction',requirementId:t.requirementId,driverId:t.driverId,fields,options,
  stamp:digest([p.id,t.id,t.revision,t.answers,t.basis,t.architectureBasis,t.methodReceipt,t.governedKnowledge,fields]),
  authority:'Editable proposals for unanswered narrative conditions only. Do not invent owners, object IDs, measurements or an agreed strategy. Typed choices remain unanswered until the architect selects them.'};
}
export function validateArchitectureDraft(raw,packet){
 const contract=packet.architectureDraft;
 if(!contract||!Array.isArray(raw)||raw.length>12)throw Error('Keep the architectural draft within twelve supported suggestions.');
 const refs=new Set(packet.sources.map(s=>s.ref)),seen=new Set();
 return raw.map(s=>{
  if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join(',')!=='field,rationale,sourceRefs,value')throw Error('The architectural suggestion has an unsupported structure.');
  const f=contract.fields.find(f=>f.key===s.field);
  if(!f||seen.has(s.field))throw Error('Suggest each unanswered architectural field at most once.');seen.add(s.field);
  if(typeof s.value!=='string'||!s.value.trim()||s.value.length>f.maxLength||typeof s.rationale!=='string'||!s.rationale.trim()||s.rationale.length>700)throw Error('Keep suggestions and their rationale within the review limits.');
  if(!Array.isArray(s.sourceRefs)||!s.sourceRefs.length||s.sourceRefs.length>22||s.sourceRefs.some(r=>!refs.has(r)))throw Error('Every architectural suggestion must cite supplied sources.');
  return {field:s.field,value:s.value.trim(),rationale:s.rationale.trim(),sourceRefs:[...new Set(s.sourceRefs)]};
 });
}
export function architectureDraftSelection(p,run,raw){
 if(raw.reviewed!==true||!run.groundingReview?.accepted)throw Error('Review a source-checked set of suggestions before saving architectural conditions.');
 const t=p.coauthoring?.designTasks?.find(t=>t.id===run.packet.architectureDraft?.taskId),current=architectureDraftContract(p,t);
 if(!current||current.stamp!==run.packet.architectureDraft.stamp)throw Error('This comparison changed. Prepare fresh suggestions from the current answers.');
 if(!Array.isArray(raw.fields)||!raw.fields.length||raw.fields.length>12||new Set(raw.fields).size!==raw.fields.length)throw Error('Choose the suggestions you want to keep.');
 const suggestions=validateArchitectureDraft(run.result.architectureDraft,run.packet);
 if(raw.fields.some(key=>!suggestions.some(s=>s.field===key)))throw Error('Choose only suggestions in this saved response.');
 const selected=suggestions.filter(s=>raw.fields.includes(s.field));
 return {task:t,selected,answers:Object.fromEntries(selected.map(s=>[s.field,s.value]))};
}
