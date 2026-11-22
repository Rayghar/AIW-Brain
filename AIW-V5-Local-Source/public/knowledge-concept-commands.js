// The command route's one entry for knowledge.* (rc44, wp1): applyConceptCommand wraps applyKnowledgeCommand and injects
// the form capability and the project's limit tier, so there is still one entry, one history line and one storage bound
// for every knowledge command. Reached by the server (worker.js) and the suites only: no client module imports it.
// It adds the concept register's command types:
//   knowledge.library                    marks a knowledge-library project (the larger limit tier)      a person
//   knowledge.topic                      one row of the topic register per source topic (upsert)        anyone, a draft
//   knowledge.concept                    creates or edits a concept and the claims that are its forms   anyone, a draft
//   knowledge.concept-review             verifies, rejects or disputes a concept                        a second person
//   knowledge.concept-retire / -restore                                                                 a person
// and, on the existing types, the rules of a form: knowledge.claim stores a form only on a registered concept, under its
// fixed claim type and predicate, each item checked against its lines; knowledge.review of a form and knowledge.release
// of forms are a person's own requests, by someone who did not write them.
// Who may review: a second signed-in person, established by the one shared check (verifierRefusal: signed in, not an
// agent, not the author or an editor of any revision) and by the commit's author kind (authorship.js): an agent account,
// a draft by Sol and a request marked as an import review nothing, and neither does a request that states no author.
// Saving a concept, a form or a topic reviews nothing: each is a candidate until that review, and reaches no check.
import {applyKnowledgeCommand,knowledgeState,knowledgeEligibility,KNOWLEDGE_LIMIT_TIERS,knowledgeLimits} from './knowledge-governance.js';
import {verifierRefusal} from './architecture-obligations.js';
import {QUALITY_TYPES} from './quality-domain.js';
import {FORM_TYPES,FORM_CLAIM_TYPE,FORM_PREDICATE,CONCEPT_KINDS,CONCEPT_SCOPES,CONCEPT_ID,RECORD_REFERENCE,ALIAS_SCHEMES,conceptFormIssues,conceptFormRecord} from './concept-form.js';
import {recordGraph} from './record-graph.js';
import {conceptRecords,conceptHash,conceptAuthors,conceptCovered,formIssues,crosswalkRecords,crosswalkRowHash,crosswalkCovered,crosswalkAuthors,crosswalkState} from './knowledge-concepts.js';
import {catalogue} from './catalogue-store.js';
import {catalogueMark,catalogueRelation} from './catalogue-curation.js';
import {templateFields} from './component-snapshot.js';
import {knowledge as playbookEntry} from './playbook-knowledge.js';
import {architectureOptions} from './architecture-knowledge.js';
import {COMPOSITION_TOPICS} from './composition-knowledge.js';
import {copy} from './util.js';
import {digest} from './brain-integrity.js';
import {list} from './util.js';

// A project's bounds and a knowledge library's are defined once, beside the commands they bound (knowledge-governance.js:
// sources, claims, concepts, topics and the lines of the history), so that every caller of a knowledge command reads them.
// They are frozen here, where the commands run (the server and the suites): the route's bundle holds neither.
for(const tier of Object.values(KNOWLEDGE_LIMIT_TIERS))Object.freeze(tier);Object.freeze(KNOWLEDGE_LIMIT_TIERS);
export {KNOWLEDGE_LIMIT_TIERS,knowledgeLimits};
export const REVIEW_TRIGGERS=['product-version','platform-contract','contradicting-incident','new-workload','new-threat','region','quota','classification','runtime','recovery-objective'];
const INTENDED_USES=['foundation','design-method','verification-method','reference','not-imported'],CHANGE_NOTES=['rename','semantic','split','applicability'],FORM_MAX={example:6,exercise:9};
const TOPIC_FIELDS=['id','file','topicId','title','lineStart','lineEnd','sliceSha256','sourceId','declaredKind','intendedUse','conceptId','reason','reviewer'];
const text=(v,n=2000)=>typeof v==='string'?v.trim().slice(0,n):'';
const required=(v,name,n=2000)=>{const s=text(v,n);if(!s)throw Error('Record '+name+'.');return s;};
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'));
const article=word=>(/^[aeiou]/.test(word)?'An ':'A ')+word;
const subset=(v,allowed,max)=>Array.isArray(v)&&v.length<=max&&v.every(x=>allowed.includes(x))&&new Set(v).size===v.length;
function assertReview(raw){if(raw.reviewed!==true||!text(raw.reason)||!text(raw.reviewer,180))throw Error('Review the exact change and record the reviewer and rationale.');}
// A review, a release of forms, a library mark, a retirement: a signed-in person's own request.
// The author must say both: that a person wrote the request (kind) and that a person's account sent it (account). One
// that names no account is nobody's review (the command route always states it: authorship.js commitAuthor).
const kindRefusal=author=>!author?'A review is a signed-in person\'s own request; this one states no author.':author.account==='agent'?'An agent or Sol reviews nothing: a person signs in to do that.':author.kind==='sol-draft'?'A draft by Sol reviews nothing: a person signs in to do that.':author.kind!=='person'?'An import records what a file says and reviews nothing: a person signs in to do that.':author.account!=='person'?'A review is a signed-in person\'s own request; this one states no account of a signed-in person.':null;
const secondPerson=(record,actor,author)=>verifierRefusal({owner:'',...record},actor,author?.account)||kindRefusal(author);
function personOnly(author,actor){const refusal=!actor?'Sign in to record this.':kindRefusal(author);if(refusal)throw Error(refusal);}
// Concepts, topics and forms are written, reviewed and released in a knowledge library, which a person marks (ruling B2
// of 2026-11-18): a design project takes none of them through any command, so its fingerprint, its findings' stamps and
// its recorded reviews never move for a candidate. A design project reads released forms from the organisation's
// release it pins. Plain sources and claims are saved in any project, as before.
const inLibrary=s=>s.library?.enabled===true;
function libraryOnly(s){if(!inLibrary(s))throw Error('Concepts, topics and knowledge forms are written in a knowledge library: a person marks this project as one first (knowledge.library). Plain sources and claims are saved in any project.');}
// Only a person changes what a review covered (ruling B3 of 2026-11-18). An agent account, a draft by Sol, an import and
// a request that states no author write drafts: on a concept a second person verified here at some time, or which a
// release of this project holds (conceptCovered; ruling G2: whether or not that review stands now), they are refused
// whatever would change the concept's hash (a field of its record, its forms, a topic mapped to or from it) and any new
// form claim on it (an opposing one would open a contradiction and lapse the review: B9). On a concept nobody verified
// the same request is accepted. A person's change is accepted and lapses the review, which is then made again.
function onlyAPerson(p,concept,author,what){
 const refusal=kindRefusal(author);
 if(refusal&&conceptCovered(p,concept))throw Error(concept.conceptId+' is reviewed or in a release: only a signed-in person changes what its review covered ('+what+'). '+refusal);
}
// What an upsert would store, against what is stored: equal means there is nothing to write.
const sameFields=(stored,next)=>digest(Object.fromEntries(Object.keys(next).map(k=>[k,stored[k]])))===digest(next);

function conceptInput(p,s,r,existing){
 const conceptId=text(r.conceptId,200);
 // A concept id is not a design record's reference (ruling B7 of 2026-11-18): neither by its shape, a prefix and a
 // number, nor because a record of this project bears it as its id or reference. Readers that look knowledge up by a
 // record's reference (the stewards' reading) can then never meet a concept there.
 if(RECORD_REFERENCE.test(conceptId))throw Error(conceptId.slice(0,80)+' has the shape of a design record\'s reference (a prefix and a number, such as REQ-001): a concept takes an identifier of its own, such as PAT-TRANSACTIONAL-OUTBOX.');
 if(!CONCEPT_ID.test(conceptId)||conceptId.length>80)throw Error('Record the concept identifier: capitals and digits in two to eight hyphenated parts, such as PAT-TRANSACTIONAL-OUTBOX (at most 80 characters).');
 if(existing&&existing.conceptId!==conceptId)throw Error('A concept keeps its identifier: record a successor concept for a rename (successorOf).');
 if(!existing&&list(s.concepts).some(c=>c.conceptId===conceptId))throw Error(conceptId+' is already in the concept register.');
 if(!existing)for(const o of recordGraph(p).objects.values())if(o.id===conceptId||o.ref===conceptId)throw Error(conceptId+' is the reference of a record of this project ('+String(o.title).slice(0,80)+'): a concept takes an identifier of its own.');
 if(!CONCEPT_KINDS.includes(r.kind))throw Error('Choose a concept kind ('+CONCEPT_KINDS.join(', ')+').');
 const scope=r.scope??[],stages=r.stages??[],lenses=r.lenses??[],triggers=r.reviewTriggers??[],lensIds=QUALITY_TYPES.map(t=>t.id);
 if(!subset(scope,CONCEPT_SCOPES,7))throw Error('Choose the concept\'s scope from '+CONCEPT_SCOPES.join(', ')+'.');
 if(!Array.isArray(stages)||stages.some(n=>!Number.isInteger(n)||n<1||n>11)||new Set(stages).size!==stages.length)throw Error('Name the stages the concept serves as chapter numbers 1 to 11.');
 if(!subset(lenses,lensIds,lensIds.length))throw Error('Choose the concept\'s lenses from the Chapter 2 categories ('+lensIds.join(', ')+').');
 if(r.reviewDue!=null&&r.reviewDue!==''&&!day(r.reviewDue))throw Error('Record reviewDue as a date (YYYY-MM-DD).');
 if(!subset(triggers,REVIEW_TRIGGERS,REVIEW_TRIGGERS.length))throw Error('Choose each review trigger from '+REVIEW_TRIGGERS.join(', ')+'.');
 if(r.notAdopted!==undefined&&(!Array.isArray(r.notAdopted)||r.notAdopted.length>12||r.notAdopted.some(x=>!text(x)||x.trim().length>400)))throw Error('Record at most 12 alternatives the source did not adopt, each in at most 400 characters.');
 const earlier={};
 for(const k of ['successorOf','splitFrom']){const id=r[k]??null;if(id!==null&&(id===conceptId||!list(s.concepts).some(c=>c.conceptId===id)))throw Error(String(id).slice(0,80)+' is not in the concept register.');earlier[k]=id;}
 if((earlier.successorOf||earlier.splitFrom)&&(!CHANGE_NOTES.includes(r.changeNote)||!text(r.reason)))throw Error('Say what changed against the earlier concept (changeNote: '+CHANGE_NOTES.join(', ')+') and why (reason).');
 // The forms: claims of this project on this concept, each carrying the form its row names; one definition.
 const forms=r.forms??[],seen=new Set(),count={};
 if(!Array.isArray(forms)||forms.length>40)throw Error('List the concept\'s forms as at most 40 rows of type and claim.');
 const out=forms.map(f=>{
  const claim=list(s.claims).find(c=>c.id===f?.claimId),id=String(f?.claimId).slice(0,40);
  if(!FORM_TYPES.includes(f?.type))throw Error('Choose a supported form type ('+FORM_TYPES.join(', ')+').');
  if(!claim)throw Error(id+' is not a claim of this project.');
  if(!claim.form)throw Error(id+' carries no form.');
  if(claim.subjectId!==conceptId)throw Error(id+' is a form of '+claim.subjectId+', not of '+conceptId+'.');
  if(claim.form.type!==f.type)throw Error(id+' is '+article(claim.form.type).toLowerCase()+' form, not '+article(f.type).toLowerCase()+' form.');
  if(seen.has(id))throw Error(id+' is named twice.');seen.add(id);count[f.type]=(count[f.type]||0)+1;
  return {type:f.type,claimId:claim.id};
 });
 if(count.definition>1)throw Error(conceptId+' has one definition.');
 for(const [type,n] of Object.entries(count))if(n>(FORM_MAX[type]||4))throw Error(conceptId+' holds at most '+(FORM_MAX[type]||4)+' '+type+' forms.');
 return {conceptId,title:required(r.title,'the concept\'s title',180),kind:r.kind,family:text(r.family,120),scope:[...scope].sort(),stages:[...stages].sort((a,b)=>a-b),lenses:[...lenses].sort(),steward:text(r.steward,180),reviewDue:r.reviewDue||null,reviewTriggers:[...triggers].sort(),notAdopted:list(r.notAdopted).map(x=>x.trim()),successorOf:earlier.successorOf,splitFrom:earlier.splitFrom,changeNote:earlier.successorOf||earlier.splitFrom?r.changeNote:null,forms:out};
}
function topicInput(s,r){
 for(const k of Object.keys(r))if(!TOPIC_FIELDS.includes(k))throw Error('A topic has an unsupported field: '+k+'.');
 const file=required(r.file,'the source file of the topic',240),topicId=required(r.topicId,'the topic identifier',80);
 if(!Number.isInteger(r.lineStart)||!Number.isInteger(r.lineEnd)||r.lineStart<1||r.lineEnd<r.lineStart)throw Error('Record the lines of the rendition the topic holds.');
 if(typeof r.sliceSha256!=='string'||!/^[0-9a-f]{64}$/.test(r.sliceSha256))throw Error('Record the SHA-256 of the topic\'s lines (64 hexadecimal characters).');
 const sourceId=r.sourceId??null,source=sourceId===null?null:s.sources.find(x=>x.id===sourceId);
 if(sourceId!==null&&!source)throw Error('Choose a saved source for the topic, or none.');
 if(source&&source.hash!==r.sliceSha256)throw Error('The topic\'s SHA-256 does not match the source that holds its lines.');
 if(!INTENDED_USES.includes(r.intendedUse))throw Error('Choose the topic\'s intended use ('+INTENDED_USES.join(', ')+').');
 const conceptId=r.conceptId??null;
 if(conceptId!==null&&!list(s.concepts).some(c=>c.conceptId===conceptId))throw Error(String(conceptId).slice(0,80)+' is not in the concept register.');
 if((conceptId===null||r.intendedUse==='not-imported')&&!text(r.reason))throw Error('Say why this topic has no concept or is not imported (reason).');
 return {file,topicId,title:required(r.title,'the topic\'s title',240),lineStart:r.lineStart,lineEnd:r.lineEnd,sliceSha256:r.sliceSha256,sourceId,declaredKind:text(r.declaredKind,120),intendedUse:r.intendedUse,conceptId,reason:text(r.reason,600)};
}
// The concept register's own command types, run inside applyKnowledgeCommand's switch (its copy of the document, its
// counter, its history line and storage bound). Returns the selected id, or undefined for a type that is not one.
function conceptCommand({p,s,r,type,at,actor,next},author,limits){
 const concept=()=>{const c=list(s.concepts).find(x=>x.id===r.id);if(!c)throw Error('Choose a concept of this project\'s register.');return c;};
 switch(type){
 case 'knowledge.library':{
  personOnly(author,actor);assertReview(r);if(typeof r.enabled!=='boolean')throw Error('Say whether this project is a knowledge library (enabled: true or false).');
  const L=KNOWLEDGE_LIMIT_TIERS.project;
  if(!r.enabled&&(list(s.concepts).length||list(s.topics).length||s.claims.some(c=>c.form)))throw Error('This project holds concepts, topics or knowledge forms: it stays a knowledge library.');
  if(!r.enabled&&(s.sources.length>L.sources||s.claims.length>L.claims||list(s.concepts).length>L.concepts||list(s.topics).length>L.topics))throw Error('This project holds more than a project may ('+L.sources+' sources, '+L.claims+' claims, '+L.concepts+' concepts, '+L.topics+' topics): it stays a knowledge library.');
  s.library={enabled:r.enabled,at,actor,reason:text(r.reason)};return 'library';
 }
 case 'knowledge.topic':{
  libraryOnly(s);const t=topicInput(s,r),existing=list(s.topics).find(x=>x.file===t.file&&x.topicId===t.topicId);
  // Saved again as it is, a row is not written: no new time, no new actor, no history line.
  if(existing&&sameFields(existing,t))return {selected:existing.id,unchanged:true};
  // The topics mapped to a concept are part of what its review covered.
  const after=[...list(s.topics).filter(x=>x!==existing),t];
  for(const id of new Set([existing?.conceptId,t.conceptId])){const c=list(s.concepts).find(x=>x.conceptId===id);if(c&&conceptHash(c,s.claims,after)!==conceptHash(c,s.claims,s.topics))onlyAPerson(p,c,author,'the topics mapped to it');}
  s.topics||=[];
  if(!existing&&s.topics.length>=limits.topics)throw Error('This project has reached its topic limit.');
  const row={id:existing?.id||next('KT'),...t,at,actor};
  if(existing)s.topics[s.topics.indexOf(existing)]=row;else s.topics.push(row);return row.id;
 }
 case 'knowledge.concept':{
  libraryOnly(s);const existing=r.id===undefined?null:concept();
  if(existing?.retired)throw Error(existing.conceptId+' is retired: restore it before editing.');
  const c=conceptInput(p,s,r,existing);
  if(!existing){
   // A concept is written in a library only, and a library holds one tranche (ruling E3 of 2026-11-18).
   if(list(s.concepts).length>=limits.concepts)throw Error('This knowledge library holds '+limits.concepts+' concepts, one tranche: start another library for the next tranche.');
   s.concepts||=[];const id=next('KN');s.concepts.push({id,...c,revision:1,at,actor,lastEditor:actor,history:[{revision:1,at,actor,change:'Created'}]});return id;
  }
  // Saved again as it is, a concept is not written: no revision, no new time, no new editor, no history line.
  if(sameFields(existing,c))return {selected:existing.id,unchanged:true};
  // A request that is nobody's writes no revision of a covered concept (rulings B3 and E1): one that moves its hash
  // changes what the review covered, and one that does not (its forms in another order, a change note) would still add
  // its sender to the concept's editors, whom the second-person check reads, and so could make the review lapse.
  onlyAPerson(p,existing,author,'its record');
  if(existing.history.length>=200)throw Error(existing.conceptId+' has 200 revisions. Record a successor concept.');
  // An edit keeps the author and every earlier editor (they never review it); a review made of another hash lapses on read.
  Object.assign(existing,c,{revision:existing.revision+1,lastEditor:actor});existing.history.push({revision:existing.revision,at,actor,change:text(r.reason,300)||'Edited'});return existing.id;
 }
 case 'knowledge.concept-review':{
  // Verified by someone who wrote neither the concept (its author, any editor) nor any of its forms.
  libraryOnly(s);assertReview(r);const c=concept(),refusal=secondPerson(conceptAuthors(c,s.claims),actor,author);if(refusal)throw Error(refusal);
  if(!['verified','rejected','disputed'].includes(r.decision))throw Error('Record a review outcome.');
  if(c.retired)throw Error(c.conceptId+' is retired: restore it before reviewing.');
  if(r.decision==='verified'){
   if(r.identityChecked!==true||r.formsChecked!==true||r.crosswalkChecked!==true)throw Error('Check the identity, each form and the crosswalk before verifying the concept.');
   if(c.forms.filter(f=>f.type==='definition').length!==1)throw Error(c.conceptId+' needs its definition before it is verified.');
   // Every form verified by someone other than its author, on its exact passage, with no open contradiction: the release gate.
   for(const f of c.forms){const claim=s.claims.find(x=>x.id===f.claimId),reasons=claim?[...knowledgeEligibility(p,claim).reasons,...formIssues(claim)]:['The claim is unavailable.'];if(reasons.length)throw Error(f.claimId+' ('+f.type+'): '+reasons.join(' '));}
  }
  // The review names the kind of account that made it (a person's: secondPerson refused every other); a read asks for it.
  // A dispute or a rejection of a concept that was verified here keeps who verified it and when (ruling G2 of
  // 2026-11-18): the concept stays covered, and only a person changes it. The key exists only then.
  const before=c.review?.decision==='verified'&&c.review.actor&&c.review.account==='person'?{actor:c.review.actor,at:c.review.at}:c.review?.verifiedBefore;
  // The crosswalk the review checked (ruling P5 c of 2026-11-22): each row of the concept that stands (neither retired nor
  // rejected), as [id, hash, state]. A release holds a row only as this review saw it verified; a concept with no row
  // records no list, so a review of rc44 S1 reads as it did.
  const seen=list(s.crosswalk).filter(x=>x?.conceptId===c.conceptId&&!['retired','rejected'].includes(crosswalkState(x))).map(x=>[x.id,crosswalkRowHash(x),crosswalkState(x)]);
  c.review={decision:r.decision,actor,account:author.account,reviewer:text(r.reviewer,180),at,reason:text(r.reason),identityChecked:r.identityChecked===true,formsChecked:r.formsChecked===true,crosswalkChecked:r.crosswalkChecked===true,conceptHash:conceptHash(c,s.claims,s.topics),...(seen.length?{crosswalkSeen:seen}:{}),...(r.decision!=='verified'&&before?{verifiedBefore:before}:{})};return c.id;
 }
 case 'knowledge.concept-retire':{libraryOnly(s);personOnly(author,actor);assertReview(r);const c=concept();if(c.retired)throw Error(c.id+' is already retired.');c.retired={at,actor,reviewer:text(r.reviewer,180),reason:text(r.reason)};return c.id;}
 // Only an unreleased concept is restored: a retirement of a released one stands, and a successor concept follows it.
 case 'knowledge.concept-restore':{
  libraryOnly(s);personOnly(author,actor);assertReview(r);const c=concept();if(!c.retired)throw Error(c.id+' is not retired.');
  const held=s.releases.find(x=>x.claims.some(k=>k.form&&k.subjectId===c.conceptId));if(held)throw Error(c.conceptId+' is in the release "'+held.title+'": a released concept is not restored. Record a successor concept (successorOf).');
  delete c.retired;return c.id;
 }
 default:return undefined;
 }
}
// The form capability of one request: what applyKnowledgeCommand asks when a claim carries a form, when a form claim is
// reviewed or released, and for the register's own types. `author` is the commit's author (authorship.js commitAuthor).
export function formCapability(author=null,limits=KNOWLEDGE_LIMIT_TIERS.project){
 return {
  // A form is stored on a registered concept, under its fixed claim type and predicate, valid against its passage.
  claim(s,r,ctx){
   libraryOnly(s);const type=r.form?.type;if(!FORM_TYPES.includes(type))throw Error(conceptFormIssues(r.form,ctx).join(' '));
   const concept=list(s.concepts).find(c=>c.conceptId===r.subjectId);
   if(!concept)throw Error(String(r.subjectId).slice(0,80)+' is not in the concept register: a form belongs to a registered concept (knowledge.concept).');
   if(concept.retired)throw Error(concept.conceptId+' is retired: restore it before adding a form.');
   onlyAPerson({knowledge:s},concept,author,'a form of it');
   // A form rests on a source saved in the library. A source fetched from a repository is superseded and withdrawn by
   // the repository's own signed revisions and notices (fetch, transfer, sync), which name no author: they so never
   // reach what a concept rests on (ruling E1).
   const source=s.sources.find(x=>x.id===r.sourceId);
   if(source?.origin==='repository-fetch')throw Error('A knowledge form rests on a source saved in this library (knowledge.source): '+source.id+' was fetched from a repository, which keeps its own signed revisions and withdrawals.');
   if(r.claimType!==FORM_CLAIM_TYPE[type])throw Error(article(type)+' form is '+article(FORM_CLAIM_TYPE[type]).toLowerCase()+' claim (claimType).');
   if(text(r.predicate,180)!==FORM_PREDICATE[type])throw Error(article(type)+' form is claimed as "'+FORM_PREDICATE[type]+'" (its fixed predicate).');
   // The structured unit is the typed, machine-read decision structure: only an applicability form carries one.
   if(type!=='applicability'&&Object.hasOwn(r,'architectureUnit'))throw Error(article(type)+' form carries no structured architecture unit: only an applicability form does.');
   if(type==='applicability'&&concept.kind!=='topic'&&!Object.hasOwn(r,'architectureUnit'))throw Error('An applicability form of '+article(concept.kind).toLowerCase()+' carries its structured architecture unit (kind, mechanism, effects, obligations).');
   // How it was authored: a person's, an import's, a draft by Sol or an agent account's; a request that states no author is never taken for a person's.
   return {claimType:FORM_CLAIM_TYPE[type],form:conceptFormRecord(r.form,{...ctx,claim:{statement:r.statement,conditions:r.conditions,limitations:r.limitations,architectureUnit:r.architectureUnit}}),authoredAs:!author?'import':author.account==='agent'?'agent':author.kind==='person'&&author.account!=='person'?'import':author.kind};
  },
  // A claim that would open a contradiction with a form (the same subject and predicate, another polarity), whether or
  // not it carries a form itself, makes the review of that form's concept lapse until a person resolves it. On a concept
  // that is reviewed or in a release only a person records one (rulings B3 and B9): an opposing claim is no way for a
  // request that is nobody's to make the review lapse first and change the concept afterwards. On a draft concept it
  // opens as on rc.10.73.42.
  opposes(s,c,held){for(const x of held){const concept=list(s.concepts).find(k=>k.conceptId===x.subjectId);if(concept)onlyAPerson({knowledge:s},concept,author,'a claim that contradicts '+x.id+', a form of it');}},
  // No request that is not a person's lowers the standing of a reviewed or released concept (ruling E1 of 2026-11-18).
  // `hits` are the form claims a command would reach through what they rest on (knowledge-governance.js formsRestingOn):
  // a superseding source, a withdrawal, the activation or deactivation of a release. Where the form's concept is covered
  // (verified here at some time, or in a release of the project or of the organisation), only a signed-in person sends
  // it, with today's effect; an import brings a changed rendition as a new source and a person sends the supersession.
  // On a concept nobody verified the request is accepted as on rc.10.73.42. A contradiction that names a form is disposed
  // of by a signed-in person whatever the concept's state: separating the contexts makes a review stand again and
  // reopening them makes it lapse, and an import reviews nothing.
  rests(p,hits){
   const refusal=kindRefusal(author);if(!refusal)return;
   const s=knowledgeState(p);
   for(const {claim:c,what,contradiction} of hits){
    if(contradiction)throw Error(contradiction+' names the knowledge form '+c.id+': a contradiction with a form is disposed of by a signed-in person\'s own request. '+refusal);
    const concept=list(s.concepts).find(k=>k.conceptId===c.subjectId);
    if([...s.releases,...list(s.organizationReleases)].some(x=>x.claims.some(k=>k?.form&&k.subjectId===c.subjectId))||concept&&conceptCovered(p,concept))throw Error(c.subjectId+' is reviewed or in a release: only a signed-in person changes what its review covered ('+what+'). '+refusal);
   }
  },
  // A form's review is a person's own request; verified, by a second person, with each item checked and the form valid again.
  review(p,c,r,actor){
   libraryOnly(knowledgeState(p));const refusal=r.decision==='verified'?secondPerson({id:c.id,actor:c.actor,history:[]},actor,author):kindRefusal(author);if(refusal)throw Error(refusal);
   if(r.decision!=='verified')return;
   if(r.formChecked!==true)throw Error('Check each item of the form against its lines before verifying it (formChecked).');
   const issues=formIssues(c);if(issues.length)throw Error(c.id+': '+issues.join(' '));
  },
  // Forms are released with their concept: reviewed, whole, by a person who wrote none of them and who did not verify
  // one that was imported or drafted (that one takes a third person). Release parts and versions are slice S3.
  release(p,claims,r,actor){
   libraryOnly(knowledgeState(p));const refusal=kindRefusal(author);if(refusal)throw Error(refusal);
   // Forms are released apart from plain claims: a release that holds a form is read by the concept readers only, and
   // every reader of released claims is handed the whole release (ruling B1).
   if(claims.some(c=>!c.form))throw Error('A release holds plain claims or the forms of concepts, not both: release the plain claims in a release of their own.');
   const ids=new Set(claims.map(c=>c.id)),records=conceptRecords(p);
   for(const c of claims.filter(x=>x.form)){
    const concept=records.find(x=>x.conceptId===c.subjectId);
    if(!concept||!concept.forms.some(f=>f.claimId===c.id&&f.type===c.form.type))throw Error(c.id+' is not a form of '+c.subjectId+' as its concept record lists them: attach it to the concept, then have the concept reviewed.');
    if(concept.state!=='reviewed')throw Error(concept.conceptId+' is not reviewed: a second person verifies the concept before its forms are released.');
    const missing=concept.forms.find(f=>!ids.has(f.claimId));if(missing)throw Error(concept.conceptId+' is released whole: add '+missing.claimId+' ('+missing.type+').');
    const wrote=verifierRefusal({id:c.id,actor:c.actor,history:[],owner:''},actor,author?.account);if(wrote)throw Error(wrote);
    if(c.authoredAs!=='person'&&c.review?.actor===actor)throw Error(actor+' verified '+c.id+', which was '+(c.authoredAs==='import'?'imported':'drafted')+': a third person releases it.');
   }
   // The same rule for every crosswalk row the release would hold (ruling P1 of 2026-11-22): not by one who wrote or
   // edited it, not by the person who confirmed a row no person wrote (they stand in its author's place), not by the
   // person who verified a row an import, a draft by Sol or an agent account wrote. Refused, naming the row: none is
   // left out silently.
   for(const x of releaseRows(p,claims)){
    const at=x.id+' ('+x.scheme+' '+x.aliasId+', a crosswalk row of '+x.conceptId+'): ',origin=rowOrigin(x),wrote=verifierRefusal(crosswalkAuthors(x),actor,author?.account);
    if(wrote)throw Error(at+wrote+' A release holds no crosswalk row its releaser wrote: a person who wrote none of the concept\'s forms and rows releases it.');
    if(origin!=='person'&&x.provenance?.reviewed?.by===actor)throw Error(at+actor+' confirmed '+x.id+', which no person wrote, and so stands in its author\'s place: a third person releases it.');
    if(origin!=='person'&&x.review?.actor===actor)throw Error(at+actor+' verified '+x.id+', which was '+(ORIGIN_WORDS[origin]||'written by no person')+': a third person releases it.');
   }
  },
  // What a release of forms holds beside its claims (rc44, wp1 slice S2): the crosswalk rows a second person verified of
  // the concepts it releases, as they read, without the boundary's stamps. The release's checksum covers them, so a row
  // names an identity only as it was released (knowledge-concepts.js releasedCrosswalk). None: no parts at all, so a
  // release of forms without rows is the release of rc44 S1, checksum and all. Parts of concepts and changes: slice S3.
  parts(p,claims){const rows=releaseRows(p,claims).map(r=>Object.fromEntries(Object.entries(copy(r)).filter(([k])=>!RELEASE_LEAVES.includes(k))));return rows.length?{crosswalk:rows}:null;},
  command:context=>conceptCommand(context,author,limits)
 };
}
const RELEASE_LEAVES=['state','provenance','confirmed'];
// The rows a release of these claims holds: the verified rows of the concepts whose forms it releases, each as the
// concept's standing review saw it verified (its id, hash and state; ruling P5 c): a row verified after that review waits
// for the concept's next review, and nothing lapses. One list, which the release-actor rule reads and parts copies.
function releaseRows(p,claims){
 const ids=new Set(claims.filter(c=>c.form).map(c=>c.subjectId)),seen=new Map(list(knowledgeState(p).concepts).filter(c=>ids.has(c.conceptId)).map(c=>[c.conceptId,list(c.review?.crosswalkSeen)]));
 return crosswalkRecords(p).filter(r=>r.state==='verified'&&list(seen.get(r.conceptId)).some(x=>Array.isArray(x)&&x[0]===r.id&&x[1]===crosswalkRowHash(r)&&x[2]==='verified'));
}
// Whose words a row is, by the boundary's author stamp: a person's own ('person'), or the kind its words came from
// (an import; a draft by Sol, which an agent account's commit is too); a row with no stamp is no person's.
const rowOrigin=r=>{const a=r?.provenance?.author;return a?.kind==='person'&&a.by?a.from||'person':a?.kind||null;},ORIGIN_WORDS={import:'imported','sol-draft':'drafted by Sol or by an agent account'};
export function applyConceptCommand(input,command,at=new Date().toISOString(),actor='local-review',{author=null}={}){
 // The mark that makes a project a library is read against a library's history bound: a library recovered here without
 // its mark (recovery-service.js; ruling G5) may hold more history than a project, and a person marks it again.
 const tier=knowledgeLimits(input),limits=command?.type==='knowledge.library'&&command.payload?.enabled===true?{...tier,history:KNOWLEDGE_LIMIT_TIERS.library.history}:tier;
 return applyKnowledgeCommand(input,command,at,actor,{forms:formCapability(author,limits),limits});
}

// ---------------------------------------------------------------- the crosswalk (rc44, wp1 slice S2)
// The commands of the design package p10-knowledge (knowledge-package-server.js registers them through S0's contract;
// design-extension-boundary.js is their boundary), each run inside applyKnowledgeCommand as the register's own types
// are: its copy of the document, its counter, its history line, its bounds.
//   knowledge.crosswalk          proposes or edits a row                                      anyone, a draft
//   knowledge.crosswalk-confirm  a person confirms a row as it reads (ruling F4: the step that puts a person behind a
//                                row only an import, a draft by Sol or an agent account wrote)  a person
//   knowledge.crosswalk-review   verifies or rejects a row                                    a second person
//   knowledge.crosswalk-retire                                                                a person
// Who may take a step is stated on the command and asked by the boundary (person, second): verifierRefusal on the row's
// projection, then two persons (the lead's rulings D1 and D7.1). Nothing here checks it again: the review keeps who
// took it and the kind of their account, and every read asks verifierRefusal and a person's account of that again
// (knowledge-concepts.js crosswalkState). A row's standing is never taken from a request: what it says is checked, its
// targetContent is read here from the catalogue, and its status is derived on every read.
const RELATIONS=['same','narrower','broader','realises','distinct'],ALIAS=/^[A-Za-z0-9][A-Za-z0-9/-]*$/,ID_TOKEN=/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/,ROWS_PER_CONCEPT=24,METHOD_TOPICS=['interaction','reads','persistence',...Object.keys(COMPOSITION_TOPICS)];
// What the catalogue record a row points at holds, as the server reads it (design d.5: the template detector stays out of
// the browser): marked (catalogue-curation.js), a relation stub, the generator's template, or the record's own words. The
// record is the alias of an akr row, and the concept otherwise (a concept takes the id of the catalogue record that is
// the same mechanism, design b.1). A target outside the catalogue has none.
function targetContent(scheme,aliasId,conceptId){
 const id=scheme==='akr'?aliasId:conceptId,record=catalogueRelation(id);
 return !record?undefined:catalogueMark(id)?'marked':record.stub?'stub':templateFields(record).includes('summary')?'template':'authored';
}
// One id names one concept (ruling P3 of 2026-11-22): the alias of a `same` row is not the id of another concept of the
// register, whichever was registered first; asked at the proposal and again at verification.
function oneIdentity(s,aliasId,conceptId){const other=list(s.concepts).find(c=>c.conceptId===aliasId&&c.conceptId!==conceptId);if(other)throw Error(aliasId+' is a concept of this register ('+other.id+'): one id names one concept, so it is no alias the same as '+conceptId+'.');}
// Whether a passage names an id as a whole token: capitals and digits in hyphenated parts, bounded by what is no part of one.
const wholeToken=(text,id)=>ID_TOKEN.test(id)&&String(text||'').split(/[^A-Za-z0-9-]+/).some(t=>t.replace(/^-+|-+$/g,'')===id);
function crosswalkInput(s,r,existing){
 const scheme=r.scheme,aliasId=typeof r.aliasId==='string'?r.aliasId.trim():'',conceptId=text(r.conceptId,200);
 if(scheme==='lens')throw Error('A lens row maps a quality lens to a Chapter 2 category: it is no crosswalk row of a concept (wp1 slice S4).');
 if(!ALIAS_SCHEMES.includes(scheme))throw Error('Choose the alias\'s scheme ('+ALIAS_SCHEMES.filter(x=>x!=='lens').join(', ')+').');
 if(!aliasId||aliasId.length>120||!ALIAS.test(aliasId))throw Error('Record the alias id: letters, digits and hyphens (a method alias also one slash), at most 120 characters.');
 // An alias is no design record's reference (ruling P5 e, as B7 is for a concept id), in any scheme.
 if(RECORD_REFERENCE.test(aliasId))throw Error(aliasId+' has the shape of a design record\'s reference (a prefix and a number, such as REQ-001): an alias names no design record.');
 if(existing&&(existing.scheme!==scheme||existing.aliasId!==aliasId||existing.conceptId!==conceptId))throw Error('A crosswalk row keeps its alias and its concept: propose another row.');
 const concept=list(s.concepts).find(c=>c.conceptId===conceptId);
 if(!concept)throw Error(conceptId.slice(0,80)+' is not in the concept register: a crosswalk row names a registered concept.');
 if(concept.retired)throw Error(conceptId+' is retired: a crosswalk row names a concept that stands.');
 if(!RELATIONS.includes(r.relation))throw Error('Choose how the alias relates to the concept ('+RELATIONS.join(', ')+').');
 if(r.relation==='same')oneIdentity(s,aliasId,conceptId);
 const evidenceClaimId=r.evidenceClaimId??null,evidence=evidenceClaimId===null?null:s.claims.find(c=>c.id===evidenceClaimId),note=text(r.note,600);
 if(evidenceClaimId!==null&&!evidence)throw Error(String(evidenceClaimId).slice(0,40)+' is not a claim of this project.');
 if(scheme==='akr'&&!catalogueRelation(aliasId))throw Error(aliasId+' is neither a catalogue record nor a relation stub of '+catalogue().releaseId+'.');
 if(scheme==='playbook'&&!playbookEntry(aliasId))throw Error(aliasId+' is not an entry of the SA Playbook.');
 if(scheme==='aiw-method'){const [topic,optionId,...rest]=aliasId.split('/');if(rest.length||!METHOD_TOPICS.includes(topic)||!architectureOptions(topic).some(o=>o.id===optionId))throw Error(aliasId+' is not a built-in comparison option (topic/option).');}
 // A handbook alias is a topic of this library or a whole identifier its evidence passage names (ruling P5 e): never a
 // fragment of one or a word.
 if(scheme==='handbook'&&!list(s.topics).some(t=>t.topicId===aliasId)&&!wholeToken(evidence?.excerpt,aliasId))throw Error(aliasId+' is neither a topic of this library nor named by the passage of the claim given as evidence'+(evidence?' ('+evidence.id+')':'')+' as a whole identifier.');
 if(scheme==='external'&&!note)throw Error('Say where the external alias comes from (note).');
 const target=targetContent(scheme,aliasId,conceptId);
 return {conceptId,scheme,aliasId,label:required(r.label,'the alias\'s label',160),relation:r.relation,evidenceClaimId,note,...(target?{targetContent:target}:{})};
}
function crosswalkCommand({p,s,r,type,at,actor,next},author){
 if(!type.startsWith('knowledge.crosswalk'))return undefined;
 libraryOnly(s);
 const find=()=>{const x=list(s.crosswalk).find(y=>y.id===r.id);if(!x)throw Error('Choose a crosswalk row of this library.');return x;};
 switch(type){
 case 'knowledge.crosswalk':{
  const existing=r.id===undefined?null:find();
  if(existing?.retired)throw Error(existing.id+' is retired: a retired crosswalk row is not edited. Propose another row.');
  const x=crosswalkInput(s,r,existing);
  if(!existing){
   const same=list(s.crosswalk).find(y=>!y.retired&&y.scheme===x.scheme&&y.aliasId===x.aliasId&&y.conceptId===x.conceptId);
   if(same)throw Error(x.scheme+' '+x.aliasId+' is already in the crosswalk of '+x.conceptId+' as '+same.id+': edit that row.');
   // The bound counts the rows that stand (ruling P4): a retired or rejected row frees its place, so no run of proposals
   // locks a concept's crosswalk for a person.
   if(list(s.crosswalk).filter(y=>y.conceptId===x.conceptId&&!['retired','rejected'].includes(crosswalkState(y))).length>=ROWS_PER_CONCEPT)throw Error(x.conceptId+' has '+ROWS_PER_CONCEPT+' crosswalk rows that stand (neither retired nor rejected), the most a concept holds: retire or reject one first.');
   s.crosswalk||=[];const id=next('KA');s.crosswalk.push({id,...x,revision:1,at,actor,lastEditor:actor,history:[{revision:1,at,actor,change:'Proposed'}]});return id;
  }
  // Saved again as it is, a row is not written: no revision, no new time, no new editor, no history line.
  if(sameFields(existing,x))return {selected:existing.id,unchanged:true};
  // A row a second person verified here, or a release holds, is changed by a signed-in person only (rulings B3, E1 and
  // G2, read for rows); a request that is nobody's would add its sender to the row's editors and lapse the review.
  const refusal=kindRefusal(author);if(refusal&&crosswalkCovered(p,existing))throw Error(existing.id+' was '+(crosswalkState(existing)==='rejected'?'rejected':'verified')+' here or is in a release: only a signed-in person changes it. '+refusal);
  if(existing.history.length>=200)throw Error(existing.id+' has 200 revisions. Propose another row.');
  // An edit keeps the author and every earlier editor (they never review it); its review lapses on read (it covered the
  // row's hash), and a confirmation was of what the row said before.
  Object.assign(existing,x,{revision:existing.revision+1,lastEditor:actor});if(!x.targetContent)delete existing.targetContent;delete existing.confirmed;
  existing.history.push({revision:existing.revision,at,actor,change:text(r.reason,300)||'Edited'});return existing.id;
 }
 // (ruling P5 f: the steps below are a person's; the boundary refuses every other kind, and a request that states no
 // author or no account is refused here, as the knowledge family's person-only steps are)
 case 'knowledge.crosswalk-confirm':{personOnly(author,actor);assertReview(r);const x=find();if(x.retired)throw Error(x.id+' is retired.');if(x.confirmed===true)return {selected:x.id,unchanged:true};x.confirmed=true;return x.id;}
 case 'knowledge.crosswalk-review':{
  personOnly(author,actor);assertReview(r);const x=find();
  if(!['verified','rejected'].includes(r.decision))throw Error('Record a review outcome (verified or rejected).');
  if(x.retired)throw Error(x.id+' is retired: it is not reviewed.');
  if(r.decision==='verified'){
   if(r.aliasChecked!==true)throw Error('Check the alias against its source and the concept before verifying the row (aliasChecked).');
   const concept=list(s.concepts).find(c=>c.conceptId===x.conceptId);if(!concept||concept.retired)throw Error(x.conceptId+' is not a concept that stands in the register.');
   if(x.relation==='same')oneIdentity(s,x.aliasId,x.conceptId);
   // One verified `same` row per alias: one alias names one concept.
   const other=x.relation==='same'&&crosswalkRecords(p).find(y=>y.id!==x.id&&y.state==='verified'&&y.relation==='same'&&y.scheme===x.scheme&&y.aliasId===x.aliasId&&y.conceptId!==x.conceptId);
   if(other)throw Error(x.scheme+' '+x.aliasId+' is already the same as '+other.conceptId+' ('+other.id+', verified): one alias names one concept. Reject or retire that row first.');
  }
  // Kept under the record's key review (ruling F3), with who took it and the kind of their account as the boundary
  // hands them (ruling D7.1). A rejection of a row verified here keeps who verified it (as a concept's does, ruling G2).
  const before=x.review?.decision==='verified'&&x.review.actor&&x.review.account==='person'?{actor:x.review.actor,at:x.review.at}:x.review?.verifiedBefore;
  x.review={decision:r.decision,actor,account:author?.account??null,reviewer:text(r.reviewer,180),at,reason:text(r.reason),aliasChecked:r.aliasChecked===true,rowHash:crosswalkRowHash(x),...(r.decision!=='verified'&&before?{verifiedBefore:before}:{})};return x.id;
 }
 case 'knowledge.crosswalk-retire':{personOnly(author,actor);assertReview(r);const x=find();if(x.retired)throw Error(x.id+' is already retired.');x.retired={at,actor,reviewer:text(r.reviewer,180),reason:text(r.reason)};return x.id;}
 default:return undefined;
 }
}
// The handler of the package's command types (design-extension-boundary.js calls it as every handler is called):
// applyKnowledgeCommand with the form capability of the request and the crosswalk's command types.
export function applyCrosswalkCommand(input,command,at=new Date().toISOString(),actor='local-review',{author=null}={}){
 const limits=knowledgeLimits(input);
 return applyKnowledgeCommand(input,command,at,actor,{forms:{...formCapability(author,limits),command:context=>crosswalkCommand(context,author)},limits});
}
// The projection a second person's review of a row reads (ruling D7.1), for the boundary.
export const crosswalkSubject=(p,command)=>{const x=list(knowledgeState(p).crosswalk).find(y=>y?.id===command?.payload?.id);return x?{id:x.id,actor:x.actor,owner:'',history:list(x.history).map(h=>({revision:h?.revision,actor:h?.actor}))}:null;};
