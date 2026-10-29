// The result contract reuses one accepted read design. Its answers, placement
// and source basis remain in the existing guided task; no read-policy copy is
// stored on the contract. This projection imports no chapter/domain cycle.
import {designRequirementBasis} from './design-requirement-basis.js';
import {architectureTaskContext} from './architecture-task-context.js';
import {READ_METHOD,READ_SOURCES,readAnswers,readContext} from './read-design-knowledge.js';
import {ARCHITECTURE_EVALUATION_REVISION,architectureMethodReceiptStatus} from './composition-manifest.js';
import {methodKnowledgeCurrent,taskKnowledgeCurrent} from './knowledge-governance.js';
import {changeFingerprint} from './changes-domain.js';
import {list} from './util.js';

export function resultReadContext(p,id){
 const task=list(p.coauthoring?.designTasks).find(t=>t.id===id)||null;
 if(!task)return {task:null,solution:null,sourceRecords:[],current:false,methodCurrent:false,requirements:[],drivers:[],roleIds:{},data:null};
 const solution=task.applied?.reasoningGraph?.solution||null,answers=readAnswers(task.answers),previous=task.sourceReview?.basis||task.basis;
 let basis=null,context=null,current=false;
 try{basis=designRequirementBasis(p,task.requirementId,previous?.contextIds);context=architectureTaskContext(p,answers,{readContext:readContext(p,answers)});current=changeFingerprint(basis)===changeFingerprint(previous)&&changeFingerprint(context)===changeFingerprint(task.architectureBasis);}catch{/* Missing dependencies remain an explicit question. */}
 const methodCurrent=architectureMethodReceiptStatus(task.methodReceipt,{methodId:READ_METHOD,packId:READ_SOURCES.id,fingerprint:changeFingerprint({...READ_SOURCES,evaluationRevision:ARCHITECTURE_EVALUATION_REVISION})}).current&&methodKnowledgeCurrent(p,task.methodReceipt)&&taskKnowledgeCurrent(p,task);
 const roleIds=Object.fromEntries(['caller','processor','cache'].map(role=>[role,list(solution?.placement).find(x=>x.role===role)?.componentId||'']));
 const records=[task,...list(basis?.drivers),...list(basis?.decisions),...list(basis?.constraints),...list(basis?.designContext),...list(basis?.sources),basis?.requirement,...list(context?.records),context?.readContext?.data,context?.readContext?.authority,...list(context?.readContext?.lineage),...list(context?.allocations),...list(context?.interactions),...list(context?.needs),...list(context?.support)].filter(Boolean);
 const sourceRecords=[...new Map(records.filter(r=>r.id).map(r=>[r.id,r])).values()];
 return {task,solution,answers,sourceRecords,current:current&&methodCurrent,methodCurrent,basis,context,requirements:basis?.requirement?[basis.requirement]:[],drivers:list(basis?.drivers),roleIds,data:context?.readContext?.data||null};
}
