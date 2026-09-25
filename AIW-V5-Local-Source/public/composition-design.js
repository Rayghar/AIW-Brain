import {compositionRoles,COMPOSITION_TOPICS,assessComposition} from './composition-knowledge.js';
import {applyLogicalCommand} from './logical-domain.js';
import {applyRealisationCommand} from './realisation-domain.js';
import {applyTechnologyCommand} from './technology-domain.js';
import {applyTechnologyRealisationCommand} from './technology-realisation-domain.js';
import {applyInterfacesCommand} from './interfaces-domain.js';
import {applyDecisionCommand} from './decisions-domain.js';
import {modelEditSnapshot} from './model-impact.js';
import {architectureProposal} from './architecture-proposal.js';

const copy=v=>structuredClone(v);
export function compositionEdges(topic,optionId,a={}){
 if(topic==='delivery')return [['processor','store',optionId==='transactional-outbox'?'commits state + publication intent':'commits business state','sync',a.commitPlan||a.information],...(optionId==='direct-delivery'?[['processor','consumer','calls receiver after commit; may fail','sync',a.directPlan+' · '+a.failure]]:optionId==='transactional-outbox'?[['relay','store','claims committed publication intent','data',a.relayPlan],['relay','queue','publishes; may repeat','event',a.relayPlan]]:[['processor','queue','publishes after commit; may be lost','event',a.lossPlan]]),...(optionId==='direct-delivery'?[]:[['queue','consumer','delivers for a controlled business effect','event',a.duplicates+' · '+a.ordering+' · '+a.failure]])];
 if(topic==='resilience')return [['caller','processor',optionId==='protected-call'?'calls through breaker + isolated pool':'calls within the deadline','sync',[a.deadlinePlan,a.fallbackPlan,...(optionId==='protected-call'?[a.breakerPlan,a.isolationPlan]:[])].filter(Boolean).join(' ')]];
 if(topic==='distribution')return optionId==='balanced-pool'?[['caller','router','requests a ready service instance','sync',a.routingPlan],['router','processor','routes to the replica pool','sync',a.healthPlan+' '+a.capacityPlan]]:[['caller','processor','calls the single endpoint','sync',a.capacityPlan]];
 return [['processor','secondary',optionId==='layered-module'?'collaborates inside one application':'uses the owned service contract','sync',a.contractPlan+' '+(a.coordinationPlan||'')]];
}
export function previewComposition(input,alternative,t,at){
 const a=t.answers,optionId=alternative.design.approach,assessment=assessComposition(input,t,optionId),source='Architecture composition '+t.id+' · '+t.requirementId+' / '+t.driverId,used=[],executed=[];let p=copy(input);
 const run=(type,payload)=>{const fn=type.startsWith('logical.')?applyLogicalCommand:type.startsWith('realisation.')?applyRealisationCommand:type.startsWith('technology.')?applyTechnologyCommand:type.startsWith('techrealisation.')?applyTechnologyRealisationCommand:type.startsWith('interfaces.')?applyInterfacesCommand:applyDecisionCommand;const r=fn(p,{type,payload},at);p=r.document;executed.push({type,payload:copy(payload)});return r.selected;};
 const mark=(type,id,slot)=>{if(!used.some(x=>x.id===id&&x.type===type))used.push({type,id,slot});return id;};
 const decisionId=run('decision.save',{question:COMPOSITION_TOPICS[t.topic].question+' · '+t.title,context:t.basis.requirement.description,requirementIds:[t.requirementId],driverIds:[t.driverId],owner:a.owner,source,rationale:alternative.rationale,assumptions:assessment.caveats.join(' '),risks:assessment.option.cost,mitigation:a.failure});
 const roles={},definitions=compositionRoles(t.topic,optionId),logicalIds=[];
 for(const r of definitions){
  const purpose=t.topic==='structure'?(r.slot==='processor'?a.firstResponsibility:a.secondResponsibility):r.label+' for '+t.basis.requirement.title+'. '+(r.slot==='processor'?a.information:r.slot==='store'?(a.commitPlan||a.information):r.slot==='relay'?a.relayPlan:r.slot==='consumer'?a.duplicates+' · '+a.failure:r.slot==='router'?a.routingPlan:a.failure);
  let id=r.sameAs?roles[r.sameAs].app:a[r.slot+'Id'];const old=id?p.realisation.components.find(c=>c.id===id):null,title=a[r.slot+'Title']||r.label+' · '+t.id;
  if(id&&!old)throw Error('The selected '+r.label+' is unavailable.');
  if(old&&['store','queue'].includes(r.kind)&&old.kind!==r.kind)throw Error('Use a '+r.kind+' component for '+r.label+'.');
  if(!old&&p.realisation.components.some(c=>c.title.toLowerCase()===title.toLowerCase()))throw Error('Select the existing '+title+' for reuse or name a distinct component.');
  const logical=mark('logical.responsibility',run('logical.responsibility',{title:r.label+' · '+t.requirementId+' · '+t.id,purpose,boundary:purpose,owner:a.owner,source,requirementIds:[t.requirementId],decisionIds:[decisionId],confirmed:false}),r.slot+' responsibility');logicalIds.push(logical);
  if(!id)id=run('realisation.component',{title,kind:r.kind,purpose,boundary:purpose,owner:a.owner,inputs:a.information,outputs:assessment.option.benefit,source,rationale:alternative.rationale,technologyNeeds:r.category,assumptions:assessment.option.cost,status:'candidate',allocations:[{logicalId:logical,scope:purpose}],decisionIds:[decisionId]});
  else run('logical.mapping',{logicalId:logical,physicalId:id,scope:purpose,owner:a.owner,evidence:source,status:'candidate'});
  if(!r.sameAs&&Object.values(roles).some(x=>x.app===id))throw Error('These independent roles require distinct component identities.');
  if(!p.technology.knownApplications.includes(id))p.technology.knownApplications.push(id);
  mark('realisation.component',id,r.slot);roles[r.slot]={app:id,logical,category:r.category};
 }
 for(const [from,to,label,kind,condition] of compositionEdges(t.topic,optionId,a)){
  run('logical.connection',{from:roles[from].logical,to:roles[to].logical,label,kind:'flow',condition:condition||a.failure});
  // A logical module boundary is not falsely turned into a network self-call.
  if(roles[from].app!==roles[to].app)run('realisation.interaction',{from:roles[from].app,to:roles[to].app,label:label+' · '+t.id,interaction:kind,condition:condition||a.information,failure:a.failure});
 }
 if(t.topic==='delivery'){
  let dataId=a.dataId;
  if(!dataId&&p.interfaces.data.some(d=>d.title.toLowerCase()===a.dataScope.toLowerCase()))throw Error('Reuse the existing data definition or name a distinct information scope.');
  if(!dataId)dataId=run('interfaces.data',{title:a.dataScope,purpose:'Business state owned by '+roles.processor.app+'. '+a.information,authorityId:roles.processor.app,owner:a.owner,classification:a.classification,retentionPolicy:a.retention,protection:a.isolation,evidence:source,origin:'suggestion',assumptions:'Complete the record schema and commit contract in Chapter 8.'});
  const data=p.interfaces.data.find(d=>d.id===dataId);if(data.authorityId!==roles.processor.app)throw Error('Preserve the recorded business-write authority.');mark('interfaces.data',dataId,'authoritative data');
  run('realisation.interaction',{from:roles.store.app,to:dataId,label:'persists owned state · '+t.id,interaction:'data',condition:a.commitPlan||a.information,failure:a.failure});
  if(optionId==='transactional-outbox'){
   const intent=run('interfaces.data',{title:'Publication intent · '+data.title+' · '+t.id,purpose:'Committed event identity, business key, sequence and payload. Shares the local transaction and store with '+data.ref+'. '+a.commitPlan,authorityId:roles.processor.app,owner:data.owner,classification:data.classification,retentionPolicy:a.retentionPlan,protection:data.protection,evidence:source,origin:'suggestion',assumptions:'Define the event schema, permitted fields and relay claim/version protocol. The relay changes delivery bookkeeping, not business-write authority.'});mark('interfaces.data',intent,'publication intent');
   run('interfaces.lineage',{from:dataId,to:intent,title:'publication intent in the same local commit',transformation:a.commitPlan,owner:a.owner,evidence:source});mark('interfaces.lineage',p.interfaces.lineage.at(-1).id,'publication lineage');
   run('realisation.interaction',{from:roles.store.app,to:intent,label:'persists intent in the same commit · '+t.id,interaction:'data',condition:a.commitPlan,failure:'Roll back state and publication intent together.'});
  }
 }
 const boundary=a.boundaryId||run('technology.boundary',{title:a.trustName,owner:a.owner,policy:a.trustPolicy});if(!a.boundaryId)mark('technology.boundary',boundary,'trust boundary');
 const categories=[...new Set([...definitions.map(r=>r.category),'observability',...(t.topic==='delivery'?['backup','recovery']:[])])],caps=[];
 for(const category of categories){
  const supported=[...new Set(definitions.filter(r=>['observability','backup','recovery'].includes(category)?category==='observability'||['store','queue'].includes(r.slot):r.category===category).map(r=>roles[r.slot].app))];
  const purpose=category==='compute'&&optionId==='protected-call'?'Bounded, isolated execution pools. '+a.isolationPlan:category==='compute'&&optionId==='balanced-pool'?'Replicated service execution. '+a.capacityPlan+' Placement: '+a.failureDomains:category==='observability'?'Observe latency, failures, backlog, admission and recovery for '+t.id:category==='backup'||category==='recovery'?'Protect and restore committed state and delivery intent. '+a.failure:assessment.option.capability+' · '+category;
  const needs=[];
  for(const app of supported){const prior=copy(p.technology.needs.filter(n=>n.applicationId===app));let need=prior.find(n=>n.category===category);if(!need){run('technology.needs',{applicationId:app,boundaryId:p.technology.applicationBoundaries[app]||boundary,confirmed:false,needs:[...prior,{category,description:purpose,criticality:'essential'}]});for(const old of prior){const i=p.technology.needs.findIndex(n=>n.id===old.id);if(i>=0)p.technology.needs[i]=old;}need=p.technology.needs.find(n=>n.applicationId===app&&n.category===category);}needs.push(need.id);}
  let id=a['support_'+category+'Id'];
  if(id){const old=p.technology.capabilities.find(c=>c.id===id);if(!old||old.category!==category||old.boundaryId!==boundary)throw Error('Reuse a '+category+' capability in the selected boundary.');const snap=modelEditSnapshot(p,{type:'technology.capability',payload:{id}});run('technology.capability',{id,...snap,mappings:[...snap.mappings,...needs.filter(needId=>!snap.mappings.some(m=>m.needId===needId)).map(needId=>({needId,scope:purpose}))]});}
  else id=run('technology.capability',{title:category[0].toUpperCase()+category.slice(1)+' · '+t.id,category,purpose,boundary:purpose,boundaryId:boundary,owner:a.owner,source,rationale:alternative.rationale,driverIds:[t.driverId],decisionIds:[decisionId],status:'candidate',continuity:'single',recoveryPlan:a.failure,recoveryOwner:a.owner,assumptions:'Implementation, failure domains and measured capacity need verification. '+(a.failureDomains||''),mappings:needs.map(needId=>({needId,scope:purpose}))});
  mark('technology.capability',id,category+' support');caps.push({id,category});
 }
 if(t.topic==='delivery')for(const c of caps.filter(c=>['transactional','messaging'].includes(c.category)))for(const recovery of caps.filter(c=>['backup','recovery'].includes(c.category)))if(!p.technology.dependencies.some(d=>d.from===c.id&&d.to===recovery.id&&d.type==='resilience'))run('technology.dependency',{from:c.id,to:recovery.id,type:'resilience',label:'requires '+recovery.category+' · '+t.id,policy:a.failure,critical:false});
 const operating=Object.entries(a).filter(([k,v])=>v&&(/Plan$/.test(k)||['failureDomains','deadlinePlan','breakerPlan','isolationPlan'].includes(k))).map(([k,v])=>k+': '+v).join('\n');
 const plan=run('techrealisation.plan',{title:COMPOSITION_TOPICS[t.topic].label+' operating design · '+t.id,purpose:assessment.option.pattern+' for '+t.title,owner:a.owner,operationsPlan:operating||a.failure,accessPlan:a.trustPolicy||p.technology.boundaries.find(b=>b.id===boundary)?.policy,dataPlan:a.information,resiliencePlan:a.failure,interfacePlan:(a.contractPlan||a.deadlinePlan||a.relayPlan||a.healthPlan||a.failure),lifecyclePlan:a.retentionPlan||a.ownershipPlan||'Review changes with the recorded owners.',rationale:alternative.rationale,assumptions:'Vendor-neutral proposal. Select products in Chapter 7, complete contracts in Chapter 8 and place runtime instances in Chapter 10. Verify the linked quality scenario.',mappings:caps.map(c=>({capabilityId:c.id,scope:'Support the reviewed '+assessment.option.pattern+' design.'}))});mark('techrealisation.plan',plan,'operating plan');
 for(const o of COMPOSITION_TOPICS[t.topic].options){const evaluation=assessComposition(input,t,o.id);run('decision.alternative',{id:decisionId,title:o.title,summary:o.benefit,benefits:o.benefit,costs:o.cost,consequences:o.counterfactual,pattern:o.pattern+' · '+o.tactic,antiPattern:evaluation.blockers.map(c=>c.detail).join(' ')||'Do not assume target achievement from a selected pattern.',responsibilityIds:logicalIds,relationships:[],assessments:{[t.driverId]:{effect:evaluation.blockers.length?'tension':'unknown',reason:evaluation.status+' · Verify conditions and expected effects.',evidence:t.methodReceipt.packId}}});}
 const decision=p.decisions.records.find(d=>d.id===decisionId);run('decision.choose',{id:decisionId,alternativeId:decision.alternatives.find(o=>o.title===assessment.option.title).id});mark('decision.save',decisionId,'decision');
 return architectureProposal(input,p,t,alternative,used,executed,decisionId,assessment);
}
