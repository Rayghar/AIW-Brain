// Method eligibility is decided by typed project conditions, never by prose.
export function reasoningContract(packet){
 const source=packet.sources.find(s=>s.kind==='architecture-knowledge');if(!source)return {method:null,options:[],blocked:[],unresolved:[]};
 const method=JSON.parse(source.excerpt),shared=method.sharedByEveryAlternative?.checks||[];
 const options=(method.graphs||[]).map(g=>({id:g.optionId,checks:[...shared,...(g.checks||[])]}));
 return {method:source.ref,options,blocked:options.flatMap(o=>o.checks.filter(c=>c.state==='blocked').map(c=>({option:o.id,...c}))),unresolved:options.flatMap(o=>o.checks.filter(c=>c.state==='unknown').map(c=>({option:o.id,...c})))};
}
export function enforceReasoningContract(packet,result){
 const contract=reasoningContract(packet),issues=[];
 // A blocked recipe may still be discussed, but its explanation is assembled
 // from the governed method. A generated caveat cannot waive its prerequisites.
 if(contract.blocked.length)issues.push('One or more alternatives are blocked by the saved method. Use the exact method findings; generated wording cannot make these alternatives eligible.');
 const sentences=[result.summary,result.passage,...result.assumptions,...(result.architectureDraft||[]).flatMap(s=>[s.value,s.rationale])].join('\n').split(/(?<=[.!?])\s+|\n+/);
 for(const s of sentences){
  if(/\b(?:not|never|cannot|doesn.t|isn.t|no guarantee|unverified|not yet)\b/i.test(s))continue;
  if(/\b(?:guarantees?|ensures?|achieves?|establishes?)\b.{0,90}\b(?:zero loss|no loss|exactly.once|100%|verified|availability|reliability)\b/i.test(s))issues.push('A mechanism or declared condition was described as guaranteeing a verified outcome.');
  if(/\b(?:deduplicat\w*|idempoten\w*|detect\w* loss|loss.detect\w*)\b.{0,100}\b(?:prevent\w*|ensur\w*|achiev\w*)\b.{0,50}\b(?:zero.loss|loss.free|no.loss)\b/i.test(s))issues.push('Duplicate handling or detecting loss cannot establish loss prevention.');
  if(/\b(?:verified|proven|validated)\b.{0,60}\b(?:trust policy|atomicity|session recovery|production|reliability)\b/i.test(s))issues.push('Declared design conditions cannot be promoted to verified implementation facts.');
  if(/\b(?:only|must)\b.{0,70}\b(?:single|one) deployment\b/i.test(s)&&/transaction|atomic/i.test(s))issues.push('A storage transaction boundary cannot be inferred solely from deployment topology.');
 }
 return {version:1,contract,issues:[...new Set(issues)],accepted:issues.length===0};
}
