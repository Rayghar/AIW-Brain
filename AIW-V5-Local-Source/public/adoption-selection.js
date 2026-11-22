// Component selection as a recorded decision (rc44, wp2 slice S5; audit/rc44/design/wp2-adoption.md §b.2, §c.2, §e.1
// row 9). A selection is a Chapter 3 decision: these steps write the decision's own fields through the chapter's own
// handler (decisions-domain.js applyDecisionCommand) and keep the selection's basis beside it, created when first
// written: decision.selection {kind, responsibilityIds | requirementId, driverId, concern, reviewTrigger, prepared,
// started, judgements, choice, instantiated, actor, at, account} and, on each alternative it compares,
// alternative.candidate {kind, ref, by?, outcome?} (no facts are stored: they are read from the released claim on each
// read, ruling Q6). Candidates are kept in the order they were added; no field
// holds a score, a rank or a weight, and the decision's weighing (decision-reading.js readDecision) reads none.
//   selection.start       {kind: 'component', responsibilityIds, owner, question?, reviewTrigger?}
//                         {kind: 'option', concernId, requirementId, driverId, owner, reason}   any author; a draft by
//                         Sol's is a proposal (prepared 'sol-draft'), an agent account's is marked (prepared 'agent').
//                         No typed reading of a hard constraint is stated (ruling Q3: until the hard gates exist, a
//                         person judges each row): `predicates` is refused, whoever sends it. The start's author is kept
//                         in `started` {actor, at, account, kind}, which later steps do not overwrite.
//   selection.candidate   {id, candidate: {kind, ref}, title?, summary?, notes?}   any author; Sol's is marked by Sol.
//                         profile: a released, eligible component profile (knowledge scope, pinned to its release and
//                         claim hash); library / archetype: what the reviewed candidate path accepts
//                         (component-library.js proposalSource); existing: a component of the project; build / buy;
//                         option: a released option of the selection's concern. Candidate knowledge can be read, not
//                         selected.
//   selection.judge       {id, alternativeId, constraintId, state, evidence, reason}   a signed-in person's, for a row
//                         that reads unknown; the judgement keeps its actor and account kind. After the choice, only a
//                         row of the chosen candidate, by a person other than the chooser (ruling Q4): the choice's
//                         rows follow, and the confirm and the decision's acceptance lapse.
//   selection.choose      {id, alternativeId, reason, rejections: {alternativeId: reason}, unproven?}   a signed-in
//                         person's; a candidate that fails a hard constraint is not chosen, each row that reads
//                         unknown is named unproven and written into the decision's assumptions (approval evidence is
//                         then refused while it is open: decision.governance's existing rule).
//   selection.confirm     {id, note?}   a second signed-in person's (ruling Q4): stated `second` on the command, its
//                         projection (confirmSubject) names the chooser, who named each unproven row, and every judge
//                         of the chosen candidate's rows, so the one rule refuses each of them. Kept as
//                         selection.confirm {actor, at, account, basis, note}; it stands while what it covers (the
//                         choice, the chosen candidate's rows, the rows named unproven, the hard constraints) is as it
//                         was, and decision.accept of a selection is refused without it (selectionFindings).
//   selection.instantiate {id, reviewed: true, component}   a signed-in person's, once the decision is accepted as it
//                         stands: the chosen profile, library entry or archetype is saved through realisation.candidate
//                         with its pinned reference and the decision; a profile is applied as an adoption of kind
//                         profile with its obligations open, which a second person accepts (adoption.accept).
// Eligibility is read, never stored: each hard constraint that reaches the decision (a constraint driver whose
// force is hard: decision-reading.js constraintForce) is one row per candidate: pass or fail where a signed-in person
// judged it, with evidence and a reason, and unknown until then (design f.2: no typed hard gate exists before wp9b, so
// no row is evaluated). Unknown is never neutral. The facts a candidate states (released knowledge only, and only while
// it is current) are shown beside its rows for the person who judges them. Knowledge is read through the existing rule
// only (knowledge-governance.js releasedClaims, claimReceiptCurrent): a candidate or unreleased claim reaches no row,
// gate or reading.
import {applyDecisionCommand,decisionCurrent,SELECTION_STEP} from './decisions-domain.js';
import {applyRealisationCommand} from './realisation-domain.js';
import {constraintForce} from './decision-reading.js';
import {driverKind} from './quality-domain.js';
import {driverScope,driverScopeIndex} from './driver-scope.js';
import {releasedClaims,claimReceipt,claimReceiptCurrent,knowledgeState} from './knowledge-governance.js';
import {releasedDesignConcern} from './domain-knowledge.js';
import {knowledgeConcern,architectureOptions,criterionDrivers} from './architecture-knowledge.js';
import {designBasis} from './design-basis.js';
import {cleanLibraryRef,proposalSource,COMPONENT_ARCHETYPES} from './component-library.js';
import {adoptionRecords,ADOPTION_LIMITS} from './adoption-domain.js';
import {COLLECTIONS} from './record-lifecycle.js';
import {digest} from './brain-integrity.js';
import {verifierRefusal} from './architecture-obligations.js';

const list=v=>Array.isArray(v)?v:[],plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v),copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v)),uniq=xs=>[...new Set(xs)];
const REVIEWED=['title','kind','purpose','boundary','owner','inputs','outputs','rationale','assumptions','technologyNeeds'];
export const SELECTION_LIMITS=Object.freeze({text:2000,responsibilities:12});
const KINDS={component:['profile','library','archetype','existing','build','buy'],option:['option']};
const words=(v,what,max=SELECTION_LIMITS.text)=>{if(typeof v!=='string'||!v.trim())throw Error(what);if(v.length>max)throw Error('Use at most '+max+' characters ('+v.length+' were sent); nothing is cut.');return v.trim();};
const optional=(v,max=SELECTION_LIMITS.text)=>v===undefined||v===null||v===''?'':words(v,'',max);
const decisionOf=(p,id)=>list(p?.decisions?.records).find(d=>d?.id===id)||null;
const need=(p,id)=>{const d=decisionOf(p,id);if(!d||!plain(d.selection))throw Error('Choose a selection.');return d;};
// The decision's own fields, through the chapter's own handler, as an inner step of the selection (ruling Q2): the one
// way its choice, candidates, rejection reasons and effect on a hard constraint are written.
const decide=(p,type,payload,at)=>applyDecisionCommand(p,{type,payload,[SELECTION_STEP]:true},at).document;

// ---------------------------------------------------------------- component profiles in the project's knowledge
// A component profile is a claim on the subject component-profile:<id> that carries a structured architecture unit
// (architecture-knowledge-unit.js); its typed facts are what the unit's scope states. A claim that carries a concept
// form is the concept readers' alone (ruling B1 of 2026-11-18) and is no profile here.
const isProfile=c=>!!c&&!c.form&&String(c.subjectId).startsWith('component-profile:')&&plain(c.architectureUnit);
const titleOf=c=>(list(c.tags).find(t=>typeof t==='string'&&t.startsWith('title:'))||'').slice(6).trim()||String(c.subjectId).slice(18);
const factsOf=c=>Object.fromEntries(Object.entries(plain(c.architectureUnit?.scope)?c.architectureUnit.scope:{}).map(([k,v])=>[k,{value:v,status:'declared',source:{kind:'knowledge',claimId:c.id,field:'scope.'+k}}]));
const releasedProfile=(p,ref)=>releasedClaims(p).find(h=>h.release.id===ref?.releaseId&&h.claim.id===ref?.claimId&&isProfile(h.claim))||null;
// The profiles the chooser reads: each released one with whether it may be selected, and each the project holds that no
// active release holds, labelled, with nothing of its content handed over (it can be read, not selected).
export function selectableProfiles(p){
 const s=knowledgeState(p),where=c=>{const src=list(s.sources).find(x=>x.id===c.sourceId);return {file:src?.path||src?.sourceFile?.file||null,lineStart:c.lineStart,lineEnd:c.lineEnd};},out=[];
 for(const h of releasedClaims(p))if(isProfile(h.claim))out.push({claimId:h.claim.id,releaseId:h.release.id,title:titleOf(h.claim),selectable:!!h.eligible,label:h.eligible?'Released · '+h.release.title:'Not usable: '+list(h.reasons).join(' '),source:where(h.claim),facts:h.eligible?factsOf(h.claim):null});
 for(const c of list(s.claims))if(isProfile(c)&&!out.some(x=>x.claimId===c.id))out.push({claimId:c.id,releaseId:null,title:titleOf(c),selectable:false,label:(c.review?.decision==='verified'?'Reviewed · not in an active release':'Candidate · not reviewed')+' · can be read, not selected',source:where(c),facts:null});
 return out;
}

// ---------------------------------------------------------------- the constraints and the eligibility of a candidate
// The hard constraints of a selection: the constraint drivers the decision names whose force is hard, in the
// decision's order. Read from the drivers as they stand; none carries a typed reading (ruling Q3).
export function selectionConstraints(p,d){
 const s=d?.selection;if(!plain(s))return [];
 return list(d.driverIds).map(id=>list(p?.quality?.drivers).find(x=>x.id===id)).filter(x=>x&&driverKind(x)==='constraint'&&constraintForce(p,x).hard).map(x=>({id:x.id,source:'driver',driverId:x.id,label:x.title,hard:true}));
}
// Whether what a candidate rests on still stands in this project, read on each read (ruling Q6): the released claim
// of a profile and of a concern's option; the library entry (still in the project's library, not deprecated, at the
// revision it was added at) or the organisation entry (still installed, same content); the archetype (one of the
// catalogue's, not withdrawn); the existing component (still in the model). Answers the reason it does not, or ''.
function standingOf(p,d,c){
 const r=c?.ref||{};
 if(c?.kind==='profile')return claimReceiptCurrent(p,r)&&releasedProfile(p,r)?.eligible?'':'The released knowledge '+(r.claimId||'')+' is no longer current in this project: it states no fact here, and the candidate is not selected from it.';
 if(c?.kind==='option')return d.selection.concern&&claimReceiptCurrent(p,d.selection.concern.receipt)?'':'The released knowledge of the concern is no longer current in this project: its options are not selected from it.';
 if(c?.kind==='library'||c?.kind==='archetype'){
  if(c.kind==='archetype'&&!COMPONENT_ARCHETYPES.some(x=>x.id===r.archetypeId))return 'The archetype '+String(r.archetypeId||'').slice(0,60)+' is not one of the catalogue\'s: it is not selected.';
  try{const e=proposalSource(p,r);if(e&&!e.organization&&r.revision!=null&&e.revision!==r.revision)return 'The library entry '+r.entryId+' changed since it was compared (revision '+r.revision+', now '+e.revision+'): compare it again.';}catch(x){return (c.kind==='archetype'?'The archetype':'The library entry')+' no longer stands in this project: '+x.message;}
  return '';
 }
 if(c?.kind==='existing')return list(p?.realisation?.components).some(x=>x.id===r.componentId)?'':'The component '+String(r.componentId||'').slice(0,60)+' is no longer in the model: it is not selected.';
 return '';
}
const current=(p,d,c)=>!standingOf(p,d,c);
// What a candidate states: a released profile's facts, read from its released claim on each read while it stands; any
// other candidate states none (ruling Q6). A stored copy is never read.
const factsFor=(p,d,c)=>c?.kind==='profile'&&current(p,d,c)?factsOf(releasedProfile(p,c.ref).claim):{};
// A candidate's rows against the hard constraints: a signed-in person's judgement of the row, or unknown. A candidate
// whose basis no longer stands here (its released knowledge, its library entry, its archetype, its component) reads
// unknown on every row, whatever was judged of it, and says why.
export function candidateEligibility(p,d,a){
 const c=a?.candidate,constraints=selectionConstraints(p,d),why=c?standingOf(p,d,c):'Choose a candidate of the selection.',standing=!why;
 const reasons=why?[why]:[];
 const judged=list(d?.selection?.judgements).filter(j=>j?.alternativeId===a?.id&&j.actor&&j.account==='person'&&['pass','fail'].includes(j.state));
 const rows=constraints.map(k=>{
  const j=standing&&judged.findLast(x=>x.constraintId===k.id);
  return j?{constraintId:k.id,state:j.state,basis:'person',evidence:j.evidence,reason:j.reason,by:j.actor,at:j.at}:{constraintId:k.id,state:'unknown'};
 });
 return {state:rows.some(r=>r.state==='fail')?'ineligible':rows.some(r=>r.state==='unknown')?'unproven':'eligible',rows,reasons};
}
// The reading of a selection: what it selects for, its constraints, its candidates in the order they were added with
// their rows and outcome, the choice and what was instantiated. Null for a decision that is no selection.
export function selectionReading(p,d){
 const s=d?.selection;if(!plain(s))return null;
 return {id:d.id,kind:s.kind,prepared:s.prepared,started:s.started?{by:s.started.actor,at:s.started.at,account:s.started.account}:null,responsibilityIds:copy(list(s.responsibilityIds)),concern:s.concern?{id:s.concern.id,title:s.concern.title}:null,constraints:selectionConstraints(p,d),
  candidates:list(d.alternatives).filter(a=>a?.candidate).map(a=>({alternativeId:a.id,title:a.title,kind:a.candidate.kind,ref:copy(a.candidate.ref),facts:factsFor(p,d,a.candidate),eligibility:candidateEligibility(p,d,a),outcome:a.candidate.outcome||'open',rejection:a.rejectionReason||'',...(a.candidate.by?{by:a.candidate.by}:{})})),
  choice:s.choice?{alternativeId:s.choice.alternativeId,unproven:copy(list(s.choice.unproven)),by:s.choice.actor,at:s.choice.at}:null,instantiated:s.instantiated?{componentId:s.instantiated.componentId,adoptionId:s.instantiated.adoptionId||null,by:s.instantiated.actor,at:s.instantiated.at}:null,
  considered:['the hard constraints that reach the decision','a signed-in person\'s judgement of each row, with its evidence and reason','the facts released knowledge states of each candidate, shown to the person who judges'],notConsidered:['quality effects','cost','measured behaviour','anything a candidate does not state']};
}

// ---------------------------------------------------------------- the rows in Chapter 3 (ruling Q2)
// In a selection decision the selection's row is the authority for a hard constraint, and Chapter 3 shows it: each
// candidate's effect on each hard constraint is its row, written through the chapter's own handler as an inner step
// (so the decision is revised and its history keeps it): a person's judgement as "supports" (pass) or "breaks it" (fail)
// with its reason and evidence, a row that reads unknown as "needs evidence". A hard constraint the decision does not yet
// name is added to its drivers first. The effect on every other driver stays as it was, marks included.
const effectOf=r=>r.state==='unknown'?{effect:'unknown',reason:'',evidence:''}:{effect:r.state==='pass'?'supports':'violates',reason:(r.state==='pass'?'Meets it':'Breaks it')+', as '+r.by+' judged: '+r.reason,evidence:r.evidence};
function rowsToChapter(p,id,at){
 const d=decisionOf(p,id),missing=selectionConstraints(p,d).map(k=>k.id).filter(k=>!list(d.driverIds).includes(k));
 if(missing.length)p=decide(p,'decision.save',{id,driverIds:[...list(d.driverIds),...missing]},at);
 for(const a of decisionOf(p,id).alternatives.filter(x=>x.candidate)){
  const next=Object.fromEntries(candidateEligibility(p,decisionOf(p,id),a).rows.map(r=>[r.constraintId,effectOf(r)]));
  if(Object.entries(next).every(([k,v])=>JSON.stringify(a.assessments?.[k])===JSON.stringify(v)))continue;
  p=decide(p,'decision.alternative',{id,alternativeId:a.id,assessments:next},at);
  const x=decisionOf(p,id).alternatives.find(y=>y.id===a.id);x.assessments=Object.fromEntries(Object.keys(x.assessments).map(k=>[k,k in next?x.assessments[k]:a.assessments?.[k]??x.assessments[k]]));
 }
 return p;
}
// ---------------------------------------------------------------- the second person (ruling Q4)
// Who stands behind the persons' words a confirm covers: the chooser (who also named each unproven row), and every judge
// of the chosen candidate's rows. The projection the boundary hands the one rule (verifierRefusal), and the rule reads at
// read time on the stored confirm (ruling D7.1).
export function confirmSubject(p,d){
 const s=d?.selection,c=s?.choice,a=c&&list(d.alternatives).find(x=>x.id===c.alternativeId),seen=new Set(),history=[];
 for(const actor of [c?.actor,...(a?candidateEligibility(p,d,a).rows.map(r=>r.by):[])])if(actor&&!seen.has(actor)){seen.add(actor);history.push({revision:1,actor});}
 return {id:d?.id,actor:c?.actor||null,owner:typeof d?.owner==='string'?d.owner:'',history};
}
export const confirmOf=(p,command)=>{const d=decisionOf(p,command?.payload?.id);return plain(d?.selection)&&d.selection.choice?confirmSubject(p,d):null;};
// What a confirm covers: the choice, the chosen candidate's rows as they read (state and judge), the rows named unproven
// and the hard constraints that reach the selection.
const basisOf=(p,d)=>{const s=d.selection,a=list(d.alternatives).find(x=>x.id===s.choice?.alternativeId);return digest({choice:s.choice?.alternativeId||null,rows:a?candidateEligibility(p,d,a).rows.map(r=>[r.constraintId,r.state,r.by||null,r.at||null]):[],unproven:list(s.choice?.unproven),constraints:selectionConstraints(p,d).map(k=>k.id)});};
// A step taken before the project was restored here or copied from a template is history from elsewhere.
const here=(p,at)=>{const from=[p?.finalReview?.imported?.at,p?.workspace?.templateOrigin?.at].filter(Boolean).sort().pop();return !(from&&!(at>from));};
// Whether a second person's confirm stands: a signed-in person's, taken here, of what the selection says now, and
// independent by the one rule on the projection as it reads now.
export function confirmStands(p,d){
 const c=d?.selection?.confirm;
 return plain(c)&&c.account==='person'&&!!c.actor&&here(p,c.at)&&!!d.selection.choice&&c.basis===basisOf(p,d)&&!verifierRefusal(confirmSubject(p,d),c.actor,c.account);
}

// The selection's findings on Chapter 3 (registered as the package's checks of chapter 3, so decision.accept and
// decision.governance read them): an error while Chapter 3's working choice is not the selection's, or names no
// candidate; and an error while a choice stands that no second person confirmed (ruling Q4).
export function selectionFindings(p){
 const out=[],add=(code,d,title,detail,extra={})=>out.push({id:code+':'+d.id,code,decisionId:d.id,title,detail,level:'error',...extra});
 for(const d of list(p?.decisions?.records)){
  const s=d?.selection;if(!plain(s)||d.status==='superseded')continue;
  const chosen=d.selectedAlternativeId?list(d.alternatives).find(a=>a.id===d.selectedAlternativeId):null;
  // the knowledge (or the library entry, archetype or component) the chosen candidate rests on no longer stands: the
  // finding the guided path got through its concern adoption (S1, adoption-definition-withdrawn), on the decision
  const ca=s.choice&&list(d.alternatives).find(a=>a.id===s.choice.alternativeId&&a.candidate),gone=ca&&standingOf(p,d,ca.candidate);
  if(gone)add('selection-withdrawn',d,'Review the knowledge the selection rests on',ca.title+': '+gone+' Choose again, or review it with the knowledge steward, before '+d.id+' is accepted or approved.',{alternativeId:ca.id});
  if(s.choice&&!confirmStands(p,d)){const who=confirmSubject(p,d).history.map(x=>x.actor);add('selection-confirm',d,'A second person confirms the selection',(s.confirm?'The confirm of '+d.id+' no longer covers what the selection says. ':'')+'Before '+d.id+' is accepted, a signed-in person who is not '+who.join(' or ')+' (the chooser and the judges of the chosen candidate\'s rows) confirms the selection.');}
  if((d.selectedAlternativeId||null)!==(s.choice?.alternativeId||null)||chosen&&!chosen.candidate)add('selection-choice',d,'The working choice is not the selection\'s',(chosen?chosen.title+(chosen.candidate?' is the working choice in Chapter 3, and the selection chose '+(list(d.alternatives).find(a=>a.id===s.choice?.alternativeId)?.title||'nothing'):' is no candidate of the selection'):'Chapter 3 holds no working choice, and the selection chose one')+'. Choose through the selection: its choice is the decision\'s.',{alternativeId:d.selectedAlternativeId||null});
 }
 return out;
}

// ---------------------------------------------------------------- the comparison of a released concern (design §e.1 row 9)
// The one builder of a released concern's comparison, moved here from architecture-design.js when the guided comparison
// of a released concern was retired (the lead's ruling Q8): what the decision says, and what each alternative says for
// its released option, written by the selection's start and candidates through the chapter's own handler.
// Round 25 (D-25-10, K2): a criterion tied to a quality category or a driver kind links the project's drivers of it
// to the decision, beside the comparison's own scenario. The person's reviewed apply links them, and the preview names
// each with the criterion that brings it. Their effects stay unstated ('unknown') for every option, with the option's
// released consequence on that criterion as the reason, until a person records one.
// `t` is the comparison ({governedConcern, requirementId, driverId, basis, answers: {owner, reason}}); `run(type,
// payload)` writes each step through the chapter's handler (or keeps it: the selection takes its decision at its start
// and each option's alternative when that option is added as a candidate); `chosen` is the option the comparison
// chose, if any, and `notes` the criterion notes of each option. Answers [source, scope, options, decision id].
export function concernComparison(input,t,chosen,notes,run){
  const concern=knowledgeConcern(t),receipt=concern.receipt,a=t.answers,options=architectureOptions(t);
  const source='Released design concern '+receipt.claimId+' / '+receipt.releaseId+' · '+receipt.path+' @ '+receipt.revision+' lines '+receipt.lineStart+'–'+receipt.lineEnd;
  const scope=concern.criteria.filter(c=>c.category||c.kind).map(c=>({c,ids:criterionDrivers(input,c).map(d=>d.id)}));
  const driverIds=[...new Set([t.driverId,...scope.flatMap(x=>x.ids)])],linked=driverIds.filter(id=>id!==t.driverId);
  const decisionId=run('decision.save',{question:concern.question,context:t.basis.requirement.description+' '+concern.statement,requirementIds:[t.requirementId],driverIds,owner:a.owner,source,rationale:a.reason,assumptions:[...concern.conditions,...concern.limitations].join(' '),risks:options.find(o=>o.id===chosen)?.cost,mitigation:'Verify the project-specific criteria and quality scenario before acceptance.'});
  for(const option of options){
    const released=concern.options.find(o=>o.id===option.id)||{},said=c=>released.consequences?.[c.id]||'';
    const reasons=concern.criteria.map(c=>c.label+': '+String(notes?.[option.id]?.[c.id]||'Not assessed').trim());
    // The released consequences and the evidence the option needs, as the concern states them; nothing when it does not.
    const consequences=option.counterfactual+(concern.criteria.some(said)?' As the released concern states: '+concern.criteria.filter(said).map(c=>c.label+': '+said(c)).join(' '):'')+(released.evidence?' The evidence it needs: '+released.evidence:'');
    // A driver's reason: the criteria assessed on it (every criterion for the comparison's own scenario), each with the
    // option's released consequence where that criterion weighs the driver.
    const weighs=(c,id)=>scope.some(x=>x.c===c&&x.ids.includes(id)),reasonOf=(id,cs)=>cs.map(c=>reasons[concern.criteria.indexOf(c)]+(said(c)&&weighs(c,id)?' Released consequence: '+said(c):'')).join(' ');
    run('decision.alternative',{id:decisionId,title:option.title,summary:reasons.join(' '),benefits:'Fit to this project requires the architect’s criterion assessments.',costs:option.cost,consequences,pattern:'Released design concern · '+concern.title,antiPattern:'Claiming an outcome without project evidence.',assessments:{[t.driverId]:{effect:'unknown',reason:reasonOf(t.driverId,concern.criteria),evidence:source},...Object.fromEntries(linked.map(id=>[id,{effect:'unknown',reason:reasonOf(id,concern.criteria.filter(c=>weighs(c,id))),evidence:source}]))},rejectionReason:option.id===chosen?'':a.reason});
  }
  return [source,scope,options,decisionId];
}

// ---------------------------------------------------------------- the commands
// The selection's last step (actor, at, account); the start's author is kept apart, in `started`.
const step=(s,actor,at,author)=>Object.assign(s,{actor:actor||null,at,account:author?.account??null});
// How an author is marked on what it writes: a draft by Sol, an import, an agent account or a person.
const kindOf=author=>author?.kind==='sol-draft'||author?.kind==='import'?author.kind:author?.account==='agent'?'agent':'person';
// The one builder of a released concern's comparison (concernComparison, below), its steps kept, not written: [the decision's payload, then one alternative's payload per released option, in the concern's order].
const comparison=(p,concern,t,notes)=>{const steps=[],[,,options]=concernComparison(p,{...t,governedConcern:concern},null,notes,(type,payload)=>{steps.push(payload);return '';});return {options,steps};};
// The released concern a selection of kind option compares, while it is current, and the payload of one option.
function optionOf(p,s,optionId,notes){
 const concern=releasedDesignConcern(p,s.concern?.id);
 if(!concern||!claimReceiptCurrent(p,s.concern.receipt)||!claimReceiptCurrent(p,concern.receipt))throw Error('This released concern is no longer current in this project: its options are not compared from it.');
 let basis;try{basis=designBasis(p,s.requirementId);}catch{throw Error('The requirement of this selection was removed.');}
 const C=comparison(p,concern,{requirementId:s.requirementId,driverId:s.driverId,basis,answers:{owner:'',reason:''}},{[optionId]:notes}),i=C.options.findIndex(o=>o.id===optionId);
 if(i<0)throw Error('Choose a released option of the concern.');
 const {id,...payload}=C.steps[1+i];return {option:C.options[i],payload};
}
function start(p,raw,at,actor,author){
 if('predicates' in raw)throw Error('No typed reading of a hard constraint is stated: a person judges each row with evidence and a reason.');
 const owner=words(raw.owner,'Name the architect accountable for this selection.',180);let s;
 if(raw.kind==='option'){
  const concern=releasedDesignConcern(p,typeof raw.concernId==='string'?raw.concernId:'');if(!concern)throw Error('Choose a current, released architecture concern.');
  let basis;try{basis=designBasis(p,raw.requirementId);}catch{throw Error('Choose an existing requirement.');}
  if(!list(basis.drivers).some(x=>x.id===raw.driverId))throw Error('Choose a driver that applies to this requirement or selected component.');
  const reason=words(raw.reason,'Explain why this comparison is made and which trade-off you accept.'),saved=comparison(p,concern,{requirementId:raw.requirementId,driverId:raw.driverId,basis,answers:{owner,reason}},{}).steps[0];
  // the decision names the requirement's drivers in scope too, as the guided comparison's proposal does (architecture-proposal.js)
  p=decide(p,'decision.save',{...saved,driverIds:uniq([...saved.driverIds,...list(basis.drivers).map(x=>x.id),raw.driverId])},at);
  s={kind:'option',requirementId:raw.requirementId,driverId:raw.driverId,concern:{id:concern.id,title:concern.title,receipt:copy(concern.receipt)}};
 }else if(raw.kind==='component'){
  const ids=uniq(list(raw.responsibilityIds));if(!ids.length||ids.length>SELECTION_LIMITS.responsibilities)throw Error('Choose the responsibilities the component is to realise (1 to '+SELECTION_LIMITS.responsibilities+').');
  const rs=ids.map(id=>list(p.logical?.responsibilities).find(r=>r.id===id));if(rs.some(r=>!r))throw Error('Choose existing responsibilities.');
  const scopes=driverScopeIndex(p),driverIds=list(p.quality?.drivers).filter(x=>list(driverScope(p,x,scopes)?.responsibilityIds).some(id=>ids.includes(id))).map(x=>x.id),named=rs.map(r=>(r.ref||r.id)+' · '+r.title).join(', ');
  p=decide(p,'decision.save',{question:optional(raw.question,200)||('Which component realises '+named+'?').slice(0,200),context:'A component selection for '+named+': each candidate is read against the hard constraints that reach it.',requirementIds:uniq(rs.flatMap(r=>list(r.requirementIds))),driverIds,owner,source:'Component selection'},at);
  s={kind:'component',responsibilityIds:ids};
 }else throw Error('Say what is selected: a component, or the options of a released concern.');
 const d=list(p.decisions.records).at(-1);
 d.selection={...s,reviewTrigger:optional(raw.reviewTrigger,400),prepared:kindOf(author),started:{actor:actor||null,at,account:author?.account??null,kind:author?.kind||'person'},judgements:[],choice:null};
 step(d.selection,actor,at,author);
 return {document:p,selected:d.id};
}
function candidate(p,raw,at,actor,author){
 let d=need(p,raw.id);const s=d.selection,c=plain(raw.candidate)?raw.candidate:{},kind=c.kind;
 if(s.choice)throw Error('A candidate of '+d.id+' is chosen: a further candidate is compared in a selection of its own.');
 if(!KINDS[s.kind]?.includes(kind))throw Error(s.kind==='option'?'A selection of a released concern compares its released options.':'Choose a profile, a library entry, an archetype, an existing component, a build or a buy.');
 let ref=null,title=optional(raw.title,160),fields={};
 if(kind==='profile'){
  const h=releasedProfile(p,plain(c.ref)?c.ref:{});if(!h||!h.eligible)throw Error('Candidate knowledge can be read, not selected.');
  const r=claimReceipt(p,h.claim,h.release);ref={scope:'knowledge',claimId:r.claimId,releaseId:r.releaseId,claimHash:r.claimHash,releaseHash:r.releaseHash,title:titleOf(h.claim)};title||=ref.title;
 }else if(kind==='library'||kind==='archetype'){
  ref=cleanLibraryRef(kind==='archetype'?{...(plain(c.ref)?c.ref:{}),scope:'catalogue'}:c.ref);
  if((kind==='archetype')!==(ref.scope==='catalogue')||ref.scope==='knowledge')throw Error('A library candidate names a library entry; an archetype candidate names a catalogue archetype.');
  const e=proposalSource(p,ref);if(e){ref.title=e.title;if(e.organization)ref.releaseId=e.organization.releaseId;else ref.revision=e.revision;}else ref.title=COMPONENT_ARCHETYPES.find(x=>x.id===ref.archetypeId)?.name||ref.archetypeId;
  title||=ref.title;
 }else if(kind==='existing'){
  const x=list(p.realisation?.components).find(y=>y.id===c.ref?.componentId);if(!x)throw Error('Choose an existing component.');
  ref={scope:'existing',componentId:x.id};fields.componentIds=[x.id];title||=x.title;
 }else if(kind==='option'){
  const notes=plain(raw.notes)?raw.notes:{};for(const v of Object.values(notes))if(typeof v!=='string'||v.length>SELECTION_LIMITS.text)throw Error('Record each criterion\'s note as text of at most '+SELECTION_LIMITS.text+' characters.');
  const {option,payload}=optionOf(p,s,typeof c.ref?.optionId==='string'?c.ref.optionId:'',notes);
  ref={scope:'knowledge',optionId:option.id,claimId:s.concern.receipt.claimId,releaseId:s.concern.receipt.releaseId};fields=payload;title=option.title;
 }else if(!title)throw Error('Name the candidate.');
 const same=JSON.stringify(ref);if(ref&&list(d.alternatives).some(a=>a.candidate&&JSON.stringify(a.candidate.ref)===same))throw Error('This candidate is already compared in '+d.id+'.');
 const said=s.kind==='component'?Object.fromEntries(['summary','benefits','costs','consequences'].map(k=>[k,optional(raw[k],4000)]).filter(([,v])=>v)):{};
 p=decide(p,'decision.alternative',{...said,...(s.kind==='component'?{responsibilityIds:copy(s.responsibilityIds)}:{}),...fields,id:d.id,title},at);
 const by={'sol-draft':'sol',agent:'agent',import:'import'}[kindOf(author)];
 d=decisionOf(p,raw.id);d.alternatives.at(-1).candidate={kind,ref,...(by?{by}:{})};
 return {document:p,selected:d.id};
}
function judge(p,raw,at,actor,author){
 const d=need(p,raw.id),s=d.selection;
 const a=list(d.alternatives).find(x=>x.id===raw.alternativeId&&x.candidate);if(!a)throw Error('Choose a candidate of the selection.');
 // After the choice only a row of the chosen candidate that reads unknown is judged, by a person other than the chooser.
 if(s.choice&&a.id!==s.choice.alternativeId)throw Error(d.id+' has a choice: only a row of the chosen candidate is judged now.');
 if(s.choice&&actor===s.choice.actor)throw Error('The chooser named this row unproven: a person other than '+actor+' judges it.');
 const k=selectionConstraints(p,d).find(x=>x.id===raw.constraintId);if(!k)throw Error('Choose a hard constraint of the selection.');
 if(!['pass','fail'].includes(raw.state))throw Error('Judge the row pass or fail.');
 const read=candidateEligibility(p,d,a).rows.find(r=>r.constraintId===k.id).state;
 if(read!=='unknown')throw Error('Only a row that reads unknown is judged: “'+k.label+'” reads '+read+' for '+a.title+', as '+candidateEligibility(p,d,a).rows.find(r=>r.constraintId===k.id).by+' judged it.');
 const evidence=words(raw.evidence,'Record the evidence for the judgement.'),reason=words(raw.reason,'Record the reason for the judgement.');
 s.judgements=[...list(s.judgements),{alternativeId:a.id,constraintId:k.id,state:raw.state,evidence,reason,actor:actor||null,at,account:author?.account??null}];
 step(s,actor,at,author);
 if(s.choice){
  // the choice's rows follow; the row is no longer unproven; the decision's assumptions no longer name it
  const label=x=>selectionConstraints(p,d).find(y=>y.id===x)?.label||x,unproven=list(s.choice.unproven).filter(x=>x!==k.id),earlier=s.choice.sentence||'',sentence=unproven.length?'Unproven for '+a.title+': '+unproven.map(label).join('; ')+'.':'';
  s.choice.unproven=unproven;s.choice.sentence=sentence;s.choice.rows=Object.fromEntries(d.alternatives.filter(x=>x.candidate).map(x=>{const r=candidateEligibility(p,d,x);return [x.id,{state:r.state,rows:r.rows}];}));
  if(earlier)p=decide(p,'decision.save',{id:d.id,assumptions:String(d.assumptions||'').replace(earlier,sentence).trim()},at);
 }
 return {document:rowsToChapter(p,d.id,at),selected:d.id};
}
function choose(p,raw,at,actor,author){
 let d=need(p,raw.id);const id=d.id;
 if(d.selection.instantiated)throw Error(id+' is instantiated: its choice stands.');
 const cs=list(d.alternatives).filter(x=>x.candidate);if(cs.length<2)throw Error('Compare at least two candidates before choosing.');
 const a=cs.find(x=>x.id===raw.alternativeId);if(!a)throw Error('Choose a candidate of the selection.');
 {const why=standingOf(p,d,a.candidate);if(why)throw Error(a.candidate.kind==='profile'?'Candidate knowledge can be read, not selected. '+why:why);}
 const label=k=>selectionConstraints(p,d).find(x=>x.id===k)?.label||k,e=candidateEligibility(p,d,a),fails=e.rows.filter(r=>r.state==='fail');
 if(fails.length)throw Error(a.title+' cannot be chosen: it fails '+fails.map(r=>'“'+label(r.constraintId)+'”').join(', ')+'.');
 const unknown=e.rows.filter(r=>r.state==='unknown').map(r=>r.constraintId),named=uniq(list(raw.unproven));
 for(const k of named)if(!unknown.includes(k))throw Error(String(k).slice(0,40)+' is not unknown for '+a.title+': only a row that reads unknown is named unproven.');
 if(unknown.some(k=>!named.includes(k)))throw Error('Name each row of '+a.title+' that reads unknown as unproven ('+unknown.join(', ')+'): unknown is never neutral, and approval evidence is refused while one is open.');
 const reason=words(raw.reason,'Say why '+a.title+' is chosen.'),rejections=plain(raw.rejections)?raw.rejections:{};
 for(const x of cs)if(x!==a)words(rejections[x.id],'Record the reason '+x.title+' is not chosen: each other candidate has one.');
 for(const x of cs){const why=x===a?'':rejections[x.id].trim();if((x.rejectionReason||'')!==why)p=decide(p,'decision.alternative',{id,alternativeId:x.id,rejectionReason:why},at);}
 p=rowsToChapter(p,id,at);
 d=decisionOf(p,id);
 const earlier=d.selection.choice?.sentence||'',base=earlier?String(d.assumptions||'').replace(earlier,'').trim():String(d.assumptions||''),sentence=unknown.length?'Unproven for '+a.title+': '+unknown.map(label).join('; ')+'.':'';
 p=decide(p,'decision.save',{id,rationale:reason,...(d.selection.kind==='option'?{risks:a.costs||''}:{}),...(sentence||earlier?{assumptions:(base&&sentence?base+' ':base)+sentence}:{}),...(sentence?{assumptionsResolved:false}:{})},at);
 p=decide(p,'decision.choose',{id,alternativeId:a.id},at);
 d=decisionOf(p,id);
 for(const x of d.alternatives)if(x.candidate)x.candidate.outcome=x.id===a.id?'chosen':'rejected';
 d.selection.choice={alternativeId:a.id,unproven:unknown,sentence,rows:Object.fromEntries(d.alternatives.filter(x=>x.candidate).map(x=>{const r=candidateEligibility(p,d,x);return [x.id,{state:r.state,rows:r.rows}];})),actor:actor||null,at,account:author?.account??null};
 step(d.selection,actor,at,author);
 return {document:p,selected:id};
}
function confirm(p,raw,at,actor,author){
 const d=need(p,raw.id),s=d.selection;if(!s.choice)throw Error('Choose a candidate first: a second person confirms the choice and its rows.');
 s.confirm={actor:actor||null,at,account:author?.account??null,basis:basisOf(p,d),note:optional(raw.note,400)};
 step(s,actor,at,author);p.decisions.version++;p.decisions.review=null;p.decisions.handoff=null;
 return {document:p,selected:d.id};
}
// An id no record of the document holds (a retired record's included), as the adoption upgrade mints one.
function mint(p,adoptions){
 const held=new Set([...COLLECTIONS.flatMap(([path])=>{const [k,l]=path.split('.'),v=l?p?.[k]?.[l]:p?.[k];return list(v).map(x=>x?.id);}),...list(p?.retired?.records).map(x=>x?.id),...list(adoptions.records).map(x=>x?.id)]);
 let id;do id='ADP-'+String(++adoptions.counter).padStart(3,'0');while(held.has(id));return id;
}
function instantiate(p,raw,at,actor,author){
 let d=need(p,raw.id);const id=d.id,s=d.selection;
 if(s.instantiated||s.imported?.instantiated)throw Error(id+' is already instantiated as '+(s.instantiated||s.imported.instantiated).ref+'.');
 const a=s.choice&&list(d.alternatives).find(x=>x.id===s.choice.alternativeId&&x.candidate);if(!a)throw Error('Choose a candidate first: nothing is instantiated before the choice is made and accepted.');
 if(!decisionCurrent(p,d)||d.selectedAlternativeId!==a.id||!confirmStands(p,d))throw Error('Accept '+id+' as it stands, confirmed by a second person, before its chosen candidate is instantiated.');
 const kind=a.candidate.kind;if(!['profile','library','archetype'].includes(kind))throw Error('A profile, a library entry or an archetype is instantiated; '+a.title+' is '+(kind==='existing'?'a component of the project already':'no reviewed proposal')+'.');
 if(raw.reviewed!==true||!plain(raw.component))throw Error('Review the proposed component before it is saved (reviewed).');
 if('id' in raw.component)throw Error('The reviewed component is a new component: it names no id.');
 const e=candidateEligibility(p,d,a);if(e.rows.some(r=>r.state==='fail')||e.rows.some(r=>r.state==='unknown'&&!list(s.choice.unproven).includes(r.constraintId)))throw Error('The rows of '+a.title+' changed since it was chosen: choose again.');
 const h=kind==='profile'?releasedProfile(p,a.candidate.ref):null;if(kind==='profile'&&(!h?.eligible||!claimReceiptCurrent(p,a.candidate.ref)))throw Error('Candidate knowledge can be read, not selected.');
 // The component is built from the reviewed fields only (ruling Q5): what else the payload says is not taken.
 const comp=Object.fromEntries(REVIEWED.filter(k=>typeof raw.component[k]==='string').map(k=>[k,raw.component[k]])),purpose=comp.purpose||'';
 // A library entry or an archetype through the reviewed candidate path, with its pinned reference; a released profile
 // as a candidate component that names where it comes from, the pin itself kept where it is read: on the profile's
 // adoption (its definition's claim receipt) and on the selection's candidate.
 const ref=a.candidate.ref,made={...comp,status:'candidate',decisionIds:[id],allocations:list(s.responsibilityIds).map(logicalId=>({logicalId,scope:purpose||a.title}))};
 const r=applyRealisationCommand(p,h?{type:'realisation.component',payload:{...made,source:'Released component profile '+ref.claimId+' in '+ref.releaseId+' (claim hash '+ref.claimHash+'), chosen in '+id+'.'}}:{type:'realisation.candidate',payload:{...made,key:kind,library:copy(ref),reviewed:true}},at);
 p=r.document;const c=list(p.realisation.components).find(x=>x.id===r.selected);d=decisionOf(p,id);
 let adoptionId=null;
 if(h){
  const held=plain(p.adoptions)?p.adoptions:p.adoptions={schemaVersion:1,definition:1,counter:0,version:0,records:[]};held.records=list(held.records);
  if(adoptionRecords(p).length>=ADOPTION_LIMITS.records)throw Error('This project keeps '+ADOPTION_LIMITS.records+' adoptions: no further one is written.');
  adoptionId=mint(p,held);
  const unit=h.claim.architectureUnit,receipt=claimReceipt(p,h.claim,h.release),definitionId='profile:'+String(h.claim.subjectId).slice(18),title=titleOf(h.claim);
  const snapshot={definitionId,version:1,kind:'profile',title,mechanism:unit.mechanism,roles:[{id:'component',label:'The component the profile is instantiated as',required:true,cardinality:'one',accepts:[{type:'component'}]},...(list(s.responsibilityIds).length?[{id:'responsibility',label:'The responsibilities it realises',required:true,cardinality:'many',accepts:[{type:'responsibility'}]}]:[])],
   obligations:list(unit.obligations).map((o,i)=>({id:'O'+(i+1),kind:'implementation',action:o.action,evidence:o.evidence,mandatory:true,role:'component'}))};
  held.records.push({id:adoptionId,ref:adoptionId,revision:1,status:'applied',origin:'person',kind:'profile',title,owner:typeof comp.owner==='string'?comp.owner.slice(0,180):'',scope:{requirementId:list(d.requirementIds)[0]||null,driverId:null,contextIds:[]},
   definition:{definitionId,version:1,authority:'released',receipt,snapshot,snapshotHash:digest(snapshot)},facts:factsOf(h.claim),
   bindings:[{id:adoptionId+':component',roleId:'component',recordId:c.id,recordType:'component',mode:'created',at,by:actor||null},...list(s.responsibilityIds).map(x=>({id:adoptionId+':responsibility:'+x,roleId:'responsibility',recordId:x,recordType:'responsibility',mode:'reused',at,by:actor||null}))],
   parameters:[],obligations:snapshot.obligations.map(o=>({id:adoptionId+':'+o.id,kind:o.kind,action:o.action,evidence:o.evidence,mandatory:true,targetIds:[c.id],declared:true})),decisionId:id,deviations:[],
   applied:{at,actor:actor||null,account:author?.account??null,reason:'Instantiated from the selection '+id+'.',changeIds:[],records:[{id:c.id,ref:c.ref,title:c.title,chapter:5,slot:'component',isNew:true}]},
   history:[{n:1,at,event:'apply',actor:actor||null,revision:1,note:'Instantiated from the selection '+id+' ('+a.title+').'}]});
  held.version=(held.version||0)+1;
 }
 d.selection.instantiated={componentId:c.id,ref:c.ref,adoptionId,actor:actor||null,at,account:author?.account??null};step(d.selection,actor,at,author);
 return {document:p,selected:c.id,selectedIds:[id,...(adoptionId?[adoptionId]:[])]};
}
const STEPS={'selection.start':start,'selection.candidate':candidate,'selection.judge':judge,'selection.choose':choose,'selection.confirm':confirm,'selection.instantiate':instantiate};
export function applySelectionCommand(p,command,at,actor,options={}){
 const run=STEPS[command?.type];if(!run)throw Error('Unknown selection action.');
 return run(p,plain(command.payload)?command.payload:{},at,actor,options?.author);
}
