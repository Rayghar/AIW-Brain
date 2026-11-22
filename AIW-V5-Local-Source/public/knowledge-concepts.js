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
import {METHOD_CROSSWALK,builtInRow} from './knowledge-crosswalk.js';
import {STYLE_CATALOGUE} from './design-reasoning.js';

const order=type=>FORM_TYPES.indexOf(type);
// A form's issues as its claim stands: against the claim's passage, with the claim's own statement, conditions and
// limitations. The structured unit is the typed, machine-read decision structure, and only an applicability form
// carries one: that is asked here, on every read, as it is at the command (ruling G4 of 2026-11-18), so a unit written
// into a claim of any other form makes the form unusable and is handed to nobody.
export const formIssues=claim=>{
 const type=claim?.form?.type,issues=conceptFormIssues(claim?.form,{excerpt:claim?.excerpt,lineStart:claim?.lineStart,claim:{statement:claim?.statement,conditions:claim?.conditions,limitations:claim?.limitations,architectureUnit:claim?.architectureUnit}});
 return FORM_TYPES.includes(type)&&type!=='applicability'&&Object.hasOwn(claim,'architectureUnit')?[...issues,(/^[aeiou]/.test(type)?'An ':'A ')+type+' form carries no structured architecture unit: only an applicability form does.']:issues;
};
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
 return {conceptId,title:head.title,kind:head.kind,family:head.family,scope:copy(head.scope),stages:copy(head.stages),lenses:copy(head.lenses),state:concept?concept.state:'released',forms:forms.sort(byForm),releases:released.map(c=>({releaseId:c.release.id,title:c.release.title,eligible:c.eligible,reasons:c.reasons})),aliases:conceptAliases(p,conceptId)};
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

// ---------------------------------------------------------------- the crosswalk and one identity (rc44, wp1 slice S2)
// A crosswalk row (knowledge.crosswalk[], KA; written by the design package p10-knowledge, knowledge-concept-commands.js)
// maps an alias {scheme, aliasId} onto a concept of the register, with a relation: same, narrower, broader, realises or
// distinct. Its standing is derived on every read, as a concept's is: retired; verified or rejected, while the review a
// second person recorded stands (taken by a person's account, of the row exactly as it reads now, by someone who wrote
// no revision of it: verifierRefusal on the row's projection, the one rule the boundary asked when the step was taken);
// proposed otherwise. Only a `same` row that a second person verified and an active release of this project holds names
// an identity; a proposed row, a row a document says its own author verified, and a verified row no release holds name
// none, and nothing here is read by a check, a gate, a score or a conformance reading.
// The built-in rows, navigation only (design d.2): the comparison options of scheme aiw-method, and the Playbook's five
// style ids as the same as their catalogue styles, read from STYLE_CATALOGUE, their one definition.
export const BUILT_IN_CROSSWALK=Object.freeze([...METHOD_CROSSWALK,...Object.entries(STYLE_CATALOGUE).map(([alias,id])=>builtInRow('playbook',alias,id,'same'))]);
const CROSSWALK_CONTENT=['id','conceptId','scheme','aliasId','label','relation','evidenceClaimId','note','targetContent'];
// What a row's review covered: what the row says (who wrote it, when, its steps and stamps are bookkeeping).
export const crosswalkRowHash=r=>digest(Object.fromEntries(CROSSWALK_CONTENT.map(k=>[k,r?.[k]??null])));
// Who wrote a row, for the second-person rule: its author and every editor (ruling D7.1: the projection the step reads).
export const crosswalkAuthors=r=>({id:r?.id,actor:r?.actor,owner:'',history:list(r?.history).map(h=>({revision:h?.revision,actor:h?.actor}))});
const rowReview=r=>{const v=r?.review;return !!v&&(v.decision==='verified'||v.decision==='rejected')&&!!v.actor&&v.account==='person'&&v.rowHash===crosswalkRowHash(r)&&!verifierRefusal(crosswalkAuthors(r),v.actor,v.account);};
export const crosswalkState=r=>r?.retired?'retired':rowReview(r)?r.review.decision:'proposed';
export const crosswalkRecords=p=>list(knowledgeState(p).crosswalk).map(r=>({...r,state:crosswalkState(r)}));
// Whether a row is covered as a concept is (rulings B3, E1 and G2 read for rows): a second person verified it here at
// some time, or a release of this project holds it. Only a signed-in person then changes it.
// A row whose review stands, of either decision, is covered too (ruling P5 d of 2026-11-22): a second person's rejection
// is not undone by a request that is nobody's.
export const crosswalkCovered=(p,r)=>{const v=r?.review;return rowReview(r)||!!v?.actor&&v.account==='person'&&(v.decision==='verified'||!!v.verifiedBefore)||knowledgeState(p).releases.some(x=>list(x.parts?.crosswalk).some(y=>y?.id===r?.id));};
// The rows the project's active releases hold as copied (a release of forms holds the verified rows of its concepts,
// parts.crosswalk; an organisation's release carries none until slice S3), from releases as they were made (checksum).
const heldCrosswalk=p=>{const s=knowledgeState(p);return s.releases.filter(r=>s.pins.includes(r.id)&&list(r.parts?.crosswalk).length&&r.checksum===digest({...r,checksum:undefined})).flatMap(release=>release.parts.crosswalk.map(row=>({row,release})));};
// Of those, the rows that still name what they were verified as: the row's review standing as copied, its concept usable
// as a whole in that release, and this project's register holding the row exactly as the release copied it (its hash;
// ruling P5 a), neither retired nor rejected since. Anything else fails closed: a person's later edit, a register that
// lost the row.
export function releasedCrosswalk(p){
 const own=new Map(list(knowledgeState(p).crosswalk).map(r=>[r?.id,r])),held=heldCrosswalk(p),concepts=held.length?releasedConcepts(p):[];
 return held.filter(({row:r,release})=>{const here=own.get(r?.id);return crosswalkState(r)==='verified'&&!!here&&crosswalkRowHash(here)===crosswalkRowHash(r)&&!['retired','rejected'].includes(crosswalkState(here))&&concepts.some(c=>c.release.id===release.id&&c.conceptId===r.conceptId&&c.eligible);});
}
const BUILT_IN_WORDS='AIW built-in mapping, not reviewed by a person';
// The one resolver of identity: the concept an id names, {conceptId, relation, via: {scheme, aliasId, rowId, releaseId},
// authority: 'governed'}, or null. In order: an id that is itself a concept an active release holds, usable as a whole;
// a released `same` row. An alias two rows give two concepts names none. `scheme` narrows the aliases read. It answers
// governed identities only (ruling P6 of 2026-11-22): no built-in row answers it; builtInNavigation reads those.
export function resolveConcept(p,id,scheme=null){
 if(typeof id!=='string'||!id)return null;
 // One id names one concept (ruling P3 of 2026-11-22): an id that is a usable released concept and, in any scheme, a
 // governed alias the same as another concept names none.
 return resolveIn(releasedCrosswalk(p),releasedConcepts(p),id,scheme);
}
// The resolver's own rule over the released rows and concepts read once (conceptAliases asks it for each row).
function resolveIn(rows,concepts,id,scheme){
 if(typeof id!=='string'||!id)return null;
 const fits=r=>r.relation==='same'&&r.aliasId===id&&(!scheme||r.scheme===scheme),one=list=>new Set(list.map(r=>r.conceptId)).size===1;
 const own=concepts.filter(c=>c.eligible&&c.conceptId===id);
 if(own.length&&rows.some(h=>h.row.relation==='same'&&h.row.aliasId===id&&h.row.conceptId!==id))return null;
 if(own.length&&!scheme)return {conceptId:id,relation:'same',via:{scheme:'concept',aliasId:id,rowId:null,releaseId:own[0].release.id},authority:'governed'};
 const governed=rows.filter(h=>fits(h.row));
 if(governed.length)return one(governed.map(h=>h.row))?{conceptId:governed[0].row.conceptId,relation:'same',via:{scheme:governed[0].row.scheme,aliasId:id,rowId:governed[0].row.id,releaseId:governed[0].release.id},authority:'governed'}:null;
 return null;
}
// The built-in rows of an alias, for navigation only (ruling P6): AIW's own table, reviewed by no person, answered under a
// name that says so and with no conceptId at its top level, so that no reader can take it for an identity.
// {navigation: [{scheme, aliasId, targetId, relation}], authority: 'built-in', label} or null.
export function builtInNavigation(id,scheme=null){
 const rows=BUILT_IN_CROSSWALK.filter(r=>r.aliasId===id&&(!scheme||r.scheme===scheme));
 return rows.length?{navigation:rows.map(r=>({scheme:r.scheme,aliasId:r.aliasId,targetId:r.conceptId,relation:r.relation})),authority:'built-in',label:BUILT_IN_WORDS+': navigation only, never an identity'}:null;
}
// The aliases of a concept, for the concept view: its rows in the register with their standing (released when an
// active release holds the row as verified and the register still reads it so), and beside it what an active release
// holds of the row (ruling P5 a): `register` is the register's state, `release` the release's copy and whether it still
// resolves. A row a release holds that the register does not is listed as unregistered. Then the built-in rows that name it.
export function conceptAliases(p,conceptId){
 const held=heldCrosswalk(p).filter(h=>h.row.conceptId===conceptId),rows=releasedCrosswalk(p),released=rows.filter(h=>h.row.conceptId===conceptId),out=[];
 const entry=(r,state,register,h,ok)=>({scheme:r.scheme,aliasId:r.aliasId,label:r.label,relation:r.relation,state,register,release:h?{releaseId:h.release.id,relation:h.row.relation,resolves:ok}:null,authority:'governed',targetContent:r.targetContent??null,rowId:r.id,releaseId:state==='released'?h.release.id:null});
 // A released row reads as released only while the resolver answers through it (the lead's follow-up to P3): a `same`
 // row whose alias another usable concept bears resolves nothing, so it reads as the register holds it, with its release
 // beside it; a row of another relation is released navigation and resolves no identity.
 // (resolves: the resolver answers through the row for its scheme, and the bare id a chip passes names the same concept)
 const concepts=released.length?releasedConcepts(p):[];
 const through=h=>h.row.relation==='same'&&resolveIn(rows,concepts,h.row.aliasId,h.row.scheme)?.via?.rowId===h.row.id&&resolveIn(rows,concepts,h.row.aliasId,null)?.conceptId===h.row.conceptId;
 for(const r of crosswalkRecords(p))if(r.conceptId===conceptId){const ok=released.find(x=>x.row.id===r.id),go=!!ok&&through(ok);out.push(ok&&(go||ok.row.relation!=='same')?entry(ok.row,'released',r.state,ok,go):entry(r,r.state,r.state,ok||held.find(x=>x.row.id===r.id),false));}
 for(const h of held)if(!out.some(x=>x.rowId===h.row.id))out.push(entry(h.row,'unregistered',null,h,false));
 for(const r of BUILT_IN_CROSSWALK)if(r.conceptId===conceptId)out.push({scheme:r.scheme,aliasId:r.aliasId,label:BUILT_IN_WORDS,relation:r.relation,state:'built-in',register:null,release:null,authority:'built-in',targetContent:null,rowId:null,releaseId:null});
 return out;
}
