// A project-specific reading of existing architecture records. It never
// creates facts; the contract command is reviewed by the normal impact flow.
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

export function relationshipReading(project,model,edge){
 const from=model.objects.get(edge.from),to=model.objects.get(edge.to),underlying=(edge.via||[]).map(id=>model.relationships.find(e=>e.id===id)||model.objects.get(id)).filter(Boolean);
 const contractId=edge.attributes?.contractId||[from,to,...underlying].find(o=>o?.type==='contract')?.id;
 const contract=project.interfaces?.contracts?.find(c=>c.id===contractId);
 const illustrative=[from,to].some(o=>o?.status==='Illustrative')||contract?.origin==='reference';
 const checks=[];
 if(edge.derived)checks.push('This line is a projection of the recorded links; inspect its underlying identities.');
 if(contract){
  if(!contract.owner||contract.owner==='To confirm with the provider')checks.push('Confirm the provider and accountable contract owner.');
  if(!contract.timeoutPolicy)checks.push('Define what a missing acknowledgement means.');
  if(!contract.retryPolicy||!contract.duplicatePolicy)checks.push('Agree retry and repeat handling before replay.');
  if(!contract.authorization)checks.push('Confirm caller authority at this boundary.');
 }
 if(edge.type==='requires')checks.push('Confirm capacity, failure behaviour and operating ownership of the shared dependency.');
 if(edge.type==='protects'&&from?.record?.review==null)checks.push('The intended control needs an enforcement test and reviewed evidence.');
 const linked=contractId==='network'&&(!project.workspace?.template||project.workspace.template==='bank-payment')?[project.artefacts?.find(r=>r.id==='REQ-004'),project.quality?.drivers?.find(d=>d.id==='QD-004'),project.decisions?.records?.find(d=>d.id==='ADR-003')].filter(Boolean):[];
 return {from,to,underlying,contract,illustrative,checks,linked,source:edge.source||'model projection',meaning:edge.attributes?.purpose||contract?.purpose||edge.attributes?.scope||edge.label,
  authority:contract?.evidence||from?.record?.source||to?.record?.source||''};
}
