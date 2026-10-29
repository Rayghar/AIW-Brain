import {previewArchitectureDesign,architecturePreviewStamp} from './architecture-design.js';
import {receiptCurrent} from './aiw-brain.js';
import {previewSecurityDesign,securityDesignStamp} from './security-design.js';
import {previewExchange,exchangeStamp} from './exchange-design.js';
import {applyLogicalCommand,logicalGraph} from './logical-domain.js';
import {applyRealisationCommand} from './realisation-domain.js';
import {applyTechnologyCommand,TECHNOLOGY_CATEGORIES} from './technology-domain.js';
import {applyTechnologyRealisationCommand} from './technology-realisation-domain.js';
import {applyInterfacesCommand} from './interfaces-domain.js';
import {applySecurityCommand} from './security-domain.js';
import {applyRuntimeCommand} from './runtime-domain.js';
import {ARCHITECTURE_OPERATION_KINDS,OPERATION_DRAFTS,OPERATION_REQUIRED,operationRecords,operationReferenceLists,operationContext,operationGroupMembers,operationDependencies} from './architecture-operations.js';
import {modelEditSnapshot,modelImpactSource,modelLinkedItems,modelFindingDelta} from './model-impact.js';
import {changeFingerprint,changeTargetStamp} from './changes-domain.js';
import {designBasisCurrent,designTask} from './design-task-state.js';

const clone=v=>structuredClone(v),text=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'',equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const DESIGN_QUESTIONS=[
 {id:'boundary',method:'CMP-01 / CMP-02 / CMP-04',title:'What should this responsibility own?',why:'Use the required outcome to set a boundary and keep unrelated change outside it.',fields:[['boundary','Owned behaviour and the change this boundary should contain'],['exclusions','What must remain outside this boundary?']]},
 {id:'information',method:'CMP-07 / CMP-08 / CMP-09',title:'What happens when the outcome is uncertain?',why:'Information authority, interaction semantics and failure behaviour determine whether the boundary works.',fields:[['information','Authoritative information, readers and writers'],['interaction','If responsibilities are separated, how should they interact?'],['failure','Rejection, timeout, repetition and recovery behaviour']]},
 {id:'ownership',method:'CMP-06',title:'Who can own this design?',why:'Requirement ownership is shown as context. Confirm the team that can own this implementation.',fields:[['owner','Accountable implementation owner (or explicitly state Unassigned)']]},
 {id:'support',method:'CMP-14',title:'What support does the application require?',why:'Describe a vendor-neutral capability and its trust boundary before choosing a product.',fields:[['category','Capability category'],['support','Capability purpose and the application obligation it supports'],['boundaryId','Existing trust boundary'],['trustName','Proposed trust boundary name'],['trustPolicy','Proposed boundary policy and access expectations']]},
 {id:'operations',method:'CMP-09 / CMP-13',title:'What must the operating plan explain?',why:'Keep assumptions and implementation obligations visible through the SDD.',fields:[['operations','Operating and recovery obligations'],['unknowns','Unresolved questions, evidence or assumptions']]}
];
export const DESIGN_APPROACHES=[
 {id:'cohesive',title:'Cohesive application boundary',prerequisites:'The behaviour, information authority and recovery can share one accountable application boundary.',benefits:'Keeps the primary responsibility and its coordination together, with fewer cross-boundary interactions.',tradeoffs:'Shared ownership and change cadence; separate scaling or recovery may be harder.',failure:'A failure in the shared boundary can affect both processing and coordination.',avoid:'Grouping unrelated responsibilities only to reduce the number of components.'},
 {id:'separate',title:'Separate coordination boundary',prerequisites:'A distinct coordination role, an agreed interaction and an accountable owner for cross-boundary recovery.',benefits:'Makes coordination ownership and recovery explicit and allows the boundary to evolve independently.',tradeoffs:'Adds an interaction, state agreement, operational ownership and reconciliation obligations.',failure:'The two sides can disagree after a timeout or partial completion; an authoritative outcome must remain identifiable.',avoid:'Treating a separate service as an automatic integrity or availability guarantee.'}
];
export function designAnswers(raw){return Object.fromEntries(DESIGN_QUESTIONS.flatMap(q=>q.fields).map(([key])=>[key,text(raw?.[key],['owner','trustName'].includes(key)?180:4000)]));}
export function designMissing(p,t){const a=t.answers,missing=[];for(const q of DESIGN_QUESTIONS){const keys=q.fields.map(([k])=>k).filter(k=>!['unknowns','boundaryId','trustName','trustPolicy'].includes(k));if(keys.some(k=>!a[k])||(q.id==='information'&&!['sync','event','data'].includes(a.interaction))||(q.id==='support'&&(!TECHNOLOGY_CATEGORIES.some(([id])=>id===a.category)||(!a.boundaryId&&(!a.trustName||!a.trustPolicy)))))missing.push(q);}return missing;}
export function designNext(p,t){if(t.status==='applied')return designBasisCurrent(p,t)?'Inspect the accepted design and its remaining chapter findings.':'Review the changed sources against the accepted design.';if(!designBasisCurrent(p,t))return 'Review the updated source records before continuing.';if(t.kind==='operation')return 'Shape the selected operation in its native fields, then review the complete model change.';return designMissing(p,t)[0]?.title||'Compare the two boundary approaches and record your reasoning.';}
const lists=(p,type)=>({'logical.responsibility':p.logical.responsibilities,'realisation.component':p.realisation.components,'technology.capability':p.technology.capabilities,'techrealisation.plan':p.technologyRealisation.records,'technology.boundary':p.technology.boundaries}[type]||[]);
export const designRecordList=lists;
const specFields=['reuseId','title','purpose','boundary','owner','rationale','inputs','outputs','operationsPlan','policy'];
export function cleanDesignSpec(raw){const out={approach:raw?.approach,records:{}};if(!DESIGN_APPROACHES.some(a=>a.id===out.approach))throw Error('Choose a supported boundary approach.');for(const [key,r]of Object.entries(raw?.records||{})){if(!['responsibility','component','coordination','coordinator','capability','realization','trust'].includes(key))throw Error('Unknown proposed record.');out.records[key]=Object.fromEntries(specFields.map(k=>[k,text(r?.[k],k==='title'?160:k==='reuseId'?100:4000)]));}return out;}
export function draftDesignSpec(p,t,approach){
 const a=t.answers,r=t.basis.requirement,linked=p.logical.responsibilities.filter(x=>x.requirementIds.includes(r.id)),lr=linked.length===1?linked[0]:null,alloc=p.logical.mappings.filter(m=>m.logicalId===lr?.id),app=alloc.length===1?p.realisation.components.find(c=>c.id===alloc[0].physicalId):null;
 const support=p.technology.needs.filter(n=>n.applicationId===app?.id&&n.category===a.category),maps=p.technology.mappings.filter(m=>support.some(n=>n.id===m.needId)),caps=[...new Set(maps.map(m=>m.capabilityId))],cap=caps.length===1?p.technology.capabilities.find(c=>c.id===caps[0]):null,realizations=p.technologyRealisation.mappings.filter(m=>m.capabilityId===cap?.id),real=realizations.length===1?p.technologyRealisation.records.find(x=>x.id===realizations[0].realizationId):null;
 const title=r.title,owner=a.owner.toLowerCase()==='unassigned'?'':a.owner,common={owner,rationale:'Proposed from '+r.id+' and the architect’s saved boundary answers.'},reuse=(obj,proposed)=>({...proposed,reuseId:obj?.id||''}),records={
  responsibility:reuse(lr,{...common,title,purpose:r.description,boundary:a.boundary+'\nExcludes: '+a.exclusions}),
  component:reuse(app,{...common,title:title+' application',purpose:r.description,boundary:a.boundary+'\nExcludes: '+a.exclusions,inputs:a.information,outputs:r.acceptance}),
  capability:reuse(cap,{...common,title:(TECHNOLOGY_CATEGORIES.find(([id])=>id===a.category)?.[1]||'Support')+' for '+title,purpose:a.support,boundary:a.support}),
  realization:reuse(real,{...common,title:'Operating plan for '+title,purpose:a.support,operationsPlan:a.operations}),
  trust:reuse(p.technology.boundaries.find(b=>b.id===(cap?.boundaryId||a.boundaryId)),{title:a.trustName,policy:a.trustPolicy,owner:a.owner})
 };
 if(approach==='separate'){records.coordination={...common,title:'Coordinate '+title,purpose:'Proposed coordination of the recorded outcome and recovery obligations.',boundary:a.failure+'\nInformation authority: '+a.information};records.coordinator={...common,title:title+' coordinator',purpose:records.coordination.purpose,boundary:records.coordination.boundary,inputs:a.information,outputs:r.acceptance};}
 return cleanDesignSpec({approach,records});
}
// Offer exact saved definitions as optional input; the architect chooses to use them.
export function designHints(p,t){
 const rs=p.logical.responsibilities.filter(r=>r.requirementIds.includes(t.requirementId)),lr=rs.length===1?rs[0]:null,maps=p.logical.mappings.filter(m=>m.logicalId===lr?.id),app=maps.length===1?p.realisation.components.find(c=>c.id===maps[0].physicalId):null,needs=p.technology.needs.filter(n=>n.applicationId===app?.id&&(!t.answers.category||n.category===t.answers.category)),capIds=[...new Set(p.technology.mappings.filter(m=>needs.some(n=>n.id===m.needId)).map(m=>m.capabilityId))],cap=capIds.length===1?p.technology.capabilities.find(c=>c.id===capIds[0]):null,realMaps=p.technologyRealisation.mappings.filter(m=>m.capabilityId===cap?.id),real=realMaps.length===1?p.technologyRealisation.records.find(r=>r.id===realMaps[0].realizationId):null;
 return [['boundary',lr?.boundary,lr],['information',app?.inputs,app],['owner',app?.owner,app],['category',cap?.category,cap],['support',cap?.purpose,cap],['boundaryId',cap?.boundaryId,cap],['operations',real?.operationsPlan,real],['failure',real?.resiliencePlan,real]].filter(([,v,r])=>v&&r).map(([field,value,r])=>({field,value,ref:r.ref||r.id,title:r.title}));
}
const types={responsibility:'logical.responsibility',coordination:'logical.responsibility',component:'realisation.component',coordinator:'realisation.component',capability:'technology.capability',realization:'techrealisation.plan',trust:'technology.boundary'};
const chapterFor=type=>type.startsWith('logical.')?4:type.startsWith('realisation.')?5:type.startsWith('technology.')?6:7;
const linkSnapshot=(p,id)=>logicalGraph(p).edges.filter(e=>e.from===id||e.to===id).map(e=>({from:e.from,to:e.to,label:e.label}));
export const designPreviewStamp=(p,alternative)=>alternative.design?.family==='architecture'?architecturePreviewStamp(p,alternative):alternative.design?.family==='security'?securityDesignStamp(p,alternative):alternative.design?.family==='exchange'?exchangeStamp(p,alternative):changeFingerprint([p.id,p.contentVersion,...['quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime'].map(k=>p[k]?.version),alternative.design,alternative.designBasis,alternative.revision,...(alternative.design?.family==='operation-group'?[alternative.design.members.map(m=>{const t=designTask(p,m.taskId);return [t?.id,t?.revision,t?.status];})]:[])]);
export function previewDesignAlternative(input,alternative,at=new Date().toISOString()){
 if(alternative.design?.family==='operation-group')return previewOperationGroup(input,alternative,at);
 if(alternative.design?.family==='operation')return previewOperationDesign(input,alternative,at);
 if(alternative.design?.family==='architecture')return previewArchitectureDesign(input,alternative,at);
 if(alternative.design?.family==='security')return previewSecurityDesign(input,alternative,at);
 if(alternative.design?.family==='exchange')return previewExchange(input,alternative,at);
 if(alternative.knowledge?.some(r=>!receiptCurrent(r)))throw Error('The knowledge release changed. Prepare a new design proposal using the current knowledge basis.');
 const spec=cleanDesignSpec(alternative.design),t=designTask(input,alternative.taskId);if(!t)throw Error('The source design task is unavailable.');
 const sourceTask={...t,basis:alternative.designBasis,sourceReview:null};if(!designBasisCurrent(input,sourceTask))throw Error('The requirement, drivers, decisions or cited source changed. Review the source changes in Sol first.');
 if(t.status==='applied'){return {document:input,commands:[],changes:[],fields:[],items:[],findings:{introduced:[],resolved:[],existing:0},signals:[],conflicts:[],satisfied:[],appliedTask:true};}
 if(t.status==='dismissed')throw Error('This design task was set aside. Its reasoning remains available.');
 const a=alternative.designAnswers||t.answers,basis=alternative.designBasis,req=basis.requirement,source='Guided design '+t.id+' · '+req.id+' · '+(req.source||'Saved requirement; source evidence remains to be confirmed'),used={},executed=[],graphBefore=logicalGraph(input);let p=clone(input);
 const run=(type,payload)=>{const fn=type.startsWith('logical.')?applyLogicalCommand:type.startsWith('realisation.')?applyRealisationCommand:type.startsWith('technology.')?applyTechnologyCommand:applyTechnologyRealisationCommand,r=fn(p,{type,payload},at);p=r.document;executed.push({type,payload:clone(payload)});return r.selected;};
 const define=(slot,payload)=>{const type=types[slot],r=spec.records[slot];if(!r)throw Error('The '+slot+' proposal is missing.');let id=r.reuseId;if(id){if(!lists(p,type).some(x=>x.id===id))throw Error('The reused '+slot+' was removed. Choose a current record.');}else{if(!r.title)throw Error('Name the proposed '+slot+'.');if(lists(p,type).some(x=>x.title.toLocaleLowerCase()===r.title.toLocaleLowerCase()))throw Error('A '+slot+' with this name already exists. Reuse it or choose a distinct name.');id=run(type,{...payload,...r,id:undefined});const rec=lists(p,type).find(x=>x.id===id);if(rec)rec.origin='suggestion';}used[slot]={id,type};return id;};
 const decisionIds=basis.decisions.map(d=>d.id),driverIds=basis.drivers.map(d=>d.id);
 const logical=slot=>{const id=define(slot,{source,requirementIds:[req.id],decisionIds,confirmed:false});const r=p.logical.responsibilities.find(x=>x.id===id);if(!r.requirementIds.includes(req.id)){run('logical.responsibility',{id,...modelEditSnapshot(p,{type:'logical.responsibility',payload:{id}}),requirementIds:[...r.requirementIds,req.id],confirmed:false});}return id;};
 const lr=logical('responsibility'),coord=spec.approach==='separate'?logical('coordination'):null;if(coord===lr)throw Error('Separate coordination needs a distinct responsibility.');
 const appFor=(slot,logicalId)=>{const id=define(slot,{kind:'service',status:'candidate',source,technologyNeeds:a.support,assumptions:a.unknowns,assumptionsResolved:false,patternKey:'guided-design',allocations:[{logicalId,scope:spec.records[slot].boundary}]});if(!input.realisation.components.some(c=>c.id===id)&&!p.technology.knownApplications.includes(id))p.technology.knownApplications.push(id);if(!p.logical.mappings.some(m=>m.logicalId===logicalId&&m.physicalId===id))run('logical.mapping',{logicalId,physicalId:id,scope:spec.records[slot].boundary,owner:spec.records[slot].owner,evidence:source,status:'candidate'});return id;};
 const app=appFor('component',lr),coordinator=coord?appFor('coordinator',coord):null;if(coordinator===app)throw Error('Separate coordination needs a distinct application component.');
 if(coord){if(!p.logical.connections.some(e=>e.from===lr&&e.to===coord))run('logical.connection',{from:lr,to:coord,label:'coordinates outcome with',kind:'flow',condition:a.failure});if(!p.realisation.connections.some(e=>e.from===app&&e.to===coordinator))run('realisation.interaction',{from:app,to:coordinator,label:'coordinates outcome with',interaction:a.interaction,condition:'Proposed interaction; agree its contract before implementation.',failure:a.failure});}
 const reusedCap=p.technology.capabilities.find(c=>c.id===spec.records.capability?.reuseId);
 if(reusedCap?.boundaryId&&spec.records.trust?.reuseId!==reusedCap.boundaryId)throw Error('A reused capability keeps its saved trust boundary. Select that boundary or propose a new capability.');
 const boundary=define('trust',{owner:spec.records.trust?.owner,policy:spec.records.trust?.policy});
 const supported=coordinator||app,prior=p.technology.needs.filter(n=>n.applicationId===supported),sameNeed=prior.find(n=>n.category===a.category);let need=sameNeed;
 if(!need){const retained=clone(prior);run('technology.needs',{applicationId:supported,boundaryId:p.technology.applicationBoundaries[supported]||boundary,confirmed:false,needs:[...prior,{category:a.category,description:a.support,criticality:'essential'}]});for(const old of retained){const i=p.technology.needs.findIndex(n=>n.id===old.id);if(i>=0)p.technology.needs[i]=old;}need=p.technology.needs.find(n=>n.applicationId===supported&&n.category===a.category);}
 const cap=define('capability',{category:a.category,status:'candidate',source,boundaryId:boundary,driverIds,decisionIds,assumptions:a.unknowns,assumptionsResolved:false,continuity:'single',recoveryPlan:a.failure,recoveryOwner:a.owner==='Unassigned'?'':a.owner,recoveryMinutes:'',lossMinutes:'',targetsConfirmed:false,mappings:[{needId:need.id,scope:a.support}]});
 const capability=p.technology.capabilities.find(c=>c.id===cap);if(capability.category!==a.category)throw Error('The reused capability must match the selected support category.');
 if(!p.technology.mappings.some(m=>m.capabilityId===cap&&m.needId===need.id)){const snap=modelEditSnapshot(p,{type:'technology.capability',payload:{id:cap}});run('technology.capability',{id:cap,...snap,status:snap.status==='reviewed'?'candidate':snap.status,mappings:[...snap.mappings,{needId:need.id,scope:a.support}]});}
 const real=define('realization',{source,origin:'suggestion',dataPlan:a.information,resiliencePlan:a.failure,assumptions:a.unknowns,assumptionsResolved:false,estimatesConfirmed:false,mappings:[{capabilityId:cap,scope:a.support}]});
 if(!p.technologyRealisation.mappings.some(m=>m.realizationId===real&&m.capabilityId===cap)){const snap=modelEditSnapshot(p,{type:'techrealisation.plan',payload:{id:real}});run('techrealisation.plan',{id:real,...snap,mappings:[...snap.mappings,{capabilityId:cap,scope:a.support}]});}
 const graphAfter=logicalGraph(p),newEdges=graphAfter.edges.filter(e=>!graphBefore.edges.some(x=>x.from===e.from&&x.to===e.to&&x.label===e.label));
 const changes=Object.entries(used).map(([slot,{id,type}])=>{const current=lists(p,type).find(r=>r.id===id),beforeRecord=lists(input,type).find(r=>r.id===id),command={type,payload:{id}},source={...(modelImpactSource(p,command)||{id,ref:current.ref||current.id,title:current.title,chapter:chapterFor(type),kind:'boundary'}),slot,isNew:!beforeRecord};const snapshot=(doc,r)=>type==='technology.boundary'?(r?{title:r.title,owner:r.owner,policy:r.policy}:{}):(modelEditSnapshot(doc,command)||{}),before=snapshot(input,beforeRecord),after=snapshot(p,current),fields=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(k=>!equal(before[k],after[k])).map(key=>({key,label:key.replace(/([A-Z])/g,' $1'),before:before[key],after:after[key]}));const added=newEdges.filter(e=>e.from===id||e.to===id);if(added.length)fields.push({key:'connections',label:'Connected design',before:linkSnapshot(input,id),after:linkSnapshot(p,id)});return {command,source,before,after,fields,signals:[]};});
 const linked=new Map();for(const c of changes.filter(c=>c.source.kind!=='boundary'))for(const i of modelLinkedItems(input,p,c.source)){if(!linked.has(i.key))linked.set(i.key,i);}
 const items=[...linked.values()].map(i=>({...i,capturedStamp:changeTargetStamp(p,i)})),signals=[{title:'Working design with open obligations',detail:'Product selection, trust-policy confirmation, recovery measurements and external approval remain separate. New definitions and allocations are unconfirmed.'},{title:'Boundary approach',detail:DESIGN_APPROACHES.find(x=>x.id===spec.approach).tradeoffs}];
 return {document:p,commands:changes.map(c=>c.command),changes,source:changes[0].source,command:changes[0].command,before:changes[0].before,after:changes[0].after,fields:changes.flatMap(c=>c.fields.map(f=>({...f,source:c.source}))),items,findings:modelFindingDelta(input,p),signals,conflicts:[],satisfied:[],stamp:designPreviewStamp(input,alternative),selected:lr,designTaskId:t.id,designAlternativeId:alternative.id,executed,newEdges,hasChanges:executed.length>0};
}

export function operationAnswers(kind,raw={}){
 const def=OPERATION_DRAFTS[kind];if(!def)throw Error('Choose a supported architecture operation.');
 const keys=['targetId','scopeNote','rationale',...def.fields.map(f=>f.key)],out={};
 if(Object.keys(raw).some(k=>!keys.includes(k)))throw Error('Use the native fields for this operation.');
 for(const key of keys){const spec=def.fields.find(f=>f.key===key),value=spec?.type==='number'&&typeof raw[key]==='number'?String(raw[key]):raw[key],multi=/Ids$/.test(key),max=['title','optionTitle'].includes(key)?160:key==='owner'?180:['scopeNote','rationale'].includes(key)||['responsibility','technology'].includes(kind)?4000:2400;
  if(value===undefined&&spec?.group)continue;
  if(multi){if(value!==undefined&&(!Array.isArray(value)||value.some(v=>typeof v!=='string')||value.length>100))throw Error('Choose the existing records for '+key+'.');out[key]=[...new Set(value||[])];}
  else{if(value!==undefined&&typeof value!=='string')throw Error('Describe '+key+' as text.');if((value||'').length>max)throw Error(key+' must fit within '+max+' characters.');out[key]=(value||'').trim();if(spec?.type==='number'&&out[key]){const n=Number(out[key]);if(!Number.isFinite(n)||n<spec.min||n>spec.max||spec.integer&&!Number.isInteger(n))throw Error('Record '+spec.label.toLowerCase()+' between '+spec.min+' and '+spec.max+'.');}}
 }return out;
}
export function operationDefaults(p,t,targetId=''){
 const o=t.operation,kind=o.kind,old=operationRecords(p,kind).find(r=>r.id===targetId),value=key=>key.startsWith('execution.')?old?.execution?.[key.slice(10)]:['requestDataIds','responseDataIds'].includes(key)?old?.exchanges?.filter(x=>x.role===key.replace('DataIds','')).map(x=>x.dataId):old?.[key],values=Object.fromEntries(OPERATION_DRAFTS[kind].fields.filter(f=>value(f.key)!==undefined).map(f=>[f.key,clone(value(f.key))])),verification=o.verification.steps.join('\n');
 if(targetId==='new')Object.assign(values,{title:o.proposedObjects.find(x=>x.length<=160)||o.title,owner:'',...(kind==='information-consistency'?{condition:o.intent,check:o.mechanism}:{purpose:o.intent}),...(kind==='responsibility'?{boundary:o.mechanism}:kind==='interaction'?{operation:o.mechanism}:kind==='security'?{mechanism:o.mechanism,verificationPlan:verification}:kind==='recovery'?{recoveryPlan:o.mechanism}:kind==='deployment'?{rollout:o.mechanism}:{})});
 if(kind==='technology')Object.assign(values,{optionTargetId:'',optionTitle:o.title,benefits:o.mechanism,drawbacks:o.tradeoffs.join('\n'),specEvidence:verification});
 for(const f of OPERATION_DRAFTS[kind].fields)if(Array.isArray(f.choices)&&values[f.key]&&!f.choices.includes(values[f.key]))values[f.key]='';
 return operationAnswers(kind,{...values,targetId,scopeNote:t.answers?.scopeNote||'',rationale:t.answers?.rationale||''});
}
export function validateOperationReferences(p,kind,v,task=null){
 if(v.targetId&&v.targetId!=='new'&&!operationRecords(p,kind).some(r=>r.id===v.targetId))throw Error('The selected target was removed or has a different record type. Choose a current '+OPERATION_DRAFTS[kind].noun+'.');
 const refs=operationReferenceLists(p,v,task);
 for(const f of OPERATION_DRAFTS[kind].fields){const value=v[f.key];if(Array.isArray(f.choices)&&value&&!f.choices.includes(value))throw Error('Choose a supported '+f.label.toLowerCase()+'.');if(typeof f.choices==='string'&&value?.length){const ids=Array.isArray(value)?value:[value];if(ids.some(id=>!(id==='new'&&['optionTargetId','placementId'].includes(f.key))&&!refs[f.choices].some(r=>r.id===id)))throw Error('Choose current records for '+f.label.toLowerCase()+'.');}}
}
const operationSnapshot=(p,kind,id)=>{
 const r=operationRecords(p,kind).find(r=>r.id===id);if(!r)return {};
 const keys=[...OPERATION_DRAFTS[kind].fields.map(f=>f.key),'requirementIds','requirementGroupIds',...(kind==='interaction'?['execution','exchanges']:kind==='technology'?['options','selectedOptionId']:kind==='responsibility'?['source','confirmed']:[])];
 return Object.fromEntries(keys.filter(k=>r[k]!==undefined).map(k=>[k,clone(r[k])]));
};
export function previewOperationDesign(input,a,at=new Date().toISOString(),coordinated=false){
 const t=designTask(input,a.taskId);if(t?.kind!=='operation')throw Error('The saved architecture operation is unavailable.');
 if(t.status==='applied')return {document:input,commands:[],changes:[],fields:[],items:[],findings:{introduced:[],resolved:[],existing:0},signals:[],conflicts:[],satisfied:[],appliedTask:true};
 if(t.status==='dismissed')throw Error('This operation is retained as dismissed.');
 if(t.operationGroup&&!coordinated)throw Error('Review every related operation together from this coordinated option.');
 if(!coordinated&&(!designBasisCurrent(input,t)||!designBasisCurrent(input,{...t,basis:a.designBasis,sourceReview:null})))throw Error('The operation sources or selected record changed. Review current context before preparing this proposal.');
 const o=t.operation,kind=o.kind,def=OPERATION_DRAFTS[kind],v=operationAnswers(kind,a.design.answers);
 if(a.design.contextStamp!==changeFingerprint(operationContext(input,kind,v,t)))throw Error('The selected record or its references changed. Review the current target before preparing again.');
 if(!v.targetId)throw Error('Choose an existing '+def.noun+' or explicitly create a new one.');
 const old=operationRecords(input,kind).find(r=>r.id===v.targetId);if(v.targetId!=='new'&&!old)throw Error('The selected target was removed. Choose a current record.');
 if(!v.title||!v.owner||!v.scopeNote||!v.rationale)throw Error('Name the record and its owner, explain the operation scope covered and any remaining proposed objects, and record your rationale.');
 if(!old&&operationRecords(input,kind).some(r=>r.title?.toLowerCase()===v.title.toLowerCase()))throw Error('A '+def.noun+' has this name. Explicitly choose that record or use a distinct name.');
 validateOperationReferences(input,kind,v);
 const required=OPERATION_REQUIRED[kind];
 if(required.some(k=>!v[k]?.length))throw Error('Complete '+required.filter(k=>!v[k]?.length).map(k=>def.fields.find(f=>f.key===k)?.label||k).join(', ')+'.');
 let p=clone(input);const changes=[],executed=[];
 const apply=def.type.startsWith('logical.')?applyLogicalCommand:def.type.startsWith('interfaces.')?applyInterfacesCommand:def.type.startsWith('security.')?applySecurityCommand:def.type.startsWith('runtime.')?applyRuntimeCommand:applyTechnologyRealisationCommand;
 const skip=new Set(['targetId','scopeNote','rationale','capabilityId','optionTargetId','optionTitle','product','version','operatingModel','topology','benefits','drawbacks','specEvidence','placementId','zoneId','role','replicas','requestDataIds','responseDataIds']);
 const payload=Object.fromEntries(def.fields.filter(f=>!skip.has(f.key)&&!f.key.startsWith('execution.')&&v[f.key]!==undefined).map(f=>[f.key,clone(v[f.key])]));
 if(kind==='interaction'){
  const fields=def.fields.filter(f=>f.key.startsWith('execution.')&&Object.hasOwn(v,f.key));
  if(fields.length){payload.execution={...clone(old?.execution||{})};for(const f of fields){const key=f.key.slice(10);if(v[f.key])payload.execution[key]=f.type==='number'?Number(v[f.key]):v[f.key];else delete payload.execution[key];}}
  if(['request','response'].some(role=>Object.hasOwn(v,role+'DataIds')))payload.exchanges=['request','response'].flatMap(role=>Object.hasOwn(v,role+'DataIds')?v[role+'DataIds'].map(dataId=>({role,dataId})):(old?.exchanges||[]).filter(x=>x.role===role));
 }
 payload.requirementIds=[...new Set([...(old?.requirementIds||[]),...o.requirementIds])];if(old)payload.id=old.id;else payload.origin='suggestion';
 if(kind==='responsibility'&&!old){payload.confirmed=false;payload.source='Proposed from saved Sol run '+t.generation.runId+' · '+o.id;}
 if(kind==='technology'&&!old){if(!v.capabilityId)throw Error('Choose the capability this new realization implements.');payload.mappings=[{capabilityId:v.capabilityId,scope:v.scopeNote}];}
 if(['recovery','deployment'].includes(kind)){if(!old&&(!v.environmentId||!v.assetId))throw Error('Choose an existing environment and operating asset.');if(!old&&p.runtime.plans.some(r=>r.environmentId===v.environmentId&&r.assetId===v.assetId))throw Error('This asset already has a plan in that environment. Explicitly choose its saved plan.');if(old){delete payload.environmentId;delete payload.assetId;}if(kind==='deployment'&&!old)payload.recoveryStrategy='Unspecified';}
 const run=(fn,type,raw)=>{const result=fn(p,{type,payload:raw},at);p=result.document;executed.push({type,payload:clone(raw)});return result.selected;};
 const selected=run(apply,def.type,payload);
 if(kind==='technology'){
  const plan=p.technologyRealisation.records.find(r=>r.id===selected),id=v.optionTargetId==='new'?undefined:v.optionTargetId;if(id&&!plan.options.some(x=>x.id===id))throw Error('Choose an option on this realization.');
  if(!id&&plan.options.some(x=>x.title.toLowerCase()===v.optionTitle.toLowerCase()))throw Error('This realization already has an option with that name. Choose it explicitly or name a distinct alternative.');
  const option={...Object.fromEntries(['product','version','operatingModel','topology','benefits','drawbacks','specEvidence'].map(k=>[k,v[k]])),title:v.optionTitle,...(id?{id}:{})};
  run(applyTechnologyRealisationCommand,'techrealisation.option',{id:selected,option});
 }
 const add=(type,id,before,after,chapter,noun,isNew)=>{const source={id,ref:after.ref||id,title:after.title||noun,chapter,kind:noun,isNew},clean=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['ref','id','revision','history','sourceSnapshot','review'].includes(k))),b=clean(before),c=clean(after),fields=[...new Set([...Object.keys(b),...Object.keys(c)])].filter(k=>!equal(b[k],c[k])).map(key=>({key,label:OPERATION_DRAFTS[kind].fields.find(f=>f.key===key)?.label||key,before:b[key]??null,after:c[key]??null}));changes.push({command:{type,payload:{id}},source,before:b,after:c,fields,signals:[]});};
 const saved=operationRecords(p,kind).find(r=>r.id===selected);add(def.type,selected,operationSnapshot(input,kind,old?.id),{...operationSnapshot(p,kind,selected),ref:saved.ref},ARCHITECTURE_OPERATION_KINDS[kind].chapter,def.noun,!old);
 if(kind==='deployment'&&v.placementId){if(!v.zoneId||!v.role||!v.replicas)throw Error('Choose the placement zone, capacity role and explicit replica count.');const prior=input.runtime.placements.find(x=>x.id===v.placementId);if(v.placementId!=='new'&&prior?.planId!==selected)throw Error('Choose a placement of this runtime plan.');run(applyRuntimeCommand,'runtime.placement',{...(prior?{id:prior.id}:{}),planId:selected,zoneId:v.zoneId,role:v.role,replicas:v.replicas,basis:v.capacityBasis,confirmed:false});const placement=p.runtime.placements.find(x=>prior?x.id===prior.id:x.planId===selected&&x.zoneId===v.zoneId&&x.role===v.role);add('runtime.placement',placement.id,prior||{},placement,10,'placement',!prior);}
 if(['recovery','deployment'].includes(kind)&&!old){const before=input.runtime.environments.find(e=>e.id===v.environmentId),after=p.runtime.environments.find(e=>e.id===v.environmentId);if(!equal(before,after))add('runtime.environment',after.id,before,after,10,'environment',false);}
 const linked=new Map();if(!coordinated)for(const c of changes)for(const item of modelLinkedItems(input,p,c.source))linked.set(item.key,item);
 const items=[...linked.values()].map(i=>({...i,capturedStamp:changeTargetStamp(p,i)})),signals=[{title:o.optionTitle+' · '+o.title,detail:'Selected operation '+o.id+' from run '+t.generation.runId+'. '+v.scopeNote},{title:'Conditions and implementation obligations remain open',detail:[...o.conditions,...o.obligations].join(' ')},{title:'Acceptance records a working design',detail:'The original operation, source receipts, trade-offs and proposed verification stay with this task. Product selection, measured verification and external approval require their own evidence.'}];
 return {document:p,commands:changes.map(c=>c.command),changes,source:changes[0].source,command:changes[0].command,before:changes[0].before,after:changes[0].after,fields:changes.flatMap(c=>c.fields.map(f=>({...f,source:c.source}))),items,findings:coordinated?null:modelFindingDelta(input,p),signals,conflicts:[],satisfied:[],stamp:designPreviewStamp(input,a),selected,designTaskId:t.id,designAlternativeId:a.id,previewChapters:[ARCHITECTURE_OPERATION_KINDS[kind].chapter],executed,hasChanges:changes.some(c=>c.fields.length)};
}

// Resolve only explicit typed draft references inside one immutable saved option.
// The whole group is checked before any native command runs on a private copy.
function previewOperationGroup(input,a,at){
 const lead=designTask(input,a.taskId),members=operationGroupMembers(input,lead),saved=a.design.members;
 if(!lead?.operationGroup||!equal(a.design.group,lead.operationGroup)||!Array.isArray(saved)||saved.length!==members.length||saved.some((m,i)=>m.taskId!==members[i].id||m.operationId!==members[i].operation.id))throw Error('This preview must contain every exact operation in the saved option.');
 if(members.every(t=>t.status==='applied'))return {document:input,commands:[],changes:[],fields:[],items:[],findings:{introduced:[],resolved:[],existing:0},signals:[],conflicts:[],satisfied:[],appliedTask:true};
 const dependencies=new Map();
 for(const [i,t] of members.entries()){
  const m=saved[i];
  if(['applied','dismissed'].includes(t.status))throw Error('A related operation is no longer available for coordinated review.');
  if(!designBasisCurrent(input,t)||!equal(m.basis,t.sourceReview?.basis||t.basis))throw Error(t.operation.id+': Review the changed sources before reviewing this option.');
  if(!equal(m.answers,t.answers)||!equal(m.dependencies,t.operationDependencies||[])||m.contextStamp!==changeFingerprint(operationContext(input,t.operation.kind,m.answers,t)))throw Error(t.operation.id+': A related draft or selected record changed. Save the drafts and prepare the option again.');
  validateOperationReferences(input,t.operation.kind,m.answers,t);
  const deps=operationDependencies(t,m.answers);if(deps.some(id=>id===t.id||!members.some(x=>x.id===id)))throw Error('A prerequisite is missing, self-referential or belongs to another option.');dependencies.set(t.id,deps);
 }
 const ordered=[],visiting=new Set(),visited=new Set();
 function visit(t){if(visiting.has(t.id))throw Error('The related operations have a dependency cycle. Review their prerequisites and typed references.');if(visited.has(t.id))return;visiting.add(t.id);for(const id of dependencies.get(t.id))visit(members.find(m=>m.id===id));visiting.delete(t.id);visited.add(t.id);ordered.push(t);}
 for(const t of members)visit(t);
 let p=clone(input);const resolved=new Map(),primary=new Set(),changesByKey=new Map(),executed=[],signals=[],results=[];
 for(const t of ordered){
  const v=clone(t.answers),resolve=id=>{if(typeof id!=='string'||!id.startsWith('draft:'))return id;const output=resolved.get(id.slice(6));if(!output)throw Error('The referenced operation must produce its reviewed native target first.');return output;};
  for(const f of OPERATION_DRAFTS[t.operation.kind].fields.filter(f=>typeof f.choices==='string'&&Object.hasOwn(v,f.key)))v[f.key]=Array.isArray(v[f.key])?v[f.key].map(resolve):resolve(v[f.key]);
  const part={...a,taskId:t.id,designBasis:clone(t.sourceReview?.basis||t.basis),design:{family:'operation',approach:t.operation.kind,answers:v,contextStamp:changeFingerprint(operationContext(p,t.operation.kind,v,t))}};
  let q;try{q=previewOperationDesign(p,part,at,true);}catch(e){throw Error(t.operation.id+' · '+t.operation.title+': '+e.message);}
  const key=OPERATION_DRAFTS[t.operation.kind].type+':'+q.selected;if(primary.has(key))throw Error('Two operations edit the same native target. Consolidate that scope into one operation before coordinated review.');primary.add(key);
  p=q.document;resolved.set(t.id,q.selected);executed.push(...q.executed);signals.push(...q.signals);results.push({taskId:t.id,operationId:t.operation.id,selected:q.selected,answers:v,dependencies:dependencies.get(t.id),recordIds:q.changes.map(c=>c.source.id)});
  for(const c of q.changes){const k=c.command.type+':'+c.source.id,previous=changesByKey.get(k);if(previous){if(c.command.type!=='runtime.environment')throw Error('Related operations overlap on a native record. Refine their scope before review.');previous.after=c.after;previous.source.taskIds.push(t.id);previous.fields=[...new Set([...Object.keys(previous.before),...Object.keys(c.after)])].filter(key=>!equal(previous.before[key],c.after[key])).map(key=>({key,label:key,before:previous.before[key]??null,after:c.after[key]??null}));}else changesByKey.set(k,{...c,source:{...c.source,taskId:t.id,taskIds:[t.id],operationId:t.operation.id}});}
 }
 const changes=[...changesByKey.values()],linked=new Map();for(const c of changes)for(const item of modelLinkedItems(input,p,c.source))linked.set(item.key,item);
 const items=[...linked.values()].map(i=>({...i,capturedStamp:changeTargetStamp(p,i)}));
 return {document:p,commands:changes.map(c=>c.command),changes,source:changes[0].source,command:changes[0].command,before:changes[0].before,after:changes[0].after,fields:changes.flatMap(c=>c.fields.map(f=>({...f,source:c.source}))),items,findings:modelFindingDelta(input,p),signals:[{title:'Coordinated option · '+lead.operation.optionTitle,detail:members.length+' related operations are reviewed and applied together. Prerequisites follow explicit choices and typed draft references; all remaining verification obligations are retained.'},...signals],conflicts:[],satisfied:[],stamp:designPreviewStamp(input,a),selected:resolved.get(lead.id),designTaskId:lead.id,designAlternativeId:a.id,previewChapters:[...new Set(changes.map(c=>c.source.chapter))],executed,operationMembers:results,hasChanges:changes.some(c=>c.fields.length)};
}
