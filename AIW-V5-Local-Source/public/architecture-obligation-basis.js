// Stable identity and dependency basis for accepted architecture obligations.
import {digest} from './brain-integrity.js';
import {readContent} from './source-fingerprint.js';
import {driversForComponent} from './driver-scope.js';
import {claimReceiptCurrent,withdrawn,BRAIN_PLAYBOOK} from './knowledge-governance.js';
import {architectureMethodReceiptStatus} from './composition-manifest.js';
import {remember} from './document-memo.js';
const list=value=>Array.isArray(value)?value:[];
const unique=values=>[...new Set(values.filter(Boolean))];
export const obligationContent=value=>JSON.parse(JSON.stringify(readContent(value??null),(key,item)=>['history','revision','sourceSnapshot','sourceStamp','recorded','approval','review','checks','intake','handoff','generation','measurements','simulations'].includes(key)?undefined:item));
// This is the existing delivery-action definition, shared with Chapter 11 so
// its verification and this projection never disagree about the action judged.
export const deliveryActionDefinition=a=>({id:a.id,title:a.title,owner:a.owner,due:a.due,acceptance:a.acceptance,objectIds:a.objectIds,findingId:a.findingId,sourceStamp:a.sourceStamp,...(a.plateauId?{plateauId:a.plateauId}:{}),...(a.architectureObligation?{architectureObligation:a.architectureObligation}:{}),...(a.verificationContract?{verificationContract:a.verificationContract}:{})});
export const architectureActionStamp=a=>digest(deliveryActionDefinition(a));
export function acceptedObligation(p,ref){
 if(!ref||ref.projectId!==p?.id)return null;
 const task=list(p.coauthoring?.designTasks).find(t=>t.id===ref.taskId&&t.status==='applied'),solution=task?.applied?.reasoningGraph?.solution;
 const obligation=solution?.id===ref.solutionId&&list(solution.obligations).find(o=>o.id===ref.obligationId);
 return obligation?{task,solution,obligation}:null;
}

// A verification reads this obligation's positive dependencies, never the whole
// project or its review state. Adding progress/evidence cannot stale itself.
export function architectureObligationBasis(p,ref){return remember(p,'architecture:obligation-basis',JSON.stringify([ref?.projectId,ref?.taskId,ref?.solutionId,ref?.obligationId]),()=>obligationBasis(p,ref));}
function obligationBasis(p,ref){
 const found=acceptedObligation(p,ref);if(!found)return {ready:false,stamp:null,reference:ref,sourceIds:[],recordIds:[],reasons:['The accepted obligation is unavailable in this project.']};
 const {task,solution:s,obligation:o}=found,targets=new Set(list(o.targetIds)),reasons=[],records=[];
 const add=(kind,values)=>{for(const r of list(values))records.push({kind,id:r.id||kind,value:obligationContent(r)});};
 const components=list(p.realisation?.components).filter(r=>targets.has(r.id));
 if(components.length!==targets.size||!targets.size)reasons.push('An obligation target is missing.');
 add('component',components);
 const allocations=list(p.logical?.mappings).filter(r=>targets.has(r.physicalId)),responsibilityIds=new Set(allocations.map(r=>r.logicalId));
 add('responsibility',list(p.logical?.responsibilities).filter(r=>responsibilityIds.has(r.id)));add('allocation',allocations);
 add('interaction',list(p.realisation?.connections).filter(r=>targets.has(r.from)||targets.has(r.to)));
 add('logical-interaction',list(p.logical?.connections).filter(r=>responsibilityIds.has(r.from)||responsibilityIds.has(r.to)));
 const drivers=unique([...list(o.driverIds),...components.flatMap(r=>driversForComponent(p,r.id).map(d=>d.id))]);
 add('driver',list(p.quality?.drivers).filter(r=>drivers.includes(r.id)));
 if(list(o.driverIds).some(id=>!list(p.quality?.drivers).some(d=>d.id===id)))reasons.push('A linked driver is missing.');
 add('requirement',list(p.artefacts).filter(r=>list(s.requirementIds).includes(r.id)));
 add('decision',list(p.decisions?.records).filter(r=>r.id===s.decisionId));
 const contracts=list(p.interfaces?.contracts).filter(r=>targets.has(r.from)||targets.has(r.to)),dataIds=new Set(contracts.flatMap(r=>list(r.exchanges).map(x=>x.dataId)));
 add('contract',contracts);const data=list(p.interfaces?.data).filter(r=>targets.has(r.authorityId)||dataIds.has(r.id));add('data',data);for(const r of data)dataIds.add(r.id);
 const needs=list(p.technology?.needs).filter(r=>targets.has(r.applicationId)),needIds=new Set(needs.map(r=>r.id)),support=list(p.technology?.mappings).filter(r=>needIds.has(r.needId)),capIds=new Set(support.map(r=>r.capabilityId));
 add('need',needs);add('support',support);const caps=list(p.technology?.capabilities).filter(r=>capIds.has(r.id));add('capability',caps);
 const boundaryIds=new Set([...caps.map(c=>c.boundaryId),...components.map(c=>p.technology?.applicationBoundaries?.[c.id])].filter(Boolean));
 add('application-boundary',components.map(c=>({id:c.id,boundaryId:p.technology?.applicationBoundaries?.[c.id]||null})));
 const realisations=list(p.technologyRealisation?.mappings).filter(r=>capIds.has(r.capabilityId)),realisationIds=new Set(realisations.map(r=>r.realizationId));add('realisation-allocation',realisations);
 for(const r of list(p.technologyRealisation?.records).filter(r=>realisationIds.has(r.id))){const {options,...definition}=r;add('realisation',[definition]);add('selected-configuration',list(options).filter(o=>o.id===r.selectedOptionId));}
 const runtimePlans=list(p.runtime?.plans).filter(r=>realisationIds.has(r.assetId)||targets.has(r.assetId)),runtimeIds=new Set(runtimePlans.map(r=>r.id)),environmentIds=new Set(runtimePlans.map(r=>r.environmentId));add('runtime-plan',runtimePlans);
 const placements=list(p.runtime?.placements).filter(r=>runtimeIds.has(r.planId)),zoneIds=new Set([...placements.map(r=>r.zoneId),...runtimePlans.map(r=>r.backupZoneId)]);add('runtime-placement',placements);
 const zones=list(p.runtime?.zones).filter(r=>zoneIds.has(r.id));add('runtime-zone',zones);for(const z of zones)for(const id of [z.boundaryId,...list(z.boundaryIds)])if(id)boundaryIds.add(id);
 add('runtime-environment',list(p.runtime?.environments).filter(r=>environmentIds.has(r.id)).map(r=>({...r,assetIds:list(r.assetIds).filter(id=>targets.has(id)||realisationIds.has(id))})));
 const contractIds=new Set(contracts.map(r=>r.id)),paths=list(p.runtime?.paths).filter(r=>contractIds.has(r.contractId)&&environmentIds.has(r.environmentId));add('runtime-path',paths);for(const r of paths)for(const id of list(r.boundaryIds))boundaryIds.add(id);
 add('trust-boundary',list(p.technology?.boundaries).filter(r=>boundaryIds.has(r.id)));
 const securityTargets=new Set([...targets,...contractIds,...dataIds,...capIds,...realisationIds,...boundaryIds]);add('control',list(p.security?.controls).filter(r=>list(r.targetIds).some(id=>securityTargets.has(id))));
 const claimSupport=[...list(task.governedKnowledge),task.governedConcern?.receipt,task.methodReceipt?.governedConcern?.receipt].filter(Boolean),claims=[...new Map(claimSupport.map(r=>[r.releaseId+':'+r.claimId,r])).values()].map(r=>({receipt:r,current:claimReceiptCurrent(p,r)}));
 const sourceIds=unique([...list(o.sourceIds),...list(s.receipt?.sourceIds),...claimSupport.flatMap(r=>[r.sourceId,r.claimId,r.releaseId]),task.methodReceipt?.packId,task.methodReceipt?.methodId,task.methodReceipt?.sources?.method?.id,...list(task.methodReceipt?.sources?.references).map(r=>r.id),...(task.methodReceipt?.sources?.method?.file||task.methodReceipt?.sources?.file?['SA-PLAYBOOK',BRAIN_PLAYBOOK.id]:[])]);
 const revoked=withdrawn(p,sourceIds);if(revoked.length)reasons.push('A source supporting this obligation was withdrawn.');
 if(!architectureMethodReceiptStatus(task.methodReceipt).interpretationCurrent)reasons.push('The architecture method interpretation needs review.');
 if(claims.some(r=>!r.current))reasons.push('A reviewed source interpretation changed or is no longer eligible.');
 const basis={version:1,reference:{projectId:p.id,taskId:task.id,solutionId:s.id,obligationId:o.id},obligation:o,placement:list(s.placement).filter(r=>targets.has(r.componentId)),method:task.methodReceipt,sourceReceipt:s.receipt,claims,revoked,records,parameters:Object.fromEntries(list(o.fieldKeys).map(key=>[key,task.answers?.[key]??null]))};
 return {ready:!reasons.length,stamp:digest(basis),reference:basis.reference,recordIds:unique(records.map(r=>r.id)),sourceIds,reasons};
}

