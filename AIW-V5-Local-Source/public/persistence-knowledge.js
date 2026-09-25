import {ARCHITECTURE_SOURCES} from './architecture-source-pack.js';
import {targetText,targetIsMeasurable} from './quality-domain.js';
import {readContext} from './read-design-knowledge.js';

export const PERSISTENCE_METHOD='persistence-design-1';
export const PERSISTENCE_SOURCES={id:'AIW-PERSISTENCE-1',version:1,method:structuredClone(ARCHITECTURE_SOURCES.method),references:[
 {id:'MS-DATA-MODELS',title:'Microsoft · Understand data models',url:'https://learn.microsoft.com/en-us/azure/architecture/data-guide/technology-choices/understand-data-store-models',section:'Relational and document stores; avoid pitfalls',accessedAt:'2026-09-20',posture:'Inspected public reference; conditional guidance',statement:'Choose a data model from access patterns and integrity needs before selecting a service. Relational records and document aggregates organize relationships differently. Adding another store also adds operating obligations.',statementSha256:'a00ffd01ea31ad58c633421f16f74dedcfefd0e1b79502266269b924835e4766'},
 {id:'PG-ISOLATION',title:'PostgreSQL 18 · Transaction isolation',url:'https://www.postgresql.org/docs/18/transaction-iso.html',section:'Isolation levels and concurrent transactions',accessedAt:'2026-09-20',posture:'Inspected product example; not a product selection',statement:'A transaction boundary alone does not establish the required concurrent behavior. Isolation level and retry handling matter; even repeatable reads may allow serialization anomalies.',statementSha256:'33f0d0be3262a95ef7113225ca4b6def81f33e1b1b29dba60e1089c0afe9c2fe'},
 {id:'MDB-ATOMICITY',title:'MongoDB · Atomicity and transactions',url:'https://www.mongodb.com/docs/manual/core/write-operations-atomicity/',section:'Single-document writes; multi-document transactions',accessedAt:'2026-09-20',posture:'Inspected product example; not a product selection',statement:'MongoDB supports atomic single-document writes and multi-document transactions. The latter have additional costs. This comparison deliberately limits its document alternative to one aggregate; it makes no claim that document databases lack transactions.',statementSha256:'e9ffb36fa9d31e10c4dd8403635f24b5759e626f6b0ed290d775e4a77ffeafc4'},
 {id:'PG-RECOVERY',title:'PostgreSQL 18 · Continuous archiving and recovery',url:'https://www.postgresql.org/docs/18/continuous-archiving.html',section:'Base backup, archive continuity and restore',accessedAt:'2026-09-20',posture:'Inspected product example; not a recovery guarantee',statement:'Point-in-time recovery needs a usable base backup and a complete required log sequence. Archive delay affects recoverable data; replay work affects restoration time. Recovery material needs protection and operational checks.',statementSha256:'f9ebbc5541ae1f7e9e4e15888ea4f6ddd9e8c9fe5f7830b233e1847d2c522c7f'}
],authority:{automaticAdoption:false,scoring:false,liveRepositoryIndex:false,modelMutation:'Reviewed architect proposal only'}};

PERSISTENCE_SOURCES.method.passages.push(...[{"locator": "Quality Requirements!B13 · RTO", "text": "Recovery Time Objective (RTO):\nThe maximum acceptable time for the system to be down after a failure.\nDefines the business's tolerance for downtime.\nMeasured in minutes or hours.", "sha256": "2018ecc415c8201660f84ae462cb4a1c2ebebc0f59b8c88268fac604966a69f4"}, {"locator": "Quality Requirements!B13 · RPO", "text": "Recovery Point Objective (RPO):\nThe maximum acceptable amount of data loss in case of a failure.\nDefines the business's tolerance for data loss.\nMeasured in minutes or hours.", "sha256": "95a51580cc77963fea9c7758e2ab67018ddf797ab8c801acfce829526293ce76"}, {"locator": "Quality Requirements!B13 · Backups", "text": "Regular Backups:\nPerforming regular data backups to enable recovery in case of data loss.\nBackups should be stored in a secure and separate location from the primary data.", "sha256": "1cd6b7a37742d937ed361047549cde98a022e19552d41ed9365857a4cf69c832"}]);

export const PERSISTENCE_OPTIONS=[
 {id:'relational-transaction',title:'Relational records',pattern:'Relational transaction',style:'Application-owned relational persistence',tactic:'Commit related records within one owned store',capability:'Transactional persistence',benefit:'Express related records, constraints and changes within a declared transaction.',cost:'Requires schema evolution, query design and a concurrency policy for the invariant.',counterfactual:'Reconsider if the workload is naturally served as one bounded aggregate and relational queries add little value.'},
 {id:'aggregate-document',title:'Aggregate document',pattern:'Single aggregate document',style:'Application-owned aggregate persistence',tactic:'Keep one atomic change inside one document',capability:'Transactional persistence',benefit:'Keep a bounded aggregate together for the declared access and update paths.',cost:'Aggregate growth, duplicated facts and changes spanning aggregates need separate treatment.',counterfactual:'Reconsider if the invariant spans aggregates, the document grows without a bound, or access increasingly crosses aggregate boundaries.'}
];
export const PERSISTENCE_FIELDS=['owner','reason','contextReview','boundaryId','trustName','trustPolicy','processorId','processorTitle','storeId','storeTitle','recoveryId','recoveryTitle','capabilityId','backupCapabilityId','recoveryCapabilityId','dataId','dataScope','classification','retention','isolation','accessPattern','transactionScope','invariant','writePolicy','concurrency','failure','schemaPlan','aggregateBound','rpoSeconds','rtoSeconds','recoveryPlan','restoreTest','zeroLossPlan'];
export function persistenceAnswers(raw={}){
 const a=Object.fromEntries(PERSISTENCE_FIELDS.map(k=>[k,typeof raw[k]==='string'?raw[k].trim().slice(0,/Id$/.test(k)?100:/Seconds$/.test(k)?24:/Title$/.test(k)||['owner','trustName','dataScope'].includes(k)?160:2400):'']));
 if(!['aggregate','multi-aggregate','cross-store','unknown'].includes(a.transactionScope))a.transactionScope='unknown';
 if(!['Unclassified','Public','Internal','Confidential','Restricted'].includes(a.classification))a.classification='Unclassified';
 return a;
}
export function persistenceContext(p,a){
 const context=readContext(p,a),dataIds=new Set(context.lineage.flatMap(l=>[l.from,l.to])),participants=[a.processorId,a.storeId,a.recoveryId].filter(Boolean),capabilities=[a.capabilityId,a.backupCapabilityId,a.recoveryCapabilityId].filter(Boolean);
 const mappings=p.technologyRealisation.mappings.filter(m=>capabilities.includes(m.capabilityId));
 return {...context,relatedData:p.interfaces.data.filter(d=>d.id!==a.dataId&&dataIds.has(d.id)).map(d=>structuredClone(d)),contracts:p.interfaces.contracts.filter(c=>participants.includes(c.from)||participants.includes(c.to)).map(c=>structuredClone(c)),operatingMappings:mappings.map(m=>structuredClone(m)),operatingPlans:p.technologyRealisation.records.filter(r=>mappings.some(m=>m.realizationId===r.id)).map(r=>structuredClone(r))};
}
export const validRecoveryTarget=(value,zero=false)=>/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value)&&Number.isFinite(Number(value))&&Number(value)>=(zero?0:Number.MIN_VALUE)&&Number(value)<=31536000;
export function assessPersistence(p,t,optionId){
 const option=PERSISTENCE_OPTIONS.find(o=>o.id===optionId);if(!option)throw Error('Choose a persistence approach.');
 const a=persistenceAnswers(t.answers),document=optionId==='aggregate-document',data=p.interfaces.data.find(d=>d.id===a.dataId),driver=p.quality.drivers.find(d=>d.id===t.driverId&&d.requirementIds.includes(t.requirementId)),checks=[];
 const check=(id,title,state,detail,sourceIds=[])=>checks.push({id,title,state,detail,sourceIds});
 const declared=(id,title,value,sourceIds=[])=>check(id,title,value?'known':'unknown',value||'Record '+title.toLowerCase()+'.',sourceIds);
 check('driver','Quality scenario',driver?'known':'unknown',driver?driver.id+' · '+driver.title:'Link a quality scenario.',['SA-COMPONENT-METHOD']);
 declared('scope','Information being persisted',a.dataScope,['SA-COMPONENT-METHOD']);
 if(!a.dataId&&p.interfaces.data.some(d=>d.title.toLowerCase()===a.dataScope.toLowerCase()))check('duplicate-data','Existing data definition','blocked','Select the existing data definition, or name a distinct information scope.');
 const authorityValid=!a.dataId||data?.authorityId&&data.authorityId===a.processorId&&p.realisation.components.some(c=>c.id===data.authorityId);
 check('data','Information authority',authorityValid?'known':'blocked',authorityValid?data?'Keep '+data.ref+' and its recorded application authority.':'Propose one application-owned information definition.':'Use its recorded application authority. External or missing authority needs Chapter 8 design before composing this persistence path.',['SA-COMPONENT-METHOD']);
 check('atomic-scope','Atomic change boundary',a.transactionScope==='unknown'?'unknown':a.transactionScope==='cross-store'||document&&a.transactionScope==='multi-aggregate'?'blocked':'known',a.transactionScope==='unknown'?'Decide what must commit together.':a.transactionScope==='cross-store'?'Neither local proposal commits atomically across independent stores or services. Develop that coordination boundary separately.':document&&a.transactionScope==='multi-aggregate'?'This single-document proposal cannot cover an invariant across aggregates. A document database may support wider transactions, but that needs a different, explicitly validated design.':a.transactionScope==='aggregate'?'One declared aggregate is the atomic scope.':'Related aggregates commit inside one owned relational store.',['MDB-ATOMICITY','PG-ISOLATION']);
 declared('invariant','Invariant and records that change together',a.invariant,['SA-COMPONENT-METHOD']);
 declared('access','Read and write access paths',a.accessPattern,['MS-DATA-MODELS']);
 declared('writers','Permitted writers and commit acknowledgement',a.writePolicy,['PG-ISOLATION']);
 declared('concurrency','Concurrent updates and conflict handling',a.concurrency,['PG-ISOLATION','MDB-ATOMICITY']);
 declared('failure','Timeout and uncertain commit response',a.failure);
 declared('schema','Schema evolution and validation',a.schemaPlan,['MS-DATA-MODELS']);
 if(document)declared('aggregate-bound','Aggregate size and growth bound',a.aggregateBound,['MS-DATA-MODELS']);
 declared('owner','Accountable data and recovery owner',a.owner,['SA-COMPONENT-METHOD']);
 const classification=data?.classification||a.classification;
 check('classification','Information classification',classification==='Unclassified'?'unknown':'known',classification,['SA-COMPONENT-METHOD']);
 declared('protection','Data access and recovery-copy protection',a.isolation);
 if(!data)declared('retention','Authoritative retention and deletion',a.retention);
 check('rpo','Maximum acceptable data loss',validRecoveryTarget(a.rpoSeconds,true)?'known':'unknown',validRecoveryTarget(a.rpoSeconds,true)?'Proposed RPO: '+a.rpoSeconds+' seconds. This is a requirement, not measured recovery.':'Enter a finite RPO in seconds, including zero if no loss is acceptable.',['SA-COMPONENT-METHOD','PG-RECOVERY']);
 check('rto','Maximum acceptable recovery time',validRecoveryTarget(a.rtoSeconds)?'known':'unknown',validRecoveryTarget(a.rtoSeconds)?'Proposed RTO: '+a.rtoSeconds+' seconds. Include detection, restore, validation and return to service.':'Enter a positive RTO in seconds, up to one year.',['SA-COMPONENT-METHOD']);
 declared('recovery','Recovery material, isolation and restore procedure',a.recoveryPlan,['PG-RECOVERY']);
 declared('restore-test','Restore exercise and reconciliation evidence',a.restoreTest,['PG-RECOVERY']);
 if(validRecoveryTarget(a.rpoSeconds,true)&&Number(a.rpoSeconds)===0)declared('zero-loss','No-loss acknowledgement and failure scope',a.zeroLossPlan,['PG-RECOVERY']);
 if(t.basis.decisions.length||t.basis.constraints.length)declared('upstream','Existing decisions and constraints',a.contextReview,['SA-COMPONENT-METHOD']);
 check('trust','Trust boundary',a.boundaryId?p.technology.boundaries.some(b=>b.id===a.boundaryId)?'known':'blocked':a.trustName&&a.trustPolicy?'known':'unknown',a.boundaryId?'Preserve the selected boundary policy.':'Name the proposed boundary and access policy.');
 const roleIds=['processorId','storeId','recoveryId'].map(k=>a[k]).filter(Boolean);
 if(new Set(roleIds).size!==roleIds.length)check('distinct-roles','Distinct component roles','blocked','The business authority, active store and recovery repository need distinct identities.');
 for(const [key,kind] of [['processorId',null],['storeId','store'],['recoveryId','store']])if(a[key]){
  const component=p.realisation.components.find(c=>c.id===a[key]);
  if(!component||kind&&component.kind!==kind)check(key,'Selected component','blocked','Choose a current '+(kind||'application')+' component for '+key.replace('Id','')+'.');
 }
 for(const [key,category] of [['capabilityId','transactional'],['backupCapabilityId','backup'],['recoveryCapabilityId','recovery']])if(a[key]){
  const capability=p.technology.capabilities.find(c=>c.id===a[key]);
  if(!capability||capability.category!==category||capability.boundaryId!==a.boundaryId)check(key,'Reused '+category+' capability','blocked','Select its existing trust boundary and a matching '+category+' capability.');
 }
 const effects=[
  {quality:'Integrity',effect:'Explicit boundary',why:document?'Only the declared aggregate is inside this proposed atomic write.':'Related records commit together only within the declared store transaction.',verify:'Interrupt the change between writes and check the invariant after retry and recovery.'},
  {quality:'Concurrency',effect:'Obligation',why:'The chosen representation does not prevent lost updates by itself. Apply the recorded conflict policy.',verify:'Run competing writes to the same business reference; check both acknowledgements and the final state.'},
  {quality:'Access and evolution',effect:'Trade-off',why:document?'Bound document growth and account for duplicated facts and cross-aggregate reads.':'Review joins, indexes, constraints and migrations under the actual workload.',verify:'Exercise representative reads, writes and schema changes at expected data volume.'},
  {quality:'Recoverability',effect:'Target to prove',why:'RPO '+(a.rpoSeconds||'unset')+' s · RTO '+(a.rtoSeconds||'unset')+' s. A configured backup is not a demonstrated restore.',verify:'Restore into isolation; measure lost committed work and total service recovery time, then reconcile.'},
  {quality:'Protection and operations',effect:'Additional copy',why:'Recovery material has its own access, retention, deletion and restore duties. It does not become a business writer.',verify:'Exercise access revocation, deletion obligations and the recovery owner’s runbook.'}
 ];
 const blockers=checks.filter(c=>c.state==='blocked'),unknown=checks.filter(c=>c.state==='unknown');
 return {optionId,option,checks,effects,blockers,unknown,ready:!blockers.length&&!unknown.length,status:blockers.length?'Conflicts with your answers':unknown.length?'Needs clarification':'Ready for model review',driver:driver?{id:driver.id,title:driver.title,target:targetText(driver),confirmed:driver.targetConfirmed,measurable:targetIsMeasurable(driver),response:driver.response,conditions:driver.conditions,verification:driver.measurement}:null,caveats:[...(!driver||!targetIsMeasurable(driver)?['The linked quality scenario still needs a measurable target.']:[]),'RPO and RTO are proposed design conditions; accepting this model does not change the Chapter 2 target or prove recovery.',...(a.owner.toLowerCase()==='unassigned'?['Accountable ownership remains unresolved.']:[])],score:null};
}
