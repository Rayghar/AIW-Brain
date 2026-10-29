// Stable identities shared by source definitions and withdrawal governance.
// Looking up an identity must not load or evaluate the design methods.
export const ARCHITECTURE_EVALUATION_REVISION=2;
// A lightweight reader can detect an obsolete interpretation without loading
// the evaluators. Native method review supplies the current identity/fingerprint
// too; absent source material remains unknown, never implicitly current.
export function architectureMethodReceiptStatus(receipt,current=null){
 const interpretationCurrent=receipt?.sources?.evaluationRevision===ARCHITECTURE_EVALUATION_REVISION;
 const identityCurrent=current?receipt?.methodId===current.methodId&&receipt?.packId===current.packId:null;
 const sourceCurrent=current?receipt?.fingerprint===current.fingerprint:null;
 return {interpretationCurrent,identityCurrent,sourceCurrent,current:current?interpretationCurrent&&identityCurrent&&sourceCurrent:null};
}
const method=(methodId,packId)=>Object.freeze({methodId,packId});
export const COMPOSITION_METHOD_IDENTITIES=Object.freeze({
 delivery:method('composition-delivery-1','AIW-COMPOSITION-DELIVERY-1'),
 resilience:method('composition-resilience-1','AIW-COMPOSITION-RESILIENCE-1'),
 distribution:method('composition-distribution-1','AIW-COMPOSITION-DISTRIBUTION-1'),
 partitioning:method('composition-partitioning-1','AIW-COMPOSITION-PARTITIONING-1'),
 structure:method('composition-structure-1','AIW-COMPOSITION-STRUCTURE-1')
});
export const COMPOSITION_REFERENCE_IDS=Object.freeze({
 outbox:'AWS-OUTBOX',
 breaker:'MS-CIRCUIT',
 bulkhead:'MS-BULKHEAD',
 retry:'MS-RETRY',
 balance:'MS-LB-PROBES',
 proxy:'NGINX-PROXY',
 proxyBalance:'NGINX-HTTP-BALANCE',
 sharding:'MS-SHARDING',
 microservices:'MS-MICROSERVICES',
 layers:'MS-N-TIER',
 consumers:'MS-COMPETING'
});
export const COMPOSITION_SLOTS=['caller','processor','secondary','store','queue','relay','consumer','router','recovery'];

// A bounded interpretation shared by the native interface editor and the
// composition reading. These declarations are never inferred from policy prose.
export const EXECUTION_COMPOSITION=Object.freeze({id:'AIW-EXECUTION-COMPOSITION-1',version:6,
 title:'Delivery, repeat protection and bounded caller behavior',
 callerScope:'A request contract identifies the invocation boundary for bounded retries or a caller circuit, including a circuit with no automatic retries. A logical event or batch path does not establish this boundary.',
 outcomeScope:'One submission may name one separate authoritative status request or result event in the same environment. Explicit operation correlation, result meaning, payload ownership and the exact result boundary are required. The link does not establish runtime finality or follow further result-contract links.',
 readScope:'An authoritative status request may explicitly reuse one accepted read design for the same caller, authority and result dictionary. Its declared freshness and age limit must satisfy the result consumer’s contract. Cache-aside alone cannot satisfy a latest-committed-value contract. Accepted declarations remain subject to source review and implementation verification.',
 journeyScope:'Up to twelve explicitly linked request/result contracts may be read together. An invocationParentId declares one child invocation per waiting parent attempt, with parent provider equal to child caller and exact authored paths in the same environment. This does not declare the same business operation or a transaction. Result links retain their separate operation-identity, authority and terminal-result checks. Process flows provide context only. Nested attempt exposure and declared waiting budgets are bounds, not forecasts; arbitrary sagas, compensation and undeclared calls remain outside this interpretation.',
 sources:[
  {id:COMPOSITION_REFERENCE_IDS.outbox,url:'https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html',section:'Issues and considerations; Using an outbox table',statement:'Retain the business change and publication intent in one local transaction. A relay can publish duplicates; the consumer effect needs separate repeat protection.'},
  {id:'AWS-IDEMPOTENT-API',url:'https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/',section:'Retrying and side effects; Reducing client complexity; Same client request ID, different intent',statement:'An absent response leaves the outcome uncertain. A caller-provided operation identity can distinguish retries from new intent. Recording duplicate identity and its mutating effect must be atomic; a changed intent under the same identity needs explicit rejection.'},
  {id:'MS-ASYNC-OUTCOME',url:'https://learn.microsoft.com/en-us/azure/architecture/patterns/asynchronous-request-reply',section:'Solution; Problems and considerations',statement:'Acceptance of asynchronous work is distinct from completion. Correlate the retained operation with its authoritative status or result; pending is not success. Status access, retention and failure handling require their own contract.'},
  {id:'MS-CACHE-ASIDE',url:'https://learn.microsoft.com/en-us/azure/architecture/patterns/cache-aside',section:'Solution; Problems and considerations; When to use',statement:'Cache-aside keeps a disposable read copy and does not guarantee consistency with the source. The expiration policy must match permitted staleness; source writes and invalidation have distinct responsibilities.'},
  {id:'MS-CACHING',url:'https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching',section:'Caching in distributed applications; Manage data expiration',statement:'Cached values are snapshots of source data. Their accepted age, access protection, invalidation, concurrency and recovery behavior need an explicit contract and verification.'},
  {id:'MS-TRANSIENT-FAULTS',url:'https://learn.microsoft.com/en-us/azure/architecture/best-practices/transient-faults',section:'Check whether retrying suits the operation; Determine an appropriate retry count and interval; Avoid antipatterns',statement:'Restrict retries to eligible transient failures. The total attempt durations and delays must fit the caller time budget. Nested retry owners can multiply attempts and require their own combined analysis. Test configured bounds and aggregate load.'},
  {id:COMPOSITION_REFERENCE_IDS.breaker,url:'https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker',section:'Context and problem; Solution',statement:'A caller-side circuit breaker limits repeated access to a failing dependency. Retry logic must honor an open circuit rather than continuing to invoke it. Opening a circuit does not establish the result of an earlier business operation.'}
 ].map(s=>({...s,accessedAt:'2026-10-20',authority:'Primary source inspected by AIW implementation author; bounded interpretation, not independent project approval'}))});
const executionField=(key,label,options)=>({key,label,options});
export const EXECUTION_FIELDS=Object.freeze([
 executionField('environmentId','Operating environment',null),
 executionField('delivery','Required delivery',[['required','Every committed change must remain deliverable'],['best-effort','Downstream loss is explicitly acceptable']]),
 executionField('publication','State and publication intent',[['atomic-commit','One atomic commit retains state and intent'],['after-commit','Publication happens after a separate commit'],['direct','Direct call after the business commit']]),
 executionField('repetition','Can this operation arrive again?',[['possible','Retry or redelivery is possible'],['none','This contract prohibits repeated execution attempts']]),
 executionField('identity','Identity across attempts',[['stable','Preserve the original operation identity'],['per-attempt','Create a new identity on each attempt']]),
 executionField('protection','Protection of the business effect',[['atomic-deduplication','Duplicate record and effect commit atomically'],['idempotent-effect','Repeating the operation has no additional effect'],['broker-only','Only the transport deduplicates'],['none','Repeated business effects are unprotected']]),
 executionField('repeatOwnerId','Owner enforcing repeat protection',null),
 executionField('changedIntent','Same identity with different intent',[['reject','Reject changed intent'],['allow','Allow the changed intent']]),
 executionField('timeout','Meaning of a missing response',[['unresolved','Keep the business outcome unresolved'],['failed','Treat the business action as failed'],['succeeded','Treat the business action as successful']]),
 executionField('completion','Completion required by this contract',[['business-outcome','Authoritative business outcome'],['acceptance','Acceptance of work only']]),
 executionField('discovery','How the business outcome is discovered',[['authoritative-status','Query an authoritative status/result'],['correlated-event','Receive a correlated authoritative result'],['manual-reconciliation','Owned reconciliation against the authority'],['none','No outcome discovery contract']]),
 executionField('outcomeAuthorityId','Authority for the business result',null),
 ...[
  executionField('outcomeContractId','Separate result contract',null),
  executionField('outcomeCorrelation','Identity carried by the result contract',[['same-operation','The result retains the original operation identity'],['unrelated','The result uses an unrelated operation identity']]),
  executionField('outcomeMeaning','Meaning carried by the result contract',[['business-outcome','Authoritative business state, including pending and final outcomes'],['acceptance','Acceptance or transport acknowledgement only']]),
  {key:'outcomeResultKey',label:'Business result field in the result payload',type:'field'}
 ].map(f=>({...f,group:'outcome'})),
 ...[
  executionField('outcomeReadTaskId','Accepted read design for this result',null),
  executionField('outcomeFreshness','Freshness required by the result consumer',[['strict','The latest committed business state'],['bounded','An older business state within an agreed bound']]),
  {key:'outcomeMaxAgeSeconds',label:'Maximum result age (seconds)',type:'number',min:0.001,max:31536000}
 ].map(f=>({...f,group:'read'})),
 ...[
  executionField('invocationParentId','Request that waits for this call',null),
  executionField('callerRetries','Caller retries',[['none','No automatic caller retry'],['bounded','Bounded retries for this request']]),
  {key:'maxAttempts',label:'Maximum attempts, including the first',type:'number',min:2,max:1000,integer:true},
  {key:'attemptTimeoutMs',label:'Maximum complete attempt (ms)',type:'number',min:1,max:86400000},
  {key:'backoffBudgetMs',label:'Maximum total delay across retries (ms)',type:'number',min:0,max:86400000},
  {key:'callerBudgetMs',label:'Total caller time budget (ms)',type:'number',min:1,max:86400000},
  executionField('retryFailures','Failures eligible for retry',[['transient-only','Only explicitly classified transient failures'],['any','Every failure or rejection']]),
  executionField('retryLayers','Ownership of repeated attempts',[['one-owner','One retry owner; other retries disabled or included'],['nested','Other layers also retry outside this budget']]),
  executionField('circuitBreaker','Dependency protection at the caller',[['none','No circuit breaker for this call'],['caller','A circuit breaker guards this caller’s attempts']]),
  executionField('openCircuit','When the circuit is open',[['stop','Stop attempts; preserve any unresolved business outcome'],['retry','Continue retrying the dependency']])
 ].map(f=>({...f,group:'caller'}))
]);
