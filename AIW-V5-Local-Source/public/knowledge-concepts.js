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
const formIssues=claim=>conceptFormIssues(claim?.form,{excerpt:claim?.excerpt,lineStart:claim?.lineStart});
const sourceOf=(s,claim,release)=>release?.organizationId?list(release.sources).find(x=>x.id===claim.sourceId):s.sources.find(x=>x.id===claim.sourceId);
// The form claims that active releases hold (the project's own and the organisation's), each with its eligibility. This
// is the one reader of them: releasedClaims hands no form claim to anyone, whatever its state (ruling B1 of 2026-11-18),
// so no reader of released claims (knowledge structures, the snapshot, the contextual reading, the Brain, Sol's packets,
// a product comparison, a rationale link) receives one.
const releasedForms=p=>{const s=knowledgeState(p);return [...s.releases,...list(s.organizationReleases)].filter(r=>s.pins.includes(r.id)).flatMap(r=>r.claims.filter(c=>c?.form).map(c=>({claim:c,release:r,...knowledgeEligibility(p,c,r)})));};
// The identity of a concept as it stands: its id, title, kind, family and facets, and each form claim exactly as it is
// (its review included, as claimReceipt hashes a claim). Who stewards it and when it is due are not its identity.
export function conceptHash(concept,claims){
 const forms=list(concept.forms).map(f=>{const c=list(claims).find(x=>x.id===f.claimId);return {type:f.type,claimHash:c?digest(c):null};}).sort((a,b)=>order(a.type)-order(b.type)||String(a.claimHash).localeCompare(String(b.claimHash)));
 return digest({conceptId:concept.conceptId,title:concept.title,kind:concept.kind,family:concept.family,scope:concept.scope,stages:concept.stages,lenses:concept.lenses,forms});
}
// This project's concept register, each concept with its hash and derived state. A review stands while its hash is the
// concept's, its reviewer wrote no revision of the concept (verifierRefusal, the one second-person check) and every form
// claim is eligible for release: verified by someone other than its author, on its exact passage, not withdrawn.
// Who wrote a concept, for that check: its author, every editor, and the author of each claim that is one of its forms.
export const conceptAuthors=(c,claims)=>({id:c.id,actor:c.actor,owner:'',history:[...list(c.history),...list(c.forms).map(f=>({revision:0,actor:list(claims).find(x=>x.id===f.claimId)?.actor})).filter(h=>h.actor)]});
export function conceptRecords(p){
 const s=knowledgeState(p);
 return list(s.concepts).map(c=>{
  const hash=conceptHash(c,s.claims),r=c.review,forms=list(c.forms);
  const stands=r?.decision==='verified'&&!!r.actor&&r.conceptHash===hash&&!verifierRefusal(conceptAuthors(c,s.claims),r.actor)&&forms.length>0&&forms.every(f=>{const claim=s.claims.find(x=>x.id===f.claimId);return !!claim?.form&&knowledgeEligibility(p,claim).eligible&&!formIssues(claim).length;});
  return {...c,hash,state:c.retired?'retired':stands?'reviewed':'draft'};
 });
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
 const shown=released||tier==='teaching'&&(st.state==='reviewed'||st.fresh===true);
 return {type,tier,claimId:claim.id,releaseId:release?.id||null,status:st.state,label:st.label,reasons:st.reasons,content:shown?copy(claim.form):null,architectureUnit:released&&claim.architectureUnit?copy(claim.architectureUnit):null,receipt:released?claimReceipt(p,claim,release):null,
  source:{file:source?.sourceFile?.file||source?.path||null,lineStart:claim.lineStart,lineEnd:claim.lineEnd,passageSha256:claim.excerptHash,checkedAt:source?.checkedAt||null,versionScope:source?.versionScope||null}};
}
const byForm=(a,b)=>order(a.type)-order(b.type)||String(a.claimId).localeCompare(String(b.claimId));
// Every concept an active release holds (the project's own and the organisation's), by release: its form claims are the
// release's claims on that subject. A concept is eligible there when each form is released and it has its one definition.
export function releasedConcepts(p){
 const s=knowledgeState(p),groups=new Map();
 for(const h of releasedForms(p)){
  if(!h.claim?.form||!FORM_TYPES.includes(h.claim.form.type))continue;
  const key=h.release.id+'\n'+h.claim.subjectId;if(!groups.has(key))groups.set(key,{conceptId:h.claim.subjectId,release:h.release,forms:[]});
  groups.get(key).forms.push(formEntry(p,h.claim,h.release));
 }
 return [...groups.values()].map(g=>({conceptId:g.conceptId,release:g.release,concept:g.release.organizationId?null:list(s.concepts).find(c=>c.conceptId===g.conceptId)||null,eligible:g.forms.every(f=>f.status==='released')&&g.forms.filter(f=>f.type==='definition').length===1,forms:g.forms.sort(byForm)}));
}
// What a concept reads as here: the register's concept with each of its forms, and the forms active releases hold.
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
 return {conceptId,title:head.title,kind:head.kind,family:head.family,scope:copy(head.scope),stages:copy(head.stages),lenses:copy(head.lenses),state:concept?concept.state:'released',forms:forms.sort(byForm)};
}
// The teaching forms a concept offers here, each with its state and label: released, reviewed, or a candidate nobody reviewed yet.
export function conceptTeachingForms(p,conceptId){
 return list(conceptReading(p,conceptId)?.forms).filter(f=>f.tier==='teaching'&&f.content).map(f=>({type:f.type,status:f.status,label:f.label,content:f.content,receipt:f.receipt}));
}
// The decision-bearing forms a design record may rely on: those of the concept version its active pin names, in state
// released. Anything else is nothing: no pin, a pin that moved or was retired, a release that is not active, a candidate.
// (The pin is written by knowledge.concept-pin, slice S3; until then no command creates one.)
export function conceptDecisionForms(p,pinId){
 const pin=list(knowledgeState(p).conceptPins).find(x=>x?.id===pinId&&x.status==='active');if(!pin)return [];
 const held=releasedConcepts(p).find(c=>c.conceptId===pin.conceptId&&c.release.id===pin.releaseId);
 // The definition is the concept's anchor: without it released there, nothing of the concept is relied on.
 if(!held?.forms.some(f=>f.type==='definition'&&f.status==='released'))return [];
 return list(held.forms).filter(f=>f.tier==='decision'&&f.status==='released').map(f=>({type:f.type,content:f.content,architectureUnit:f.architectureUnit,receipt:f.receipt}));
}
