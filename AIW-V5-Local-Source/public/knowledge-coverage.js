// A projection of existing authorities, not a second fit or readiness evaluator.
// Only these exact catalogue subjects have a reviewed built-in comparison mapping.
// Similar words, related concepts and repository seeds never supply a mapping.
import {knowledgeStructures} from './knowledge-structure.js';
import {catalogueRecord,knowledgeState,methodKnowledgeCurrent} from './knowledge-governance.js';
import {architectureOptions,interactionSourceReceipt} from './architecture-knowledge.js';
import {COMPOSITION_TOPICS} from './composition-knowledge.js';

const MAPPINGS=[
 ['reads','cache-aside',['PAT-CACHE-ASIDE']],
 ['delivery','transactional-outbox',['PAT-TRANSACTIONAL-OUTBOX']],
 ['resilience','protected-call',['PAT-CIRCUIT-BREAKER','PAT-BULKHEAD']],
 ['resilience','bounded-call',['PAT-RETRY-WITH-BACKOFF']],
 ['partitioning','sharded',['PAT-SHARDING']],
 ['structure','layered-module',['STYLE-LAYERED','PAT-LAYERED-ARCHITECTURE','STYLE-MODULAR-MONOLITH','PAT-MODULAR-MONOLITH']],
 ['structure','service-boundaries',['STYLE-MICROSERVICES']],
 ['interaction','request-reply',['PAT-REQUEST-REPLY']],
 ['interaction','durable-queue',['PAT-QUEUE-BASED-LOAD-LEVELING']],
 ['persistence','relational-transaction',['ARCH-RELATIONAL-DATA-CAPABILITY']],
 ['persistence','aggregate-document',['PAT-DOCUMENT-STORE','ARCH-DOCUMENT-DATA-CAPABILITY']]
];
const FAMILIES={interaction:'Request or deferred completion',reads:'Authoritative read or disposable cache',persistence:'Owned relational or aggregate persistence'};

export function knowledgeConceptCoverage(p,conceptId){
 const structure=knowledgeStructures(p,{conceptIds:[conceptId],includeRelated:false}),description=structure.records.find(r=>r.origin==='catalogue')||null;
 const methods=catalogueRecord(conceptId)?MAPPINGS.filter(([, ,ids])=>ids.includes(conceptId)).flatMap(([topic,optionId])=>{
  const option=architectureOptions(topic).find(o=>o.id===optionId);if(!option)return [];
  const receipt=interactionSourceReceipt(topic);
  return [{topic,optionId,pattern:option.pattern,family:COMPOSITION_TOPICS[topic]?.label||FAMILIES[topic],methodId:receipt.methodId,packId:receipt.packId,fingerprint:receipt.fingerprint,
   sourceIds:[receipt.sources.method.id,...receipt.sources.references.map(r=>r.id)],available:methodKnowledgeCurrent(p,receipt),counterfactual:option.counterfactual}];
 }):[];
 const reviewed=structure.records.filter(r=>r.origin==='governed-claim').map(r=>({claimId:r.claimId,releaseId:r.releaseId,sourceId:r.sourceId,statement:r.record.statement,
  structured:!!r.record.architectureUnit,scope:structuredClone(r.scope),applicability:structuredClone(r.applicability||null),conditions:structuredClone(r.record.conditions),limitations:structuredClone(r.record.limitations),receipt:structuredClone(r.receipt)}));
 const state=knowledgeState(p),releasedIds=new Set(state.releases.filter(r=>state.pins.includes(r.id)).flatMap(r=>r.claims.map(c=>c.id)));
 const inactiveCount=state.claims.filter(c=>c.subjectId===conceptId&&!releasedIds.has(c.id)).length;
 return {conceptId,catalogueLoaded:structure.catalogueLoaded,description,methods,reviewed,inactiveCount,unavailable:structure.unavailable};
}
