import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand,driverCode} from './public/quality-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyKnowledgeCommand,knowledgeStamp,claimReceiptCurrent,knowledgeImpactStamp} from './public/knowledge-governance.js';
import {domainShape,releasedDesignConcerns,releasedDesignConcern} from './public/domain-knowledge.js';
import {applyArchitectureCommand} from './public/architecture-design.js';
import {assessInteraction,interactionContextCurrent,criterionDrivers,interactionReasoningGraph} from './public/architecture-knowledge.js';
import {designBasisCurrent} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {architectureEntry,startView} from './public/architecture-task-ui.js';
import {readDecision} from './public/decision-reading.js';

const at='2026-10-11T12:00:00.000Z';
let p=applyCommand(createProject({name:'Synthetic equipment project',template:'blank'},'concern-fixture'),{type:'artefact',payload:{type:'requirement',title:'Reserve equipment',description:'Report an authoritative reservation outcome.',acceptance:'The original reference identifies one result.',owner:'Facilities',source:'Synthetic workshop',confirmed:true}},at).document;
p=withFinalReview(applyQualityCommand(p,{type:'quality.driver',payload:{title:'Reliable reservation',category:'recoverability',requirementIds:['REQ-001'],stimulus:'Processing is unavailable.',conditions:'Reservation intake remains open.',response:'Restore accepted reservations.',metric:'Recovery time',operator:'At most',targetValue:'30',unit:'minutes',window:'For each accepted request',measurement:'Failure exercise',targetConfirmed:true,confirmed:true,owner:'Facilities'}},at).document);
const source='Synthetic architecture note\nCompare owning the schedule in one application with a separate service. Evaluate responsibility ownership and the cost of coordination.\n';
p=applyKnowledgeCommand(p,{type:'knowledge.source',payload:{title:'Synthetic architecture note',body:source,path:'synthetic/note.txt',revision:'1',license:'Synthetic test material'}},at,'author').document;
const sid=p.knowledge.sources.at(-1).id,claim={sourceId:sid,lineStart:2,lineEnd:2,subjectId:'design-concern:service-ownership',predicate:'offers a design concern',claimType:'applicability',polarity:'neutral',statement:'Compare local ownership and a separate service boundary.',conditions:['For an architecture with two responsibilities.'],limitations:['The source makes no measured reliability claim.'],tags:['title:Service ownership','question:Where should reservation ownership live?','criterion:ownership|Ownership|Who owns the schedule and its changes?','criterion:recovery|Recovery|What happens during an outage?','option:local|One application|The modules share one release boundary.','option:separate|Separate service|A network contract and recovery coordination are required.']};
p=applyKnowledgeCommand(p,{type:'knowledge.claim',payload:claim},at,'author').document;
assert.equal(domainShape(p.knowledge.claims[0]),'concern');
assert.deepEqual(releasedDesignConcerns(p),[],'candidate claims cannot offer a comparison');
assert.throws(()=>applyArchitectureCommand(p,{type:'architecture.start',payload:{requirementId:'REQ-001',driverId:'QD-001',topic:'knowledge:service-ownership'}},at),/current, released/);
// rc39: the entry offers Start a comparison; the concern picker is the start view's (architecture-task-ui.js startView), so the released concern is read there.
const entryContext={requirements:[p.artefacts.find(a=>a.id==='REQ-001')],drivers:p.quality.drivers,selected:{id:'REQ-001'},chapter:4,tasks:[]};
assert(architectureEntry(p,entryContext).includes('data-arc-action="launch"'),'the entry offers to start a comparison');
assert.equal(startView(p,entryContext).includes('Service ownership · released knowledge'),false);
p=applyKnowledgeCommand(p,{type:'knowledge.review',payload:{id:p.knowledge.claims[0].id,reviewed:true,reviewer:'Second reviewer',reason:'Verified source and limited interpretation.',decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true}},at,'reviewer').document;
p=applyKnowledgeCommand(p,{type:'knowledge.release',payload:{reviewed:true,reviewer:'Second reviewer',reason:'Release this synthetic concern.',title:'Synthetic concern',claimIds:[p.knowledge.claims[0].id]}},at,'author').document;
p=applyKnowledgeCommand(p,{type:'knowledge.activate',payload:{reviewed:true,reviewer:'Second reviewer',reason:'Use the reviewed concern.',id:p.knowledge.releases[0].id,stamp:knowledgeStamp(p)}},at,'author').document;
const concerns=releasedDesignConcerns(p);assert.deepEqual(concerns.map(x=>x.id),['service-ownership']);
assert.deepEqual(concerns[0].criteria.map(x=>x.id),['ownership','recovery']);
assert.deepEqual(concerns[0].options.map(x=>x.id),['local','separate']);
assert.equal(concerns[0].receipt.scoring,false);
const ui=startView(p,entryContext);assert(ui.includes('Service ownership · released knowledge'));assert(/<option value="knowledge:service-ownership"[^>]*>Service ownership · released knowledge<\/option>/.test(ui),'as a choosable concern');
p=applyArchitectureCommand(p,{type:'architecture.start',payload:{requirementId:'REQ-001',driverId:'QD-001',topic:'knowledge:service-ownership'}},at).document;
let t=p.coauthoring.designTasks[0];assert.equal(t.governedConcern.receipt.claimId,concerns[0].receipt.claimId);
assert.equal(assessInteraction(p,t,'local').ready,false,'criterion answers are needed');
const notes={local:{ownership:'Facilities owns both modules and the schedule.',recovery:'Restore one process and reconcile reservations.'},separate:{ownership:'A separate team owns the schedule contract.',recovery:'Coordinate partial failure across services.'}};
let partial=applyArchitectureCommand(p,{type:'architecture.answers',payload:{id:t.id,taskRevision:t.revision,answers:{criteriaNotes:JSON.stringify({local:notes.local}),owner:'Facilities architect',reason:'Local ownership fits the present team.'}}},at).document;
assert.throws(()=>applyArchitectureCommand(partial,{type:'architecture.prepare',payload:{id:t.id,taskRevision:partial.coauthoring.designTasks[0].revision,optionId:'local'}},at),/Assess every released approach/,'a blank alternative cannot masquerade as a comparison');
p=applyArchitectureCommand(p,{type:'architecture.answers',payload:{id:t.id,taskRevision:t.revision,answers:{criteriaNotes:JSON.stringify(notes),owner:'Facilities architect',reason:'Local ownership fits the present team; accept shared deployment.'}}},at).document;
t=p.coauthoring.designTasks[0];assert.equal(assessInteraction(p,t,'local').ready,true);assert.equal(assessInteraction(p,t,'separate').ready,true);assert.equal(assessInteraction(p,t,'local').score,null);
const prepared=applyArchitectureCommand(p,{type:'architecture.prepare',payload:{id:t.id,taskRevision:t.revision,optionId:'local'}},at);p=prepared.document;
assert.equal(p.decisions.records.length,0,'preparing does not mutate the current model');
const alternative=p.modelAlternatives.records.find(a=>a.id===prepared.selected),preview=previewAlternative(p,alternative);
assert.equal(preview.document.realisation.components.length,0,'a domain concern does not fabricate components');
const decision=preview.document.decisions.records[0];assert.equal(decision.status,'draft');assert.equal(decision.alternatives.length,2);assert.equal(decision.alternatives.find(a=>a.id===decision.selectedAlternativeId).title,'One application');assert(decision.alternatives.every(a=>a.assessments['QD-001'].effect==='unknown'));
assert(decision.alternatives[0].assessments['QD-001'].reason.includes('Facilities owns both modules'));
// Round 25 (D-25-10): a concern without the K2 shapes reads as before: its own scenario only, the criteria notes as the
// reason, the counterfactual as the consequence, one signal.
assert.deepEqual(decision.driverIds,['QD-001']);assert.deepEqual(decision.alternatives.map(a=>Object.keys(a.assessments)),[['QD-001'],['QD-001']]);
assert.equal(decision.alternatives[0].assessments['QD-001'].reason,'Ownership: Facilities owns both modules and the schedule. Recovery: Restore one process and reconcile reservations.');
assert.equal(decision.alternatives[0].consequences,'Reconsider when the linked quality scenario, source conditions or project constraints change.');assert.equal(preview.signals.length,1);
assert.deepEqual(assessInteraction(p,t,'local').checks.map(c=>c.detail),['Reliable reservation','Facilities owns both modules and the schedule.','Restore one process and reconcile reservations.']);
assert.deepEqual(assessInteraction(p,t,'local').caveats,['For an architecture with two responsibilities.','The source makes no measured reliability claim.','Released guidance informs a comparison; it does not score the alternatives, establish quality achievement or approve a choice.']);
assert.ok(!interactionReasoningGraph(p,t,'local').edges.some(e=>e.kind==='weighs'),'and weighs no further driver');
const applied=applyAlternativeCommand(p,{type:'alternative.apply',payload:{id:alternative.id,alternativeRevision:alternative.revision,previewStamp:preview.stamp,reviewed:true,reviewer:'Independent project architect',reason:'Reviewed both source-grounded options and criterion notes.'}},at).document;
assert.equal(applied.decisions.records[0].status,'draft','reviewed apply is not Chapter 3 acceptance');assert.equal(applied.coauthoring.designTasks[0].status,'applied');assert.equal(designBasisCurrent(applied,applied.coauthoring.designTasks[0]),true);
assert.equal(interactionContextCurrent(applied,applied.coauthoring.designTasks[0]),true);
assert.equal(claimReceiptCurrent(applied,concerns[0].receipt),true);
const deactivated=applyKnowledgeCommand(p,{type:'knowledge.deactivate',payload:{reviewed:true,reviewer:'Second reviewer',reason:'Withdraw project activation.',id:p.knowledge.releases[0].id,stamp:knowledgeStamp(p)}},at,'author').document;
assert.deepEqual(releasedDesignConcerns(deactivated),[]);assert.equal(interactionContextCurrent(deactivated,deactivated.coauthoring.designTasks[0]),false);
assert.throws(()=>previewAlternative(deactivated,deactivated.modelAlternatives.records[0]),/sources changed/i,'an existing proposal cannot bypass withdrawn authority');
console.log('PASS released design concern: candidate inert, source-governed options and criteria, architect assessment, decision-only reviewed preview, stale-source refusal.');

// Round 25 (D-25-10, K2): a criterion tied to a quality category and a driver kind, an option's consequence on each
// criterion and the evidence it needs. Synthetic project and source only.
{
  const at2='2026-10-14T12:00:00.000Z',REVIEW={reviewed:true,reviewer:'Second reviewer',reason:'Verified source and limited interpretation.'};
  let q=applyCommand(createProject({name:'Synthetic scheduling project',template:'blank'},'concern-k2'),{type:'artefact',payload:{type:'requirement',title:'Reserve equipment',description:'Report an authoritative reservation outcome.',acceptance:'The original reference identifies one result.',owner:'Facilities',source:'Synthetic workshop',confirmed:true}},at2).document;
  const scenario={requirementIds:['REQ-001'],stimulus:'Processing is unavailable.',conditions:'Intake remains open.',response:'Restore accepted reservations.',metric:'Recovery time',operator:'At most',targetValue:'30',unit:'minutes',window:'For each accepted request',measurement:'Failure exercise',owner:'Facilities'};
  for(const x of [{...scenario,title:'Reliable reservation',category:'recoverability',priority:'High',targetConfirmed:true,confirmed:true},{...scenario,title:'Bookings stay open',category:'availability',priority:'Medium'},{kind:'operational',title:'Nightly schedule rebuild',description:'The schedule is rebuilt every night.',priority:'Medium',owner:'Facilities',requirementIds:['REQ-001']},{...scenario,title:'Restore the schedule',category:'recoverability',priority:'Low'}])q=withFinalReview(applyQualityCommand(q,{type:'quality.driver',payload:x},at2).document);
  assert.deepEqual(q.quality.drivers.map(d=>[d.id,d.kind||'quality',d.category]),[['QD-001','quality','recoverability'],['QD-002','quality','availability'],['QD-003','operational',''],['QD-004','quality','recoverability']]);
  q=applyKnowledgeCommand(q,{type:'knowledge.source',payload:{title:'Synthetic scheduling note',body:'Synthetic scheduling note\nCompare owning the schedule in one application with a separate service.\n',path:'synthetic/schedule.txt',revision:'1',license:'Synthetic test material'}},at2,'author').document;
  const sid=q.knowledge.sources.at(-1).id;
  const TAGS=['title:Schedule ownership','question:Where should the schedule live?','criterion:recovery|Recovery|What happens during an outage?|recoverability|quality','criterion:operations|Operations|Who runs the nightly rebuild?||operational','option:local|One application|The modules share one release boundary.|A restore rehearsal of the shared release.','option:separate|Separate service|A network contract and recovery coordination are required.|A failover test across both services.','consequence:local|recovery|One restore point covers both modules.','consequence:separate|recovery|Each service restores on its own; reconcile across them.','consequence:local|operations|One team runs the nightly rebuild.','consequence:separate|operations|Two teams coordinate the nightly rebuild.'];
  const swap=(from,to)=>TAGS.map(x=>x.startsWith(from)?to:x);
  // Malformed, each in one way: the concern is not offered.
  const MALFORMED={'unknown-category':swap('criterion:recovery','criterion:recovery|Recovery|What happens during an outage?|resilience|quality'),'unknown-kind':swap('criterion:recovery','criterion:recovery|Recovery|What happens during an outage?|recoverability|platform'),'category-not-quality':swap('criterion:recovery','criterion:recovery|Recovery|What happens during an outage?|recoverability|operational'),'no-scope':swap('criterion:recovery','criterion:recovery|Recovery|What happens during an outage?||'),'four-parts':swap('criterion:recovery','criterion:recovery|Recovery|What happens during an outage?|recoverability'),'five-part-option':swap('option:local','option:local|One application|Shared release.|A restore rehearsal.|More'),'no-such-option':[...TAGS,'consequence:remote|recovery|A third way.'],'no-such-criterion':[...TAGS,'consequence:local|cost|It costs less.'],'second-consequence':[...TAGS,'consequence:local|recovery|Another statement of it.'],'empty-consequence':swap('consequence:local|recovery','consequence:local|recovery|'),'long-consequence':swap('consequence:local|recovery','consequence:local|recovery|'+'x'.repeat(601)),'empty-evidence':swap('option:local','option:local|One application|The modules share one release boundary.|'),'long-evidence':swap('option:local','option:local|One application|The modules share one release boundary.|'+'x'.repeat(601)),'cut-tag':swap('option:local','option:local|'+'One application '.repeat(19)+'|'+'Shared release. '.repeat(44)+'|'+'A restore rehearsal. '.repeat(15))};
  const claimOf=(id,tags)=>({sourceId:sid,lineStart:2,lineEnd:2,subjectId:'design-concern:'+id,predicate:'offers a design concern',claimType:'applicability',polarity:'neutral',statement:'Compare owning the schedule in one application with a separate service.',conditions:['For a schedule two teams change.'],limitations:['The source makes no measured recovery claim.'],tags});
  for(const [id,tags] of [['schedule-ownership',TAGS],['k2-consequences-only',TAGS.filter(x=>!x.startsWith('criterion:')&&!x.startsWith('option:')).concat('criterion:recovery|Recovery|What happens during an outage?','criterion:operations|Operations|Who runs the nightly rebuild?','option:local|One application|The modules share one release boundary.','option:separate|Separate service|A network contract and recovery coordination are required.')],...Object.entries(MALFORMED).map(([k,v])=>['k2-'+k,v])]){assert.ok(tags.length<=12,id+': within the twelve tags a claim keeps');q=applyKnowledgeCommand(q,{type:'knowledge.claim',payload:claimOf(id,tags)},at2,'author').document;}
  assert.equal(q.knowledge.claims.find(c=>c.subjectId==='design-concern:k2-cut-tag').tags.find(x=>x.startsWith('option:local')).length,1200,'the over-long tag was kept cut at 1,200 characters');
  // A candidate offers nothing, whatever its tags.
  assert.deepEqual(releasedDesignConcerns(q),[],'candidate concerns offer nothing');
  assert.throws(()=>applyArchitectureCommand(q,{type:'architecture.start',payload:{requirementId:'REQ-001',driverId:'QD-001',topic:'knowledge:schedule-ownership'}},at2),/current, released/);
  for(const c of q.knowledge.claims)q=applyKnowledgeCommand(q,{type:'knowledge.review',payload:{...REVIEW,id:c.id,decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true}},at2,'reviewer').document;
  q=applyKnowledgeCommand(q,{type:'knowledge.release',payload:{...REVIEW,title:'Synthetic K2 concerns',claimIds:q.knowledge.claims.map(c=>c.id)}},at2,'author').document;
  q=applyKnowledgeCommand(q,{type:'knowledge.activate',payload:{...REVIEW,id:q.knowledge.releases.at(-1).id,stamp:knowledgeStamp(q)}},at2,'author').document;
  // Released: only the well-formed concerns are offered, each malformed one is not.
  assert.deepEqual(releasedDesignConcerns(q).map(c=>c.id),['k2-consequences-only','schedule-ownership'],'malformed K2 shapes make a concern not offered');
  const concern=releasedDesignConcern(q,'schedule-ownership');
  assert.deepEqual(concern.criteria,[{id:'recovery',label:'Recovery',question:'What happens during an outage?',category:'recoverability',kind:'quality'},{id:'operations',label:'Operations',question:'Who runs the nightly rebuild?',category:'',kind:'operational'}]);
  assert.deepEqual(concern.options,[{id:'local',title:'One application',tradeoff:'The modules share one release boundary.',evidence:'A restore rehearsal of the shared release.',consequences:{recovery:'One restore point covers both modules.',operations:'One team runs the nightly rebuild.'}},{id:'separate',title:'Separate service',tradeoff:'A network contract and recovery coordination are required.',evidence:'A failover test across both services.',consequences:{recovery:'Each service restores on its own; reconcile across them.',operations:'Two teams coordinate the nightly rebuild.'}}]);
  assert.deepEqual(releasedDesignConcern(q,'k2-consequences-only').criteria.map(c=>Object.keys(c)),[['id','label','question'],['id','label','question']],'consequences need no scope');
  assert.deepEqual(concern.criteria.map(c=>criterionDrivers(q,c).map(d=>d.id)),[['QD-001','QD-004'],['QD-003']],'each criterion is tied to the project\'s drivers of its category, and of its kind');
  // The guided comparison says, where an option is assessed, its consequence per criterion, the drivers a criterion
  // weighs and the evidence the option needs; it scores nothing.
  q=applyArchitectureCommand(q,{type:'architecture.start',payload:{requirementId:'REQ-001',driverId:'QD-001',topic:'knowledge:schedule-ownership'}},at2).document;
  let t2=q.coauthoring.designTasks.at(-1);
  const notes2={local:{recovery:'Restore one process and reconcile reservations.',operations:'Facilities runs the rebuild.'},separate:{recovery:'Coordinate partial failure across services.',operations:'A platform team runs the rebuild.'}};
  q=applyArchitectureCommand(q,{type:'architecture.answers',payload:{id:t2.id,taskRevision:t2.revision,answers:{criteriaNotes:JSON.stringify(notes2),owner:'Facilities architect',reason:'One application fits the present team.'}}},at2).document;t2=q.coauthoring.designTasks.at(-1);
  const code=id=>driverCode(q,q.quality.drivers.find(d=>d.id===id)),local=assessInteraction(q,t2,'local');
  assert.deepEqual(local.checks.map(c=>c.detail),['Reliable reservation','Restore one process and reconcile reservations. Released consequence: One restore point covers both modules. It weighs '+code('QD-001')+', '+code('QD-004')+' (recoverability).','Facilities runs the rebuild. Released consequence: One team runs the nightly rebuild. It weighs '+code('QD-003')+' (operational).']);
  assert.deepEqual(local.effects.map(e=>[e.quality,e.effect,e.why]),[['Recovery','Architect assessment needed','Restore one process and reconcile reservations. Released consequence: One restore point covers both modules.'],['Operations','Architect assessment needed','Facilities runs the rebuild. Released consequence: One team runs the nightly rebuild.']]);
  assert.ok(local.caveats.includes('The evidence One application needs, as the released concern states: A restore rehearsal of the shared release.')&&!local.caveats.some(x=>/failover test/.test(x)),'the evidence the option in focus needs, and not another\'s');
  assert.ok(local.score===null&&assessInteraction(q,t2,'separate').score===null&&local.ready,'no score');
  assert.deepEqual(interactionReasoningGraph(q,t2,'local').edges.filter(e=>e.kind==='weighs').map(e=>[e.from,e.to]),[['criterion:recovery','QD-001'],['criterion:recovery','QD-004'],['criterion:operations','QD-003']],'the reasoning graph shows what each criterion weighs');
  // Prepared, nothing is linked yet: the person's reviewed apply links the drivers, never silently.
  const prep=applyArchitectureCommand(q,{type:'architecture.prepare',payload:{id:t2.id,taskRevision:t2.revision,optionId:'local'}},at2);q=prep.document;
  assert.equal(q.decisions.records.length,0,'preparing links nothing');
  const alt2=q.modelAlternatives.records.find(a=>a.id===prep.selected),pv=previewAlternative(q,alt2),d2=pv.document.decisions.records[0];
  // rc39: after the scenario and the criteria's drivers, the decision also records the requirement's other driver in scope (driver-scope.js), QD-002, so the record names every driver that reaches it; the criteria still weigh only the three (asserted above).
  assert.deepEqual(d2.driverIds,['QD-001','QD-004','QD-003','QD-002'],'the comparison\'s scenario, the drivers the criteria weigh, then the requirement\'s other driver in scope');
  assert.ok(d2.alternatives.every(a=>Object.values(a.assessments).every(v=>v.effect==='unknown')),'every effect stays unstated');
  const one=d2.alternatives.find(a=>a.title==='One application');
  assert.equal(one.consequences,'Reconsider when the linked quality scenario, source conditions or project constraints change. As the released concern states: Recovery: One restore point covers both modules. Operations: One team runs the nightly rebuild. The evidence it needs: A restore rehearsal of the shared release.');
  assert.deepEqual(Object.fromEntries(Object.entries(one.assessments).map(([k,v])=>[k,v.reason])),{'QD-001':'Recovery: Restore one process and reconcile reservations. Released consequence: One restore point covers both modules. Operations: Facilities runs the rebuild.','QD-004':'Recovery: Restore one process and reconcile reservations. Released consequence: One restore point covers both modules.','QD-003':'Operations: Facilities runs the rebuild. Released consequence: One team runs the nightly rebuild.'});
  assert.equal(pv.signals[1].title,'Drivers the released criteria weigh');assert.equal(pv.signals[1].detail,'Recovery: '+code('QD-001')+' · Reliable reservation, '+code('QD-004')+' · Restore the schedule; Operations: '+code('QD-003')+' · Nightly schedule rebuild. Applying this preview links them to the decision; their effects stay unstated until a person records them.');
  const applied2=applyAlternativeCommand(q,{type:'alternative.apply',payload:{id:alt2.id,alternativeRevision:alt2.revision,previewStamp:pv.stamp,reviewed:true,reviewer:'Independent project architect',reason:'Reviewed both released options and the drivers they weigh.'}},at2).document;
  const linked=applied2.decisions.records[0],reading2=readDecision(applied2,linked);
  assert.deepEqual(linked.driverIds,['QD-001','QD-004','QD-003'],'applied, the decision weighs the linked drivers');
  assert.ok(linked.alternatives.every(a=>Object.values(a.assessments).every(v=>v.effect==='unknown'&&!v.by))&&reading2.state==='unjudged'&&reading2.lead===null,'and nothing is weighed until a person records an effect');
  // Withdrawn or superseded, the concern stops offering, and its proposal cannot be previewed.
  const target=q.knowledge.claims.find(c=>c.subjectId==='design-concern:schedule-ownership').id;
  const withdrawnDoc=applyKnowledgeCommand(q,{type:'knowledge.withdraw',payload:{...REVIEW,id:target,stamp:knowledgeImpactStamp(q,target)}},at2,'author').document;
  assert.ok(!releasedDesignConcerns(withdrawnDoc).some(c=>c.id==='schedule-ownership'),'a withdrawn concern is not offered');
  assert.throws(()=>previewAlternative(withdrawnDoc,withdrawnDoc.modelAlternatives.records.find(a=>a.id===alt2.id)),/sources changed/i);
  const superseded=applyKnowledgeCommand(q,{type:'knowledge.source',payload:{title:'Synthetic scheduling note',body:'Synthetic scheduling note\nCompare owning the schedule in one application with two separate services.\n',path:'synthetic/schedule.txt',revision:'2',license:'Synthetic test material',supersedes:sid}},at2,'author').document;
  assert.deepEqual(releasedDesignConcerns(superseded),[],'a superseded source\'s concerns are not offered');
  console.log('PASS K2 design concern: a criterion tied to a quality category and a driver kind links the project\'s drivers of them to the decision on the person\'s apply; each option\'s consequence per criterion and the evidence it needs appear in the checks, effects, caveats and decision record; effects stay unstated and no score; candidates, malformed shapes, withdrawn and superseded concerns offer nothing.');
}
