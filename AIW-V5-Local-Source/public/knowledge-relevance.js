// Topic retrieval, not pattern selection or proof of fitness. Only the selected
// object and its upstream intent participate; shared neighbours cannot import intent.
const fields=['title','description','purpose','acceptance','scenario','consequence','stimulus','conditions','response','rationale','question','boundary','information','policy','enforcement','failureMode','failureResponse','recoveryStrategy','isolation','retryPolicy','idempotencyPolicy','deliverySemantics','orderingPolicy'];
const rules=[
 {id:'PAT-TRANSACTIONAL-OUTBOX',topic:'a database change and downstream notification',
  match:s=>/\b(outbox|dual[ -]writ(?:e|es|ing))\b/i.test(s)||(/\b(database|commit|transaction)\b/i.test(s)&&/\b(publish\w*|notif(?:y|ication\w*)|events?)\b/i.test(s)),
  limit:'Confirm that the business change and outbox entry can share one local transaction. Delivery can still repeat.',
  question:'Can the business change and notification share one local transaction, and how will consumers handle duplicate delivery?'},
 {id:'PAT-CIRCUIT-BREAKER',topic:'an unhealthy remote dependency',
  match:s=>/\bcircuit[ -]breaker\b/i.test(s)||(/\b(dependency|dependencies|upstream|remote|downstream)\b/i.test(s)&&/\b(timeout\w*|tim(?:e|ing)[ -]out|slow|fail\w*|unavailable)\b/i.test(s)),
  limit:'A circuit breaker limits repeated calls; it does not repair the dependency. Safe fallback and recovery probes need design.',
  question:'When should calls stop, what response remains safe, and how will recovery be tested without another traffic surge?'},
 {id:'PAT-RETRY-WITH-BACKOFF',topic:'retrying a temporary failure',
  match:s=>/\b(retr(?:y|ies|ied|ying)|backoff|back-off|transient (?:failure|error)s?)\b/i.test(s),
  limit:'Retry only failures classified as transient. Confirm idempotency and the total time budget before repeating work.',
  question:'Which failures are safe to retry, what prevents duplicate effects, and what bounds the total retry time?'},
 {id:'PAT-BULKHEAD',topic:'isolation of constrained resources',
  match:s=>/\b(bulkhead|noisy neighbou?r|resource exhaustion|(?:thread|connection|worker) pools?|reserved capacity)\b/i.test(s),
  limit:'Identify the resource and failure domain being isolated. Separate limits can still share a failing database or broker.',
  question:'Which workload needs reserved capacity, and does its isolation survive failure of the shared database or broker?'},
 {id:'PAT-ZERO-TRUST',topic:'identity and trust across a boundary',
  match:s=>/\b(zero[ -]trust|lateral movement|move laterally|perimeter trust|workload identit(?:y|ies))\b/i.test(s)||(/\b(?:each|every|per)[ -]request\b/i.test(s)&&/\b(authenticat\w*|authori[sz]\w*|identit\w*)\b/i.test(s)),
  limit:'The pattern name does not establish a control. Identity, policy availability, enforcement and exception handling need explicit design.',
  question:'Where is each access decision enforced, and what happens when identity or policy services are unavailable?'},
 {id:'PAT-EVENT-SOURCING',topic:'authoritative history or reconstruction',
  match:s=>/\b(event history|replay|reconstruct\w*|temporal|event sourcing|immutable history)\b/i.test(s),
  limit:'An audit trail alone does not justify event sourcing. Confirm authoritative history, rebuild needs and data-erasure obligations.',
  question:'Must recorded events be authoritative, or would a simpler audit trail satisfy the need? How will rebuild and erasure work?'}
];
function passages(c,prompt){
 const nodes=[c.selected,...c.requirements,...c.drivers,...c.decisions],seen=new Set(),out=[];
 for(const n of nodes){
  if(seen.has(n.id))continue;seen.add(n.id);
  for(const field of fields){const value=field==='title'?n.title:n.record?.[field];if(typeof value!=='string')continue;
   for(const excerpt of value.split(/[.!?;\n]+/).map(s=>s.trim()).filter(Boolean))out.push({objectId:n.id,title:n.title,field,excerpt:excerpt.slice(0,600),origin:'saved-model'});
  }
 }
 if(prompt)for(const excerpt of prompt.split(/[.!?;\n]+/).map(s=>s.trim()).filter(Boolean))out.push({objectId:null,title:'Your exploration question',field:'prompt',excerpt:excerpt.slice(0,600),origin:'request'});
 return out;
}
export function relevantKnowledge(c,{prompt=''}={}){
 if(c.selected.id==='project')return [];
 const inputs=passages(c,prompt),matches=[];
 for(const rule of rules){
  // Handle explicit exclusions of the named technique without discarding phrases
  // such as "retry without duplicate effects". This is intentionally not semantic NLP.
  const term={'PAT-TRANSACTIONAL-OUTBOX':'(?:outbox|dual[ -]writ\\w*)','PAT-CIRCUIT-BREAKER':'circuit[ -]breakers?','PAT-RETRY-WITH-BACKOFF':'(?:retr(?:y|ies|ying)|backoff)','PAT-BULKHEAD':'bulkheads?','PAT-ZERO-TRUST':'zero[ -]trust','PAT-EVENT-SOURCING':'(?:event sourcing|replay|reconstruction|event history)'}[rule.id];
  const negated=new RegExp('\\b(?:no|never|avoid|without|do not|does not|must not)\\s+(?:(?:use|need|require|implement|using)\\s+)?'+term+'\\b|\\b'+term+'\\s+(?:(?:is|are)\\s+)?(?:not needed|not required|forbidden|out of scope)\\b','i');
  const signals=inputs.filter(s=>!negated.test(s.excerpt)&&rule.match(s.excerpt)).sort((a,b)=>Number(b.origin==='request')-Number(a.origin==='request')).slice(0,2);
  if(signals.length)matches.push({...rule,kind:'context',signals,why:(signals[0].origin==='request'?'Your question':signals[0].objectId+' · '+signals[0].title)+' mentions '+rule.topic+'. This is a topic to examine; suitability remains unconfirmed.'});
 }
 if(matches.length)return matches.sort((a,b)=>Number(b.signals.some(s=>s.origin==='request'))-Number(a.signals.some(s=>s.origin==='request'))).slice(0,3).map(({match,...r})=>r);
 if((c.requirements.length||c.selected.record?.type==='requirement')&&c.selected.chapter<=7)return [
  {id:'STYLE-LAYERED',kind:'comparison',approach:'cohesive',signals:[],why:'A starting point for comparing dependency direction and cohesive ownership. No specific pattern need was matched.',limit:'A cohesive boundary is a local design option; it does not establish a layered architecture.',question:'Could one cohesive boundary meet the recorded quality scenarios with less operating complexity?'},
  {id:'STYLE-MICROSERVICES',kind:'comparison',approach:'separate',signals:[],why:'A starting point for examining separate ownership, change or recovery. No specific pattern need was matched.',limit:'A separate coordinator does not establish a microservices architecture. Independent operation must be justified.',question:'What recorded need justifies independent ownership or deployment, and can the team sustain its operating obligations?'}
 ];
 return [];
}
