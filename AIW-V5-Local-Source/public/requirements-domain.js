import {PROJECT_LIMITS} from './intake-domain.js';
import {sourceAssurance,assuranceFindings} from './assurance-domain.js';
import {documentCopy,memoPass,sharedList} from './document-memo.js';
import {readContent} from './source-fingerprint.js';
import {canonical,sha256} from './brain-integrity.js';
import {groupsMarkdown,groupIndex,requirementGroups} from './requirement-groups.js';
import {moduleTree} from './module-model.js';
import {patchIds,patchText,within,knownOnly} from './requirement-links.js';
import {cleanBasis} from './priority-scale.js';
import {cleanOpen} from './open-fields.js';
import {openFindings,RETIRE_ONLY} from './record-lifecycle.js';
import {processFindings} from './process-model.js';
import {relationshipFindings} from './architecture-model.js';

// Round 12 (GR-INT-08, GR-INT-09): what a statement says, read by rule (statement-checks.js).
import {statementChecks,checksText,testObjective,usesLens} from './statement-checks.js';
export const PROJECT_ID='bank-payment';
export const TYPES=[
  {id:'outcome',name:'Business outcome',plural:'Outcomes',prefix:'OUT',color:'#527343'},
  {id:'stakeholder',name:'Stakeholder',plural:'Stakeholders',prefix:'STK',color:'#886a32'},
  {id:'actor',name:'Actor',plural:'Actors',prefix:'ACT',color:'#386d68'},
  {id:'scope',name:'Scope boundary',plural:'Scope',prefix:'SCP',color:'#797044'},
  {id:'journey',name:'Journey step',plural:'Journey',prefix:'JRN',color:'#906932'},
  {id:'constraint',name:'Constraint',plural:'Constraints',prefix:'CON',color:'#785972'},
  {id:'assumption',name:'Assumption',plural:'Assumptions',prefix:'ASM',color:'#786347'},
  {id:'requirement',name:'Functional requirement',plural:'Requirements',prefix:'REQ',color:'#2f6855'},
  // Round 12 (DM-19): a business rule, parameter or regulatory instrument. Optional: a project without one is complete.
  {id:'rule',name:'Business rule',plural:'Rules',prefix:'BR',color:'#6a5f3b',optional:true}
];
// Round 12 (DM-18): one record may duplicate another (kept as an association, never a typed ArchiMate relationship).
// Round 12 (GR-INT-09): a test objective imported as a requirement verifies the requirement it tests (an association too).
export const LINK_TYPES=['participates in','requires','delivers','owns','precedes','constrains','supports','informs','duplicates','verifies'];
export const PRIORITIES=['Must','Should','Could'];
// Round 12 (DM-07): a priority no one stated is '' (not stated), the default of a new record. Its basis says who set it:
// a source band (an import), a person, or a rule. A requirement imported before round 12 reads its basis as the source
// band it was mapped from (a pure reading; nothing is written).
export const priorityBasisOf=a=>a?.priorityBasis||(a?.priority&&a?.provenance?'source band':'');
export const typeInfo=type=>TYPES.find(t=>t.id===type);
// A project may explicitly rule out these context categories. The decision needs an owner,
// a source and a reason; the core outcome, actors, scope, journey and requirements still
// need records. A decision is superseded as soon as a record of that type is added.
const NOT_APPLICABLE_CONTEXT=new Set(['constraint','assumption']);
const applicabilityBasis=(project,type)=>sha256(canonical({brief:[project.brief?.problem,project.brief?.goal,project.brief?.source],context:project.artefacts.filter(a=>['outcome','stakeholder','actor','scope','constraint','assumption'].includes(a.type)&&a.type!==type).map(a=>[a.id,a.type,a.title,a.description,a.source,a.scopeMode]).sort((a,b)=>a[0].localeCompare(b[0])),retired:(project.retired?.records||[]).filter(r=>r.path==='artefacts'&&['outcome','stakeholder','actor','scope','constraint','assumption'].includes(r.record?.type)).map(r=>[r.id,r.at]).sort((a,b)=>a[0].localeCompare(b[0]))}));
const notApplicable=(project,type)=>NOT_APPLICABLE_CONTEXT.has(type)&&!project.artefacts.some(a=>a.type===type)&&project.contextApplicability?.[type]?.reviewed===true&&!!project.contextApplicability?.[type]?.reason&&!!project.contextApplicability?.[type]?.owner&&!!project.contextApplicability?.[type]?.source&&project.contextApplicability[type].basis===applicabilityBasis(project,type);
export const contextApplicabilityCurrent=notApplicable;
// The command's working copy: JSON-identical, strings shared (document-memo.js, round 5).
const copy=documentCopy;
const text=(value,max=4000)=>typeof value==='string'?value.trim().slice(0,max):'';
export function seedProject(){
  const records=[
    ['OUT-001','outcome','A payment with a known outcome','Customers can follow an instruction to a confirmed, held, or pending outcome.','Product owner'],
    ['OUT-002','outcome','Protect the financial effect','An instruction must not cause an unintended duplicate debit.','Operations lead'],
    ['STK-001','stakeholder','Payments product owner','Accountable for the payment experience and the scope of the service.','Product owner'],
    ['STK-002','stakeholder','Payment operations lead','Accountable for held payments, uncertain outcomes, and operational follow-up.','Operations lead'],
    ['ACT-001','actor','Bank customer','Submits an instruction and needs to understand its current outcome.','Channels team'],
    ['ACT-002','actor','Operations analyst','Investigates held instructions and uncertain settlement outcomes.','Operations lead'],
    ['SCP-001','scope','Domestic account-to-account payment','In scope: instruction capture, risk screening, posting, settlement, and outcome enquiry.','Product owner'],
    ['SCP-002','scope','Card and international payments','Out of scope for this reference journey.','Product owner'],
    ['JRN-001','journey','Initiate payment','The customer submits an instruction with a destination, amount, and request reference.','Channels team'],
    ['JRN-002','journey','Screen the instruction','Screen the instruction and choose whether to allow or hold it.','Risk team'],
    ['JRN-003','journey','Record the posting','Record the authorised financial effect with the existing request reference.','Core banking team'],
    ['JRN-004','journey','Settle the payment','Submit the external leg and track a confirmed or uncertain response.','Payments team'],
    ['JRN-005','journey','Communicate the outcome','Expose the known status and the next action to the customer or operations.','Channels team'],
    ['CON-001','constraint','Use the existing core ledger','The reference project assumes the current ledger remains the book of record. Confirm with the bank.','Architecture lead'],
    ['ASM-001','assumption','Settlement status can be enquired','An enquiry can resolve an uncertain external response. Contract evidence is still required.','Payments team'],
    ['REQ-001','requirement','Accept a traceable payment instruction','The service shall accept a valid instruction and return a stable request reference.','Channels team','Given a valid instruction, when it is accepted, then a request reference is returned and can be used for status enquiry.','api'],
    ['REQ-002','requirement','Hold an instruction that needs review','The service shall hold an instruction that requires additional screening and expose its reason.','Risk team','Given an instruction that requires review, when screening completes, then its status is held and no ledger posting occurs.','risk'],
    ['REQ-003','requirement','Prevent duplicate financial effects','The service shall recognise a repeated instruction reference and preserve one financial effect.','Core banking team','Given an instruction already posted, when the same reference is retried, then the recorded outcome is returned without another debit.','ledger'],
    ['REQ-004','requirement','Retain an uncertain settlement outcome','The service shall keep an uncertain response pending until an enquiry resolves it.','Payments team','Given no definitive settlement response, when the request times out, then the outcome remains pending and the same reference is retained for enquiry.','hub'],
    ['REQ-005','requirement','Notify the customer quickly','The service shall notify the customer quickly after the payment outcome is known.','Channels team','','notify']
  ];
  const artefacts=records.map(([id,type,title,description,owner,acceptance='',modelRef=''])=>({id,type,title,description,owner,source:'Illustrative Bank Payment Journey brief',priority:'Must',acceptance,origin:'reference',confirmed:false,scopeMode:id==='SCP-002'?'out':'in',order:type==='journey'?Number(id.split('-')[1]):0,modelRef}));
  const specs=[['ACT-001','JRN-001','participates in'],['ACT-002','JRN-002','participates in'],['ACT-002','JRN-004','participates in'],['ACT-001','JRN-005','participates in'],['STK-001','OUT-001','owns'],['STK-002','OUT-002','owns'],['SCP-001','JRN-001','supports'],['CON-001','REQ-003','constrains'],['ASM-001','REQ-004','informs']];
  for(let i=1;i<=5;i++){const n=String(i).padStart(3,'0');specs.push(['JRN-'+n,'REQ-'+n,'requires'],['REQ-'+n,i===3?'OUT-002':'OUT-001','delivers']);if(i<5)specs.push(['JRN-'+n,'JRN-'+String(i+1).padStart(3,'0'),'precedes']);}
  const counters=Object.fromEntries(TYPES.map(t=>[t.id,Math.max(0,...artefacts.filter(a=>a.type===t.id).map(a=>Number(a.id.split('-')[1])))]));
  return {schemaVersion:'aiw.project.v2',id:PROJECT_ID,name:'Bank Payment Journey',contentVersion:1,brief:{problem:'Customers and operations need a clear, traceable payment journey, including held instructions and uncertain settlement outcomes.',goal:'Define the responsibilities needed to move a domestic payment from instruction to a known outcome.',source:'Illustrative reference brief — confirm against your project',confirmed:false},artefacts,relationships:specs.map(([from,to,kind],i)=>({id:'REL-'+String(i+1).padStart(3,'0'),from,to,kind})),counters:{...counters,relationship:specs.length},review:null,handoff:null,explorer:null};
}
export function related(project,id){return project.relationships.filter(r=>r.from===id||r.to===id);}
export function neighbours(project,id){const ids=new Set([id]);for(const r of related(project,id)){ids.add(r.from);ids.add(r.to)}return ids;}
// The chapter's checks, worked out once per settled document or pass (each caller gets its own copies).
export function findings(project){return memoPass(project,()=>sharedList(project,'requirements:findings',()=>findingsOf(project)));}
function findingsOf(project){
  const result=[],add=(code,id,title,detail,level='warning',extra={})=>result.push({id:code+':'+id,code,artefactId:id,title,detail,level,...extra});
  const byId=new Map(project.artefacts.map(a=>[a.id,a])),adjacency=new Map(),titles=new Map();
  for(const r of project.relationships){for(const [from,to] of [[r.from,r.to],[r.to,r.from]]){if(!adjacency.has(from))adjacency.set(from,new Set());adjacency.get(from).add(to);}}
  for(const a of project.artefacts){const key=a.type+':'+a.title.toLowerCase().replace(/[^a-z0-9]/g,'');const old=titles.get(key);if(!old||a.id<old.id)titles.set(key,a);}
  if(!project.brief.problem||!project.brief.goal||!project.brief.source)add('brief','brief','Complete the project brief','Capture the problem, intended outcome, and source.','error');
  if(!project.brief.confirmed)add('brief-review','brief','Confirm the project brief','Review the brief and its source before confirming it.');
  for(const type of TYPES)if(!type.optional&&!project.artefacts.some(a=>a.type===type.id)&&!notApplicable(project,type.id))add('missing-type',type.id,'Add '+type.name.toLowerCase(),NOT_APPLICABLE_CONTEXT.has(type.id)?'Add a '+type.name.toLowerCase()+' or record why it does not apply, with an owner and source.':'Record at least one '+type.name.toLowerCase()+' to define this project.', 'error',{artefactType:type.id,canMarkNotApplicable:NOT_APPLICABLE_CONTEXT.has(type.id)});
  const stated=(a,k)=>!!String(a[k]??'').trim()||!!a.open?.[k],lens=usesLens(project),verifies=new Set(project.relationships.filter(r=>r.kind==='verifies').map(r=>r.from));
  const source=sourceAssurance(project.artefacts,project),judged=new Set(source.repeated.filter(r=>r.judgement?.current).flatMap(r=>r.ids));
  for(const a of project.artefacts){
    openFindings(a,['description','owner','source','acceptance',...(TYPE_TEXT[a.type]||[]).map(([k])=>k)],add);
    if(!stated(a,'description'))add('description',a.id,'Add a description','Explain what this artefact means in your project.','error');
    if(!a.confirmed)add('confirmation',a.id,'Review the '+(a.origin==='reference'?'reference example':'draft'),a.origin==='reference'?'This record is illustrative; confirm it only after checking its content.':'This record has not yet been confirmed by you.');
    if(a.type==='requirement'){
      if(!stated(a,'owner')||!stated(a,'source'))add('accountability',a.id,'Name the owner and source','Every requirement needs an accountable owner and a traceable source.','error');
      const acceptanceChecks=a.acceptance?statementChecks(a.acceptance,{lens}):[];
      if(a.acceptance.length<20||/\[[^\]]+\]/.test(a.acceptance)||acceptanceChecks.length)add('acceptance',a.id,'Make acceptance testable','Describe the starting condition, action, and observable expected result.'+(acceptanceChecks.length?' The acceptance '+checksText(acceptanceChecks)+'. State an observable pass/fail result; timing claims need an agreed boundary and threshold.':''),'error');
      // Round 12 (GR-INT-08): one ambiguity cause for every reason a statement cannot be tested as worded, each named.
      const checks=statementChecks(a.description,{title:a.title,lens});
      if(checks.length)add('ambiguity',a.id,'Resolve ambiguous wording','The statement '+checksText(checks)+'. Replace subjective wording with an observable response or a confirmed measurable target'+(checks.some(c=>c.check==='regulation')?', and name the regulation it rests on':'')+'.','warning',{checks:checks.map(c=>c.check)});
      // Round 12 (GR-INT-09): a test objective is told apart from what it verifies: linked as verifying it, it is answered.
      const objective=verifies.has(a.id)?'':testObjective(a.description||a.title);
      if(objective)add('test-objective',a.id,'Tell the test objective from the requirement it tests',`The statement reads as a test objective (“${objective}”). Link it as verifying the requirement it tests, or restate it as a requirement.`,'warning');
      const near=[...(adjacency.get(a.id)||[])].map(id=>byId.get(id)).filter(Boolean);
      // Round 12 (DRF-05): a requirement on a step of the business, or of a supporting or administrative process, is
      // linked; one that belongs on no journey carries a person's reviewed reason (requirements.journey-treatment).
      if(!near.some(n=>n.type==='journey')&&!journeyTreated(a))add('journey-link',a.id,'Link a journey step','Show where this requirement is needed, or record why it belongs on no journey.','error');
      if(!near.some(n=>n.type==='outcome'))add('outcome-link',a.id,'Link a business outcome','Show why this requirement matters.','error');
    }
    const norm=a.title.toLowerCase().replace(/[^a-z0-9]/g,'');
    const duplicate=titles.get(a.type+':'+norm);
    // A statement a person judged against its identical copies (requirements.repeated) has been compared already.
    if(duplicate?.id<a.id&&!judged.has(a.id))add('duplicate',a.id,'Check a possible duplicate',`${duplicate.id} has the same title. Compare the content before keeping both.`,'warning');
  }
  for(const r of project.relationships)if(r.kind==='precedes'&&byId.get(r.from)?.type==='journey'&&byId.get(r.to)?.type==='journey'&&(byId.get(r.from).journeyId||'')!==(byId.get(r.to).journeyId||''))add('journey-cross',r.id,'Keep the order within one journey',`${r.from} precedes ${r.to}, which belongs to another journey. Order the steps of each journey on their own.`,'warning',{relationshipId:r.id});
  for(const r of project.relationships)if(!byId.has(r.from)||!byId.has(r.to))add('broken-link',r.id,'Repair a broken relationship',`${r.from} → ${r.to} references a missing artefact.`,'error',{relationshipId:r.id});
  // Round 24 (D-24-01): once the project has a module structure, each requirement sits in one leaf of it.
  const tree=moduleTree(project);
  if(tree.modules.length){for(const id of tree.unassigned)add('module-none',id,'Place the requirement in a module','None of the modules or sub-modules holds it. Name it in one, or widen a rule.','warning');for(const id of tree.doubled)add('module-two',id,'Keep the requirement in one module','Two modules or sub-modules hold it. Change their rules so that one does.','warning');}
  // Round 6 (Contract T): the structure of the process (PROC-*) and the typing of the recorded links (RELATION-INVALID).
  return [...result,...source.findings,...assuranceFindings(project),...processFindings(project),...relationshipFindings(project,{chapter:1})];
}
export function milestones(project){return memoPass(project,()=>milestonesOf(project));}
function milestonesOf(project){
  const fs=findings(project),reqs=project.artefacts.filter(a=>a.type==='requirement'),journey=project.artefacts.filter(a=>a.type==='journey');
  const context=['outcome','stakeholder','actor','scope','constraint','assumption'];
  const result = [
    {id:'brief',name:'Confirm the project brief',done:!!(project.brief.problem&&project.brief.goal&&project.brief.source&&project.brief.confirmed),tab:'work',filter:'brief'},
    {id:'context',name:'Review the project context',done:context.every(t=>project.artefacts.some(a=>a.type===t)||notApplicable(project,t))&&project.artefacts.filter(a=>context.includes(a.type)).every(a=>a.description&&a.confirmed&&!fs.some(f=>f.artefactId===a.id)),tab:'work',filter:'context'},
    {id:'journey',name:'Connect and review the journey',done:journey.length>0&&journey.every(a=>a.confirmed&&a.description&&related(project,a.id).length>0&&!fs.some(f=>f.artefactId===a.id)),tab:'model',filter:'journey'},
    {id:'requirements',name:'Make requirements ready to test',done:reqs.length>0&&reqs.every(a=>a.confirmed)&&!fs.some(f=>f.code==='broken-link'||reqs.some(a=>a.id===f.artefactId)),tab:'work',filter:'requirement'},
    {id:'review',name:'Run and review validation',done:project.review?.contentVersion===project.contentVersion,tab:'validate'},
    {id:'handoff',name:'Carry requirements into Chapter 2',done:project.handoff?.contentVersion===project.contentVersion,tab:'output'}
  ];
  const contextRecords=project.artefacts.filter(a=>context.includes(a.type));
  const details=[project.brief.confirmed?'Brief confirmed':'Problem, outcome, and evidence',`${contextRecords.filter(a=>a.description&&a.confirmed&&!fs.some(f=>f.artefactId===a.id)).length} of ${contextRecords.length} context records reviewed${[...NOT_APPLICABLE_CONTEXT].filter(t=>notApplicable(project,t)).length?' · '+[...NOT_APPLICABLE_CONTEXT].filter(t=>notApplicable(project,t)).length+' category decisions':''}`,`${journey.filter(a=>a.confirmed&&a.description&&related(project,a.id).length>0&&!fs.some(f=>f.artefactId===a.id)).length} of ${journey.length} steps reviewed and linked`,`${reqs.filter(a=>a.confirmed&&!fs.some(f=>f.artefactId===a.id)).length} of ${reqs.length} requirements ready`,`${fs.length} open findings`,project.handoff?.contentVersion===project.contentVersion?'Current revision received':'Same records, no re-entry'];
  return result.map((m,i)=>({...m,detail:details[i]}));
}
export function guidance(project,artefact,tab='work',section='brief'){
  if(!artefact){
    const fs=findings(project),gaps=fs.filter(f=>!['confirmation','brief-review'].includes(f.code));
    const pages={
      work:{heading:section==='brief'?(project.brief.confirmed?'The purpose is recorded.':'Make the brief yours.'):'Give every record a purpose.',explanation:section==='brief'?'Your brief establishes the problem, intended outcome, and source for the project.':'Select an artefact to inspect its owner, evidence, and relationships.',attention:project.brief.confirmed?'The brief is confirmed. Review the people, boundaries, and assumptions that support it.':project.workspace?.template==='blank'?(project.artefacts.length?'Review the drafted records, then confirm the brief.':'Read the brief, then draft the chapter from it.'):'Review the reference content before confirming it.',next:'Connect the brief to outcomes, actors, and scope.'},
      model:{heading:'Follow the reason behind it.',explanation:'Actors participate in journey steps. Steps require behaviour, and requirements deliver business outcomes.',attention:'Select an artefact to illuminate its direct relationships. Hidden perspectives are revealed when you follow a connection.',next:'Trace the journey one step at a time, then inspect its requirements.'},
      validate:{heading:gaps.length?'Close the gaps with evidence.':'Review what is still unconfirmed.',explanation:`${gaps.length===1?'1 content gap':gaps.length+' content gaps'} and ${fs.length-gaps.length===1?'1 confirmation item':(fs.length-gaps.length)+' confirmation items'} remain in this revision.`,attention:gaps[0]?.detail||'Structural checks alone cannot confirm that the requirements reflect your project.',next:'Open a finding, make the change, and record checks for the latest revision.'},
      output:{heading:'Carry a clear brief forward.',explanation:'The export includes the brief, requirements, relationships, sources, and open findings.',attention:project.handoff?.contentVersion===project.contentVersion?'The current revision has been received by Chapter 2.':'Confirm what is ready and acknowledge what remains open before the handoff.',next:'Export the requirements brief or review the Chapter 2 handoff.'}
    };return pages[tab]||pages.work;
  }
  const issues=findings(project).filter(f=>f.artefactId===artefact.id),count=related(project,artefact.id).length;
  const context={work:'Clarify the wording, owner, and source before confirming this record.',model:'Follow its connections to see where it belongs and why it matters.',validate:'Resolve the highlighted finding, then run validation again.',output:'This stable ID carries the same record into the next chapter.'};
  const issue=issues.find(f=>!['confirmation','brief-review'].includes(f.code))||issues[0];
  return {explanation:`${typeInfo(artefact.type).name} · ${artefact.id}. ${artefact.description||'A description has not been recorded.'}`,attention:issue?.detail||`${count} relationships connect this artefact to the project.`,next:context[tab]||context.output};
}
export function proposals(project,selected,tab='work'){
  const req=selected?.type==='requirement'?selected:project.artefacts.find(a=>a.type==='requirement'&&!a.acceptance)||project.artefacts.find(a=>a.type==='requirement');
  const result=[];
  if(req){const actor=project.artefacts.find(a=>a.type==='actor');const criterion=req.modelRef==='notify'?'Given a recorded payment outcome, when the customer views the payment using its reference, then the recorded status and next permitted action are shown without treating a pending outcome as failure.':`Given [the starting condition for ${actor?.title.toLowerCase()||'the actor'}], when [the action described in ${req.id} occurs], then [the observable expected result] can be verified.`;result.push({id:'acceptance',label:req.acceptance?'Examine an acceptance boundary':'Make acceptance observable',reason:`${tab==='validate'?'Resolve the testability gap in':tab==='output'?'Make the exported acceptance clear for':tab==='model'?'Connect an observable result to':'Strengthen'} ${req.id}. Replace any bracketed prompts before confirming.`,target:req.id,mode:'edit',record:{...req,...(req.modelRef==='notify'&&!req.acceptance?{title:'Communicate the recorded payment outcome',description:'The service shall expose the recorded payment status and the next permitted action using the payment reference.'}:{}),acceptance:req.acceptance?req.acceptance+'\nGiven [an exception to the normal condition], when [the actor repeats the action], then [the safe, observable result] is verified.':criterion,confirmed:false}});}
  if((!project.workspace?.template||project.workspace.template==='bank-payment')){
  result.push({id:'pending',label:'Make an uncertain outcome explicit',reason:'A timeout does not establish failure. Define what the customer or operations can observe while the result is unknown.',mode:'new',record:{type:'requirement',title:'Enquire about a pending payment',description:'The service shall allow an authorised actor to enquire using the existing payment reference and distinguish pending, confirmed, and held outcomes.',owner:'',source:'',priority:'Should',acceptance:'Given a payment with an uncertain outcome, when an authorised actor enquires using its reference, then the current known status and the permitted next action are returned.',confirmed:false},links:[['JRN-004','requires','new'],['new','delivers','OUT-001']].filter(([a,,b])=>(a==='new'||project.artefacts.some(n=>n.id===a))&&(b==='new'||project.artefacts.some(n=>n.id===b)))});
  result.push({id:'assumption',label:'Expose an unverified dependency',reason:'Capture evidence still needed to rely on an external settlement enquiry.',mode:'new',record:{type:'assumption',title:'Confirm the external enquiry contract',description:'The external service can provide an authoritative outcome for an existing reference. Obtain contract evidence and test examples before treating this as confirmed.',owner:'',source:'',priority:'Must',acceptance:'',confirmed:false}});
  }
  if(selected&&selected.type!=='requirement')result.unshift({id:'context-evidence',label:'Test the assumption behind this '+typeInfo(selected.type).name.toLowerCase(),reason:`What evidence would make ${selected.id} dependable${tab==='output'?' for the next chapter':tab==='model'?' in the connected journey':tab==='validate'?' during review':''}? Record an open question before treating it as a fact.`,mode:'new',record:{type:'assumption',title:'Verify '+selected.title,description:`Confirm the evidence, boundaries, and exceptions behind ${selected.id}: ${selected.title}. Record the source before confirming this assumption.`,owner:selected.owner,source:'',priority:'Should',acceptance:'',confirmed:false},links:[['new','informs',selected.id]]});
  if((!!project.workspace?.template&&project.workspace.template!=='bank-payment')&&!result.length)result.push({id:'outcome',mode:'new',label:'Define a useful business outcome',reason:'Start with an observable change for the people in your brief; edit this prompt before confirming.',record:{type:'outcome',title:'Define the intended outcome',description:'[Who benefits, what changes, and how will the change be observed?]',owner:'',source:'',priority:'Must',confirmed:false}});
  const normal=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
  return result.filter(p=>p.mode!=='new'||!project.artefacts.some(a=>a.type===p.record.type&&normal(a.title)===normal(p.record.title)));
}
// Round 12 (D-08, DM-12): a stakeholder's or an actor's persona, for the SDD's persona table: the role, what moves them,
// what they wish for, what worries them, how they use the solution and what they gain from it; the category of user it
// is; and the requirement groups that hold its requirements.
export const PERSONA_FIELDS=[['role','Role'],['motivations','Motivations'],['wishes','Wishes'],['concerns','Concerns'],['usage','How they use the solution'],['benefits','Expected benefits']];
export const USER_CATEGORIES=[['staff-role','Staff role'],['partner','Partner'],['customer','Customer'],['external-organisation','External organisation'],['regulator','Regulator']];
// Round 12 (DM-27): an outcome's measure; (DM-19) a rule's value and where it is set down; (DM-25) the journey a step
// belongs to, whose order and 'precedes' links hold within it.
export const OUTCOME_FIELDS=[['problem','Business problem'],['measure','Measure'],['baseline','Baseline'],['target','Target'],['by','By when']];
export const RULE_FIELDS=[['value','Value'],['unit','Unit'],['currency','Currency'],['effectiveDate','Effective date'],['authority','Authority'],['instrument','Instrument'],['section','Section']];
export const RULE_LINKS=[['refinesId','The constraint it refines','constraints'],['dataId','The data it governs (Chapter 8)','Chapter 8 data definitions'],['controlId','The control that enforces it (Chapter 9)','Chapter 9 controls']];
const TYPE_TEXT={stakeholder:PERSONA_FIELDS,actor:PERSONA_FIELDS,outcome:OUTCOME_FIELDS,rule:RULE_FIELDS,journey:[['journeyId','Journey']]};
// Round 12 (DRF-05): the kind of process a journey step belongs to: a journey of the business ('', the default), a
// supporting process (reporting, audit, batch and the like) or an administrative one (users, roles, parameters).
export const PROCESS_KINDS=[['','Journey of the business'],['supporting','Supporting process'],['administrative','Administrative process']];
export const processKind=a=>PROCESS_KINDS.some(([k])=>k&&k===a?.processKind)?a.processKind:'';
// A requirement that belongs on no journey keeps a person's reviewed reason (requirements.journey-treatment): its
// journey-link finding clears. A reason no person reviewed (reviewed not true) does not clear it.
export const journeyTreated=a=>!!(a?.journeyTreatment&&a.journeyTreatment.reviewed===true&&String(a.journeyTreatment.reason||'').trim());
const SHORT=new Set(['role','value','unit','currency','effectiveDate','section','by','journeyId']),GROUP_LINKED=new Set(['stakeholder','actor','outcome','constraint','scope']);
// Round 12 (DM-21): the attributes an import keeps on a requirement, which a person may set or correct; each records whose
// it is (attributeOrigin: person; an attribute with no entry came from the import). A later import treats a person's
// attribute as it treats a person's words: a reviewed keep or replace (intake-domain.js).
export const REQUIREMENT_ATTRIBUTES=[['domain','Domain'],['capability','Capability theme'],['module','Module'],['userGroup','User group'],['priorityBand','Source priority band']];
// A source may cite many passages of a brief, so it holds as much as the brief itself.
const COMMON=[['title',160],['description',4000],['owner',180],['source',20000],['acceptance',4000]];
const words=k=>k.replace(/([A-Z])/g,' $1').toLowerCase();
const canon=r=>JSON.stringify(Object.keys(r).sort().map(k=>[k,r[k]]));
// A save patches the record (DM-09): a field left out keeps its value, null clears it; text past its limit is refused,
// never cut (DM-10). A record saved before round 12 keeps its shape until a new field is set.
function cleanRecord(p,raw,old,id){
  const type=old?.type||raw.type;if(!typeInfo(type))throw Error('Choose a valid artefact type.');
  const t=Object.fromEntries(COMMON.map(([k,n])=>[k,patchText(raw,k,old,n,'The '+words(k))]));if(!t.title)throw Error('Give the artefact a title.');
  const retained=old?Object.fromEntries(['externalId','domain','capability','module','userGroup','assessment','provenance','sourceMissing','evidenceTreatment','journeyTreatment','enrichment'].filter(k=>old[k]!==undefined).map(k=>[k,old[k]])):{};
  const priority=raw.priority===undefined&&old?old.priority:raw.priority==null||raw.priority===''?'':PRIORITIES.includes(raw.priority)?raw.priority:null;
  if(priority===null)throw Error('Choose the priority: Must, Should, Could or not stated.');
  const record={...retained,id,type,title:t.title,description:t.description,owner:t.owner,source:t.source,priority,acceptance:t.acceptance,confirmed:false,origin:old?.origin||(['reference','suggestion'].includes(raw.origin)?raw.origin:'user'),scopeMode:raw.scopeMode===undefined&&old?old.scopeMode:raw.scopeMode==='out'?'out':'in',order:raw.order===undefined&&old?old.order:Math.max(0,Math.min(999,Number(raw.order)||0)),modelRef:old?.modelRef||''};
  const put=(k,v)=>{if(v!==undefined&&(v!==''&&!(Array.isArray(v)&&!v.length)||old?.[k]!==undefined))record[k]=v;};
  for(const [k] of TYPE_TEXT[type]||[])put(k,patchText(raw,k,old,SHORT.has(k)?(k==='role'?180:120):2000,'The '+words(k)));
  if(type==='journey'){const k=raw.processKind===undefined?old?.processKind:raw.processKind??'';if(k&&!PROCESS_KINDS.some(([x])=>x&&x===k))throw Error('Choose the kind of process: a journey of the business, a supporting process or an administrative process.');put('processKind',k||'');}
  if(type==='stakeholder'||type==='actor'){const c=raw.category===undefined?old?.category:raw.category??'';if(c&&!USER_CATEGORIES.some(([k])=>k===c))throw Error('Choose a category: staff role, partner, customer, external organisation or regulator, or leave it not stated.');put('category',c);}
  if(GROUP_LINKED.has(type)){const g=patchIds(raw,'requirementGroupIds',old);within(g.ids,500,'requirement groups');knownOnly(g.sent,new Set(requirementGroups(p).map(x=>x.id)),'requirement groups');put('requirementGroupIds',g.ids);}
  if(type==='rule'){
    const r=patchIds(raw,'requirementIds',old);within(r.ids,5000,'requirements');knownOnly(r.sent,new Set(p.artefacts.filter(a=>a.type==='requirement').map(a=>a.id)),'requirements');put('requirementIds',r.ids);
    const known={refinesId:()=>new Set(p.artefacts.filter(a=>a.type==='constraint').map(a=>a.id)),dataId:()=>new Set((p.interfaces?.data||[]).map(d=>d.id)),controlId:()=>new Set((p.security?.controls||[]).map(c=>c.id))};
    for(const [k,,noun] of RULE_LINKS){const v=raw[k]===undefined?old?.[k]:typeof raw[k]==='string'?raw[k].trim():'';if(v&&raw[k]!==undefined)knownOnly([v],known[k](),noun);put(k,v||'');}
  }
  if(type==='requirement'){
    const origin={...(old?.attributeOrigin||{})};
    for(const [k] of REQUIREMENT_ATTRIBUTES){if(raw[k]===undefined)continue;const v=patchText(raw,k,null,240,'The '+words(k));if(v===String((k==='priorityBand'?old?.assessment?.priorityBand:old?.[k])??''))continue;if(k==='priorityBand'){if(v||record.assessment?.priorityBand!==undefined)record.assessment={...(record.assessment||{}),priorityBand:v};}else put(k,v);origin[k]='person';}
    put('attributeOrigin',Object.keys(origin).length?origin:undefined);
  }
  // Fields recorded as not stated or as an open question (open-fields.js): kept while a save leaves them out.
  const open=raw.open===undefined?old?.open:cleanOpen(raw.open,[...COMMON.map(([k])=>k),...(TYPE_TEXT[type]||[]).map(([k])=>k)]);put('open',open&&Object.keys(open).length?open:old?.open!==undefined?{}:undefined);
  // The basis of the priority: sent, or a person's when the person changed it, or what it was.
  const basis=raw.priorityBasis!==undefined?cleanBasis(raw.priorityBasis):priority!==(old?.priority??'')&&priority?'person':old?.priorityBasis;put('priorityBasis',priority?basis||'':'');
  // A confirmation not sent again holds only while what was confirmed is unchanged.
  record.confirmed=raw.confirmed!==undefined?raw.confirmed===true:!!old?.confirmed&&canon({...record,confirmed:true})===canon({...old,confirmed:true});
  return record;
}
// Two records say the same (source-fingerprint.js readContent), whatever the order of their keys.
const sameContent=(a,b)=>canonical(readContent(a))===canonical(readContent(b));
// The journeys of the project (DM-25): the steps that share a journeyId, each journey in its own order ('' is the
// journey of the steps that name none).
export function journeysOf(p){const by=new Map();for(const a of (p?.artefacts||[]).filter(a=>a.type==='journey')){const k=a.journeyId||'';if(!by.has(k))by.set(k,[]);by.get(k).push(a);}return [...by].map(([id,steps])=>({id,steps:steps.sort((x,y)=>(x.order||0)-(y.order||0)||x.id.localeCompare(y.id))}));}
export function applyCommand(input,command,now=new Date().toISOString()){
  const p=copy(input),payload=command.payload||{};let selected=null,content=true;
  // The problem holds the opening brief, up to 20,000 characters (round 4); the counts of its interpretation stay
  // while the problem text is the one they were read from.
  // Round 12 (DM-09, DM-10): a field left out keeps its value; a brief past 20,000 characters is refused, never cut.
  if(command.type==='brief'){const old=p.brief||{},problem=patchText(payload,'problem',old,20000,'The brief'),goal=patchText(payload,'goal',old,4000,'The intended outcome'),source=patchText(payload,'source',old,600,'The source'),same=problem===old.problem&&goal===old.goal&&source===old.source,confirmed=payload.confirmed!==undefined?payload.confirmed===true:!!old.confirmed&&same;if(same&&confirmed===!!old.confirmed&&p.brief)content=false;else p.brief={problem,goal,source,confirmed,...(p.brief?.interpreted&&p.brief.problem===problem?{interpreted:p.brief.interpreted}:{})};}
  else if(command.type==='applicability'){
    const kind=payload.type;if(!NOT_APPLICABLE_CONTEXT.has(kind))throw Error('Only constraints and assumptions can be recorded as not applicable.');
    p.contextApplicability={...(p.contextApplicability||{})};
    if(payload.applicable===true){if(!p.contextApplicability[kind])content=false;else delete p.contextApplicability[kind];}
    else{
      if(p.artefacts.some(a=>a.type===kind))throw Error('This category already has records. Review those records instead.');
      const reason=text(payload.reason,2001),owner=text(payload.owner,161),source=text(payload.source,601);
      if(reason.length<20||reason.length>2000)throw Error('Explain in 20–2,000 characters why this category does not apply.');
      if(!owner||owner.length>160)throw Error('Name an accountable owner within 160 characters.');
      if(!source||source.length>600)throw Error('Name a decision source within 600 characters.');
      if(payload.reviewed!==true)throw Error('Review the applicability decision before saving it.');
      const previous=p.contextApplicability[kind];
      const basis=applicabilityBasis(p,kind);
      if(previous?.reason===reason&&previous.owner===owner&&previous.source===source&&previous.reviewed===true&&previous.basis===basis)content=false;
      else p.contextApplicability[kind]={reason,owner,source,reviewed:true,basis,at:now};
    }
  }
  else if(command.type==='artefact'){
    const old=payload.id?p.artefacts.find(a=>a.id===payload.id):null;if(payload.id&&!old)throw Error('This artefact no longer exists. Reload the project.');
    const info=typeInfo(old?.type||payload.type);if(!info)throw Error('Choose an artefact type.');
    if(!old&&(p.artefacts.length>=PROJECT_LIMITS.artefacts||info.id==='requirement'&&p.artefacts.filter(a=>a.type==='requirement').length>=PROJECT_LIMITS.requirements))throw Error('This project supports up to 5,000 requirements and 6,000 total artefacts.');
    p.counters[info.id]=(p.counters[info.id]||0)+(old?0:1);const id=old?.id||`${info.prefix}-${String(p.counters[info.id]).padStart(3,'0')}`;
    const record=cleanRecord(p,payload,old,id),links=Array.isArray(payload.links)?within(payload.links,PROJECT_LIMITS.relationships,'relationships'):[];selected=id;
    // Links are taken on an update as on a creation (DM-10); one the project holds already is left as it is.
    const fresh=links.map(([from,kind,to])=>[from==='new'?id:from,kind,to==='new'?id:to]).filter(([a,kind,b],i,xs)=>!p.relationships.some(r=>r.from===a&&r.to===b&&r.kind===kind)&&xs.findIndex(x=>x[0]===a&&x[1]===kind&&x[2]===b)===i);
    if(old&&canon(record)===canon(old)&&!fresh.length)content=false;else{if(old)p.artefacts[p.artefacts.indexOf(old)]=record;else p.artefacts.push(record);if(!old&&p.contextApplicability?.[info.id])delete p.contextApplicability[info.id];for(const [a,kind,b] of fresh)addLink(p,a,b,kind);
      // A save that changes only a record's review state (its confirmation) is not a change of what it says (round 12,
      // UX-02): the content version, the Chapter 1 review and the handoff stay as they are.
      if(old&&!fresh.length&&sameContent(old,record))content=false;}
  }else if(command.type==='deleteArtefact'){
    // Round 12 (GR-GOV-24): a record leaves only through the one retire path (record.retire), with its reason, who and
    // when, restorable; its links are removed first, each an edit of its own.
    throw Error(RETIRE_ONLY);
  }else if(command.type==='relationship')addLink(p,payload.from,payload.to,payload.kind);
  else if(command.type==='deleteRelationship'){p.relationships=p.relationships.filter(r=>r.id!==payload.id);}
  else if(command.type==='review'){content=false;p.review={at:now,contentVersion:p.contentVersion,findings:findings(p).length};p.handoff=null;}
  else if(command.type==='handoff'){
    content=false;if(!p.artefacts.some(a=>a.type==='requirement'))throw Error('Add a requirement before continuing.');
    if(p.review?.contentVersion!==p.contentVersion)throw Error('Run validation for the current requirements first.');
    const open=findings(p);if(open.length&&!payload.acknowledge)throw Error('Acknowledge the open findings before carrying them forward.');
    p.handoff={at:now,contentVersion:p.contentVersion,openFindings:open.length,acknowledged:payload.acknowledge===true};
  }else if(command.type==='explorer'){
    content=false;const e=payload;p.explorer={accepted:Array.isArray(e.accepted)?[...new Set(e.accepted.filter(x=>['review','dedup','recovery'].includes(x)))]:[],completed:Array.isArray(e.completed)?e.completed.filter(x=>['inspect','layers4','flow','review4','physical','candidate','validate','export'].includes(x)):[],note:text(e.note,5000)};
  }else throw Error('Unknown project action.');
  if(content){p.contentVersion++;p.review=null;p.handoff=null;}
  return {document:p,selected};
}
// Why a Chapter 1 link from → to of a kind would be refused, or '' (rc41 close: one rule for the save and for the canvas's
// kinds menu, which offers only what this save accepts): two different saved Chapter 1 records (a process step drawn
// with them is not one), a known kind, not already recorded.
export function linkRefusal(p,from,to,kind){
  if(from===to)return 'Choose two different artefacts.';
  if(!p.artefacts.some(a=>a.id===from)||!p.artefacts.some(a=>a.id===to))return 'Both relationship endpoints must be saved Chapter 1 records.';
  if(!LINK_TYPES.includes(kind))return 'Choose a valid relationship.';
  if(p.relationships.some(r=>r.from===from&&r.to===to&&r.kind===kind))return 'This relationship already exists.';
  if(p.relationships.length>=PROJECT_LIMITS.relationships)return 'This project supports up to 20,000 requirement relationships.';
  return '';
}
function addLink(p,from,to,kind){
  const why=linkRefusal(p,from,to,kind);if(why)throw Error(why);
  p.relationships.push({id:'REL-'+String(++p.counters.relationship).padStart(3,'0'),from,to,kind});
}
// What an import kept on a requirement (round 12, D-09), as one line of the register; empty for a record typed here.
const IMPORTED=[['externalId','External ID'],['domain','Domain'],['capability','Capability theme'],['module','Module'],['userGroup','User group']],ASSERTED=[['delivery','Delivery'],['priorityBand','Source priority band'],['sourceAuthority','Source authority'],['sourceReference','Source reference']];
const importedLine=(a,groups)=>a.provenance||a.assessment?[...IMPORTED.map(([k,l])=>a[k]?l+': '+a[k]:''),...ASSERTED.map(([k,l])=>a.assessment?.[k]?l+': '+a.assessment[k]:''),groups?.length?'Groups: '+groups.join(', '):''].filter(Boolean).join(' · ').replace(/\r?\n/g,' '):'';
// What a record of each type holds beyond the common fields, one line each, for the register.
const typeLines=(p,a)=>[...(a.category?[['Category',USER_CATEGORIES.find(([k])=>k===a.category)?.[1]||a.category]]:[]),...(TYPE_TEXT[a.type]||[]).filter(([k])=>a[k]).map(([k,l])=>[l,a[k]]),...(a.type==='rule'?RULE_LINKS.filter(([k])=>a[k]).map(([k,l])=>[l,a[k]]):[]),...(a.type==='rule'&&a.requirementIds?.length?[['Requirements',a.requirementIds.join(', ')]]:[]),...(a.requirementGroupIds?.length?[['Requirement groups',a.requirementGroupIds.join(', ')]]:[])].map(([l,v])=>`${l}: ${String(v).replace(/\r?\n/g,' ')}\n\n`).join('');
const applicabilityLine=(project,type)=>{if(!notApplicable(project,type))return '';const d=project.contextApplicability[type];return `Not applicable to this project (user-reviewed decision).\n\nReason: ${d.reason}\n\nOwner: ${d.owner}\n\nSource: ${d.source}\n\nRecorded: ${d.at||'Date not recorded'}\n\n`;};
export function exportMarkdown(project){
  const fs=findings(project),safe=s=>String(s).replace(/\r?\n/g,' ').replace(/\|/g,'\\|'),index=groupIndex(project);
  return `# AIW V5 · ${project.name}\n\nChapter 1 — Requirements\n\nContent revision: ${project.contentVersion}. Confirmation records the user's review; it is not governance approval.\n\n## Project brief\n\n${project.brief.problem}\n\nIntended outcome: ${project.brief.goal}\n\nSource: ${project.brief.source}\n\nStatus: ${project.brief.confirmed?'User-confirmed':/^Illustrative\b/.test(project.brief.source||'')?'Illustrative / unconfirmed':'Unconfirmed'}\n\n`+groupsMarkdown(project)+TYPES.map(t=>`## ${t.plural}\n\n${applicabilityLine(project,t.id)}`+project.artefacts.filter(a=>a.type===t.id).map(a=>{const line=importedLine(a,index.of.get(a.id));return `### ${a.id} · ${a.title}\n\n${a.description&&a.description!==a.title?a.description+'\n\n':''}${line?line+'\n\n':''}${typeLines(project,a)}Owner: ${a.owner||'Missing'} · Priority: ${a.priority||'not stated'}${priorityBasisOf(a)?' ('+priorityBasisOf(a)+')':''}\n\nSource: ${a.source||'Missing'}\n\nOrigin: ${a.origin} · Status: ${a.confirmed?'User-confirmed':'Unconfirmed'}\n\n${a.type==='requirement'?`Acceptance criteria: ${a.acceptance||'Missing'}\n\n`:''}`;}).join('')).join('')+`## Relationships\n\n| ID | From | Relationship | To |\n| --- | --- | --- | --- |\n${project.relationships.map(r=>`| ${r.id} | ${r.from} | ${safe(r.kind)} | ${r.to} |`).join('\n')}\n\n## Open findings\n\n${fs.length?fs.map(f=>`- ${f.artefactId}: ${f.title}. ${f.detail}`).join('\n'):'No findings from the current rules.'}\n\n## Chapter 2 handoff\n\n${project.handoff?.contentVersion===project.contentVersion?'Current requirements are available to Chapter 2 using the same stable IDs.':'The current revision has not been handed off.'}\n\nContextual suggestions are rule-based proposals. Live-generation status is shown in Sol.\n`;
}
