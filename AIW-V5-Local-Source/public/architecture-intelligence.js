// One derived reading connects the saved design, repository questions and native
// review routes. It owns no project state and never executes a command or an LLM.
import {journeyIndex,journeyTargets,journeyObjectURL,journeyStatus} from './journey-context.js';
import {driverScopeIndex,driverScope,driversForComponent,driversForRequirement} from './driver-scope.js';
import {driverKind,driverKindOf,isQualityDriver} from './quality-domain.js';
import {linkedRequirementIds} from './requirement-links.js';
import {knowledgeStructures,knowledgeStructureSource,KNOWLEDGE_STRUCTURE_VERSION} from './knowledge-structure.js';
import {relevantKnowledge} from './knowledge-relevance.js';
import {evaluateArchitectureScope,optionFacts,safeFactKey,assessContractExecution,contractExecutionContext,executionMethodSource,executionJourney} from './architecture-applicability.js';
import {architectureSolutionsFor,architectureObligationsFor} from './architecture-obligations.js';
import {domainKnowledge} from './domain-knowledge.js';
import {readDecision} from './decision-reading.js';
import {releasedClaims,claimReceiptCurrent,withdrawn} from './knowledge-governance.js';
import {digest} from './brain-integrity.js';
// The knowledge a deduction can read is the released, pinned knowledge; its stamp covers that and nothing else, so a
// candidate claim a person captures (never read here) does not make a reading stale (rc39; stewardship contract).
const releasedKnowledgeStamp=p=>digest(releasedClaims(p).map(x=>[x.claim.id,x.release.id,x.release.checksum,!!x.eligible]));
import {changeFingerprint} from './changes-domain.js';
import {designBasis,designBasisStamp} from './design-basis.js';
import {architectureMethodReceiptStatus,ARCHITECTURE_EVALUATION_REVISION} from './composition-manifest.js';
import {technologyProductIdentity} from './technology-catalogue.js';
import {eachRecord} from './provenance.js';

export const ARCHITECTURE_INTELLIGENCE_VERSION='aiw-architecture-intelligence-3';
const list=value=>Array.isArray(value)?value:[];
const unique=values=>[...new Set(values.filter(Boolean))];
const nodes=values=>[...new Map(values.filter(Boolean).map(n=>[n.id,n])).values()];
const text=(value,max=800)=>String(value??'').trim().slice(0,max);
const strip=record=>JSON.parse(JSON.stringify(record||{},(key,value)=>['history','sourceSnapshot','generation'].includes(key)?undefined:value));
const scalar=value=>typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value);

// Receipts use the same saved record, including link/path records that have no
// drawn journey node. This is a projection of the native registry, not a store.
function sourceNodes(p){
 const records=new Map();eachRecord(p,(record,chapter)=>{if(record.id)records.set(record.id,{id:record.id,chapter,title:record.title||record.id,record});});
 for(const [id,node] of journeyIndex(p).nodes)records.set(id,node);
 for(const record of list(p.finalReview?.actions))records.set(record.id,{id:record.id,chapter:11,title:record.title||record.id,record});
 for(const record of list(p.coauthoring?.designTasks))records.set(record.id,{id:record.id,chapter:3,title:record.title,record});
 for(const source of list(p.coauthoring?.sources)){const version=source.versions?.at(-1);if(version)records.set(source.id,{id:source.id,chapter:1,title:version.title,record:{id:source.id,...version}});}
 for(const r of list(p.technologyRealisation?.records))for(const record of list(r.options))records.set(record.id,{id:record.id,chapter:7,title:record.product||record.title,record});
 if(p.finalReview?.narrative)records.set('SDD',{id:'SDD',chapter:11,title:'Solution Design Document',record:{id:'SDD',...p.finalReview.narrative}});
 return records;
}
export const architectureModelSourceRecord=(p,id)=>{const node=sourceNodes(p).get(id);return node?.record||node||null;};

function titleNode(p,node){
 if(!node)return null;
 const r=node.record||{};let title=node.title||r.title||r.question||r.name||r.topic||node.ref||node.id;
 if(r.planId&&!node.title){const plan=list(p.runtime?.plans).find(x=>x.id===r.planId),zone=list(p.runtime?.zones).find(x=>x.id===r.zoneId);title='Placement of '+(plan?.ref||plan?.id||r.planId)+(zone?' in '+(zone.title||zone.id):'');}
 return {...node,title};
}

// The same positive driver scope used by specifications and comparisons. A
// component's upstream requirement does not import a sibling's component-only
// driver. Groups expand through linkedRequirementIds; direct links are additive.
export function architectureContext(p,selection={}){
 const original=journeyIndex(p),index={...original,nodes:new Map(original.nodes)},chapter=Number(selection.chapter)||1;
 for(const r of list(p.runtime?.paths))index.nodes.set(r.id,{id:r.id,chapter:10,title:'Runtime path '+r.id,record:r});
 for(const r of list(p.finalReview?.actions))index.nodes.set(r.id,{id:r.id,chapter:11,title:r.title,record:r});
 if(p.finalReview?.narrative)index.nodes.set('SDD',{id:'SDD',chapter:11,title:p.finalReview.narrative.title||'Solution Design Document',record:{id:'SDD',...p.finalReview.narrative}});
 for(const realisation of list(p.technologyRealisation?.records))for(const option of list(realisation.options))index.nodes.set(option.id,{id:option.id,chapter:7,title:option.product||option.title,record:option,parentId:realisation.id});
 const selected=titleNode(p,index.nodes.get(selection.id))||{id:'project',ref:'Project',title:p.name||'Project',chapter,record:{title:p.name||'Project',description:p.brief?.summary||p.brief?.problem||'',...strip(p.brief)}};
 const anchor=selected.parentId||selected.id,targets=unique([...list(selected.record?.targetIds),...list(selected.record?.objectIds),selected.record?.from,selected.record?.to,selected.record?.authorityId,selected.record?.assetId,selected.record?.contractId,...list(selected.record?.assetIds)]);
 const at=ch=>nodes([anchor,...targets].flatMap(id=>journeyTargets(index,id,ch).map(x=>titleNode(p,x.node))));
 const components=list(p.realisation?.components),responsibilities=list(p.logical?.responsibilities),scopeIndex=driverScopeIndex(p);
 const positiveIds=unique([selected.id,...targets]),selectedDriver=scopeIndex.drivers.find(d=>d.id===selected.id);
 const intentChapter=selected.chapter===11&&targets.length&&targets.every(id=>index.nodes.get(id)?.chapter<=4)?Math.max(...targets.map(id=>index.nodes.get(id).chapter)):selected.chapter,intent=intentChapter<=4;
 const requirementIds=new Set([...at(1).filter(n=>n.record?.type==='requirement').map(n=>n.id),...linkedRequirementIds(p,selected.record)]);
 if(selectedDriver)for(const id of driverScope(p,selectedDriver,scopeIndex).contextRequirementIds)requirementIds.add(id);
 const answersForIntent=r=>linkedRequirementIds(p,r).some(id=>requirementIds.has(id));
 const responsibilityIds=new Set([...at(4).filter(n=>responsibilities.some(r=>r.id===n.id)&&(!intent||intentChapter===4||answersForIntent(n.record))).map(n=>n.id),...positiveIds.filter(id=>responsibilities.some(r=>r.id===id))]);
 if(intent&&intentChapter<4)for(const r of responsibilities)if(answersForIntent(r)||list(r.decisionIds).includes(selected.id))responsibilityIds.add(r.id);
 const componentIds=new Set([...(!intent?at(5).map(n=>n.id):[]),...positiveIds.filter(id=>components.some(c=>c.id===id))]);
 if(selectedDriver){const s=driverScope(p,selectedDriver,scopeIndex);for(const id of s.componentIds)componentIds.add(id);for(const id of s.responsibilityIds)responsibilityIds.add(id);}
 for(const mapping of list(p.logical?.mappings)){
  if(intent&&responsibilityIds.has(mapping.logicalId))componentIds.add(mapping.physicalId);
  if(!intent&&componentIds.has(mapping.physicalId))responsibilityIds.add(mapping.logicalId);
 }
 if(intent)for(const component of components)if(answersForIntent(component))componentIds.add(component.id);
 // A concrete boundary bears every requirement allocated to it. An upstream
 // requirement keeps its own intent even when that boundary is shared.
 for(const r of [...(!intent?components.filter(c=>componentIds.has(c.id)):[]),...responsibilities.filter(r=>responsibilityIds.has(r.id)&&(!intent||intentChapter===4))])for(const id of linkedRequirementIds(p,r))requirementIds.add(id);
 const requirements=[...requirementIds].map(id=>titleNode(p,index.nodes.get(id))).filter(n=>n?.record?.type==='requirement');
 const driverIds=new Set(list(selected.record?.driverIds));if(selectedDriver)driverIds.add(selectedDriver.id);
 if(!intent)for(const id of componentIds)for(const d of driversForComponent(p,id))driverIds.add(d.id);
 for(const [id,s] of scopeIndex.scopes)if(s.responsibilityIds.some(r=>responsibilityIds.has(r)))driverIds.add(id);
 if(intent||!componentIds.size&&!responsibilityIds.size)for(const n of requirements)for(const d of driversForRequirement(p,n.id))driverIds.add(d.id);
 // A boundary's own requirements retain their drivers even when its endpoints
 // also supply implementation context. This does not import sibling intent.
 for(const id of linkedRequirementIds(p,selected.record))for(const d of driversForRequirement(p,id))driverIds.add(d.id);
 const drivers=scopeIndex.drivers.filter(d=>driverIds.has(d.id)).map(d=>({id:d.id,ref:d.code||d.id,title:d.title,chapter:2,record:d,kind:driverKind(d),scope:driverScope(p,d,scopeIndex)}));
 const decisions=nodes([...at(3),...list(selected.record?.decisionIds).map(id=>titleNode(p,index.nodes.get(id)))]).filter(n=>list(p.decisions?.records).some(d=>d.id===n.id));
 const links=index.edges.filter(e=>e.from===anchor||e.to===anchor),neighbours=nodes(links.map(e=>titleNode(p,index.nodes.get(e.from===anchor?e.to:e.from))));
 const positive=new Set([selected.id,...requirementIds,...responsibilityIds,...componentIds,...drivers.map(d=>d.id),...decisions.map(d=>d.id)]);
 const constraintIds=new Set([selected.record,...requirements.map(n=>n.record),...drivers.map(n=>n.record)].flatMap(r=>list(r?.constraintIds)));
 const constraints=list(p.artefacts).filter(r=>{if(r.type!=='constraint')return false;const links=list(p.relationships).filter(e=>e.kind==='constrains'&&(e.from===r.id||e.to===r.id)).map(e=>e.from===r.id?e.to:e.from),scoped=unique([...links,...linkedRequirementIds(p,r)]);return !scoped.length||constraintIds.has(r.id)||scoped.some(id=>positive.has(id));});
 const ids=new Set([selected.id,...requirements.map(r=>r.id),...drivers.map(r=>r.id),...decisions.map(r=>r.id),...componentIds]);
 const tasks=list(p.coauthoring?.designTasks).filter(t=>ids.has(t.requirementId)||list(t.applied?.records).some(r=>ids.has(r.id))||ids.has(t.basis?.securityIds?.threatId)||ids.has(t.basis?.contractId));
 const scope={requirementIds:requirements.map(r=>r.id),driverIds:drivers.map(d=>d.id),componentIds:[...componentIds],responsibilityIds:[...responsibilityIds]};
 return {chapter:Number(selection.chapter)||selected.chapter,tab:selection.tab||'work',selected,status:selected.chapter===2&&!isQualityDriver(selected.record)?driverKindOf(driverKind(selected.record)).name+' driver':journeyStatus(selected),requirements,drivers,decisions,links,neighbours,constraints,tasks,scope};
}

function modelSource(node){
 const record=strip(node.excerptRecord||node.record||node),full=JSON.stringify(record);
 return {id:'model:'+node.id,kind:'model',objectId:node.id,chapter:node.chapter,title:node.title||node.id,posture:'Saved project facts; declarations and recorded judgements are separate from measured outcomes.',versionStamp:changeFingerprint(node.record||node),excerpt:full,truncated:!!node.excerptRecord,authority:{kind:'saved-model',evaluateFit:false,scoring:false,automaticMutation:false}};
}
function action(c,kind,label,extra={}){
 const chapter=extra.chapter||c.selected.chapter||c.chapter,objectId=extra.objectId||c.selected.id,tab=extra.tab||'work';
 const target={chapter,tab,objectId};
 return {id:kind+':'+objectId+':'+(extra.fieldKey||extra.concernId||extra.taskId||extra.sourceId||''),kind,title:label,label,why:extra.why||'',...target,...extra,target:{...target,url:journeyObjectURL({id:objectId,chapter},tab)}};
}
function factContexts(p,c){
 const selected=c.selected.record||{},parent=list(p.technologyRealisation?.records).find(r=>r.id===c.selected.id||list(r.options).some(o=>o.id===c.selected.id));
 const options=parent?(parent.id===c.selected.id?list(parent.options):list(parent.options).filter(o=>o.id===c.selected.id)):[];
 const base=Object.create(null);
 for(const [key,value] of Object.entries(selected))if(safeFactKey(key)&&scalar(value))base[key]={value,status:'declared',source:{kind:'model',id:c.selected.id,field:key}};
 base['driver.kinds']={value:unique(c.drivers.map(d=>d.kind)),status:'declared',source:{kind:'model',ids:c.scope.driverIds}};
 base['driver.categories']={value:unique(c.drivers.filter(d=>isQualityDriver(d.record)).map(d=>d.record.category)),status:'declared',source:{kind:'model',ids:c.scope.driverIds}};
 for(const [key,ids] of Object.entries(c.scope))base['scope.'+key]={value:ids,status:'declared',source:{kind:'model',id:c.selected.id}};
 const capabilityIds=parent?list(p.technologyRealisation?.mappings).filter(m=>m.realizationId===parent.id).map(m=>m.capabilityId):[];
 const capabilities=list(p.technology?.capabilities).filter(r=>capabilityIds.includes(r.id)||r.id===c.selected.id);
 return (options.length?options:[selected]).map(record=>({id:record.id||c.selected.id,sourceNode:parent?{id:parent.id,chapter:7,title:parent.title,record:parent}:c.selected,
  choice:{...record,capabilities,facts:optionFacts(record,{facts:base})}}));
}
const obligationRead=o=>({id:o.id||'',action:o.action||o.text||o.title||'',evidence:o.evidence||o.verification||o.verificationHint||'',verification:o.verification==='verified'?'verified':'pending',targetIds:list(o.targetIds),sourceRefs:list(o.sourceRefs),verificationState:o.verificationState||'open',evidenceRefs:list(o.evidenceRefs),verificationReasons:list(o.verificationReasons)});

// One authoritative field can answer several concern-specific checks. Group
// exact native targets, preserving every supporting insight and its sources.
// Severity wins first; within it, a question informing more boundaries comes first.
export function architectureQuestions(insights,recordNodes=new Map()){
 const groups=new Map();
 for(const insight of insights)for(const check of list(insight.checks).filter(x=>['blocked','unknown'].includes(x.state))){
  const node=recordNodes.get(check.source?.id),target=check.target||(check.fact==='runtimePath'&&insight.scope?.contractId?{objectId:insight.scope.contractId,chapter:8,fieldKey:'execution.environmentId'}:node&&check.source?.field?{objectId:node.id,chapter:node.chapter,fieldKey:check.source.field}:null);
  if(!target?.objectId||!target.fieldKey)continue;
  const key=target.chapter+':'+target.objectId+':'+target.fieldKey,priority=check.state==='blocked'?12:14;
  let q=groups.get(key);if(!q){q={id:'question:'+key,target,priority,question:check.detail,insightIds:[],checkIds:[],dependentIds:[],sourceRefs:[]};groups.set(key,q);}
  if(priority<q.priority){q.priority=priority;q.question=check.detail;q.insightIds.unshift(insight.id);}
  q.insightIds=unique([...q.insightIds,insight.id]);q.checkIds=unique([...q.checkIds,(check.source?.id||insight.id)+':'+check.id]);
  q.dependentIds=unique([...q.dependentIds,...(check.dependentIds?.length?check.dependentIds:insight.scope?.contractIds||[insight.scope?.contractId||insight.subjectId])]);q.sourceRefs=unique([...q.sourceRefs,...list(insight.sourceRefs)]);
 }
 return [...groups.values()].sort((a,b)=>a.priority-b.priority||b.dependentIds.length-a.dependentIds.length).map(q=>({...q,question:q.question+(q.dependentIds.length>1?' This fact informs checks across '+q.dependentIds.length+' linked boundaries.':'')}));
}

export function architectureIntelligence(p,selection={}, {context=null,prompt='',limit=8}={}){
 const c=context?.scope?context:architectureContext(p,selection),supply=knowledgeStructures(p),hits=relevantKnowledge(c,{project:p,prompt,supply,limit:Math.max(4,Math.min(12,limit))}),sources=new Map(),insights=[];
 const addSource=source=>{if(source&&!sources.has(source.id))sources.set(source.id,source);return source?.id;};
 const modelNodes=nodes([c.selected,...c.requirements,...c.drivers,...c.decisions,...c.constraints.map(r=>({id:r.id,title:r.title,chapter:1,record:r}))]);for(const n of modelNodes)addSource(modelSource(n));
 const baseRefs=unique(['model:'+c.selected.id,...c.requirements.map(d=>'model:'+d.id),...c.drivers.map(d=>'model:'+d.id),...c.constraints.map(d=>'model:'+d.id)]),modelIds=new Set(modelNodes.map(n=>n.id));
 const add=value=>{insights.push({subjectId:c.selected.id,driverIds:c.drivers.map(d=>d.id),alternatives:[],obligations:[],interactions:[],actions:[],...value});};
 const recordNodes=sourceNodes(p),executionBasis=[],executionIds=new Set(),processScope=list(p.processModel?.transitions).filter(t=>t.contractId&&[t.id,t.from,t.to].includes(c.selected.id));
 for(const contract of list(p.interfaces?.contracts).filter(r=>r.execution&&(r.id===c.selected.id||r.execution.outcomeContractId===c.selected.id||r.id===c.selected.record?.contractId||processScope.some(t=>t.contractId===r.id)||c.scope.componentIds.some(id=>[r.from,r.to].includes(id))))){
  const ctx=contractExecutionContext(p,contract),environmentId=c.selected.record?.environmentId||(list(p.runtime?.environments).some(e=>e.id===c.selected.id)?c.selected.id:null);
  if(environmentId&&contract.execution.environmentId!==environmentId)continue;
  const method=executionMethodSource(p);if(!method)continue;
  executionIds.add(contract.id);
  const result=assessContractExecution(contract,ctx),outcome=ctx.outcome,read=outcome?.read,related=[...(c.selected.id===contract.id?[]:[architectureContext(p,{chapter:8,id:contract.id})]),...(outcome?.contract?[architectureContext(p,{chapter:8,id:outcome.contract.id})]:[])];
  executionBasis.push({contract,context:ctx,support:related.map(x=>({requirements:x.requirements.map(n=>n.record),drivers:x.drivers.map(n=>n.record),constraints:x.constraints}))});
  const dependencies=nodes([recordNodes.get(contract.id),...['from','to'].map(key=>recordNodes.get(contract[key])),...list(contract.exchanges).map(x=>recordNodes.get(x.dataId)),ctx.path&&recordNodes.get(ctx.path.id),ctx.environment&&recordNodes.get(ctx.environment.id),...[outcome?.contract,outcome?.path,outcome?.authority,...list(outcome?.requestData),...list(outcome?.resultData)].filter(Boolean).map(r=>recordNodes.get(r.id)),...['from','to'].map(key=>recordNodes.get(outcome?.contract?.[key])),...related.flatMap(x=>[...x.requirements,...x.drivers,...x.constraints.map(r=>recordNodes.get(r.id))]),...[read?.task,read?.data,...list(read?.requirements),...list(read?.drivers)].filter(Boolean).map(r=>recordNodes.get(r.id)),...Object.values(read?.roleIds||{}).map(id=>recordNodes.get(id))]);
  if(read?.task){const n=dependencies.find(n=>n.id===read.task.id),m=read.task.methodReceipt;if(n){n.excerptRecord={id:n.id,title:n.title,topic:read.task.topic,status:read.task.status,answers:read.answers,requirementId:read.task.requirementId,driverId:read.task.driverId,methodReceipt:{methodId:m?.methodId,packId:m?.packId,fingerprint:m?.fingerprint,evaluationRevision:m?.sources?.evaluationRevision},solution:{id:read.solution?.id,state:read.solution?.state,optionId:read.solution?.optionId,placement:read.solution?.placement},sourceCurrent:read.current,methodCurrent:read.methodCurrent};n.currentnessRefs=read.sourceRecords.map(r=>'model:'+r.id);}}
  const refs=unique([...baseRefs,addSource(method),...dependencies.map(n=>addSource({...modelSource(n),...(n.currentnessRefs?{receipt:{sourceRefs:n.currentnessRefs}}:{})}))]),first=result.blockers[0]||result.unknown[0];
  // Empty declarations do not supply a fact. Keep every nonempty operand and
  // each original record stamp while reserving room for the complete deduction.
  if(read?.task)for(const ref of refs){const source=sources.get(ref);if(source?.kind==='model')source.excerpt=JSON.stringify(JSON.parse(source.excerpt),(_,v)=>v===''||Array.isArray(v)&&!v.length?undefined:v);}
  const field=first?.fact==='runtimePath'?'execution.environmentId':['kind','correlationKey','idempotencyKey','contractVersion'].includes(first?.fieldKeys?.[0])?first.fieldKeys[0]:'execution.'+(first?.fieldKeys?.[0]==='schemaVersion'?'completion':first?.fieldKeys?.[0]||'completion');
  const target=first?.target||{objectId:contract.id,chapter:8,fieldKey:field},dataTarget=list(p.interfaces?.data).some(d=>d.id===target.objectId);
  add({id:'execution:'+contract.id+':'+(ctx.environment?.id||'unassigned'),kind:'composition',state:result.state,priority:result.blockers.length?12:result.unknown.length?14:22,severity:result.blockers.length?'blocking':result.unknown.length?'attention':'context',title:'Delivery, repeat protection and outcome · '+(contract.ref||contract.id),driverIds:unique([...c.drivers,...related.flatMap(x=>x.drivers),...list(read?.drivers)].map(d=>d.id)),detail:(result.ready?'The declarations are consistent within this scoped reading. Implementation and outcome evidence remain open.':result.reasons.join(' '))+(result.calculations?.length?' '+result.calculations.map(x=>x.statement).join(' '):''),question:first?.detail||'Which failure-injection evidence supports the retained intent, repeated effect and authoritative outcome?',checks:result.checks,sourceRefs:refs,authority:{kind:'inspected-method-interpretation',evaluateFit:true,scoring:false,automaticMutation:false},placement:result.placement,scope:result.scope,obligations:result.obligations.map(o=>({...o,sourceRefs:refs})),actions:[action(c,'open-record',dataTarget?'Review the result dictionary':target.objectId===contract.id?'Review this execution agreement':'Review the linked result boundary',{...target,...(dataTarget?{editor:'data'}:{}),why:first?.detail||result.authority}),...(read?.task?[action(c,'resume-task','Review the result read design',{taskId:read.task.id,chapter:4,why:'Review the accepted read approach, its freshness contract and current source support.'})]:[]),...(outcome?.contract?[action(c,'open-record','Inspect the result contract',{objectId:outcome.contract.id,chapter:8,why:'Review the exact contract named by this execution agreement.'})]:[]),...(ctx.environment?[action(c,'open-record','Inspect the runtime path',{objectId:ctx.path?.id||ctx.environment.id,chapter:10,why:'Verify this exact interface in its declared environment.'})]:[]),action(c,'open-knowledge','Inspect the composition sources',{sourceId:method.id})]});
 }
 const journeys=new Set();
 for(const id of executionIds){
  const reading=executionJourney(p,id);if(!reading||journeys.has(reading.id))continue;journeys.add(reading.id);
  const method=executionMethodSource(p,{journey:true});if(!method)continue;
  const related=reading.scope.contractIds.map(id=>architectureContext(p,{chapter:8,id})),support=nodes([...reading.sourceRecords.map(r=>recordNodes.get(r.id)),...related.flatMap(x=>[...x.requirements,...x.drivers,...x.constraints.map(r=>recordNodes.get(r.id))])]);
  const refs=unique([...baseRefs,addSource(method),...reading.sourceRecords.map(r=>'model:'+r.id),...support.map(n=>addSource(modelSource(n)))]),first=reading.blockers[0]||reading.unknown[0],target=first?.target||{objectId:id,chapter:8,fieldKey:'execution.invocationParentId'};
  executionBasis.push({journey:reading.scope,records:reading.sourceRecords,reads:reading.readSupport,support:related.map(x=>({requirements:x.requirements.map(n=>n.record),drivers:x.drivers.map(n=>n.record),constraints:x.constraints}))});
  add({id:reading.id,kind:'composition',state:reading.state,priority:reading.blockers.length?12:reading.unknown.length?14:21,severity:reading.blockers.length?'blocking':reading.unknown.length?'attention':'context',title:'Linked request and result boundaries',detail:(reading.ready?'The explicit linked-boundary declarations are consistent; implementation evidence remains open.':reading.reasons.join(' '))+' '+reading.calculations.map(x=>x.statement).join(' '),question:first?.detail||'Which failure exercise verifies these linked requests and results together?',checks:reading.checks,calculations:reading.calculations,scope:reading.scope,sourceRefs:refs,authority:{kind:'inspected-method-interpretation',evaluateFit:true,scoring:false,automaticMutation:false},obligations:reading.obligations.map(o=>({...o,sourceRefs:refs})),actions:[action(c,'open-record','Review the linked boundary',{...target,why:first?.detail||reading.authority,...(list(p.interfaces?.data).some(d=>d.id===target.objectId)?{editor:'data'}:{})}),action(c,'open-knowledge','Inspect the composition sources',{sourceId:method.id})]});
 }
 const contexts=factContexts(p,c),concerns=domainKnowledge(p).concerns,byConcept=new Map(supply.records.filter(r=>r.origin==='catalogue').map(r=>[r.id,r])),relevantConcepts=new Set(hits.map(h=>h.conceptId)),interactionPairs=new Set();
 for(const hit of hits){
  const r=hit.structure,source=hit.source||knowledgeStructureSource(r);if(!source)continue;
  addSource({...source,authority:r.authority});
  const signalRefs=unique(hit.signals.filter(s=>s.objectId&&modelIds.has(s.objectId)).map(s=>'model:'+s.objectId));
  const refs=unique([...baseRefs,...signalRefs,source.id]),conditionTexts=[...list(r.prerequisites),...list(r.conditions),...list(r.limitations),...list(r.exclusions)].map(x=>({id:x.id,text:x.text,sourceField:x.sourceField,sourceRefs:[source.id]}));
  const relations=supply.relations.filter(e=>e.from===r.conceptId),alternatives=[],interactions=[];
  for(const relation of relations){
   const other=byConcept.get(relation.to);if(!other||relation.targetState!=='available')continue;
   const declaredBy=byConcept.get(relation.from),relationSource=declaredBy&&knowledgeStructureSource(declaredBy),otherSource=knowledgeStructureSource(other);if(!relationSource||!otherSource)continue;addSource({...relationSource,authority:declaredBy.authority});addSource({...otherSource,authority:other.authority});
   const edge={id:relation.from+':'+relation.kind+':'+relation.to,from:relation.from,to:relation.to,kind:relation.kind,title:other.title,state:'consideration',sourceRefs:[relationSource.id,otherSource.id],sourceField:relation.sourceField,authority:'editorial',evaluated:false};
   if(relation.kind==='alternative')alternatives.push({id:other.id,title:other.title,state:'unassessed',sourceRefs:edge.sourceRefs,why:'The repository names this alternative; compare its conditions and obligations against the same drivers.'});
   else interactions.push(edge);
  }
  const concern=concerns.find(x=>x.receipt?.claimId===r.claimId&&x.receipt?.releaseId===r.releaseId);
  const typed=!!r.authority.evaluateFit&&!!r.applicability;
  const applicableContexts=typed?contexts:[contexts[0]];
  for(const f of applicableContexts){
   const assessment=typed?evaluateArchitectureScope({scope:r.scope,applicability:r.applicability,obligations:r.obligations,placement:r.placement},f.choice,{productIdentity:technologyProductIdentity}):null;
   if(typed)addSource(modelSource(f.sourceNode));
   const conditionRefs=unique([...refs,...(typed?['model:'+f.sourceNode.id]:[])]),checks=list(assessment?.checks);
   const state=assessment?.state||'consideration',unknown=checks.filter(x=>x.state==='unknown'),blocked=checks.filter(x=>x.state==='blocked');
   const question=unknown[0]?.detail||(blocked.length?'Which viable alternative satisfies the recorded conditions without changing the requirement?':hit.question);
   const field=unknown[0]?.fact,sourceFact=field&&f.choice.facts?.[field]?.source;
   const edit=action(c,'open-record',unknown.length?'Record the missing context':'Review this design question',{objectId:f.sourceNode.id,chapter:f.sourceNode.chapter,fieldKey:sourceFact?.field,why:question});
   const actions=[edit,action(c,'open-knowledge','Inspect source conditions',{sourceId:source.id,why:source.posture})];
   if(concern&&c.requirements.length&&c.drivers.length)actions.unshift(action(c,'compare','Compare the released approaches',{concernId:'knowledge:'+concern.id,requirementId:c.requirements[0].id,driverId:c.drivers[0].id,why:concern.question}));
   add({id:'knowledge:'+c.selected.id+':'+r.id+(typed?':'+f.id:''),kind:concern?'comparison':'knowledge',state,priority:blocked.length?12:unknown.length?14:24,severity:blocked.length?'blocking':unknown.length?'attention':'context',title:r.title,detail:hit.why+' '+(assessment?assessment.ready?'Its recorded predicates match this scope. Implementation and outcome verification remain pending.':assessment.reasons.join(' '):hit.limit),question,conditions:conditionTexts,checks,
    sourceRefs:conditionRefs,authority:r.authority,alternatives:concern?concern.options.map(o=>({id:o.id,title:o.title,state:'unassessed',why:o.tradeoff||'',evidence:o.evidence||'',sourceRefs:[source.id]})):alternatives,
    obligations:list(r.obligations).map(o=>({...obligationRead(o),sourceRefs:[source.id]})),placement:list(r.placement),interactions,actions});
  }
  // An explicit repository relationship is a reason to examine the combination,
  // never a finding that these patterns actually conflict in the saved system.
  const consideredTogether=interactions.filter(e=>relevantConcepts.has(e.to));
  if(consideredTogether.length){
   const conflict=consideredTogether.find(e=>e.kind==='conflict'),relation=conflict||consideredTogether[0];
   const pair=[relation.from,relation.to].sort().join(':')+':'+relation.kind;
   if(!interactionPairs.has(pair)){
    interactionPairs.add(pair);
    add({id:'interaction:'+c.selected.id+':'+relation.id,kind:'interaction',state:'consideration',priority:24,severity:'context',title:r.title+' and '+relation.title,detail:'The repository declares this '+relation.kind+' relationship. Its applicability to the saved boundaries has not been established.',question:relation.kind==='conflict'?'Do the conflicting assumptions apply at the same boundary, or do the alternatives have distinct scopes?':'Which prerequisite or responsibility would the complementary mechanism supply here?',sourceRefs:unique([...refs,...relation.sourceRefs]),authority:r.authority,interactions:[relation],actions:[action(c,'open-record','Review the affected boundary',{why:'Check the same drivers, boundary and operating assumptions.'}),action(c,'open-knowledge','Inspect the declared relationship',{sourceId:source.id})]});
   }
  }
 }
 for(const node of c.decisions){
  const reading=readDecision(p,node.record),broken=reading?.choice?.breaks||[];if(!broken.length)continue;
  add({id:'constraint:'+node.id,kind:'constraint',state:'excluded',priority:12,severity:'blocking',title:'The working choice violates a recorded hard constraint',detail:node.title+' records a violating assessment for '+broken.join(', ')+'. Preference weights cannot make that option eligible.',question:'Which remaining alternative satisfies the constraint?',driverIds:broken,sourceRefs:unique(['model:'+node.id,...broken.map(id=>'model:'+id)]),authority:{kind:'saved-model',evaluateFit:true,scoring:false,automaticMutation:false},alternatives:reading.rows.map(row=>({id:row.id,title:row.alt.title,state:row.out?'excluded':row.unshown.length?'needs-context':'unassessed',driverIds:row.breaks,sourceRefs:['model:'+node.id]})),actions:[action(c,'open-record','Review the recorded alternatives',{objectId:node.id,chapter:3})]});
 }
 const affected=unique([c.selected.id,...c.scope.componentIds]),solutions=architectureSolutionsFor(p,affected),obligations=architectureObligationsFor(p,affected);
 for(const solution of solutions){
  const relevant=obligations.filter(o=>o.solutionId===solution.id);if(!relevant.length)continue;
  const task=c.tasks.find(t=>t.id===solution.taskId),receipt=solution.sourceReceipt||{};
  let changed=false;const previous=task?.sourceReview?.basis||task?.basis;
  if(previous)try{changed=designBasisStamp(designBasis(p,task.requirementId,previous.contractId,previous.payloadId,previous.securityIds,previous.contextIds))!==designBasisStamp(previous);}catch{changed=true;}
  const method=task?.methodReceipt||{},methodIds=unique([receipt.packId,receipt.methodId,...list(receipt.sourceIds),method.packId,method.methodId,method.sources?.method?.id,...list(method.sources?.references).map(r=>r.id)]);
  const stale=changed||relevant.some(o=>o.verificationState==='review-required')||!architectureMethodReceiptStatus(method).interpretationCurrent||withdrawn(p,methodIds).length>0||list(task?.governedKnowledge).some(r=>r.claimId&&!claimReceiptCurrent(p,r)),pending=relevant.filter(o=>o.verification!=='verified');
  const taskSource=task?addSource(modelSource({id:task.id,title:task.title||'Applied architecture proposal',chapter:c.chapter,record:task,excerptRecord:{id:task.id,revision:task.revision,status:task.status,methodReceipt:task.methodReceipt,solution}})):null;
  const evidenceRefs=[];
  for(const o of relevant){
   for(const id of o.verificationBasis?.recordIds||[]){const n=recordNodes.get(id);evidenceRefs.push('model:'+id);if(n)addSource(modelSource(n));}
   for(const state of o.verificationActions){const n=recordNodes.get(state.id);evidenceRefs.push('model:'+state.id);if(n)addSource(modelSource(n));}
   for(const id of o.evidenceSourceIds){const v=list(p.coauthoring?.sources).find(s=>s.id===id)?.versions?.at(-1);if(v)evidenceRefs.push(addSource({id:'source:obligation:'+id,kind:'project-source',objectId:id,title:v.title||id,revision:v.revision,versionStamp:changeFingerprint(v),posture:'Exact saved verification evidence revision; the reviewer’s record is not independent runtime proof.',excerpt:JSON.stringify(v),truncated:false}));}
  }
  add({id:'solution:'+c.selected.id+':'+solution.id,kind:'verification',state:stale?'stale':pending.length?'pending':'current-verified',priority:stale?12:pending.length?18:26,severity:pending.length||stale?'attention':'context',title:stale?'Review changed solution support':pending.length?'Verify the applied architecture obligations':'Current obligation verification is recorded',detail:'The applied design records placement and obligations for '+(solution.mechanism?.pattern||'this boundary')+'. '+(stale?'Linked design support or verification evidence changed; review the exact cause.':pending.length?'Its acceptance does not establish an implementation or measured outcome.':'Explicit native delivery actions link current evidence to these exact accepted obligations. This is recorded verification, not independent proof by AIW.'),question:pending[0]?.evidence||pending[0]?.action||'Which current evidence supports this solution?',sourceRefs:unique([...baseRefs,taskSource,...evidenceRefs]),authority:{kind:'reviewed-project-proposal',evaluateFit:false,scoring:false,automaticMutation:false},solutionId:solution.id,obligations:relevant.map(o=>({...obligationRead(o),sourceRefs:unique([taskSource,...evidenceRefs])})),placement:solution.placement,affectedIds:unique([...list(solution.specifications).flatMap(s=>[s.componentId,...list(s.capabilityIds),...list(s.contractIds),...list(s.dataIds)]),...pending.flatMap(o=>list(o.targetIds))]),actions:[action(c,'resume-task','Review the applied proposal',{taskId:solution.taskId}),action(c,'open-record','Review its specification',{tab:'output'})]});
 }
 const questions=architectureQuestions(insights,recordNodes),leading=questions[0];
 if(leading){const host=insights.find(i=>i.id===leading.insightIds[0]),to=leading.target;host.question=leading.question;host.sourceRefs=unique([...host.sourceRefs,...leading.sourceRefs]);const next=action(c,'open-record','Answer this design question',{...to,why:leading.question,...(list(p.interfaces?.data).some(d=>d.id===to.objectId)?{editor:'data'}:{})});host.actions=[next,...host.actions.filter(a=>a.id!==next.id)];}
 insights.sort((a,b)=>a.priority-b.priority||Number(b.id===leading?.insightIds[0])-Number(a.id===leading?.insightIds[0]));
 const take=Math.max(1,Math.min(24,Number(limit)||8)),selected=insights.slice(0,take),usedRefs=new Set(selected.flatMap(i=>[...i.sourceRefs,...i.alternatives.flatMap(a=>a.sourceRefs||[]),...i.interactions.flatMap(e=>e.sourceRefs||[])]));
 for(const ref of baseRefs)usedRefs.add(ref);
 const sourceList=[...sources.values()].filter(s=>usedRefs.has(s.id));
 // Drafting or answering a task does not change the saved architectural basis
 // that suggested it. Only applied tasks supplying these solution obligations
 // are source dependencies; including drafts would invalidate their own origin.
 const appliedTasks=c.tasks.filter(t=>solutions.some(s=>s.taskId===t.id));
 const basis={interpretationRevision:ARCHITECTURE_EVALUATION_REVISION,subject:strip(c.selected),scope:c.scope,drivers:c.drivers.map(d=>strip(d.record)),requirements:c.requirements.map(n=>strip(n.record)),constraints:c.constraints.map(strip),execution:executionBasis.map(strip),verification:obligations.map(o=>({id:o.id,state:o.verificationState,basis:o.verificationBasis?.stamp,actions:o.verificationActions.map(a=>({id:a.id,state:a.state,verification:a.verification})),evidence:o.evidenceRefs})),decisions:c.decisions.map(n=>strip(n.record)),solutions,tasks:appliedTasks.map(t=>({id:t.id,revision:t.revision,status:t.status,basis:t.basis,answers:t.answers,methodReceipt:t.methodReceipt}))};
 const receipt={version:ARCHITECTURE_INTELLIGENCE_VERSION,structureVersion:KNOWLEDGE_STRUCTURE_VERSION,basisStamp:digest(basis),knowledgeStamp:digest({knowledge:releasedKnowledgeStamp(p),loaded:supply.catalogueLoaded,release:supply.releaseId,sourceReceipts:sourceList.filter(s=>s.receipt).map(s=>s.receipt)}),sourceRefs:sourceList.map(s=>s.id),selection:{chapter:c.chapter,id:c.selected.id},prompt,limit:take};
 return {version:ARCHITECTURE_INTELLIGENCE_VERSION,subject:{id:c.selected.id,chapter:c.chapter,title:c.selected.title},scope:c.scope,drivers:c.drivers.map(n=>({id:n.id,title:n.title,kind:n.kind,kindLabel:driverKindOf(n.kind).name,record:strip(n.record),scope:n.scope})),insights:selected,primary:selected[0]||null,questions:questions.filter(q=>q.insightIds.some(id=>selected.some(i=>i.id===id))&&q.sourceRefs.every(id=>usedRefs.has(id))),sources:sourceList,receipt,coverage:{catalogueLoaded:supply.catalogueLoaded,reviewed:hits.filter(h=>h.structure.status==='reviewed').length,descriptive:hits.filter(h=>h.structure.status==='descriptive').length,unavailable:supply.unavailable.length,omitted:Math.max(0,insights.length-selected.length),limits:'Repository relevance and matching predicates do not establish architecture fitness, measured outcomes or approval.'}};
}

// The provider receives only deductions whose complete source basis it is also
// allowed to receive. Removing a citation never leaves its derived prose behind.
export function architectureIntelligenceSource(reading,{sourceIds=null,maxCharacters=3500}={}){
 if(!reading?.receipt)return null;
 const retained=new Set(sourceIds||reading.sources.map(s=>s.id)),available=id=>retained.has(id),complete=refs=>list(refs).length>0&&refs.every(available);
 const eligible=reading.insights.filter(i=>complete(i.sourceRefs));
 const compact=i=>({id:i.id,kind:i.kind,state:i.state,title:i.title,question:i.question,detail:text(i.detail,480),sourceRefs:i.sourceRefs,
  conditions:list(i.conditions).slice(0,3).filter(x=>complete(x.sourceRefs)).map(x=>({text:text(x.text,240),sourceRefs:x.sourceRefs})),checks:list(i.checks).map(x=>({id:x.id,state:x.state,fact:x.fact,...(x.state!=='known'?{detail:text(x.detail,240)}:{})})),
  alternatives:list(i.alternatives).filter(x=>complete(x.sourceRefs)).slice(0,3).map(x=>({id:x.id,title:x.title,state:x.state,sourceRefs:x.sourceRefs})),
  interactions:list(i.interactions).filter(x=>complete(x.sourceRefs)).slice(0,2).map(x=>({from:x.from,to:x.to,kind:x.kind,state:x.state,sourceRefs:x.sourceRefs})),
  // A composed conclusion travels with every verification responsibility and
  // its placement. The whole-insight size gate below can withhold it together.
  ...(i.kind==='composition'?{scope:i.scope,placement:i.placement,...(i.calculations?.length?{calculations:i.calculations}:{})}:{}),
  obligations:list(i.obligations).filter(o=>!o.sourceRefs?.length||complete(o.sourceRefs)).slice(0,i.kind==='composition'?undefined:2).map(o=>({...i.kind==='composition'?{id:o.id,targetIds:list(o.targetIds)}:{},action:text(o.action,240),evidence:text(o.evidence,i.kind==='composition'?1000:240),verification:o.verification||'pending',verificationState:o.verificationState||'open'})),
  actions:list(i.actions).slice(0,1).map(a=>({kind:a.kind,target:a.target,fieldKey:a.fieldKey,taskId:a.taskId,concernId:a.concernId})),authority:i.authority?.kind});
 const kept=eligible.map(compact),drivers=reading.drivers.filter(d=>available('model:'+d.id)).map(d=>({id:d.id,kind:d.kind}));
 const frame=()=>({version:reading.version,subject:available('model:'+reading.subject.id)?reading.subject.id:null,drivers,insights:kept,coverage:{omitted:reading.insights.length-kept.length,catalogueLoaded:reading.coverage.catalogueLoaded,limits:reading.coverage.limits}});
 const bound=Math.max(800,Math.min(12000,Number(maxCharacters)||3500));let excerpt=JSON.stringify(frame());
 while(excerpt.length>bound&&kept.length){kept.pop();excerpt=JSON.stringify(frame());}
 while(excerpt.length>bound&&drivers.length){drivers.pop();excerpt=JSON.stringify(frame());}
 const refs=unique([...(available('model:'+reading.subject.id)?['model:'+reading.subject.id]:[]),...drivers.map(d=>'model:'+d.id),...kept.flatMap(i=>[...i.sourceRefs,...i.alternatives.flatMap(x=>x.sourceRefs),...i.interactions.flatMap(x=>x.sourceRefs)])]);
 return {id:'architecture-intelligence:'+reading.subject.id,kind:'architecture-intelligence',objectId:reading.subject.id,title:'Architecture reasoning for this saved scope',posture:'Derived questions, declared relationships and conditional checks; source authority remains separate from project suitability and verification.',receipt:{version:reading.version,structureVersion:reading.receipt.structureVersion,basisStamp:reading.receipt.basisStamp,knowledgeStamp:reading.receipt.knowledgeStamp,selection:reading.receipt.selection,prompt:reading.receipt.prompt,limit:reading.receipt.limit,sourceRefs:refs},versionStamp:digest([reading.receipt.basisStamp,reading.receipt.knowledgeStamp]),excerpt,truncated:kept.length<reading.insights.length};
}

export function architectureIntelligenceCurrent(p,source){
 if(source?.kind!=='architecture-intelligence'||source.receipt?.version!==ARCHITECTURE_INTELLIGENCE_VERSION||source.receipt?.structureVersion!==KNOWLEDGE_STRUCTURE_VERSION)return false;
 try{const current=architectureIntelligence(p,source.receipt.selection,{prompt:source.receipt.prompt||'',limit:source.receipt.limit||8});return source.receipt.basisStamp===current.receipt.basisStamp&&source.receipt.knowledgeStamp===current.receipt.knowledgeStamp;}catch{return false;}
}
