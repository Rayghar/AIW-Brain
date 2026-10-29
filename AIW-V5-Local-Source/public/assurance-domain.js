import {generationCurrent} from './aiw-brain.js';
import {journeyIndex} from './journey-context.js';
import {digest} from './brain-integrity.js';
import {PROJECT_LIMITS} from './intake-domain.js';
import {requirementGroups,groupIndex,GROUP_LIMITS} from './requirement-groups.js';
import {groupStamp} from './requirement-links.js';
import {documentCopy} from './document-memo.js';
import {normaliseVerificationObservation,verificationResult} from './architecture-verification.js';
const norm=s=>String(s||'').trim().toLowerCase(),text=(s,n=4000)=>typeof s==='string'?s.trim().slice(0,n):'';
const fmt=n=>Number(n).toLocaleString('en-GB');
// Markup pasted into a source statement (round 12, D-09): HTML tags, a tag cut off mid-attribute, or entities. The clean
// text is the statement with the markup removed, offered for the person to accept; '' when no text remains.
// Only the tags of pasted web content count, so a placeholder such as <account number> is left alone.
const TAGS='(?:a|b|i|u|p|br|hr|em|strong|span|div|font|small|sup|sub|ul|ol|li|table|thead|tbody|tr|td|th|img|pre|code|blockquote|section|article|header|footer|button|input|label|style|script|svg|path|h[1-6])';
const MARKUP=new RegExp(`<\\/?${TAGS}(?:\\s[^<>]*)?\\/?>|<${TAGS}\\s[^<>]*=|&(?:nbsp|amp|lt|gt|quot|#\\d+);`,'i');
export function markupIn(value){
 const s=String(value||'');if(!MARKUP.test(s))return null;
 const cleaned=s.replace(new RegExp(`<\\/?${TAGS}(?:\\s[^<>]*)?\\/?>`,'gi'),' ').replace(new RegExp(`<${TAGS}\\s[^>]*$`,'i'),' ').replace(/&nbsp;/gi,' ').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#(\d+);/g,(m,n)=>String.fromCharCode(Number(n))).replace(/&amp;/gi,'&').replace(/\s+/g,' ').trim();
 return {cleaned};
}
// A requirement's evidence (round 12, D-09): the source's own reference, an evidence key a further sheet brought
// (GR-INT-05: an enrich import keeps a test case, a test execution or an evidence reference on the requirements it
// matched, in `enrichment`, by dataset), a current reviewed test result or observation that links it, or a reviewed
// reason why none exists, recorded while its source row is the one it was recorded against.
export const evidenceTreated=a=>!!a.evidenceTreatment&&(a.evidenceTreatment.basis||null)===(a.provenance?.rowHash||null);
export const EVIDENCE_KEYS=['evidence','testCase','execution'];
export const hasEvidence=a=>!!String(a?.assessment?.evidence??'').trim()||Object.values(a?.enrichment||{}).some(e=>EVIDENCE_KEYS.some(k=>String(e?.fields?.[k]??'').trim()));
// The assertions a further sheet may make beside the requirement sheet's own; a stated one that differs is a conflict.
const ENRICH_ASSERTIONS=[['delivery','Delivery'],['validation','Validation'],['reliability','Reliability']];
// A validation the source states as not done, partial, pending or failed (round 12, GR-INT-04): a delivered requirement
// with one is delivered by assertion only.
export const VALIDATION_OPEN=/\b(?:not|partial\w*|pending|in progress|incomplete|failed|outstanding)\b/i;
// What the person judged of a group of identical statements (GR-SRC-02: requirements.repeated): current while the group
// holds the same requirements and each source row is the one it was judged against.
const repeatBasis=a=>a.provenance?.rowHash||digest(a.description||'');
export const repeatCurrent=(j,members)=>!!j&&members.every(a=>j.basis?.[a.id]===repeatBasis(a));
export const repeatJudgementBasis=members=>Object.fromEntries(members.map(a=>[a.id,repeatBasis(a)]));
// The requirements an assurance record speaks for: those it names, then the members of the groups it links (GR-REQ-15).
export function assuranceRequirementIds(p,r){
 const ids=[...new Set(Array.isArray(r?.requirementIds)?r.requirementIds:[])];if(!r?.requirementGroupIds?.length)return ids;
 const seen=new Set(ids),members=groupIndex(p).members;for(const g of r.requirementGroupIds)for(const m of members.get(g)||[])if(!seen.has(m)){seen.add(m);ids.push(m);}
 return ids;
}
const tally=(m,key,gap)=>{const k=String(key??'').trim();if(!k)return;const x=m.get(k.toLowerCase())||{value:k,count:0,gaps:0};x.count++;x.gaps+=Number(gap);m.set(k.toLowerCase(),x);};
const listed=m=>[...m.values()].sort((a,b)=>b.count-a.count||a.value.localeCompare(b.value));
// Every source assertion read (round 12, GR-INT-04, GR-SRC-02, GR-SRC-04): the delivery gaps; a delivered item that
// needs more assurance (manual work, unstable), whose validation is not complete, or whose comment disagrees; an
// undelivered item marked stable; historical tests that fail, pass or were blocked against the status; the evidence;
// pasted markup; identical statements, each group with its members' statuses, and an error where they disagree until a
// person judges the group; the promise and change categories and the priority bands, counted with their gaps.
export function sourceAssurance(artefacts,project=null){
 const rows=artefacts.filter(a=>a.type==='requirement'),findings=[],groups=new Map(),domains=new Map(),evidenced=new Set(),categories=new Map(),bands=new Map();
 for(const r of project?.assurance?.records||[])if(r.reviewed&&['test-result','observation'].includes(r.kind)&&assuranceCurrent(project,r))for(const id of assuranceRequirementIds(project,r))evidenced.add(id);
 const add=(a,code,title,detail,level='warning',extra={})=>findings.push({id:code+':'+a.id,code,artefactId:a.id,title,detail,level,...extra});
 let deliveryGaps=0,delivered=0,additionalAssurance=0,missingEvidence=0,treated=0,unvalidated=0,gapStable=0,testBlocked=0,enrichConflicts=0,noBand=0;
 for(const a of rows){
  const s=a.assessment;if(!s)continue;
  const isDelivered=norm(s.delivery)==='delivered',gap=!!s.delivery&&!isDelivered,manual=norm(s.manual)==='yes',unstable=['intermittent','untested','unreliable'].includes(norm(s.reliability));
  if(isDelivered)delivered++;if(gap)deliveryGaps++;if(isDelivered&&(manual||unstable))additionalAssurance++;
  if(!hasEvidence(a)&&!evidenced.has(a.id)){missingEvidence++;if(evidenceTreated(a))treated++;else add(a,'source-evidence','Attach evidence for the source assertion',a.evidenceTreatment?'The reason recorded for having no evidence predates a change to the source row. Review the reason again, or link evidence.':'The workbook reports a status but supplies no evidence reference. Importing or confirming the requirement does not verify delivery. Link a reviewed test result or observation, or record why no evidence exists.');}
  const markup=markupIn(a.description);if(markup)add(a,'source-markup','Clean the pasted markup',markup.cleaned?'The statement holds pasted markup. Suggested clean text: “'+markup.cleaned.slice(0,300)+(markup.cleaned.length>300?'…':'')+'”':'The statement holds pasted markup and no requirement text remains without it. Restate the requirement from its source.','warning',{cleaned:markup.cleaned});
  if(isDelivered&&(unstable||manual))add(a,'delivery-assurance','Review assurance of a delivered item',[s.reliability&&'Reliability: '+s.reliability,manual&&'Manual intervention is recorded'].filter(Boolean).join('. ')+'. Keep this separate from the delivery gap count.');
  if(isDelivered&&(/\b(no|not|cannot|can.t|missing|lack(?:s|ing)?|without|doesn.t)\b.{0,90}\b(before|after|histor|audit|support|available|work|implement|capture|record|functional)/i.test(s.comments||'')||/\b(?:not (?:yet )?|yet to (?:be )?)(?:complet(?:e|ed)|implement(?:ed)?|fix(?:ed)?|deliver(?:ed)?|deploy(?:ed)?)\b/i.test(s.comments||'')))add(a,'source-conflict','Reconcile delivery status and source comments','“Delivered” and the source comment may describe different scopes or disagree: '+s.comments+'. Review the release and evidence; neither assertion is automatically authoritative.','error');
  if(isDelivered&&Number(s.uatFail)>0||gap&&Number(s.uatPass)>0)add(a,'test-cycle','Reconcile historical tests with current status','Historical UAT counts and the current delivery assertion need cycle, release, environment and dates. A passing test or a closed defect does not establish complete delivery.');
  // A reviewed, current test result or observation that links the requirement shows the validation and the blocked tests run.
  if(isDelivered&&String(s.validation??'').trim()&&VALIDATION_OPEN.test(s.validation)){unvalidated++;if(!evidenced.has(a.id))add(a,'delivery-validation','Complete the validation of a delivered item','The source says “Delivered” and records its validation as “'+String(s.validation).trim()+'”. Delivery is asserted, not shown: complete the validation and link a reviewed test result or observation that shows it.');}
  // Not delivered (a partly delivered item may be stable in the part delivered) and marked stable (GR-SRC-04).
  if(gap&&!/partial|\bpart(?:ly)?\b/i.test(s.delivery)&&norm(s.reliability)==='stable'){gapStable++;add(a,'gap-stable','Reconcile an undelivered item marked stable','The source says “'+String(s.delivery).trim()+'” and records the reliability as Stable. What is not delivered cannot be stable in use: check which assertion holds.');}
  const blocked=Number(s.uatBlocked)||0;if(blocked>0){testBlocked++;if(!evidenced.has(a.id))add(a,'test-blocked','Clear the blocked tests',fmt(blocked)+' historical test'+(blocked===1?' was':'s were')+' blocked. A blocked test shows neither delivery nor a defect: record what blocked it, run it and link the reviewed test result.');}
  for(const [k,label] of ENRICH_ASSERTIONS){const own=String(s[k]??'').trim(),other=Object.values(a.enrichment||{}).map(e=>String(e?.fields?.[k]??'').trim()).filter(v=>v&&own&&norm(v)!==norm(own));if(other.length){enrichConflicts++;add(a,'enrich-conflict','Reconcile what two sheets assert',label+': the requirement sheet says “'+own+'”, a further sheet says “'+[...new Set(other)].join('”, “')+'”. Neither is taken as true; check the source.');break;}}
  if(a.sourceMissing)add(a,'source-removed','Requirement is absent from the latest source','The requirement and its design links were preserved. Review the source change before retiring it.');
  if(a.provenance?.retainedEdits)add(a,'source-retained','Reconcile retained project edits','The architect kept edited fields while adopting a changed source revision. Compare the current definition with its source.');
  const key=norm(a.description).replace(/\s+/g,' ');if(key){const g=groups.get(key)||[];g.push(a);groups.set(key,g);}
  const domain=a.domain||'Unassigned',d=domains.get(domain)||{name:domain,total:0,deliveryGaps:0,additionalAssurance:0,confirmed:0};d.total++;d.deliveryGaps+=Number(gap);d.additionalAssurance+=Number(isDelivered&&(manual||unstable));d.confirmed+=Number(a.confirmed===true);domains.set(domain,d);
  tally(categories,s.category,gap);if(String(s.priorityBand??'').trim())tally(bands,s.priorityBand,gap);else noBand++;
 }
 // Identical statements, compared (GR-SRC-02): each group with its members' statuses; a group whose stated delivery or
 // reliability differs raises one error per member until a person records "same requirement" or "distinct scope".
 const judged=new Map((project?.assurance?.repeats||[]).map(j=>[j.id,j]));
 const repeated=[...groups.values()].filter(g=>g.length>1).map(g=>{
  const id=digest(g.map(a=>a.id)),statuses=g.map(a=>({id:a.id,externalId:a.externalId||'',delivery:String(a.assessment?.delivery??'').trim(),reliability:String(a.assessment?.reliability??'').trim()}));
  const differ=k=>new Set(statuses.map(x=>norm(x[k])).filter(Boolean)).size>1,j=judged.get(id)||null;
  return {id,title:g[0].description,ids:g.map(a=>a.id),externalIds:g.map(a=>a.externalId),statuses,disagree:differ('delivery')||differ('reliability'),judgement:j?{judgement:j.judgement,reason:j.reason,at:j.at,actor:j.actor,current:repeatCurrent(j,g)}:null,members:g};
 });
 for(const r of repeated)if(r.disagree&&!r.judgement?.current){const said=r.statuses.map(x=>x.id+(x.externalId?' ('+x.externalId+')':'')+': '+[x.delivery,x.reliability].filter(Boolean).join(', ')).join('; ');for(const a of r.members)add(a,'repeat-conflict','Reconcile identical statements that disagree',(r.judgement?'The judgement recorded for this group predates a change to its source rows. ':'')+'The same statement is held by '+said+'. Record whether they are the same requirement or distinct scopes; neither status is taken as true.','error',{group:r.id});}
 for(const r of repeated)delete r.members;
 const conflicting=repeated.filter(r=>r.disagree);
 return {findings,domains:[...domains.values()].sort((a,b)=>b.deliveryGaps-a.deliveryGaps||a.name.localeCompare(b.name)),repeated,categories:listed(categories),bands:listed(bands),
  counts:{requirements:rows.length,assessed:rows.filter(a=>a.assessment).length,delivered,deliveryGaps,additionalAssurance,missingEvidence,evidenceTreated:treated,repeatedGroups:repeated.length,repeatConflicts:conflicting.filter(r=>!r.judgement?.current).length,repeatJudged:conflicting.filter(r=>r.judgement?.current).length,deliveredUnvalidated:unvalidated,gapStable,testBlocked,enrichConflicts,noBand}};
}
export const ASSURANCE_TYPES=['capability','promise','change-request','test-result','defect','observation','value-outcome','ethos-assessment'];
export const ASSURANCE_RELATIONS=['supports','tests','reports defect in','observes','delivers value for','implements promise','requests change to'];
// An assessment (round 12, GR-REQ-15) holds rated dimensions: each a named dimension and the rating the assessor gave
// it, with an optional note, and an overall rating. The ratings are the assessor's words; AIW weighs none of them.
export const ASSESSMENT_KINDS=['ethos-assessment'];
export const ASSESSMENT_LIMITS=Object.freeze({dimensions:20,name:120,rating:80,note:600,objects:30});
const requirementStamp=a=>digest({description:a.description,source:a.provenance?.rowHash||a.source});
// A record's basis is current while every requirement it names says what it said, and every group it links holds what it
// held (requirement-links.js groupStamp: the group's definition and members), and its attached source is unchanged.
export function assuranceCurrent(p,r){const refs=new Map(p.artefacts.map(a=>[a.id,a]));const version=r.sourceEvidence?p.coauthoring?.sources?.find(s=>s.id===r.sourceEvidence.id)?.versions.at(-1):null;if(r.sourceEvidence&&(!version||digest(version)!==r.sourceEvidence.hash)||verificationResult(p,r)?.state==='stale')return false;return r.basis.every(b=>{const a=refs.get(b.id);return a&&requirementStamp(a)===b.stamp;})&&(r.groupBasis||[]).every(g=>groupStamp(p,g.id)===g.stamp);}
function cleanDimensions(raw){
 if(raw==null)return [];if(!Array.isArray(raw))throw Error('Send the dimensions as a list of {name, rating, note}.');
 if(raw.length>ASSESSMENT_LIMITS.dimensions)throw Error(`An assessment holds at most ${ASSESSMENT_LIMITS.dimensions} dimensions; ${raw.length} were sent.`);
 const long=(v,n,label)=>{const t=typeof v==='string'?v.trim():'';if(t.length>n)throw Error(`${label} holds at most ${n} characters; this one has ${t.length}.`);return t;};
 const out=raw.map(d=>({name:long(d?.name,ASSESSMENT_LIMITS.name,'A dimension name'),rating:long(d?.rating,ASSESSMENT_LIMITS.rating,'A rating'),note:long(d?.note,ASSESSMENT_LIMITS.note,'A note')}));
 if(out.some(d=>!d.name||!d.rating))throw Error('Give each dimension its name and the rating the assessor gave it.');
 if(new Set(out.map(d=>d.name.toLowerCase())).size<out.length)throw Error('Name each dimension once.');
 return out.map(d=>d.note?d:{name:d.name,rating:d.rating});
}
export function applyAssuranceCommand(input,command,at,actor){
 const p=documentCopy(input),raw=command.payload||{};p.assurance??={version:1,counter:0,records:[]};const m=p.assurance;
 if(command.type==='assurance.semantic-review'){const f=m.semanticFindings?.find(f=>f.id===raw.id);if(!f||!['open','confirmed interpretation','dismissed'].includes(raw.status)||!text(raw.reason))throw Error('Choose a source challenge, disposition and rationale.');if(raw.reviewed!==true||!generationCurrent(p,f.generation))throw Error('Review current source passages before resolving a challenge.');f.history.push({at,actor,status:f.status,review:f.review});f.status=raw.status;f.review={at,actor,reason:text(raw.reason),stamp:f.generation.packetStamp};
 }else if(command.type==='assurance.group'){
  // Retired in round 12: requirement groups (requirement-groups.js) hold any number of requirements, by name or by rule,
  // and the capability groups recorded here become requirement groups when a group is next saved.
  throw Error('Capability groups are requirement groups now. Create the group on the Requirements page of Chapter 1.');
 }else if(command.type==='assurance.record'){
  if(!ASSURANCE_TYPES.includes(raw.kind))throw Error('Choose a supported assurance record type.');
  // Round 12 (GR-REQ-15): a record links requirements (up to a project's 5,000) and requirement groups of any size; a
  // list past its bound is refused with the bound, never cut.
  const ids=[...new Set(Array.isArray(raw.requirementIds)?raw.requirementIds:[])],groupIds=[...new Set(Array.isArray(raw.requirementGroupIds)?raw.requirementGroupIds:[])];
  if(!ids.length&&!groupIds.length)throw Error('Link this record to requirements or requirement groups.');
  if(ids.length>PROJECT_LIMITS.requirements)throw Error(`Link at most ${fmt(PROJECT_LIMITS.requirements)} requirements; ${fmt(ids.length)} were sent.`);
  if(groupIds.length>GROUP_LIMITS.groups)throw Error(`Link at most ${GROUP_LIMITS.groups} requirement groups; ${fmt(groupIds.length)} were sent.`);
  const known=new Set(p.artefacts.filter(a=>a.type==='requirement').map(a=>a.id)),unknown=ids.filter(id=>!known.has(id));if(unknown.length)throw Error(`Link only requirements of this project: ${unknown.slice(0,3).join(', ')}${unknown.length>3?' and '+(unknown.length-3)+' more':''} ${unknown.length===1?'is':'are'} not.`);
  const groupsKnown=new Set(requirementGroups(p).map(g=>g.id)),unknownGroups=groupIds.filter(id=>!groupsKnown.has(id));if(unknownGroups.length)throw Error(`Choose existing requirement groups: ${unknownGroups.slice(0,3).join(', ')} ${unknownGroups.length===1?'is':'are'} not in this project.`);
  if(!text(raw.title,180)||!text(raw.statement))throw Error('Add the title and original assertion or observed result.');
  if(['test-result','observation'].includes(raw.kind)&&(!text(raw.release,180)||!text(raw.environment,180)||!text(raw.observedAt,80)||!text(raw.cycle,180)))throw Error('Record the release, environment, observation date and test cycle or measurement procedure.');
  const objectIds=[...new Set((raw.objectIds||[]).map(id=>text(id,100)))];if(objectIds.length>ASSESSMENT_LIMITS.objects)throw Error(`Link at most ${ASSESSMENT_LIMITS.objects} project objects; ${objectIds.length} were sent.`);
  if((raw.objectIds||[]).some(id=>!journeyIndex(p).nodes.has(id)))throw Error('Link only existing project objects.');
  const assessment=ASSESSMENT_KINDS.includes(raw.kind),dimensions=cleanDimensions(raw.dimensions),rating=text(raw.rating,ASSESSMENT_LIMITS.rating+1);
  if(!assessment&&(dimensions.length||rating))throw Error('Only an assessment holds rated dimensions.');
  if(rating.length>ASSESSMENT_LIMITS.rating)throw Error(`The overall rating holds at most ${ASSESSMENT_LIMITS.rating} characters.`);
  const old=raw.id?m.records.find(r=>r.id===raw.id):null;if(raw.id&&!old)throw Error('This assurance record is no longer available.');
  if(old&&raw.recordStamp&&raw.recordStamp!==digest(old))throw Error('The observation changed. Reopen its current record before saving.');
  if(old&&old.kind!==raw.kind)throw Error('A record cannot change its evidence type.');
  const source=raw.sourceId?p.coauthoring?.sources?.find(s=>s.id===raw.sourceId):null,version=source?.versions?.at(-1);
  if(raw.sourceId&&!version)throw Error('Choose an existing project source.');
  const sourceEvidence=version?{id:source.id,revision:version.revision,hash:digest(version),location:version.location}:null;
  if(raw.reviewed===true&&(!sourceEvidence||!text(raw.reviewer,180)||!text(raw.reviewNote)))throw Error('A reviewed observation needs its original source, named reviewer and review rationale.');
  const byId=new Map(p.artefacts.map(a=>[a.id,a]));
  const record={id:old?.id||'ASR-'+String(++m.counter).padStart(3,'0'),revision:(old?.revision||0)+1,kind:raw.kind,title:text(raw.title,180),statement:text(raw.statement),requirementIds:ids,...(groupIds.length?{requirementGroupIds:groupIds}:{}),objectIds,status:text(raw.status,100)||'Unverified assertion',owner:text(raw.owner,180),release:text(raw.release,180),environment:text(raw.environment,180),observedAt:text(raw.observedAt,80),cycle:text(raw.cycle,180),sourceEvidence,reviewed:raw.reviewed===true,reviewer:text(raw.reviewer,180),reviewNote:text(raw.reviewNote),...(dimensions.length?{dimensions}:{}),...(rating?{rating}:{}),basis:ids.map(id=>({id,stamp:requirementStamp(byId.get(id))})),...(groupIds.length?{groupBasis:groupIds.map(id=>({id,stamp:groupStamp(p,id)}))}:{}),at,actor,history:old?[...(old.history||[]),(({history,...v})=>v)(old)]:[]};
  const observation=normaliseVerificationObservation(p,record,raw.verificationObservation===undefined?old?.verificationObservation:raw.verificationObservation);
  if(observation)record.verificationObservation=observation;
  if(observation&&sourceEvidence&&(!raw.verificationSource||['id','revision','hash'].some(k=>raw.verificationSource[k]!==sourceEvidence[k])))throw Error('Review the exact evidence source revision before recording this comparison.');
  if(raw.verificationCurrent===true&&verificationResult(p,record)?.state==='stale')throw Error('The architecture check or evidence changed. Reopen the current check before recording this observation.');
  if(old){for(const key of ['feed','externalId','feedHash','feedSnapshot','feedReview'])if(old[key]!==undefined)record[key]=structuredClone(old[key]);m.records[m.records.indexOf(old)]=record;}else m.records.push(record);
 }else throw Error('Unknown assurance action.');
 m.version++;return {document:p};
}
export function semanticFindings(p){return (p.assurance?.semanticFindings||[]).filter(f=>f.status==='open'||!generationCurrent(p,f.generation)).map(f=>({id:f.id,chapter:f.chapter,objectId:f.objectId,artefactId:f.objectId,code:'semantic-challenge',title:f.title,detail:f.explanation+' '+f.question+(generationCurrent(p,f.generation)?'':' Source context changed; the previous disposition needs review.'),level:'warning',authority:'LLM hypothesis requiring architect review'}));}
export function assuranceFindings(p){return [...semanticFindings(p).filter(f=>f.chapter===1),...(p.assurance?.records||[]).flatMap(r=>{
 const source=r.sourceEvidence?p.coauthoring?.sources?.find(s=>s.id===r.sourceEvidence.id)?.versions?.at(-1):null;
 const stale=!assuranceCurrent(p,r)||r.sourceEvidence&&(!source||digest(source)!==r.sourceEvidence.hash);
 return stale?[{id:'assurance-stale:'+r.id,code:'assurance-stale',artefactId:r.requirementIds[0]||assuranceRequirementIds(p,r)[0]||r.requirementGroupIds?.[0],title:'Recheck evidence after a source change',detail:r.id+' · '+r.title+' refers to earlier requirements, requirement groups or source evidence. Historical observations remain intact.',level:'warning'}]:[];
 })];}
export function assuranceMarkdown(p){
 const a=sourceAssurance(p.artefacts,p);if(!a.counts.assessed&&!p.assurance?.records?.length&&!p.assurance?.semanticFindings?.length)return '';
 const c=a.counts,repeats=`${a.repeated.length} repeated-statement groups${c.repeatConflicts?`, ${c.repeatConflicts} of them with source statuses that disagree and no current judgement`:''}${c.repeatJudged?`; ${c.repeatJudged} judged by a person as the same requirement or distinct scopes`:''}; identities are not merged.`;
 const lines=['## Source assertions and delivery assurance','',`${c.assessed} imported assessments: ${c.deliveryGaps} delivery gaps; ${c.additionalAssurance} additional delivered-item assurance cases; ${c.deliveredUnvalidated} delivered without complete validation; ${c.gapStable} undelivered but marked stable; ${c.testBlocked} with blocked tests; ${c.missingEvidence} without an evidence reference${c.evidenceTreated?`, ${c.evidenceTreated} of them with a reviewed reason why none exists`:''}. These counts describe source assertions, not verified delivery.`,repeats,''];
 for(const r of p.assurance?.records||[])lines.push(`### ${r.id} · ${r.title}`,`Type: ${r.kind}. Status: ${r.status}. ${r.reviewed?'Review recorded by '+r.reviewer:'Unverified assertion'}. ${assuranceCurrent(p,r)?'Requirement basis current':'Requirement basis changed'}.`,r.statement,`Requirements: ${r.requirementIds.join(', ')||'none named'}${r.requirementGroupIds?.length?'; requirement groups: '+r.requirementGroupIds.join(', ')+' ('+assuranceRequirementIds(p,r).length+' requirements)':''}. Release: ${r.release||'unspecified'}; environment: ${r.environment||'unspecified'}; cycle/procedure: ${r.cycle||'unspecified'}; observed: ${r.observedAt||'unspecified'}.`,...(r.dimensions?.length||r.rating?[(r.rating?'Overall rating: '+r.rating+'. ':'')+(r.dimensions||[]).map(d=>d.name+': '+d.rating+(d.note?' ('+d.note+')':'')).join('; ')+(r.dimensions?.length?'.':'')]:[]),r.sourceEvidence?`Source: ${r.sourceEvidence.id}, revision ${r.sourceEvidence.revision}, hash ${r.sourceEvidence.hash}.`:'Original evidence not attached.','');
 for(const f of p.assurance?.semanticFindings||[])lines.push('### '+f.id+' · '+f.title,'Advisory source challenge: '+f.kind+'. '+f.status+'. '+(generationCurrent(p,f.generation)?'Current source context.':'Source context changed; review required.'),f.explanation,f.leftRef+': '+f.leftQuote,f.rightRef+': '+f.rightQuote,'Question: '+f.question,...f.sources.map(s=>s.ref+' · '+s.title+' · '+(s.location||s.id)),f.review?'Disposition by '+f.review.actor+': '+f.review.reason:'Architect disposition outstanding.','');
 return lines.join('\n');
}
// ---------------------------------------------------------------- the import summary's reading (round 12)
// What the screens show of the imports (GR-INT-04, GR-SRC-02 to -06; workstream G draws it): the latest requirement
// import with its counts by category, band and priority, the source assertions by cause, its column profile, the
// personal data it withheld, the exact duplicate rows it dropped and the lists of its own requirements the workbook keeps
// elsewhere, each reconciled with AIW's causes; then each enrichment from a further sheet. Pure, over the saved project.
// The causes a workbook's own list of anomalies is compared with: those AIW raises from the status a row asserts.
export const STATUS_CAUSES=['delivery-assurance','gap-stable','delivery-validation','test-blocked','test-cycle','source-conflict','repeat-conflict','enrich-conflict'];
// A list the workbook keeps of its requirements (its own anomaly or exception list), set beside AIW's causes: per cause,
// how many AIW raises, how many of them the list holds and how many it does not; and the list's ids AIW raises none for.
export function reconcileList(p,list,assurance=sourceAssurance(p.artefacts,p)){
 const ext=new Map(p.artefacts.filter(a=>a.type==='requirement').map(a=>[a.id,String(a.externalId||a.id)])),ids=new Set((list?.ids||[]).map(String)),raised=new Map();
 for(const f of assurance.findings)if(STATUS_CAUSES.includes(f.code)){const x=ext.get(f.artefactId);if(!x)continue;if(!raised.has(f.code))raised.set(f.code,new Set());raised.get(f.code).add(x);}
 const byCause=STATUS_CAUSES.filter(c=>raised.has(c)).map(code=>{const s=raised.get(code),both=[...s].filter(x=>ids.has(x)).length;return {code,aiw:s.size,both,aiwOnly:s.size-both};});
 const any=new Set([...raised.values()].flatMap(s=>[...s]));
 return {listed:ids.size,both:[...ids].filter(x=>any.has(x)).length,sourceOnly:[...ids].filter(x=>!any.has(x)),byCause};
}
const priorityOf=a=>['Must','Should','Could'].includes(a.priority)?a.priority:'notStated';
export function importSummary(p){
 const datasets=p?.intake?.datasets||[];if(!datasets.length)return null;
 const main=datasets.filter(d=>d.mode!=='enrich'),latest=main.at(-1)||null,a=sourceAssurance(p.artefacts,p),causes={},priorities={Must:0,Should:0,Could:0,notStated:0};
 for(const f of a.findings)causes[f.code]=(causes[f.code]||0)+1;
 for(const r of p.artefacts)if(r.type==='requirement'&&r.provenance)priorities[priorityOf(r)]++;
 const pending=k=>datasets.reduce((n,d)=>n+(k==='brief'?Number(d.proposals?.brief?.status==='proposed'):(d.proposals?.[k]||[]).filter(x=>x.status==='proposed').length),0);
 const meta=d=>({id:d.id,filename:d.filename,sheet:d.sheet,revision:d.revision,at:d.at,actor:d.actor});
 return {dataset:latest&&{...meta(latest),rows:latest.rowCount,columns:latest.columnCount},counts:a.counts,categories:a.categories,bands:a.bands,priorities,causes,
  profile:latest?.profile||null,personal:latest?.personal||[],duplicates:latest?.duplicates||null,
  lists:(latest?.sourceLists||[]).map(l=>({...l,reconciliation:reconcileList(p,l,a)})),
  repeated:{groups:a.repeated.length,disagree:a.counts.repeatConflicts,judged:a.counts.repeatJudged},
  proposals:{stakeholders:pending('stakeholders'),brief:pending('brief'),outcomes:pending('outcomes'),constraints:pending('constraints')},
  enrichments:datasets.filter(d=>d.mode==='enrich').map(d=>({...meta(d),joinColumn:d.joinColumn,counts:d.counts,duplicates:d.duplicates,blankColumns:d.blankColumns||[],rowReferences:d.rowReferences||[],personal:d.personal||[],unmatched:d.unmatched||[]}))};
}
