import {PERSISTENCE_OPTIONS,assessPersistence} from './persistence-knowledge.js';
import {applyLogicalCommand} from './logical-domain.js';
import {applyRealisationCommand} from './realisation-domain.js';
import {applyTechnologyCommand} from './technology-domain.js';
import {applyTechnologyRealisationCommand} from './technology-realisation-domain.js';
import {applyDecisionCommand} from './decisions-domain.js';
import {applyInterfacesCommand} from './interfaces-domain.js';
import {modelEditSnapshot} from './model-impact.js';
import {architectureProposal} from './architecture-proposal.js';

const copy=v=>structuredClone(v);
export function previewPersistenceDesign(input,alternative,t,at){
 const a=t.answers,assessment=assessPersistence(input,t,alternative.design.approach),document=assessment.optionId==='aggregate-document',used=[],executed=[],source='Persistence design '+t.id+' · '+t.requirementId+' / '+t.driverId;let p=copy(input);
 const run=(type,payload)=>{const fn=type.startsWith('logical.')?applyLogicalCommand:type.startsWith('realisation.')?applyRealisationCommand:type.startsWith('technology.')?applyTechnologyCommand:type.startsWith('techrealisation.')?applyTechnologyRealisationCommand:type.startsWith('interfaces.')?applyInterfacesCommand:applyDecisionCommand;const r=fn(p,{type,payload},at);p=r.document;executed.push({type,payload:copy(payload)});return r.selected;};
 const mark=(type,id,slot)=>{if(!used.some(x=>x.id===id&&x.type===type))used.push({type,id,slot});return id;};
 const targets='Proposed RPO '+a.rpoSeconds+' seconds; RTO '+a.rtoSeconds+' seconds. ',commit=a.invariant+' '+a.writePolicy+' '+a.concurrency;
 const decisionId=run('decision.save',{question:'How should '+a.dataScope+' be committed and recovered?',context:t.basis.requirement.description,requirementIds:[t.requirementId],driverIds:[t.driverId],owner:a.owner,source,rationale:alternative.rationale,assumptions:'No implementation or quality target is verified. '+assessment.caveats.join(' '),risks:assessment.option.cost,mitigation:a.failure+' '+a.restoreTest});
 const roles=[];
 function role(slot,title,purpose,kind){
  let id=a[slot+'Id'];const existing=id?p.realisation.components.find(c=>c.id===id):null;
  if(id&&!existing)throw Error('The selected '+slot+' was removed.');
  if(existing&&kind==='store'&&existing.kind!=='store')throw Error('Choose a store component for '+slot+'.');
  if(!existing&&(!title||p.realisation.components.some(c=>c.title.toLowerCase()===title.toLowerCase())))throw Error('Name a distinct new '+slot+' or reuse its existing component.');
  const logical=run('logical.responsibility',{title:({processor:'Own committed information',store:'Persist atomic changes',recovery:'Retain recoverable state'}[slot])+' · '+t.requirementId+' · '+t.id,purpose,boundary:purpose,owner:a.owner,source,requirementIds:[t.requirementId],decisionIds:[decisionId],confirmed:false});roles.push(logical);mark('logical.responsibility',logical,slot+' responsibility');
  if(!id)id=run('realisation.component',{title,kind,purpose,boundary:purpose,owner:a.owner,inputs:a.dataScope,outputs:slot==='processor'?'Confirmed result or an explicit uncertain outcome.':slot==='store'?'State committed under the declared invariant.':'Protected recovery material; no business-write authority.',source,rationale:alternative.rationale,technologyNeeds:slot==='recovery'?'Protected backup and a tested restore procedure.':'Transactional persistence under the declared access and commit contract.',assumptions:'Product, schema and operating configuration require implementation review.',status:'candidate',allocations:[{logicalId:logical,scope:purpose}]});
  else run('logical.mapping',{logicalId:logical,physicalId:id,scope:purpose,owner:a.owner,evidence:source,status:'candidate'});
  if(!p.technology.knownApplications.includes(id))p.technology.knownApplications.push(id);
  mark('realisation.component',id,slot);return {app:id,logical};
 }
 const authority=role('processor',a.processorTitle,'Own '+a.dataScope+' and its permitted writers. '+a.writePolicy,'service');
 const store=role('store',a.storeTitle,'Persist '+a.dataScope+' as '+(document?'one bounded aggregate document. '+a.aggregateBound:'related records in one store transaction.')+' '+commit,'store');
 const recovery=role('recovery',a.recoveryTitle,'Retain protected recovery material for '+a.dataScope+'. '+targets+a.recoveryPlan,'store');
 if(new Set([authority.app,store.app,recovery.app]).size!==3)throw Error('Authority, active store and recovery repository need distinct component identities.');
 const interaction=(from,to,label,condition,kind='data')=>{run('logical.connection',{from:from.logical,to:to.logical,label,kind:'flow',condition});run('realisation.interaction',{from:from.app,to:to.app,label:label+' · '+t.id,interaction:kind,condition,failure:a.failure});};
 interaction(authority,store,document?'commits one aggregate':'commits related records',commit,'sync');
 interaction(store,recovery,'retains recovery material',targets+a.recoveryPlan);
 interaction(recovery,store,'restores under controlled recovery','Recovery operation, not normal business writes. Validate and reconcile before reopening access. '+a.restoreTest);
 let dataId=a.dataId;
 if(!dataId)dataId=run('interfaces.data',{title:a.dataScope,purpose:'Authoritative information for '+t.requirementId+'. '+a.invariant,owner:a.owner,authorityId:authority.app,classification:a.classification,retentionPolicy:a.retention,protection:a.isolation,evidence:source,assumptions:'Complete the field dictionary and transaction contract in Chapter 8. '+a.schemaPlan,origin:'suggestion'});
 const data=p.interfaces.data.find(d=>d.id===dataId);if(data.authorityId!==authority.app)throw Error('Preserve the recorded data authority.');
 mark('interfaces.data',dataId,'authoritative data');
 run('realisation.interaction',{from:store.app,to:dataId,label:'persists under application authority · '+t.id,interaction:'data',condition:commit,failure:a.failure});
 const recoveryData=run('interfaces.data',{title:'Recovery copy · '+a.dataScope+' · '+t.id,purpose:'Recovery material derived from '+data.ref+'. No independent business-write authority. '+targets,owner:data.owner,authorityId:authority.app,classification:data.classification,retentionPolicy:'Govern recovery-copy retention and deletion separately. '+a.recoveryPlan,protection:a.isolation,evidence:source,assumptions:'Define backup scope and required log or version chain for the selected implementation. '+a.restoreTest,origin:'suggestion'});mark('interfaces.data',recoveryData,'recovery data');
 run('interfaces.lineage',{from:dataId,to:recoveryData,title:'controlled recovery material',transformation:a.recoveryPlan,owner:a.owner,evidence:source});
 const lineage=p.interfaces.lineage.find(l=>l.from===dataId&&l.to===recoveryData);mark('interfaces.lineage',lineage.id,'recovery lineage');
 run('realisation.interaction',{from:recovery.app,to:recoveryData,label:'retains protected recovery state · '+t.id,interaction:'data',condition:a.isolation+' '+a.recoveryPlan,failure:'Do not report a recovery point without usable recovery material. '+a.restoreTest});
 const boundary=a.boundaryId||run('technology.boundary',{title:a.trustName,owner:a.owner,policy:a.trustPolicy});if(!a.boundaryId)mark('technology.boundary',boundary,'trust boundary');
 const capabilities=[];
 for(const [category,title,supported,key,purpose] of [
  ['transactional',document?'Aggregate persistence':'Relational persistence',[authority,store],'capabilityId',commit],
  ['backup','Protected recovery material',[store,recovery],'backupCapabilityId',a.recoveryPlan],
  ['recovery','Controlled data restoration',[store,recovery],'recoveryCapabilityId',targets+a.restoreTest]
 ]){
  const needs=[];
  for(const {app} of supported){
   const prior=copy(p.technology.needs.filter(n=>n.applicationId===app));let need=prior.find(n=>n.category===category);
   if(!need){run('technology.needs',{applicationId:app,boundaryId:p.technology.applicationBoundaries[app]||boundary,confirmed:false,needs:[...prior,{category,description:purpose,criticality:'essential'}]});for(const old of prior){const i=p.technology.needs.findIndex(n=>n.id===old.id);if(i>=0)p.technology.needs[i]=old;}need=p.technology.needs.find(n=>n.applicationId===app&&n.category===category);}needs.push(need.id);
  }
  let cap=a[key];
  if(cap){const existing=p.technology.capabilities.find(c=>c.id===cap);if(!existing||existing.category!==category||existing.boundaryId!==boundary)throw Error('Use a '+category+' capability in the selected trust boundary.');const snap=modelEditSnapshot(p,{type:'technology.capability',payload:{id:cap}});run('technology.capability',{id:cap,...snap,mappings:[...snap.mappings,...needs.filter(id=>!snap.mappings.some(m=>m.needId===id)).map(needId=>({needId,scope:purpose}))]});}
  else cap=run('technology.capability',{title:title+' · '+t.id,category,purpose,boundary:purpose,owner:a.owner,source,rationale:alternative.rationale,boundaryId:boundary,driverIds:[t.driverId],decisionIds:[decisionId],status:'candidate',continuity:'single',recoveryPlan:targets+a.recoveryPlan,recoveryOwner:a.owner,assumptions:'Logical capability only; no database product, failure topology or recovery result selected or verified.',mappings:needs.map(needId=>({needId,scope:purpose}))});
  mark('technology.capability',cap,category+' support');capabilities.push(cap);
 }
 const operating=run('techrealisation.plan',{title:'Persistence operating plan · '+t.id,purpose:'Operate '+assessment.option.pattern+' for '+a.dataScope+'.',owner:a.owner,operationsPlan:a.concurrency+' '+a.failure+' '+a.restoreTest,accessPlan:a.isolation,dataPlan:commit+' '+a.accessPattern,resiliencePlan:targets+a.recoveryPlan+' '+a.zeroLossPlan,interfacePlan:'Define commit acknowledgement, version and uncertain-outcome enquiry in Chapter 8. '+a.failure,lifecyclePlan:a.schemaPlan+' '+(data.retentionPolicy||a.retention),rationale:alternative.rationale,assumptions:'Select and verify products and configurations in Chapter 7. Recovery targets are declared, not measured. '+(document?a.aggregateBound:''),mappings:capabilities.map(capabilityId=>({capabilityId,scope:'Support the reviewed persistence and recovery contract.'}))});mark('techrealisation.plan',operating,'persistence operating plan');
 for(const o of PERSISTENCE_OPTIONS){const other=assessPersistence(input,t,o.id);run('decision.alternative',{id:decisionId,title:o.title,summary:o.benefit,benefits:o.benefit,costs:o.cost,consequences:o.counterfactual,pattern:o.pattern+' · '+o.tactic,antiPattern:o.id==='aggregate-document'?'Unbounded aggregates or assuming one-document atomicity spans independent aggregates.':'Assuming a transaction alone provides the required isolation or backup recovery.',responsibilityIds:roles,relationships:[],assessments:{[t.driverId]:{effect:other.blockers.length?'tension':'unknown',reason:other.status+' · Verify commit integrity, concurrency and restoration against the scenario.',evidence:t.methodReceipt.packId}}});}
 const decision=p.decisions.records.find(d=>d.id===decisionId);run('decision.choose',{id:decisionId,alternativeId:decision.alternatives.find(o=>o.title===assessment.option.title).id});mark('decision.save',decisionId,'decision');
 return architectureProposal(input,p,t,alternative,used,executed,decisionId,assessment);
}
