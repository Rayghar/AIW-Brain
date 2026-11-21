// Component selection as a recorded decision (rc44, wp2 slice S5; audit/rc44/design/wp2-adoption.md §b.2, §c.2, §e.1
// row 9). A selection is a Chapter 3 decision: these steps write the decision's own fields through the chapter's own
// handler (decisions-domain.js applyDecisionCommand) and keep the selection's basis beside it, created when first
// written: decision.selection {kind, responsibilityIds | requirementId, driverId, concern, predicates, reviewTrigger,
// prepared, judgements, choice, instantiated, actor, at, account} and, on each alternative it compares,
// alternative.candidate {kind, ref, facts, by?, outcome?}. Candidates are kept in the order they were added; no field
// holds a score, a rank or a weight, and the decision's weighing (decision-reading.js readDecision) reads none.
//   selection.start       {kind: 'component', responsibilityIds, owner, question?, reviewTrigger?, predicates?}
//                         {kind: 'option', concernId, requirementId, driverId, owner, reason}   any author; a draft by
//                         Sol's is a proposal (prepared 'sol-draft'). A typed reading of a hard constraint
//                         (predicates {driverId: {fact, op, value}}) is a signed-in person's statement.
//   selection.candidate   {id, candidate: {kind, ref}, title?, summary?, notes?}   any author; Sol's is marked by Sol.
//                         profile: a released, eligible component profile (knowledge scope, pinned to its release and
//                         claim hash); library / archetype: what the reviewed candidate path accepts
//                         (component-library.js proposalSource); existing: a component of the project; build / buy;
//                         option: a released option of the selection's concern. Candidate knowledge can be read, not
//                         selected.
//   selection.judge       {id, alternativeId, constraintId, state, evidence, reason}   a signed-in person's, for a row
//                         that reads unknown; the judgement keeps its actor and account kind.
//   selection.choose      {id, alternativeId, reason, rejections: {alternativeId: reason}, unproven?}   a signed-in
//                         person's; a candidate that fails a hard constraint is not chosen, each row that reads
//                         unknown is named unproven and written into the decision's assumptions (approval evidence is
//                         then refused while it is open: decision.governance's existing rule).
//   selection.instantiate {id, reviewed: true, component}   a signed-in person's, once the decision is accepted as it
//                         stands: the chosen profile, library entry or archetype is saved through realisation.candidate
//                         with its pinned reference and the decision; a profile is applied as an adoption of kind
//                         profile with its obligations open, which a second person accepts (adoption.accept).
// Eligibility is read, never stored: each hard constraint that reaches the decision (a constraint driver whose
// force is hard: decision-reading.js constraintForce) is one row per candidate, evaluated with the shared three-valued
// rule (architecture-facts.js evaluateApplicability) against the candidate's facts, which come from released knowledge
// only and only while it is current: pass, fail or unknown. Unknown is never neutral. A row that reads unknown may be
// judged by a signed-in person. Knowledge is read through the existing rule only (knowledge-governance.js
// releasedClaims, claimReceiptCurrent): a candidate or unreleased claim reaches no row, gate or reading.
import {applyDecisionCommand,decisionCurrent} from './decisions-domain.js';
import {applyRealisationCommand} from './realisation-domain.js';
import {constraintForce} from './decision-reading.js';
import {driverKind} from './quality-domain.js';
import {driverScope,driverScopeIndex} from './driver-scope.js';
import {evaluateApplicability,APPLICABILITY_OPERATORS,safeFactKey} from './architecture-facts.js';
import {releasedClaims,claimReceipt,claimReceiptCurrent,knowledgeState} from './knowledge-governance.js';
import {releasedDesignConcern} from './domain-knowledge.js';
import {concernComparison} from './architecture-design.js';
import {designBasis} from './design-basis.js';
import {cleanLibraryRef,proposalSource,COMPONENT_ARCHETYPES} from './component-library.js';
import {adoptionRecords,ADOPTION_LIMITS} from './adoption-domain.js';
import {COLLECTIONS} from './record-lifecycle.js';
import {digest} from './brain-integrity.js';

const list=v=>Array.isArray(v)?v:[],plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v),copy=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v)),uniq=xs=>[...new Set(xs)];
export const SELECTION_LIMITS=Object.freeze({text:2000,responsibilities:12});
const KINDS={component:['profile','library','archetype','existing','build','buy'],option:['option']};
const words=(v,what,max=SELECTION_LIMITS.text)=>{if(typeof v!=='string'||!v.trim())throw Error(what);if(v.length>max)throw Error('Use at most '+max+' characters ('+v.length+' were sent); nothing is cut.');return v.trim();};
const optional=(v,max=SELECTION_LIMITS.text)=>v===undefined||v===null||v===''?'':words(v,'',max);
const decisionOf=(p,id)=>list(p?.decisions?.records).find(d=>d?.id===id)||null;
const need=(p,id)=>{const d=decisionOf(p,id);if(!d||!plain(d.selection))throw Error('Choose a selection.');return d;};
const decide=(p,type,payload,at)=>applyDecisionCommand(p,{type,payload},at).document;
const person=author=>author?.kind==='person'&&author?.account==='person';

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
// decision's order, each with the typed reading a person stated for it, if any. Read from the drivers as they stand.
export function selectionConstraints(p,d){
 const s=d?.selection;if(!plain(s))return [];
 return list(d.driverIds).map(id=>list(p?.quality?.drivers).find(x=>x.id===id)).filter(x=>x&&driverKind(x)==='constraint'&&constraintForce(p,x).hard).map(x=>({id:x.id,source:'driver',driverId:x.id,label:x.title,hard:true,...(plain(s.predicates?.[x.id])?{predicate:copy(s.predicates[x.id])}:{})}));
}
// Whether what a candidate rests on still stands in this project.
function current(p,d,c){
 if(c?.kind==='profile')return claimReceiptCurrent(p,c.ref);
 if(c?.kind==='option')return !!d.selection.concern&&claimReceiptCurrent(p,d.selection.concern.receipt);
 return true;
}
const evaluate=(k,facts)=>{if(!k.predicate)return null;const c=evaluateApplicability({requires:[{id:k.id,label:k.label,...k.predicate}]},facts).checks[0];return c.state==='known'?'pass':c.state==='blocked'?'fail':null;};
// A candidate's rows against the hard constraints: evaluated from its facts (pass or fail), or a signed-in person's
// judgement of a row that reads unknown, or unknown.
export function candidateEligibility(p,d,a){
 const c=a?.candidate,constraints=selectionConstraints(p,d),standing=!!c&&current(p,d,c),facts=standing&&plain(c.facts)?c.facts:{};
 const reasons=c&&!standing?['The released knowledge '+(c.kind==='option'?'of the concern':c.ref?.claimId||'')+' is no longer current in this project: it states no fact here, and the candidate is not selected from it.']:[];
 const judged=list(d?.selection?.judgements).filter(j=>j?.alternativeId===a?.id&&j.actor&&j.account==='person'&&['pass','fail'].includes(j.state));
 const rows=constraints.map(k=>{
  const state=evaluate(k,facts),fact=k.predicate?{fact:k.predicate.fact,expected:copy(k.predicate.value),...(state&&facts[k.predicate.fact]?{value:copy(facts[k.predicate.fact].value)}:{})}:{};
  if(state)return {constraintId:k.id,state,basis:'evaluated',...fact};
  const j=judged.findLast(x=>x.constraintId===k.id);
  return j?{constraintId:k.id,state:j.state,basis:'person',evidence:j.evidence,reason:j.reason,by:j.actor,at:j.at,...fact}:{constraintId:k.id,state:'unknown',basis:'evaluated',...fact};
 });
 return {state:rows.some(r=>r.state==='fail')?'ineligible':rows.some(r=>r.state==='unknown')?'unproven':'eligible',rows,reasons};
}
// The reading of a selection: what it selects for, its constraints, its candidates in the order they were added with
// their rows and outcome, the choice and what was instantiated. Null for a decision that is no selection.
export function selectionReading(p,d){
 const s=d?.selection;if(!plain(s))return null;
 return {id:d.id,kind:s.kind,prepared:s.prepared,responsibilityIds:copy(list(s.responsibilityIds)),concern:s.concern?{id:s.concern.id,title:s.concern.title}:null,constraints:selectionConstraints(p,d),
  candidates:list(d.alternatives).filter(a=>a?.candidate).map(a=>({alternativeId:a.id,title:a.title,kind:a.candidate.kind,ref:copy(a.candidate.ref),facts:copy(a.candidate.facts||{}),eligibility:candidateEligibility(p,d,a),outcome:a.candidate.outcome||'open',rejection:a.rejectionReason||'',...(a.candidate.by?{by:a.candidate.by}:{})})),
  choice:s.choice?{alternativeId:s.choice.alternativeId,unproven:copy(list(s.choice.unproven)),by:s.choice.actor,at:s.choice.at}:null,instantiated:s.instantiated?{componentId:s.instantiated.componentId,adoptionId:s.instantiated.adoptionId||null,by:s.instantiated.actor,at:s.instantiated.at}:null,
  considered:['the hard constraints that reach the decision','the facts released knowledge states of each candidate','a signed-in person\'s judgement of a row that reads unknown'],notConsidered:['quality effects','cost','measured behaviour','anything a candidate does not state']};
}

// ---------------------------------------------------------------- the commands
const step=(s,actor,at,author)=>Object.assign(s,{actor:actor||null,at,account:author?.account??null});
function predicatesOf(p,raw,driverIds,author){
 if(raw.predicates===undefined||raw.predicates===null)return {};
 if(!plain(raw.predicates))throw Error('State each typed reading as {fact, op, value} under its constraint.');
 if(Object.keys(raw.predicates).length&&!person(author))throw Error('A typed reading of a hard constraint is a signed-in person\'s statement: a draft by Sol, an import or an agent account states none.');
 const out={},hard=new Set(list(p.quality?.drivers).filter(x=>driverIds.includes(x.id)&&driverKind(x)==='constraint'&&constraintForce(p,x).hard).map(x=>x.id));
 for(const [id,x] of Object.entries(raw.predicates)){
  if(!hard.has(id))throw Error('A typed reading is stated for a hard constraint that reaches the decision: '+String(id).slice(0,40)+' is not one.');
  const ok=plain(x)&&safeFactKey(x.fact)&&APPLICABILITY_OPERATORS.includes(x.op)&&(x.op==='present'?x.value===undefined:x.op==='oneOf'?Array.isArray(x.value)&&x.value.length>0&&x.value.length<=24:['string','number','boolean'].includes(typeof x.value)&&String(x.value).length<=240);
  if(!ok)throw Error('The typed reading of '+id+' names a literal fact, a supported comparison and a value.');
  out[id]={fact:x.fact,op:x.op,...(x.op==='present'?{}:{value:copy(x.value)})};
 }
 return out;
}
// The one builder of a released concern's comparison (architecture-design.js concernComparison), its steps kept, not
// written: [the decision's payload, then one alternative's payload per released option, in the concern's order].
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
 d.selection={...s,predicates:predicatesOf(p,raw,list(d.driverIds),author),reviewTrigger:optional(raw.reviewTrigger,400),prepared:author?.kind||'person',judgements:[],choice:null};
 step(d.selection,actor,at,author);
 return {document:p,selected:d.id};
}
function candidate(p,raw,at,actor,author){
 let d=need(p,raw.id);const s=d.selection,c=plain(raw.candidate)?raw.candidate:{},kind=c.kind;
 if(s.choice)throw Error('A candidate of '+d.id+' is chosen: a further candidate is compared in a selection of its own.');
 if(!KINDS[s.kind]?.includes(kind))throw Error(s.kind==='option'?'A selection of a released concern compares its released options.':'Choose a profile, a library entry, an archetype, an existing component, a build or a buy.');
 let ref=null,facts={},title=optional(raw.title,160),fields={};
 if(kind==='profile'){
  const h=releasedProfile(p,plain(c.ref)?c.ref:{});if(!h||!h.eligible)throw Error('Candidate knowledge can be read, not selected.');
  const r=claimReceipt(p,h.claim,h.release);ref={scope:'knowledge',claimId:r.claimId,releaseId:r.releaseId,claimHash:r.claimHash,releaseHash:r.releaseHash,title:titleOf(h.claim)};facts=factsOf(h.claim);title||=ref.title;
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
 d=decisionOf(p,raw.id);d.alternatives.at(-1).candidate={kind,ref,facts,...(author?.kind==='sol-draft'?{by:'sol'}:{})};
 return {document:p,selected:d.id};
}
function judge(p,raw,at,actor,author){
 const d=need(p,raw.id),s=d.selection;if(s.choice)throw Error('A candidate of '+d.id+' is chosen: its rows were read when it was chosen.');
 const a=list(d.alternatives).find(x=>x.id===raw.alternativeId&&x.candidate);if(!a)throw Error('Choose a candidate of the selection.');
 const k=selectionConstraints(p,d).find(x=>x.id===raw.constraintId);if(!k)throw Error('Choose a hard constraint of the selection.');
 if(!['pass','fail'].includes(raw.state))throw Error('Judge the row pass or fail.');
 const read=evaluate(k,current(p,d,a.candidate)&&plain(a.candidate.facts)?a.candidate.facts:{});
 if(read)throw Error('Only a row that reads unknown is judged: “'+k.label+'” reads '+read+' for '+a.title+' from what it states.');
 const evidence=words(raw.evidence,'Record the evidence for the judgement.'),reason=words(raw.reason,'Record the reason for the judgement.');
 s.judgements=[...list(s.judgements),{alternativeId:a.id,constraintId:k.id,state:raw.state,evidence,reason,actor:actor||null,at,account:author?.account??null}];
 step(s,actor,at,author);p.decisions.version++;p.decisions.review=null;p.decisions.handoff=null;
 return {document:p,selected:d.id};
}
function choose(p,raw,at,actor,author){
 let d=need(p,raw.id);const id=d.id;
 if(d.selection.instantiated)throw Error(id+' is instantiated: its choice stands.');
 const cs=list(d.alternatives).filter(x=>x.candidate);if(cs.length<2)throw Error('Compare at least two candidates before choosing.');
 const a=cs.find(x=>x.id===raw.alternativeId);if(!a)throw Error('Choose a candidate of the selection.');
 if(!current(p,d,a.candidate))throw Error('Candidate knowledge can be read, not selected.');
 const label=k=>selectionConstraints(p,d).find(x=>x.id===k)?.label||k,e=candidateEligibility(p,d,a),fails=e.rows.filter(r=>r.state==='fail');
 if(fails.length)throw Error(a.title+' cannot be chosen: it fails '+fails.map(r=>'“'+label(r.constraintId)+'”').join(', ')+'.');
 const unknown=e.rows.filter(r=>r.state==='unknown').map(r=>r.constraintId),named=uniq(list(raw.unproven));
 for(const k of named)if(!unknown.includes(k))throw Error(String(k).slice(0,40)+' is not unknown for '+a.title+': only a row that reads unknown is named unproven.');
 if(unknown.some(k=>!named.includes(k)))throw Error('Name each row of '+a.title+' that reads unknown as unproven ('+unknown.join(', ')+'): unknown is never neutral, and approval evidence is refused while one is open.');
 const reason=words(raw.reason,'Say why '+a.title+' is chosen.'),rejections=plain(raw.rejections)?raw.rejections:{};
 for(const x of cs)if(x!==a)words(rejections[x.id],'Record the reason '+x.title+' is not chosen: each other candidate has one.');
 for(const x of cs){const why=x===a?'':rejections[x.id].trim();if((x.rejectionReason||'')!==why)p=decide(p,'decision.alternative',{id,alternativeId:x.id,rejectionReason:why},at);}
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
// An id no record of the document holds (a retired record's included), as the adoption upgrade mints one.
function mint(p,adoptions){
 const held=new Set([...COLLECTIONS.flatMap(([path])=>{const [k,l]=path.split('.'),v=l?p?.[k]?.[l]:p?.[k];return list(v).map(x=>x?.id);}),...list(p?.retired?.records).map(x=>x?.id),...list(adoptions.records).map(x=>x?.id)]);
 let id;do id='ADP-'+String(++adoptions.counter).padStart(3,'0');while(held.has(id));return id;
}
function instantiate(p,raw,at,actor,author){
 let d=need(p,raw.id);const id=d.id,s=d.selection;
 if(s.instantiated)throw Error(id+' is already instantiated as '+s.instantiated.ref+'.');
 const a=s.choice&&list(d.alternatives).find(x=>x.id===s.choice.alternativeId&&x.candidate);if(!a)throw Error('Choose a candidate first: nothing is instantiated before the choice is made and accepted.');
 if(!decisionCurrent(p,d)||d.selectedAlternativeId!==a.id)throw Error('Accept '+id+' as it stands before its chosen candidate is instantiated.');
 const kind=a.candidate.kind;if(!['profile','library','archetype'].includes(kind))throw Error('A profile, a library entry or an archetype is instantiated; '+a.title+' is '+(kind==='existing'?'a component of the project already':'no reviewed proposal')+'.');
 if(raw.reviewed!==true||!plain(raw.component))throw Error('Review the proposed component before it is saved (reviewed).');
 const e=candidateEligibility(p,d,a);if(e.rows.some(r=>r.state==='fail')||e.rows.some(r=>r.state==='unknown'&&!list(s.choice.unproven).includes(r.constraintId)))throw Error('The rows of '+a.title+' changed since it was chosen: choose again.');
 const h=kind==='profile'?releasedProfile(p,a.candidate.ref):null;if(kind==='profile'&&(!h?.eligible||!claimReceiptCurrent(p,a.candidate.ref)))throw Error('Candidate knowledge can be read, not selected.');
 const comp=raw.component,purpose=typeof comp.purpose==='string'?comp.purpose:'';
 // A library entry or an archetype through the reviewed candidate path, with its pinned reference; a released profile
 // as a candidate component that names where it comes from, the pin itself kept where it is read: on the profile's
 // adoption (its definition's claim receipt) and on the selection's candidate.
 const ref=a.candidate.ref,made={...comp,status:'candidate',decisionIds:uniq([...list(comp.decisionIds),id]),...(comp.allocations===undefined?{allocations:list(s.responsibilityIds).map(logicalId=>({logicalId,scope:purpose||a.title}))}:{})};
 const r=applyRealisationCommand(p,h?{type:'realisation.component',payload:{...made,source:'Released component profile '+ref.claimId+' in '+ref.releaseId+' (claim '+String(ref.claimHash).slice(0,12)+'), chosen in '+id+'.'}}:{type:'realisation.candidate',payload:{...made,key:kind,library:copy(ref),reviewed:true}},at);
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
   definition:{definitionId,version:1,authority:'released',receipt,snapshot,snapshotHash:digest(snapshot)},facts:copy(a.candidate.facts||{}),
   bindings:[{id:adoptionId+':component',roleId:'component',recordId:c.id,recordType:'component',mode:'created',at,by:actor||null},...list(s.responsibilityIds).map(x=>({id:adoptionId+':responsibility:'+x,roleId:'responsibility',recordId:x,recordType:'responsibility',mode:'reused',at,by:actor||null}))],
   parameters:[],obligations:snapshot.obligations.map(o=>({id:adoptionId+':'+o.id,kind:o.kind,action:o.action,evidence:o.evidence,mandatory:true,targetIds:[c.id],declared:true})),decisionId:id,deviations:[],
   applied:{at,actor:actor||null,account:author?.account??null,reason:'Instantiated from the selection '+id+'.',changeIds:[],records:[{id:c.id,ref:c.ref,title:c.title,chapter:5,slot:'component',isNew:true}]},
   history:[{n:1,at,event:'apply',actor:actor||null,revision:1,note:'Instantiated from the selection '+id+' ('+a.title+').'}]});
  held.version=(held.version||0)+1;
 }
 d.selection.instantiated={componentId:c.id,ref:c.ref,adoptionId,actor:actor||null,at,account:author?.account??null};step(d.selection,actor,at,author);
 return {document:p,selected:c.id,selectedIds:[id,...(adoptionId?[adoptionId]:[])]};
}
const STEPS={'selection.start':start,'selection.candidate':candidate,'selection.judge':judge,'selection.choose':choose,'selection.instantiate':instantiate};
export function applySelectionCommand(p,command,at,actor,options={}){
 const run=STEPS[command?.type];if(!run)throw Error('Unknown selection action.');
 return run(p,plain(command.payload)?command.payload:{},at,actor,options?.author);
}
