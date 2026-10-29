import {designContextSources} from './design-context-sources.js';
import {architectureModel,explorationContext,normalizeExploration} from './architecture-model.js';
import {redactSecrets,redactSecretsDeep} from './secret-redaction.js';
import {caseContextSource} from './case-context.js';
export const maskContactText=text=>String(text).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email redacted]').replace(/(?<![\w.-])\+?\d[\d ()-]{8,}\d(?![\w.-])/g,'[phone-like value redacted]');
import {organizationSources} from './organization-knowledge.js';
import {architectureBrain,brainSources,brainSourceCurrent} from './architecture-brain.js';
import {architectureGrounding,architectureTopicForPrompt} from './architecture-knowledge.js';
import {brainContext,knowledgeForContext,generationCurrent,receiptCurrent} from './aiw-brain.js';
import {changeFingerprint} from './changes-domain.js';
import {applyBrainCommand} from './brain-authoring.js';
import {applyDesignCommand,startOperationTask,startOperationOption} from './design-task-domain.js';
import {applyArchitectureCommand} from './architecture-design.js';
import {architectureDraftContract,validateArchitectureDraft,architectureDraftSelection} from './architecture-drafting.js';
import {architectureOperationContract,architectureOperationsSchema,validateArchitectureOperations} from './architecture-operations.js';
import {copy} from './util.js';
import {chapterChecks} from './readiness-model.js';
import {applyFinalReviewCommand,reviewObjects} from './review-domain.js';
import {driversForRequirement} from './driver-scope.js';
import {driverKind,isQualityDriver} from './quality-domain.js';
import {architectureIntelligence,architectureIntelligenceSource,architectureIntelligenceCurrent} from './architecture-intelligence.js';
// rc39 (PLAN §4.3.4): the design basis Sol reads for a record or a driver, from the one projection.
import {designQuestions,driverQuestions,projectQuestions} from './design-questions.js';

const stop=new Set('the and for that this with from into its are was were have has what which should could would help explain review design recorded context model current'.split(' '));
const words=s=>new Set((String(s).toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(w=>!stop.has(w)));
const text=(s,n)=>typeof s==='string'?s.trim().slice(0,n):'';
// A linked record may repeat an excluded identifier inside a field or a source
// excerpt. Suppress those references in the exact packet shown and sent, while
// keeping the saved project unchanged. The provider never receives the ID list.
export function disclosureSourceExcluded(source,excluded){
 const r=source.receipt||{};return [source.id,source.objectId,r.claimId,r.sourceId,r.subjectId,r.releaseId,r.releaseId&&r.claimId?r.releaseId+':'+r.claimId:null,r.releaseId&&r.sourceId?r.releaseId+':'+r.sourceId:null,...(r.sourceRefs||[])].some(id=>id&&(excluded.has(id)||/^(model|catalogue):/.test(id)&&excluded.has(id.slice(id.indexOf(':')+1))));
}
// An excluded child remains excluded when it is embedded in its parent's JSON.
// This also identifies deductions whose original basis contained that child;
// pruning the child alone cannot make those deductions safe to disclose.
export function containsExcludedRecord(value,excluded){
 if(!excluded.size)return false;
 if(typeof value==='string'){if(!/^[\s]*[\[{]/.test(value))return false;try{return containsExcludedRecord(JSON.parse(value),excluded);}catch{return false;}}
 if(!value||typeof value!=='object')return false;
 if(!Array.isArray(value)&&[value.id,value.objectId,value.claimId,value.sourceId].some(id=>typeof id==='string'&&excluded.has(id)))return true;
 return Object.values(value).some(v=>containsExcludedRecord(v,excluded));
}
export function hideExcludedReferences(value,excluded){
 const ids=[...excluded].filter(Boolean).sort((a,b)=>b.length-a.length),patterns=ids.map(id=>new RegExp('(?<![\\p{L}\\p{N}_-])'+id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\p{L}\\p{N}_-])','gu'));
 const hide=s=>patterns.reduce((v,re)=>v.replace(re,'[withheld object]'),s);
 const withheld=Symbol('withheld');
 const walk=v=>{
  if(typeof v==='string'){if(/^[\s]*[\[{]/.test(v)){try{const json=JSON.parse(v),safe=walk(json);return safe===withheld?'[withheld object]':JSON.stringify(safe);}catch{/* Plain text is still masked below. */}}return hide(v);}
  if(Array.isArray(v))return v.map(walk).filter(x=>x!==withheld);
  if(v&&typeof v==='object'){
   if([v.id,v.objectId,v.claimId,v.sourceId].some(id=>typeof id==='string'&&excluded.has(id)))return withheld;
   return Object.fromEntries(Object.entries(v).map(([k,x])=>[hide(k),walk(x)]).filter(([,x])=>x!==withheld));
  }
  return v;
 };
 return ids.length?walk(value):value;
}
// Apply the same disclosure to excerpts, structured lineage and derived readings.
// A source receipt can contain authored text too; preview and transmission agree.
export function discloseIntelligenceValue(value,policy={},excluded=new Set(policy.excludedObjectIds||[])){
 const safe=redactSecretsDeep(hideExcludedReferences(value,excluded));
 const contacts=v=>typeof v==='string'?maskContactText(v):Array.isArray(v)?v.map(contacts):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[maskContactText(k),contacts(x)])):v;
 return policy.redactContacts?contacts(safe):safe;
}
// Knowledge travels as a complete, bounded deduction plus its exact source
// dependencies. Optional duplicate model passages cannot consume the allowance
// before a useful explanation reaches the request. Existing source refs survive.
export function packArchitectureIntelligence(readings,{sources=[],maxCharacters=28000,maxSources=22,excluded=new Set(),maxContexts=12}={}){
 const packed=sources.map(s=>({...s})),selected=new Map();let omitted=0;
 const characters=()=>packed.reduce((n,s)=>n+s.excerpt.length,0);
 for(const item of readings.slice(0,maxContexts)){
  const reading=item.reading||item,scope=item.applicableTo||[item.id||reading.subject.id];
  const available=new Map(reading.sources.filter(s=>!disclosureSourceExcluded(s,excluded)&&!containsExcludedRecord(s.excerpt,excluded)).map(s=>[s.id,s]));
  const accepted=[];
  for(const insight of reading.insights){
   if(accepted.length>=2){omitted++;continue;}
   if(!insight.sourceRefs?.length||insight.sourceRefs.some(id=>!available.has(id))){omitted++;continue;}
   const pending=insight.sourceRefs.map(id=>available.get(id)).filter(s=>!packed.some(x=>x.id===s.id));
   const trialIds=[...packed.map(s=>s.id),...pending.map(s=>s.id)];
   const baseId='architecture-intelligence:'+reading.subject.id,identity=changeFingerprint([reading.receipt.selection,reading.receipt.prompt,reading.receipt.limit]),other=packed.find(s=>s.id===baseId),derivedId=other&&changeFingerprint([other.receipt?.selection,other.receipt?.prompt,other.receipt?.limit])!==identity?baseId+':'+identity:baseId;
   const prior=packed.find(s=>s.id===derivedId),room=maxCharacters-characters()-pending.reduce((n,s)=>n+s.excerpt.length,0)+(prior?.excerpt.length||0);
   if(room<800||packed.length+pending.length+(prior?0:1)>maxSources){omitted++;continue;}
   // A composed check can need more explanation than a catalogue suggestion.
   // Give it the remaining allowance after reserving its complete source basis;
   // the packet's original character/source limits remain authoritative.
   const body=architectureIntelligenceSource({...reading,insights:[...accepted,insight]},{sourceIds:trialIds,maxCharacters:room});
   const content=body&&JSON.parse(body.excerpt);
   if(!content?.insights.some(i=>i.id===insight.id)){omitted++;continue;}
   content.coverage.omitted=reading.insights.length-content.insights.length;
   body.id=derivedId;body.excerpt=JSON.stringify(content);body.truncated=content.insights.length<reading.insights.length;
   if(body.excerpt.length>room){omitted++;continue;}
   for(const source of pending)packed.push({...source,applicableTo:[...scope]});
   for(const id of insight.sourceRefs){const source=packed.find(s=>s.id===id);if(source?.applicableTo)source.applicableTo=[...new Set([...source.applicableTo,...scope])];}
   if(prior)Object.assign(prior,body,{applicableTo:[...new Set([...(prior.applicableTo||[]),...scope])]});else packed.push({...body,applicableTo:[...scope]});
   accepted.push(insight);selected.set(item.id||reading.subject.id,true);
  }
 }
 return {sources:packed,omitted,retainedContexts:selected.size,characters:characters()};
}
export const SUGGESTED_FIELDS=['boundary','exclusions','information','failure','support','operations','trustName','trustPolicy'];
export function intelligenceRequest(raw){
 const chapter=Number(raw.chapter),objectId=text(raw.objectId,100),prompt=text(raw.prompt,2000),mode=raw.mode;
 if(!Number.isInteger(chapter)||chapter<1||chapter>11||!objectId||!['design','author','mind','challenge'].includes(mode))throw Error('Choose an object and an assistance mode.');
 if(!prompt)throw Error('Tell Sol what you want to develop or explain.');
 const exploration=raw.exploration&&typeof raw.exploration==='object'?Object.fromEntries(['scopeId','selectedId','concern','context'].map(k=>[k,text(raw.exploration[k],140)])):null;
 if(raw.exploration?.baselineId)throw Error('Return to the working design before preparing a new Sol request. Frozen baselines remain read only.');
 const priorRunId=typeof raw.priorRunId==='string'?raw.priorRunId.trim():raw.priorRunId;if(priorRunId&&!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(priorRunId))throw Error('Choose a saved request for conversational context.');
 return {chapter,objectId,mode,prompt,...(exploration?{exploration}:{}),...(raw.semantic===true?{semantic:true}:{}),...(priorRunId?{priorRunId}:{}),...(raw.architectureOperations===true&&['design','mind'].includes(mode)?{architectureOperations:true}:{}),requirementId:text(raw.requirementId,100)||null,...(raw.architectureTaskId?{architectureTaskId:text(raw.architectureTaskId,100)}:{})};
}
// The design basis as a source (rc39, PLAN §4.3.4): for a record on Chapters 5–7 the questions its drivers open with
// their state, the drivers that opened each, the answers recorded, the story of a decided one and the caution; for a
// driver (Chapter 2) what it asks of the design and where it lands. Read by rule from the saved project; a question is
// not a decision and a story is not an approval. Null for any other object.
export const DESIGN_BASIS_POSTURE='The design questions the drivers open, with what the saved records answer; read by rule from the project. A question is not a decision and a story is not an approval; the person decides.';
export function designBasisSource(p,selected){
 const id=selected?.id;if(!id||id==='project')return null;
 if((p.quality?.drivers||[]).some(d=>d.id===id)){
  const r=driverQuestions(p,id);if(!r)return null;
  const d=r.driver,excerpt=JSON.stringify({driver:{id:d.id,title:d.title,kind:d.kind,category:d.category,shape:d.shape,target:d.target,priority:d.priority,confirmed:d.confirmed,attribute:d.attribute?{name:d.attribute.name,family:d.attribute.family?.name||null}:null},questions:r.questions.map(q=>({id:q.id,title:q.title,chapter:q.chapter,lands:q.lands.map(l=>({ref:l.ref,title:l.title,state:l.state})),tactics:q.knowledge?.tactics.map(t=>t.name)||[]})),counts:r.counts});
  return {id:'design-questions:'+id,kind:'design-questions',objectId:id,title:'What '+d.id+' asks of the design',posture:DESIGN_BASIS_POSTURE,excerpt:excerpt.slice(0,6000),truncated:excerpt.length>6000};
 }
 const r=designQuestions(p,id);if(!r)return null;
 const excerpt=JSON.stringify({ref:r.ref,kind:r.kind,chapter:r.chapter,drivers:r.drivers.map(d=>({id:d.id,title:d.title,kind:d.kind,target:d.target,priority:d.priority,confirmed:d.confirmed,attribute:d.attribute?{name:d.attribute.name,family:d.attribute.family?.name||null}:null})),questions:r.questions.map(q=>({id:q.id,title:q.title,state:q.state,chapter:q.chapter,because:q.because,toConfirm:q.toConfirm,answers:q.answers.map(a=>({kind:a.kind,ref:a.ref,title:a.title,state:a.state,chapter:a.chapter})),story:q.story,caution:q.caution})),counts:r.counts});
 return {id:'design-questions:'+id,kind:'design-questions',objectId:id,title:'Design basis · '+r.ref,posture:DESIGN_BASIS_POSTURE,excerpt:excerpt.slice(0,6000),truncated:excerpt.length>6000};
}
// Two starters for a record on Chapters 5–7 (rc39): each drafts the question with the record's design basis in it, so Sol
// explains from the recorded drivers and answers; the person edits and sends it, as every starter. None elsewhere.
export function designStarters(p,chapter,objectId){
 if(![5,6,7].includes(Number(chapter))||!objectId)return [];
 const r=designQuestions(p,objectId);if(!r||!r.drivers.length)return [];
 const d=r.drivers[0],open=r.questions.filter(q=>q.state!=='decided'),decided=r.questions.filter(q=>q.state==='decided');
 const basis='Its design basis: '+r.drivers.map(x=>x.id+' ('+x.title+(x.target?', '+x.target:'')+')').join('; ')+'. Open questions: '+(open.map(q=>q.title+' ('+q.because.join(', ')+(q.state==='draft'?', a draft answer recorded':'')+')').join('; ')||'none')+'. Decided: '+(decided.map(q=>q.story).join(' ')||'nothing yet')+'.';
 return [
  ['design-why','Why this kind of component here?','Why is '+r.ref+' the kind of component it is, and what does its selection rest on? '+basis+' Explain from the recorded drivers and answers only; say which questions are still open; propose nothing as decided.','Explain the selection from its drivers'],
  ['design-tighten','What would change if '+d.id+' tightened?','If '+d.id+' ('+d.title+(d.target?', now '+d.target:'')+') tightened, which of '+r.ref+'’s design questions would need a different answer, and what would have to be re-examined? '+basis+' Trace it through the recorded basis; ask me for the new target rather than inventing one.','Follow a tighter target through the basis']
 ];
}
// Bounded lexical retrieval from this project and the shipped AKR pilot. It is
// deliberately transparent: every excerpt below is visible before transmission.
export function intelligencePacket(p,raw){
 const request=intelligenceRequest(raw),c=brainContext(p,{chapter:request.chapter,id:request.objectId});
 if(c.selected.id==='project')throw Error('Select a saved object before asking Sol to develop it.');
 if(request.requirementId&&!c.requirements.some(r=>r.id===request.requirementId))throw Error('Choose a requirement linked to the selected object.');
 if(request.architectureTaskId&&!c.tasks.some(t=>t.id===request.architectureTaskId&&t.kind==='architecture'))throw Error('Select an object linked to this architecture comparison before querying its reasoning.');
 const governed=architectureBrain(p,c,{query:request.prompt});
 const intelligence=architectureIntelligence(p,{chapter:request.chapter,id:request.objectId},{context:c,prompt:request.prompt});
 const architectureDraft=request.architectureTaskId&&['design','mind'].includes(request.mode)?architectureDraftContract(p,c.tasks.find(t=>t.id===request.architectureTaskId)):null;
 const sources=[],seen=new Set(),knowledge=knowledgeForContext(c,{prompt:request.prompt,project:p}),criticalIds=new Set(),excludedCritical=new Set(p.workspace?.aiPolicy?.excludedObjectIds||[]);let chars=0,omitted=0,criticalWithheld=0;const omissions=[];
 const add=(s,required=false)=>{if(seen.has(s.id))return;seen.add(s.id);if(disclosureSourceExcluded(s,excludedCritical)){if(required)criticalWithheld++;return;}if(required&&containsExcludedRecord(s.excerpt,excludedCritical))criticalWithheld++;if(sources.length>=22||chars+s.excerpt.length>28000){if(required)throw Error('The selected requirements, architecture drivers and constraints exceed the bounded context. Select a narrower requirement or model scope before asking Sol.');omitted++;omissions.push({id:s.id,kind:s.kind,title:s.title,reason:sources.length>=22?'source limit':'character budget'});return;}sources.push({...s,ref:'S'+(sources.length+1)});chars+=s.excerpt.length;if(required)criticalIds.add(s.id);};
 const record=(n,kind,required=false)=>{if(required&&excludedCritical.has(n.id)){criticalWithheld++;return;}const full=JSON.stringify(n.record||n,(key,value)=>['sourceSnapshot','history','basis','generation'].includes(key)?undefined:value);add({id:'model:'+n.id,kind:'model',objectId:n.id,versionStamp:changeFingerprint(n.record||n),chapter:n.chapter||c.chapter,title:n.title||n.record?.title||n.id,posture:kind,excerpt:required?full:full.slice(0,2600),truncated:!required&&full.length>2600},required);};
 record(c.selected,'Selected saved object',true);
 if(sources[0])criticalIds.add(sources[0].id);
 // Decision context precedes catalogue passages and optional neighbours. Its
 // untruncated constraints must never disappear because knowledge ranked first.
 const scopedRequirements=c.requirements.filter(n=>!request.requirementId||n.id===request.requirementId);
 scopedRequirements.forEach(n=>record(n,'Required behaviour and acceptance boundary',true));
 const requiredDriverIds=request.requirementId?new Set(driversForRequirement(p,request.requirementId).map(d=>d.id)):null;
 c.drivers.filter(n=>!requiredDriverIds||requiredDriverIds.has(n.id)).forEach(n=>record(n,isQualityDriver(n.record||n)?'Recorded quality scenario; target confirmation is separate from measured achievement':`Recorded ${driverKind(n.record||n)} architecture driver; preserve its stated scope, force and confirmation`,true));
 c.constraints.forEach(n=>record({id:n.id,title:n.title,record:n,chapter:1},'Project constraint',true));
 // A native read/result interaction uses its exact accepted composition. The
 // canonical topic selector preserves questions about other design families;
 // an explicit task still receives its full alternatives comparison.
 const resultReadComposition=!request.architectureTaskId&&request.chapter===8&&['reads','interaction'].includes(architectureTopicForPrompt(request.prompt))&&intelligence.insights.some(i=>i.kind==='composition'&&[i.scope?.contractId,i.scope?.outcomeContractId].includes(c.selected.id)&&c.tasks.some(t=>t.id===i.scope?.outcomeReadTaskId&&t.kind==='architecture'&&t.topic==='reads'&&t.status==='applied'&&t.applied?.reasoningGraph?.solution?.state==='adopted'));
 const architecture=resultReadComposition?null:architectureGrounding(p,c,request);
 if(architecture)add(architecture,true);
 // rc39 (PLAN §4.3.4): the design basis of a record (Chapters 5–7) or of a driver (Chapter 2), with the decision context,
 // before the optional knowledge and neighbours that the budget may omit.
 {const basis=designBasisSource(p,c.selected);if(basis)add(basis);}
 if(request.exploration){
  const model=architectureModel(p),state=normalizeExploration({...request.exploration,chapter:request.chapter,selectedId:request.objectId},model),visible=explorationContext(model,state),excluded=new Set(p.workspace?.aiPolicy?.excludedObjectIds||[]);
  if(excluded.has(state.scopeId))throw Error('The disclosure policy excludes this architecture scope.');
  visible.objects=visible.objects.filter(o=>!excluded.has(o.id));visible.relationships=visible.relationships.filter(e=>!excluded.has(e.from)&&!excluded.has(e.to));visible.gaps=visible.gaps.filter(g=>!excluded.has(g.id));if(visible.processClaims)visible.processClaims=visible.processClaims.filter(c=>!excluded.has(c.id)&&!excluded.has(c.subjectId));if(excluded.has(state.selectedId))visible.sourceQuestions=[];
  while(JSON.stringify(visible).length>6500&&(visible.relationships.length||visible.objects.length)){if(visible.relationships.length){visible.relationships.pop();visible.omitted.relationships++;}else{visible.objects.pop();visible.omitted.objects++;}}
  add({id:'exploration:'+state.scopeId,kind:'architecture-exploration',objectId:state.scopeId,title:visible.scope+' · '+state.concern,versionStamp:model.signature,exploration:state,posture:'Current saved architecture scope and declared relationships; mappings are not runtime verification',excerpt:JSON.stringify(visible),truncated:visible.omitted.objects+visible.omitted.relationships>0});
 }

 const excludedCases=new Set(p.workspace?.aiPolicy?.excludedObjectIds||[]);
 for(const scope of c.cases||[])if(![scope.id,...scope.requirementIds].some(id=>excludedCases.has(id)))add(caseContextSource(p,scope));
 const query=words(request.prompt+' '+c.selected.title+' '+(c.selected.record?.description||c.selected.record?.purpose||''));
 const linked=new Set(c.sources.map(s=>s.id));
 const ineligibleOrganizationSources=new Set((p.workbench?.catalogue||[]).filter(e=>e.organization&&!e.organization.assurance?.eligible).map(e=>e.sourceId));
 const passages=(p.coauthoring?.sources||[]).filter(s=>!ineligibleOrganizationSources.has(s.id)).flatMap(s=>{
  const v=s.versions?.at(-1);if(!v)return [];
  const body=v.excerpt||v.text||v.content||'';
  return String(body).match(/[\s\S]{1,1200}/g)?.map((excerpt,index)=>({s,v,excerpt,index,score:[...words(excerpt+' '+v.title)].filter(w=>query.has(w)).length+(linked.has(s.id)?5:0)}))||[];
 }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.s.id.localeCompare(b.s.id)||a.index-b.index).slice(0,4);
 for(const {s,v,excerpt,index} of passages)add({id:'source:'+s.id+':'+index,kind:'project-source',objectId:s.id,title:v.title||s.id,revision:v.revision,versionStamp:changeFingerprint(v),location:v.location||'',posture:'Recorded project source; independently unverified',excerpt,passage:index+1,truncated:true});
 const sourceObjects=[c.selected.record,...c.requirements.map(n=>n.record||n)].filter(Boolean);
 for(const a of sourceObjects){if(!a.provenance?.sourceExcerpt)continue;const v=a.provenance;add({id:'workbook:'+v.datasetId+':'+a.externalId,kind:'workbook-row',objectId:a.id,title:a.externalId+' · '+v.sheet+' row '+v.sourceRow,revision:v.revision,versionStamp:v.rowHash,workbookHash:v.workbookHash,location:v.sheet+'!'+v.cells.description,posture:'Original workbook assertion; independently unverified',excerpt:v.sourceExcerpt.slice(0,2200),truncated:v.sourceExcerpt.length>2200});}
 if(request.mode==='challenge'){const peers=p.artefacts.filter(r=>r.type==='requirement'&&r.id!==c.selected.id).map(r=>({r,rank:[...words(r.title+' '+r.description)].filter(w=>query.has(w)).length})).filter(v=>v.rank).sort((a,b)=>b.rank-a.rank||a.r.id.localeCompare(b.r.id)).slice(0,6);for(const {r} of peers)record({id:r.id,title:r.title,chapter:1,record:r},'Related requirement for comparison; relevance is not proof of a contradiction');}
 // Derived comparisons are indivisible: retain their assumptions and state, or
 // disclose an omission. An excluded basis cannot leave an apparent result.
 for(const source of designContextSources(p,[c.selected.id,...scopedRequirements.map(r=>r.id)])){if(disclosureSourceExcluded(source,excludedCritical)||containsExcludedRecord(source.excerpt,excludedCritical))continue;add(source);}
 const packed=packArchitectureIntelligence([intelligence],{sources,maxCharacters:28000,maxSources:22,excluded:excludedCritical});
 sources.splice(0,sources.length,...packed.sources.map((s,i)=>({...s,ref:s.ref||'S'+(i+1)})));chars=packed.characters;sources.forEach(s=>seen.add(s.id));
 if(packed.omitted){omitted+=packed.omitted;omissions.push({id:'architecture-intelligence:omitted',kind:'architecture-intelligence',title:`${packed.omitted} contextual insight${packed.omitted===1?'':'s'} omitted`,reason:'Complete source basis did not fit the disclosed context'});}
 for(const source of organizationSources(p,request.prompt+' '+c.selected.title))add(source);
 for(const source of brainSources(p,governed))add(source);
 // Reserve space for the question's knowledge before optional neighbouring
 // objects. Historical snapshots are not current design facts.
 for(const k of knowledge){
  if(k.source){add(k.source);continue;}
  const r=k.receipt,relevance={kind:k.kind,why:k.why,signals:k.signals,question:k.question,limits:k.limit,prerequisiteStatus:'Unassessed; a topic match does not establish suitability'};
  const full=JSON.stringify({relevance,problem:r.content.problem,prerequisites:r.content.prerequisites,conditions:r.content.applicabilityRules,risks:r.content.risks,failureModes:r.content.failureModes,counterfactual:r.content.counterfactualExplanation,obligations:r.content.obligations,claims:r.claims});
  add({id:'akr:'+k.id,kind:'knowledge',objectId:k.id,title:k.record.name,posture:r.posture,receipt:r,relevance,excerpt:full.slice(0,6000),truncated:full.length>6000});
 }
 c.decisions.forEach(n=>record(n,'Recorded decision; acceptance is separate'));
 c.neighbours.slice(0,6).forEach(n=>record(n,'Directly connected object'));
 const patternQuestion=!!request.architectureTaskId||!!architecture||governed.concepts.some(h=>h.named>0)||knowledge.some(k=>k.kind==='context'&&k.signals.some(s=>s.origin==='request'))&&!/\b(boundar(?:y|ies)|cohesive|separate coordination)\b/i.test(request.prompt);
 // What the scope gate held back, said once per claim with every reason: the Brain's retrieval and the question's
 // knowledge apply the same gate (architecture-knowledge.js architectureClaimScope), each to the claims it would read.
 const excludedKnowledge=governed.excluded.map(x=>({...x,reasons:[...x.reasons]}));
 for(const w of knowledge.withheld||[]){const same=excludedKnowledge.find(x=>x.id===w.id&&x.releaseId===w.releaseId);if(same)same.reasons=[...new Set([...same.reasons,...w.reasons])];else excludedKnowledge.push({...w,reasons:[...w.reasons]});}
 const packet={version:2,brainReceipt:{...governed.receipt,claimIds:sources.filter(s=>s.kind==='governed-claim').map(s=>s.objectId)},reasoningProcedure:governed.procedure,excludedKnowledge,request,context:{id:c.selected.id,chapter:c.selected.chapter},basisStamp:c.stamp,selectedTitle:c.selected.title,requirementId:request.requirementId||c.requirements[0]?.id||null,canDesign:request.mode!=='challenge'&&request.chapter<=7&&c.selected.chapter<=7&&!!c.requirements.length&&!patternQuestion,missing:c.missing,links:c.links.slice(0,20),sources,omitted,omissions,coverage:{characters:chars,maxCharacters:28000,sourceCount:sources.length,maxSources:22,originalSourceCount:sources.filter(s=>['project-source','workbook-row'].includes(s.kind)).length},scope:'Current project graph, pinned reviewed claims, source-pinned Playbook procedures and descriptive catalogue; repository refreshes require explicit review'};
 const policy=p.workspace?.aiPolicy||{},excluded=new Set(policy.excludedObjectIds||[]);if(excluded.has(c.selected.id))throw Error('The project disclosure policy excludes this object from LLM requests.');
 if(request.requirementId&&excluded.has(request.requirementId))throw Error('The project disclosure policy excludes this requirement from LLM requests.');
 if(architectureDraft&&[architectureDraft.taskId,architectureDraft.requirementId,architectureDraft.driverId].some(id=>excluded.has(id)))throw Error('The project disclosure policy excludes part of this architectural comparison.');
 if(architectureDraft)packet.architectureDraft=architectureDraft;
 if(excluded.size){
  const dependsOnExcluded=value=>{
   if(!value||typeof value!=='object')return false;
   if(disclosureSourceExcluded({receipt:value},excluded))return true;
   return Object.values(value).some(v=>v&&typeof v==='object'&&dependsOnExcluded(v));
  };
  for(const source of packet.sources.filter(s=>s.kind==='architecture-knowledge')){
   const details=JSON.parse(source.excerpt);
   if(dependsOnExcluded(details)||hideExcludedReferences(source.excerpt,excluded)!==source.excerpt)throw Error('The project disclosure policy excludes supporting knowledge in this architectural comparison. Review its source scope before asking Sol.');
  }
  packet.sources=packet.sources.filter(s=>!disclosureSourceExcluded(s,excluded));packet.links=packet.links.filter(e=>!excluded.has(e.from)&&!excluded.has(e.to));
  packet.omissions=packet.omissions.filter(o=>!excluded.has(o.objectId)&&![...excluded].some(id=>o.id===id||o.id==='model:'+id||o.id?.startsWith('source:'+id+':')));
  packet.requirementId=excluded.has(packet.requirementId)?c.requirements.find(r=>!excluded.has(r.id))?.id||null:packet.requirementId;
  packet.canDesign=packet.canDesign&&!!packet.requirementId;packet.omitted=packet.omissions.length;
  packet.brainReceipt.claimIds=packet.sources.filter(s=>s.kind==='governed-claim').map(s=>s.objectId);
  const claimRefs=new Set(packet.sources.filter(s=>s.kind==='governed-claim').map(s=>s.receipt.releaseId+':'+s.receipt.claimId));
  packet.brainReceipt.claimRefs=(packet.brainReceipt.claimRefs||[]).filter(ref=>claimRefs.has(ref));
  packet.brainReceipt.graphLinks=(packet.brainReceipt.graphLinks||[]).filter(link=>claimRefs.has(link.releaseId+':'+link.claimId));
  packet.brainReceipt.optionLinks=(packet.brainReceipt.optionLinks||[]).filter(link=>claimRefs.has(link.releaseId+':'+link.claimId));
  packet.coverage={...packet.coverage,sourceCount:packet.sources.length,originalSourceCount:packet.sources.filter(s=>['project-source','workbook-row'].includes(s.kind)).length,characters:packet.sources.reduce((n,s)=>n+s.excerpt.length,0)};
 }
 packet.criticalContext={version:1,complete:criticalWithheld===0,withheldCount:criticalWithheld,sourceIds:[...criticalIds].filter(id=>packet.sources.some(s=>s.id===id)),sourceRefs:packet.sources.filter(s=>criticalIds.has(s.id)).map(s=>s.ref),policy:'Selected behaviour, positively scoped architecture drivers and project constraints precede optional knowledge. Missing critical context cannot establish option fit.'};
 if(request.architectureOperations){packet.architectureOperations=architectureOperationContract(c,packet);packet.canDesign=false;}
 // Secrets are always redacted from what Sol reads (audit C-34); contact details when the policy asks.
 {const redact=text=>redactSecrets(policy.redactContacts?maskContactText(text):text);packet.selectedTitle=redact(packet.selectedTitle);packet.sources=packet.sources.map(s=>({...s,title:redact(s.title),excerpt:redact(s.excerpt)}));packet.request={...packet.request,prompt:redact(packet.request.prompt)};}
 packet.disclosure={version:2,redactContacts:!!policy.redactContacts,redactSecrets:true,excludedObjectCount:excluded.size};
 const disclosed=discloseIntelligenceValue(packet,policy,excluded);return {...disclosed,stamp:changeFingerprint(disclosed)};
}
const string={type:'string'},strings={type:'array',items:string};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const INTELLIGENCE_SCHEMA=object({title:string,summary:string,passage:string,sourceRefs:strings,assumptions:strings,questions:strings,options:{type:'array',items:object({title:string,approach:{type:'string',enum:['cohesive','separate']},rationale:string,tradeoffs:strings,sourceRefs:strings,answers:object(Object.fromEntries(SUGGESTED_FIELDS.map(k=>[k,string])))})}});
export const CHALLENGE_SCHEMA={...INTELLIGENCE_SCHEMA,properties:{...INTELLIGENCE_SCHEMA.properties,challenges:{type:'array',maxItems:6,items:object({title:string,kind:{type:'string',enum:['possible contradiction','ambiguity','missing evidence','applicability question']},explanation:string,leftRef:string,leftQuote:string,rightRef:string,rightQuote:string,question:string})}},required:[...INTELLIGENCE_SCHEMA.required,'challenges']};
export function intelligenceSchema(packet){
 const schema=copy(packet.request.mode==='challenge'?CHALLENGE_SCHEMA:INTELLIGENCE_SCHEMA);
 if(packet.architectureDraft){schema.properties.architectureDraft={type:'array',maxItems:12,items:object({field:{type:'string',enum:packet.architectureDraft.fields.map(f=>f.key)},value:string,rationale:string,sourceRefs:strings})};schema.required.push('architectureDraft');}
 if(packet.architectureOperations){schema.properties.architectureOperations=architectureOperationsSchema(packet);schema.required.push('architectureOperations');}
 return schema;
}

function exactObject(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!(k in v)))throw Error('The model returned an unsupported proposal structure.');}
// A response is refused for its shape and its grounding; a text or list past its limit is kept to it and said so,
// and a part that fails its own rule (a challenge without exact passages, an option the task does not take, a question
// that is only citation labels) is set aside with the rest kept — one oversized or misplaced part never costs the answer.
export function validateIntelligenceOutput(raw,packet){
 exactObject(raw,Object.keys(intelligenceSchema(packet).properties));
 const cut=new Set(),setAside=[];
 const text=(v,n,name,empty=false)=>{if(typeof v!=='string'||(!empty&&!v.trim()))throw Error('The model returned incomplete text.');const t=v.trim();if(t.length<=n)return t;cut.add(name);return t.slice(0,n-1).trimEnd()+'…';};
 const texts=(v,n,limit,name)=>{if(!Array.isArray(v))throw Error('The model returned an unsupported list.');if(v.length>n)cut.add(name);return v.slice(0,n).map(x=>text(x,limit,name));};
 const known=new Set(packet.sources.map(s=>s.ref)),refs=v=>{if(!Array.isArray(v)||v.some(x=>typeof x!=='string'))throw Error('The model returned an unsupported citation list.');const xs=[...new Set(v.map(x=>x.trim()))].slice(0,22);if(!xs.length||xs.some(x=>!known.has(x)))throw Error('The model cited a source outside the reviewed context.');return xs;};
 const labelsOnly=s=>/^S\d+(?:\s*[,;]\s*S\d+)*$/.test(s);
 const result={title:text(raw.title,180,'title'),summary:text(raw.summary,1800,'summary'),passage:text(raw.passage,10000,'passage'),sourceRefs:refs(raw.sourceRefs),assumptions:texts(raw.assumptions,8,700,'assumptions'),questions:texts(raw.questions,8,700,'questions'),options:[]};
 const bare=[...result.assumptions,...result.questions].filter(labelsOnly).length;
 if(bare){result.assumptions=result.assumptions.filter(s=>!labelsOnly(s));result.questions=result.questions.filter(s=>!labelsOnly(s));setAside.push(`${bare} ${bare===1?'entry':'entries'} that only listed citation labels`);}
 if(packet.architectureDraft){result.architectureDraft=validateArchitectureDraft(raw.architectureDraft,packet);if(result.architectureDraft.some(s=>s.sourceRefs.some(ref=>!result.sourceRefs.includes(ref))))throw Error('Include the architectural suggestions’ citations in the response source list.');}
 // Aggregate citations explicitly supplied in the structured operations. A
 // valid child receipt need not be repeated by the provider at every level.
 if(packet.architectureOperations){result.architectureOperations=validateArchitectureOperations(raw.architectureOperations,packet);result.sourceRefs=[...new Set([...result.sourceRefs,...result.architectureOperations.flatMap(o=>o.sourceRefs)])];}
 if(!result.sourceRefs.includes('S1'))throw Error('The proposal must cite the selected saved object.');
 for(const s of packet.sources.filter(s=>s.kind==='architecture-knowledge'))if(!result.sourceRefs.includes(s.ref))throw Error('The explanation must cite the reviewed architecture reasoning.');
 if(!Array.isArray(raw.options))throw Error('The model returned an unsupported list.');
 const allowed=packet.request.mode!=='author'&&packet.canDesign;
 if(raw.options.length&&!allowed)setAside.push(`${raw.options.length} design option${raw.options.length===1?'':'s'} this task does not take`);
 for(const o of allowed?raw.options:[]){
  exactObject(o,['title','approach','rationale','tradeoffs','sourceRefs','answers']);exactObject(o.answers,SUGGESTED_FIELDS);
  if(!['cohesive','separate'].includes(o.approach)||result.options.some(x=>x.approach===o.approach)||result.options.length>=2){setAside.push('a design option that repeats another or is not a boundary alternative');continue;}
  result.options.push({title:text(o.title,180,'options'),approach:o.approach,rationale:text(o.rationale,1800,'options'),tradeoffs:texts(o.tradeoffs,6,700,'options'),sourceRefs:refs(o.sourceRefs),answers:Object.fromEntries(SUGGESTED_FIELDS.map(k=>[k,text(o.answers[k],k==='trustName'?180:1600,'options',true)]))});
 }
 if(packet.request.mode==='challenge'){
  if(!Array.isArray(raw.challenges))throw Error('The model returned an unsupported list.');
  if(raw.challenges.length>6)cut.add('challenges');
  const kinds=CHALLENGE_SCHEMA.properties.challenges.items.properties.kind.enum;let inexact=0;
  result.challenges=raw.challenges.slice(0,6).flatMap(f=>{
   exactObject(f,Object.keys(CHALLENGE_SCHEMA.properties.challenges.items.properties));
   if(!kinds.includes(f.kind)){inexact++;return [];}
   const r={title:text(f.title,180,'challenges'),kind:f.kind,explanation:text(f.explanation,1600,'challenges'),question:text(f.question,700,'challenges')};
   for(const side of ['left','right']){const ref=typeof f[side+'Ref']==='string'?f[side+'Ref'].trim():'',quote=typeof f[side+'Quote']==='string'?f[side+'Quote'].trim():'',source=packet.sources.find(s=>s.ref===ref);if(!source||quote.length<8||quote.length>600||!source.excerpt.includes(quote)){inexact++;return [];}r[side+'Ref']=ref;r[side+'Quote']=quote;}
   if(f.kind==='possible contradiction'&&r.leftRef===r.rightRef&&r.leftQuote===r.rightQuote){inexact++;return [];}
   return [r];
  });
  if(inexact)setAside.push(`${inexact} source challenge${inexact===1?'':'s'} without an exact passage from each cited source`);
 }
 if(cut.size)result.trimmed=[...cut];
 if(setAside.length)result.setAside=setAside;
 return result;
}
export function generationReceipt(run){return {groundingReview:copy(run.groundingReview),brainReceipt:copy(run.packet.brainReceipt),retrieval:copy(run.packet.retrieval),runId:run.id,provider:run.provider,model:run.model,at:run.updatedAt,request:copy(run.packet.request),context:copy(run.packet.context),basisStamp:run.packet.basisStamp,packetStamp:run.packet.stamp,sources:copy(run.packet.sources),sourceRefs:copy(run.result.sourceRefs),assumptions:copy(run.result.assumptions),questions:copy(run.result.questions),...(run.instructions?{instructions:copy(run.instructions)}:{})};}
export function adoptIntelligence(p,raw,run,at=new Date().toISOString()){
 if(run.status!=='completed')throw Error('Only a completed, saved response can enter review.');
 if(raw.kind==='review-finding')return adoptReviewFinding(p,raw,run,at);
 const generation=generationReceipt(run),current=generationCurrent(p,generation),requireCurrent=()=>{if(!current)throw Error('The source context changed. Generate again from the current sources before using this response.');};
 if(raw.kind==='architecture-operation'||raw.kind==='architecture-option'){
  if(!run.groundingReview?.accepted||!run.packet.architectureOperations?.canPropose)throw Error('Choose a source-checked architecture proposal from this saved response.');
  const operations=validateArchitectureOperations((run.result.architectureOperations||[]).map(({status,...o})=>({...o,selectedSourceRef:'S1'})),run.packet),operation=operations.find(o=>o.id===raw.operationId&&o.optionId===raw.optionId);
  const saved=o=>p.coauthoring?.designTasks?.find(t=>t.kind==='operation'&&t.generation?.runId===run.id&&t.operation.id===o.id&&t.operation.optionId===o.optionId);
  if(raw.kind==='architecture-option'){const selected=operations.filter(o=>o.optionId===raw.optionId);if(!selected.length||raw.operationId!==undefined)throw Error('Choose the exact saved architecture option.');if(!selected.every(o=>saved(o)&&(selected.length===1||saved(o).operationGroup)))requireCurrent();return startOperationOption(p,selected,generation,at);}
  if(!operation)throw Error('Choose the exact saved operation and its architecture option.');
  if(!saved(operation))requireCurrent();
  return startOperationTask(p,operation,{...generation,operationId:operation.id,optionId:operation.optionId,sourceRefs:copy(operation.sourceRefs)},at);
 }
 requireCurrent();
 if(raw.kind==='architecture-answers'){
  const {task,selected,answers}=architectureDraftSelection(p,run,raw);
  const result=applyArchitectureCommand(p,{type:'architecture.answers',payload:{id:task.id,taskRevision:task.revision,answers}},at);
  const saved=result.document.coauthoring.designTasks.find(t=>t.id===task.id);
  saved.assistedDrafts??=[];
  if(saved.assistedDrafts.length>=20)throw Error('This comparison has reached its saved assistant-draft limit. Continue editing its conditions directly.');
  saved.assistedDrafts.push({at,runId:run.id,fields:copy(selected),generation,authority:'Architect-selected draft conditions; no model change or formal design acceptance.'});
  saved.history.push({at,event:'Kept selected Sol suggestions as draft conditions',runId:run.id,fields:selected.map(s=>s.field)});
  return result;
 }
 if(raw.kind==='challenges'){if(raw.reviewed!==true||!run.groundingReview?.accepted||!run.result.challenges?.length)throw Error('Review a source-checked set of challenges before recording it.');const out=structuredClone(p);out.assurance??={version:1,counter:0,records:[],groups:[]};out.assurance.semanticFindings??=[];for(const [i,f] of run.result.challenges.entries()){if(out.assurance.semanticFindings.some(x=>x.runId===run.id&&x.number===i))continue;out.assurance.semanticFindings.push({id:'SF-'+crypto.randomUUID(),runId:run.id,number:i,chapter:run.packet.context.chapter,objectId:run.packet.context.id,...f,sources:run.packet.sources.filter(s=>[f.leftRef,f.rightRef].includes(s.ref)),generation,status:'open',at,history:[]});}out.assurance.version++;return {document:out};}
 if(raw.kind==='passage'){
  const existing=(p.coauthoring?.narratives||[]).find(n=>n.generation?.runId===run.id);if(existing)return {document:p,selected:existing.id};
  const r=applyBrainCommand(p,{type:'brain.draft',payload:{chapter:run.packet.request.chapter,objectId:run.packet.context.id,basisStamp:run.packet.basisStamp}},at),n=r.document.coauthoring.narratives.find(n=>n.id===r.selected);
  n.title=run.result.title;n.body=run.result.passage+'\n\nAssumptions to review\n'+(run.result.assumptions.join('\n')||'No additional assumptions listed by the model; review against sources.')+'\n\nOpen questions\n'+(run.result.questions.join('\n')||'Review completeness with the architect.');n.generation=generation;n.history.push({at,event:'Prepared LLM passage for human review',runId:run.id});return r;
 }
 if(raw.kind!=='design'||!run.packet.canDesign||!Number.isInteger(raw.option)||!run.result.options[raw.option])throw Error('Choose a supported saved design alternative.');
 const existing=(p.coauthoring?.designTasks||[]).find(t=>t.generation?.runId===run.id&&t.generation.option===raw.option);if(existing)return {document:p,selected:existing.id};
 const r=applyDesignCommand(p,{type:'design.start',payload:{requirementId:run.packet.requirementId}},at),t=r.document.coauthoring.designTasks.find(t=>t.id===r.selected),o=run.result.options[raw.option];
 // Each answer copied from the run keeps its own provenance (round 2, I2-13): which field, from which run, not yet edited —
 // the same shape as an architecture comparison's assistedDrafts — so the SDD can say which words came from a model.
 const filled=[];for(const [k,v] of Object.entries(o.answers))if(v&&!t.answers[k]){t.answers[k]=v;filled.push({field:k,value:v,edited:false});}
 t.answers.unknowns=[t.answers.unknowns,...run.result.assumptions,...run.result.questions].filter(Boolean).join('\n').slice(0,4000);
 if(filled.length){t.assistedDrafts??=[];t.assistedDrafts.push({at,runId:run.id,option:raw.option,fields:filled,authority:'Sol’s draft answers, prefilled only where the task recorded none; each is a draft until the architect edits and reviews it.'});}
 t.generation={...generation,option:raw.option,approach:o.approach,sourceRefs:o.sourceRefs};t.history.push({at,event:'Opened LLM suggestions in guided design',runId:run.id,note:o.rationale,fields:filled.map(f=>f.field)});t.considerations.push({at,approach:o.approach,outcome:'Unreviewed LLM suggestion',reason:o.rationale});return r;
}

// ---------------------------------------------------------------- Sol drafts one chapter of the journey (round 4; mode 'journey')
// One request per chapter (audit/round4/DESIGN.md, Contract 2). The packet holds the brief's passages (at most 60), the
// upstream records the chapter's deterministic draft rests on, by their titles and key fields (at most 40), and the
// draft records with the fields Sol may answer: their creation questions, the options of a choice by id, the current
// deterministic value and how it is known. The fields that choose which upstream record a draft hangs from
// (requirementId, logicalId, from, to, targetId, …) and a Chapter 1 record's type are never offered: they stay the rules'. Disclosure policy and
// redaction as everywhere; the server adds the instructions' pin. Nothing here is sent or applied.
export const JOURNEY_SOL_LIMITS={passages:60,upstream:40,records:12,value:2000};
export const JOURNEY_ANCHORS=new Set(['type','journeyId','outcomeId','constraintId','assumptionId','requirementId','driverId','decisionId','logicalId','applicationId','capabilityId','from','to','authorityId','targetId','assetId']);
export function journeyRequest(raw){
 const chapter=Number(raw?.chapter);
 if(!Number.isInteger(chapter)||chapter<1||chapter>11)throw Error('Choose a chapter from 1 to 11 for Sol to draft.');
 return {chapter};
}
const KEY_FIELDS=['title','question','description','purpose','boundary','acceptance','response','category','kind','classification','scenario','need','dataTitle','priority','scopeMode'];
function upstreamRecord(p,id){
 const all=[...(p.artefacts||[]),...(p.quality?.drivers||[]),...(p.decisions?.records||[]),...(p.logical?.responsibilities||[]),...(p.realisation?.components||[]),...(p.technology?.capabilities||[]),...(p.technology?.boundaries||[]),...(p.technologyRealisation?.records||[]),...(p.interfaces?.contracts||[]),...(p.interfaces?.data||[]),...(p.interfaces?.parties||[]),...(p.security?.threats||[]),...(p.security?.controls||[]),...(p.runtime?.environments||[]),...(p.runtime?.plans||[])];
 return all.find(r=>r?.id===id)||null;
}
export function journeyPacket(p,raw,draft,brief,{instructions=null}={}){
 const request=journeyRequest(raw);
 if(!draft||draft.chapter!==request.chapter)throw Error('Draft this chapter before asking Sol.');
 const policy=p.workspace?.aiPolicy||{},excluded=new Set(policy.excludedObjectIds||[]),redact=t=>redactSecrets(policy.redactContacts?maskContactText(t):String(t));
 const records=(draft.records||[]).filter(r=>r.kind==='guided'&&!r.provenance?.upstream?.some(id=>excluded.has(id))).slice(0,JOURNEY_SOL_LIMITS.records).map(r=>({key:r.key,title:redact(r.title).slice(0,200),fields:r.fields.filter(f=>!JOURNEY_ANCHORS.has(f.key)).map(f=>({key:f.key,label:f.label,current:redact(f.value).slice(0,1200),basis:f.basis,...(f.numeric?{numeric:true}:{}),...(f.optional?{optional:true}:{}),...(f.options||f.display!==undefined?{options:(f.options||[{id:f.value,title:f.display}]).slice(0,40)}:{})}))}));
 const ids=[...new Set(records.flatMap(r=>(draft.records.find(x=>x.key===r.key)?.provenance?.upstream||[])))].filter(id=>!excluded.has(id)),upstream=[];let withheld=0;
 for(const id of ids){if(upstream.length>=JOURNEY_SOL_LIMITS.upstream)break;const rec=upstreamRecord(p,id);if(!rec){withheld++;continue;}upstream.push({ref:id,title:redact(rec.title||rec.question||id).slice(0,200),fields:Object.fromEntries(KEY_FIELDS.filter(k=>typeof rec[k]==='string'&&rec[k].trim()).map(k=>[k,redact(rec[k]).slice(0,300)]))});}
 const passages=(brief?.passages||[]).slice(0,JOURNEY_SOL_LIMITS.passages).map(x=>({id:x.id,text:redact(x.text).slice(0,600)}));
 const sources=[];let knowledgeCharacters=0,knowledgeOmitted=0;
 for(const s of draft.citations||[]){
  // A summary of a claim is not enough: conditions, limitations and the exact
  // interpretation travel together. Old drafts without that context are rebuilt.
  if(!['governed-claim','brain-method'].includes(s.kind)||!s.reasoningExcerpt||!brainSourceCurrent(p,s)||disclosureSourceExcluded(s,excluded)){knowledgeOmitted++;continue;}
  if(sources.length>=6||knowledgeCharacters+s.reasoningExcerpt.length>9000){knowledgeOmitted++;continue;}
  const applicableTo=records.filter(r=>s.kind==='brain-method'||(draft.records.find(x=>x.key===r.key)?.provenance?.claimIds||[]).includes(s.objectId)).map(r=>r.key);
  if(!applicableTo.length){knowledgeOmitted++;continue;}
  sources.push({id:s.id,ref:'K'+(sources.length+1),kind:s.kind,objectId:s.objectId,title:s.title,posture:s.posture,receipt:s.receipt,excerpt:s.reasoningExcerpt,truncated:!!s.truncated,applicableTo});knowledgeCharacters+=s.reasoningExcerpt.length;
 }
 const packet={version:2,task:'journey-draft',request,chapter:{id:request.chapter,title:draft.title},records,passages,upstream,sources,
  omissions:{records:Math.max(0,(draft.records||[]).filter(r=>r.kind==='guided').length-records.length),passages:Math.max(0,(brief?.passages||[]).length-passages.length),upstream:Math.max(0,ids.length-upstream.length),withheld,knowledge:knowledgeOmitted},
  brainReceipt:{engine:'architecture-brain-1',policy:'evidence-before-proposal-1',reasoning:'aiw-journey-draft-2',instructions,claimIds:sources.filter(c=>c.kind==='governed-claim').map(c=>c.objectId),sourceRefs:sources.map(s=>s.id),scoring:false},
  disclosure:{version:2,redactContacts:!!policy.redactContacts,redactSecrets:true,excludedObjectCount:excluded.size}};
 const safe=discloseIntelligenceValue(packet,policy,excluded);return {...safe,stamp:changeFingerprint(safe)};
}

// ---------------------------------------------------------------- Sol reviews a chapter's model (round 5, Contract R; mode 'review')
// One request per chapter. The packet holds the chapter's records, by their titles and key fields, each with its
// passage status from the chapter's own rule-based checks (chapterChecks in readiness-model.js); the chapter's checks
// as a whole; and the connected model around the records — the elements one relationship away in the canonical
// architecture model and the relationships among them. Every element Sol may name is in elementIds and every source it
// may cite has an S-ref. Disclosure policy and redaction as everywhere; the server adds the instructions' pin. Nothing
// here is sent or applied, and nothing Sol returns from it is a check: its findings are advice.
export const REVIEW_SOL_LIMITS={records:60,elements:160,relationships:240,findings:20,characters:48000};
export function reviewRequest(raw){
 const chapter=Number(raw?.chapter);
 if(!Number.isInteger(chapter)||chapter<1||chapter>11)throw Error('Choose a chapter from 1 to 11 for Sol to review.');
 return {chapter};
}
const SKIPPED_ELEMENTS=new Set(['system','view','baseline']);
export function reviewPacket(p,raw,{instructions=null}={}){
 const request=reviewRequest(raw),C=chapterChecks(p,request.chapter);
 if(!C)throw Error('This chapter cannot be read for review.');
 const policy=p.workspace?.aiPolicy||{},excluded=new Set(policy.excludedObjectIds||[]),redact=t=>redactSecrets(policy.redactContacts?maskContactText(t):String(t));
 const model=architectureModel(p),items=list=>list.map(f=>redact(f.title+(f.detail?': '+f.detail:'')).slice(0,400)),L=REVIEW_SOL_LIMITS;
 const sources=[];let chars=0;
 const add=s=>{const ref='S'+(sources.length+1);sources.push({ref,...s});chars+=s.excerpt.length;return ref;};
 const whole=C.passages.find(x=>x.id==='project'),passages=C.passages.filter(x=>x.id!=='project'),kept=passages.filter(x=>!excluded.has(x.id));
 add({kind:'chapter-checks',objectId:null,title:`Chapter ${C.chapter} · ${C.title}: its checks as a whole`,posture:'The chapter’s own rule-based checks, as the chapter states them; they decide what passes.',
  excerpt:JSON.stringify({state:C.state,passing:C.passing,total:C.total,toFix:C.toFix,toConfirm:C.toConfirm,treated:C.treated,milestones:C.milestones,lastRun:C.run,...(whole?{chapter:{status:whole.status,fix:items(whole.fix),confirm:items(whole.confirm)}}:{})})});
 const records=[];
 for(const x of kept){
  if(records.length>=L.records)break;
  const o=model.objects.get(x.id);
  const fields=o?.record?JSON.parse(JSON.stringify(o.record,(key,value)=>['sourceSnapshot','history','generation'].includes(key)?undefined:value)):{};
  const source={...(o?.record?{id:'model:'+x.id,versionStamp:changeFingerprint(o.record)}:{}),kind:'record',objectId:x.id,title:redact(`${x.ref} ${x.title}`.trim()).slice(0,200),posture:'The saved record, with its passage status from the chapter’s checks; declared values do not establish measured achievement.',
   excerpt:JSON.stringify({id:x.id,ref:x.ref,kind:x.kind||o?.type||'',title:redact(x.title).slice(0,200),fields,checks:{status:x.status,fix:items(x.fix),confirm:items(x.confirm),treated:x.treated.length}})};
  if(chars+source.excerpt.length>L.characters-16000)break;
  const ref=add(source);
  records.push({id:x.id,ref});
 }
 // The connected model: the records' own elements (Chapter 11: its decisions, quality drivers and evidence), the
 // elements one relationship away, and the relationships among them; derived view relationships are left out.
 const seeds=new Set(records.map(r=>r.id).filter(id=>model.objects.has(id)));
 if(request.chapter===11)for(const o of model.objects.values())if(['decision','quality','evidence'].includes(o.type)&&!excluded.has(o.id)&&seeds.size<L.records)seeds.add(o.id);
 const usable=id=>{const o=model.objects.get(id);return !!o&&!excluded.has(id)&&!SKIPPED_ELEMENTS.has(o.type);},ids=new Set([...seeds].filter(usable));let dropped=0;
 for(const e of model.relationships){if(e.derived)continue;const other=seeds.has(e.from)?e.to:seeds.has(e.to)?e.from:null;if(!other||ids.has(other)||!usable(other))continue;if(ids.size>=L.elements){dropped++;continue;}ids.add(other);}
 const elements=[...ids].map(id=>model.objects.get(id)).map(o=>({id:o.id,kind:o.type,title:redact(o.title).slice(0,160),chapter:o.chapter,...(seeds.has(o.id)?{record:true}:{})}));
 const linked=model.relationships.filter(e=>!e.derived&&ids.has(e.from)&&ids.has(e.to)),relationships=linked.slice(0,L.relationships).map(e=>({from:e.from,to:e.to,type:e.type}));
 const connected={kind:'connected-model',objectId:null,title:`Chapter ${C.chapter}’s connected model`,posture:'Elements and relationships as the canonical model records them; a relationship is a declared mapping, not runtime verification.',excerpt:JSON.stringify({elements,relationships})};
 // Review the most consequential saved records against the same contextual
 // intelligence used at the point of work. Every retained source names the exact
 // records it was retrieved for; breadth omitted by this bounded request is stated.
 const ordered=[...records].sort((a,b)=>{const weight=id=>{const x=kept.find(x=>x.id===id);return (x?.fix.length||0)*2+(x?.confirm.length||0);};return weight(b.id)-weight(a.id)||a.id.localeCompare(b.id);});
 const readings=[];let unavailable=0;
 for(const item of ordered.slice(0,12)){
  try{readings.push({id:item.id,reading:architectureIntelligence(p,{chapter:request.chapter,id:item.id},{limit:3})});}catch{unavailable++;}
 }
 // Keep the reviewed record identities in the graph. Their exact driver and
 // constraint basis takes priority over optional neighbour/relationship breadth.
 const connectedMinimum=JSON.stringify({elements:elements.filter(e=>e.record),relationships:[]}).length;
 const knowledgeBudget=Math.max(0,L.characters-chars-connectedMinimum);
 // Chapter review is bounded by its existing record/element limits and 48k
 // characters. A complete contextual basis can need more than twelve distinct
 // source rows; an extra-row heuristic must not discard its drivers or constraint.
 const packed=packArchitectureIntelligence(readings,{sources,maxCharacters:chars+knowledgeBudget,maxSources:sources.length+L.elements+readings.length,excluded});
 sources.splice(0,sources.length,...packed.sources.map((s,i)=>({...s,ref:s.ref||'S'+(i+1)})));chars=packed.characters;
 // rc39 (PLAN §4.3.4): the chapter's design basis on Chapters 5–7, one source: each record with the drivers reaching it
 // and its question counts by state, so a finding can say a selection has no driver behind it; the totals are the
 // projection's. Added before the connected model, which still closes the packet and yields first to the limit.
 if([5,6,7].includes(request.chapter)){const pj=projectQuestions(p),recs=pj.records.filter(r=>r.chapter===request.chapter&&!excluded.has(r.id)).map(r=>({id:r.id,ref:r.ref,title:redact(r.title).slice(0,160),driverIds:r.driverIds,open:r.open,draft:r.draft,decided:r.decided,state:r.state,noDriver:!r.driverIds.length}));add({kind:'design-questions',objectId:null,title:`Chapter ${C.chapter}’s design basis`,posture:DESIGN_BASIS_POSTURE,excerpt:JSON.stringify({records:recs,totals:pj.byChapter[request.chapter]||{open:0,draft:0,decided:0}})});}
 while(chars+connected.excerpt.length>L.characters&&relationships.length){relationships.pop();connected.excerpt=JSON.stringify({elements,relationships});}
 while(chars+connected.excerpt.length>L.characters&&elements.length){elements.pop();dropped++;const allowed=new Set(elements.map(e=>e.id));for(let i=relationships.length-1;i>=0;i--)if(!allowed.has(relationships[i].from)||!allowed.has(relationships[i].to))relationships.splice(i,1);connected.excerpt=JSON.stringify({elements,relationships});}
 add(connected);
 const packet={version:2,task:'model-review',request,chapter:{id:C.chapter,title:C.title},elementIds:[...new Set([...records.map(r=>r.id),...elements.map(e=>e.id)])],sources,
  omissions:{records:kept.length-records.length,withheld:passages.length-kept.length,elements:dropped,relationships:linked.length-relationships.length,knowledge:packed.omitted,knowledgeContexts:Math.max(0,records.length-packed.retainedContexts),unavailableKnowledgeContexts:unavailable},
  knowledgeCoverage:records.map(r=>({objectId:r.id,sourceRefs:sources.filter(s=>s.applicableTo?.includes(r.id)).map(s=>s.ref)})),
  brainReceipt:{engine:'architecture-brain-1',policy:'evidence-before-proposal-1',reasoning:'aiw-model-review-2',instructions,claimIds:sources.filter(s=>s.kind==='governed-claim').map(s=>s.objectId),sourceRefs:sources.filter(s=>s.receipt).map(s=>s.id),scoring:false},
  disclosure:{version:2,redactContacts:!!policy.redactContacts,redactSecrets:true,excludedObjectCount:excluded.size}};
 const safe=discloseIntelligenceValue(packet,policy,excluded);return {...safe,stamp:changeFingerprint(safe)};
}

// ---------------------------------------------------------------- a person adopts one of Sol's review findings (round 5, Contract R)
// A finding is advice on the chapter's picture until a person adopts it. Adopting one records a Chapter 11 delivery
// action through the chapter's own command (review.action, applyFinalReviewCommand): the action names the element the
// finding concerns, and its acceptance says the severity, the title, the reason and the run it came from. It starts
// Planned with no owner, like any action a person adds, and nothing else changes: no check is written, no record is
// confirmed, the chapter's own rules still decide what passes. Only a source-checked finding that was offered (not one
// withheld by the check) can be adopted, once; adopting it again returns the action already recorded.
const SEVERITY_WORDS={fix:'to fix',confirm:'to confirm',note:'a note to weigh'};
export const reviewFindingAction=(p,runId,findingId)=>(p?.finalReview?.actions||[]).find(a=>a.provenance?.solReview?.runId===runId&&a.provenance.solReview.findingId===findingId)||null;
// Chapter review is a snapshot of the checks and connected model. Its packet is
// rebuilt before adoption, including the same pinned instructions and disclosure
// policy. A historical finding can still become a delivery action, but only
// after the architect explicitly acknowledges the changed basis.
export function reviewFindingBasis(p,run){
 const savedStamp=run?.packet?.stamp||null;
 let currentStamp=null;
 try{currentStamp=reviewPacket(p,run?.request||run?.packet?.request,{instructions:run?.packet?.brainReceipt?.instructions||run?.instructions||null}).stamp;}catch{/* Missing or unreadable context is historical. */}
 let receiptsCurrent=false;
 try{receiptsCurrent=(run?.packet?.sources||[]).every(s=>s.kind==='knowledge'?receiptCurrent(s.receipt):s.kind==='architecture-intelligence'?architectureIntelligenceCurrent(p,s):['governed-claim','brain-method','catalogue-description'].includes(s.kind)?brainSourceCurrent(p,s):true);}catch{/* An unreadable receipt cannot be treated as current. */}
 return {savedStamp,currentStamp,current:!!savedStamp&&savedStamp===currentStamp&&receiptsCurrent,receiptsCurrent};
}
export function adoptReviewFinding(p,raw,run,at=new Date().toISOString()){
 if(run.mode!=='review'||run.status!=='completed')throw Error('Choose a completed review of Sol’s.');
 if(raw.reviewed!==true)throw Error('Confirm that you reviewed the finding before recording it as an action.');
 const f=(run.result?.findings||[]).find(x=>x&&x.id===raw.findingId);
 if(!f)throw Error('Choose a finding Sol’s review offered; a withheld finding cannot be adopted.');
 const existing=reviewFindingAction(p,run.id,f.id);if(existing)return {document:p,selected:existing.id};
 if(!reviewObjects(p).some(o=>o.id===f.elementId))throw Error('The element this finding concerns is no longer in the project.');
 const basis=reviewFindingBasis(p,run),historicalReason=text(raw.historicalReason,2000);
 if(!basis.current&&(raw.historicalAcknowledged!==true||historicalReason.length<20))throw Error('The chapter review or its source receipts changed. Review the current chapter, or acknowledge why this historical finding still warrants an action (at least 20 characters).');
 const acceptance=`From Sol’s ${basis.current?'current':'historical'} review of Chapter ${run.request?.chapter??''} (${SEVERITY_WORDS[f.severity]||f.severity}): ${f.reason} Sol’s review run ${run.id}, finding ${f.id}; adopted as advice to act on, not as verified.${basis.current?'':' Historical basis acknowledged: '+historicalReason}`.slice(0,4000);
 const result=applyFinalReviewCommand(p,{type:'review.action',payload:{id:null,title:f.title,owner:'',due:'',acceptance,objectIds:[f.elementId],findingId:''}},at);
 const action=result.document.finalReview.actions.find(a=>a.id===result.selected);
 if(action)action.provenance={...(action.provenance||{}),solReview:{runId:run.id,findingId:f.id,elementId:f.elementId,severity:f.severity,title:f.title,reason:f.reason,promptVersion:run.instructions?.promptVersion||null,adoptedAt:at,basis:{savedStamp:basis.savedStamp,currentStamp:basis.currentStamp,receiptsCurrent:basis.receiptsCurrent,currentAtAdoption:basis.current,...(!basis.current?{historicalReason}: {})},authority:'Architect acknowledged advisory finding; no independent review or verification recorded.'}};
 return result;
}
