import {applyCommand} from './requirements-domain.js';
import {applyQualityCommand,targetIsMeasurable} from './quality-domain.js';
import {applyDecisionCommand,withDecisions} from './decisions-domain.js';

const clone=v=>structuredClone(v),text=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'',pad=n=>String(n).padStart(3,'0');
export const EVIDENCE_STATUSES=['Unconfirmed','Illustrative reference','Confirmed'];
export const evidenceState=p=>p.coauthoring||{schemaVersion:1,counters:{source:0,task:0},sources:[],tasks:[]};
export function withEvidence(p){p.coauthoring=evidenceState(p);return p;}
export const sourceVersion=(p,id,revision)=>evidenceState(p).sources.find(s=>s.id===id)?.versions.find(v=>v.revision===revision);
export const currentSource=(p,id)=>evidenceState(p).sources.find(s=>s.id===id)?.versions.at(-1);
export const sourceCurrent=(p,t)=>currentSource(p,t.sourceId)?.revision===(t.sourceReview?.revision||t.sourceRevision);
export const taskById=(p,id)=>evidenceState(p).tasks.find(t=>t.id===id);
const normal=v=>text(v).toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const recordFields={requirement:['title','description','acceptance','owner','priority'],driver:['title','category','stimulus','conditions','response','metric','operator','targetValue','unit','window','measurement','priority','rationale'],decision:['question','context','assumptions','risks']};
export function cleanProposal(raw){const result={};for(const [kind,fields]of Object.entries(recordFields)){result[kind]={};for(const key of fields)result[kind][key]=text(raw?.[kind]?.[key],['title','question'].includes(key)?160:['owner','metric','unit'].includes(key)?180:4000);}result.outcomeId=text(raw?.outcomeId,60);return result;}
export const PATTERNS={
 duplicate:[
  {id:'durable-guard',title:'Durable duplicate protection',requires:'A stable operation reference and an atomic boundary for recording the result.',benefit:'Can preserve a single business effect across retries and restarts.',cost:'Requires concurrency control, retention rules, and tests at failure boundaries.',avoid:'Treating a cache hit as proof of a durable guarantee.'},
  {id:'temporary-guard',title:'Temporary request suppression',requires:'A defined time window and tolerance for repeats after expiry or restart.',benefit:'Reduces repeated work close to the caller.',cost:'On its own, cannot guarantee a single durable business effect.',avoid:'Using short-lived suppression as the only integrity control.'}
 ],
 uncertain:[
  {id:'enquire-first',title:'Enquire before replay',requires:'An authoritative status enquiry or a reconciliation process for the original reference.',benefit:'Keeps uncertainty visible while establishing the external result.',cost:'Needs investigation ownership and an explicit pending state.',avoid:'Reporting failure solely because a response timed out.'},
  {id:'retry-contract',title:'Retry under an explicit contract',requires:'Evidence that repeated calls with the same reference cannot repeat the business effect.',benefit:'Can recover a lost response without creating a second operation.',cost:'Depends on the contract, retention window, and verified failure behaviour.',avoid:'Retrying with a fresh reference while the prior outcome is unknown.'}
 ],
 custom:[
  {id:'immediate',title:'Immediate response',requires:'Dependencies can respond within the agreed operating conditions.',benefit:'Gives the actor a result in the same interaction.',cost:'Dependency latency and failures affect the caller directly.',avoid:'Promising a result before the underlying operation is known.'},
  {id:'deferred',title:'Deferred completion',requires:'A durable work record, an observable status, and a recovery owner.',benefit:'Separates acceptance of work from its eventual completion.',cost:'Introduces pending states, correlation, and recovery obligations.',avoid:'Acknowledging work before it can survive a restart.'}
 ]
};
export function draftProposal(p,t){
 const s=sourceVersion(p,t.sourceId,t.sourceRevision),a=t.answers,duplicate=t.intent==='duplicate',uncertain=t.intent==='uncertain';
 const title=a.title||(duplicate?'Preserve one effect across repeated instructions':uncertain?'Keep an uncertain outcome visible':s.title);
 return cleanProposal({outcomeId:a.outcomeId,requirement:{title,description:a.need,acceptance:a.acceptance,owner:a.owner,priority:'Must'},driver:{title:duplicate?'Integrity under concurrent repeats':uncertain?'Recovery of an unknown outcome':'Quality expectation for '+title,category:duplicate?'integrity':uncertain?'recoverability':'availability',stimulus:duplicate?'The same instruction arrives again.':uncertain?'The operation response is not received.':'',conditions:duplicate?'Concurrent attempts and a process restart.':uncertain?'The external result cannot yet be established.':'',response:a.acceptance,metric:duplicate?'Unintended repeated effects':uncertain?'Time to establish the authoritative outcome':'',operator:'At most',targetValue:'',unit:'',window:'',measurement:'',priority:'Important',rationale:'Proposed priority; review with the accountable owner.'},decision:{question:duplicate?'Where should duplicate protection be enforced?':uncertain?'How should the service establish an uncertain outcome?':'How should we satisfy '+title+'?',context:a.need,assumptions:a.unknowns||'Confirm operating conditions, measurement, and the relevant external guarantees.',risks:''}});
}
export function proposalFindings(p,t){
 const q=t.proposal,items=[];if(!q)return [{level:'error',title:'Prepare the coordinated proposal first.'}];
 const add=(level,title)=>items.push({level,title});
 if(!sourceCurrent(p,t))add('error','The source has a newer revision. Review it before applying.');
 if(!q.requirement.title||!q.requirement.description||!q.requirement.acceptance||!q.requirement.owner)add('error','The requirement needs a title, behaviour, acceptance criteria, and owner.');
 if(!q.driver.title||!q.driver.stimulus||!q.driver.conditions||!q.driver.response)add('error','Describe the quality scenario: stimulus, conditions, and response.');
 if(!q.decision.question||!q.decision.context)add('error','Frame the decision question and its context.');
 if(q.outcomeId&&!p.artefacts.some(r=>r.id===q.outcomeId&&r.type==='outcome'))add('error','The selected outcome no longer exists.');
 for(const [kind,rows,key]of [['requirement',p.artefacts.filter(a=>a.type==='requirement'),'title'],['driver',p.quality.drivers,'title'],['decision',p.decisions.records,'question']])if(rows.some(r=>normal(r[key])===normal(q[kind][key])))add('error','A '+kind+' with this title already exists. Revise the proposal or use the existing record.');
 if(!targetIsMeasurable(q.driver))add('warning','The numerical target is incomplete. The scenario will remain an unconfirmed draft.');
 else add('warning','The proposed numerical target remains an assumption until confirmed in Chapter 2.');
 if(!q.outcomeId)add('warning','No business outcome linked yet.');
 const s=sourceVersion(p,t.sourceId,t.sourceRevision);if(s?.status!=='Confirmed')add('warning','The cited source is '+(s?.status||'missing').toLowerCase()+'.');
 add('warning','The decision starts as a draft question. Compare alternatives and record a rationale in Chapter 3.');return items;
}
export function taskNext(p,t){if(!t)return 'Choose a source and start a guided task.';if(t.status==='dismissed')return 'This proposal was dismissed. Its reason remains in the trail.';if(t.status==='withdrawn')return 'The untouched bundle was withdrawn. Its original proposal remains in the trail.';if(!sourceCurrent(p,t))return t.status==='applied'?'Review the revised source against the three linked records.':'Review the new source revision; saved edits will be retained.';if(t.status==='applied')return 'Continue the quality measurement and compare alternatives in Chapter 3.';if(!t.answers.need)return 'What must the system do, and for whom?';if(!t.answers.acceptance)return 'What observable result would demonstrate that the need is met?';if(!t.answers.owner)return 'Who is accountable for reviewing this requirement?';if(!t.proposal)return 'Prepare three linked drafts from your answers.';return proposalFindings(p,t).find(f=>f.level==='error')?.title||'Review the three drafts and their open assumptions before applying.';}
export function evidenceForRecord(p,id){return evidenceState(p).tasks.filter(t=>t.status==='applied'&&Object.values(t.applied.ids).includes(id));}
export function evidenceFindings(p){return evidenceState(p).tasks.filter(t=>t.status==='applied').flatMap(t=>{const id=t.applied.ids.requirement,items=[];if(!sourceCurrent(p,t))items.push({id:'source:'+t.id,chapter:1,chapterTitle:'Requirements',objectId:id,level:'error',title:'Review revised source evidence',detail:t.sourceId+' changed after '+t.id+' was applied. Review the linked requirement, scenario, and decision.'});for(const [kind,rid]of Object.entries(t.applied.ids)){const exists=kind==='requirement'?p.artefacts.some(a=>a.id===rid):kind==='driver'?p.quality.drivers.some(a=>a.id===rid):p.decisions.records.some(a=>a.id===rid);if(!exists)items.push({id:'link:'+t.id+':'+rid,chapter:1,chapterTitle:'Requirements',objectId:id,level:'error',title:'An evidence-linked record is missing',detail:t.id+' references '+rid+'. Review the remaining records and restore the missing trace.'});}return items;});}
export function evidenceDesignSource(p){const m=evidenceState(p);return {sources:m.sources,tasks:m.tasks.filter(t=>['applied','withdrawn'].includes(t.status))};}
function history(t,event,at,notes=''){t.history.push({at,event,notes});}
function requireTask(m,id){const t=m.tasks.find(t=>t.id===id);if(!t)throw Error('Choose a saved Sol task.');return t;}
function editable(t){if(['applied','dismissed','withdrawn'].includes(t.status))throw Error('This task has a recorded outcome. Edit applied records in their chapters, or start another task.');}
export function bundleCanWithdraw(p,t){
 if(t?.status!=='applied')return false;
 const {ids,snapshots}=t.applied,records={requirement:p.artefacts.find(r=>r.id===ids.requirement),driver:p.quality.drivers.find(r=>r.id===ids.driver),decision:p.decisions.records.find(r=>r.id===ids.decision)};
 if(Object.keys(ids).some(k=>JSON.stringify(records[k])!==JSON.stringify(snapshots[k])))return false;
 const rest=clone(p);delete rest.coauthoring;if(rest.finalReview)delete rest.finalReview.baselines;delete rest.changes;delete rest.workspace;
 rest.artefacts=rest.artefacts.filter(r=>r.id!==ids.requirement);rest.quality.drivers=rest.quality.drivers.filter(r=>r.id!==ids.driver);rest.decisions.records=rest.decisions.records.filter(r=>r.id!==ids.decision);
 rest.relationships=rest.relationships.filter(r=>t.applied.relationshipIds.includes(r.id)?false:true);
 const matches=v=>typeof v==='string'?Object.values(ids).includes(v):Array.isArray(v)?v.some(matches):v&&typeof v==='object'?Object.entries(v).some(([k,x])=>Object.values(ids).includes(k)||matches(x)):false;
 return !matches(rest);
}
export function applyEvidenceCommand(input,command,at=new Date().toISOString()){
 let p=withEvidence(withDecisions(input)),m=p.coauthoring;const raw=command.payload||{};let selected=null;
 if(command.type==='evidence.source'){
  let s=raw.id?m.sources.find(s=>s.id===raw.id):null;if(raw.id&&!s)throw Error('This source no longer exists.');
  if(!text(raw.title,180)||!text(raw.excerpt,8000)||!text(raw.location,600))throw Error('Name the source, identify its location, and paste the relevant excerpt.');
  if(!EVIDENCE_STATUSES.includes(raw.status))throw Error('Choose a source status.');
  if(raw.status==='Confirmed'&&(!text(raw.confirmedBy,180)||raw.reviewed!==true))throw Error('Name the reviewer and confirm that this source was reviewed.');
  if(s&&s.versions.length>=20)throw Error('This prototype supports 20 revisions per source. Add a separately named source to continue.');
  if(!s){if(m.sources.length>=30)throw Error('This prototype supports 30 evidence sources.');s={id:'SRC-'+pad(++m.counters.source),versions:[]};m.sources.push(s);}
  s.versions.push({revision:s.versions.length+1,title:text(raw.title,180),location:text(raw.location,600),version:text(raw.version,120),date:text(raw.date,40),excerpt:text(raw.excerpt,8000),status:raw.status,confirmedBy:raw.status==='Confirmed'?text(raw.confirmedBy,180):'',at});selected=s.id;
 }else if(command.type==='evidence.task'){
  if(m.tasks.length>=40)throw Error('This prototype supports 40 guided tasks per project.');const s=currentSource(p,raw.sourceId);if(!s)throw Error('Save and choose a source first.');const intent=['duplicate','uncertain','custom'].includes(raw.intent)?raw.intent:'custom';
  if((!!p.workspace?.template&&p.workspace.template!=='bank-payment')&&intent!=='custom')throw Error('Use the project-specific task for a blank project.');
  const t={id:'SOL-'+pad(++m.counters.task),sourceId:raw.sourceId,sourceRevision:s.revision,intent,title:text(raw.title,160)||s.title,status:'gathering',answers:{},proposal:null,versions:[],history:[],patterns:[],createdAt:at};history(t,'Task started',at);m.tasks.push(t);selected=t.id;
 }else {
  const t=requireTask(m,raw.id);selected=t.id;
  if(command.type==='evidence.answers'){editable(t);for(const key of ['title','need','acceptance','owner','unknowns','outcomeId'])t.answers[key]=text(raw[key],key==='owner'?180:key==='title'?160:4000);if(t.proposal){t.versions.push({at,proposal:clone(t.proposal),reason:'Answers revised'});t.proposal=null;t.status='gathering';}history(t,'Answers saved',at);}
  else if(command.type==='evidence.prepare'){editable(t);if(!sourceCurrent(p,t))throw Error('Review the revised source before preparing a proposal.');if(t.proposal)throw Error('A proposal already exists. Edit its saved drafts.');t.proposal=draftProposal(p,t);t.status='proposed';history(t,'Coordinated proposal prepared',at);}
  else if(command.type==='evidence.proposal'){editable(t);if(!t.proposal)throw Error('Prepare the proposal first.');t.versions.push({at,proposal:clone(t.proposal),reason:'Proposal edited'});t.proposal=cleanProposal(raw.proposal);history(t,'Proposal edited',at);}
  else if(command.type==='evidence.pattern'){if(!PATTERNS[t.intent].some(x=>x.id===raw.patternId)||!['Consider','Reject'].includes(raw.outcome)||!text(raw.reason))throw Error('Choose a pattern, a consideration outcome, and record your reason.');t.patterns.push({at,patternId:raw.patternId,outcome:raw.outcome,reason:text(raw.reason)});history(t,'Mind Factory: '+raw.outcome,at,text(raw.reason));}
  else if(command.type==='evidence.refresh'){editable(t);if(!text(raw.reason)||raw.reviewed!==true)throw Error('Review the old and current source and explain the effect on this proposal.');t.sourceRevision=currentSource(p,t.sourceId).revision;t.sourceReview=null;history(t,'Source revision reviewed for proposal',at,text(raw.reason));}
  else if(command.type==='evidence.reconcile'){if(t.status!=='applied'||!text(raw.reason)||!text(raw.reviewer)||raw.reviewed!==true)throw Error('Review all three linked records, then record the reviewer and your conclusion.');t.sourceReview={at,revision:currentSource(p,t.sourceId).revision,reviewer:text(raw.reviewer,180),reason:text(raw.reason)};history(t,'Changed source reviewed against linked records',at,text(raw.reason));}
  else if(command.type==='evidence.dismiss'){editable(t);if(!text(raw.reason))throw Error('Record why this proposal is being dismissed.');t.status='dismissed';history(t,'Proposal dismissed',at,text(raw.reason));}
  else if(command.type==='evidence.apply'){
   editable(t);if(raw.reviewed!==true||!text(raw.reviewer)||!text(raw.reason))throw Error('Record the reviewer, rationale, and explicit review of all three drafts.');const findings=proposalFindings(p,t);if(findings.some(f=>f.level==='error'))throw Error(findings.find(f=>f.level==='error').title);
   const q=clone(t.proposal),source=t.sourceId+' / revision '+t.sourceRevision+' · '+sourceVersion(p,t.sourceId,t.sourceRevision).title,priorLinks=p.relationships.map(r=>r.id);
   let result=applyCommand(p,{type:'artefact',payload:{...q.requirement,type:'requirement',origin:'suggestion',confirmed:false,source,links:q.outcomeId?[['new','delivers',q.outcomeId]]:[]}},at);p=result.document;const requirement=result.selected;
   result=applyQualityCommand(p,{type:'quality.driver',payload:{...q.driver,owner:q.requirement.owner,origin:'suggestion',confirmed:false,targetConfirmed:false,source,requirementIds:[requirement],responsibilityIds:[]}},at);p=result.document;const driver=result.selected;
   result=applyDecisionCommand(p,{type:'decision.save',payload:{...q.decision,owner:q.requirement.owner,source,requirementIds:[requirement],driverIds:[driver],topic:t.intent==='duplicate'?'duplicates':t.intent==='uncertain'?'recovery':'custom',assumptionsResolved:false}},at);p=result.document;const decision=result.selected;
   const saved=p.coauthoring.tasks.find(x=>x.id===t.id);saved.status='applied';saved.applied={at,reviewer:text(raw.reviewer,180),reason:text(raw.reason),sourceRevision:t.sourceRevision,ids:{requirement,driver,decision},snapshots:{requirement:clone(p.artefacts.find(r=>r.id===requirement)),driver:clone(p.quality.drivers.find(r=>r.id===driver)),decision:clone(p.decisions.records.find(r=>r.id===decision))},relationshipIds:p.relationships.filter(r=>!priorLinks.includes(r.id)).map(r=>r.id)};history(saved,'Applied three linked drafts',at,text(raw.reason));
  }else if(command.type==='evidence.withdraw'){
   if(raw.reviewed!==true||!text(raw.reason)||!bundleCanWithdraw(p,t))throw Error('Only an unchanged bundle with no subsequent model dependencies can be withdrawn. Record a reason and confirm the withdrawal.');
   const {ids}=t.applied;p=applyQualityCommand(p,{type:'quality.delete',payload:{id:ids.driver}},at).document;p=applyCommand(p,{type:'deleteArtefact',payload:{id:ids.requirement}},at).document;p.decisions.records=p.decisions.records.filter(d=>d.id!==ids.decision);p.decisions.version++;p.decisions.review=null;p.decisions.handoff=null;const saved=p.coauthoring.tasks.find(x=>x.id===t.id);saved.status='withdrawn';history(saved,'Untouched bundle withdrawn',at,text(raw.reason));
  }else throw Error('Unknown evidence action.');
 }
 return {document:p,selected};
}
export function evidenceMarkdown(p){const m=evidenceState(p);if(!m.sources.length)return '';return '## Project evidence and co-authoring trail\n\nSources are user-supplied excerpts and references. No document extraction or independent source verification is implied. Proposals use explicit project rules; no external LLM is connected.\n\n'+m.sources.map(s=>{const v=s.versions.at(-1);return '### '+s.id+' · '+v.title+'\n\nRevision '+v.revision+' · '+v.status+' · Source version: '+(v.version||'Unspecified')+' · Date: '+(v.date||'Unspecified')+'\n\nLocation: '+v.location+'\n\nReviewer: '+(v.confirmedBy||'Not confirmed')+'\n\nExcerpt:\n\n'+v.excerpt+'\n\n';}).join('')+m.tasks.filter(t=>['applied','withdrawn'].includes(t.status)).map(t=>'### '+t.id+' · '+t.title+'\n\nOutcome: '+t.status+' · Cited '+t.sourceId+' revision '+t.sourceRevision+' · '+(sourceCurrent(p,t)?'Source review current':'Source changed; review required')+'\n\nCreated records: '+Object.values(t.applied.ids).join(' → ')+'\n\nReviewer: '+t.applied.reviewer+'\n\nApplication rationale: '+t.applied.reason+'\n\nCited excerpt at application:\n\n'+sourceVersion(p,t.sourceId,t.applied.sourceRevision).excerpt+'\n\nOpen assumptions at application: '+t.proposal.decision.assumptions+'\n\nMind Factory considerations:\n\n'+(t.patterns.map(r=>'- '+r.patternId+' · '+r.outcome+': '+r.reason).join('\n')||'None recorded.')+'\n\nReview history:\n\n'+t.history.map(h=>'- '+h.at+' · '+h.event+(h.notes?': '+h.notes:'')).join('\n')+'\n\n').join('');}
