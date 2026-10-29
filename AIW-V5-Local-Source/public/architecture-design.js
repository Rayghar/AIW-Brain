import {architectureDecisionAssessments} from './architecture-solution.js';
import {extendedTopic,COMPOSITION_TOPICS} from './composition-knowledge.js';
import {previewComposition} from './composition-design.js';
import {recordQualityMeasurement} from './quality-analysis.js';
import {methodKnowledgeCurrent,knowledgeStamp,linkedKnowledge} from './knowledge-governance.js';
import {releasedDesignConcern} from './domain-knowledge.js';
import {previewPersistenceDesign} from './persistence-design.js';
import {previewReadDesign} from './read-design.js';
import {architectureProposal} from './architecture-proposal.js';
import {withDesignTasks,designTask,designTasks,designBasis,designBasisCurrent} from './design-task-state.js';
import {withModelAlternatives,modelAlternative,modelAlternatives} from './model-alternatives-state.js';
import {architectureOptions,interactionAnswers,interactionSourceReceipt,interactionContext,interactionContextCurrent,assessInteraction,interactionReasoningGraph,topicFromReceipt,knowledgeConcern,criterionDrivers} from './architecture-knowledge.js';
import {applyLogicalCommand} from './logical-domain.js';
import {applyRealisationCommand} from './realisation-domain.js';
import {applyTechnologyCommand} from './technology-domain.js';
import {applyTechnologyRealisationCommand} from './technology-realisation-domain.js';
import {applyDecisionCommand} from './decisions-domain.js';
import {driverCode} from './quality-domain.js';
import {modelEditSnapshot} from './model-impact.js';
import {changeFingerprint} from './changes-domain.js';

const copy=v=>structuredClone(v),text=(v,n=2400)=>typeof v==='string'?v.trim().slice(0,n):'';
const canonical=q=>q.changes.map(({command,source,before,after,fields})=>({command,source,before,after,fields}));
function retire(p,t,at,reason){for(const a of modelAlternatives(p).filter(a=>a.taskId===t.id&&a.status==='draft')){a.status='archived';a.revision++;a.updatedAt=at;a.archived={at,reason};a.history.push({at,event:'Set aside',note:reason});}t.alternativeIds=[];}
export function applyArchitectureCommand(input,command,at=new Date().toISOString(),actor='local-review'){
  const p=withDesignTasks(copy(input)),r=command.payload||{};let t;
  if(command.type==='architecture.start'){
    if(designTasks(p).length>=60)throw Error('This project has reached its guided-task limit.');
    const topic=r.topic||'interaction',concern=topic.startsWith('knowledge:')?releasedDesignConcern(p,topic.slice('knowledge:'.length)):null;
    if(!['interaction','reads','persistence',...Object.keys(COMPOSITION_TOPICS)].includes(topic)&&!concern)throw Error('Choose a current, released architecture concern.');
    const data=['reads','persistence','delivery','partitioning'].includes(topic)&&r.dataId?p.interfaces.data.find(d=>d.id===r.dataId):null;
    if(r.dataId&&!data)throw Error('Choose an existing data definition.');
    const contextIds=[...new Set(Array.isArray(r.contextIds)?r.contextIds:[])],contextRecords=[...p.logical.responsibilities,...p.realisation.components,...p.technology.capabilities,...p.technologyRealisation.records];
    if(r.contextIds!==undefined&&(!Array.isArray(r.contextIds)||contextIds.length>12||contextIds.some(id=>typeof id!=='string'||!contextRecords.some(x=>x.id===id))))throw Error('Choose existing model objects for this design context.');
    const basis=designBasis(p,r.requirementId,undefined,undefined,undefined,contextIds),driver=basis.drivers.find(d=>d.id===r.driverId);
    if(!driver)throw Error('Choose a driver that applies to this requirement or selected component.');
    const links=p.logical.responsibilities.filter(x=>x.requirementIds.includes(r.requirementId));
    const apps=p.realisation.components.filter(c=>p.logical.mappings.some(m=>m.physicalId===c.id&&links.some(l=>l.id===m.logicalId)));
    const possible=apps.filter(c=>c.id!==data?.authorityId),caller=possible.length===1?possible[0]:null;
    const answers=interactionAnswers({...(topic==='delivery'?{dataId:data?.id,dataScope:data?.title||'',classification:data?.classification||'Unclassified',retention:data?.retentionPolicy,isolation:data?.protection,processorId:data?.authorityId}:{}),callerId:caller?.id,callerTitle:'Intake · '+basis.requirement.title,processorTitle:'Process · '+basis.requirement.title,queueTitle:'Work queue · '+basis.requirement.title,owner:caller?.owner,information:caller?.inputs,...(topic==='reads'?{dataId:data?.id,readScope:data?.title||'',classification:data?.classification,retention:data?.retentionPolicy,isolation:data?.protection,processorId:data?.authorityId,callerTitle:'Read service · '+basis.requirement.title,processorTitle:'Authority · '+basis.requirement.title,cacheTitle:'Read cache · '+basis.requirement.title}: {}),...(topic==='persistence'?{owner:data?.owner||caller?.owner,dataId:data?.id,dataScope:data?.title||'',classification:data?.classification,retention:data?.retentionPolicy,isolation:data?.protection,processorId:data?.authorityId,processorTitle:'Authority · '+basis.requirement.title,storeTitle:'Persistence · '+basis.requirement.title,recoveryTitle:'Recovery · '+basis.requirement.title}:{})},topic);
    const governedConcern=concern?copy(concern):null;
    t={id:'DES-'+String(++p.coauthoring.counters.design).padStart(3,'0'),kind:'architecture',...(topic!=='interaction'?{topic}:{}),...(concern?{governedConcern}:{}),revision:1,title:basis.requirement.title,requirementId:r.requirementId,driverId:driver.id,basis,initialBasis:copy(basis),methodReceipt:interactionSourceReceipt(concern?{governedConcern}:topic),governedKnowledge:linkedKnowledge(p,[r.requirementId,...basis.drivers.map(d=>d.id)]),answers,architectureBasis:interactionContext(p,answers),knowledge:[],status:'questions',alternativeIds:[],considerations:[],createdAt:at,updatedAt:at,history:[{at,event:concern?'Started released '+concern.title+' comparison':extendedTopic(topic)?'Started '+extendedTopic(topic).label.toLowerCase()+' comparison':topic==='persistence'?'Started persistence comparison':topic==='reads'?'Started read comparison':'Started interaction comparison',driverId:driver.id,basis:copy(basis)}]};
    p.coauthoring.designTasks.push(t);return {document:p,selected:t.id};
  }
  t=designTask(p,r.id);if(t?.kind!=='architecture')throw Error('Choose a saved architecture comparison.');
  if(t.revision!==r.taskRevision)throw Error('This comparison changed. Reopen the saved task; your input is retained.');
  if(command.type==='architecture.measure'){
    if(!architectureOptions(t).some(o=>o.id===(t.applied?.reasoningGraph?.assessment.optionId||r.optionId)))throw Error('Choose the compared architecture approach.');
    const measurement=recordQualityMeasurement(p,t,r,at,actor);t.history.push({at,event:'Recorded quantitative evidence',note:measurement.id+' · '+measurement.reason,reviewer:measurement.reviewer});t.revision++;t.updatedAt=at;return {document:p,selected:t.id};
  }
  if(command.type==='architecture.refresh'){
    if(r.reviewed!==true||!text(r.reason)||!text(r.reviewer))throw Error('Confirm the source review, reviewer and conclusion.');
    if(r.stamp!==architectureSourceStamp(p,t))throw Error('Sources changed again. Review the current source definitions.');
    t.history.push({at,event:'Reviewed changed architecture sources',note:text(r.reason),reviewer:text(r.reviewer,180),basis:copy(t.sourceReview?.basis||t.basis),methodReceipt:copy(t.methodReceipt),architectureBasis:copy(t.architectureBasis)});
    if(knowledgeConcern(t)){
      const current=releasedDesignConcern(p,t.governedConcern.id);if(!current)throw Error('This design concern has no current released claim. Choose an available concern.');
      t.governedConcern=copy(current);
    }
    t.sourceReview={at,basis:designBasis(p,t.requirementId,undefined,undefined,undefined,t.basis.contextIds),reviewer:text(r.reviewer,180),reason:text(r.reason)};t.architectureBasis=interactionContext(p,t.answers);t.methodReceipt=interactionSourceReceipt(t);t.governedKnowledge=linkedKnowledge(p,[t.requirementId,...t.sourceReview.basis.drivers.map(d=>d.id)]);
    if(t.status!=='applied'){retire(p,t,at,'Source review requires fresh model proposals.');t.basis=copy(t.sourceReview.basis);t.status='questions';}
  }else{
    if(['applied','dismissed'].includes(t.status))throw Error('This design is retained as '+t.status+'. Start another comparison for further changes.');
    if(!designBasisCurrent(p,t))throw Error('The requirement, scenario, selected model objects or knowledge changed. Review the current sources first.');
    if(command.type==='architecture.answers'){
      const answers=interactionAnswers({...t.answers,...r.answers},t.topic);
      if(JSON.stringify(answers)!==JSON.stringify(t.answers)){
        t.history.push({at,event:'Saved architectural conditions',answers:copy(answers),before:copy(t.answers)});retire(p,t,at,'Architectural conditions changed.');t.answers=answers;t.architectureBasis=interactionContext(p,answers);t.status='questions';
      }
    }else if(command.type==='architecture.prepare'){
      const assessment=assessInteraction(p,t,r.optionId);
      if(!assessment.ready)throw Error([...assessment.blockers,...assessment.unknown].map(c=>c.title+': '+c.detail).join(' '));
      if(knowledgeConcern(t))for(const option of architectureOptions(t)){const other=assessInteraction(p,t,option.id);if(!other.ready)throw Error('Assess every released approach before preparing a decision: '+option.title+' · '+other.unknown.map(c=>c.title).join(', '));}
      if(!t.answers.reason)throw Error('Explain why this approach fits and which trade-off you accept.');
      withModelAlternatives(p);
      if(p.modelAlternatives.records.length>=60)throw Error('This project has reached its saved-alternative limit.');
      const existing=t.alternativeIds.map(id=>modelAlternative(p,id)).find(a=>a?.status==='draft'&&a.design.approach===r.optionId);
      if(existing)return {document:p,selected:existing.id};
      const graph=interactionReasoningGraph(p,t,r.optionId),a={id:'ALT-'+String(++p.modelAlternatives.counter).padStart(3,'0'),kind:'design',taskId:t.id,revision:1,createdAt:at,updatedAt:at,status:'draft',name:t.id+' · '+assessment.option.title,rationale:t.answers.reason,knowledge:[],design:{family:'architecture',approach:r.optionId},designAnswers:copy(t.answers),designBasis:copy(t.basis),architectureBasis:copy(t.architectureBasis),methodReceipt:copy(t.methodReceipt),governedKnowledge:copy(t.governedKnowledge||[]),reasoningGraph:graph,changes:[],history:[]};
      graph.alternatives=architectureOptions(t).map(option=>{const reading=assessInteraction(p,t,option.id);return {optionId:option.id,title:option.title,selected:option.id===r.optionId,status:reading.status,checks:copy(reading.checks),effects:copy(reading.effects),tradeoff:option.cost,reconsiderWhen:option.counterfactual};});
      const q=previewArchitectureDesign(p,a,at);a.changes=canonical(q);if(q.solution)a.reasoningGraph.solution=copy(q.solution);a.history.push({at,event:'Prepared grounded model proposal',reasoningGraph:copy(a.reasoningGraph)});p.modelAlternatives.records.push(a);t.alternativeIds.push(a.id);t.status='proposed';t.considerations.push(...architectureOptions(t).map(o=>({at,approach:o.id,outcome:o.id===r.optionId?'Developed for review':'Compared',reason:assessInteraction(p,t,o.id).status+' · '+o.cost,alternativeId:a.id})));t.history.push({at,event:'Prepared '+a.id,note:t.answers.reason});t.revision++;t.updatedAt=at;return {document:p,selected:a.id};
    }else if(command.type==='architecture.dismiss'){
      if(!text(r.reason))throw Error('Record why this comparison is being set aside.');retire(p,t,at,text(r.reason));t.status='dismissed';t.history.push({at,event:'Set aside',note:text(r.reason)});
    }else throw Error('Choose a supported architecture action.');
  }
  t.revision++;t.updatedAt=at;return {document:p,selected:t.id};
}
export const architectureSourceStamp=(p,t)=>changeFingerprint([knowledgeStamp(p),designBasis(p,t.requirementId,undefined,undefined,undefined,t.basis.contextIds),interactionContext(p,t.answers),interactionSourceReceipt(t)]);
export const architecturePreviewStamp=(p,a)=>changeFingerprint(['architecture-composition-6',knowledgeStamp(p),p.id,p.contentVersion,...['quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime'].map(k=>p[k]?.version),a.revision,a.design,a.designAnswers,a.designBasis,a.architectureBasis,a.methodReceipt,interactionSourceReceipt(a.methodReceipt?.governedConcern?{governedConcern:a.methodReceipt.governedConcern}:topicFromReceipt(a.methodReceipt))]);

// A released concern supplies questions and alternatives. It does not supply
// model roles or architecture facts, so its reviewed proposal is a decision
// comparison only; Chapter 4–10 modelling remains an architect's next step.
function previewReleasedConcern(input,alternative,t,assessment,at){
  const concern=knowledgeConcern(t),receipt=concern.receipt,a=t.answers;
  for(const option of architectureOptions(t))if(!assessInteraction(input,t,option.id).ready)throw Error('Assess every released approach before previewing the decision.');
  if(!a.owner.trim())throw Error('Name the architect accountable for this comparison.');
  let notes={};try{notes=JSON.parse(a.criteriaNotes||'{}');}catch{throw Error('Reopen and complete the comparison criteria.');}
  let p=copy(input);const executed=[];
  const run=(type,payload)=>{const r=applyDecisionCommand(p,{type,payload},at);p=r.document;executed.push({type,payload:copy(payload)});return r.selected;};
  const source='Released design concern '+receipt.claimId+' / '+receipt.releaseId+' · '+receipt.path+' @ '+receipt.revision+' lines '+receipt.lineStart+'–'+receipt.lineEnd;
  // Round 25 (D-25-10, K2): a criterion tied to a quality category or a driver kind links the project's drivers of it
  // to the decision, beside the comparison's own scenario. The person's reviewed apply of this preview links them, and
  // the preview names each with the criterion that brings it. Their effects stay unstated ('unknown') for every option,
  // with the option's released consequence on that criterion as the reason, until a person records one.
  const scope=concern.criteria.filter(c=>c.category||c.kind).map(c=>({c,ids:criterionDrivers(input,c).map(d=>d.id)}));
  const driverIds=[...new Set([t.driverId,...scope.flatMap(x=>x.ids)])],linked=driverIds.filter(id=>id!==t.driverId);
  const decisionId=run('decision.save',{question:concern.question,context:t.basis.requirement.description+' '+concern.statement,requirementIds:[t.requirementId],driverIds,owner:a.owner,source,rationale:a.reason,assumptions:[...concern.conditions,...concern.limitations].join(' '),risks:assessment.option.cost,mitigation:'Verify the project-specific criteria and quality scenario before acceptance.'});
  let selectedAlternativeId='';
  for(const option of architectureOptions(t)){
    const released=concern.options.find(o=>o.id===option.id)||{},said=c=>released.consequences?.[c.id]||'';
    const reasons=concern.criteria.map(c=>c.label+': '+String(notes?.[option.id]?.[c.id]||'Not assessed').trim());
    // The released consequences and the evidence the option needs, as the concern states them; nothing when it does not.
    const consequences=option.counterfactual+(concern.criteria.some(said)?' As the released concern states: '+concern.criteria.filter(said).map(c=>c.label+': '+said(c)).join(' '):'')+(released.evidence?' The evidence it needs: '+released.evidence:'');
    // A driver's reason: the criteria assessed on it (every criterion for the comparison's own scenario), each with the
    // option's released consequence where that criterion weighs the driver.
    const weighs=(c,id)=>scope.some(x=>x.c===c&&x.ids.includes(id)),reasonOf=(id,cs)=>cs.map(c=>reasons[concern.criteria.indexOf(c)]+(said(c)&&weighs(c,id)?' Released consequence: '+said(c):'')).join(' ');
    run('decision.alternative',{id:decisionId,title:option.title,summary:reasons.join(' '),benefits:'Fit to this project requires the architect’s criterion assessments.',costs:option.cost,consequences,pattern:'Released design concern · '+concern.title,antiPattern:'Claiming an outcome without project evidence.',assessments:{[t.driverId]:{effect:'unknown',reason:reasonOf(t.driverId,concern.criteria),evidence:source},...Object.fromEntries(linked.map(id=>[id,{effect:'unknown',reason:reasonOf(id,concern.criteria.filter(c=>weighs(c,id))),evidence:source}]))},rejectionReason:option.id===assessment.optionId?'':a.reason});
    if(option.id===assessment.optionId)selectedAlternativeId=p.decisions.records.find(d=>d.id===decisionId).alternatives.at(-1).id;
  }
  run('decision.choose',{id:decisionId,alternativeId:selectedAlternativeId});
  const result=architectureProposal(input,p,t,alternative,[{type:'decision.save',id:decisionId,slot:'reviewed concern comparison'}],executed,decisionId,assessment,at);
  const named=id=>{const d=input.quality.drivers.find(x=>x.id===id);return d?driverCode(input,d)+' · '+d.title:id;};
  return {...result,previewChapters:[3],signals:[{title:'Source-grounded comparison',detail:'Options and criteria came from '+source+'. The selected alternative is an architect proposal; Chapter 3 acceptance and measured evidence remain separate.'},...(scope.length?[{title:'Drivers the released criteria weigh',detail:scope.map(x=>x.c.label+': '+(x.ids.length?x.ids.map(named).join(', '):'no driver of it is recorded')).join('; ')+'. Applying this preview links them to the decision; their effects stay unstated until a person records them.'}]:[])]};
}

export function previewArchitectureDesign(input,alternative,at=new Date().toISOString()){
  const saved=designTask(input,alternative.taskId);if(saved?.kind!=='architecture')throw Error('The source architecture comparison is unavailable.');
  if(saved.status==='applied')return {document:input,commands:[],changes:[],fields:[],items:[],findings:{introduced:[],resolved:[],existing:0},signals:[],conflicts:[],satisfied:[],appliedTask:true};
  if(saved.status==='dismissed')throw Error('This comparison was set aside.');
  const t={...saved,basis:alternative.designBasis,sourceReview:null,answers:alternative.designAnswers,architectureBasis:alternative.architectureBasis,methodReceipt:alternative.methodReceipt,governedKnowledge:alternative.governedKnowledge};
  if(!designBasisCurrent(input,t)||!interactionContextCurrent(input,t))throw Error('Design sources changed. Review them before generating a fresh model proposal.');
  const assessment=assessInteraction(input,t,alternative.design.approach);if(!assessment.ready)throw Error('This approach needs clarification: '+[...assessment.blockers,...assessment.unknown].map(c=>c.detail).join(' '));
  if(knowledgeConcern(t))return {...previewReleasedConcern(input,alternative,t,assessment,at),stamp:architecturePreviewStamp(input,alternative)};
  if(extendedTopic(t))return {...previewComposition(input,alternative,t,at),stamp:architecturePreviewStamp(input,alternative)};
  if(t.topic==='persistence')return {...previewPersistenceDesign(input,alternative,t,at),stamp:architecturePreviewStamp(input,alternative)};
  if(t.topic==='reads')return {...previewReadDesign(input,alternative,t,at),stamp:architecturePreviewStamp(input,alternative)};
  const a=t.answers,queued=assessment.optionId==='durable-queue',source='Interaction design '+t.id+' · '+t.requirementId+' / '+t.driverId,used=[],executed=[];let p=copy(input);
  const run=(type,payload)=>{const fn=type.startsWith('logical.')?applyLogicalCommand:type.startsWith('realisation.')?applyRealisationCommand:type.startsWith('technology.')?applyTechnologyCommand:type.startsWith('techrealisation.')?applyTechnologyRealisationCommand:applyDecisionCommand;const r=fn(p,{type,payload},at);p=r.document;executed.push({type,payload:copy(payload)});return r.selected;};
  const mark=(type,id,slot)=>{if(!used.some(x=>x.id===id&&x.type===type))used.push({type,id,slot});return id;};
  const decisionId=run('decision.save',{question:'How should '+t.title+' complete?',context:t.basis.requirement.description,requirementIds:[t.requirementId],driverIds:[...new Set([...(t.basis.drivers||[]).map(d=>d.id),t.driverId])],owner:a.owner,source,rationale:alternative.rationale,assumptions:'Expected effects require verification against the quality scenario. '+assessment.caveats.join(' '),risks:assessment.option.cost,mitigation:a.failure});
  const logicalIds=[];
  const makeRole=(slot,title,purpose,reuseId,kind)=>{
    let id=reuseId;const existing=id?p.realisation.components.find(c=>c.id===id):null;
    if(id&&!existing)throw Error('The reused '+slot+' was removed.');
    if(slot==='queue'&&existing&&existing.kind!=='queue')throw Error('Reuse an application queue for the queue role.');
    if(!existing&&p.realisation.components.some(c=>c.title.toLowerCase()===title.toLowerCase()))throw Error('A component named '+title+' exists. Select it for reuse or give this proposal a distinct name.');
    if(!title&&!existing)throw Error('Name the proposed '+slot+'.');
    const lr=run('logical.responsibility',{title:(slot==='queue'?'Buffer accepted work':slot==='caller'?'Receive work':'Complete work')+' · '+t.requirementId+' · '+t.id,purpose,boundary:purpose,owner:a.owner,source,requirementIds:[t.requirementId],decisionIds:[decisionId],confirmed:false});
    logicalIds.push(lr);mark('logical.responsibility',lr,slot+' responsibility');
    if(!id){id=run('realisation.component',{title,kind,purpose,boundary:purpose,owner:a.owner,inputs:a.information,outputs:slot==='caller'&&queued?'Acknowledgement of durable acceptance; final outcome follows separately.':t.basis.requirement.acceptance,source,rationale:alternative.rationale,technologyNeeds:queued?'Durable messaging with a bounded backlog.':'Bounded request connectivity.',assumptions:assessment.caveats.join('\n'),status:'candidate',allocations:[{logicalId:lr,scope:purpose}]});p.realisation.components.find(c=>c.id===id).origin='suggestion';}
    else run('logical.mapping',{logicalId:lr,physicalId:id,scope:purpose,owner:a.owner,evidence:source,status:'candidate'});
    if(!p.technology.knownApplications.includes(id))p.technology.knownApplications.push(id);
    mark('realisation.component',id,slot);return {app:id,logical:lr};
  };
  const caller=makeRole('caller',a.callerTitle,'Accept the request and communicate its '+(queued?'acceptance reference and later outcome.':'final outcome within the agreed response contract.'),a.callerId,'service');
  const processor=makeRole('processor',a.processorTitle,'Perform the required business operation under the declared information authority. '+a.information,a.processorId,queued?'worker':'service');
  const queue=queued?makeRole('queue',a.queueTitle,'Hold accepted work durably until controlled delivery. '+a.capacity,a.queueId,'queue'):null;
  const participants=[caller,processor,...(queue?[queue]:[])];if(new Set(participants.map(x=>x.app)).size!==participants.length)throw Error('Each interaction role needs a distinct component.');
  const interaction=(from,to,label,kind)=>{run('logical.connection',{from:from.logical,to:to.logical,label,kind:'flow',condition:a.failure});run('realisation.interaction',{from:from.app,to:to.app,label:label+' · '+t.requirementId,interaction:kind,condition:queued?'For this requirement; durable acknowledgement is distinct from completion.':'For this requirement; final response contract applies.',failure:a.failure+(queued?' Duplicate handling: '+a.duplicates+'. Ordering: '+a.ordering+'. '+a.outcome:'')});};
  if(queued){interaction(caller,queue,'enqueues accepted work','event');interaction(queue,processor,'delivers work','event');}else interaction(caller,processor,'requests final outcome','sync');
  const boundary=a.boundaryId||run('technology.boundary',{title:a.trustName,owner:a.owner,policy:a.trustPolicy});if(!a.boundaryId)mark('technology.boundary',boundary,'trust boundary');
  const category=queued?'messaging':'connectivity',purpose=queued?'Durable work delivery with bounded retention, admission and recovery.':'Request transport under the agreed time and failure budgets.';
  const needs=[];
  for(const {app} of participants){const prior=copy(p.technology.needs.filter(n=>n.applicationId===app));let need=prior.find(n=>n.category===category);if(!need){run('technology.needs',{applicationId:app,boundaryId:p.technology.applicationBoundaries[app]||boundary,confirmed:false,needs:[...prior,{category,description:purpose,criticality:'essential'}]});for(const old of prior){const i=p.technology.needs.findIndex(n=>n.id===old.id);if(i>=0)p.technology.needs[i]=old;}need=p.technology.needs.find(n=>n.applicationId===app&&n.category===category);}needs.push(need.id);}
  let cap=a.capabilityId;
  if(cap){const existing=p.technology.capabilities.find(c=>c.id===cap);if(!existing||existing.category!==category)throw Error('The selected capability does not provide '+category+'.');if(existing.boundaryId!==boundary)throw Error('The selected capability belongs to another trust boundary. Choose its boundary or a different capability.');const snap=modelEditSnapshot(p,{type:'technology.capability',payload:{id:cap}});run('technology.capability',{id:cap,...snap,status:'candidate',mappings:[...snap.mappings,...needs.filter(id=>!snap.mappings.some(m=>m.needId===id)).map(needId=>({needId,scope:purpose}))]});}
  else cap=run('technology.capability',{title:(queued?'Durable messaging':'Request connectivity')+' · '+t.requirementId+' · '+t.id,category,purpose,boundary:purpose,owner:a.owner,source,rationale:alternative.rationale,boundaryId:boundary,driverIds:[...new Set([...(t.basis.drivers||[]).map(d=>d.id),t.driverId])],decisionIds:[decisionId],status:'candidate',continuity:'single',recoveryPlan:a.failure,recoveryOwner:a.owner,assumptions:'Topology and policy proposal; capacity, recovery and costs are unmeasured.',mappings:needs.map(needId=>({needId,scope:purpose}))});
  mark('technology.capability',cap,'support');
  const operating=run('techrealisation.plan',{title:'Delivery operating plan · '+t.requirementId+' · '+t.id,purpose,owner:a.owner,operationsPlan:(queued?a.capacity+'\n':'')+a.failure,accessPlan:a.trustPolicy||p.technology.boundaries.find(b=>b.id===boundary)?.policy,dataPlan:a.information,resiliencePlan:a.failure,interfacePlan:queued?a.outcome:'Confirm request deadline and outcome enquiry contract.',rationale:alternative.rationale,assumptions:'Select and assess implementation products in Chapter 7. Test the quality scenario before claiming its target.',mappings:[{capabilityId:cap,scope:purpose}]});mark('techrealisation.plan',operating,'operating plan');
  for(const option of architectureOptions(t)){const assessment=assessInteraction(input,t,option.id);run('decision.alternative',{id:decisionId,title:option.title,summary:option.benefit,benefits:option.benefit,costs:option.cost,consequences:option.counterfactual,pattern:option.pattern+' · '+option.tactic,antiPattern:option.id==='durable-queue'?'Unbounded backlog or repeated business effects.':'Blind retries after an uncertain outcome.',responsibilityIds:logicalIds,relationships:[],assessments:architectureDecisionAssessments(t,{effect:assessment.blockers.length?'tension':'unknown',reason:assessment.status+' · Expected effects are conditional; verify against the scenario.',evidence:'SA Playbook component method and '+t.methodReceipt.packId})});}
  const decision=p.decisions.records.find(d=>d.id===decisionId),chosen=decision.alternatives.find(o=>o.title===assessment.option.title);run('decision.choose',{id:decisionId,alternativeId:chosen.id});mark('decision.save',decisionId,'decision');
  return {...architectureProposal(input,p,t,alternative,used,executed,decisionId,assessment,at),stamp:architecturePreviewStamp(input,alternative)};
}
