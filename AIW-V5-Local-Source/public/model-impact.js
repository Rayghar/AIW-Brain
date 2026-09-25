import {applyLogicalCommand,logicalFindings} from './logical-domain.js';
import {applyRealisationCommand,realisationFindings} from './realisation-domain.js';
import {applyTechnologyCommand,technologyFindings} from './technology-domain.js';
import {applyTechnologyRealisationCommand,technologyRealisationFindings} from './technology-realisation-domain.js';
import {interfaceFindings} from './interfaces-domain.js';
import {securityFindings} from './security-domain.js';
import {runtimeFindings} from './runtime-domain.js';
import {withFinalReview} from './review-domain.js';
import {changeFingerprint,changeTarget,changeTargetStamp,withChanges} from './changes-domain.js';
import {journeyIndex,journeyTargets,journeyChapters} from './journey-context.js';

const fields=s=>s.split(' ');
const adapters={
 'logical.responsibility':{chapter:4,kind:'responsibility',list:p=>p.logical.responsibilities,apply:applyLogicalCommand,keys:fields('title purpose boundary owner source groupId requirementIds decisionIds confirmed')},
 'realisation.component':{chapter:5,kind:'component',list:p=>p.realisation.components,apply:applyRealisationCommand,keys:fields('title kind purpose boundary owner inputs outputs rationale source technologyNeeds assumptions status dataIds decisionIds assumptionsResolved'),maps:p=>p.logical.mappings,mapKey:'allocations',endpoint:'physicalId',target:'logicalId'},
 'technology.capability':{chapter:6,kind:'capability',list:p=>p.technology.capabilities,apply:applyTechnologyCommand,keys:fields('title category purpose boundary owner rationale source boundaryId failureDomain alternateDomain continuity continuityPlan recoveryPlan recoveryOwner recoveryMinutes lossMinutes targetsConfirmed assumptions assumptionsResolved status driverIds decisionIds'),maps:p=>p.technology.mappings,mapKey:'mappings',endpoint:'capabilityId',target:'needId'},
 'techrealisation.plan':{chapter:7,kind:'realization',list:p=>p.technologyRealisation.records,apply:applyTechnologyRealisationCommand,keys:fields('title purpose owner operationsPlan accessPlan dataPlan resiliencePlan interfacePlan lifecyclePlan capacityValue capacityUnit capacityBasis annualCost currency costBasis estimatesConfirmed rationale risks assumptions assumptionsResolved'),maps:p=>p.technologyRealisation.mappings,mapKey:'mappings',endpoint:'realizationId',target:'capabilityId'}
};
const labels={title:'Name',kind:'Component kind',purpose:'Purpose',boundary:'Owned boundary',owner:'Accountable owner',source:'Source / evidence',groupId:'Responsibility group',requirementIds:'Source requirements',decisionIds:'Architecture decisions',driverIds:'Quality drivers',confirmed:'Source review',inputs:'Inputs',outputs:'Outputs',rationale:'Design rationale',technologyNeeds:'Technology needs',assumptions:'Open assumptions',assumptionsResolved:'Assumption review',status:'Design state',dataIds:'Authoritative data',allocations:'Responsibility allocations',mappings:'Support allocations',category:'Capability category',boundaryId:'Trust boundary',failureDomain:'Primary failure domain',alternateDomain:'Alternate failure domain',continuity:'Continuity arrangement',continuityPlan:'Continuity behaviour',recoveryPlan:'Recovery plan',recoveryOwner:'Recovery owner',recoveryMinutes:'Recovery time assumption (minutes)',lossMinutes:'Data loss assumption (minutes)',targetsConfirmed:'Recovery target confirmation',operationsPlan:'Operational ownership',accessPlan:'Access obligations',dataPlan:'Data obligations',resiliencePlan:'Recovery and isolation',interfacePlan:'Interface obligations',lifecyclePlan:'Lifecycle and exit',capacityValue:'Capacity assumption',capacityUnit:'Capacity unit',capacityBasis:'Sizing basis',annualCost:'Annual cost assumption',currency:'Cost currency',costBasis:'Cost scope and evidence',estimatesConfirmed:'Estimate confirmation',risks:'Risks and treatment'};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const distinct=xs=>[...new Set(xs)];
export const modelImpactCommand=c=>c?.type==='model.apply-impact'?c.payload?.command:c;
export function modelImpactSource(p,raw){const c=modelImpactCommand(raw),a=adapters[c?.type],r=a?.list(p).find(r=>r.id===c.payload?.id);return r?{chapter:a.chapter,id:r.id,ref:r.ref,title:r.title,kind:a.kind}:null;}
export function modelEditSnapshot(p,raw){const c=modelImpactCommand(raw),a=adapters[c?.type],r=a?.list(p).find(r=>r.id===c.payload?.id);if(!r)return null;const out=Object.fromEntries(a.keys.map(k=>[k,structuredClone(r[k]??'')]));if(a.maps)out[a.mapKey]=a.maps(p).filter(m=>m[a.endpoint]===r.id).map(m=>({[a.target]:m[a.target],scope:m.scope})).sort((x,y)=>x[a.target].localeCompare(y[a.target]));return out;}
const differences=(a,b)=>distinct([...Object.keys(a),...Object.keys(b)]).filter(k=>!same(a[k],b[k])).map(k=>({key:k,label:labels[k]||k,before:a[k],after:b[k]}));

export function modelLinkedItems(before,after,source){
 const items=new Map();
 for(const p of [before,after]){
  const index=journeyIndex(p),root=index.nodes.get(source.id);if(!root)continue;
  function add(node,path,reason){
   if(!node||!changeTarget(p,{chapter:node.chapter,id:node.id}))return;
   const key=node.chapter+':'+node.id,via=distinct([source.ref,...path.flatMap(e=>[index.nodes.get(e.from)?.ref||e.from,index.nodes.get(e.to)?.ref||e.to])]);
   const prior=items.get(key);if(prior){prior.via=distinct([...prior.via,...via]);if(!prior.reasons.includes(reason))prior.reasons.push(reason);return;}
   items.set(key,{key,chapter:node.chapter,chapterTitle:journeyChapters[node.chapter],id:node.id,ref:node.ref||node.id,title:node.title,via,reasons:[reason]});
  }
  add(root,[],'This definition is changing. Review its boundary, evidence and allocated scope.');
  // Upstream and downstream traversals are independent. A shared platform must
  // not lead backwards to requirements belonging only to another application.
  for(let chapter=1;chapter<=10;chapter++)if(chapter!==source.chapter)for(const {node,path} of journeyTargets(index,source.id,chapter))add(node,path,(chapter<source.chapter?'This record supplies inherited context.':'This record is linked to the changed design.')+' Recorded path: '+path.map(e=>(index.nodes.get(e.from)?.ref||e.from)+' — '+e.label+' — '+(index.nodes.get(e.to)?.ref||e.to)).join('; ')+'. Review whether the obligation still holds.');
  for(const edge of index.edges.filter(e=>e.from===source.id||e.to===source.id)){const node=index.nodes.get(edge.from===source.id?edge.to:edge.from);if(node?.chapter===source.chapter)add(node,[edge],'This directly connected peer shares a recorded '+edge.label+' relationship. Review the boundary agreement.');}
  // A technology change also reaches operating plans and controls attached to
  // its supported applications, even when those records do not name the platform.
  if(source.chapter===6||source.chapter===7){
   const capabilities=new Set(source.chapter===6?[source.id]:p.technologyRealisation.mappings.filter(m=>m.realizationId===source.id).map(m=>m.capabilityId));
   let grew=true;while(grew){grew=false;for(const d of p.technology.dependencies)if(d.critical&&['dependency','trust'].includes(d.type)&&capabilities.has(d.to)&&!capabilities.has(d.from)){capabilities.add(d.from);grew=true;}}
   const linked=(id,via,label)=>add(index.nodes.get(id),[{from:source.id,to:via,label},{from:via,to:id,label}],label+'. Review the recorded support obligation; an outage is not being executed.');
   for(const id of capabilities)if(id!==source.id)linked(id,source.id,'Technology allocation or critical prerequisite');
   const applications=new Set();for(const m of p.technology.mappings.filter(m=>capabilities.has(m.capabilityId))){const n=p.technology.needs.find(n=>n.id===m.needId);if(n){applications.add(n.applicationId);linked(n.applicationId,m.capabilityId,'Application support '+m.id+' / '+n.id);}}
   const realizations=new Set(p.technologyRealisation.mappings.filter(m=>capabilities.has(m.capabilityId)).map(m=>m.realizationId));
   for(const id of realizations)linked(id,p.technologyRealisation.mappings.find(m=>m.realizationId===id&&capabilities.has(m.capabilityId)).capabilityId,'Capability implementation');
   const affected=new Set([...capabilities,...applications,...realizations]);
   for(const c of p.interfaces.contracts.filter(c=>affected.has(c.from)||affected.has(c.to))){linked(c.id,affected.has(c.from)?c.from:c.to,'Participating application or technology');affected.add(c.id);}
   for(const d of p.interfaces.data.filter(d=>affected.has(d.authorityId))){linked(d.id,d.authorityId,'Authoritative data on affected support');affected.add(d.id);}
   for(const c of p.security.controls.filter(c=>c.targetIds.some(id=>affected.has(id))))linked(c.id,c.targetIds.find(id=>affected.has(id)),'Control on a supported asset');
   for(const r of p.runtime.plans.filter(r=>affected.has(r.assetId)))linked(r.id,r.assetId,'Operating plan on affected support');
  }
 }
 return [...items.values()].sort((a,b)=>a.chapter-b.chapter||a.ref.localeCompare(b.ref)).map(({reasons,...i})=>({...i,why:reasons.join(' '),capturedStamp:changeTargetStamp(after,i),reviews:[]}));
}
const checks=[[4,logicalFindings],[5,realisationFindings],[6,technologyFindings],[7,technologyRealisationFindings],[8,interfaceFindings],[9,securityFindings],[10,runtimeFindings]];
function allFindings(p){return checks.flatMap(([chapter,fn])=>fn(p).map(f=>({...f,chapter,title:'Ch. '+chapter+' · '+f.title})));}
export function modelFindingDelta(a,b){const before=allFindings(a),after=allFindings(b),equal=(x,y)=>x.chapter===y.chapter&&x.id===y.id&&x.detail===y.detail;return {introduced:after.filter(x=>!before.some(y=>equal(x,y))),resolved:before.filter(x=>!after.some(y=>equal(x,y))),existing:after.filter(x=>before.some(y=>equal(x,y))).length};}
function signals(a,b,source){const out=[],changed=keys=>keys.some(k=>!same(a[k],b[k]));
 if(changed(['allocations','mappings']))out.push({title:'Allocation scope changed',detail:'Review both removed and proposed support paths. Removing a link does not remove the obligation from its previous consumer or implementation.'});
 if(changed(['boundary','purpose','inputs','outputs','technologyNeeds']))out.push({title:'Responsibility or service boundary changed',detail:'Revisit acceptance criteria, component interactions and the capabilities required to deliver the changed behaviour.'});
 if(changed(['boundaryId','failureDomain','alternateDomain','continuity','continuityPlan','recoveryPlan','recoveryMinutes','lossMinutes','resiliencePlan']))out.push({title:'Trust or recovery assumptions changed',detail:'Recheck failure propagation, recovery order, quality targets and operating evidence. This preview is a design comparison; it does not prove operational recovery.'});
 if(changed(['dataIds','owner','accessPlan','dataPlan']))out.push({title:'Ownership or protection changed',detail:'Confirm authoritative writes, accountable ownership, control coverage and the linked data/interface agreements.'});
 if(changed(['capacityValue','annualCost','currency','costBasis','capacityBasis']))out.push({title:'Sizing or cost assumptions changed',detail:'Revisit workload and commercial evidence. Numbers remain assumptions unless the architect has explicitly confirmed their basis.'});
 if(source.chapter===7)out.push({title:'Technology selection needs review',detail:'An implementation-plan revision makes earlier selection and approval evidence require review. Applying this change does not record a new selection or approval.'});
 return out;
}
export function modelImpactStamp(p,raw){return changeFingerprint([p.id,p.contentVersion,...['quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime'].map(k=>p[k]?.version),modelImpactCommand(raw)]);}
export function previewModelChange(input,raw,at=new Date().toISOString()){
 const command=modelImpactCommand(raw),source=modelImpactSource(input,command);if(!source)throw Error('Choose an existing responsibility, application component, technology capability or realization plan.');
 const before=modelEditSnapshot(input,command),result=adapters[command.type].apply(input,command,at),document=withFinalReview(result.document),after=modelEditSnapshot(document,command),fields=differences(before,after);
 if(!fields.length)throw Error('No definition changes to preview. Edit a value first.');
 return {command:structuredClone(command),source:{...source,title:after.title},before,after,fields,items:modelLinkedItems(input,document,source),findings:modelFindingDelta(input,document),signals:signals(before,after,source),stamp:modelImpactStamp(input,command),document,selected:result.selected};
}
export function applyModelImpact(input,command,at){const r=command.payload||{};if(r.reviewed!==true)throw Error('Review the proposed values and their linked impact before applying.');if(r.previewStamp!==modelImpactStamp(input,r.command))throw Error('The project changed. Refresh the impact preview before applying.');const q=previewModelChange(input,r.command,at);return {document:q.document,selected:q.selected};}
export function rebaseModelChange(p,preview){
 const current=modelEditSnapshot(p,preview.command);if(!current)throw Error('The definition was removed. Your proposal remains available for inspection.');
 const merged=structuredClone(current),conflicts=[];
 for(const k of Object.keys(preview.after))if(!same(preview.before[k],preview.after[k])){
  const a=adapters[preview.command.type];
  if(k===a.mapKey){
   const key=a.target,old=new Map(preview.before[k].map(m=>[m[key],m])),proposed=new Map(preview.after[k].map(m=>[m[key],m])),latest=new Map(current[k].map(m=>[m[key],m]));
   for(const id of distinct([...old.keys(),...proposed.keys()]))if(!same(old.get(id),proposed.get(id))){if(!same(latest.get(id),old.get(id))&&!same(latest.get(id),proposed.get(id)))conflicts.push({key:k,mapKey:key,mapId:id,label:labels[k]+' · '+id,current:latest.get(id)||null,proposed:proposed.get(id)||null});if(proposed.has(id))latest.set(id,proposed.get(id));else latest.delete(id);}
   merged[k]=[...latest.values()];
  }else{if(!same(current[k],preview.before[k])&&!same(current[k],preview.after[k]))conflicts.push({key:k,label:labels[k]||k,current:current[k],proposed:preview.after[k]});merged[k]=structuredClone(preview.after[k]);}
 }
 return {command:{type:preview.command.type,payload:{...merged,id:preview.source.id}},conflicts};
}
export function trackModelChange(before,after,raw,at){const command=modelImpactCommand(raw),source=modelImpactSource(before,command);if(!source)return;const a=modelEditSnapshot(before,command),b=modelEditSnapshot(after,command),fields=differences(a,b);if(!fields.length)return;withChanges(after);after.changes.events.push({id:'CHG-'+String(++after.changes.counter).padStart(3,'0'),source:{...source,title:b.title},title:b.title,at,before:a,after:b,fields,items:modelLinkedItems(before,after,source),preview:{reviewed:raw.type==='model.apply-impact',findings:modelFindingDelta(before,after),signals:signals(a,b,source)}});}
