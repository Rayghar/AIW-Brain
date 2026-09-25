import {architectureModel,explorationContext,normalizeExploration} from './architecture-model.js';
import {caseContextSource} from './case-guidance.js';
export const maskContactText=text=>String(text).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email redacted]').replace(/(?<![\w.-])\+?\d[\d ()-]{8,}\d(?![\w.-])/g,'[phone-like value redacted]');
import {organizationSources} from './organization-knowledge.js';
import {architectureBrain,brainSources} from './architecture-brain.js';
import {architectureGrounding} from './architecture-knowledge.js';
import {brainContext,knowledgeForContext,generationCurrent} from './aiw-brain.js';
import {changeFingerprint} from './changes-domain.js';
import {applyBrainCommand} from './brain-authoring.js';
import {applyDesignCommand} from './design-task-domain.js';
import {applyArchitectureCommand} from './architecture-design.js';
import {architectureDraftContract,validateArchitectureDraft,architectureDraftSelection} from './architecture-drafting.js';

const copy=x=>structuredClone(x);
const stop=new Set('the and for that this with from into its are was were have has what which should could would help explain review design recorded context model current'.split(' '));
const words=s=>new Set((String(s).toLowerCase().match(/[a-z0-9]{3,}/g)||[]).filter(w=>!stop.has(w)));
const text=(s,n)=>typeof s==='string'?s.trim().slice(0,n):'';
export const SUGGESTED_FIELDS=['boundary','exclusions','information','failure','support','operations','trustName','trustPolicy'];
export function intelligenceRequest(raw){
 const chapter=Number(raw.chapter),objectId=text(raw.objectId,100),prompt=text(raw.prompt,2000),mode=raw.mode;
 if(!Number.isInteger(chapter)||chapter<1||chapter>11||!objectId||!['design','author','mind','challenge'].includes(mode))throw Error('Choose an object and an assistance mode.');
 if(!prompt)throw Error('Tell Sol what you want to develop or explain.');
 const exploration=raw.exploration&&typeof raw.exploration==='object'?Object.fromEntries(['scopeId','selectedId','concern','context'].map(k=>[k,text(raw.exploration[k],140)])):null;
 if(raw.exploration?.baselineId)throw Error('Return to the working design before preparing a new Sol request. Frozen baselines remain read only.');
 return {chapter,objectId,mode,prompt,...(exploration?{exploration}:{}),...(raw.semantic===true?{semantic:true}:{}),requirementId:text(raw.requirementId,100)||null,...(raw.architectureTaskId?{architectureTaskId:text(raw.architectureTaskId,100)}:{})};
}
// Bounded lexical retrieval from this project and the shipped AKR pilot. It is
// deliberately transparent: every excerpt below is visible before transmission.
export function intelligencePacket(p,raw){
 const request=intelligenceRequest(raw),c=brainContext(p,{chapter:request.chapter,id:request.objectId});
 if(c.selected.id==='project')throw Error('Select a saved object before asking Sol to develop it.');
 if(request.requirementId&&!c.requirements.some(r=>r.id===request.requirementId))throw Error('Choose a requirement linked to the selected object.');
 if(request.architectureTaskId&&!c.tasks.some(t=>t.id===request.architectureTaskId&&t.kind==='architecture'))throw Error('Select an object linked to this architecture comparison before querying its reasoning.');
 const governed=architectureBrain(p,c,{query:request.prompt});
 const architectureDraft=request.architectureTaskId&&['design','mind'].includes(request.mode)?architectureDraftContract(p,c.tasks.find(t=>t.id===request.architectureTaskId)):null;
 const sources=[],seen=new Set(),knowledge=knowledgeForContext(c,{prompt:request.prompt});let chars=0,omitted=0;const omissions=[];
 const add=s=>{if(seen.has(s.id))return;seen.add(s.id);if(sources.length>=22||chars+s.excerpt.length>28000){omitted++;omissions.push({id:s.id,kind:s.kind,title:s.title,reason:sources.length>=22?'source limit':'character budget'});return;}sources.push({...s,ref:'S'+(sources.length+1)});chars+=s.excerpt.length;};
 const record=(n,kind)=>{const full=JSON.stringify(n.record||n,(key,value)=>['sourceSnapshot','history','basis','generation'].includes(key)?undefined:value);add({id:'model:'+n.id,kind:'model',objectId:n.id,versionStamp:changeFingerprint(n.record||n),chapter:n.chapter||c.chapter,title:n.title||n.record?.title||n.id,posture:kind,excerpt:full.slice(0,2600),truncated:full.length>2600});};
 record(c.selected,'Selected saved object');
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
 for(const source of organizationSources(p,request.prompt+' '+c.selected.title))add(source);
 const architecture=architectureGrounding(p,c,request);
 if(architecture){
  const task=c.tasks.find(t=>t.id===architecture.objectId);
  c.requirements.filter(n=>n.id===task?.requirementId).forEach(n=>record(n,'Source requirement for this comparison'));
  c.drivers.filter(n=>n.id===task?.driverId).forEach(n=>record(n,'Selected quality scenario for this comparison'));
  add(architecture);
  if(!sources.some(s=>s.id===architecture.id))throw Error('The reviewed architecture reasoning cannot fit in this context. Narrow the comparison before asking Sol.');
 }
 for(const source of brainSources(p,governed))add(source);
 // Reserve space for the question's knowledge before optional neighbouring
 // objects. Historical snapshots are not current design facts.
 for(const k of knowledge){
  const r=k.receipt,relevance={kind:k.kind,why:k.why,signals:k.signals,question:k.question,limits:k.limit,prerequisiteStatus:'Unassessed; a topic match does not establish suitability'};
  const full=JSON.stringify({relevance,problem:r.content.problem,prerequisites:r.content.prerequisites,conditions:r.content.applicabilityRules,risks:r.content.risks,failureModes:r.content.failureModes,counterfactual:r.content.counterfactualExplanation,obligations:r.content.obligations,claims:r.claims});
  add({id:'akr:'+k.id,kind:'knowledge',objectId:k.id,title:k.record.name,posture:r.posture,receipt:r,relevance,excerpt:full.slice(0,6000),truncated:full.length>6000});
 }
 c.requirements.forEach(n=>record(n,'Linked requirement'));
 c.drivers.forEach(n=>record(n,'Quality scenario; target confirmation is recorded in the excerpt'));
 c.decisions.forEach(n=>record(n,'Recorded decision; acceptance is separate'));
 c.neighbours.slice(0,6).forEach(n=>record(n,'Directly connected object'));
 c.constraints.slice(0,4).forEach(n=>record({id:n.id,title:n.title,record:n,chapter:1},'Project constraint'));
 const patternQuestion=!!request.architectureTaskId||!!architecture||governed.concepts.some(h=>h.named>0)||knowledge.some(k=>k.kind==='context'&&k.signals.some(s=>s.origin==='request'))&&!/\b(boundar(?:y|ies)|cohesive|separate coordination)\b/i.test(request.prompt);
 const packet={version:2,brainReceipt:{...governed.receipt,claimIds:sources.filter(s=>s.kind==='governed-claim').map(s=>s.objectId)},reasoningProcedure:governed.procedure,excludedKnowledge:governed.excluded,request,context:{id:c.selected.id,chapter:c.selected.chapter},basisStamp:c.stamp,selectedTitle:c.selected.title,requirementId:request.requirementId||c.requirements[0]?.id||null,canDesign:request.mode!=='challenge'&&request.chapter<=7&&c.selected.chapter<=7&&!!c.requirements.length&&!patternQuestion,missing:c.missing,links:c.links.slice(0,20),sources,omitted,omissions,coverage:{characters:chars,maxCharacters:28000,sourceCount:sources.length,maxSources:22,originalSourceCount:sources.filter(s=>['project-source','workbook-row'].includes(s.kind)).length},scope:'Current project graph, pinned reviewed claims, source-pinned Playbook procedures and descriptive catalogue; repository refreshes require explicit review'};
 const policy=p.workspace?.aiPolicy||{},excluded=new Set(policy.excludedObjectIds||[]);if(excluded.has(c.selected.id))throw Error('The project disclosure policy excludes this object from LLM requests.');
 if(architectureDraft&&[architectureDraft.taskId,architectureDraft.requirementId,architectureDraft.driverId].some(id=>excluded.has(id)))throw Error('The project disclosure policy excludes part of this architectural comparison.');
 if(architectureDraft)packet.architectureDraft=architectureDraft;
 if(excluded.size){packet.sources=packet.sources.filter(s=>!excluded.has(s.objectId));packet.links=packet.links.filter(e=>!excluded.has(e.from)&&!excluded.has(e.to));}if(policy.redactContacts){const redact=maskContactText;packet.selectedTitle=redact(packet.selectedTitle);packet.sources=packet.sources.map(s=>({...s,title:redact(s.title),excerpt:redact(s.excerpt)}));packet.request={...packet.request,prompt:redact(packet.request.prompt)};}packet.disclosure={version:1,redactContacts:!!policy.redactContacts,excludedObjectIds:[...excluded]};return {...packet,stamp:changeFingerprint(packet)};
}
const string={type:'string'},strings={type:'array',items:string};
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const INTELLIGENCE_SCHEMA=object({title:string,summary:string,passage:string,sourceRefs:strings,assumptions:strings,questions:strings,options:{type:'array',items:object({title:string,approach:{type:'string',enum:['cohesive','separate']},rationale:string,tradeoffs:strings,sourceRefs:strings,answers:object(Object.fromEntries(SUGGESTED_FIELDS.map(k=>[k,string])))})}});
export const CHALLENGE_SCHEMA={...INTELLIGENCE_SCHEMA,properties:{...INTELLIGENCE_SCHEMA.properties,challenges:{type:'array',maxItems:6,items:object({title:string,kind:{type:'string',enum:['possible contradiction','ambiguity','missing evidence','applicability question']},explanation:string,leftRef:string,leftQuote:string,rightRef:string,rightQuote:string,question:string})}},required:[...INTELLIGENCE_SCHEMA.required,'challenges']};
export function intelligenceSchema(packet){
 const schema=copy(packet.request.mode==='challenge'?CHALLENGE_SCHEMA:INTELLIGENCE_SCHEMA);
 if(packet.architectureDraft){schema.properties.architectureDraft={type:'array',maxItems:12,items:object({field:{type:'string',enum:packet.architectureDraft.fields.map(f=>f.key)},value:string,rationale:string,sourceRefs:strings})};schema.required.push('architectureDraft');}
 return schema;
}

function exactObject(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!(k in v)))throw Error('The model returned an unsupported proposal structure.');}
function bounded(v,n,empty=false){if(typeof v!=='string'||v.length>n||(!empty&&!v.trim()))throw Error('The model returned incomplete or oversized text.');return v.trim();}
function array(v,n,limit){if(!Array.isArray(v)||v.length>n)throw Error('The model returned an oversized list.');return v.map(x=>bounded(x,limit));}
export function validateIntelligenceOutput(raw,packet){
 exactObject(raw,Object.keys(intelligenceSchema(packet).properties));
 const known=new Set(packet.sources.map(s=>s.ref)),refs=v=>{const xs=array(v,22,20);if(!xs.length||xs.some(x=>!known.has(x)))throw Error('The model cited a source outside the reviewed context.');return [...new Set(xs)];};
 const result={title:bounded(raw.title,180),summary:bounded(raw.summary,1800),passage:bounded(raw.passage,10000),sourceRefs:refs(raw.sourceRefs),assumptions:array(raw.assumptions,8,700),questions:array(raw.questions,8,700),options:[]};
 if(packet.architectureDraft){result.architectureDraft=validateArchitectureDraft(raw.architectureDraft,packet);if(result.architectureDraft.some(s=>s.sourceRefs.some(ref=>!result.sourceRefs.includes(ref))))throw Error('Include the architectural suggestions’ citations in the response source list.');}
 if([...result.assumptions,...result.questions].some(s=>/^S\d+(?:\s*[,;]\s*S\d+)*$/.test(s)))throw Error('Assumptions and questions must explain the design, not contain only citation labels.');
 if(!result.sourceRefs.includes('S1'))throw Error('The proposal must cite the selected saved object.');
 for(const s of packet.sources.filter(s=>s.kind==='architecture-knowledge'))if(!result.sourceRefs.includes(s.ref))throw Error('The explanation must cite the reviewed architecture reasoning.');
 if(!Array.isArray(raw.options)||raw.options.length>2||((packet.request.mode==='author'||!packet.canDesign)&&raw.options.length))throw Error('The model proposed an unsupported design action.');
 for(const o of raw.options){
  exactObject(o,['title','approach','rationale','tradeoffs','sourceRefs','answers']);exactObject(o.answers,SUGGESTED_FIELDS);
  if(!['cohesive','separate'].includes(o.approach)||result.options.some(x=>x.approach===o.approach))throw Error('Choose distinct supported boundary alternatives.');
  result.options.push({title:bounded(o.title,180),approach:o.approach,rationale:bounded(o.rationale,1800),tradeoffs:array(o.tradeoffs,6,700),sourceRefs:refs(o.sourceRefs),answers:Object.fromEntries(SUGGESTED_FIELDS.map(k=>[k,bounded(o.answers[k],k==='trustName'?180:1600,true)]))});
 }
 if(packet.request.mode==='challenge'){if(!Array.isArray(raw.challenges)||raw.challenges.length>6)throw Error('Keep source challenges within six observations.');result.challenges=raw.challenges.map(f=>{exactObject(f,Object.keys(CHALLENGE_SCHEMA.properties.challenges.items.properties));if(!CHALLENGE_SCHEMA.properties.challenges.items.properties.kind.enum.includes(f.kind))throw Error('Use an advisory source challenge type.');const r={title:bounded(f.title,180),kind:f.kind,explanation:bounded(f.explanation,1600),question:bounded(f.question,700)};for(const side of ['left','right']){const ref=bounded(f[side+'Ref'],20),quote=bounded(f[side+'Quote'],600),source=packet.sources.find(s=>s.ref===ref);if(!source||quote.length<8||!source.excerpt.includes(quote))throw Error('Every challenge needs an exact passage from each cited source.');r[side+'Ref']=ref;r[side+'Quote']=quote;}if(f.kind==='possible contradiction'&&r.leftRef===r.rightRef&&r.leftQuote===r.rightQuote)throw Error('A contradiction needs two distinct source assertions.');return r;});}
 return result;
}
export function generationReceipt(run){return {groundingReview:copy(run.groundingReview),brainReceipt:copy(run.packet.brainReceipt),retrieval:copy(run.packet.retrieval),runId:run.id,provider:run.provider,model:run.model,at:run.updatedAt,request:copy(run.packet.request),context:copy(run.packet.context),basisStamp:run.packet.basisStamp,packetStamp:run.packet.stamp,sources:copy(run.packet.sources),sourceRefs:copy(run.result.sourceRefs),assumptions:copy(run.result.assumptions),questions:copy(run.result.questions)};}
export function adoptIntelligence(p,raw,run,at=new Date().toISOString()){
 if(run.status!=='completed')throw Error('Only a completed, saved response can enter review.');
 const generation=generationReceipt(run);if(!generationCurrent(p,generation))throw Error('The source context changed. Generate again from the current sources before using this response.');
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
 for(const [k,v] of Object.entries(o.answers))if(v&&!t.answers[k])t.answers[k]=v;
 t.answers.unknowns=[t.answers.unknowns,...run.result.assumptions,...run.result.questions].filter(Boolean).join('\n').slice(0,4000);
 t.generation={...generation,option:raw.option,approach:o.approach,sourceRefs:o.sourceRefs};t.history.push({at,event:'Opened LLM suggestions in guided design',runId:run.id,note:o.rationale});t.considerations.push({at,approach:o.approach,outcome:'Unreviewed LLM suggestion',reason:o.rationale});return r;
}
