// A projection of existing authorities, not a second fit or readiness evaluator.
// Only the exact catalogue subjects the built-in crosswalk names under scheme aiw-method (knowledge-crosswalk.js; until
// rc44 wp1 S2 a private table of this module) have a reviewed built-in comparison: the option realises the subject.
// Similar words, related concepts and repository seeds never supply a mapping.
import {knowledgeStructures} from './knowledge-structure.js';
import {catalogueRecord,knowledgeState,methodKnowledgeCurrent} from './knowledge-governance.js';
import {architectureOptions,interactionSourceReceipt} from './architecture-knowledge.js';
import {COMPOSITION_TOPICS} from './composition-knowledge.js';
import {METHOD_CROSSWALK} from './knowledge-crosswalk.js';

const FAMILIES={interaction:'Request or deferred completion',reads:'Authoritative read or disposable cache',persistence:'Owned relational or aggregate persistence'};

export function knowledgeConceptCoverage(p,conceptId){
 const structure=knowledgeStructures(p,{conceptIds:[conceptId],includeRelated:false}),description=structure.records.find(r=>r.origin==='catalogue')||null;
 const methods=catalogueRecord(conceptId)?METHOD_CROSSWALK.filter(r=>r.conceptId===conceptId).flatMap(({aliasId})=>{const [topic,optionId]=aliasId.split('/');
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
