// A project-specific reading of existing architecture records: the settlement investigation the architecture case
// carries (architecture-case-ui.js, Chapter 11). It never creates facts; the contract command is reviewed by the normal
// impact flow.
const STAGES=[
 {chapter:4,id:'hub',question:'Who owns the uncertain payment?',role:'Responsibility'},
 {chapter:5,id:'worker',question:'Which component submits and investigates it?',role:'Application'},
 {chapter:6,id:'gateway',question:'Which shared capability carries the request?',role:'Capability'},
 {chapter:7,id:'tr-005',question:'What implementation choice is recorded?',role:'Technology choice'},
 {chapter:8,id:'network',question:'What does the external contract promise?',role:'Contract & data'},
 {chapter:9,id:'audit',question:'What records the investigation?',role:'Protection'},
 {chapter:10,id:'PL-003',question:'Where would recovery run?',role:'Placement'},
 {chapter:11,id:'ADR-003',question:'Why would we choose this recovery?',role:'Decision'}
];
const text=v=>String(v??'').trim();

export function settlementInvestigation(project,model){
 // Older reference projects predate workspace.template. Match their saved
 // semantic identities, while leaving other named templates untouched.
 if((project?.workspace?.template&&project.workspace.template!=='bank-payment')||!model?.objects.has('hub')||!model.objects.has('network'))return null;
 const contract=project.interfaces?.contracts?.find(c=>c.id==='network');
 const requirement=project.artefacts?.find(r=>r.id==='REQ-004');
 const driver=project.quality?.drivers?.find(r=>r.id==='QD-004');
 const decision=project.decisions?.records?.find(r=>r.id==='ADR-003');
 const stages=STAGES.map(s=>({...s,object:model.objects.get(s.id)||null}));
 const obligations=[
  {key:'provider',title:'Provider agreement',resolved:!!contract?.evidence&&contract.origin!=='reference'&&contract.owner!=='To confirm with the provider',detail:'Confirm enquiry operation, provider ownership and the meaning of each status.'},
  {key:'pending',title:'Uncertain outcome',resolved:!!contract?.timeoutPolicy&&!!contract?.failurePolicy,detail:'Retain pending state after a missing response; distinguish rejection from unknown outcome.'},
  {key:'replay',title:'Safe replay',resolved:!!contract?.idempotencyKey&&!!contract?.duplicatePolicy&&!!contract?.retryPolicy,detail:'Agree the original reference, repeat handling and conditions for resubmission.'},
  {key:'authority',title:'Status authority',resolved:!!project.interfaces?.data?.find(d=>d.id==='settlement')?.authorityId,detail:'Name the writer of settlement status and the owner of unresolved cases.'},
  {key:'verification',title:'Recovery evidence',resolved:!!driver?.targetConfirmed&&!!project.security?.controls?.find(c=>c.id==='audit')?.review,detail:'Exercise timeout, late response, duplicate and investigation paths; retain the evidence.'}
 ];
 const options=(decision?.alternatives||[]).filter(a=>['enquire_first','blind_retry'].includes(a.strategy));
 return {contract,requirement,driver,decision,stages,obligations,options,caseIds:new Set([...stages.map(s=>s.id),'ledger','notify','settlement','ext-network','PROC-REF-PENDING','REQ-004','QD-004']),
  illustrative:requirement?.confirmed!==true||driver?.targetConfirmed!==true||contract?.origin==='reference'};
}

export function settlementPolicyCommand(caseFile){
 const c=caseFile?.contract;if(!c)return null;
 const openAssumption='Confirm the provider enquiry semantics, safe repeat guarantee, investigation owner and recovery target before treating this policy as agreed.';
 return {type:'interfaces.contract',payload:{...c,
  timeoutPolicy:'Keep the outcome pending when the response is missing. Enquire using the original payment reference before deciding whether a replay is safe.',
  retryPolicy:'Investigate the original reference and its authoritative outcome first. Resubmit only under a provider-agreed repeat policy; assign unresolved cases to an accountable owner.',
  failurePolicy:'Distinguish a definitive rejection from an unknown result. Preserve the original reference, enquiry result and investigation trail.',
  assumptions:[c.assumptions,!text(c.assumptions).includes(openAssumption)?openAssumption:''].filter(Boolean).join(' '),
  assumptionsResolved:false}};
}
