import {generationCurrent} from './aiw-brain.js';
import {journeyIndex} from './journey-context.js';
import {digest} from './brain-integrity.js';
const norm=s=>String(s||'').trim().toLowerCase(),text=(s,n=4000)=>typeof s==='string'?s.trim().slice(0,n):'';
export function sourceAssurance(artefacts){
 const rows=artefacts.filter(a=>a.type==='requirement'),findings=[],groups=new Map(),domains=new Map();
 const add=(a,code,title,detail,level='warning',extra={})=>findings.push({id:code+':'+a.id,code,artefactId:a.id,title,detail,level,...extra});
 let deliveryGaps=0,delivered=0,additionalAssurance=0,missingEvidence=0;
 for(const a of rows){
  const s=a.assessment;if(!s)continue;
  const isDelivered=norm(s.delivery)==='delivered',gap=!!s.delivery&&!isDelivered,manual=norm(s.manual)==='yes',unstable=['intermittent','untested','unreliable'].includes(norm(s.reliability));
  if(isDelivered)delivered++;if(gap)deliveryGaps++;if(isDelivered&&(manual||unstable))additionalAssurance++;
  if(!s.evidence){missingEvidence++;add(a,'source-evidence','Attach evidence for the source assertion','The workbook reports a status but supplies no evidence reference. Importing or confirming the requirement does not verify delivery.');}
  if(isDelivered&&(unstable||manual))add(a,'delivery-assurance','Review assurance of a delivered item',[s.reliability&&'Reliability: '+s.reliability,manual&&'Manual intervention is recorded'].filter(Boolean).join('. ')+'. Keep this separate from the delivery gap count.');
  if(isDelivered&&(/\b(no|not|cannot|can.t|missing|lack(?:s|ing)?|without|doesn.t)\b.{0,90}\b(before|after|histor|audit|support|available|work|implement|capture|record|functional)/i.test(s.comments||'')||/\b(?:not (?:yet )?|yet to (?:be )?)(?:complet(?:e|ed)|implement(?:ed)?|fix(?:ed)?|deliver(?:ed)?|deploy(?:ed)?)\b/i.test(s.comments||'')))add(a,'source-conflict','Reconcile delivery status and source comments','“Delivered” and the source comment may describe different scopes or disagree: '+s.comments+'. Review the release and evidence; neither assertion is automatically authoritative.','error');
  if(isDelivered&&Number(s.uatFail)>0||gap&&Number(s.uatPass)>0)add(a,'test-cycle','Reconcile historical tests with current status','Historical UAT counts and the current delivery assertion need cycle, release, environment and dates. A passing test or a closed defect does not establish complete delivery.');
  if(a.sourceMissing)add(a,'source-removed','Requirement is absent from the latest source','The requirement and its design links were preserved. Review the source change before retiring it.');
  if(a.provenance?.retainedEdits)add(a,'source-retained','Reconcile retained project edits','The architect kept edited fields while adopting a changed source revision. Compare the current definition with its source.');
  const key=norm(a.description).replace(/\s+/g,' ');if(key){const g=groups.get(key)||[];g.push(a);groups.set(key,g);}
  const domain=a.domain||'Unassigned',d=domains.get(domain)||{name:domain,total:0,deliveryGaps:0,additionalAssurance:0,confirmed:0};d.total++;d.deliveryGaps+=Number(gap);d.additionalAssurance+=Number(isDelivered&&(manual||unstable));d.confirmed+=Number(a.confirmed===true);domains.set(domain,d);
 }
 const repeated=[...groups.values()].filter(g=>g.length>1).map(g=>({id:digest(g.map(a=>a.id)),title:g[0].description,ids:g.map(a=>a.id),externalIds:g.map(a=>a.externalId)}));
 return {findings,domains:[...domains.values()].sort((a,b)=>b.deliveryGaps-a.deliveryGaps||a.name.localeCompare(b.name)),repeated,counts:{requirements:rows.length,assessed:rows.filter(a=>a.assessment).length,delivered,deliveryGaps,additionalAssurance,missingEvidence,repeatedGroups:repeated.length}};
}
export const ASSURANCE_TYPES=['capability','promise','change-request','test-result','defect','observation','value-outcome','ethos-assessment'];
export const ASSURANCE_RELATIONS=['supports','tests','reports defect in','observes','delivers value for','implements promise','requests change to'];
export function assuranceCurrent(p,r){const refs=new Map(p.artefacts.map(a=>[a.id,a]));const version=r.sourceEvidence?p.coauthoring?.sources?.find(s=>s.id===r.sourceEvidence.id)?.versions.at(-1):null;if(r.sourceEvidence&&(!version||digest(version)!==r.sourceEvidence.hash))return false;return r.basis.every(b=>{const a=refs.get(b.id);return a&&digest({description:a.description,source:a.provenance?.rowHash||a.source})===b.stamp;});}
export function applyAssuranceCommand(input,command,at,actor){
 const p=structuredClone(input),raw=command.payload||{};p.assurance??={version:1,counter:0,records:[],groups:[]};const m=p.assurance;
 if(command.type==='assurance.semantic-review'){const f=m.semanticFindings?.find(f=>f.id===raw.id);if(!f||!['open','confirmed interpretation','dismissed'].includes(raw.status)||!text(raw.reason))throw Error('Choose a source challenge, disposition and rationale.');if(raw.reviewed!==true||!generationCurrent(p,f.generation))throw Error('Review current source passages before resolving a challenge.');f.history.push({at,actor,status:f.status,review:f.review});f.status=raw.status;f.review={at,actor,reason:text(raw.reason),stamp:f.generation.packetStamp};
 }else if(command.type==='assurance.group'){
  const ids=[...new Set(raw.requirementIds||[])];if(ids.length<2||ids.length>100||ids.some(id=>!p.artefacts.some(a=>a.id===id&&a.type==='requirement')))throw Error('Select 2–100 existing requirements to relate without merging their identities.');
  if(!text(raw.reason)||!text(raw.title,180))throw Error('Name the capability group and explain the relationship.');
  m.groups.push({id:'GRP-'+String(++m.counter).padStart(3,'0'),title:text(raw.title,180),requirementIds:ids,reason:text(raw.reason),at,actor});
 }else if(command.type==='assurance.record'){
  if(!ASSURANCE_TYPES.includes(raw.kind))throw Error('Choose a supported assurance record type.');
  const ids=[...new Set(raw.requirementIds||[])];if(!ids.length||ids.length>100||ids.some(id=>!p.artefacts.some(a=>a.id===id&&a.type==='requirement')))throw Error('Link this record to 1–100 requirements.');
  if(!text(raw.title,180)||!text(raw.statement))throw Error('Add the title and original assertion or observed result.');
  if(['test-result','observation'].includes(raw.kind)&&(!text(raw.release,180)||!text(raw.environment,180)||!text(raw.observedAt,80)||!text(raw.cycle,180)))throw Error('Record the release, environment, observation date and test cycle or measurement procedure.');
  if((raw.objectIds||[]).some(id=>!journeyIndex(p).nodes.has(id)))throw Error('Link only existing project objects.');
  const old=raw.id?m.records.find(r=>r.id===raw.id):null;if(raw.id&&!old)throw Error('This assurance record is no longer available.');
  if(old&&old.kind!==raw.kind)throw Error('A record cannot change its evidence type.');
  const source=raw.sourceId?p.coauthoring?.sources?.find(s=>s.id===raw.sourceId):null,version=source?.versions?.at(-1);
  if(raw.sourceId&&!version)throw Error('Choose an existing project source.');
  const sourceEvidence=version?{id:source.id,revision:version.revision,hash:digest(version),location:version.location}:null;
  if(raw.reviewed===true&&(!sourceEvidence||!text(raw.reviewer,180)||!text(raw.reviewNote)))throw Error('A reviewed observation needs its original source, named reviewer and review rationale.');
  const record={id:old?.id||'ASR-'+String(++m.counter).padStart(3,'0'),revision:(old?.revision||0)+1,kind:raw.kind,title:text(raw.title,180),statement:text(raw.statement),requirementIds:ids,objectIds:[...new Set((raw.objectIds||[]).map(id=>text(id,100)))].slice(0,30),status:text(raw.status,100)||'Unverified assertion',owner:text(raw.owner,180),release:text(raw.release,180),environment:text(raw.environment,180),observedAt:text(raw.observedAt,80),cycle:text(raw.cycle,180),sourceEvidence,reviewed:raw.reviewed===true,reviewer:text(raw.reviewer,180),reviewNote:text(raw.reviewNote),basis:ids.map(id=>{const a=p.artefacts.find(a=>a.id===id);return {id,stamp:digest({description:a.description,source:a.provenance?.rowHash||a.source})};}),at,actor,history:old?[...(old.history||[]),(({history,...v})=>v)(old)]:[]};
  if(old){for(const key of ['feed','externalId','feedHash','feedSnapshot','feedReview'])if(old[key]!==undefined)record[key]=structuredClone(old[key]);m.records[m.records.indexOf(old)]=record;}else m.records.push(record);
 }else throw Error('Unknown assurance action.');
 m.version++;return {document:p};
}
export function semanticFindings(p){return (p.assurance?.semanticFindings||[]).filter(f=>f.status==='open'||!generationCurrent(p,f.generation)).map(f=>({id:f.id,chapter:f.chapter,objectId:f.objectId,artefactId:f.objectId,code:'semantic-challenge',title:f.title,detail:f.explanation+' '+f.question+(generationCurrent(p,f.generation)?'':' Source context changed; the previous disposition needs review.'),level:'warning',authority:'LLM hypothesis requiring architect review'}));}
export function assuranceFindings(p){return [...semanticFindings(p).filter(f=>f.chapter===1),...(p.assurance?.records||[]).flatMap(r=>{
 const source=r.sourceEvidence?p.coauthoring?.sources?.find(s=>s.id===r.sourceEvidence.id)?.versions?.at(-1):null;
 const stale=!assuranceCurrent(p,r)||r.sourceEvidence&&(!source||digest(source)!==r.sourceEvidence.hash);
 return stale?[{id:'assurance-stale:'+r.id,code:'assurance-stale',artefactId:r.requirementIds[0],title:'Recheck evidence after a source change',detail:r.id+' · '+r.title+' refers to earlier requirements or source evidence. Historical observations remain intact.',level:'warning'}]:[];
 })];}
export function assuranceMarkdown(p){
 const a=sourceAssurance(p.artefacts);if(!a.counts.assessed&&!p.assurance?.records?.length&&!p.assurance?.semanticFindings?.length)return '';
 const lines=['## Source assertions and delivery assurance','',`${a.counts.assessed} imported assessments: ${a.counts.deliveryGaps} delivery gaps; ${a.counts.additionalAssurance} additional delivered-item assurance cases; ${a.counts.missingEvidence} without an evidence reference. These counts describe source assertions, not verified delivery.`,`${a.repeated.length} repeated-statement groups await explicit comparison; identities are not merged.`,''];
 for(const r of p.assurance?.records||[])lines.push(`### ${r.id} · ${r.title}`,`Type: ${r.kind}. Status: ${r.status}. ${r.reviewed?'Review recorded by '+r.reviewer:'Unverified assertion'}. ${assuranceCurrent(p,r)?'Requirement basis current':'Requirement basis changed'}.`,r.statement,`Requirements: ${r.requirementIds.join(', ')}. Release: ${r.release||'unspecified'}; environment: ${r.environment||'unspecified'}; cycle/procedure: ${r.cycle||'unspecified'}; observed: ${r.observedAt||'unspecified'}.`,r.sourceEvidence?`Source: ${r.sourceEvidence.id}, revision ${r.sourceEvidence.revision}, hash ${r.sourceEvidence.hash}.`:'Original evidence not attached.','');
 for(const f of p.assurance?.semanticFindings||[])lines.push('### '+f.id+' · '+f.title,'Advisory source challenge: '+f.kind+'. '+f.status+'. '+(generationCurrent(p,f.generation)?'Current source context.':'Source context changed; review required.'),f.explanation,f.leftRef+': '+f.leftQuote,f.rightRef+': '+f.rightQuote,'Question: '+f.question,...f.sources.map(s=>s.ref+' · '+s.title+' · '+(s.location||s.id)),f.review?'Disposition by '+f.review.actor+': '+f.review.reason:'Architect disposition outstanding.','');
 return lines.join('\n');
}
