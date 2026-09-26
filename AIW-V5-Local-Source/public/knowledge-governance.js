import {COMPOSITION_TOPICS,COMPOSITION_REFERENCES} from './composition-knowledge.js';
import {BRAIN_CATALOGUE} from './brain-catalogue.js';
import {BRAIN_PLAYBOOK} from './brain-playbook.js';
import {digest,sha256} from './brain-integrity.js';
import {candidatePassages,passageIsCurrent} from './knowledge-ingestion.js';

export {BRAIN_CATALOGUE,BRAIN_PLAYBOOK};
const copy=x=>structuredClone(x),list=x=>Array.isArray(x)?x:[];
const text=(v,n=2000)=>typeof v==='string'?v.trim().slice(0,n):'';
const required=(v,name,n=2000)=>{const s=text(v,n);if(!s)throw Error('Record '+name+'.');return s;};
const lines=(v,n=12)=>list(Array.isArray(v)?v:String(v||'').split('\n')).map(x=>text(x,1200)).filter(Boolean).slice(0,n);
export const knowledgeState=p=>p.knowledge||{version:0,counter:0,sources:[],suggestions:[],claims:[],contradictions:[],releases:[],pins:[],withdrawals:[],links:[],history:[]};
const init=p=>p.knowledge||=(copy(knowledgeState(p)));
const next=(s,prefix)=>prefix+'-'+String(++s.counter).padStart(4,'0');
export const catalogueRecord=id=>BRAIN_CATALOGUE.records.find(r=>r.id===id);
export const knowledgeStamp=p=>digest(knowledgeState(p));
export function withdrawn(p,refs){return knowledgeState(p).withdrawals.filter(w=>refs.includes(w.targetId));}
export function knowledgeEligibility(p,claim,release=null){
 const s=knowledgeState(p),source=s.sources.find(x=>x.id===claim?.sourceId),reasons=[];
 if(!claim||!source)return {eligible:false,reasons:['The original source is unavailable.']};
 if(claim.review?.decision!=='verified')reasons.push('The claim has not passed an explicit source and interpretation review.');
 // Four eyes, re-checked on every read: the authenticated identity that verified a claim is not its author's.
 else if(!claim.actor||!claim.review.actor||claim.review.actor===claim.actor)reasons.push('Its author verified it. Another authenticated person must review the claim before it is used.');
 if(claim.review?.claimHash!==digest({...claim,review:undefined}))reasons.push('The review does not match this exact claim.');
 if(claim.sourceHash!==source.hash||sha256(source.body)!==source.hash||sha256(claim.excerpt)!==claim.excerptHash||source.body.split('\n').slice(claim.lineStart-1,claim.lineEnd).join('\n')!==claim.excerpt)reasons.push('The source or passage identity does not match.');
 if(s.sources.some(x=>x.supersedes===source.id&&x.hash!==source.hash))reasons.push('A changed source revision superseded this evidence. Review and release a successor claim.');
 if(s.contradictions.some(c=>c.claimIds.includes(claim.id)&&c.status==='open'&&(!release||c.affectsReleased)))reasons.push('A possible contradiction remains unresolved.');
 if(withdrawn(p,[source.id,claim.id,release?.id]).length)reasons.push('Supporting knowledge has been withdrawn.');
 if((source.origin==='repository-fetch'||source.repository)&&release){
  const sync=s.repositorySync,receipt=sync?.releases?.find(r=>r.id===release.id&&r.checksum===release.checksum&&r.storeId===sync.storeId);
  if(!receipt||receipt.assurance?.eligible!==true||Date.parse(receipt.expiresAt)<=Date.now()||!receipt.sourceIds?.includes(source.id)||!receipt.claimHashes?.some(c=>c.id===claim.id&&c.hash===digest(claim)))reasons.push('The repository claim lacks a current signed release receipt.');
  if(sync?.invalidations?.some(n=>n.identity===[source.repository,source.revision,source.path,source.hash].join('\n')))reasons.push('The signed repository update invalidated this source revision.');
 }
 if(release&&(!s.pins.includes(release.id)||release.checksum!==digest({...release,checksum:undefined})))reasons.push('This exact release is not active for the project.');
 return {eligible:reasons.length===0,reasons};
}
export function releasedClaims(p){
 const s=knowledgeState(p);return s.releases.filter(r=>s.pins.includes(r.id)).flatMap(r=>r.claims.map(c=>({claim:c,release:r,...knowledgeEligibility(p,c,r)})));
}
export function claimReceipt(p,claim,release){const source=knowledgeState(p).sources.find(x=>x.id===claim.sourceId);return {kind:'governed-claim',claimId:claim.id,releaseId:release.id,releaseHash:release.checksum,claimHash:digest(claim),statement:claim.statement,subjectId:claim.subjectId,sourceId:source.id,sourceHash:source.hash,repository:source.repository,revision:source.revision,path:source.path,lineStart:claim.lineStart,lineEnd:claim.lineEnd,excerptHash:claim.excerptHash,conditions:copy(claim.conditions),limitations:copy(claim.limitations),review:copy(claim.review),scoring:false};}
export function claimReceiptCurrent(p,r){const hit=releasedClaims(p).find(x=>x.release.id===r?.releaseId&&x.claim.id===r?.claimId);return !!hit&&hit.eligible&&digest(hit.claim)===r.claimHash&&hit.release.checksum===r.releaseHash;}
export function knowledgeImpact(p,targetId){
 const s=knowledgeState(p),claims=s.releases.flatMap(r=>r.claims.filter(c=>[c.id,c.sourceId,r.id].includes(targetId)).map(c=>c.id));
 const hits=receipt=>receipt&&([receipt.claimId,receipt.sourceId,receipt.releaseId].includes(targetId)||claims.includes(receipt.claimId));
 const links=s.links.filter(l=>l.status!=='retired'&&hits(l.receipt)).map(l=>({kind:'model rationale',id:l.objectId,title:l.reason}));
 const notes=list(p.coauthoring?.narratives).filter(n=>[...(n.generation?.sources||[]),...(n.accepted?.generation?.sources||[])].some(x=>hits(x.receipt))).map(n=>({kind:n.accepted?'accepted passage':'draft passage',id:n.id,title:n.title}));
 const tasks=list(p.coauthoring?.designTasks).filter(t=>t.kind==='architecture'&&['SA-PLAYBOOK',t.methodReceipt?.packId,...list(t.methodReceipt?.sources?.references).map(x=>x.id)].includes(targetId)).map(t=>({kind:'architecture comparison',id:t.id,title:t.title}));
 const measurements=list(p.coauthoring?.designTasks).flatMap(t=>list(t.measurements).filter(m=>m.source.id===targetId).map(m=>({kind:'quality measurement',id:m.id,title:m.metricLabel+' · '+t.title})));
 // Sol's assessments that rested on the withdrawn pack or source.
 const assessments=list(p.coauthoring?.assessments).filter(a=>list(a.sources).some(x=>[x.receipt?.packId,x.receipt?.sourceId,x.receipt?.claimId,x.objectId].includes(targetId)||(targetId==='SA-PLAYBOOK'&&['AIW-PLAYBOOK-2','AIW-PLAYBOOK-3'].includes(x.receipt?.packId)))).map(a=>({kind:'Sol assessment',id:a.id,title:a.title}));
 return [...links,...notes,...tasks,...measurements,...assessments];
}
export const knowledgeImpactStamp=(p,targetId)=>digest([knowledgeStamp(p),targetId,knowledgeImpact(p,targetId)]);
export function methodKnowledgeCurrent(p,receipt){return !withdrawn(p,['SA-PLAYBOOK',BRAIN_PLAYBOOK.id,receipt?.packId,...list(receipt?.sources?.references).map(r=>r.id)]).length;}
function claimRecord(s,src,r,start,end,excerpt,at,actor){
 const type=['definition','applicability','benefit','tradeoff','prerequisite','obligation','risk','anti-pattern-signal','mitigation','component-attribute','relationship'].includes(r.claimType)?r.claimType:null;if(!type)throw Error('Choose a supported claim type.');
 return {id:next(s,'KC'),subjectId:required(r.subjectId,'a concept identifier',180),predicate:required(r.predicate,'the relationship being claimed',180),statement:required(r.statement,'the interpretation'),claimType:type,polarity:['supports','limits','requires','prohibits','neutral'].includes(r.polarity)?r.polarity:'neutral',conditions:lines(r.conditions),limitations:lines(r.limitations),tags:lines(r.tags),sourceId:src.id,sourceHash:src.hash,lineStart:start,lineEnd:end,excerpt,excerptHash:sha256(excerpt),createdAt:at,actor};
}
function flagOverlaps(s,c,at){
 const overlaps=s.claims.filter(x=>x.id!==c.id&&x.subjectId===c.subjectId&&x.predicate===c.predicate&&x.polarity!==c.polarity&&[x.polarity,c.polarity].some(v=>v==='prohibits'||v==='limits'));
 for(const other of overlaps)s.contradictions.push({id:next(s,'KX'),claimIds:[other.id,c.id],status:'open',explanation:'Different polarities for the same subject and predicate. Compare applicability contexts before using either claim.',at});
}
// What the stewards may decide about an item in their queue (knowledge-stewardship.js).
export const STEWARD_DECISIONS={captured:'Captured as project knowledge',holds:'The knowledge and the design stand',revisit:'Revisit the record',withdrawn:'Withdrew what the advice rested on'};
// The original source a disagreement becomes: the project's own record of it. Line 4 is the architect's words.
export function dismissalSourceBody(sa,subject=''){
 const one=v=>String(v??'').replace(/\s+/g,' ').trim();
 return [`Architect's disagreement with Sol's advice · ${one(sa.id)}`,`Concerning: ${one(subject||sa.title)} (Chapter ${one(sa.chapter)})`,`Sol advised: ${one(sa.headline)}`,`The architect disagreed: ${one(sa.reason)}`,`Recorded ${one(sa.at).slice(0,10)} · Sol ${one(sa.model)} · run ${one(sa.runId)}`,`Sol's advice rested on: ${list(sa.sources).map(x=>one(x.title)).join('; ')||'the design’s own readings'}`].join('\n');
}
function assertReview(raw){if(raw.reviewed!==true||!text(raw.reason)||!text(raw.reviewer,180))throw Error('Review the exact change and record the reviewer and rationale.');}
function sourceInput(raw,at,actor,id){
 const body=typeof raw.body==='string'?raw.body:'';if(!body.trim())throw Error('Record the original source text.');if(String(raw.body).length>60000)throw Error('Use a focused source file of at most 60,000 characters.');
 const url=text(raw.url,1000);if(url&&!/^https:\/\/[^\s]+$/.test(url))throw Error('Use an HTTPS source URL.');
 return {id,title:required(raw.title,'a source title',180),body,hash:sha256(body),url,repository:text(raw.repository,160),revision:required(raw.revision,'the source revision or retrieval date',100),path:required(raw.path,'a file path or document locator',500),license:text(raw.license,500),origin:'recorded-original',acquiredAt:at,actor};
}
export function applyKnowledgeCommand(input,command,at=new Date().toISOString(),actor='local-review'){
 const p=copy(input),s=init(p),r=command.payload||{};let selected='';
 if(s.history.length>=2000)throw Error('Export the knowledge history before extending this project further.');
 switch(command.type){
 case 'knowledge.project-source':{
  const original=list(p.coauthoring?.sources).find(x=>x.id===r.sourceId),v=original?.versions?.at(-1);if(!v)throw Error('Choose a saved project source.');
  const existing=s.sources.find(x=>x.projectSource?.id===original.id&&x.projectSource?.revision===v.revision);if(existing)return {document:p,selected:existing.id};
  if(s.sources.length>=100)throw Error('This project has reached its source revision limit.');
  const source=sourceInput({title:v.title,body:v.excerpt||v.text||v.content,path:v.location||'Project source '+original.id,revision:String(v.revision),license:'Project source; review permitted use and interpretation.'},at,actor,next(s,'KS'));
  source.origin='project-source';source.projectSource={id:original.id,revision:v.revision};s.sources.push(source);selected=source.id;break;
 }
 case 'knowledge.source':{
  if(s.sources.length>=100)throw Error('This project has reached its source revision limit.');
  const src=sourceInput(r,at,actor,next(s,'KS'));if(r.supersedes&&!s.sources.some(x=>x.id===r.supersedes))throw Error('Choose an existing source revision.');if(r.supersedes)src.supersedes=r.supersedes;s.sources.push(src);selected=src.id;break;
 }
 case 'knowledge.suggest':{
  const src=s.sources.find(x=>x.id===r.sourceId);if(!src||sha256(src.body)!==src.hash||withdrawn(p,[src.id]).length)throw Error('Choose an available, unchanged source revision.');
  s.suggestions||=[];
  const previous=s.suggestions.find(x=>x.sourceId===src.id&&x.sourceHash===src.hash);if(previous)return {document:p,selected:previous.id};
  const passages=candidatePassages(src);if(!passages.length)throw Error('No bounded prose passages were found in this source. You can still interpret a passage manually.');
  if(s.suggestions.length+passages.length>250)throw Error('This project has reached its passage review limit.');
  for(const passage of passages)s.suggestions.push({...passage,id:next(s,'KP'),createdAt:at,actor});selected=src.id;break;
 }
 case 'knowledge.dismiss-suggestion':{
  const suggestion=(s.suggestions||[]).find(x=>x.id===r.id);if(!suggestion||suggestion.status!=='open')throw Error('Choose an open passage suggestion.');
  suggestion.status='dismissed';suggestion.dismissedAt=at;suggestion.dismissedBy=actor;selected=suggestion.id;break;
 }
 case 'knowledge.claim':{
  if(s.claims.length>=250)throw Error('This project has reached its claim limit.');
  const src=s.sources.find(x=>x.id===r.sourceId);if(!src)throw Error('Choose a saved source revision.');
  const suggestion=r.suggestionId?(s.suggestions||[]).find(x=>x.id===r.suggestionId):null;
  if(r.suggestionId&&(!suggestion||suggestion.status!=='open'||suggestion.sourceId!==src.id||!passageIsCurrent(src,suggestion)))throw Error('The suggested passage has changed or was already handled. Reopen the exact source.');
  const start=Number(r.lineStart),end=Number(r.lineEnd),body=src.body.split('\n');if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>body.length||end-start>100)throw Error('Choose a valid passage of at most 101 lines.');
  const excerpt=body.slice(start-1,end).join('\n');if(!excerpt.trim()||excerpt.length>12000)throw Error('Choose a focused, non-empty source passage.');
  const c=claimRecord(s,src,r,start,end,excerpt,at,actor);
  if(c.claimType!=='definition'&&(!c.conditions.length||!c.limitations.length))throw Error('Record applicability conditions and limitations for this architectural claim.');
  s.claims.push(c);selected=c.id;
  if(suggestion){suggestion.status='interpreted';suggestion.claimId=c.id;suggestion.interpretedAt=at;}
  flagOverlaps(s,c,at);break;
 }
 // Stewardship: an architect's disagreement with Sol becomes an original source — the project's own
 // record of it — and a candidate claim, which then takes the ordinary review, release, activation
 // and link path before Sol reads it. Or the stewards record that the knowledge and design stand.
 case 'knowledge.capture':{
  const sa=list(p.coauthoring?.assessments).find(x=>x.id===r.assessmentId);
  if(!sa||sa.outcome!=='dismissed')throw Error('Choose a disagreement with Sol’s advice.');
  s.stewardship||=[];const key='dismissal:'+sa.id;
  if(s.stewardship.some(d=>d.key===key))throw Error('A steward has already handled this disagreement.');
  if(s.sources.length>=100||s.claims.length>=250)throw Error('This project has reached its knowledge limit.');
  const subject=text(r.subject,300),body=dismissalSourceBody(sa,subject);
  const src={id:next(s,'KS'),title:('Disagreement with Sol · '+sa.id+' · '+(subject||sa.title)).slice(0,180),body,hash:sha256(body),url:'',repository:'',revision:String(sa.at||at).slice(0,10),path:'Sol assessment '+sa.id,license:'Project record: the architect’s own statement.',origin:'architect-dismissal',assessmentId:sa.id,acquiredAt:at,actor};
  const c=claimRecord(s,src,{...r,claimType:r.claimType||'applicability',polarity:r.polarity||'limits',predicate:r.predicate||'limits-advice'},4,4,body.split('\n')[3],at,actor);
  if(!c.conditions.length||!c.limitations.length)throw Error('Record where this knowledge applies and its limits.');
  s.sources.push(src);s.claims.push(c);flagOverlaps(s,c,at);
  s.stewardship.push({id:next(s,'KD'),key,assessmentId:sa.id,decision:'captured',claimId:c.id,sourceId:src.id,objectId:text(r.objectId,100),at,actor,reviewer:text(r.reviewer,180),reason:text(r.reason)});selected=c.id;break;
 }
 case 'knowledge.steward':{
  assertReview(r);const key=text(r.key,120),m=/^(dismissal|withdrawn):(SA-\d{3,5})$/.exec(key),sa=m&&list(p.coauthoring?.assessments).find(x=>x.id===m[2]);
  if(!sa||(m[1]==='dismissal'&&sa.outcome!=='dismissed'))throw Error('Choose an item from the stewards’ queue.');
  if(!['holds','revisit'].includes(r.decision))throw Error('Choose what the project learns from it.');
  s.stewardship||=[];if(s.stewardship.some(d=>d.key===key))throw Error('A steward has already handled this item.');
  s.stewardship.push({id:next(s,'KD'),key,assessmentId:sa.id,decision:r.decision,at,actor,reviewer:text(r.reviewer,180),reason:text(r.reason)});selected=key;break;
 }
 case 'knowledge.review':{
  assertReview(r);const c=s.claims.find(x=>x.id===r.id);if(!c)throw Error('Choose a candidate claim.');if(s.releases.some(x=>x.claims.some(x=>x.id===c.id)))throw Error('Published reviews are immutable. Withdraw the claim or prepare a successor.');
  if(!['verified','rejected','disputed'].includes(r.decision))throw Error('Record a review outcome.');
  if(r.decision==='verified'&&c.actor===actor)throw Error('You wrote this claim. Another authenticated person must verify it.');
  if(r.decision==='verified'&&(!r.sourceChecked||!r.rightsChecked||!r.conditionsChecked))throw Error('Review the original passage, permitted use and applicability conditions.');
  if(r.decision==='verified'&&s.contradictions.some(x=>x.status==='open'&&x.claimIds.includes(c.id)))throw Error('Resolve the possible contradiction before verifying this claim.');
  c.review={decision:r.decision,reviewer:text(r.reviewer,180),actor,at,reason:text(r.reason),sourceChecked:r.sourceChecked===true,rightsChecked:r.rightsChecked===true,conditionsChecked:r.conditionsChecked===true,claimHash:digest({...c,review:undefined})};selected=c.id;break;
 }
 case 'knowledge.contradiction':{
  assertReview(r);const c=s.contradictions.find(x=>x.id===r.id);if(!c)throw Error('Choose a recorded contradiction.');if(!['context-separated','resolved','open'].includes(r.status))throw Error('Choose a contradiction disposition.');
  if(r.status==='context-separated'&&!text(r.distinguishingContexts))throw Error('Explain the distinct conditions under which each claim applies.');
  if(r.status==='resolved'&&!c.claimIds.some(id=>s.claims.find(x=>x.id===id)?.review?.decision==='rejected'))throw Error('Reject the unsupported claim before marking this contradiction resolved.');
  Object.assign(c,{status:r.status,affectsReleased:true,reason:text(r.reason),distinguishingContexts:text(r.distinguishingContexts),reviewer:text(r.reviewer,180),actor,at});selected=c.id;break;
 }
 case 'knowledge.release':{
  assertReview(r);const ids=[...new Set(list(r.claimIds))],claims=ids.map(id=>s.claims.find(c=>c.id===id));if(!ids.length||claims.some(c=>!c))throw Error('Choose the exact reviewed claims to release.');
  for(const c of claims){const check=knowledgeEligibility(p,c);if(!check.eligible)throw Error(c.id+': '+check.reasons.join(' '));}
  if(s.releases.length>=30)throw Error('This project has reached its release limit.');
  const release={id:next(s,'KR'),title:required(r.title,'a release title',180),claims:copy(claims),sourceIds:[...new Set(claims.map(c=>c.sourceId))],createdAt:at,actor,reviewer:text(r.reviewer,180),reason:text(r.reason),supersedes:r.supersedes||null,authority:'Project-reviewed conditional guidance; no scoring or automatic model mutation'};
  if(release.supersedes&&!s.releases.some(x=>x.id===release.supersedes))throw Error('Choose the previous release.');
  release.checksum=digest(release);s.releases.push(release);selected=release.id;break;
 }
 case 'knowledge.activate':{
  assertReview(r);if(r.stamp!==knowledgeStamp(p))throw Error('The knowledge changed. Review activation again.');const release=s.releases.find(x=>x.id===r.id);if(!release)throw Error('Choose a saved release.');
  if(release.claims.some(c=>!knowledgeEligibility(p,c).eligible)||withdrawn(p,[release.id]).length)throw Error('This release contains unavailable or withdrawn support.');
  if(release.claims.some(c=>{const source=s.sources.find(x=>x.id===c.sourceId);return source?.origin==='repository-fetch'||!!source?.repository;})){
   const receipt=s.repositorySync?.releases?.find(x=>x.id===release.id&&x.checksum===release.checksum&&x.storeId===s.repositorySync.storeId);
   if(!receipt||receipt.assurance?.eligible!==true||Date.parse(receipt.expiresAt)<=Date.now()||release.claims.some(c=>{const source=s.sources.find(x=>x.id===c.sourceId);return (source?.origin==='repository-fetch'||!!source?.repository)&&(!receipt.sourceIds.includes(c.sourceId)||!receipt.claimHashes.some(x=>x.id===c.id&&x.hash===digest(c)));}))throw Error('A current signed repository release receipt is required before activation.');
  }
  s.pins=[...s.pins.filter(id=>id!==release.id&&id!==release.supersedes),release.id];selected=release.id;break;
 }
 case 'knowledge.deactivate':{assertReview(r);if(r.stamp!==knowledgeStamp(p)||!s.pins.includes(r.id))throw Error('Review the current active releases before changing the pin.');s.pins=s.pins.filter(id=>id!==r.id);selected=r.id;break;}
 case 'knowledge.withdraw':{
  assertReview(r);const known=[...s.sources,...s.claims,...s.releases].some(x=>x.id===r.id)||['SA-PLAYBOOK',BRAIN_PLAYBOOK.id,'AIW-PLAYBOOK-3','AIW-PRODUCT-MECHANISMS-1','AIW-INTERACTION-1','AIW-READS-1','AIW-PERSISTENCE-1',...Object.keys(COMPOSITION_TOPICS).map(k=>'AIW-COMPOSITION-'+k.toUpperCase()+'-1'),...Object.values(COMPOSITION_REFERENCES).map(r=>r.id)].includes(r.id)||/^MS-|^PG-|^MDB-/.test(r.id);
  if(!known)throw Error('Choose a recorded source, claim, release or method.');if(r.stamp!==knowledgeImpactStamp(p,r.id))throw Error('The affected design changed. Review the withdrawal impact again.');
  if(!s.withdrawals.some(w=>w.targetId===r.id))s.withdrawals.push({id:next(s,'KW'),targetId:r.id,at,actor,reviewer:text(r.reviewer,180),reason:text(r.reason),impact:knowledgeImpact(p,r.id)});selected=r.id;
  // Withdrawn from the stewards' queue: the item is handled by this withdrawal.
  const key=text(r.stewardKey,120);if(/^(dismissal|withdrawn):SA-\d{3,5}$/.test(key)){s.stewardship||=[];if(!s.stewardship.some(d=>d.key===key))s.stewardship.push({id:next(s,'KD'),key,assessmentId:key.split(':')[1],decision:'withdrawn',targetId:r.id,withdrawalId:s.withdrawals.find(w=>w.targetId===r.id).id,at,actor,reviewer:text(r.reviewer,180),reason:text(r.reason)});}
  break;
 }
 case 'knowledge.unlink':{assertReview(r);const link=s.links.find(x=>x.id===r.id);if(!link||link.status==='retired')throw Error('Choose an active rationale link.');link.status='retired';link.retired={at,actor,reviewer:text(r.reviewer,180),reason:text(r.reason)};selected=link.id;break;}
 case 'knowledge.link':{
  assertReview(r);const hit=releasedClaims(p).find(x=>x.claim.id===r.claimId&&x.release.id===r.releaseId&&x.eligible);if(!hit)throw Error('Choose an eligible claim from an active release.');
  const objectId=required(r.objectId,'the model object',100);if(s.links.some(x=>x.status!=='retired'&&x.objectId===objectId&&x.receipt.claimId===hit.claim.id&&x.receipt.releaseId===hit.release.id))throw Error('This claim is already linked to the object.');
  const link={id:next(s,'KL'),objectId,relationship:'informs',reason:text(r.reason),reviewer:text(r.reviewer,180),actor,at,receipt:claimReceipt(p,hit.claim,hit.release)};s.links.push(link);selected=link.id;break;
 }
 default:throw Error('Choose a supported knowledge action.');
 }
 if(JSON.stringify(s).length>8000000)throw Error('This project knowledge collection has reached its storage limit. Export it before extending it.');
 s.version++;s.history.push({at,actor,type:command.type,id:selected,reason:text(r.reason),reviewer:text(r.reviewer,180)});return {document:p,selected};
}
export function knowledgeFindings(p){const s=knowledgeState(p);return s.links.filter(l=>l.status!=='retired'&&!claimReceiptCurrent(p,l.receipt)).map(l=>({id:'knowledge:'+l.id,chapter:11,chapterTitle:'Knowledge support',objectId:l.objectId,level:'warning',title:'Review changed architectural support',detail:l.receipt.claimId+' no longer has eligible support in the active project release. The original rationale is retained.'}));}
export function knowledgeMarkdown(p){const s=knowledgeState(p);if(!s.history.length)return '';return '## Architecture knowledge and source history\n\nActive project releases: '+(s.pins.join(', ')||'Playbook methods only')+'. No calibrated quality scoring.\n\n'+s.links.map(l=>'- '+l.objectId+' ← '+l.receipt.claimId+' / '+l.receipt.releaseId+' · '+(l.status==='retired'?'Retired rationale':claimReceiptCurrent(p,l.receipt)?'Current support':'Support changed; review required')+'\n  '+l.reason+'\n  Source: '+l.receipt.repository+' / '+l.receipt.path+' @ '+l.receipt.revision+' lines '+l.receipt.lineStart+'–'+l.receipt.lineEnd+'; SHA-256 '+l.receipt.sourceHash).join('\n\n')+'\n\n'+s.withdrawals.map(w=>'- Withdrawn '+w.targetId+' · '+w.at+' · '+w.reason).join('\n')+'\n\n';}

export const linkedKnowledge=(p,ids)=>knowledgeState(p).links.filter(l=>l.status!=='retired'&&ids.includes(l.objectId)).map(l=>copy(l.receipt));
export function taskKnowledgeCurrent(p,t){return t.governedKnowledge===undefined||digest(t.governedKnowledge)===digest(linkedKnowledge(p,[t.requirementId,t.driverId]))&&t.governedKnowledge.every(r=>claimReceiptCurrent(p,r));}
