export const layers = [
  {id:'process',name:'Process',short:'Business behaviour',color:'#9a7837',icon:'route'},
  {id:'logical',name:'Logical application',short:'Responsibilities',color:'#357461',icon:'boxes'},
  {id:'physical',name:'Physical application',short:'Implementation',color:'#4e7a8c',icon:'server'},
  {id:'data',name:'Data',short:'Information & ownership',color:'#7c6898',icon:'database'},
  {id:'technology',name:'Technology',short:'Platform services',color:'#738049',icon:'cpu'},
  {id:'interface',name:'Interface',short:'Contracts & handoffs',color:'#a16d51',icon:'arrows'},
  {id:'security',name:'Security',short:'Controls & boundaries',color:'#9b6680',icon:'shield'},
  {id:'deployment',name:'Deployment',short:'Runtime placement',color:'#627d9d',icon:'cloud'}
];
const n=(id,layer,col,title,sub,description,attrs)=>({id,layer,col,title,sub,description,attrs});
export const nodes=[
  n('initiate','process',0,'Initiate payment','01 · Receive instruction','The customer provides a beneficiary and amount. The request receives a unique reference before processing begins.',{'Actor':'Customer','Input':'Payment instruction','Outcome':'Traceable request'}),
  n('screen','process',1,'Screen for risk','02 · Assess instruction','Evaluate the instruction against risk rules before allowing a debit. A flagged payment stops for review.',{'Actor':'Risk operations','Input':'Payment + risk signals','Outcome':'Allow or hold'}),
  n('post','process',2,'Post ledger entry','03 · Record movement','Record the debit with the payment reference. The model distinguishes the ledger posting from external settlement.',{'Actor':'Core banking','Input':'Approved instruction','Outcome':'Posting reference'}),
  n('settle','process',3,'Settle payment','04 · External handoff','Send the authorised payment to the external settlement network and retain the response.',{'Actor':'Payment operations','Input':'Posted payment','Outcome':'Settlement status'}),
  n('confirm','process',4,'Confirm outcome','05 · Close the loop','Notify the customer of the recorded outcome. A timeout remains pending until its status is reconciled.',{'Actor':'Customer services','Input':'Verified status','Outcome':'Customer notification'}),
  n('api','logical',0,'Payment API','Channel responsibility','Receives payment instructions, validates their shape, and assigns a traceable request reference. It coordinates the journey through downstream responsibilities.',{'Owner':'Channels team','Responsibility':'Accept instructions','Quality driver':'Traceability'}),
  n('risk','logical',1,'Risk screening','Decision responsibility','Owns the decision to allow or hold a payment. It consumes risk signals and makes the decision explicit before ledger posting.',{'Owner':'Risk technology','Responsibility':'Allow / hold decision','Quality driver':'Fraud prevention'}),
  n('ledger','logical',2,'Core ledger','Accounting responsibility','Owns the authoritative posting record. A repeated payment reference must not produce a second debit.',{'Owner':'Core banking team','Responsibility':'Authoritative posting','Quality driver':'Financial integrity'}),
  n('hub','logical',3,'Settlement hub','Integration responsibility','Translates an internal payment into the external settlement contract. A delayed response needs status enquiry before any retry.',{'Owner':'Payments team','Responsibility':'External settlement','Quality driver':'Recoverability'}),
  n('notify','logical',4,'Notification service','Communication responsibility','Explains the payment outcome to the customer using the confirmed status. Notification failure does not reverse settlement.',{'Owner':'Channels team','Responsibility':'Outcome communication','Quality driver':'Clarity'}),
  n('api-pod','physical',0,'Payment service','Container · candidate','A candidate deployable service implementing the Payment API responsibility. Technology choices are illustrative.',{'Realises':'Payment API','Runtime':'Container workload','Replica target':'2 · illustrative'}),
  n('risk-engine','physical',1,'Risk engine','Service · candidate','Implements risk screening with a versioned ruleset and explicit allow or hold responses.',{'Realises':'Risk screening','Runtime':'Rules service','Decision contract':'Allow / hold'}),
  n('core-adapter','physical',2,'Core connector','Adapter · candidate','Maps the posting contract to the core banking interface and carries the original payment reference.',{'Realises':'Core ledger integration','Runtime':'Adapter service','Open obligation':'Duplicate handling'}),
  n('worker','physical',3,'Settlement worker','Worker · candidate','Executes the settlement handoff and enquires about uncertain outcomes before retrying.',{'Realises':'Settlement hub','Runtime':'Background worker','Open obligation':'Recovery policy'}),
  n('notify-worker','physical',4,'Notification worker','Worker · candidate','Consumes outcome events and sends customer notifications independently of the settlement path.',{'Realises':'Notification service','Runtime':'Event consumer','Failure policy':'Retry communication'}),
  n('instruction','data',0,'Payment instruction','Request record','Stores the immutable customer instruction and its end-to-end reference.',{'Owner':'Payment API','Classification':'Confidential','Key':'paymentReference'}),
  n('risk-record','data',1,'Risk decision','Decision record','Retains the risk decision and ruleset version for a later explanation or investigation.',{'Owner':'Risk screening','Classification':'Restricted','Key':'decisionId'}),
  n('posting','data',2,'Ledger posting','Accounting record','Links a unique payment reference to the authoritative debit or credit posting.',{'Owner':'Core ledger','Classification':'Restricted','Key':'postingReference'}),
  n('settlement','data',3,'Settlement status','Outcome record','Records pending, settled, or failed state, including the external reference and reconciliation evidence.',{'Owner':'Settlement hub','Classification':'Confidential','Key':'externalReference'}),
  n('gateway','technology',0,'API gateway','Traffic & policy','Applies request routing, authentication enforcement, and rate limits at the channel boundary.',{'Service':'Ingress','Supports':'Payment service','Policy':'Rate limit + authentication'}),
  n('postgres','technology',2,'Transactional store','Persistence','Candidate transactional storage for internal payment and status records; it does not replace the core ledger.',{'Service':'Relational database','Supports':'Internal records','Open obligation':'Backup + restore test'}),
  n('queue','technology',3,'Event broker','Reliable handoff','Carries payment outcome events between worker services with acknowledgement semantics to be confirmed.',{'Service':'Messaging','Supports':'Worker handoffs','Open obligation':'Delivery guarantees'}),
  n('rest','interface',0,'Payment contract','HTTPS · POST /payments','Defines the request schema and response semantics for payment initiation.',{'Protocol':'HTTPS / JSON','Producer':'Payment API','Contract state':'Illustrative draft'}),
  n('posting-api','interface',2,'Posting contract','Synchronous request','Defines the posting reference and duplicate-handling obligations at the core boundary.',{'Protocol':'Service API','Producer':'Core connector','Contract state':'Duplicate policy open'}),
  n('network','interface',3,'Settlement contract','External network boundary','Describes submission, status enquiry, and reconciliation. This example does not claim any actual NPS or network specification.',{'Protocol':'Illustrative network API','Producer':'Settlement worker','Contract state':'Status enquiry required'}),
  n('oauth','security',0,'Identity & consent','Entry control','Checks the initiating identity and authority for the requested payment before processing.',{'Protects':'Payment API','Control':'Authentication + authorisation','Evidence':'Review required'}),
  n('audit','security',2,'Audit trail','Integrity control','Correlates decisions, postings, and settlement responses with a payment reference.',{'Protects':'Payment trace','Control':'Tamper-evident audit','Evidence':'Review required'}),
  n('mtls','security',3,'Service trust','Transport control','Authenticates service-to-service communication across the external handoff.',{'Protects':'Settlement boundary','Control':'mTLS · candidate','Evidence':'Certificate lifecycle open'}),
  n('zone-a','deployment',0,'Application zone','Primary runtime · candidate','Hosts channel and worker workloads within a controlled application network boundary.',{'Placement':'Primary site','Hosts':'Application workloads','Open obligation':'Capacity evidence'}),
  n('zone-b','deployment',3,'Recovery zone','Standby runtime · candidate','Candidate recovery placement. No successful failover or recovery objective is claimed by this prototype.',{'Placement':'Recovery site','Hosts':'Standby workloads','Open obligation':'Failover test'})
];
const e=(from,to,label,kind='trace')=>({from,to,label,kind});
export const edges=[
  e('initiate','screen','Instruction','flow'),e('screen','post','Allowed','flow'),e('post','settle','Posted','flow'),e('settle','confirm','Outcome','flow'),
  e('api','risk','Screen','flow'),e('risk','ledger','Allow','flow'),e('ledger','hub','Submit','flow'),e('hub','notify','Outcome','flow'),
  e('api-pod','risk-engine','Check','flow'),e('risk-engine','core-adapter','Allow','flow'),e('core-adapter','worker','Handoff','flow'),e('worker','notify-worker','Event','flow'),
  ...['initiate','screen','post','settle','confirm'].map((id,i)=>e(id,['api','risk','ledger','hub','notify'][i],'served by')),
  ...['api','risk','ledger','hub','notify'].map((id,i)=>e(id,['api-pod','risk-engine','core-adapter','worker','notify-worker'][i],'realised by')),
  e('api','instruction','owns'),e('risk','risk-record','owns'),e('ledger','posting','owns'),e('hub','settlement','owns'),
  e('api-pod','gateway','exposed through'),e('core-adapter','postgres','records status in'),e('worker','queue','publishes to'),e('queue','notify-worker','delivers to'),
  e('api','rest','exposes'),e('ledger','posting-api','exposes'),e('hub','network','uses'),e('rest','api-pod','implemented by'),e('posting-api','core-adapter','implemented by'),e('network','worker','implemented by'),
  e('oauth','api','protects'),e('audit','posting','records evidence for'),e('mtls','network','protects'),
  e('api-pod','zone-a','deployed in'),e('risk-engine','zone-a','deployed in'),e('worker','zone-a','deployed in'),e('zone-a','zone-b','recovery placement')
];
export const suggestions={
  review:{id:'review',title:'Manual review queue',layer:'logical',col:1,source:'risk',sub:'Proposed responsibility',description:'Give held payments a named review responsibility, with an explicit release or reject decision.',reason:'Risk screening can hold a payment, but the base model has no owner for resolving it.',effect:'Adds a manual review responsibility linked to Risk screening. It does not automatically release a held payment.',attrs:{Owner:'Risk operations · proposed',Responsibility:'Resolve held instructions',Obligation:'Review SLA + release authority'},relationship:'routes held payments to'},
  dedup:{id:'dedup',title:'Idempotency register',layer:'data',col:2,source:'ledger',sub:'Proposed duplicate control',description:'Record each payment reference and its result so a retry can return the original outcome without a second posting.',reason:'A repeated submission needs an explicit duplicate-handling mechanism at the ledger boundary.',effect:'Adds an idempotency record linked to Core ledger. Retention and atomicity still need review.',attrs:{Owner:'Core banking team · proposed',Key:'paymentReference',Obligation:'Atomic check + posting'},relationship:'checks duplicate reference in'},
  recovery:{id:'recovery',title:'Recovery work queue',layer:'physical',col:3,source:'worker',sub:'Proposed recovery worker',description:'Capture uncertain settlement outcomes for status enquiry and controlled recovery.',reason:'A settlement timeout is not proof of failure. Recovery must enquire before retrying.',effect:'Adds a recovery queue linked to Settlement worker. Retry limits and operating ownership remain open.',attrs:{Owner:'Payments operations · proposed',Policy:'Enquire before retry',Obligation:'Alerting + recovery runbook'},relationship:'hands uncertain outcomes to'}
};
export const stages=[
  {name:'Initiate',node:'api',text:'The payment receives a reference. Identity, consent, and request shape are checked.'},
  {name:'Screen',node:'risk',text:'Risk screening returns allow. Only an allowed instruction proceeds to posting.'},
  {name:'Post',node:'ledger',text:'The core records a posting against the original reference. Duplicate handling is a design obligation.'},
  {name:'Settle',node:'hub',text:'The settlement hub submits the payment and records the external outcome.'},
  {name:'Confirm',node:'notify',text:'A verified outcome reaches the customer. The full journey retains the same payment reference.'}
];
