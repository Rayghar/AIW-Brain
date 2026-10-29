import {nodes as modelNodes} from './model.js';
import {clean} from './util.js';
import {documentCopy as clone,memoPass,findIn,remember,sharedList} from './document-memo.js';
import {qualityReading,conflictReading,recordStamp,driverStamp} from './source-fingerprint.js';
import {requirementGroups} from './requirement-groups.js';
import {patchIds,patchText,within,groupStamp,citedNotes} from './requirement-links.js';
import {levelOf,convert,priorityRank,cleanBasis} from './priority-scale.js';
import {cleanOpen,fieldOpen} from './open-fields.js';
import {checked,isProposed,proposalFinding,openFindings,RETIRE_ONLY} from './record-lifecycle.js';
export const RESPONSIBILITIES=modelNodes.filter(n=>n.layer==='logical');
export const projectResponsibilities=p=>p?.logical?.responsibilities?.map(r=>({id:r.id,title:r.title,layer:'logical',description:r.purpose,attrs:{Owner:r.owner,Responsibility:r.boundary}}))||RESPONSIBILITIES;
export const QUALITY_TYPES=[
  {id:'integrity',name:'Transaction integrity',color:'#35654a'},
  {id:'availability',name:'Availability',color:'#607346'},
  {id:'performance',name:'Performance',color:'#937233'},
  {id:'recoverability',name:'Recoverability',color:'#487879'},
  {id:'security',name:'Security',color:'#806177'},
  {id:'traceability',name:'Traceability',color:'#657c95'},
  // The SA Playbook's further quality attributes, so a driver can be recorded for each.
  {id:'scalability',name:'Scalability',color:'#8a6d3b',playbook:true},
  {id:'maintainability',name:'Maintainability',color:'#4f6b8a',playbook:true},
  {id:'deployability',name:'Deployability',color:'#6c5f8f',playbook:true},
  {id:'testability',name:'Testability',color:'#5f7f6f',playbook:true},
  {id:'usability',name:'Usability',color:'#8f5f5f',playbook:true},
  {id:'interoperability',name:'Interoperability',color:'#5a7f8f',playbook:true},
  // Round 11: four concerns the SA Playbook does not list, so a regulatory obligation, a privacy duty, a cost ceiling or
  // a capacity figure can be a measurable scenario instead of a Chapter 1 constraint in prose. Each names the family it
  // sits in on the utility tree and what a scenario of it records (its stimulus and its metric). The playbook holds no
  // tactics for them, so none are offered; they take part in no score, hard constraint or conformance check.
  {id:'compliance',name:'Compliance',color:'#7a6a4f',family:'protection',added:true,description:'The design meets a named regulation, standard or contractual obligation, and can show that it does.',guidance:{stimulus:'An auditor, a regulator or a customer asks for evidence that an obligation is met, or a rule changes.',metric:'Obligations met with evidence, or days to produce the evidence.'}},
  {id:'privacy',name:'Privacy',color:'#6f5f86',family:'protection',added:true,description:'Personal data is collected, kept, used and removed only as agreed with the people it concerns.',guidance:{stimulus:'A person asks what is held about them or asks for it to be removed, or a record passes its retention date.',metric:'Days to answer a request, or records kept past their retention date.'}},
  {id:'cost',name:'Cost',color:'#8a7045',family:'efficiency',added:true,description:'What running the design costs stays within an agreed ceiling at the agreed load.',guidance:{stimulus:'Load grows to the planned peak, or a product changes its price.',metric:'Cost per transaction, or the run cost a month at peak.'}},
  {id:'capacity',name:'Capacity',color:'#5f7a86',family:'efficiency',added:true,description:'The design holds the agreed amount of work, data and users, with room to spare.',guidance:{stimulus:'Work, data or users reach the planned peak.',metric:'Requests a second, concurrent users, or stored records at peak.'}},
  // Round 12 (DM-01, DM-18): two concerns a design needed and could not record.
  {id:'reliability',name:'Reliability',color:'#5d7550',family:'reliability',added:true,description:'The design does its work correctly, without failures, for as long as it is asked to.',guidance:{stimulus:'Work runs for a long period, or at the volume of a busy day.',metric:'Failed operations in a million, or the time between failures.'}},
  {id:'operability',name:'Operability',color:'#6a6f86',family:'reliability',added:true,description:'The people who run the design can see its state, act on it and recover it within agreed times.',guidance:{stimulus:'An operator must find, understand and act on a fault or a scheduled task.',metric:'Minutes to detect and to act, or tasks done without a manual step.'}}
];
// The categories round 11 added, as the pickers and documents read them.
export const ADDED_QUALITY_TYPES=QUALITY_TYPES.filter(t=>t.added);
// Illustrative proposals for the reference project's playbook attributes that no driver covers yet.
// Unconfirmed; each is offered for review, never saved on its own.
const PLAYBOOK_PROPOSALS={
  scalability:{title:'Absorb a payment surge without losing instructions',stimulus:'Instruction arrivals rise to three times the normal peak, for example at month end.',conditions:'Normal dependencies; the core banking system keeps its own processing limits.',response:'Accept every valid instruction with its reference and queue work behind the core\'s limit rather than rejecting it.',metric:'Accepted instructions at the surge arrival rate',operator:'At least',targetValue:'3',unit:'× normal peak',window:'For a sustained 30-minute surge',measurement:'Load-test at three times the recorded peak and compare accepted instructions with arrivals.',priority:'Important',rationale:'Peaks must not turn into rejected payments. The SA Playbook measures scalability by performance under load, capacity limits and the cost of scaling.',requirementIds:['REQ-001'],responsibilityIds:['api','hub'],tactic:'Scale stateless intake horizontally and level the load with the durable work queue.'},
  maintainability:{title:'Add a payment scheme without changing the core flow',stimulus:'A new payment scheme or rail must be supported.',conditions:'Existing schemes keep running; the ledger contract does not change.',response:'Add the scheme as a new adapter behind a stable interface, changing only the settlement hub and its tests.',metric:'Components changed to add one scheme',operator:'At most',targetValue:'2',unit:'components',window:'Per scheme added',measurement:'Count the components changed in the work that adds the scheme.',priority:'Supporting',rationale:'Schemes change more often than the payment journey. The SA Playbook measures maintainability by modification time and change impact.',requirementIds:['REQ-004'],responsibilityIds:['hub'],tactic:'Anticipate expected changes: put each scheme behind an adapter with a stable interface.'},
  deployability:{title:'Release a change without interrupting intake',stimulus:'A new version of the payment service is released during service hours.',conditions:'Normal load; the previous version is still available.',response:'Intake keeps accepting instructions throughout, and a faulty release is rolled back.',metric:'Time to roll back a faulty release',operator:'At most',targetValue:'15',unit:'minutes',window:'Per release',measurement:'Time a rehearsed rollback in pre-production and record each production rollback.',priority:'Supporting',rationale:'Releases must not become outages. The SA Playbook measures deployability by deployment time, success rate and rollback time.',requirementIds:['REQ-001'],responsibilityIds:['api'],tactic:'Roll out gradually with an automated rollback.'}
};
// An empty scenario of one category, offered for review: the first requirement linked, everything else to be written.
function blankProposal(p,type){
  const reqs=p.artefacts.filter(a=>a.type==='requirement').map(a=>a.id);
  return {category:type.id,title:'Define '+type.name.toLowerCase(),stimulus:'',conditions:'',response:'',metric:'',operator:'At most',targetValue:'',unit:'',window:'',measurement:'',priority:'Important',rationale:'',requirementIds:reqs.slice(0,1),responsibilityIds:[],tactic:'',owner:'',source:type.playbook?'Guidance proposal from the SA Playbook — confirm against the project brief':'Guidance proposal — confirm against the project brief',origin:'suggestion',confirmed:false,targetConfirmed:false};
}
function playbookProposal(p,type){
  const bank=!p.workspace?.template||p.workspace.template==='bank-payment',ref=bank?PLAYBOOK_PROPOSALS[type.id]:null,reqs=p.artefacts.filter(a=>a.type==='requirement').map(a=>a.id);
  const base=blankProposal(p,type);
  const record=ref?{...base,...ref,requirementIds:ref.requirementIds.filter(id=>reqs.includes(id)),responsibilityIds:ref.responsibilityIds.filter(id=>(p.logical?.responsibilities||[]).some(r=>r.id===id)),owner:'Architecture / payments team',source:'Illustrative proposal from the SA Playbook — confirm with stakeholders'}:base;
  return {...record,origin:'suggestion',confirmed:false,targetConfirmed:false};
}
export function playbookDriverProposal(p,category){const t=qualityType(category);return t?{id:'missing',mode:'new',label:'Explore missing '+t.name.toLowerCase(),reason:'No scenario covers this quality concern yet. Check whether it matters here.',record:t.playbook?playbookProposal(p,t):t.added?blankProposal(p,t):null}:null;}
// Explicit bounds (round 5, R5-G): what one workspace keeps, measured by scale-validate.mjs at these sizes. A driver's
// links refuse past their bound instead of dropping the rest (round 12, D-12).
export const QUALITY_LIMITS=Object.freeze({drivers:500,requirements:5000,links:500});
// Round 12 (D-02): one register of architectural drivers, each of a kind, in the order the SDD prints them. A quality
// driver (the default, and every driver recorded before round 12) keeps its scenario and measurable target; the other
// kinds need neither. A business driver links Chapter 1 outcomes, a functional driver requirement groups and
// requirements, a constraint Chapter 1 constraints. The record id stays QD-nnn for every kind; readers name a driver by
// its display code (driverCodes).
export const DRIVER_KINDS=[{id:'business',name:'Business',plural:'Business drivers',prefix:'BD'},{id:'functional',name:'Functional',plural:'Functional drivers',prefix:'FD'},{id:'quality',name:'Quality',plural:'Quality drivers',prefix:'QD'},{id:'constraint',name:'Constraint',plural:'Constraints',prefix:'C'},{id:'operational',name:'Operational',plural:'Operational drivers',prefix:'OD'},{id:'data',name:'Data',plural:'Data drivers',prefix:'DD'},{id:'technology-evolution',name:'Technology evolution',plural:'Technology evolution',prefix:'TE'},{id:'business-continuity',name:'Business continuity',plural:'Business continuity',prefix:'BC'}];
export const driverKindOf=id=>DRIVER_KINDS.find(k=>k.id===id);
export const driverKind=d=>driverKindOf(d?.kind)?d.kind:'quality';
export const isQualityDriver=d=>driverKind(d)==='quality';
export const qualityDrivers=p=>(p?.quality?.drivers||[]).filter(isQualityDriver);
// Priorities are High, Medium, Low or '' (not stated; a new driver's default, DM-07), on the driver scale of
// priority-scale.js, with the basis it rests on (priorityBasis: source band, person or rule; '' when not recorded). A
// priority recorded before round 12 (Critical, Important, Supporting) reads as the level it holds (High, Medium, Low)
// through the same scale: a pure reading, so a driver keeps what it stores until a person changes its priority, and the
// fingerprints other records keep of it stay current (source-fingerprint.js). driverPriority is the one reading.
export const DRIVER_PRIORITIES=['High','Medium','Low'],QUALITY_PRIORITIES=DRIVER_PRIORITIES;
export const driverPriority=d=>{const v=typeof d?.priority==='string'?d.priority:'';return levelOf('driver',v)?v:convert('driver-legacy',v,'driver');};
// A value from another scale of the one priority scale (Must / Should / Could) is stored at the level it holds (DM-07).
const priorityOf=v=>v==null||v===''?'':levelOf('driver',v)?v:convert('driver-legacy',v,'driver')||convert('requirement',v,'driver')||null;
// Display codes (BD1, FD1, QD1, C1, OD1, DD1, TE1, BC1): a driver keeps the code it was given at creation (stored on the
// record, never renumbered). A driver recorded before round 12 stores none and reads as QD and the number of its id
// (QD-007 is QD7); no later driver is given that code, as the quality codes continue above every id the project gave.
const codeOf=c=>{const m=/^([A-Z]+)(\d+)$/.exec(typeof c==='string'?c:'');const k=m&&DRIVER_KINDS.find(k=>k.prefix===m[1]);return k?{kind:k.id,n:Number(m[2])}:null;};
export function driverCodes(p){return remember(p,'quality:codes','all',()=>{
 const out=new Map(),taken=new Set(),ds=[...(p?.quality?.drivers||[])].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),rest=[],give=(d,c)=>{out.set(d.id,c);taken.add(c);};
 for(const d of ds)if(codeOf(d.code)?.kind===driverKind(d)&&!taken.has(d.code))give(d,d.code);else rest.push(d);
 const late=[];for(const d of rest){const m=isQualityDriver(d)&&/^QD-(\d+)$/.exec(d.id);if(m&&!taken.has('QD'+Number(m[1])))give(d,'QD'+Number(m[1]));else late.push(d);}
 for(const d of late){const k=driverKindOf(driverKind(d));let n=1;while(taken.has(k.prefix+n))n++;give(d,k.prefix+n);}
 return out;});}
export const driverCode=(p,d)=>driverCodes(p).get(d?.id)||d?.id||'';
// The next code of a kind (a new driver, or one whose kind changed): above every code in use and every code given.
function nextCode(p,q,kind,idsGiven){const k=driverKindOf(kind),used=[...driverCodes(p).values()].map(codeOf).filter(c=>c?.kind===kind).map(c=>c.n);q.counters.codes={...(q.counters.codes||{})};const n=Math.max(q.counters.codes[kind]??(kind==='quality'?idsGiven:0),0,...used)+1;q.counters.codes[kind]=n;return k.prefix+n;}
export const OPERATORS=['At most','At least','Exactly'];
// The fields a driver may leave open (open-fields.js): not stated by any source, or an open question.
export const DRIVER_FIELDS=['title','description','impact','stimulus','conditions','response','metric','unit','window','measurement','rationale','owner','source','tactic'];
// Whether a field holds something: a value, or a recorded open state (an empty field is a gap; open is not).
export const stated=(r,k)=>!!String(r?.[k]??'').trim()||!!r?.open?.[k];
export const qualityType=id=>QUALITY_TYPES.find(t=>t.id===id);
const unique=x=>[...new Set(Array.isArray(x)?x.filter(v=>typeof v==='string'):[])];
const signature=x=>JSON.stringify(x);
// Lookups (round 5, R5-G): on a settled document, or inside a pass (document-memo.js), the artefacts are indexed once.
const artefactOf=(p,id)=>findIn(p,'quality:artefacts',()=>p.artefacts,id);
// A scenario keeps the fingerprint of each Chapter 1 record it names (round 12, D-04: not a copy): its requirements, and
// a business driver's outcomes and a constraint's constraints after them; its source changed when one no longer matches
// its fingerprint. A reading kept as copies is read as fingerprints (source-fingerprint.js).
// A requirement group it links is read as its definition (members and rule), not as each member's words (round 12).
const readIds=d=>[...d.requirementIds,...(d.outcomeIds||[]),...(d.constraintIds||[])];
const requirementSnapshot=(p,ids,groups=[])=>Object.fromEntries([...ids.map(id=>[id,recordStamp(p,artefactOf(p,id)||null)]),...groups.map(id=>[id,groupStamp(p,id)])]);
export function sourceChanged(p,d){return remember(p,'quality:source-changed',d,()=>signature(qualityReading(d.sourceSnapshot||{}))!==signature(requirementSnapshot(p,readIds(d),d.requirementGroupIds||[])));}
export function targetText(d){return d.targetValue!==''&&d.targetValue!=null?`${d.operator} ${d.targetValue} ${d.unit||'[unit needed]'}`:'Target not defined';}
// A target is measurable when its metric, comparator, value, unit, window and verification are stated, none of them is
// open (round 12, G-31 and DM-16: the field's open state, which a record before round 12 carries as its words, "Open
// question: …" or "Not stated …", read by open-fields.js), and no bracketed prompt or subjective word stands in for one.
const VAGUE=/\[[^\]]+\]|\b(tbd|asap|quickly|fast|soon|appropriate|acceptable)\b/i;
export const TARGET_FIELDS=['metric','unit','window','measurement'];
export const isPlaceholder=v=>VAGUE.test(String(v??''));
// A target's text field that holds only dashes, dots or spaces states nothing (round 23, GR-DRV-03): "—" is no window.
export const statedText=v=>typeof v==='string'&&!/^[\s\-\u2010-\u2015.]*$/.test(v);
export function targetIsMeasurable(d){return !!(statedText(d.metric)&&OPERATORS.includes(d.operator)&&d.targetValue!==''&&d.targetValue!=null&&Number.isFinite(Number(d.targetValue))&&Number(d.targetValue)>=0&&statedText(d.unit)&&statedText(d.measurement)&&statedText(d.window)&&!TARGET_FIELDS.some(k=>fieldOpen(d,k))&&!VAGUE.test([d.metric,d.unit,d.measurement,d.window].join(' '))&&!(d.unit.trim()==='%'&&Number(d.targetValue)>100));}
export function driverOutcomes(p,d){const reqs=new Set(d.requirementIds);const ids=new Set(p.relationships.filter(r=>reqs.has(r.from)||reqs.has(r.to)).flatMap(r=>[r.from,r.to]));return p.artefacts.filter(a=>a.type==='outcome'&&ids.has(a.id));}
export function orderedDrivers(p){return [...p.quality.drivers].sort((a,b)=>priorityRank('driver',driverPriority(a))-priorityRank('driver',driverPriority(b))||a.rank-b.rank||a.id.localeCompare(b.id));}
export function seedQuality(p){
  const specs=[
    ['integrity','Preserve one financial effect','A posted instruction is retried with the same reference.','A timeout or client retry occurs after a posting may already have succeeded.','Return the recorded outcome and prevent an additional debit.','Additional debits for one instruction','At most','0','extra debits','Per instruction, including repeated requests','Reconcile the ledger postings against the original instruction reference.','Critical','An unintended duplicate debit changes the customer’s balance.',['ledger'],['ledger','api'],'Atomic duplicate detection and a durable result record.'],
    ['availability','Keep instruction intake available','A customer submits a valid instruction during a component outage.','During the agreed service window; dependency and maintenance exclusions need agreement.','Accept the instruction or return an explicit unavailable response without losing its reference.','Successful availability of instruction intake','At least','99.9','%','Over an illustrative 30-day service window','Measure eligible successful intake probes against all eligible probes. Agree exclusions.','Important','Customers need a dependable entry point; the service window must be agreed.',['api'],['api','hub'],'Health checks and bounded failover with explicit degraded behaviour.'],
    ['performance','Acknowledge a payment predictably','A customer submits a valid payment instruction.','At representative peak load with screening dependencies available.','Return the accepted reference or an explicit hold response. This measures acknowledgement, not final settlement.','95th percentile acknowledgement latency','At most','2','seconds','Across the agreed peak-load test window','Measure from receipt of an instruction to acknowledgement; record load and percentile.','Important','A slow acknowledgement encourages repeat submissions and support enquiries.',['api','risk'],['api','risk'],'Bounded timeouts and workload isolation; keep integrity checks in the path.'],
    ['recoverability','Resolve uncertainty without unsafe retries','The external settlement request times out without a definitive response.','The original reference and posting record remain available.','Keep the payment pending, enquire about its status, and assign unresolved cases for investigation.','Time until an uncertain payment is investigated','At most','15','minutes','From the first uncertain response for each affected instruction','Compare the uncertain-response timestamp with an enquiry result or an assigned investigation record.','Critical','A blind retry could duplicate the financial effect or misstate the outcome.',['hub'],['hub','ledger'],'Durable pending state, status enquiry, and reconciliation before retry.'],
    ['security','Reject an unauthorised instruction','An unauthorised actor attempts to submit or inspect a payment.','The actor lacks the required identity, entitlement, or access to the payment.','Reject the operation and record the attempted access without exposing payment details.','Unauthorised operations accepted','Exactly','0','operations','Across the agreed negative-access test cases','Test missing, expired, and insufficient entitlements and verify denial and audit evidence.','Critical','The actor must be entitled to the instruction and its information.',['api','risk'],['api','risk'],'Server-side authorisation at each trust boundary with auditable denial.'],
    ['traceability','Retain the payment trail across boundaries','A customer or analyst investigates an instruction’s current outcome.','The payment spans screening, posting, settlement, and notification responsibilities.','Retrieve correlated events and the recorded outcome using the original reference.','Required journey stages carrying the original reference','Exactly','100','%','For each sampled instruction across the required stages','Correlate the recorded events and verify that each required stage retains the reference.','Important','Operations need to explain a payment’s history and locate an uncertain outcome.',['api','notify'],['api','hub','notify'],'Propagate correlation references and retain an access-controlled event trail.']
  ];
  const drivers=specs.map(([category,title,stimulus,conditions,response,metric,operator,targetValue,unit,window,measurement,priority,rationale,refs,responsibilityIds,tactic],i)=>{
    const requirementIds=p.artefacts.filter(a=>a.type==='requirement'&&refs.includes(a.modelRef)).map(a=>a.id);
    return {id:'QD-'+String(i+1).padStart(3,'0'),scenarioId:'QS-'+String(i+1).padStart(3,'0'),category,title,stimulus,conditions,response,metric,operator,targetValue,unit,window,measurement,priority,rationale,requirementIds,responsibilityIds,tactic,owner:'Architecture / payments team',source:'Illustrative Bank Payment Journey scenario — confirm with stakeholders',origin:'reference',confirmed:false,targetConfirmed:false,rank:i+1,sourceSnapshot:requirementSnapshot(p,requirementIds)};
  });
  return {schemaVersion:1,version:1,drivers,conflicts:[],counters:{driver:6,conflict:0},intake:null,review:null,handoff:null};
}
export function withQuality(input){const p=clone(input);if(!p.quality)p.quality=seedQuality(p);return p;}
const conflictSnapshot=(p,c)=>Object.fromEntries(c.driverIds.map(id=>[id,driverStamp(p,p.quality.drivers.find(d=>d.id===id)||null)]));
export function conflictIsResolved(p,c){return c.status==='resolved'&&!!c.resolution?.trim()&&!!c.owner?.trim()&&signature(conflictReading(c.driverSnapshot||{}))===signature(conflictSnapshot(p,c));}
export function potentialTradeoffs(p,driver){
  const rules=[['integrity','performance','Integrity checks and response time','Synchronous duplicate or posting checks can increase response time. Test the latency target while preserving one financial effect.'],['security','performance','Authorisation checks and response time','Authorisation and audit work may add latency. Measure the full protected path before moving checks or relaxing a target.'],['availability','integrity','Failover and financial consistency','During a partition or failover, accepting more requests can conflict with a consistent posting decision. Define when to reject or hold an instruction.'],['recoverability','integrity','Recovery speed and safe replay','A faster recovery target can encourage retries before an external outcome is known. Require enquiry or reconciliation before replay.'],['traceability','performance','Evidence collection and response time','Synchronous event recording can add latency. Compare durable evidence requirements with the response-time target.']];
  const result=[];
  for(const [a,b,title,detail] of rules){const left=p.quality.drivers.filter(d=>d.category===a),right=p.quality.drivers.filter(d=>d.category===b);for(const x of left)for(const y of right){if(driver&&driver.id!==x.id&&driver.id!==y.id)continue;const shared=x.responsibilityIds.filter(id=>y.responsibilityIds.includes(id));if(!shared.length)continue;const existing=p.quality.conflicts.find(c=>c.driverIds.includes(x.id)&&c.driverIds.includes(y.id));result.push({id:x.id+':'+y.id,driverIds:[x.id,y.id],title,detail,shared,existingId:existing?.id});}}
  return result;
}
// The chapter's checks, worked out once per settled document or pass (each caller gets its own copies).
export function qualityFindings(p){return memoPass(p,()=>sharedList(p,'quality:findings',()=>qualityFindingsOf(p)));}
function qualityFindingsOf(p){
  const q=p.quality,result=[],add=(code,id,title,detail,level='error',extra={})=>result.push({id:code+':'+id,code,driverId:id,title,detail,level,...extra});
  if(!q.drivers.length)add('empty','project','Add a quality scenario','Start with a requirement and define the response you need to measure.');
  if(q.intake?.sourceVersion!==p.contentVersion)add('intake','project','Review the current requirements','Chapter 1 has not been reviewed for this quality-driver revision.','warning');
  const requirementIds=new Set(p.artefacts.filter(a=>a.type==='requirement').map(a=>a.id)),unconfirmed=new Set(p.artefacts.filter(a=>!a.confirmed).map(a=>a.id)),responsibilityIds=new Set(projectResponsibilities(p).map(r=>r.id)),bare=d=>d.title.toLowerCase().replace(/\W/g,''),firstOfTitle=new Map();
  for(const x of q.drivers){const k=bare(x),seen=firstOfTitle.get(k);if(seen===undefined||x.id<seen)firstOfTitle.set(k,x.id);}
  const groups=new Set(requirementGroups(p).map(g=>g.id)),typed=t=>new Set(p.artefacts.filter(a=>a.type===t).map(a=>a.id)),outcomes=typed('outcome'),constraints=typed('constraint'),components=new Set((p.realisation?.components||[]).map(c=>c.id));
  const broken=d=>(d.outcomeIds||[]).some(id=>!outcomes.has(id))||(d.constraintIds||[]).some(id=>!constraints.has(id))||(d.requirementGroupIds||[]).some(id=>!groups.has(id))||(d.componentIds||[]).some(id=>!components.has(id));
  // A proposed driver (record-lifecycle.js) counts in no check here; the proposals are one finding of their own.
  for(const d of checked(q.drivers)){
    // Round 12: a field recorded as not stated or as an open question holds its place (DM-16); it is listed once below.
    const has=k=>stated(d,k);
    // Round 12 (D-02): a driver of another kind is described and linked, not measured; a quality driver's checks are as they were.
    if(!isQualityDriver(d)){const k=driverKind(d),x=driverKindOf(k).name.toLowerCase();
      if(!has('description'))add('description',d.id,'Describe the driver','Say what this '+x+' driver asks of the design.');
      if(!has('impact'))add('impact',d.id,'State the impact','Say how this driver shapes the architecture.','warning');
      if(k==='functional'&&!d.requirementIds.length&&!d.requirementGroupIds?.length)add('requirements',d.id,'Link what it covers','Link the requirement groups or requirements this driver covers.');
      if(k==='business'&&!d.outcomeIds?.length)add('outcomes',d.id,'Link a business outcome','Show which Chapter 1 outcome this driver serves.','warning');
      if(k==='constraint'&&!d.constraintIds?.length)add('constraints',d.id,'Link the constraint','Show which Chapter 1 constraint this is.','warning');
      if(d.requirementIds.some(id=>!requirementIds.has(id))||d.responsibilityIds.some(id=>!responsibilityIds.has(id))||broken(d))add('broken-link',d.id,'Repair a missing link','A linked record no longer exists. Review the links.');
      if(!has('owner')||!has('source'))add('evidence',d.id,'Name the owner and evidence','A driver needs an accountable owner and a source.');
      if(!has('rationale'))add('priority',d.id,'Explain the priority','Say why this driver has its priority.');
      if(sourceChanged(p,d))add('source-change',d.id,'Review changed sources','A linked Chapter 1 record changed after this driver was saved. Revisit and save it.');
      if(!d.confirmed)add('confirmation',d.id,'Review this driver','This working driver still needs your confirmation.','warning');
      if(firstOfTitle.get(bare(d))<d.id)add('duplicate',d.id,'Review a possible duplicate','Another driver has the same title. Compare them before keeping both.');
      openFindings(d,DRIVER_FIELDS,add);
      continue;}
    if(!has('stimulus')||!has('conditions')||!has('response'))add('scenario',d.id,'Complete the scenario','Describe the stimulus, operating conditions, and expected response.');
    if(!targetIsMeasurable(d))add('measurement',d.id,'Make the target measurable','Name the metric, comparator, numeric value, unit, measurement window, and verification method. Replace placeholders or subjective wording.');
    if(!d.requirementIds.length)add('requirements',d.id,'Link a source requirement','Show which Chapter 1 behaviour requires this quality scenario.');
    if(d.requirementIds.some(id=>!requirementIds.has(id)))add('broken-requirement',d.id,'Repair a missing requirement reference','A linked requirement no longer exists. Review the links against Chapter 1.');
    if(!d.responsibilityIds.length||d.responsibilityIds.some(id=>!responsibilityIds.has(id)))add('responsibilities',d.id,'Identify affected responsibilities','Link at least one responsibility in the application model.');
    if(!has('owner')||!has('source'))add('evidence',d.id,'Name the owner and evidence','A measurable scenario needs an accountable owner and a source.');
    if(!has('rationale'))add('priority',d.id,'Explain the priority','State the consequence of missing this target; no hidden score is calculated.');
    if(sourceChanged(p,d))add('source-change',d.id,'Review changed source requirements','A linked requirement changed after this scenario was reviewed. Revisit and save the scenario against the current requirement.');
    if(!d.targetConfirmed)add('target-assumption',d.id,'Confirm the target assumption','The target is a proposal until you confirm it against agreed evidence.','warning');
    if(!d.confirmed)add('confirmation',d.id,'Review this scenario',d.origin==='reference'?'This is an illustrative reference scenario. Confirm its relevance to your project.':'This working scenario still needs your confirmation.','warning');
    if(d.requirementIds.some(id=>unconfirmed.has(id)))add('source-confirmation',d.id,'Source requirement remains unconfirmed','The linked requirement includes illustrative or draft content. This uncertainty travels with the driver.','warning');
    if(firstOfTitle.get(bare(d))<d.id)add('duplicate',d.id,'Review a possible duplicate','Another driver has the same title. Compare the scenario before keeping both.');
    if(broken(d))add('broken-link',d.id,'Repair a missing link','A linked record no longer exists. Review the links.');
    openFindings(d,DRIVER_FIELDS,add);
  }
  const proposals=proposalFinding(q.drivers,2);if(proposals)add(proposals.code,'project',proposals.title,proposals.detail,'warning');
  // Round 12 (GR-REQ-14): requirements a driver cites in its words without linking them, one finding as in Chapters 6-10.
  citedNotes(p,checked(q.drivers),add);
  for(const c of q.conflicts)if(!conflictIsResolved(p,c))add('conflict',c.id,c.status==='resolved'?'Revisit a changed trade-off':'Resolve a recorded conflict',c.title+(c.status==='resolved'?'. One of its drivers changed; the earlier resolution needs review.':'. Record the resolution and its owner before treating it as resolved.'));
  return result;
}
export const qualityReviewCurrent=p=>p.quality.review?.version===p.quality.version&&p.quality.review?.sourceVersion===p.contentVersion;
export const qualityHandoffCurrent=p=>p.quality.handoff?.version===p.quality.version&&p.quality.handoff?.sourceVersion===p.contentVersion;
export function qualityMilestones(p){return memoPass(p,()=>qualityMilestonesOf(p));}
// A driver of another kind is defined when it is described and nothing it needs is missing; a quality driver as before.
function qualityMilestonesOf(p){const q=p.quality,fs=qualityFindings(p),all=checked(q.drivers),count=all.length,quality=all.filter(isQualityDriver),other=count-quality.length,needs=new Set(fs.filter(f=>['description','requirements','broken-link'].includes(f.code)).map(f=>f.driverId)),defined=quality.filter(d=>stated(d,'stimulus')&&stated(d,'conditions')&&stated(d,'response')&&d.requirementIds.length&&d.responsibilityIds.length&&!sourceChanged(p,d)).length+all.filter(d=>!isQualityDriver(d)&&stated(d,'description')&&!needs.has(d.id)&&!sourceChanged(p,d)).length,measured=quality.filter(d=>targetIsMeasurable(d)&&d.targetConfirmed).length,prioritised=all.filter(d=>stated(d,'rationale')&&d.confirmed).length,open=q.conflicts.filter(c=>!conflictIsResolved(p,c)).length;return [
  {id:'intake',name:'Review source requirements',detail:q.intake?.sourceVersion===p.contentVersion?'Current requirements reviewed':'Read the Chapter 1 handoff',done:q.intake?.sourceVersion===p.contentVersion,tab:'work',section:'intake'},
  {id:'scenarios',name:other?'Define connected drivers':'Define connected scenarios',detail:`${defined} of ${count} ${other?'drivers':'scenarios'} defined`,done:count>0&&defined===count&&!fs.some(f=>['requirements','broken-requirement','broken-link','responsibilities','duplicate'].includes(f.code)),tab:'work',section:'scenarios'},
  {id:'targets',name:'Confirm measurable targets',detail:`${measured} of ${quality.length} targets confirmed`,done:count>0&&measured===quality.length,tab:'work',section:'scenarios'},
  {id:'priorities',name:'Agree priorities and trade-offs',detail:`${prioritised} of ${count} drivers reviewed · ${open} open conflicts`,done:count>0&&prioritised===count&&!open,tab:'work',section:'compare'},
  {id:'review',name:'Validate the current revision',detail:`${fs.length} open findings`,done:qualityReviewCurrent(p)&&!fs.some(f=>f.level==='error'),tab:'validate'},
  {id:'handoff',name:'Carry drivers into decisions',detail:qualityHandoffCurrent(p)?'Current revision received':'Stable references for Chapter 3',done:qualityHandoffCurrent(p),tab:'output'}
];}
export function qualityGuidance(p,d,tab){const fs=qualityFindings(p).filter(f=>f.driverId===d?.id),issue=fs.find(f=>f.level==='error')||fs[0],other=d&&!isQualityDriver(d);const next={work:'Define the scenario, measurement, and priority reason.',model:'Follow the requirement and responsibility links; examine competing targets.',validate:'Resolve the finding, then run checks against the current revision.',output:'Carry the reviewed driver and its open questions into Chapter 3.'};return {explanation:other?`${driverKindOf(driverKind(d)).name} driver: ${d.description||'Not described yet.'}`:d?`${qualityType(d.category)?.name||d.category}: ${d.response||'The expected response is not defined.'}`:'Quality drivers connect required behaviour to an observable standard.',measurement:other?`Impact: ${d.impact||'not stated yet'}`:d?`${d.metric||'Metric missing'} · ${targetText(d)} · ${d.window||'Window missing'}`:'Confirm example targets against project evidence.',attention:issue?.detail||'Compare the target with the other drivers affecting these responsibilities.',implication:d?.tactic||'Identify the responsibilities that must support this scenario.',next:next[tab]||next.output};}
export function qualityProposals(p,d,tab='work'){
  const result=[];if(d&&!isQualityDriver(d))d=null;
  if(d&&!targetIsMeasurable(d))result.push({id:'measurement',mode:'edit',target:d.id,label:'Make the measurement explicit',reason:'Turn a vague target into a metric, threshold, window, and repeatable check.',record:{...d,metric:d.metric||'[Name the measured response]',operator:d.operator||'At most',unit:d.unit||'[Unit]',window:d.window||'[Measurement window]',measurement:d.measurement||'Observe [the response] under [the operating condition] and compare it with the agreed target.',confirmed:false,targetConfirmed:false}});
  // Round 12 (GR-DRV-09): every quality concern no driver covers, each once, in the order of the categories. The first
  // keeps the id 'missing' (the one Proposals offered before), each other one 'missing:<category>'.
  let reference=null;const examples=()=>reference??=seedQuality(p).drivers;
  QUALITY_TYPES.filter(t=>!p.quality.drivers.some(x=>x.category===t.id)).forEach((missing,i)=>{const id=i?'missing:'+missing.id:'missing';
   if(missing.playbook||missing.added){result.push({id,mode:'new',label:'Explore missing '+missing.name.toLowerCase(),reason:'No scenario covers this quality concern yet. Check whether it matters here.',record:missing.playbook?playbookProposal(p,missing):blankProposal(p,missing)});return;}
   const reference={...examples().find(x=>x.category===missing.id)};if((!!p.workspace?.template&&p.workspace.template!=='bank-payment'))Object.assign(reference,{title:'Define '+missing.name.toLowerCase(),stimulus:'',conditions:'',response:'',metric:'',targetValue:'',unit:'',window:'',measurement:'',owner:'',source:'Guidance proposal — confirm against the project brief',rationale:'',requirementIds:p.artefacts.filter(a=>a.type==='requirement').slice(0,1).map(a=>a.id),responsibilityIds:[],tactic:'',tradeoffs:[]});result.push({id,mode:'new',label:'Explore missing '+missing.name.toLowerCase(),reason:'No scenario covers this quality concern yet. Check whether the reference scenario applies.',record:{...reference,id:undefined,scenarioId:undefined,origin:'suggestion',confirmed:false,targetConfirmed:false}});});
  if(d){const examples=seedQuality(p),tactic=examples.drivers.find(x=>x.category===d.category)?.tactic;result.push({id:'tactic',mode:'edit',target:d.id,label:'Explore a supporting tactic',reason:tab==='output'?'Give Chapter 3 a candidate tactic to evaluate, with its driver reference.':'A tactic is a candidate for evaluation. Check its costs and competing targets before making a decision.',record:{...d,tactic:tactic===d.tactic?d.tactic+' Verify its behaviour during a dependency outage before selecting an implementation.':tactic,confirmed:false}});if(targetIsMeasurable(d))result.push({id:'boundary',mode:'edit',target:d.id,label:'Test a boundary condition',reason:'Check whether the scenario still holds during partial failure, peak load, or a repeated request.',record:{...d,conditions:d.conditions+' Also examine a repeated request during a partial dependency failure.',confirmed:false,targetConfirmed:false}})}
  return result;
}
// A driver's links (round 12, DM-09 and DM-10): an update that leaves a link out keeps it; null or [] clears it;
// {add, remove} patches it (requirement-links.js). The ids a save names are checked, and a list past its bound is
// refused with the bound, never cut. componentIds scope a target to the components it applies to (DM-01).
const LINKS=[['requirementIds','requirement','requirements',QUALITY_LIMITS.requirements],['outcomeIds','outcome','outcomes',QUALITY_LIMITS.links],['constraintIds','constraint','constraints',QUALITY_LIMITS.links],['requirementGroupIds',null,'requirement groups',QUALITY_LIMITS.links],['responsibilityIds',null,'application responsibilities',QUALITY_LIMITS.links],['componentIds',null,'components',QUALITY_LIMITS.links]];
function driverLinks(p,raw,old){
 const out={};
 for(const [key,type,noun,max] of LINKS){
  const {ids,sent}=patchIds(raw,key,old);within(ids,max,noun);
  if(sent.length){const known=new Set(type?p.artefacts.filter(a=>a.type===type).map(a=>a.id):key==='requirementGroupIds'?requirementGroups(p).map(g=>g.id):key==='componentIds'?(p.realisation?.components||[]).map(c=>c.id):projectResponsibilities(p).map(r=>r.id)),unknown=sent.filter(id=>!known.has(id));
   if(unknown.length)throw Error(`Choose existing ${type?'Chapter 1 ':''}${noun}: ${unknown.slice(0,3).join(', ')}${unknown.length>3?' and '+(unknown.length-3)+' more':''} ${unknown.length===1?'is':'are'} not in this project.`);}
  out[key]=ids;
 }
 return out;
}
// A driver as its readers read it (kind, code and priority through their readings), to tell a save that changes nothing.
const asRead=(d,code,flags=true)=>{const o={...d,kind:driverKind(d),code,priority:driverPriority(d),priorityBasis:d.priorityBasis||'',scenarioId:d.scenarioId||'',category:d.category||'',description:d.description||'',impact:d.impact||'',open:d.open||{},sourceSnapshot:null,state:null};if(!flags){delete o.confirmed;delete o.targetConfirmed;}for(const [k] of LINKS)o[k]=d[k]||[];return JSON.stringify(Object.keys(o).sort().map(k=>[k,o[k]]));};
const LIMIT={title:160,owner:180,metric:180,unit:180};
export function applyQualityCommand(input,command,now=new Date().toISOString()){
  const p=withQuality(input),q=p.quality,raw=command.payload||{};let selected=null,changed=true,created=null;
  if(command.type==='quality.driver'){
    // Round 12 (DM-09): a field the save leaves out keeps what the driver stores; null clears it.
    const old=raw.id?q.drivers.find(d=>d.id===raw.id):null;if(raw.id&&!old)throw Error('This driver no longer exists. Reload the project.');
    const keep=k=>raw[k]===undefined&&!!old;
    const kind=keep('kind')||raw.kind===''||raw.kind==null?(old?driverKind(old):'quality'):raw.kind,quality=kind==='quality';if(!driverKindOf(kind))throw Error('Choose the kind of driver.');
    const category=keep('category')?old.category:raw.category;if(quality&&!qualityType(category))throw Error('Choose a quality concern.');
    const text=Object.fromEntries(DRIVER_FIELDS.map(k=>[k,patchText(raw,k,old,LIMIT[k]||4000,k==='title'?'A driver title':'This field')]));
    if(!text.title)throw Error('Give the driver a title.');if(!old&&q.drivers.length>=QUALITY_LIMITS.drivers)throw Error(quality?'This workspace keeps up to 500 quality scenarios.':'This workspace keeps up to 500 drivers.');
    const links=driverLinks(p,raw,old);
    if(raw.rank!==undefined&&(!Number.isInteger(raw.rank)||raw.rank<1||raw.rank>10000))throw Error('Choose a positive whole-number priority order.');
    // Priority: High, Medium, Low or not stated (''), the default of a new driver (DM-07); a Critical, Important or
    // Supporting sent by an older caller is read as the level it holds. Left out, the driver keeps what it stores.
    const priority=keep('priority')?old.priority:priorityOf(raw.priority);if(priority===null)throw Error('Choose the priority: High, Medium, Low or not stated.');
    const seq=old?0:++q.counters.driver,id=old?.id||'QD-'+String(seq).padStart(3,'0');
    // A driver keeps its code while it keeps its kind; a new driver, or one of a new kind, takes the next code of its kind.
    const code=old&&driverKind(old)===kind?driverCode(p,old):nextCode(p,q,kind,q.counters.driver-(old?0:1));
    const flag=k=>keep(k)?old[k]===true:raw[k]===true;
    const record={id,kind,code,scenarioId:old?.scenarioId||(quality?'QS-'+id.slice(3):''),category:quality?category:'',title:text.title,priority,priorityBasis:keep('priorityBasis')?old.priorityBasis||'':cleanBasis(raw.priorityBasis),operator:keep('operator')?old.operator:OPERATORS.includes(raw.operator)?raw.operator:'At most',targetValue:keep('targetValue')?old.targetValue:raw.targetValue==null?'':patchText(raw,'targetValue',null,40,'A target value'),confirmed:flag('confirmed'),targetConfirmed:quality&&flag('targetConfirmed'),origin:old?.origin||(raw.origin==='suggestion'?'suggestion':'user'),rank:raw.rank??(old?.rank||Math.max(0,...q.drivers.map(d=>d.rank))+1),...links,sourceSnapshot:requirementSnapshot(p,readIds(links),links.requirementGroupIds||[])};
    for(const key of DRIVER_FIELDS)if(key!=='title')record[key]=text[key];
    const open=keep('open')?old.open:cleanOpen(raw.open,DRIVER_FIELDS);if(open&&Object.keys(open).length)record.open=open;
    // A confirmation the save does not repeat lapses when anything else changed: a change is reviewed again.
    if(old&&asRead(old,code,false)!==asRead(record,code,false)){if(raw.confirmed===undefined)record.confirmed=false;if(raw.targetConfirmed===undefined)record.targetConfirmed=false;}
    if(record.targetConfirmed&&!targetIsMeasurable(record))throw Error('Complete a measurable target before confirming it. You can save it as an assumption.');
    // A driver recorded before round 12 keeps what it stores where its reading is unchanged: no kind, code, empty new
    // field or priority word is written that the person did not change, so a save changes only what was changed.
    if(old){if(!('kind' in old)&&quality)delete record.kind;if(!('code' in old)&&driverKind(old)===kind)delete record.code;if(driverPriority(old)===priority)record.priority=old.priority;for(const k of ['requirementGroupIds','outcomeIds','constraintIds','componentIds','description','impact','priorityBasis'])if(!(k in old)&&!record[k].length)delete record[k];}
    // A save that changes nothing a reader reads leaves the driver as it is stored (round 12, G-32): its fingerprint, and
    // every reading other records keep of it, stay current. A driver whose sources changed is saved, to read them again.
    // A proposed driver a person saves becomes authored (record-lifecycle.js); its origin is kept.
    if(old&&!isProposed(old)&&!sourceChanged(p,old)&&asRead(old,code)===asRead(record,code))changed=false;
    else if(old)q.drivers[q.drivers.indexOf(old)]=record;else q.drivers.push(record);selected=record.id;
  }else if(command.type==='quality.delete'){
    // Round 12 (GR-GOV-24): a driver leaves only through the one retire path (record.retire), restorable; a conflict that
    // names it is retired first.
    throw Error(RETIRE_ONLY);
  }else if(command.type==='quality.move'){
    const rows=orderedDrivers(p),d=rows.find(d=>d.id===raw.id);if(!d)throw Error('Select a driver to prioritise.');const group=rows.filter(x=>driverPriority(x)===driverPriority(d)),index=group.indexOf(d),to=index+(raw.direction==='up'?-1:1);if(to<0||to>=group.length)throw Error('This driver is already at the edge of its priority group.');[group[index],group[to]]=[group[to],group[index]];group.forEach((x,i)=>x.rank=i+1);selected=d.id;
  }else if(command.type==='quality.conflict'){
    const old=raw.id?q.conflicts.find(c=>c.id===raw.id):null;if(raw.id&&!old)throw Error('This conflict no longer exists.');const driverIds=unique(raw.driverIds);if(driverIds.length!==2||driverIds.some(id=>!q.drivers.some(d=>d.id===id)))throw Error('Choose two different existing drivers.');
    if(!clean(raw.title,180))throw Error('Describe the conflict.');if(!old&&q.conflicts.some(c=>driverIds.every(id=>c.driverIds.includes(id))))throw Error('A trade-off record already connects these drivers. Review that record.');
    const c={id:old?.id||'QC-'+String(++q.counters.conflict).padStart(3,'0'),driverIds,title:clean(raw.title,180),effect:clean(raw.effect),owner:clean(raw.owner,180),resolution:clean(raw.resolution),status:raw.status==='resolved'?'resolved':'open'};if(c.status==='resolved'&&(!c.owner||!c.resolution))throw Error('Record a resolution and accountable owner before resolving the conflict.');c.driverSnapshot=conflictSnapshot(p,c);if(old)q.conflicts[q.conflicts.indexOf(old)]=c;else q.conflicts.push(c);created=c.id;
  }else if(command.type==='quality.intake'){q.intake={at:now,sourceVersion:p.contentVersion};}
  else if(command.type==='quality.review'){changed=false;q.review={at:now,version:q.version,sourceVersion:p.contentVersion,findings:qualityFindings(p).length};q.handoff=null;}
  else if(command.type==='quality.handoff'){changed=false;if(!qualityReviewCurrent(p))throw Error('Run validation for the current quality drivers first.');if(!q.drivers.length)throw Error('Add a quality driver first.');const open=qualityFindings(p);if(open.length&&!raw.acknowledge)throw Error('Acknowledge the open findings before carrying them forward.');q.handoff={at:now,version:q.version,sourceVersion:p.contentVersion,driverIds:orderedDrivers(p).map(d=>d.id),openFindings:open.length,acknowledged:raw.acknowledge===true};}
  else throw Error('Unknown quality-driver action.');
  if(changed){q.version++;q.review=null;q.handoff=null;}
  // created: the conflict record a quality.conflict wrote (round 12, GR-GOV-16: a reviewed batch answers it).
  return {document:p,selected,...(created?{created}:{})};
}
// The chapter's export reads its records in one pass (document-memo.js), so its lookups read one index (round 5).
export function exportQualityMarkdown(p){return memoPass(p,()=>exportQualityMarkdownOf(p));}
// Round 12 (D-02): the drivers by kind in the SDD's order (business, functional, quality, constraint, operational, data,
// technology evolution, business continuity), each under its code; a quality driver with its scenario and target.
export const driversByKind=p=>{const ds=orderedDrivers(p);return DRIVER_KINDS.map(k=>({kind:k,drivers:ds.filter(d=>driverKind(d)===k.id)})).filter(x=>x.drivers.length);};
function exportQualityMarkdownOf(p){const q=p.quality,codes=driverCodes(p),list=(label,ids)=>ids?.length?`${label}: ${ids.join(', ')}\n\n`:'',refs=new Map((p.logical?.responsibilities||[]).map(r=>[r.id,r.ref||r.id]));return `# AIW V5 · ${p.name}\n\n## Chapter 2 — Architectural drivers\n\nDriver revision ${q.version} · Requirements revision ${p.contentVersion}.\n\nEach driver keeps its kind and its code. Order uses the kind, then named priority, then explicit order within that priority. No hidden score is used.\n\n`+driversByKind(p).flatMap(x=>x.drivers).map(d=>{const quality=isQualityDriver(d);return `### ${codes.get(d.id)} · ${d.title}\n\nKind: ${driverKindOf(driverKind(d)).name} · ID: ${d.id}${quality?` · Scenario: ${d.scenarioId} · ${qualityType(d.category)?.name||d.category}`:''}\n\n${d.description?'Description: '+d.description+'\n\n':''}${d.impact?'Impact on the architecture: '+d.impact+'\n\n':''}Priority: ${driverPriority(d)||'not stated'}${d.priorityBasis?' ('+d.priorityBasis+')':''} — ${d.rationale||'Reason missing'}\n\n`+(quality?`Stimulus: ${d.stimulus}\n\nConditions: ${d.conditions}\n\nResponse: ${d.response}\n\nMeasure: ${d.metric} — ${targetText(d)}\n\nWindow: ${d.window}\n\nVerification: ${d.measurement}\n\n`:'')+`Owner: ${d.owner}\n\nSource: ${d.source}\n\nOrigin: ${d.origin} · ${quality?'Scenario':'Driver'}: ${d.confirmed?'confirmed':'unconfirmed'}${quality?` · Target: ${d.targetConfirmed?'confirmed':'assumption'}`:''}\n\nRequirements: ${d.requirementIds.join(', ')||(quality?'Missing':'None linked')}\n\n${list('Requirement groups',d.requirementGroupIds)}${list('Constraints',d.constraintIds)}Outcomes: ${(d.outcomeIds?.length?d.outcomeIds:driverOutcomes(p,d).map(a=>a.id)).join(', ')||'Not linked through a requirement'}\n\nResponsibilities: ${d.responsibilityIds.map(id=>refs.get(id)||id).join(', ')||(quality?'Missing':'None linked')}\n\n${quality?`Candidate tactic: ${d.tactic||'Not recorded'}\n\n`:''}`;}).join('')+`## Recorded conflicts\n\n`+(q.conflicts.map(c=>`- ${c.id} · ${c.driverIds.join(' / ')} · ${c.title}: ${conflictIsResolved(p,c)?'Resolved':'Open / needs review'}. ${c.effect} Resolution: ${c.resolution||'Not recorded'}. Owner: ${c.owner||'Missing'}.`).join('\n')||'No conflicts recorded. Potential trade-offs remain prompts for review.')+`\n\n## Open findings\n\n`+(qualityFindings(p).map(f=>`- ${f.driverId}: ${f.title}. ${f.detail}`).join('\n')||'No findings under the current rules.')+`\n\n## Chapter 3 handoff\n\n${qualityHandoffCurrent(p)?'Current driver references are available to Chapter 3.':'The current revision still needs handoff review.'}\n\nGuidance is rule-based. Candidate tactics are proposals, not approved architectural decisions.\n`;}
