import {extendedTopic,COMPOSITION_TOPICS,compositionSources,compositionMethod,compositionAnswers,assessComposition,compositionTopicForPrompt,COMPOSITION_SLOTS} from './composition-knowledge.js';
import {normaliseAnalysis,analyseQuality,measurementCurrent} from './quality-analysis.js';
import {methodKnowledgeCurrent,taskKnowledgeCurrent} from './knowledge-governance.js';
import {PERSISTENCE_METHOD,PERSISTENCE_SOURCES,PERSISTENCE_OPTIONS,persistenceAnswers,persistenceContext,assessPersistence} from './persistence-knowledge.js';
import {READ_METHOD,READ_SOURCES,READ_OPTIONS,readAnswers,readContext,assessRead} from './read-design-knowledge.js';
import {ARCHITECTURE_SOURCES} from './architecture-source-pack.js';
import {changeFingerprint} from './changes-domain.js';
import {targetText, targetIsMeasurable} from './quality-domain.js';
import {designBasis} from './design-task-state.js';

export {ARCHITECTURE_SOURCES};
export const INTERACTION_METHOD = 'interaction-design-1';
export const INTERACTION_OPTIONS = [
  {id:'request-reply', title:'Complete in the request', pattern:'Request / reply', style:'Request-driven collaboration', tactic:'Bound waiting and resolve uncertain outcomes', benefit:'A caller can receive the final result in one interaction.', cost:'Caller and processor share a time budget and availability dependency.', counterfactual:'Reconsider if processing cannot fit the response budget or callers need intake during processor outages.'},
  {id:'durable-queue', title:'Accept now, complete later', pattern:'Queue-based load leveling', style:'Asynchronous collaboration', tactic:'Buffer work and bound consumer demand', benefit:'Intake and processing can run at different rates.', cost:'Adds delayed completion, a broker, backlog management and delivery recovery.', counterfactual:'Reconsider if a final result is mandatory before the response, or the workload does not justify another operating dependency.'}
];
const topicOf=t=>typeof t==='string'?t:t?.topic||'interaction';
export const architectureOptions=t=>extendedTopic(t)?extendedTopic(t).options:topicOf(t)==='persistence'?PERSISTENCE_OPTIONS:topicOf(t)==='reads'?READ_OPTIONS:INTERACTION_OPTIONS;
export const architectureSources=t=>extendedTopic(t)?compositionSources(topicOf(t)):topicOf(t)==='persistence'?PERSISTENCE_SOURCES:topicOf(t)==='reads'?READ_SOURCES:ARCHITECTURE_SOURCES;
export const architectureMethod=t=>extendedTopic(t)?compositionMethod(topicOf(t)):topicOf(t)==='persistence'?PERSISTENCE_METHOD:topicOf(t)==='reads'?READ_METHOD:INTERACTION_METHOD;
const copy=v=>structuredClone(v), text=(v,n=2400)=>typeof v==='string'?v.trim().slice(0,n):'';
export const INTERACTION_FIELDS = ['completion','duplicates','ordering','workload','owner','information','failure','capacity','outcome','reason','boundaryId','trustName','trustPolicy','callerId','processorId','queueId','capabilityId','callerTitle','processorTitle','queueTitle','contextReview'];
export function interactionAnswers(raw={},topic=raw.compositionTopic|| (Object.hasOwn(raw,'transactionScope')?'persistence':Object.hasOwn(raw,'freshness')?'reads':'interaction')) {
  if(extendedTopic(topic))return {...compositionAnswers(raw,topic),...(raw.analysis?{analysis:normaliseAnalysis(raw.analysis,topic)}:{})};
  if(topic==='persistence')return {...persistenceAnswers(raw),...(raw.analysis?{analysis:normaliseAnalysis(raw.analysis,topic)}:{})};
  if(topic==='reads')return {...readAnswers(raw),...(raw.analysis?{analysis:normaliseAnalysis(raw.analysis,topic)}:{})};
  const a=Object.fromEntries(INTERACTION_FIELDS.map(k=>[k,text(raw[k],/Id$/.test(k)?100:/Title$/.test(k)||k==='owner'||k==='trustName'?160:2400)]));
  for(const [key,choices] of Object.entries({completion:['immediate','deferred','unknown'],duplicates:['idempotent','deduplicated','unsafe','unknown'],ordering:['none','per-key','global','unknown'],workload:['bursty','steady','unknown']}))if(!choices.includes(a[key]))a[key]='unknown';
  return {...a,...(raw.analysis?{analysis:normaliseAnalysis(raw.analysis,topic)}:{})};
}
export function interactionSourceReceipt(topic) {
  const source=architectureSources(topic);return {methodId:architectureMethod(topic),packId:source.id,fingerprint:changeFingerprint(source),sources:copy(source),scoring:false};
}
export const topicFromReceipt=r=>Object.keys(COMPOSITION_TOPICS).find(k=>compositionMethod(k)===r?.methodId)||(r?.methodId===PERSISTENCE_METHOD?'persistence':r?.methodId===READ_METHOD?'reads':'interaction');
export const interactionReceiptCurrent=r=>{const topic=topicFromReceipt(r),source=architectureSources(topic);return r?.methodId===architectureMethod(topic)&&r.packId===source.id&&r.fingerprint===changeFingerprint(source);};
export function interactionContext(p,answers) {
  const a=interactionAnswers(answers), ids=[...COMPOSITION_SLOTS.map(k=>a[k+'Id']),...Object.keys(a).filter(k=>k.startsWith('support_')&&k.endsWith('Id')).map(k=>a[k]),a.callerId,a.processorId,a.queueId,a.capabilityId,a.boundaryId,a.cacheId,a.storeId,a.recoveryId,a.backupCapabilityId,a.recoveryCapabilityId].filter(Boolean);
  const records=[...p.realisation.components,...p.technology.capabilities,...p.technology.boundaries,...((Object.hasOwn(a,'freshness')||Object.hasOwn(a,'transactionScope'))?[...p.interfaces.parties,...p.technologyRealisation.records]:[])];
  const needs=p.technology.needs.filter(n=>ids.includes(n.applicationId));
  return {...(a.compositionTopic?{compositionDependencies:p.technology.dependencies.filter(d=>ids.includes(d.from)||ids.includes(d.to)).map(copy),compositionContracts:p.interfaces.contracts.filter(c=>ids.includes(c.from)||ids.includes(c.to)).map(copy),compositionImplementations:p.technologyRealisation.records.filter(r=>p.technologyRealisation.mappings.some(m=>m.realizationId===r.id&&ids.includes(m.capabilityId))).map(copy)}:{}),...(a.compositionTopic&&a.dataId?{compositionData:copy(p.interfaces.data.find(d=>d.id===a.dataId)||{id:a.dataId,removed:true})}:{}),...(Object.hasOwn(a,'freshness')?{readContext:readContext(p,a)}:{}),...(Object.hasOwn(a,'transactionScope')?{persistenceContext:persistenceContext(p,a)}:{}),records:ids.map(id=>copy(records.find(r=>r.id===id)||{id,removed:true})),allocations:p.logical.mappings.filter(m=>ids.includes(m.physicalId)).map(copy),interactions:p.realisation.connections.filter(e=>ids.includes(e.from)||ids.includes(e.to)).map(copy),needs:needs.map(copy),applicationBoundaries:Object.fromEntries(ids.filter(id=>p.realisation.components.some(c=>c.id===id)).map(id=>[id,p.technology.applicationBoundaries[id]||null])),support:p.technology.mappings.filter(m=>ids.includes(m.capabilityId)||needs.some(n=>n.id===m.needId)).map(copy)};
}
export function interactionContextCurrent(p,t) {
  return taskKnowledgeCurrent(p,t)&&methodKnowledgeCurrent(p,t.methodReceipt)&&interactionReceiptCurrent(t.methodReceipt)&&changeFingerprint(interactionContext(p,t.answers))===changeFingerprint(t.architectureBasis);
}

// Explicit architect answers and typed model references drive these checks.
// Text resemblance never satisfies a prerequisite, and no benefit is scored.
function assessInteractionCore(p,t,optionId) {
  if(extendedTopic(t))return assessComposition(p,t,optionId);
  if(t.topic==='persistence')return assessPersistence(p,t,optionId);
  if(t.topic==='reads')return assessRead(p,t,optionId);
  const option=INTERACTION_OPTIONS.find(o=>o.id===optionId);if(!option)throw Error('Choose an interaction approach.');
  const a=interactionAnswers(t.answers), queued=optionId==='durable-queue';
  const driver=p.quality.drivers.find(d=>d.id===t.driverId&&d.requirementIds.includes(t.requirementId));
  const checks=[];
  const check=(id,title,state,detail,sourceIds=[])=>checks.push({id,title,state,detail,sourceIds});
  check('driver','Quality scenario',driver?'known':'unknown',driver?driver.id+' · '+driver.title:'Link a quality scenario to this requirement.',['SA-COMPONENT-METHOD']);
  check('completion','Completion contract',a.completion==='unknown'?'unknown':queued&&a.completion==='immediate'?'blocked':'known',a.completion==='unknown'?'Decide whether the response must contain the final business result.':queued&&a.completion==='immediate'?'A queued acknowledgement cannot satisfy the recorded final-result response contract.':queued?'Delayed completion is permitted by the architect’s answer.':'The final outcome travels in the request response.',['MS-QUEUE-LEVELING']);
  if(queued){
    check('duplicates','Repeated delivery',a.duplicates==='unknown'?'unknown':a.duplicates==='unsafe'?'blocked':'known',a.duplicates==='unknown'?'Confirm how repeated work is prevented from repeating the business effect.':a.duplicates==='unsafe'?'The effect is unsafe to repeat and no duplicate protection is declared.':'A duplicate strategy is declared; verify its atomicity and retention with failure tests.',['MS-COMPETING-CONSUMERS']);
    check('ordering','Processing order',a.ordering==='unknown'?'unknown':'known',a.ordering==='unknown'?'Decide whether ordering is unnecessary, per key, or global.':a.ordering==='global'?'Global ordering limits parallel processing; prove the completion target with this restriction.':a.ordering==='per-key'?'Partition and recovery must preserve the declared key order.':'No business ordering requirement is declared.',['MS-COMPETING-CONSUMERS']);
    check('capacity','Backlog and admission',a.capacity?'known':'unknown',a.capacity||'Define admission limits, backlog age and the response when processing falls behind.',['MS-QUEUE-LEVELING']);
    check('outcome','Final outcome discovery',a.outcome?'known':'unknown',a.outcome||'Define how the caller discovers success, rejection or an unresolved outcome.',['MS-QUEUE-LEVELING']);
  }
  if(t.basis.decisions.length||t.basis.constraints.length)check('upstream','Existing decisions and constraints',a.contextReview?'known':'unknown',a.contextReview||'Explain how this interaction respects the recorded decisions and constraints.',['SA-COMPONENT-METHOD']);
  check('owner','Operating owner',a.owner?'known':'unknown',a.owner||'Name the accountable owner, or explicitly record Unassigned.',['SA-COMPONENT-METHOD']);
  check('information','Information authority',a.information?'known':'unknown',a.information||'Identify the authoritative state and the actor allowed to change it.',['SA-COMPONENT-METHOD']);
  check('failure','Failure agreement',a.failure?'known':'unknown',a.failure||'Define bounded waiting, rejection, uncertain outcomes and controlled recovery.');
  check('trust','Trust boundary',a.boundaryId?p.technology.boundaries.some(b=>b.id===a.boundaryId)?'known':'blocked':a.trustName&&a.trustPolicy?'known':'unknown',a.boundaryId?'Use the existing boundary without changing its policy.':'Name the proposed boundary and its access policy.');
  const effects=[
    {quality:'Response and completion',effect:queued?'Trade-off':'Conditional benefit',why:queued?'Acknowledgement and completed work are separate events. Measure both.':'A single response can contain the outcome if processing fits the agreed deadline.',verify:'Exercise the full business operation under the recorded workload.'},
    {quality:'Availability and recovery',effect:queued?'Conditional benefit':'Dependency',why:queued?'Intake can continue during a processor outage only while durable queue capacity and retention permit.':'A missing processor prevents completion in this request; define the caller’s safe response.',verify:'Interrupt each dependency; check acknowledged work and uncertain outcomes.'},
    {quality:'Integrity',effect:'Obligation',why:queued?'Repeated delivery must not repeat the business effect.':'A timeout does not establish that the business operation failed.',verify:'Fail before and after the effect, then repeat the same reference.'},
    {quality:'Throughput and cost',effect:queued?'Conditional benefit':'Unassessed',why:queued?'Consumer rate must protect downstream capacity; a growing backlog is not extra capacity.':'Use measured demand and service capacity before adding infrastructure.',verify:queued?'Compare arrival rate, safe processing rate and oldest-message age.':'Measure processing time and saturation at representative demand.'},
    {quality:'Operational complexity',effect:queued?'Added obligation':'Fewer moving parts',why:queued?'A broker, consumer recovery, poison-message handling and outcome tracking require ownership.':'No broker is introduced by this option; timeout handling still needs ownership.',verify:'Exercise the recovery runbook with the accountable team.'}
  ];
  const blockers=checks.filter(c=>c.state==='blocked'),unknown=checks.filter(c=>c.state==='unknown');
  return {optionId,option,checks,effects,blockers,unknown,ready:!blockers.length&&!unknown.length,status:blockers.length?'Conflicts with your answers':unknown.length?'Needs clarification':'Ready for model review',driver:driver?{id:driver.id,title:driver.title,target:targetText(driver),confirmed:driver.targetConfirmed,measurable:targetIsMeasurable(driver),response:driver.response,conditions:driver.conditions,verification:driver.measurement}:null,caveats:[...(!driver||!targetIsMeasurable(driver)?['The selected scenario is not yet measurable. No target achievement is asserted.']:[]),...(a.workload==='unknown'?['Workload shape is unknown; buffering has no established demand justification.']:a.workload==='steady'&&queued?['A steady workload may not justify the extra queue. Compare the simpler request path.']:[]),...(a.owner.toLowerCase()==='unassigned'?['Operating ownership remains unresolved.']:[])],score:null};
}

export function assessInteraction(p,t,optionId){
 const result=assessInteractionCore(p,t,optionId);
 if(methodKnowledgeCurrent(p,interactionSourceReceipt(t))&&taskKnowledgeCurrent(p,t))return result;
 const finding={id:'knowledge-withdrawn',title:'Supporting method withdrawn',state:'blocked',detail:'Review this design against an available source basis before preparing or accepting changes.',sourceIds:[]};
 return {...result,ready:false,status:'Supporting knowledge changed',checks:[finding,...result.checks],blockers:[finding,...result.blockers]};
}
// A bounded knowledge graph joined to this task's project graph, with typed
// paths and source identities. It is a real query result, not an LLM transcript.
export function interactionReasoningGraph(p,t,optionId) {
  const assessment=assessInteraction(p,t,optionId), queued=optionId==='durable-queue',source=architectureSources(t);
  const nodes=[{id:t.requirementId,kind:'requirement',label:t.basis.requirement.title},{id:t.driverId,kind:'quality-scenario',label:assessment.driver?.title||'Missing quality scenario'},{id:optionId,kind:'pattern',label:assessment.option.pattern},{id:'tactic:'+optionId,kind:'tactic',label:assessment.option.tactic},{id:'capability:'+optionId,kind:'component-capability',label:assessment.option.capability||(queued?'Durable messaging':'Request connectivity')},...assessment.checks.map(c=>({id:'condition:'+c.id,kind:'prerequisite',label:c.title,state:c.state})),...[source.method,...source.references].map(s=>({id:s.id,kind:'source',label:s.title}))];
  const edges=[{from:t.requirementId,to:t.driverId,kind:'constrained-by'},{from:t.driverId,to:optionId,kind:'evaluated-against'},{from:optionId,to:'tactic:'+optionId,kind:'uses'},{from:optionId,to:'capability:'+optionId,kind:'realized-by'},...assessment.checks.flatMap(c=>[{from:optionId,to:'condition:'+c.id,kind:'requires'},...c.sourceIds.map(id=>({from:'condition:'+c.id,to:id,kind:'grounded-in'}))])];
  if(t.topic==='reads'){const dataId=t.answers.dataId||'read-scope:'+t.id;nodes.push({id:dataId,kind:'information',label:t.answers.readScope||'Information scope'});edges.push({from:optionId,to:dataId,kind:'reads'});if(t.answers.processorId){nodes.push({id:t.answers.processorId,kind:'authority',label:[...p.realisation.components,...p.interfaces.parties,...p.technologyRealisation.records].find(c=>c.id===t.answers.processorId)?.title||'Missing authority'});edges.push({from:dataId,to:t.answers.processorId,kind:'authoritative-in'});}if(optionId==='cache-aside')edges.push({from:'capability:'+optionId,to:dataId,kind:'copies-without-write-authority'});}
  if(t.topic==='persistence'){const dataId=t.answers.dataId||'persistence-scope:'+t.id;nodes.push({id:dataId,kind:'information',label:t.answers.dataScope||'Information scope'},{id:'commit:'+t.id,kind:'transaction-boundary',label:t.answers.invariant||'Invariant not recorded'},{id:'recovery:'+t.id,kind:'recovery-obligation',label:'RPO '+(t.answers.rpoSeconds||'unset')+' s / RTO '+(t.answers.rtoSeconds||'unset')+' s'});edges.push({from:optionId,to:dataId,kind:'persists'},{from:dataId,to:'commit:'+t.id,kind:'protected-by'},{from:dataId,to:'recovery:'+t.id,kind:'requires-recovery'});if(t.answers.processorId){nodes.push({id:t.answers.processorId,kind:'authority',label:[...p.realisation.components,...p.interfaces.parties,...p.technologyRealisation.records].find(c=>c.id===t.answers.processorId)?.title||'Missing authority'});edges.push({from:dataId,to:t.answers.processorId,kind:'authoritative-in'});}}
  for(const r of t.governedKnowledge||[]){nodes.push({id:r.claimId,kind:'knowledge-claim',label:r.statement||r.claimId},{id:r.sourceId,kind:'source',label:r.repository+' / '+r.path});edges.push({from:optionId,to:r.claimId,kind:'informed-by'},{from:r.claimId,to:r.sourceId,kind:'grounded-in'});}
  return {knowledge:structuredClone(t.governedKnowledge||[]),methodId:architectureMethod(t),scope:{requirementId:t.requirementId,driverId:t.driverId,taskId:t.id},nodes:[...new Map(nodes.map(n=>[n.id,n])).values()],edges,assessment,sourceFingerprint:t.methodReceipt.fingerprint,authority:'Conditional design guidance; no measured outcome or automatic approval'};
}

export function architectureReasoningMarkdown(t) {
  const graph=t.applied?.reasoningGraph;if(!graph)return '\nArchitecture method: '+t.methodReceipt?.packId+' · '+t.methodReceipt?.methodId+'\n\n';
  const a=graph.assessment,receipt=t.applied.methodReceipt||t.methodReceipt,s=receipt.sources;
  const support=(graph.knowledge||[]).map(r=>r.claimId+' / '+r.releaseId+' · '+r.path+' @ '+r.revision+' · SHA-256 '+r.sourceHash+'\nConditions: '+r.conditions.join('; ')+'\nLimitations: '+r.limitations.join('; ')).join('\n\n');
  return (t.assistedDrafts?.length?'\nSol drafting provenance (architect-selected draft conditions):\n'+t.assistedDrafts.map(d=>'- Request '+d.runId+' · '+d.generation.provider+' / '+d.generation.model+' · '+d.fields.map(f=>f.field).join(', ')+' · source assumptions retained in the saved comparison.').join('\n')+'\n':'')+(support?'\nRecorded knowledge at acceptance:\n'+support+'\n':'')+'\nArchitecture choice: '+a.option.pattern+'\n\nScope: '+t.requirementId+' / '+t.driverId+' · Decision: '+(t.applied.decisionId||'Not recorded')+'\n\nStyle context: '+a.option.style+' (local design scope; no whole-system style adoption).\n\nTactic: '+a.option.tactic+'\n\nConditions at acceptance:\n'+a.checks.map(c=>'- '+c.title+' ['+c.state+']: '+c.detail).join('\n')+'\n\nExpected effects and verification:\n'+a.effects.map(e=>'- '+e.quality+' — '+e.effect+': '+e.why+' Verify: '+e.verify).join('\n')+'\n\nReconsider when: '+a.option.counterfactual+'\n\nSources: '+s.method.file+' · '+s.method.sheet+' · SHA-256 '+s.method.fileSha256+'; '+s.references.map(r=>r.title+' ('+r.url+', inspected '+r.accessedAt+')').join('; ')+'\n\nMethod receipt: '+receipt.packId+' · '+receipt.fingerprint+'. Conditional guidance, not measured quality or external approval.\n\n';
}
const currentBasis=(p,t)=>{try{return designBasis(p,t.requirementId);}catch{return null;}};
const groundingStamp=(p,t)=>changeFingerprint([interactionSourceReceipt(t),t?{id:t.id,revision:t.revision,answers:t.answers,basis:t.sourceReview?.basis||t.basis,currentBasis:currentBasis(p,t),context:interactionContext(p,t.answers)}:null]);
export function interactionGroundingCurrent(p,s) {
  const isMethod=['interaction-method','reads-method','persistence-method',...Object.keys(COMPOSITION_TOPICS).map(k=>k+'-method')].includes(s.objectId),t=isMethod?null:(p.coauthoring?.designTasks||[]).find(t=>t.id===s.objectId&&t.kind==='architecture');
  return (!t||taskKnowledgeCurrent(p,t))&&methodKnowledgeCurrent(p,interactionSourceReceipt(isMethod?s.objectId.replace('-method',''):t))&&(isMethod||!!t)&&s.versionStamp===(isMethod?changeFingerprint([interactionSourceReceipt(s.objectId.replace('-method','')),null]):groundingStamp(p,t));
}
export function architectureGrounding(p,c,request) {
  const topic=compositionTopicForPrompt(request.prompt)||(/\b(persistence|database|transaction|transactions|relational|aggregate|RPO|RTO|backup|restore)\b/i.test(request.prompt)?'persistence':/\b(cache|cached|caching|freshness|authoritative read|read copy)\b/i.test(request.prompt)?'reads':'interaction');
  const t=[...c.tasks].reverse().find(t=>t.kind==='architecture'&&t.status!=='dismissed'&&(request.architectureTaskId?t.id===request.architectureTaskId:(t.topic||'interaction')===topic)&&(!request.requirementId||t.requirementId===request.requirementId));
  if(!t&&!extendedTopic(topic)&&!/\b(persistence|database|transaction|transactions|relational|aggregate|RPO|RTO|backup|restore|cache|cached|caching|freshness|authoritative read|read copy|queue|queued|buffering|asynchronous|synchronous|request.reply|interaction design)\b/i.test(request.prompt))return null;
  if(!methodKnowledgeCurrent(p,interactionSourceReceipt(t||topic)))return null;
  const source=architectureSources(t||topic);
  const sourceIndex=[source.method,...source.references].map(s=>({id:s.id,title:s.title,posture:s.posture,...(s.url?{url:s.url,section:s.section,accessedAt:s.accessedAt,statement:s.statement}:{file:s.file,fileSha256:s.fileSha256,passages:s.passages})}));
  const graphs=t?architectureOptions(t).map(o=>{const g=interactionReasoningGraph(p,t,o.id);return {optionId:o.id,nodes:g.nodes.filter(n=>n.kind!=='source').map(n=>t.topic==='persistence'?{...n,label:n.label.slice(0,160)}:n),edges:g.edges,checks:g.assessment.checks.map(c=>({id:c.id,state:c.state,detail:c.detail.slice(0,t.topic==='persistence'?180:260)})),effects:g.assessment.effects,caveats:g.assessment.caveats,score:null};}):[];
  // Keep shared checks once in the LLM packet, retaining every typed path
  // and each option's differences for all supported concerns.
  const common={};
  if(graphs.length>1)for(const key of ['nodes','edges','checks','effects','caveats']){
    const shared=graphs[0][key].filter(value=>graphs.every(g=>g[key].some(x=>JSON.stringify(x)===JSON.stringify(value))));
    common[key]=shared;for(const g of graphs)g[key]=g[key].filter(value=>!shared.some(x=>JSON.stringify(x)===JSON.stringify(value)));
  }
  const quantitative=t?.answers.analysis?{authority:'Analytical estimates from declared inputs; no target achievement.',alternatives:architectureOptions(t).map(o=>{const result=analyseQuality(t.topic,t.answers.analysis,o.id);return {...result,schema:undefined};})}:null;
  const packet={...(quantitative?{quantitative:{...quantitative,schema:undefined,measurements:(t.measurements||[]).slice(-3).map(m=>({id:m.id,current:measurementCurrent(p,t,m),metric:m.metricLabel,predicted:m.predicted,observedMean:m.mean,unit:m.unit,environment:m.environment.slice(0,240),workload:m.workload.slice(0,240),source:{...m.source,excerpt:m.source.excerpt.slice(0,1000),truncated:m.source.excerpt.length>1000},authority:m.authority}))}}:{}),governedKnowledge:t?.governedKnowledge||[],authority:'Explain alternatives only. Do not substitute generic boundary proposals. Checks use declared facts, not implementation proof. Review a stale task against current model context before adoption.',methodId:architectureMethod(t||topic),task:t?{id:t.id,topic:t.topic||'interaction',requirementId:t.requirementId,driverId:t.driverId,status:t.status,current:interactionContextCurrent(p,t)&&changeFingerprint(currentBasis(p,t))===changeFingerprint(t.sourceReview?.basis||t.basis),answers:Object.fromEntries(Object.entries(t.answers).map(([k,v])=>[k,v.slice(0,t.topic==='persistence'?200:300)]))}:null,...(Object.keys(common).length?{sharedByEveryAlternative:common}:{}),graphs,sources:sourceIndex};
  let shortened=false;
  {
    packet.edgeColumns=['from','relationship','to'];
    for(const g of [common,...graphs])if(g.edges)g.edges=g.edges.map(e=>[e.from,e.kind,e.to]);
  }
  let excerpt=JSON.stringify(packet);
  for(const limit of [160,120,80]){
    if(excerpt.length<=20000)break;
    for(const g of [common,...graphs]){for(const n of g.nodes||[])n.label=n.label.slice(0,limit);for(const c of g.checks||[])c.detail=c.detail.slice(0,limit);}
    if(packet.task)for(const key of Object.keys(packet.task.answers))if(!/Id$/.test(key))packet.task.answers[key]=packet.task.answers[key].slice(0,limit);
    shortened=true;excerpt=JSON.stringify(packet);
  }
  if(excerpt.length>20000)throw Error('The architecture source packet exceeds its review limit. Narrow the saved comparison before asking Sol.');
  return {id:'architecture:'+(t?.id||topic+'-method'),kind:'architecture-knowledge',objectId:t?.id||topic+'-method',title:t?'Architecture reasoning · '+t.id:extendedTopic(topic)?extendedTopic(topic).label+' · playbook and reference guidance':topic==='persistence'?'Persistence design · playbook and reference guidance':topic==='reads'?'Read design · playbook and reference guidance':'Interaction design · playbook and reference guidance',posture:'Source-pinned method and conditional project reasoning; analytical estimates are not measured outcomes',versionStamp:t?groundingStamp(p,t):changeFingerprint([interactionSourceReceipt(topic),null]),excerpt,truncated:shortened||!!t&&Object.values(t.answers).some(v=>v.length>(t.topic==='persistence'?160:260))};
}

export function refreshInteractionGrounding(p,s){const task=(p.coauthoring?.designTasks||[]).find(t=>t.id===s.objectId&&t.kind==='architecture');const fresh=architectureGrounding(p,{tasks:task?[task]:[]},{prompt:extendedTopic(task)?.concepts[0]||COMPOSITION_TOPICS[Object.keys(COMPOSITION_TOPICS).find(k=>s.objectId===k+'-method')]?.concepts[0]||(s.objectId==='persistence-method'||task?.topic==='persistence'?'persistence':s.objectId==='reads-method'||task?.topic==='reads'?'authoritative read':'interaction design'),architectureTaskId:task?.id});return {...s,...fresh,ref:s.ref};}
