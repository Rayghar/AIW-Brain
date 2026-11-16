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
import {applyKnowledgeCommand,knowledgeState,knowledgeEligibility} from './knowledge-governance.js';
import {verifierRefusal} from './architecture-obligations.js';
import {QUALITY_TYPES} from './quality-domain.js';
import {FORM_TYPES,FORM_CLAIM_TYPE,FORM_PREDICATE,CONCEPT_KINDS,CONCEPT_SCOPES,CONCEPT_ID,conceptFormIssues,conceptFormRecord} from './concept-form.js';
import {conceptRecords,conceptHash} from './knowledge-concepts.js';
import {list} from './util.js';

// A project's bounds, and a knowledge library's (one tranche of a handbook: about sixty concepts and their forms). The
// 30 releases and the 8,000,000 characters of a project's knowledge are the same in both; eligibility never reads the tier.
export const KNOWLEDGE_LIMIT_TIERS=Object.freeze({project:Object.freeze({sources:100,claims:250,concepts:100,topics:100}),library:Object.freeze({sources:300,claims:1000,concepts:300,topics:300})});
export const knowledgeLimits=p=>KNOWLEDGE_LIMIT_TIERS[knowledgeState(p).library?.enabled===true?'library':'project'];
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
const kindRefusal=author=>!author?'A review is a signed-in person\'s own request; this one states no author.':author.account==='agent'?'An agent or Sol reviews nothing: a person signs in to do that.':author.kind==='sol-draft'?'A draft by Sol reviews nothing: a person signs in to do that.':author.kind!=='person'?'An import records what a file says and reviews nothing: a person signs in to do that.':null;
const secondPerson=(record,actor,author)=>verifierRefusal({id:record.id,actor:record.actor,history:record.history,owner:''},actor,author?.account)||kindRefusal(author);
function personOnly(author,actor){const refusal=!actor?'Sign in to record this.':kindRefusal(author);if(refusal)throw Error(refusal);}

function conceptInput(s,r,existing){
 const conceptId=text(r.conceptId,200);
 if(!CONCEPT_ID.test(conceptId)||conceptId.length>80)throw Error('Record the concept identifier: capitals and digits in two to eight hyphenated parts, such as PAT-TRANSACTIONAL-OUTBOX (at most 80 characters).');
 if(existing&&existing.conceptId!==conceptId)throw Error('A concept keeps its identifier: record a successor concept for a rename (successorOf).');
 if(!existing&&list(s.concepts).some(c=>c.conceptId===conceptId))throw Error(conceptId+' is already in the concept register.');
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
  if(!r.enabled&&(s.sources.length>L.sources||s.claims.length>L.claims||list(s.concepts).length>L.concepts||list(s.topics).length>L.topics))throw Error('This project holds more than a project may ('+L.sources+' sources, '+L.claims+' claims, '+L.concepts+' concepts, '+L.topics+' topics): it stays a knowledge library.');
  s.library={enabled:r.enabled,at,actor,reason:text(r.reason)};return 'library';
 }
 case 'knowledge.topic':{
  const t=topicInput(s,r);s.topics||=[];const existing=s.topics.find(x=>x.file===t.file&&x.topicId===t.topicId);
  if(!existing&&s.topics.length>=limits.topics)throw Error('This project has reached its topic limit.');
  const row={id:existing?.id||next('KT'),...t,at,actor};
  if(existing)s.topics[s.topics.indexOf(existing)]=row;else s.topics.push(row);return row.id;
 }
 case 'knowledge.concept':{
  const existing=r.id===undefined?null:concept();
  if(existing?.retired)throw Error(existing.conceptId+' is retired: restore it before editing.');
  const c=conceptInput(s,r,existing);
  if(!existing){
   if(list(s.concepts).length>=limits.concepts)throw Error('This project has reached its concept limit.');
   s.concepts||=[];const id=next('KN');s.concepts.push({id,...c,revision:1,at,actor,lastEditor:actor,history:[{revision:1,at,actor,change:'Created'}]});return id;
  }
  if(existing.history.length>=200)throw Error(existing.conceptId+' has 200 revisions. Record a successor concept.');
  // An edit keeps the author and every earlier editor (they never review it); a review made of another hash lapses on read.
  Object.assign(existing,c,{revision:existing.revision+1,lastEditor:actor});existing.history.push({revision:existing.revision,at,actor,change:text(r.reason,300)||'Edited'});return existing.id;
 }
 case 'knowledge.concept-review':{
  assertReview(r);const c=concept(),refusal=secondPerson(c,actor,author);if(refusal)throw Error(refusal);
  if(!['verified','rejected','disputed'].includes(r.decision))throw Error('Record a review outcome.');
  if(c.retired)throw Error(c.conceptId+' is retired: restore it before reviewing.');
  if(r.decision==='verified'){
   if(r.identityChecked!==true||r.formsChecked!==true||r.crosswalkChecked!==true)throw Error('Check the identity, each form and the crosswalk before verifying the concept.');
   if(c.forms.filter(f=>f.type==='definition').length!==1)throw Error(c.conceptId+' needs its definition before it is verified.');
   // Every form verified by someone other than its author, on its exact passage, with no open contradiction: the release gate.
   for(const f of c.forms){const claim=s.claims.find(x=>x.id===f.claimId),reasons=claim?[...knowledgeEligibility(p,claim).reasons,...conceptFormIssues(claim.form,{excerpt:claim.excerpt,lineStart:claim.lineStart})]:['The claim is unavailable.'];if(reasons.length)throw Error(f.claimId+' ('+f.type+'): '+reasons.join(' '));}
  }
  c.review={decision:r.decision,actor,reviewer:text(r.reviewer,180),at,reason:text(r.reason),identityChecked:r.identityChecked===true,formsChecked:r.formsChecked===true,crosswalkChecked:r.crosswalkChecked===true,conceptHash:conceptHash(c,s.claims)};return c.id;
 }
 case 'knowledge.concept-retire':{personOnly(author,actor);assertReview(r);const c=concept();if(c.retired)throw Error(c.id+' is already retired.');c.retired={at,actor,reviewer:text(r.reviewer,180),reason:text(r.reason)};return c.id;}
 case 'knowledge.concept-restore':{personOnly(author,actor);assertReview(r);const c=concept();if(!c.retired)throw Error(c.id+' is not retired.');delete c.retired;return c.id;}
 default:return undefined;
 }
}
// The form capability of one request: what applyKnowledgeCommand asks when a claim carries a form, when a form claim is
// reviewed or released, and for the register's own types. `author` is the commit's author (authorship.js commitAuthor).
export function formCapability(author=null,limits=KNOWLEDGE_LIMIT_TIERS.project){
 return {
  // A form is stored on a registered concept, under its fixed claim type and predicate, valid against its passage.
  claim(s,r,ctx){
   const type=r.form?.type;if(!FORM_TYPES.includes(type))throw Error(conceptFormIssues(r.form,ctx).join(' '));
   const concept=list(s.concepts).find(c=>c.conceptId===r.subjectId);
   if(!concept)throw Error(String(r.subjectId).slice(0,80)+' is not in the concept register: a form belongs to a registered concept (knowledge.concept).');
   if(concept.retired)throw Error(concept.conceptId+' is retired: restore it before adding a form.');
   if(r.claimType!==FORM_CLAIM_TYPE[type])throw Error(article(type)+' form is '+article(FORM_CLAIM_TYPE[type]).toLowerCase()+' claim (claimType).');
   if(text(r.predicate,180)!==FORM_PREDICATE[type])throw Error(article(type)+' form is claimed as "'+FORM_PREDICATE[type]+'" (its fixed predicate).');
   if(type==='applicability'&&concept.kind!=='topic'&&!Object.hasOwn(r,'architectureUnit'))throw Error('An applicability form of '+article(concept.kind).toLowerCase()+' carries its structured architecture unit (kind, mechanism, effects, obligations).');
   // How it was authored: a person's, an import's, a draft by Sol or an agent account's; a request that states no author is never taken for a person's.
   return {claimType:FORM_CLAIM_TYPE[type],form:conceptFormRecord(r.form,ctx),authoredAs:!author?'import':author.account==='agent'?'agent':author.kind};
  },
  // A form's review is a person's own request; verified, by a second person, with each item checked and the form valid again.
  review(p,c,r,actor){
   const refusal=r.decision==='verified'?secondPerson({id:c.id,actor:c.actor,history:[]},actor,author):kindRefusal(author);if(refusal)throw Error(refusal);
   if(r.decision!=='verified')return;
   if(r.formChecked!==true)throw Error('Check each item of the form against its lines before verifying it (formChecked).');
   const issues=conceptFormIssues(c.form,{excerpt:c.excerpt,lineStart:c.lineStart});if(issues.length)throw Error(c.id+': '+issues.join(' '));
  },
  // Forms are released with their concept: reviewed, whole, by a person who wrote none of them and who did not verify
  // one that was imported or drafted (that one takes a third person). Release parts and versions are slice S3.
  release(p,claims,r,actor){
   const refusal=kindRefusal(author);if(refusal)throw Error(refusal);
   const ids=new Set(claims.map(c=>c.id)),records=conceptRecords(p);
   for(const c of claims.filter(x=>x.form)){
    const concept=records.find(x=>x.conceptId===c.subjectId);
    if(!concept||!concept.forms.some(f=>f.claimId===c.id&&f.type===c.form.type))throw Error(c.id+' is not a form of '+c.subjectId+' as its concept record lists them: attach it to the concept, then have the concept reviewed.');
    if(concept.state!=='reviewed')throw Error(concept.conceptId+' is not reviewed: a second person verifies the concept before its forms are released.');
    const missing=concept.forms.find(f=>!ids.has(f.claimId));if(missing)throw Error(concept.conceptId+' is released whole: add '+missing.claimId+' ('+missing.type+').');
    const wrote=verifierRefusal({id:c.id,actor:c.actor,history:[],owner:''},actor,author?.account);if(wrote)throw Error(wrote);
    if(c.authoredAs!=='person'&&c.review?.actor===actor)throw Error(actor+' verified '+c.id+', which was '+(c.authoredAs==='import'?'imported':'drafted')+': a third person releases it.');
   }
  },
  command:context=>conceptCommand(context,author,limits)
 };
}
export function applyConceptCommand(input,command,at=new Date().toISOString(),actor='local-review',{author=null}={}){
 const limits=knowledgeLimits(input);
 return applyKnowledgeCommand(input,command,at,actor,{forms:formCapability(author,limits),limits});
}
