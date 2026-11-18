// The concept register's readers (rc44, wp1). A concept (knowledge.concepts, KN) is one maintained identity; its forms
// are governed claims of the project that carry a typed `form` (concept-form.js). Nothing here writes: states are
// derived on every read from the records, the way knowledgeEligibility re-checks a claim.
//   concept: draft | reviewed (verified by a second signed-in person at this exact hash, every form verified by someone
//            other than its author) | retired. Released concepts with a version are slice S3 (release parts).
//   form:    candidate | reviewed | released (in an active release, eligible, and valid again on this read) |
//            released-ineligible.
// Decision-bearing content (applicability, selection, composition, calculation, verification) is returned in state
// released only, and to a design record only through an active concept pin. Teaching content of a candidate is returned
// with its label. Nothing in any state other than released is for a check, a gate, a score, a draft or Sol: no module on
// the route imports this one (rc44-wp1-cases-forms.mjs, S1.14).
import {knowledgeState,knowledgeEligibility,claimReceipt,withdrawn} from './knowledge-governance.js';
import {verifierRefusal} from './architecture-obligations.js';
import {digest} from './brain-integrity.js';
import {FORM_TYPES,FORM_TIER,conceptFormIssues} from './concept-form.js';
import {copy,list} from './util.js';

const order=type=>FORM_TYPES.indexOf(type);
// A form's issues as its claim stands: against the claim's passage, with the claim's own statement, conditions and limitations.
export const formIssues=claim=>conceptFormIssues(claim?.form,{excerpt:claim?.excerpt,lineStart:claim?.lineStart,claim:{statement:claim?.statement,conditions:claim?.conditions,limitations:claim?.limitations}});
const sourceOf=(s,claim,release)=>release?.organizationId?list(release.sources).find(x=>x.id===claim.sourceId):s.sources.find(x=>x.id===claim.sourceId);
// The form claims that active releases hold (the project's own and the organisation's), each with its eligibility. This
// is the one reader of them: releasedClaims hands no form claim to anyone, whatever its state (ruling B1 of 2026-11-18),
// so no reader of released claims (knowledge structures, the snapshot, the contextual reading, the Brain, Sol's packets,
// a product comparison, a rationale link) receives one.
const releasedForms=p=>{const s=knowledgeState(p);return [...s.releases,...list(s.organizationReleases)].filter(r=>s.pins.includes(r.id)).flatMap(r=>r.claims.filter(c=>c?.form).map(c=>({claim:c,release:r,...knowledgeEligibility(p,c,r)})));};
// What a concept's review covers (ruling B3 of 2026-11-18): every field of its record except the bookkeeping (when and by
// whom the record was written, its history and revision, the change note, the review itself and a retirement), each form
// claim exactly as it stands (its review included, as claimReceipt hashes a claim), and the topics mapped to it (file,
// topic id, slice hash), sorted. So who stewards it, when it is due, what triggers a review and what it succeeds are
// reviewed with it, and a field no command writes moves the hash as well.
// (`forms` is hashed below as type and claim hash; `hash` and `state` are what conceptRecords derives, never stored.)
const BOOKKEEPING=['at','actor','lastEditor','history','revision','changeNote','review','retired'],DERIVED=['forms','hash','state'];
const cmp=(a,b)=>a<b?-1:a>b?1:0;
export function conceptHash(concept,claims,topics){
 const forms=list(concept.forms).map(f=>{const c=list(claims).find(x=>x.id===f.claimId);return {type:f.type,claimHash:c?digest(c):null};}).sort((a,b)=>order(a.type)-order(b.type)||String(a.claimHash).localeCompare(String(b.claimHash)));
 const rows=list(topics).filter(t=>t?.conceptId===concept.conceptId).map(t=>({file:t.file,topicId:t.topicId,sliceSha256:t.sliceSha256})).sort((a,b)=>cmp(String(a.file),String(b.file))||cmp(String(a.topicId),String(b.topicId)));
 return digest({...Object.fromEntries(Object.entries(concept).filter(([k])=>!BOOKKEEPING.includes(k)&&!DERIVED.includes(k))),forms,topics:rows});
}
// This project's concept register, each concept with its hash and derived state. A review stands while its hash is the
// concept's, its reviewer wrote no revision of the concept (verifierRefusal, the one second-person check) and every form
// claim is eligible for release: verified by someone other than its author, on its exact passage, not withdrawn.
// Who wrote a concept, for that check: its author, every editor, and the author of each claim that is one of its forms.
export const conceptAuthors=(c,claims)=>({id:c.id,actor:c.actor,owner:'',history:[...list(c.history),...list(c.forms).map(f=>({revision:0,actor:list(claims).find(x=>x.id===f.claimId)?.actor})).filter(h=>h.actor)]});
function reviewStands(p,s,c,hash){
 const r=c.review,forms=list(c.forms);
 return r?.decision==='verified'&&!!r.actor&&r.account==='person'&&r.conceptHash===hash&&!verifierRefusal(conceptAuthors(c,s.claims),r.actor,r.account)&&forms.length>0&&forms.every(f=>{const claim=s.claims.find(x=>x.id===f.claimId);return !!claim?.form&&knowledgeEligibility(p,claim).eligible&&!formIssues(claim).length;});
}
export function conceptRecords(p){
 const s=knowledgeState(p);
 return list(s.concepts).map(c=>{const hash=conceptHash(c,s.claims,s.topics);return {...c,hash,state:c.retired?'retired':reviewStands(p,s,c,hash)?'reviewed':'draft'};});
}
// Whether a concept is covered (rulings B3 and G2 of 2026-11-18): a second person verified it here at some time, or a
// release of this project holds one of its forms. It stays covered whether or not that review stands now (a superseded
// source, a withdrawn form, an open contradiction, a person's edit), and through a later dispute or rejection, which keeps
// who verified it before (review.verifiedBefore). What a covered concept holds and rests on is changed by a person only
// (knowledge-concept-commands.js), so no chain of requests frees it for a request that is nobody's. A review that names
// no person's account was never one (ruling B4), and a review made on another workbench names no reviewer here
// (recovery-service.js): neither covers anything.
export function conceptCovered(p,concept){
 const s=knowledgeState(p),r=concept.review;
 return !!r?.actor&&r.account==='person'&&(r.decision==='verified'||!!r.verifiedBefore)||s.releases.some(x=>x.claims.some(c=>c?.form&&c.subjectId===concept.conceptId));
}
// One state and one label for a form: {claim, release} for a claim as an active release holds it, {claim} for a claim
// of this project. A released form is checked again here, on every read (its claim's eligibility and its own shape).
export function formStatus(p,{claim,release=null}){
 const s=knowledgeState(p),source=sourceOf(s,claim,release),issues=formIssues(claim).map(i=>'The form is invalid: '+i);
 const where=(source?.sourceFile?.file||source?.path||'source unavailable')+' L'+claim.lineStart+'–L'+claim.lineEnd;
 if(release){
  const reasons=[...knowledgeEligibility(p,claim,release).reasons,...issues];
  return reasons.length?{state:'released-ineligible',label:'Not usable: '+reasons.join(' '),reasons}:{state:'released',label:'Released · '+release.title+' · verified by '+claim.review.actor+' · '+where+' · passage '+String(claim.excerptHash).slice(0,12),reasons};
 }
 const reasons=[...knowledgeEligibility(p,claim).reasons,...issues];
 if(!reasons.length){const held=s.releases.find(r=>r.claims.some(c=>c.id===claim.id));return {state:'reviewed',label:held?'Reviewed · in the release "'+held.title+'", which is not active in this project':'Reviewed · awaiting release',reasons};}
 const decision=claim.review?.decision,fresh=!claim.review&&!issues.length&&!withdrawn(p,[claim.id,claim.sourceId]).length;
 return {state:'candidate',label:decision==='verified'?'Candidate · its review does not stand: '+reasons.join(' '):decision?'Candidate · '+decision+' in review':'Candidate · not reviewed · '+where,reasons,fresh};
}
function formEntry(p,claim,release){
 const s=knowledgeState(p),st=formStatus(p,{claim,release}),type=claim.form.type,tier=FORM_TIER[type],source=sourceOf(s,claim,release),released=st.state==='released';
 // Released content is returned in any project. Teaching content that is not released (a candidate nobody reviewed
 // yet, a reviewed form awaiting release) is shown, labelled, in a knowledge library only (ruling B2; build plan
 // section 6 item 4, until the owner decides whether it may be shown inside design projects).
 const shown=released||s.library?.enabled===true&&tier==='teaching'&&(st.state==='reviewed'||st.fresh===true);
 return {type,tier,claimId:claim.id,releaseId:release?.id||null,status:st.state,label:st.label,reasons:st.reasons,content:shown?copy(claim.form):null,architectureUnit:released&&claim.architectureUnit?copy(claim.architectureUnit):null,receipt:released?claimReceipt(p,claim,release):null,
  source:{file:source?.sourceFile?.file||source?.path||null,lineStart:claim.lineStart,lineEnd:claim.lineEnd,passageSha256:claim.excerptHash,checkedAt:source?.checkedAt||null,versionScope:source?.versionScope||null}};
}
const byForm=(a,b)=>order(a.type)-order(b.type)||String(a.claimId).localeCompare(String(b.claimId));
// Every concept an active release holds (the project's own and the organisation's), by release: its form claims are the
// release's claims on that subject. A concept is reviewed and released whole, so it is eligible there only whole: each of
// its forms released, exactly one definition among them, and the concept not retired in this project. `reasons` says why not.
export function releasedConcepts(p){
 const s=knowledgeState(p),groups=new Map();
 for(const h of releasedForms(p)){
  if(!h.claim?.form||!FORM_TYPES.includes(h.claim.form.type))continue;
  const key=h.release.id+'\n'+h.claim.subjectId;if(!groups.has(key))groups.set(key,{conceptId:h.claim.subjectId,release:h.release,forms:[]});
  groups.get(key).forms.push(formEntry(p,h.claim,h.release));
 }
 return [...groups.values()].map(g=>{
  const record=list(s.concepts).find(c=>c.conceptId===g.conceptId)||null,forms=g.forms.sort(byForm),definitions=forms.filter(f=>f.type==='definition').length,reasons=[];
  if(record?.retired)reasons.push(g.conceptId+' is retired in this project: '+record.retired.reason);
  else{
   const unusable=forms.filter(f=>f.status!=='released').map(f=>f.type+' ('+f.claimId+'): '+f.reasons.join(' '));
   if(definitions!==1)unusable.push(definitions?'the release holds '+definitions+' definitions of '+g.conceptId:'the release holds no definition of '+g.conceptId);
   if(unusable.length)reasons.push(g.conceptId+' is not usable as a whole in "'+g.release.title+'": '+unusable.join('; '));
  }
  return {conceptId:g.conceptId,release:g.release,concept:g.release.organizationId?null:record,eligible:!reasons.length,reasons,forms};
 });
}
// What a concept reads as here: the register's concept with each of its forms, the forms active releases hold, and for
// each of those releases whether the concept is usable there as a whole, with the reasons when it is not.
export function conceptReading(p,conceptId){
 const s=knowledgeState(p),concept=conceptRecords(p).find(c=>c.conceptId===conceptId),released=releasedConcepts(p).filter(c=>c.conceptId===conceptId);
 if(!concept&&!released.length)return null;
 const hits=releasedForms(p),forms=[];
 for(const f of list(concept?.forms)){
  const hit=hits.find(h=>!h.release.organizationId&&h.claim.id===f.claimId&&h.claim.form),claim=hit?.claim||s.claims.find(c=>c.id===f.claimId);
  if(claim?.form)forms.push(formEntry(p,claim,hit?.release||null));
 }
 for(const c of released)for(const f of c.forms)if(!forms.some(x=>x.claimId===f.claimId&&x.releaseId===f.releaseId))forms.push(f);
 const head=concept||{conceptId,title:conceptId,kind:null,family:'',scope:[],stages:[],lenses:[]};
 return {conceptId,title:head.title,kind:head.kind,family:head.family,scope:copy(head.scope),stages:copy(head.stages),lenses:copy(head.lenses),state:concept?concept.state:'released',forms:forms.sort(byForm),releases:released.map(c=>({releaseId:c.release.id,title:c.release.title,eligible:c.eligible,reasons:c.reasons}))};
}
// The teaching forms a concept offers here, each with its state and label: released, reviewed, or a candidate nobody reviewed yet.
export function conceptTeachingForms(p,conceptId){
 return list(conceptReading(p,conceptId)?.forms).filter(f=>f.tier==='teaching'&&f.content).map(f=>({type:f.type,status:f.status,label:f.label,content:f.content,receipt:f.receipt}));
}
// The decision-bearing forms a design record may rely on: those of the concept version its active pin names, when the
// concept is usable as a whole in that release (ruling B5 of 2026-11-18: fail closed). Anything else is nothing, and
// `reasons` says why: no active pin, a release that is not active or does not hold the concept, a form of the concept
// that is not usable there (so no part of the concept is), a concept retired in this project.
// (The pin is written by knowledge.concept-pin, slice S3; until then no command creates one.)
export function conceptDecisionReading(p,pinId){
 const pin=list(knowledgeState(p).conceptPins).find(x=>x?.id===pinId&&x.status==='active');
 if(!pin)return {pinId:pinId??null,conceptId:null,releaseId:null,forms:[],reasons:[String(pinId).slice(0,40)+' is not an active concept pin of this project.']};
 const held=releasedConcepts(p).find(c=>c.conceptId===pin.conceptId&&c.release.id===pin.releaseId),at={pinId:pin.id,conceptId:pin.conceptId,releaseId:pin.releaseId};
 if(!held)return {...at,forms:[],reasons:[pin.releaseId+' is not an active release that holds '+pin.conceptId+' in this project.']};
 if(!held.eligible)return {...at,forms:[],reasons:held.reasons};
 return {...at,forms:held.forms.filter(f=>f.tier==='decision').map(f=>({type:f.type,content:f.content,architectureUnit:f.architectureUnit,receipt:f.receipt})),reasons:[]};
}
export const conceptDecisionForms=(p,pinId)=>conceptDecisionReading(p,pinId).forms;
