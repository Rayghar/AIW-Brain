// Typed exploration uses the saved generation and existing chapter workflows.
// These proposals never allocate canonical IDs or execute model commands.
import {EXECUTION_FIELDS} from './composition-manifest.js';
import {resultReadContext} from './result-read-context.js';
import {executionJourney,contractExecutionContext,executionMethodSource} from './architecture-applicability.js';
export const ARCHITECTURE_OPERATION_KINDS=Object.freeze({
 responsibility:{chapter:4,label:'Responsibility design'},
 interaction:{chapter:8,label:'Interface and interaction design'},
 'information-consistency':{chapter:8,label:'Information and consistency design'},
 recovery:{chapter:10,label:'Recovery and runtime design'},
 security:{chapter:9,label:'Security design'},
 technology:{chapter:7,label:'Technology product comparison'},
 deployment:{chapter:10,label:'Deployment and runtime design'}
});
const list=v=>Array.isArray(v)?v:[],unique=v=>[...new Set(v)],record=n=>n?.record||n;
export function architectureOperationContract(context,packet){
 const nodes=unique([context.selected,...list(context.requirements),...list(context.drivers),...list(context.decisions),...list(context.neighbours),...list(context.constraints)].filter(Boolean));
 const supplied=new Set(packet.sources.filter(s=>s.kind==='model').map(s=>s.objectId));
 const available=nodes.filter(n=>supplied.has(n.id)),requirementIds=unique(list(context.requirements).map(n=>n.id).filter(id=>supplied.has(id))),qualityScenarioIds=unique(list(context.drivers).map(n=>n.id).filter(id=>supplied.has(id)));
 const requirementId=packet.request.requirementId||requirementIds[0]||null;
 return {version:1,optionIds:['O1','O2','O3'],kinds:Object.keys(ARCHITECTURE_OPERATION_KINDS),requirementIds,qualityScenarioIds,objectIds:unique(available.map(n=>n.id)),
  requirementRefs:requirementIds.map(id=>({id,ref:packet.sources.find(s=>s.kind==='model'&&s.objectId===id)?.ref})),
  destinations:Object.entries(ARCHITECTURE_OPERATION_KINDS).map(([kind,d])=>({kind,...d,objectId:available.find(n=>(n.chapter||record(n).chapter)===d.chapter)?.id||null,requirementId,stage:'work'})),
  canPropose:packet.criticalContext?.complete!==false&&requirementIds.length>0,maxOptions:3,maxOperations:6,
  authority:'Unselected architecture proposals, not current model objects, recommendations, approvals or measured results. Proposed object names have no canonical IDs. Continue in the named chapter workflow; every model change requires its normal architect review.'};
}
const str={type:'string'},obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false}),strings=(max=4,min=0)=>({type:'array',minItems:min,maxItems:max,items:str}),ids=(values,max=8,min=0)=>({type:'array',minItems:min,maxItems:max,items:{type:'string',enum:values.length?values:['none']}});
export function architectureOperationsSchema(packet){const c=packet.architectureOperations,refs=packet.sources.map(s=>s.ref);return {type:'array',minItems:c.canPropose?1:0,maxItems:c.canPropose?6:0,items:obj({
 id:{type:'string',enum:['OP1','OP2','OP3','OP4','OP5','OP6']},optionId:{type:'string',enum:c.optionIds},optionTitle:str,kind:{type:'string',enum:c.kinds},title:str,intent:str,mechanism:str,selectedSourceRef:{type:'string',enum:['S1']},
 requirementIds:ids(c.requirementIds,8,1),affectedObjectIds:ids(c.objectIds,8,1),proposedObjects:strings(3),
 qualityEffects:{type:'array',maxItems:c.qualityScenarioIds.length?4:0,items:obj({scenarioId:{type:'string',enum:c.qualityScenarioIds.length?c.qualityScenarioIds:['none']},effect:{type:'string',enum:['supports','harms','trade-off','unknown']},basis:str})},
 conditions:strings(),tradeoffs:strings(),obligations:strings(),verification:obj({steps:strings(4,1),passCriteria:strings(4,1)}),reconsiderWhen:strings(),sourceRefs:ids(refs,22,1),assumptions:strings()
 })};}
export function validateArchitectureOperations(raw,packet){
 const contract=packet.architectureOperations;if(!contract||!Array.isArray(raw)||raw.length>6||(!contract.canPropose&&raw.length))throw Error('Architecture operations need complete permitted requirement context and at most six proposals.');
 const expected=Object.keys(architectureOperationsSchema(packet).items.properties).sort().join(','),seen=new Set(),groups=new Map(),knownRefs=new Set(packet.sources.map(s=>s.ref));
 const text=(v,n,label)=>{if(typeof v!=='string'||!v.trim()||v.length>n)throw Error('Keep '+label+' nonempty and within its review limit.');return v.trim();};
 const texts=(v,max,label)=>{if(!Array.isArray(v)||v.length>max)throw Error('Keep '+label+' within its review limit.');return v.map(x=>text(x,500,label));};
 const selected=(v,allowed,label,{required=false,max=8}={})=>{if(!Array.isArray(v)||v.length>max||(required&&!v.length)||v.some(id=>typeof id!=='string'||!allowed.includes(id)))throw Error('An architecture operation names an unknown or omitted '+label+'.');return unique(v);};
 return raw.map(o=>{
  if(!o||typeof o!=='object'||Object.keys(o).sort().join(',')!==expected||!/^OP[1-6]$/.test(o.id)||seen.has(o.id)||!contract.optionIds.includes(o.optionId)||!contract.kinds.includes(o.kind))throw Error('An architecture operation has an unsupported identity, kind or structure.');seen.add(o.id);
  const optionTitle=text(o.optionTitle,160,'option title');if(groups.has(o.optionId)&&groups.get(o.optionId)!==optionTitle)throw Error('Use one consistent title for each architecture option.');groups.set(o.optionId,optionTitle);
  // The mandatory selected-object citation is an explicit provider field, not
  // a server-invented citation. Additional evidence stays in sourceRefs.
  if(o.selectedSourceRef!=='S1'||!knownRefs.has(o.selectedSourceRef))throw Error('Each operation must explicitly cite the selected object.');
  const requirementIds=selected(o.requirementIds,contract.requirementIds,'requirement',{required:true}),affectedObjectIds=selected(o.affectedObjectIds,contract.objectIds,'affected object',{required:true}),sourceRefs=unique([o.selectedSourceRef,...selected(o.sourceRefs,[...knownRefs],'source',{required:true,max:22})]);
  if(!sourceRefs.includes('S1')||requirementIds.some(id=>!sourceRefs.includes(contract.requirementRefs.find(r=>r.id===id)?.ref)))throw Error('Each operation must cite the selected object and every requirement it claims to serve.');
  if(!Array.isArray(o.qualityEffects)||o.qualityEffects.length>4)throw Error('Keep quality effects bounded to the supplied scenarios.');
  const qualityEffects=o.qualityEffects.map(e=>{if(!e||Object.keys(e).sort().join(',')!=='basis,effect,scenarioId'||!contract.qualityScenarioIds.includes(e.scenarioId)||!['supports','harms','trade-off','unknown'].includes(e.effect))throw Error('An architecture operation uses an unknown quality scenario or effect.');const ref=packet.sources.find(s=>s.kind==='model'&&s.objectId===e.scenarioId)?.ref;if(!sourceRefs.includes(ref))throw Error('Cite the actual quality scenario for each proposed effect.');return {...e,basis:text(e.basis,500,'quality-effect basis')};});
  if(!o.verification||Object.keys(o.verification).sort().join(',')!=='passCriteria,steps')throw Error('Provide proposed verification steps and observable pass criteria.');
  const verification={steps:texts(o.verification.steps,4,'verification steps'),passCriteria:texts(o.verification.passCriteria,4,'verification pass criteria')};if(!verification.steps.length||!verification.passCriteria.length)throw Error('An architecture operation needs a proposed verification procedure and observable pass criteria.');
  return {id:o.id,optionId:o.optionId,optionTitle,kind:o.kind,title:text(o.title,160,'operation title'),intent:text(o.intent,900,'operation intent'),mechanism:text(o.mechanism,1200,'mechanism'),requirementIds,affectedObjectIds,proposedObjects:texts(o.proposedObjects,3,'proposed object names'),qualityEffects,conditions:texts(o.conditions,4,'conditions'),tradeoffs:texts(o.tradeoffs,4,'trade-offs'),obligations:texts(o.obligations,4,'obligations'),verification,reconsiderWhen:texts(o.reconsiderWhen,4,'change triggers'),sourceRefs,assumptions:texts(o.assumptions,4,'assumptions'),status:'proposed'};
 });
}

// Continuation is a typed native draft. The operation remains an immutable
// source, while the architect chooses the exact record and edits these fields.
// Names in proposedObjects are never treated as IDs or matched by title.
const field=(key,label,choices=null)=>({key,label,...(choices?{choices}:{} )});
const base=[field('title','Name'),field('purpose','Purpose'),field('owner','Accountable owner')];
const outcomeFields=EXECUTION_FIELDS.filter(f=>['outcome','read','caller'].includes(f.group)||['environmentId','completion','discovery','outcomeAuthorityId'].includes(f.key)).map(f=>({...field('execution.'+f.key,f.label,f.options?f.options.map(o=>o[0]):f.key==='environmentId'?'environments':['outcomeContractId','invocationParentId'].includes(f.key)?'contracts':f.key==='outcomeAuthorityId'?'participants':f.key==='outcomeReadTaskId'?'readTasks':null),group:['read','caller'].includes(f.group)?f.group:f.key==='environmentId'?'caller':'outcome',...(f.options?{labels:Object.fromEntries(f.options)}:{}),...(f.type==='number'?{type:f.type,min:f.min,max:f.max,integer:f.integer}:{})}));
export const OPERATION_DRAFTS=Object.freeze({
 responsibility:{type:'logical.responsibility',noun:'responsibility',fields:[...base,field('boundary','Owned behaviour and exclusions')]},
 interaction:{type:'interfaces.contract',noun:'contract',fields:[...base,field('from','Caller / publisher','participants'),field('to','Receiver','participants'),field('kind','Interaction style',['request','event','batch']),field('operation','Operation and outcome'),field('protocol','Protocol'),field('duplicatePolicy','Duplicate handling'),field('timeoutPolicy','Timeout meaning'),field('retryPolicy','Retry conditions'),field('failurePolicy','Failure response'),...[field('contractVersion','Contract version'),field('correlationKey','Correlation key'),field('requestDataIds','Request / event dictionaries','data'),field('responseDataIds','Response dictionaries','data')].map(f=>({...f,group:'payload'})),...outcomeFields]},
 'information-consistency':{type:'interfaces.invariant',noun:'information invariant',fields:[field('title','Name'),field('owner','Accountable owner'),field('dataIds','Data definitions constrained','data'),field('contractIds','Contracts enforcing this condition','contracts'),field('kind','Invariant kind',['balance','uniqueness','ordering','completeness','other']),field('condition','Condition that must remain true'),field('check','Enforcement boundary and proposed verification')]},
 security:{type:'security.control',noun:'control',fields:[...base,field('category','Control category',['Identity & access','Transaction integrity','Data protection','Service trust','Detection & audit','Secrets & keys','Recovery & availability','Dual control & segregation of duties']),field('targetIds','Protected objects','securityTargets'),field('threatIds','Related threats','threats'),field('enforcement','Enforcement point'),field('mechanism','Protection mechanism'),field('failureMode','Failure posture',['Deny or contain','Detect and respond','Explicit exception']),field('failureResponse','Response when enforcement is unavailable'),field('verificationPlan','Proposed verification')]},
 technology:{type:'techrealisation.plan',noun:'realization and product option',fields:[...base,field('capabilityId','Capability implemented by a new realization','capabilities'),field('optionTargetId','Product option to develop','options'),field('optionTitle','Option name'),field('product','Product or service'),field('version','Version / service tier'),field('operatingModel','Operating model',['Self managed','Provider managed','Shared group service']),field('topology','Proposed topology'),field('benefits','Expected benefits and mechanism'),field('drawbacks','Trade-offs and limitations'),field('specEvidence','Configuration evidence or verification plan')]},
 recovery:{type:'runtime.plan',noun:'runtime recovery plan',fields:[...base,field('environmentId','Environment for a new plan','environments'),field('assetId','Application or realization for a new plan','assets'),field('stateMode','State model',['Stateless process','Stateful service','Provider managed']),field('recoveryStrategy','Recovery strategy',['Restart','Failover','Restore','Provider recovery']),field('recoveryPlan','Recovery sequence and authoritative outcome'),field('fencing','Protection against simultaneous writers'),field('backupPlan','Backup and restoration obligations'),field('readiness','Ready-to-serve checks'),field('runbook','Operating response and escalation')]},
 deployment:{type:'runtime.plan',noun:'deployment plan',fields:[...base,field('environmentId','Environment for a new plan','environments'),field('assetId','Application or realization for a new plan','assets'),field('stateMode','State model',['Stateless process','Stateful service','Provider managed']),field('rollout','Release and deployment sequence'),field('rollback','Rollback conditions and procedure'),field('readiness','Ready-to-serve checks'),field('runbook','Operating response and escalation'),field('placementId','Placement to develop','placements'),field('zoneId','Hosting zone','zones'),field('role','Capacity role',['active','standby']),field('replicas','Planned replicas'),field('capacityBasis','Capacity assumptions and basis')]}
});
export const OPERATION_REQUIRED=Object.freeze({responsibility:['purpose','boundary'],interaction:['purpose','from','to','kind','operation'],'information-consistency':['dataIds','kind','condition','check'],security:['purpose','targetIds','category','enforcement','mechanism','failureMode','failureResponse','verificationPlan'],technology:['purpose','optionTargetId','optionTitle','product','operatingModel'],recovery:['purpose','stateMode','recoveryStrategy','recoveryPlan','runbook'],deployment:['purpose','stateMode','rollout','rollback','readiness','runbook']});
export function operationDraftNeeds(t){const kind=t.operation.kind,v=t.answers,keys=['targetId','title','owner','scopeNote','rationale',...OPERATION_REQUIRED[kind],...(v.targetId==='new'?(kind==='technology'?['capabilityId']:['recovery','deployment'].includes(kind)?['environmentId','assetId']:[]):[]),...(kind==='deployment'&&v.placementId?['zoneId','role','replicas']:[])];return keys.filter(k=>!v[k]?.length);}
export function operationRecords(p,kind){return ({responsibility:p.logical?.responsibilities,interaction:p.interfaces?.contracts,'information-consistency':p.interfaces?.invariants,security:p.security?.controls,technology:p.technologyRealisation?.records,recovery:p.runtime?.plans,deployment:p.runtime?.plans})[kind]||[];}
// A saved option is coordinated through its existing native tasks. Membership is
// the exact saved run/option/operation tuple; titles never establish a link.
export function operationGroupMembers(p,t){
 const g=t?.operationGroup;if(!g)return t?[t]:[];
 if(g.runId!==t.generation?.runId||g.optionId!==t.operation?.optionId||!Array.isArray(g.taskIds)||g.taskIds.length<2||g.taskIds.length>6||new Set(g.taskIds).size!==g.taskIds.length||g.operationIds?.length!==g.taskIds.length)throw Error('This coordinated option has an invalid saved identity.');
 return g.taskIds.map((id,i)=>{const m=p.coauthoring?.designTasks?.find(x=>x.id===id);if(!m||m.kind!=='operation'||m.generation?.runId!==g.runId||m.operation.optionId!==g.optionId||m.operation.id!==g.operationIds[i]||JSON.stringify(m.operationGroup)!==JSON.stringify(g))throw Error('A related operation is missing or belongs to another saved option.');return m;});
}
export function operationDependencies(t,answers=t.answers){
 const refs=OPERATION_DRAFTS[t.operation.kind].fields.filter(f=>typeof f.choices==='string').flatMap(f=>list(Array.isArray(answers[f.key])?answers[f.key]:[answers[f.key]]));
 return unique([...list(t.operationDependencies),...refs.filter(id=>typeof id==='string'&&id.startsWith('draft:')).map(id=>id.slice(6))]);
}
export function operationReferenceLists(p,answers={},task=null){
 const target=operationRecords(p,'deployment').find(r=>r.id===answers.targetId),environmentId=target?.environmentId||answers.environmentId,realization=operationRecords(p,'technology').find(r=>r.id===answers.targetId);
 const participants=[...list(p.realisation?.components),...list(p.technologyRealisation?.records),...list(p.interfaces?.parties)];
 const result={participants,readTasks:list(p.coauthoring?.designTasks).filter(t=>t.kind==='architecture'&&t.topic==='reads'&&t.status==='applied'&&t.applied),data:list(p.interfaces?.data),contracts:list(p.interfaces?.contracts).filter(r=>r.id!==answers.targetId),threats:list(p.security?.threats),capabilities:list(p.technology?.capabilities),environments:list(p.runtime?.environments),assets:participants.filter(r=>!list(p.interfaces?.parties).some(x=>x.id===r.id)),securityTargets:[...participants.filter(r=>!list(p.interfaces?.parties).some(x=>x.id===r.id)),...list(p.technology?.capabilities),...list(p.technology?.boundaries),...list(p.interfaces?.contracts),...list(p.interfaces?.data)],options:realization?.options||[],placements:list(p.runtime?.placements).filter(x=>x.planId===target?.id).map(x=>({...x,title:[x.role,x.replicas,'replicas',x.zoneId].join(' ')})),zones:list(p.runtime?.zones).filter(x=>x.environmentId===environmentId)};
 if(task?.operationGroup)for(const m of operationGroupMembers(p,task).filter(m=>m.id!==task.id)){
  const r={id:'draft:'+m.id,ref:'Proposed '+m.operation.id,title:m.answers.title||m.operation.title,draft:{taskId:m.id,runId:m.generation.runId,operationId:m.operation.id,kind:m.operation.kind}};
  const lists=m.operation.kind==='technology'?['participants','assets','securityTargets']:m.operation.kind==='interaction'?['contracts','securityTargets']:[];
  for(const key of lists)result[key]=[...result[key],r];
 }return result;
}
export function operationContext(p,kind,answers={},task=null){
 const target=operationRecords(p,kind).find(r=>r.id===answers.targetId)||null,refs=operationReferenceLists(p,answers,task),ids=unique(Object.entries(answers).filter(([k])=>(/Ids?$/.test(k)||['from','to'].includes(k))&&!['targetId','optionTargetId','placementId'].includes(k)).flatMap(([,v])=>Array.isArray(v)?v:[v]).filter(Boolean));
 const readId=kind==='interaction'?(Object.hasOwn(answers,'execution.outcomeReadTaskId')?answers['execution.outcomeReadTaskId']:target?.execution?.outcomeReadTaskId):null;
 const parentId=kind==='interaction'?(Object.hasOwn(answers,'execution.invocationParentId')?answers['execution.invocationParentId']:target?.execution?.invocationParentId):null,parent=list(p.interfaces?.contracts).find(c=>c.id===parentId),journey=kind==='interaction'?executionJourney(p,parentId||target?.id,{assess:false}):null;
 return {target,refs:ids.map(id=>{const r=Object.values(refs).flat().find(r=>r.id===id);return {id,record:r?.draft?{draft:r.draft}:r||null};}),...(parent||journey?{invocation:{parent:parent?contractExecutionContext(p,parent):null,journey,method:executionMethodSource(p,{journey:true})?.receipt||null}}:{}),...(readId?{resultRead:resultReadContext(p,readId)}:{}),...(kind==='technology'?{mappings:list(p.technologyRealisation?.mappings).filter(m=>m.realizationId===target?.id)}:{}),...(kind==='deployment'?{placements:list(p.runtime?.placements).filter(x=>x.planId===target?.id)}:{})};
}
