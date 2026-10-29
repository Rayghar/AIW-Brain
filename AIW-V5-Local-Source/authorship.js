// Who or what wrote a commit (round 12, D-06; workstream D3), a server module. Every saved change records its author
// kind (a person, an import, or a draft by Sol), the account that sent it (a person's, or an agent or service account's),
// whether a person stood behind it when it was saved, and the reason it was sent. A governed batch drafted by Sol is sent
// with reviewed:false and authorKind 'sol-draft': it is accepted as what it is, a draft nobody has reviewed, and never
// has to claim a review nobody made. Its records read "Drafted by Sol · not reviewed" (public/provenance.js) until a
// person reviews them.
//
// Two rules hold whatever is sent:
//   - an agent or service account (AIW_AGENT_ACCOUNTS on the local server, AIW_AGENT_ACTORS in the Worker's settings)
//     is never a person: it never writes as one, and never reviews, confirms, accepts or approves, so it can never be
//     one of four eyes;
//   - a draft by Sol never confirms, accepts or approves anything, whoever sends it.
import {sha256} from './public/brain-integrity.js';
import {COMMIT_KINDS} from './public/provenance.js';
import {EXCERPT_LIMIT} from './public/evidence-domain.js';

const text=(v,n)=>typeof v==='string'?v.trim().slice(0,n):'';
// The agent and service accounts of this workbench (a comma-separated list of account ids).
export function agentActors(env){return new Set(String(env?.AIW_AGENT_ACTORS||'').split(',').map(s=>s.trim()).filter(Boolean));}
export const accountKind=(env,actor)=>agentActors(env).has(actor)?'agent':'person';
export const SESSION_PATTERN=/^[\w:.-]{1,120}$/;
// The commit's author, from the signed-in identity and what the request says of itself: input.authorKind (or, for a
// governed batch, its payload's authorKind as D-06 has it), input.reason (or the batch's reason) and input.session (a
// drafting session's identifier, so that saving a record again within one Sol-draft session opens no change review).
export function commitAuthor({actor,account='person'},input={},command=null,{kind:fallback='person'}={}){
 const payload=command?.payload&&typeof command.payload==='object'?command.payload:{};
 const declared=input?.authorKind??(String(command?.type||'').startsWith('workspace.')?payload.authorKind:undefined);
 if(input?.authorKind!==undefined&&payload.authorKind!==undefined&&input.authorKind!==payload.authorKind)throw Error('The change names two author kinds. Send one.');
 if(declared!==undefined&&!COMMIT_KINDS.includes(declared))throw Error('A change is written by a person, by an import, or drafted by Sol (authorKind person, import or sol-draft).');
 const kind=declared||(account==='agent'?'sol-draft':fallback);
 if(account==='agent'&&kind==='person')throw Error('An agent or service account does not write as a person. Send its changes as a draft by Sol (authorKind sol-draft); a person reviews them.');
 const session=input?.session??payload.session;
 if(session!==undefined&&session!==''&&(typeof session!=='string'||!SESSION_PATTERN.test(session)))throw Error('A drafting session is named by 1 to 120 letters, digits and _ : . -');
 const reason=text(input?.reason,600)||text(payload.reason,600);
 return {kind,id:actor||null,account,reviewed:account!=='agent'&&kind!=='sol-draft',...(reason?{reason}:{}),...(session?{session}:{})};
}
// The commands that record a review, a confirmation, an acceptance or an approval: a draft by Sol and an agent account
// send none of them. The chapter checks (*.review), handoffs and intake reviews are a person's steps too.
const REVIEW_TYPES=new Set(['review','handoff','change.review','change.request','requirements.confirm','requirements.evidence','requirements.modules-accept','decision.record','decision.accept','decision.governance','decision.supersede','techrealisation.approval','techrealisation.record','knowledge.review','knowledge.release','knowledge.activate','knowledge.deactivate','knowledge.withdraw','knowledge.steward','brain.accept','guide.accept','assurance.semantic-review','review.intake','review.disposition','review.trace','review.record','review.baseline','review.governance','review.handoff','review.judgement','review.proposal','review.delivery','review.objective','review.objective-clear','workspace.merge','workspace.set-aside','workspace.governance']);
const REVIEW_SUFFIX=/\.(?:review|handoff|intake)$/;
export const isReviewCommand=type=>REVIEW_TYPES.has(type)||REVIEW_SUFFIX.test(type);
// A payload that claims a review: a confirmation, an acknowledgement, a resolved assumption, a checked source, or a
// reviewed, accepted, approved, verified or confirmed state, at any depth (a reviewed change's inner commands too).
const CLAIMS=['reviewed','confirmed','targetConfirmed','assumptionsResolved','acknowledge','sourceChecked','rightsChecked','conditionsChecked'];
const CLAIMED_STATE=/^(?:reviewed|accepted|approved|verified|confirmed)$/i;
export function claimsReview(value,depth=0){
 if(!value||typeof value!=='object'||depth>8)return null;
 if(Array.isArray(value)){for(const x of value){const c=claimsReview(x,depth+1);if(c)return c;}return null;}
 for(const [k,v] of Object.entries(value)){
  if(CLAIMS.includes(k)&&v===true)return k;
  if((k==='status'||k==='decision')&&typeof v==='string'&&CLAIMED_STATE.test(v.trim()))return k+' '+v.trim().toLowerCase();
  if(v&&typeof v==='object'){const c=claimsReview(v,depth+1);if(c)return c;}
 }
 return null;
}
// Refuses what the author may not do (above), before anything is applied.
export function refuseUnreviewable(command,author){
 if(author.kind!=='sol-draft'&&author.account!=='agent')return;
 const who=author.account==='agent'?'An agent or service account':'A draft by Sol';
 if(isReviewCommand(command?.type))throw Error(who+' does not review, confirm, accept or approve ('+command.type+'). A person signs in to do that.');
 const claim=claimsReview(command?.payload);
 if(claim)throw Error(who+' cannot claim a review ('+claim+'). Send it unreviewed (reviewed:false), unconfirmed and unaccepted; a person reviews it through the review plan.');
}
// The words of an author kind, for an activity row and a journal line.
export const COMMIT_WORDS={person:'Saved by a person',import:'Imported','sol-draft':'Drafted by Sol, not reviewed by a person'};
export function activityTitle(type,author,{count=0}={}){return (COMMIT_WORDS[author?.kind]||COMMIT_WORDS.person)+' · '+type+(count>1?' · '+count+' changes':'');}

// ---------------------------------------------------------------- the brief as an immutable source (GR-GOV-10, -15)
// A brief changed by command adds a version to the brief's evidence source, with its whole text, its SHA-256, who
// changed it and how: the earlier versions stay as they were, so a record drafted from an earlier brief still cites the
// text it was drafted from. A project whose brief was never kept as a source keeps it from this change on: the brief as
// Chapter 1 held it becomes its first version (said so), the changed brief its second. The excerpt shows at most
// EXCERPT_LIMIT characters and says how many the whole text holds and where it is kept.
export const BRIEF_VERSIONS=100;
export function versionBrief(prior,next,author,at){
 const before=String(prior?.brief?.problem??''),after=String(next?.brief?.problem??'');
 if(before===after||!next.brief)return null;
 next.coauthoring??={schemaVersion:1,counters:{source:0,task:0},sources:[],tasks:[]};const m=next.coauthoring;m.counters??={source:0,task:0};
 const pinned=next.brief?.interpreted?.sourceId||prior?.brief?.interpreted?.sourceId;
 let s=m.sources.find(x=>x?.kind==='brief'&&(!pinned||x.id===pinned))||m.sources.find(x=>x?.kind==='brief');
 const version=(textValue,{title,location,status='Unconfirmed',by=null})=>{const hash=sha256(textValue),shown=Math.min(textValue.length,EXCERPT_LIMIT);return {title,location:location+' · text SHA-256 '+hash,version:hash.slice(0,16),date:at.slice(0,10),excerpt:textValue.slice(0,EXCERPT_LIMIT),status,confirmedBy:'',at,text:textValue,hash,...(shown<textValue.length?{excerptOf:{shown,total:textValue.length}}:{}),...(by?{author:by}:{})};};
 const by={kind:author.kind,by:author.id||null,account:author.account};
 const how=author.kind==='sol-draft'?'drafted by Sol (account '+(author.id||'unknown')+'), not reviewed by a person':author.account==='agent'?'sent by the agent account '+(author.id||'unknown'):'changed by '+(author.id||'a person');
 if(!s){
  if(m.sources.length>=30)throw Error('This project keeps 30 evidence sources; the brief cannot be kept as a new one. Retire a source first.');
  s={id:'SRC-'+String(++m.counters.source).padStart(3,'0'),kind:'brief',name:'Project brief',versions:[]};m.sources.push(s);
  if(before.trim())s.versions.push({revision:1,...version(before,{title:'Project brief · as Chapter 1 held it',location:'The brief as Chapter 1 recorded it before its first change by command; it was not kept as a source when it was given'})});
 }else{
  // The version the earlier brief was kept as holds its whole text from now on (a brief kept before round 12 holds an
  // excerpt in its version and the whole text on the source).
  const last=s.versions.at(-1);if(last&&typeof last.text!=='string'&&typeof s.text==='string')Object.assign(last,{text:s.text,...(s.hash?{hash:s.hash}:{})});
 }
 if(s.versions.length>=BRIEF_VERSIONS)throw Error('The brief keeps '+BRIEF_VERSIONS+' versions. Start a separately named brief source to continue.');
 const v={revision:s.versions.length+1,...version(after,{title:'Project brief · version '+(s.versions.length+1),location:'Brief '+how+' on '+at.slice(0,10),by})};
 // The source keeps the text as it was first read (its own text and hash); each version keeps its own whole text.
 s.versions.push(v);s.addedAt??=at;
 return s.id;
}
