import {architectureTaskContext} from './architecture-task-context.js';
import {extendedTopic,COMPOSITION_TOPICS,compositionSources,compositionMethod,compositionAnswers,assessComposition,compositionTopicForPrompt,COMPOSITION_SLOTS} from './composition-knowledge.js';
import {normaliseAnalysis,analyseQuality,measurementCurrent} from './quality-analysis.js';
import {methodKnowledgeCurrent,taskKnowledgeCurrent,claimReceiptCurrent,releasedClaims,claimReceipt} from './knowledge-governance.js';
import {technologyProductIdentity,technologyProductsMentioned} from './technology-catalogue.js';
import {PERSISTENCE_METHOD,PERSISTENCE_SOURCES,PERSISTENCE_OPTIONS,persistenceAnswers,persistenceContext,assessPersistence} from './persistence-knowledge.js';
import {READ_METHOD,READ_SOURCES,READ_OPTIONS,readAnswers,readContext,assessRead} from './read-design-knowledge.js';
import {INTERACTION_OPTIONS} from './interaction-knowledge.js';
import {ARCHITECTURE_SOURCES} from './architecture-source-pack.js';
import {changeFingerprint} from './changes-domain.js';
import {targetText, targetIsMeasurable, driverKind, driverKindOf, qualityType, driverCode} from './quality-domain.js';
import {designBasis} from './design-basis.js';
import {evaluateApplicability,evaluateArchitectureScope} from './architecture-facts.js';
import {driverScope,driversForRequirement,driversForComponent,driverForTask} from './driver-scope.js';
import {ARCHITECTURE_EVALUATION_REVISION,architectureMethodReceiptStatus} from './composition-manifest.js';
export {ARCHITECTURE_EVALUATION_REVISION} from './composition-manifest.js';

export {ARCHITECTURE_SOURCES};

// The Chapter 7 and Design Resources reading of the *same* governed claims that Sol uses.
// Structured scope helps an architect find relevant knowledge; it never proves the
// claim's written conditions, a product's suitability, or a quality target.
export function architectureKnowledgeSnapshot(p){
  return releasedClaims(p).filter(h=>h.eligible&&h.claim.architectureUnit).map(({claim,release})=>({claim,release,receipt:claimReceipt(p,claim,release)}));
}
export function architectureKnowledgeForChoice(p,choice={},knowledgeSnapshot=architectureKnowledgeSnapshot(p)){
  const matches=[];let excludedCount=0;
  for(const {claim,receipt} of knowledgeSnapshot){
    const applicability=evaluateArchitectureScope(claim.architectureUnit,choice,{productIdentity:technologyProductIdentity});
    if(applicability.state==='excluded'){excludedCount++;continue;}
    matches.push({statement:claim.statement,claimType:claim.claimType,receipt,applicability,unit:claim.architectureUnit,conditions:claim.conditions,limitations:claim.limitations});
  }
  matches.sort((a,b)=>Number(a.applicability.state==='needs-context')-Number(b.applicability.state==='needs-context')||a.receipt.releaseId.localeCompare(b.receipt.releaseId)||a.receipt.claimId.localeCompare(b.receipt.claimId));
  return {matches,excludedCount};
}
const claimKey=(releaseId,claimId)=>releaseId+':'+claimId;
// Product-specific claims enter Sol only when the question and the saved
// realization leave their structured scope possible. Missing configuration is
// retained as an explicit open condition; conflicting configuration is omitted.
export function architectureClaimScope(p,{objectId='',query=''}={},knowledgeSnapshot=architectureKnowledgeSnapshot(p)){
 const mentioned=technologyProductsMentioned(query),record=(p.technologyRealisation?.records||[]).find(r=>r.id===objectId),options=Array.isArray(record?.options)?record.options:null;
 const mappings=(p.technologyRealisation?.mappings||[]).filter(m=>m.realizationId===objectId),capabilities=(p.technology?.capabilities||[]).filter(c=>mappings.some(m=>m.capabilityId===c.id));
 const statuses=new Map(),excluded=new Map();
 if(options){
  for(const o of options.filter(x=>!mentioned.size||mentioned.has(technologyProductIdentity(x.product)))){
   const reading=architectureKnowledgeForChoice(p,{...o,capabilities,tier:o.serviceTier},knowledgeSnapshot);
   for(const hit of reading.matches){const key=claimKey(hit.receipt.releaseId,hit.receipt.claimId),current=statuses.get(key);if(!current||current==='needs-context')statuses.set(key,hit.applicability.state);}
  }
 }
 for(const {claim,release} of knowledgeSnapshot){
  const scope=claim.architectureUnit.scope||{},key=claimKey(release.id,claim.id),product=technologyProductIdentity(scope.product);
  if(product&&mentioned.size&&!mentioned.has(product))excluded.set(key,'The question concerns a different named product.');
  else if(options&&Object.values(scope).some(Boolean)&&!statuses.has(key))excluded.set(key,'No saved option matches this claim’s product, capability or configuration scope.');
 }
 return {statuses,excluded};
}
export const INTERACTION_METHOD = 'interaction-design-1';
// This versions AIW's executable interpretation, separately from the publisher's
// evidence. Saved receipts remain immutable; changed interpretation requires an
// explicit source review through the existing task workflow.
const evaluatedSource=source=>({...source,evaluationRevision:ARCHITECTURE_EVALUATION_REVISION});
export {INTERACTION_OPTIONS} from './interaction-knowledge.js';
INTERACTION_OPTIONS[0].applicability={id:'request-reply',requires:[]};
INTERACTION_OPTIONS[1].applicability={id:'durable-queue',requires:[{id:'completion',fact:'completion',op:'eq',value:'deferred',label:'Deferred business completion',question:'May the response acknowledge acceptance while the final business result arrives later?',sourceIds:['MS-QUEUE-LEVELING']},{id:'duplicates',fact:'duplicates',op:'oneOf',value:['idempotent','deduplicated'],label:'Controlled repeated business effects',question:'Is repeated delivery idempotent or atomically deduplicated?',sourceIds:['MS-COMPETING-CONSUMERS']}]};
const topicOf=t=>typeof t==='string'?t:t?.topic||'interaction';
export const knowledgeConcern=t=>t?.governedConcern||t?.methodReceipt?.governedConcern||null;
// Round 25 (D-25-10, K2): the project's drivers a released criterion is tied to (domain-knowledge.js): those of its
// quality category and of its driver kind, where it states them, in record order; none for a criterion tied to neither.
// The guided comparison links them to the decision it drafts (architecture-design.js), by the person's reviewed apply.
export const criterionDrivers=(p,c)=>!c?.category&&!c?.kind?[]:(p?.quality?.drivers||[]).filter(d=>(!c.category||driverKind(d)==='quality'&&d.category===c.category)&&(!c.kind||driverKind(d)===c.kind));
const scopeName=c=>(c.category?qualityType(c.category)?.name:driverKindOf(c.kind)?.name||c.kind||'').toLowerCase();
// What a released criterion adds where an option is assessed on it: the option's released consequence on it, and the
// drivers it weighs here (or that the project records none); '' for a criterion and an option that state neither.
function criterionWords(p,c,released){
  const said=released?.consequences?.[c.id],drivers=c.category||c.kind?criterionDrivers(p,c):null;
  return (said?' Released consequence: '+said:'')+(drivers?drivers.length?' It weighs '+drivers.map(d=>driverCode(p,d)).join(', ')+' ('+scopeName(c)+').':' No '+scopeName(c)+' driver is recorded in this project.':'');
}
export const architectureOptions=t=>knowledgeConcern(t)?knowledgeConcern(t).options.map(o=>({id:o.id,title:o.title,pattern:o.title,style:'Project-scoped comparison',tactic:'Assess released criteria',benefit:'Possible fit; record the project-specific reason for each criterion.',cost:o.tradeoff,counterfactual:'Reconsider when the linked quality scenario, source conditions or project constraints change.'})):extendedTopic(t)?extendedTopic(t).options:topicOf(t)==='persistence'?PERSISTENCE_OPTIONS:topicOf(t)==='reads'?READ_OPTIONS:INTERACTION_OPTIONS;
export const architectureSources=t=>{
 const c=knowledgeConcern(t);if(c){const r=c.receipt;return evaluatedSource({id:'KNOWLEDGE-CONCERN-'+c.id,version:1,method:{id:r.claimId,title:c.title,file:r.path,fileSha256:r.sourceHash,sheet:r.revision,passages:[{locator:'lines '+r.lineStart+'–'+r.lineEnd,text:c.statement}]},references:[],authority:{automaticAdoption:false,scoring:false,modelMutation:'Reviewed architect proposal only'},claim:r});}
 return evaluatedSource(extendedTopic(t)?compositionSources(topicOf(t)):topicOf(t)==='persistence'?PERSISTENCE_SOURCES:topicOf(t)==='reads'?READ_SOURCES:ARCHITECTURE_SOURCES);
};
export const architectureMethod=t=>knowledgeConcern(t)?'knowledge-concern:'+knowledgeConcern(t).id:extendedTopic(t)?compositionMethod(topicOf(t)):topicOf(t)==='persistence'?PERSISTENCE_METHOD:topicOf(t)==='reads'?READ_METHOD:INTERACTION_METHOD;
const copy=v=>structuredClone(v), text=(v,n=2400)=>typeof v==='string'?v.trim().slice(0,n):'';
export const INTERACTION_FIELDS = ['completion','duplicates','ordering','workload','owner','information','failure','capacity','outcome','reason','boundaryId','trustName','trustPolicy','callerId','processorId','queueId','capabilityId','callerTitle','processorTitle','queueTitle','contextReview'];
export function architectureDriverContext(p,t={}){
 const linked=driversForRequirement(p,t.requirementId),components=[...(t.basis?.contextIds||[]),...COMPOSITION_SLOTS.map(k=>t.answers?.[k+'Id'])].filter(Boolean);
 const ids=new Set([...linked.map(d=>d.id),...(t.driverIds||[]),...(t.basis?.drivers||[]).map(d=>d.id),t.driverId,...components.flatMap(id=>driversForComponent(p,id).map(d=>d.id))].filter(Boolean));
 const drivers=(p.quality?.drivers||[]).filter(d=>ids.has(d.id));
 return {driverIds:drivers.map(d=>d.id),drivers:drivers.map(d=>({id:d.id,title:d.title,kind:driverKind(d),category:d.category,priority:d.priority,target:driverKind(d)==='quality'?targetText(d):d.description||d.impact||'',confirmed:driverKind(d)==='quality'?d.targetConfirmed:d.confirmed,measurable:driverKind(d)==='quality'&&targetIsMeasurable(d),response:d.response,conditions:d.conditions,verification:d.measurement,scope:driverScope(p,d)})),missing:[...ids].filter(id=>!drivers.some(d=>d.id===id))};
}
// These are questions to consider in this scope, never recommendations to add a
// mechanism. The existing guided comparison establishes its applicability.
export function architectureAgenda(p,{requirementId,contextIds=[]}={}){
 const context=architectureDriverContext(p,{requirementId,basis:{contextIds}}),categories={interaction:['performance','availability','scalability','integrity'],reads:['performance','scalability','availability','security'],persistence:['integrity','recoverability','security'],delivery:['integrity','recoverability','traceability'],resilience:['availability','reliability','recoverability','performance'],distribution:['scalability','availability','performance','security'],partitioning:['scalability','integrity','security'],structure:['maintainability','modifiability','deployability','scalability']};
 const main={interaction:{label:'Completion and messaging',question:'Must this operation finish inside the response, or may it complete later?'},reads:{label:'Read freshness and reuse',question:'Can an eligible repeated read use a bounded older copy?'},persistence:{label:'Data integrity and recovery',question:'What must commit together, and what must be recoverable?'}};
 return Object.entries(categories).map(([topic,cats])=>{const driverIds=context.drivers.filter(d=>cats.includes(d.category)||d.kind!=='quality').map(d=>d.id);return {topic,...(main[topic]||{label:COMPOSITION_TOPICS[topic].label,question:COMPOSITION_TOPICS[topic].question}),driverIds,reason:driverIds.length?'Consider this question against the linked drivers; no mechanism has been selected.':'Clarify whether this responsibility exists in the selected scope.'};}).sort((a,b)=>Number(!!b.driverIds.length)-Number(!!a.driverIds.length));
}
function interactionObligations(a,queued){
 const ob=(id,title,kind,role,fieldKeys,detail,verification)=>({id,title,kind,detail,fieldKeys,sourceIds:['MS-QUEUE-LEVELING','MS-COMPETING-CONSUMERS'],placement:{role,componentId:a[role+'Id']||'',scope:kind==='invariant'?'data-boundary':'policy'},verification,status:fieldKeys.every(k=>a[k]&&a[k]!=='unknown')?'declared':'open'});
 return [ob('interaction-completion','Business completion contract','invariant','caller',['completion','failure'],'Acknowledgement, final result and uncertain outcome have distinct meanings.','Time out before and after the effect; verify the caller can distinguish the final result.'),ob('interaction-authority','Authoritative business effect','invariant','processor',['information',...(queued?['duplicates']:[])],'Keep the permitted writer and repeated-effect protection at the business commit.','Repeat the original identity after a crash and reconcile the authoritative result.'),...(queued?[ob('queue-backlog','Backlog, retention and controlled admission','capacity','queue',['capacity','ordering'],'A queue buffers rate mismatch; it does not increase safe downstream capacity.','Interrupt consumers, grow backlog, and verify admission plus drain within the completion bound.'),ob('queue-outcome','Final outcome and poison-work recovery','operations','processor',['outcome','failure','owner'],'Name outcome discovery, recovery ownership and treatment of work that cannot complete.','Recover a failed consumer and a poison item; verify discoverable outcomes without duplicate effects.')]:[])];
}
export function interactionAnswers(raw={},topic=raw.compositionTopic|| (Object.hasOwn(raw,'transactionScope')?'persistence':Object.hasOwn(raw,'freshness')?'reads':'interaction')) {
  if(String(topic).startsWith('knowledge:'))return {criteriaNotes:text(raw.criteriaNotes,12000),owner:text(raw.owner,160),reason:text(raw.reason,2400),contextReview:text(raw.contextReview,2400)};
  if(extendedTopic(topic))return {...compositionAnswers(raw,topic),...(raw.analysis?{analysis:normaliseAnalysis(raw.analysis,topic)}:{})};
  if(topic==='persistence')return {...persistenceAnswers(raw),...(raw.analysis?{analysis:normaliseAnalysis(raw.analysis,topic)}:{})};
  if(topic==='reads')return {...readAnswers(raw),...(raw.analysis?{analysis:normaliseAnalysis(raw.analysis,topic)}:{})};
  const a=Object.fromEntries(INTERACTION_FIELDS.map(k=>[k,text(raw[k],/Id$/.test(k)?100:/Title$/.test(k)||k==='owner'||k==='trustName'?160:2400)]));
  for(const [key,choices] of Object.entries({completion:['immediate','deferred','unknown'],duplicates:['idempotent','deduplicated','unsafe','unknown'],ordering:['none','per-key','global','unknown'],workload:['bursty','steady','unknown']}))if(!choices.includes(a[key]))a[key]='unknown';
  return {...a,...(raw.analysis?{analysis:normaliseAnalysis(raw.analysis,topic)}:{})};
}
export function interactionSourceReceipt(topic) {
  const source=architectureSources(topic);return {methodId:architectureMethod(topic),packId:source.id,fingerprint:changeFingerprint(source),sources:copy(source),...(knowledgeConcern(topic)?{governedConcern:copy(knowledgeConcern(topic))}:{}),scoring:false};
}
export const topicFromReceipt=r=>r?.methodId?.startsWith('knowledge-concern:')?'knowledge:'+r.methodId.slice('knowledge-concern:'.length):Object.keys(COMPOSITION_TOPICS).find(k=>compositionMethod(k)===r?.methodId)||(r?.methodId===PERSISTENCE_METHOD?'persistence':r?.methodId===READ_METHOD?'reads':'interaction');
export const interactionReceiptCurrent=r=>{const topic=r?.governedConcern?{governedConcern:r.governedConcern}:topicFromReceipt(r),source=architectureSources(topic);return architectureMethodReceiptStatus(r,{methodId:architectureMethod(topic),packId:source.id,fingerprint:changeFingerprint(source)}).current;};
export const interactionContext=(p,answers)=>{const a=interactionAnswers(answers);return architectureTaskContext(p,a,{...(Object.hasOwn(a,'freshness')?{readContext:readContext(p,a)}:{}),...(Object.hasOwn(a,'transactionScope')?{persistenceContext:persistenceContext(p,a)}:{})});};
export function interactionContextCurrent(p,t) {
  return (!knowledgeConcern(t)||claimReceiptCurrent(p,knowledgeConcern(t).receipt))&&taskKnowledgeCurrent(p,t)&&methodKnowledgeCurrent(p,t.methodReceipt)&&interactionReceiptCurrent(t.methodReceipt)&&changeFingerprint(interactionContext(p,t.answers))===changeFingerprint(t.architectureBasis);
}

// Explicit architect answers and typed model references drive these checks.
// Text resemblance never satisfies a prerequisite, and no benefit is scored.
function assessInteractionCore(p,t,optionId) {
  if(knowledgeConcern(t)){
    const concern=knowledgeConcern(t),option=architectureOptions(t).find(o=>o.id===optionId);if(!option)throw Error('Choose a released design approach.');
    const driver=driverForTask(p,t);
    let notes={};try{notes=JSON.parse(t.answers.criteriaNotes||'{}');}catch{notes={};}
    const checks=[{id:'driver',title:'Focus driver',state:driver?'known':'unknown',detail:driver?.title||'Link a current architecture driver to this scope.',sourceIds:[]}];
    // Round 25 (D-25-10, K2): the released option's consequence on each criterion, the drivers a criterion weighs and
    // the evidence the option needs are said where it is assessed, in its checks, effects and caveats. Its effects stay
    // an architect's assessment: nothing here scores an option or fills an effect.
    const released=concern.options.find(o=>o.id===optionId)||{},note=c=>typeof notes?.[optionId]?.[c.id]==='string'?notes[optionId][c.id].trim():'';
    for(const criterion of concern.criteria){checks.push({id:criterion.id,title:criterion.label,state:note(criterion)?'known':'unknown',detail:(note(criterion)||criterion.question)+criterionWords(p,criterion,released),sourceIds:[concern.receipt.claimId]});}
    if(t.basis.decisions.length||t.basis.constraints.length)checks.push({id:'upstream',title:'Existing decisions and constraints',state:t.answers.contextReview?'known':'unknown',detail:t.answers.contextReview||'Explain how the approach respects the current decisions and constraints.',sourceIds:[]});
    const unknown=checks.filter(c=>c.state==='unknown'),effects=concern.criteria.map(c=>({quality:c.label,effect:'Architect assessment needed',why:(note(c)||c.question)+(released.consequences?.[c.id]?' Released consequence: '+released.consequences[c.id]:''),verify:'Establish evidence against the linked architecture drivers before claiming an outcome.'}));
    return {optionId,option,checks,effects,blockers:[],unknown,ready:!unknown.length,status:unknown.length?'Needs clarification':'Ready for decision review',driver:driver?{id:driver.id,title:driver.title,kind:driverKind(driver),category:driver.category,target:driverKind(driver)==='quality'?targetText(driver):driver.description||driver.impact||'',confirmed:driverKind(driver)==='quality'?driver.targetConfirmed:driver.confirmed,measurable:driverKind(driver)==='quality'&&targetIsMeasurable(driver),response:driverKind(driver)==='quality'?driver.response:driver.impact,conditions:driver.conditions,verification:driver.measurement}:null,caveats:[...concern.conditions,...concern.limitations,...(released.evidence?['The evidence '+option.title+' needs, as the released concern states: '+released.evidence]:[]),'Released guidance informs a comparison; it does not score the alternatives, establish quality achievement or approve a choice.'],score:null};
  }
  if(extendedTopic(t))return assessComposition(p,t,optionId);
  if(t.topic==='persistence')return assessPersistence(p,t,optionId);
  if(t.topic==='reads')return assessRead(p,t,optionId);
  const option=INTERACTION_OPTIONS.find(o=>o.id===optionId);if(!option)throw Error('Choose an interaction approach.');
  const a=interactionAnswers(t.answers), queued=optionId==='durable-queue';
  const driver=driverForTask(p,t);
  const checks=[];
  const check=(id,title,state,detail,sourceIds=[])=>checks.push({id,title,state,detail,sourceIds});
  check('driver','Focus driver',driver?'known':'unknown',driver?driver.id+' · '+driver.title:'Link a current architecture driver to this scope.',['SA-COMPONENT-METHOD']);
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
  return {optionId,option,checks,effects,blockers,unknown,applicability:evaluateApplicability(option.applicability,a),obligations:interactionObligations(a,queued),placement:[{role:'caller',responsibility:'Request and result contract',componentId:a.callerId||'',scope:'responsibility'},{role:'processor',responsibility:'Authoritative business processing',componentId:a.processorId||'',scope:'responsibility'},...(queued?[{role:'queue',responsibility:'Durable intake and controlled delivery',componentId:a.queueId||'',scope:'responsibility'}]:[])],ready:!blockers.length&&!unknown.length,status:blockers.length?'Conflicts with your answers':unknown.length?'Needs clarification':'Ready for model review',driver:driver?{id:driver.id,title:driver.title,kind:driverKind(driver),category:driver.category,target:driverKind(driver)==='quality'?targetText(driver):driver.description||driver.impact||'',confirmed:driverKind(driver)==='quality'?driver.targetConfirmed:driver.confirmed,measurable:driverKind(driver)==='quality'&&targetIsMeasurable(driver),response:driverKind(driver)==='quality'?driver.response:driver.impact,conditions:driver.conditions,verification:driver.measurement}:null,caveats:[...(driver&&driverKind(driver)==='quality'&&!targetIsMeasurable(driver)?['The selected scenario is not yet measurable. No target achievement is asserted.']:[]),...(a.workload==='unknown'?['Workload shape is unknown; buffering has no established demand justification.']:a.workload==='steady'&&queued?['A steady workload may not justify the extra queue. Compare the simpler request path.']:[]),...(a.owner.toLowerCase()==='unassigned'?['Operating ownership remains unresolved.']:[])],score:null};
}

export function assessInteraction(p,t,optionId){
 const result=assessInteractionCore(p,t,optionId),context=architectureDriverContext(p,t);
 Object.assign(result,{drivers:context.drivers,driverIds:context.driverIds,driverScope:context.drivers.map(d=>d.scope)});
 const fields={upstream:['contextReview'],trust:['boundaryId','trustName','trustPolicy'],scope:[t.topic==='reads'?'readScope':'dataScope'],data:['dataId','processorId'],'atomic-scope':['transactionScope'],'source-read':['authorityPolicy'],'freshness-plan':['freshnessPlan'],'cache-failure':['cacheFailure'],'origin-failure':['originFailure'],'aggregate-bound':['aggregateBound'],'restore-test':['restoreTest'],'zero-loss':['zeroLossPlan'],rpo:['rpoSeconds'],rto:['rtoSeconds'],age:['maxAge'],permission:['cachePermission'],access:['accessPattern'],writers:['writePolicy'],schema:['schemaPlan'],protection:['isolation']};
 result.checks=result.checks.map(c=>({...c,fieldKeys:c.fieldKeys||fields[c.id]||[c.id]}));
 if(context.missing.length){const finding={id:'driver-scope',title:'Linked driver scope',state:'blocked',detail:'Review missing linked drivers: '+context.missing.join(', ')+'.',fieldKeys:['driverId'],sourceIds:['SA-COMPONENT-METHOD']};result.checks.push(finding);result.ready=false;result.status='Linked driver scope changed';}
 result.blockers=result.checks.filter(c=>c.state==='blocked');result.unknown=result.checks.filter(c=>c.state==='unknown');
 if((!knowledgeConcern(t)||claimReceiptCurrent(p,knowledgeConcern(t).receipt))&&methodKnowledgeCurrent(p,interactionSourceReceipt(t))&&taskKnowledgeCurrent(p,t))return result;
 const finding={id:'knowledge-withdrawn',title:'Supporting method withdrawn',state:'blocked',detail:'Review this design against an available source basis before preparing or accepting changes.',sourceIds:[]};
 return {...result,ready:false,status:'Supporting knowledge changed',checks:[finding,...result.checks],blockers:[finding,...result.blockers]};
}
function completeReasoningGraph(graph,t){
 const a=graph.assessment,nodes=new Map(graph.nodes.map(n=>[n.id,n])),edges=graph.edges;
 graph.scope={...graph.scope,driverIds:a.driverIds||[t.driverId],contextIds:[...(t.basis?.contextIds||[])]};
 graph.drivers=copy(a.drivers||[]);graph.placement=copy(a.placement||[]);graph.obligations=copy(a.obligations||[]);
 for(const driver of a.drivers||[]){if(!nodes.has(driver.id))nodes.set(driver.id,{id:driver.id,kind:'driver',label:driver.title,driverKind:driver.kind,category:driver.category});if(!edges.some(e=>e.from===driver.id&&e.to===a.optionId))edges.push({from:driver.id,to:a.optionId,kind:'evaluated-against'});}
 for(const place of graph.placement){const id='placement:'+place.role;nodes.set(id,{id,kind:'placement',label:place.responsibility,role:place.role,hostRole:place.hostRole||'',componentId:place.componentId||'',scope:place.scope});edges.push({from:a.optionId,to:id,kind:'places-responsibility'});}
 for(const obligation of graph.obligations){const id='obligation:'+obligation.id;nodes.set(id,{id,kind:'design-obligation',label:obligation.title,state:obligation.status,obligationKind:obligation.kind});edges.push({from:a.optionId,to:id,kind:'requires'});const placement='placement:'+obligation.placement?.role;if(nodes.has(placement))edges.push({from:id,to:placement,kind:'owned-at'});for(const sourceId of obligation.sourceIds||[])if(nodes.has(sourceId))edges.push({from:id,to:sourceId,kind:'grounded-in'});}
 graph.nodes=[...nodes.values()];return graph;
}
// A bounded knowledge graph joined to this task's project graph, with typed
// paths and source identities. It is a real query result, not an LLM transcript.
export function interactionReasoningGraph(p,t,optionId) {
  const assessment=assessInteraction(p,t,optionId), queued=optionId==='durable-queue',source=architectureSources(t);
  if(knowledgeConcern(t)){
    const r=knowledgeConcern(t).receipt,nodes=[{id:t.requirementId,kind:'requirement',label:t.basis.requirement.title},{id:t.driverId,kind:assessment.driver?.kind==='quality'?'quality-scenario':'driver',label:assessment.driver?.title||'Missing focus driver',driverKind:assessment.driver?.kind,category:assessment.driver?.category},{id:optionId,kind:'approach',label:assessment.option.title},{id:r.claimId,kind:'knowledge-claim',label:knowledgeConcern(t).statement},{id:r.sourceId,kind:'source',label:r.path},...assessment.checks.map(c=>({id:'criterion:'+c.id,kind:'criterion',label:c.title,state:c.state}))];
    const edges=[{from:t.requirementId,to:t.driverId,kind:'constrained-by'},{from:t.driverId,to:optionId,kind:'evaluated-against'},{from:optionId,to:r.claimId,kind:'informed-by'},{from:r.claimId,to:r.sourceId,kind:'grounded-in'},...assessment.checks.map(c=>({from:optionId,to:'criterion:'+c.id,kind:'assessed-on'}))];
    // A criterion tied to a quality category or a driver kind weighs the project's drivers of it (round 25, K2).
    for(const c of knowledgeConcern(t).criteria)for(const d of criterionDrivers(p,c)){if(!nodes.some(n=>n.id===d.id))nodes.push({id:d.id,kind:'driver',label:d.title});edges.push({from:'criterion:'+c.id,to:d.id,kind:'weighs'});}
    return completeReasoningGraph({knowledge:[r],methodId:architectureMethod(t),scope:{requirementId:t.requirementId,driverId:t.driverId,taskId:t.id},nodes,edges,assessment,sourceFingerprint:t.methodReceipt.fingerprint,authority:'Conditional source-guided comparison; no score, measured outcome or automatic approval'},t);
  }
  const nodes=[{id:t.requirementId,kind:'requirement',label:t.basis.requirement.title},{id:t.driverId,kind:assessment.driver?.kind==='quality'?'quality-scenario':'driver',label:assessment.driver?.title||'Missing focus driver',driverKind:assessment.driver?.kind,category:assessment.driver?.category},{id:optionId,kind:'pattern',label:assessment.option.pattern},{id:'tactic:'+optionId,kind:'tactic',label:assessment.option.tactic},{id:'capability:'+optionId,kind:'component-capability',label:assessment.option.capability||(queued?'Durable messaging':'Request connectivity')},...assessment.checks.map(c=>({id:'condition:'+c.id,kind:'prerequisite',label:c.title,state:c.state})),...[source.method,...source.references].map(s=>({id:s.id,kind:'source',label:s.title}))];
  const edges=[{from:t.requirementId,to:t.driverId,kind:'constrained-by'},{from:t.driverId,to:optionId,kind:'evaluated-against'},{from:optionId,to:'tactic:'+optionId,kind:'uses'},{from:optionId,to:'capability:'+optionId,kind:'realized-by'},...assessment.checks.flatMap(c=>[{from:optionId,to:'condition:'+c.id,kind:'requires'},...c.sourceIds.map(id=>({from:'condition:'+c.id,to:id,kind:'grounded-in'}))])];
  if(t.topic==='reads'){const dataId=t.answers.dataId||'read-scope:'+t.id;nodes.push({id:dataId,kind:'information',label:t.answers.readScope||'Information scope'});edges.push({from:optionId,to:dataId,kind:'reads'});if(t.answers.processorId){nodes.push({id:t.answers.processorId,kind:'authority',label:[...p.realisation.components,...p.interfaces.parties,...p.technologyRealisation.records].find(c=>c.id===t.answers.processorId)?.title||'Missing authority'});edges.push({from:dataId,to:t.answers.processorId,kind:'authoritative-in'});}if(optionId==='cache-aside')edges.push({from:'capability:'+optionId,to:dataId,kind:'copies-without-write-authority'});}
  if(t.topic==='persistence'){const dataId=t.answers.dataId||'persistence-scope:'+t.id;nodes.push({id:dataId,kind:'information',label:t.answers.dataScope||'Information scope'},{id:'commit:'+t.id,kind:'transaction-boundary',label:t.answers.invariant||'Invariant not recorded'},{id:'recovery:'+t.id,kind:'recovery-obligation',label:'RPO '+(t.answers.rpoSeconds||'unset')+' s / RTO '+(t.answers.rtoSeconds||'unset')+' s'});edges.push({from:optionId,to:dataId,kind:'persists'},{from:dataId,to:'commit:'+t.id,kind:'protected-by'},{from:dataId,to:'recovery:'+t.id,kind:'requires-recovery'});if(t.answers.processorId){nodes.push({id:t.answers.processorId,kind:'authority',label:[...p.realisation.components,...p.interfaces.parties,...p.technologyRealisation.records].find(c=>c.id===t.answers.processorId)?.title||'Missing authority'});edges.push({from:dataId,to:t.answers.processorId,kind:'authoritative-in'});}}
  for(const r of t.governedKnowledge||[]){nodes.push({id:r.claimId,kind:'knowledge-claim',label:r.statement||r.claimId},{id:r.sourceId,kind:'source',label:r.repository+' / '+r.path});edges.push({from:optionId,to:r.claimId,kind:'informed-by'},{from:r.claimId,to:r.sourceId,kind:'grounded-in'});}
  return completeReasoningGraph({knowledge:structuredClone(t.governedKnowledge||[]),methodId:architectureMethod(t),scope:{requirementId:t.requirementId,driverId:t.driverId,taskId:t.id},nodes:[...new Map(nodes.map(n=>[n.id,n])).values()],edges,assessment,sourceFingerprint:t.methodReceipt.fingerprint,authority:'Conditional design guidance; no measured outcome or automatic approval'},t);
}

export function architectureReasoningMarkdown(t) {
  const graph=t.applied?.reasoningGraph;if(!graph)return '\nArchitecture method: '+t.methodReceipt?.packId+' · '+t.methodReceipt?.methodId+'\n\n';
  const a=graph.assessment,receipt=t.applied.methodReceipt||t.methodReceipt,s=receipt.sources;
  const support=(graph.knowledge||[]).map(r=>r.claimId+' / '+r.releaseId+' · '+r.path+' @ '+r.revision+' · SHA-256 '+r.sourceHash+'\nConditions: '+r.conditions.join('; ')+'\nLimitations: '+r.limitations.join('; ')).join('\n\n');
  return (t.assistedDrafts?.length?'\nSol drafting provenance (architect-selected draft conditions):\n'+t.assistedDrafts.map(d=>'- Request '+d.runId+' · '+d.generation.provider+' / '+d.generation.model+' · '+d.fields.map(f=>f.field).join(', ')+' · source assumptions retained in the saved comparison.').join('\n')+'\n':'')+(support?'\nRecorded knowledge at acceptance:\n'+support+'\n':'')+'\nArchitecture choice: '+a.option.pattern+'\n\nScope: '+t.requirementId+' / '+(graph.scope.driverIds||[t.driverId]).join(', ')+' · Decision: '+(t.applied.decisionId||'Not recorded')+'\n\nStyle context: '+a.option.style+' (local design scope; no whole-system style adoption).\n\nTactic: '+a.option.tactic+'\n\nConditions at acceptance:\n'+a.checks.map(c=>'- '+c.title+' ['+c.state+']: '+c.detail).join('\n')+'\n\nExpected effects and verification:\n'+a.effects.map(e=>'- '+e.quality+' — '+e.effect+': '+e.why+' Verify: '+e.verify).join('\n')+'\n\nReconsider when: '+a.option.counterfactual+'\n\nSources: '+s.method.file+' · '+s.method.sheet+' · SHA-256 '+s.method.fileSha256+'; '+s.references.map(r=>r.title+' ('+r.url+', inspected '+r.accessedAt+')').join('; ')+'\n\nMethod receipt: '+receipt.packId+' · '+receipt.fingerprint+'. Conditional guidance, not measured quality or external approval.\n\n';
}
const currentBasis=(p,t)=>{try{return designBasis(p,t.requirementId,undefined,undefined,undefined,t.basis?.contextIds||[]);}catch{return null;}};
function solutionForGrounding(solution,common,graphs){
 const out=copy(solution);
 const selected=graphs.find(g=>g.optionId===solution.optionId),methodObligations=[...(common.obligations||[]),...(selected?.obligations||[])],methodEffects=[...(common.effects||[]),...(selected?.effects||[])];
 // Values are already in task.answers. Keep the exact parameter and target
 // references rather than repeat long policies for every component.
 out.parameterValues='Saved keys; current answers may differ.';
 out.specificationColumns=['componentId','responsibilityIds','capabilityIds','contractIds','dataIds','obligationIds','parameterKeys'];
 out.specifications=(out.specifications||[]).map(s=>[s.componentId,s.responsibilityIds,s.capabilityIds,s.contractIds,s.dataIds,s.obligationIds,Object.keys(s.parameters||{})]);
 out.alternatives=(out.alternatives||[]).map(a=>({optionId:a.optionId||a.id||a.option?.id||'',selected:!!a.selected,status:a.status||'',blockerIds:(a.blockers||a.checks?.filter(c=>c.state==='blocked')||[]).map(b=>b.id),unknownIds:(a.unknown||a.checks?.filter(c=>c.state==='unknown')||[]).map(c=>c.id)}));
 out.obligationReferences='Exact saved action/evidence match; resolve by method id or selected/shared effect quality.';
 out.obligations=(out.obligations||[]).map(({driverIds,...o})=>{
  const method=methodObligations.find(m=>m.detail===o.action&&m.verification===o.evidence&&m.kind===o.kind),effect=methodEffects.find(e=>e.quality+': '+e.why===o.action&&e.verify===o.evidence);
  if(method||effect)return {id:o.id,targetIds:o.targetIds,declared:o.declared,verification:o.verification,...(method?{methodObligationId:method.id}:{methodEffectQuality:effect.quality})};
  return {...o,action:String(o.action||'').slice(0,180),evidence:String(o.evidence||'').slice(0,180)};
 });
 out.placement=(out.placement||[]).map(p=>({...p,responsibility:String(p.responsibility||'').slice(0,180)}));
 return out;
}
function tableRows(values,columns){return values.map(value=>{const row=columns.map(key=>value[key]??null);while(row.length&&row.at(-1)===null)row.pop();return row;});}
function compactGroundingContext(packet){
 // These are reversible projections of the source packet, not new judgements.
 // Preserve all typed driver paths and saved obligation targets without repeating
 // the same field names and declarations for every relationship.
 if(packet.task){
  const pathKinds=[],paths=[],pathIndex=new Map();packet.driverPathColumns=['kindIndex','to','via'];packet.driverPathKinds=pathKinds;packet.driverPathPool=paths;
  for(const driver of packet.task.drivers){driver.scope.pathRefs=driver.scope.paths.map(path=>{let kindIndex=pathKinds.indexOf(path.kind);if(kindIndex<0){kindIndex=pathKinds.length;pathKinds.push(path.kind);}const row=path.via===undefined?[kindIndex,path.to]:[kindIndex,path.to,path.via],key=JSON.stringify(row);if(!pathIndex.has(key)){pathIndex.set(key,paths.length);paths.push(row);}return pathIndex.get(key);});delete driver.scope.paths;}
  packet.driverPathEncoding='scope.pathRefs indexes driverPathPool; kindIndex indexes driverPathKinds; from=enclosing driver.';
 }
 packet.passageColumns=['locator','text'];
 for(const source of packet.sources)if(source.passages)source.passages=tableRows(source.passages,packet.passageColumns);
 packet.sourceProjection='Full text/passage hashes: method receipt. File SHA-256 and all locators retained.';
 const solution=packet.task?.solution;
 if(solution){
  solution.placementColumns=['role','componentId','scope','responsibility','hostRole'];
  solution.placement=tableRows(solution.placement,solution.placementColumns);
  solution.obligationColumns=['id','targetIds','declared','verification','methodObligationId','methodEffectQuality','kind','action','evidence','fieldKeys','sourceIds'];
  solution.obligations=tableRows(solution.obligations,solution.obligationColumns);
  solution.specificationColumns[5]='obligationRefs';
  for(const specification of solution.specifications)specification[5]=specification[5].map(id=>solution.obligations.findIndex(o=>o[0]===id));
  solution.alternativeColumns=['optionId','selected','status','blockerIds','unknownIds'];
  solution.alternatives=tableRows(solution.alternatives,solution.alternativeColumns);
 }
}
function indexGroundingGraphs(packet,common,graphs){
 const nodePool=[],edgePool=[],nodeIndex=new Map(),edgeIndex=new Map(),idPool=[],relationshipPool=[],idIndex=new Map(),relationshipIndex=new Map();
 const extra={checks:{pool:[],index:new Map(),ref:'checkRefs'},placement:{pool:[],index:new Map(),ref:'placementRefs'},obligations:{pool:[],index:new Map(),ref:'obligationRefs'},effects:{pool:[],index:new Map(),ref:'effectRefs'}};
 const add=(pool,index,value)=>{const key=JSON.stringify(value);if(!index.has(key)){index.set(key,pool.length);pool.push(value);}return index.get(key);};
 for(const graph of [common,...graphs]){
  graph.nodeRefs=(graph.nodes||[]).map(n=>add(nodePool,nodeIndex,n));
  graph.edgeRefs=(graph.edges||[]).map(e=>add(edgePool,edgeIndex,[add(idPool,idIndex,e.from),add(relationshipPool,relationshipIndex,e.kind),add(idPool,idIndex,e.to)]));
  delete graph.nodes;delete graph.edges;
  for(const [key,dictionary] of Object.entries(extra)){graph[dictionary.ref]=(graph[key]||[]).map(value=>add(dictionary.pool,dictionary.index,value));delete graph[key];}
 }
 const row=(value,columns)=>{const values=columns.map(key=>value[key]??null);while(values.length&&values.at(-1)===null)values.pop();return values;};
 packet.graphEncoding='Merge shared+alternative refs using pools/columns. Node id/kind index idPool/nodeKindPool; edge from/to index idPool, kind indexes relationshipPool. Typed nodes: sources.id, checkNodePrefix+check.id, placement:+role, obligation:+id. Obligation placementRef→obligationPlacementPool; sourceIdRefs→idPool. Solution obligationRefs→solution.obligations.';
 const nodeKindPool=[],nodeKindIndex=new Map();
 packet.nodeColumns=['id','kind','label','state','role','hostRole','componentId','scope'];packet.nodePool=nodePool.map(n=>row({...n,id:add(idPool,idIndex,n.id),kind:add(nodeKindPool,nodeKindIndex,n.kind)},packet.nodeColumns));packet.nodeKindPool=nodeKindPool;
 packet.edgePool=edgePool;packet.idPool=idPool;packet.relationshipPool=relationshipPool;packet.edgeColumns=['from','relationship','to'];
 packet.checkColumns=['id','state','fieldKeys','detail','title'];packet.checkPool=extra.checks.pool.map(c=>row(c,packet.checkColumns));
 packet.placementColumns=['role','responsibility','hostRole','componentId','scope'];packet.placementPool=extra.placement.pool.map(p=>row(p,packet.placementColumns));
 packet.obligationColumns=['id','title','kind','placement','fieldKeys','detail','verification','status','sourceIds'];packet.obligationPool=extra.obligations.pool.map(o=>row(o,packet.obligationColumns));
 packet.effectColumns=['quality','effect','why','verify'];packet.effectPool=extra.effects.pool.map(e=>row(e,packet.effectColumns));
 const sourcePosturePool=[],sourcePostureIndex=new Map();for(const source of packet.sources)if(source.posture){source.postureRef=add(sourcePosturePool,sourcePostureIndex,source.posture);delete source.posture;}packet.sourcePosturePool=sourcePosturePool;
}
function serialiseGrounding(packet){
 const compact=copy(packet);
 // A known check often quotes an answer verbatim. Keep the declaration once;
 // only exact matches become references, never inferred or paraphrased matches.
 if(compact.task){for(const check of compact.checkPool){const field=check[2]?.find(key=>compact.task.answers[key]===check[3]);if(field&&check[3].length>40)check[3]={answer:field};}}
 compactGroundingContext(compact);
 // Obligation placements repeat a small number of exact logical locations.
 const locations=[],locationKeys=new Map();compact.obligationPlacementColumns=['role','componentId','scope','hostRole'];
 for(const obligation of compact.obligationPool){const location=tableRows([obligation[3]],compact.obligationPlacementColumns)[0],key=JSON.stringify(location);if(!locationKeys.has(key)){locationKeys.set(key,locations.length);locations.push(location);}obligation[3]=locationKeys.get(key);obligation[8]=(obligation[8]||[]).map(id=>{let index=compact.idPool.indexOf(id);if(index<0){index=compact.idPool.length;compact.idPool.push(id);}return index;});}
 compact.obligationColumns[3]='placementRef';compact.obligationColumns[8]='sourceIdRefs';compact.obligationPlacementPool=locations;
 // Repeated prose in labels, checks and saved solution explanations is read once.
 // Identifiers, hashes and locators remain literal and all tables remain intact.
 const counts=new Map(),visit=value=>{if(typeof value==='string'){if(value.length>=60&&/\s/.test(value))counts.set(value,(counts.get(value)||0)+1);}else if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')Object.values(value).forEach(visit);};visit(compact);
 const phrases=[...counts].filter(([value,count])=>count>1&&(value.length-16)*(count-1)>40).map(([value])=>value);
 if(phrases.length){const indices=new Map(phrases.map((value,index)=>[value,index]));const substitute=value=>typeof value==='string'&&indices.has(value)?{textRef:indices.get(value)}:Array.isArray(value)?value.map(substitute):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,substitute(item)])):value;const result=substitute(compact);result.textPool=phrases;result.textReferences='textRef→textPool; answer→task.answers; tables use *Columns.';return JSON.stringify(result);}
 compact.textReferences='answer→task.answers; tables use *Columns.';
 return JSON.stringify(compact);
}
const groundingStamp=(p,t)=>changeFingerprint([interactionSourceReceipt(t),t?{id:t.id,revision:t.revision,answers:t.answers,basis:t.sourceReview?.basis||t.basis,currentBasis:currentBasis(p,t),context:interactionContext(p,t.answers)}:null]);
export function interactionGroundingCurrent(p,s) {
  const isMethod=['interaction-method','reads-method','persistence-method',...Object.keys(COMPOSITION_TOPICS).map(k=>k+'-method')].includes(s.objectId),t=isMethod?null:(p.coauthoring?.designTasks||[]).find(t=>t.id===s.objectId&&t.kind==='architecture');
  return (!t||interactionContextCurrent(p,t))&&methodKnowledgeCurrent(p,interactionSourceReceipt(isMethod?s.objectId.replace('-method',''):t))&&(isMethod||!!t)&&s.versionStamp===(isMethod?changeFingerprint([interactionSourceReceipt(s.objectId.replace('-method','')),null]):groundingStamp(p,t));
}
export const architectureTopicForPrompt=prompt=>compositionTopicForPrompt(prompt)||(/\b(persistence|database|transaction|transactions|relational|aggregate|RPO|RTO|backup|restore)\b/i.test(prompt)?'persistence':/\b(cache|cached|caching|freshness|authoritative read|read copy)\b/i.test(prompt)?'reads':'interaction');
export function architectureGrounding(p,c,request) {
  const topic=architectureTopicForPrompt(request.prompt);
  const t=[...c.tasks].reverse().find(t=>t.kind==='architecture'&&t.status!=='dismissed'&&(request.architectureTaskId?t.id===request.architectureTaskId:(t.topic||'interaction')===topic)&&(!request.requirementId||t.requirementId===request.requirementId));
  if(!t&&!extendedTopic(topic)&&!/\b(persistence|database|transaction|transactions|relational|aggregate|RPO|RTO|backup|restore|cache|cached|caching|freshness|authoritative read|read copy|queue|queued|buffering|asynchronous|synchronous|request.reply|interaction design)\b/i.test(request.prompt))return null;
  if(!methodKnowledgeCurrent(p,interactionSourceReceipt(t||topic)))return null;
  const source=architectureSources(t||topic);
  const sourceIndex=[source.method,...source.references].map(s=>({id:s.id,title:s.title,posture:s.posture,...(s.url?{url:s.url,section:s.section,accessedAt:s.accessedAt,statement:s.statement}:{file:s.file,fileSha256:s.fileSha256,passages:s.passages})}));
  const graphs=t?architectureOptions(t).map(o=>{const g=interactionReasoningGraph(p,t,o.id);return {optionId:o.id,nodes:g.nodes.filter(n=>!['source','prerequisite','criterion','placement','design-obligation'].includes(n.kind)).map(n=>t.topic==='persistence'?{...n,label:n.label.slice(0,160)}:n),edges:g.edges,checks:g.assessment.checks.map(c=>({id:c.id,title:c.title,state:c.state,fieldKeys:c.fieldKeys||[],detail:c.detail.slice(0,t.topic==='persistence'?180:260)})),placement:g.placement,obligations:g.obligations,effects:g.assessment.effects,caveats:g.assessment.caveats,score:null};}):[];
  // Keep shared checks once in the LLM packet, retaining every typed path
  // and each option's differences for all supported concerns.
  const common={};
  if(graphs.length>1)for(const key of ['nodes','edges','checks','placement','obligations','effects','caveats']){
    const shared=graphs[0][key].filter(value=>graphs.every(g=>g[key].some(x=>JSON.stringify(x)===JSON.stringify(value))));
    common[key]=shared;for(const g of graphs)g[key]=g[key].filter(value=>!shared.some(x=>JSON.stringify(x)===JSON.stringify(value)));
  }
  const quantitative=t?.answers.analysis?{authority:'Analytical estimates from declared inputs; no target achievement.',alternatives:architectureOptions(t).map(o=>{const result=analyseQuality(t.topic,t.answers.analysis,o.id);return {...result,schema:undefined};})}:null;
  const driverContext=t?architectureDriverContext(p,t):null,solution=t?.applied?.solution||t?.applied?.reasoningGraph?.solution;
  const packet={...(quantitative?{quantitative:{...quantitative,schema:undefined,measurements:(t.measurements||[]).slice(-3).map(m=>({id:m.id,current:measurementCurrent(p,t,m),metric:m.metricLabel,predicted:m.predicted,observedMean:m.mean,unit:m.unit,environment:m.environment.slice(0,240),workload:m.workload.slice(0,240),source:{...m.source,excerpt:m.source.excerpt.slice(0,1000),truncated:m.source.excerpt.length>1000},authority:m.authority}))}}:{}),governedKnowledge:t?.governedKnowledge||[],authority:'Conditional comparison; declarations are unverified. Preserve drivers, conditions, placement and obligations. Review stale context before adoption.',methodId:architectureMethod(t||topic),evaluationRevision:source.evaluationRevision,task:t?{id:t.id,topic:t.topic||'interaction',requirementId:t.requirementId,driverId:t.driverId,driverIds:driverContext.driverIds,drivers:driverContext.drivers,contextIds:t.basis?.contextIds||[],...(solution?{solution:solutionForGrounding(solution,common,graphs)}:{}),status:t.status,current:interactionContextCurrent(p,t)&&changeFingerprint(currentBasis(p,t))===changeFingerprint(t.sourceReview?.basis||t.basis),answers:Object.fromEntries(Object.entries(t.answers).filter(([k,v])=>k!=='analysis'&&!k.endsWith('Title')&&k!=='trustName'&&v!==''&&v!==null&&v!==undefined).map(([k,v])=>[k,typeof v==='string'?v.slice(0,t.topic==='persistence'?200:300):copy(v)]))}:null,...(Object.keys(common).length?{sharedByEveryAlternative:common}:{}),graphs,sources:sourceIndex};
  let shortened=false;
  packet.encodingVersion='aiw-architecture-grounding-2';
  packet.checkNodePrefix=knowledgeConcern(t)?'criterion:':'condition:';
  indexGroundingGraphs(packet,common,graphs);
  let excerpt=serialiseGrounding(packet);
  for(const limit of [160,120,80,64]){
    if(excerpt.length<=20000)break;
    for(const n of packet.nodePool)n[2]=n[2].slice(0,limit);
    for(const c of packet.checkPool)c[3]=c[3].slice(0,limit);
    for(const obligation of packet.obligationPool)for(const index of [5,6])if(typeof obligation[index]==='string')obligation[index]=obligation[index].slice(0,limit);
    for(const effect of packet.effectPool)for(const index of [2,3])if(typeof effect[index]==='string')effect[index]=effect[index].slice(0,limit);
    if(packet.task){for(const key of Object.keys(packet.task.answers))if(!/Id$/.test(key)&&typeof packet.task.answers[key]==='string')packet.task.answers[key]=packet.task.answers[key].slice(0,limit);for(const d of packet.task.drivers)for(const key of ['title','target','response','conditions','verification'])if(typeof d[key]==='string')d[key]=d[key].slice(0,limit);}
    if(packet.task?.solution){for(const o of packet.task.solution.obligations)for(const key of ['action','evidence'])if(typeof o[key]==='string')o[key]=o[key].slice(0,limit);for(const place of packet.task.solution.placement)place.responsibility=place.responsibility.slice(0,limit);if(typeof packet.task.solution.rationale==='string')packet.task.solution.rationale=packet.task.solution.rationale.slice(0,limit);}
    packet.excerptLimit=limit;packet.excerptNotice='Excerpted prose; consult full task/method receipts. Declarations remain unverified.';
    shortened=true;excerpt=serialiseGrounding(packet);
  }
  // Method passages are reference excerpts, not the task's operative facts.
  // Keep every locator and the exact file hash if repeated method prose crowds
  // out the adopted trace. Three core methodology excerpts remain readable;
  // complete text and passage hashes are still in the pinned method receipt.
  if(excerpt.length>20000){for(const source of packet.sources)if(source.passages)source.passages=source.passages.map((passage,index)=>({...passage,text:index<3?passage.text:''}));shortened=true;excerpt=serialiseGrounding(packet);}
  if(excerpt.length>20000){for(const source of packet.sources)if(source.passages)source.passages=source.passages.map(passage=>({...passage,text:''}));packet.methodExcerptsOmitted=true;shortened=true;excerpt=serialiseGrounding(packet);}
  if(excerpt.length>20000)throw Error('The architecture source packet exceeds its review limit. Narrow the saved comparison before asking Sol.');
  return {id:'architecture:'+(t?.id||topic+'-method'),kind:'architecture-knowledge',objectId:t?.id||topic+'-method',title:t?'Architecture reasoning · '+t.id:extendedTopic(topic)?extendedTopic(topic).label+' · playbook and reference guidance':topic==='persistence'?'Persistence design · playbook and reference guidance':topic==='reads'?'Read design · playbook and reference guidance':'Interaction design · playbook and reference guidance',posture:'Source-pinned method and conditional project reasoning; analytical estimates are not measured outcomes',versionStamp:t?groundingStamp(p,t):changeFingerprint([interactionSourceReceipt(topic),null]),excerpt,truncated:shortened||!!t&&Object.values(t.answers).some(v=>typeof v==='string'&&v.length>(t.topic==='persistence'?160:260))};
}

export function refreshInteractionGrounding(p,s){const task=(p.coauthoring?.designTasks||[]).find(t=>t.id===s.objectId&&t.kind==='architecture');const fresh=architectureGrounding(p,{tasks:task?[task]:[]},{prompt:extendedTopic(task)?.concepts[0]||COMPOSITION_TOPICS[Object.keys(COMPOSITION_TOPICS).find(k=>s.objectId===k+'-method')]?.concepts[0]||(s.objectId==='persistence-method'||task?.topic==='persistence'?'persistence':s.objectId==='reads-method'||task?.topic==='reads'?'authoritative read':'interaction design'),architectureTaskId:task?.id});return {...s,...fresh,ref:s.ref};}
