// The same saved comparisons and declared enterprise dependencies read by Work,
// Model and Output. No calculation or source authority is manufactured for Sol.
import {scenarioProjection} from './guidance-record.js';
import {enterpriseReferences} from './enterprise-references.js';
import {architectureModel} from './architecture-model.js';
import {digest} from './brain-integrity.js';

export function designContextSources(p,objectIds=[]){
 const selected=new Set(objectIds),projection=scenarioProjection(p),sources=[];
 for(const comparison of projection.comparisons){
  const alternatives=projection.alternatives.filter(a=>comparison.inputs.alternativeIds.includes(a.id));
  if(!alternatives.some(a=>[a.id,...a.specifications.map(s=>s.id),a.scenario?.capacity?.planId,...(a.scenario?.cost?.realizationIds||[])].some(id=>selected.has(id))))continue;
  const definitions=alternatives.map(a=>({...a,commands:p.workbench.alternatives.find(x=>x.id===a.id)?.commands||[]}));
  const excerpt=JSON.stringify({comparison,alternatives:definitions,authority:'Saved design estimates under stated common assumptions. Historical results must not be represented as current estimates; no measurement, live pricing or acceptance is inferred.'});
  // A comparison's diff and impact are derived from the whole working model.
  // If any of that basis is withheld by policy, withhold the deduction intact.
  const sourceRefs=[...architectureModel(p).objects.keys(),comparison.id,...alternatives.map(a=>a.id)];
  sources.push({id:'scenario:'+comparison.id,kind:'design-scenario',objectId:comparison.id,title:comparison.title||'Saved design comparison',versionStamp:digest(excerpt),posture:comparison.current?'Current saved comparison; declared inputs and estimates only':'Historical comparison; its model or alternatives changed',excerpt,receipt:{version:1,sourceRefs}});
 }
 for(const dependency of enterpriseReferences(p)){
  if(!selected.has(dependency.targetId)&&!selected.has(dependency.identity))continue;
  const excerpt=JSON.stringify(dependency),use=p.workbench?.guidanceUses.find(u=>u.id===dependency.id),entry=p.workbench?.catalogue.find(e=>e.organization?.id===dependency.organizationId&&e.organization.entryId===dependency.entryId);
  sources.push({id:'enterprise-dependency:'+dependency.id,kind:'enterprise-dependency',objectId:dependency.id,title:dependency.title+' · '+dependency.targetTitle,versionStamp:digest(excerpt),posture:dependency.state+'; explicitly declared dependency, no live service observation',excerpt,receipt:{version:1,sourceRefs:[...new Set([dependency.id,dependency.targetId,dependency.identity,dependency.organizationId,dependency.entryId,dependency.environmentId,dependency.releaseId,entry?.id,entry?.sourceId,use?.entry?.sourceId].filter(Boolean))]}});
 }
 return sources;
}
export function designContextSourceCurrent(p,source){
 try{return designContextSources(p,source.receipt?.sourceRefs||[]).some(s=>s.kind===source.kind&&s.objectId===source.objectId&&s.versionStamp===source.versionStamp);}catch{return false;}
}
// Used only by the existing explicit source-review action. The original source
// remains in generation history. A refreshed historical comparison keeps its
// saved numbers and historical posture; reviewing it never recalculates it.
export function refreshDesignContextSource(p,source){
 const next=designContextSources(p,source.receipt?.sourceRefs||[]).find(s=>s.kind===source.kind&&s.objectId===source.objectId);
 return next?{...source,...next}:source;
}
