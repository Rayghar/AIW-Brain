import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand,driverCode} from './public/quality-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyKnowledgeCommand,knowledgeStamp,claimReceiptCurrent,knowledgeImpactStamp} from './public/knowledge-governance.js';
import {domainShape,releasedDesignConcerns,releasedDesignConcern} from './public/domain-knowledge.js';
import {applyArchitectureCommand,architecturePreviewStamp} from './public/architecture-design.js';
import {assessInteraction,interactionContextCurrent,criterionDrivers,interactionReasoningGraph} from './public/architecture-knowledge.js';
import {designBasisCurrent} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {architectureEntry,startView} from './public/architecture-task-ui.js';
import {readDecision} from './public/decision-reading.js';
import {applySelectionCommand,selectionReading,selectionFindings} from './public/adoption-selection.js';
import {selectionView} from './public/adoption-ui.js';
import {journeyIndex} from './public/journey-context.js';

// rc44 wp2 S5 (design §e.1 row 9; the lead's rulings Q8 and U3): the guided comparison of a released concern is retired,
// and a released concern's options are compared as a selection in Chapter 3 (selection.* of kind option,
// public/adoption-selection.js). This suite is re-pointed; each replaced assertion is marked "U3: was … ->", and each is
// at least as strict. What the guided path wrote of the decision, selection.* writes, and it is asserted there; the
// candidate-concern refusal is selection.start's (and selection.candidate's); what reads a task reads a task as an older
// project holds it: the documents the guided path made at 5cae40a, captured there by this suite as it then was
// (rc44-wp2-design-concern-held.json). Such a task is not answered, prepared, previewed or applied again; it can be set aside.
const HELD=JSON.parse(readFileSync(new URL('./rc44-wp2-design-concern-held.json',import.meta.url),'utf8')),held=k=>{const x=HELD.documents[k];return x.from?{...held(x.from),...structuredClone(x.set)}:structuredClone(x);};
const RETIRED=/guided comparison of a released concern is retired/;
const sel=(doc,type,payload,{when=at,actor='facilities-architect',author={kind:'person',id:actor,account:'person'}}={})=>applySelectionCommand(doc,{type,payload},when,actor,{author});
const edgesOf=(doc,id)=>journeyIndex(doc).edges.filter(e=>e.from===id||e.to===id).map(e=>[e.from,e.to,e.label]);

const at='2026-10-11T12:00:00.000Z';
let p=applyCommand(createProject({name:'Synthetic equipment project',template:'blank'},'concern-fixture'),{type:'artefact',payload:{type:'requirement',title:'Reserve equipment',description:'Report an authoritative reservation outcome.',acceptance:'The original reference identifies one result.',owner:'Facilities',source:'Synthetic workshop',confirmed:true}},at).document;
p=withFinalReview(applyQualityCommand(p,{type:'quality.driver',payload:{title:'Reliable reservation',category:'recoverability',requirementIds:['REQ-001'],stimulus:'Processing is unavailable.',conditions:'Reservation intake remains open.',response:'Restore accepted reservations.',metric:'Recovery time',operator:'At most',targetValue:'30',unit:'minutes',window:'For each accepted request',measurement:'Failure exercise',targetConfirmed:true,confirmed:true,owner:'Facilities'}},at).document);
const source='Synthetic architecture note\nCompare owning the schedule in one application with a separate service. Evaluate responsibility ownership and the cost of coordination.\n';
p=applyKnowledgeCommand(p,{type:'knowledge.source',payload:{title:'Synthetic architecture note',body:source,path:'synthetic/note.txt',revision:'1',license:'Synthetic test material'}},at,'author').document;
const sid=p.knowledge.sources.at(-1).id,claim={sourceId:sid,lineStart:2,lineEnd:2,subjectId:'design-concern:service-ownership',predicate:'offers a design concern',claimType:'applicability',polarity:'neutral',statement:'Compare local ownership and a separate service boundary.',conditions:['For an architecture with two responsibilities.'],limitations:['The source makes no measured reliability claim.'],tags:['title:Service ownership','question:Where should reservation ownership live?','criterion:ownership|Ownership|Who owns the schedule and its changes?','criterion:recovery|Recovery|What happens during an outage?','option:local|One application|The modules share one release boundary.','option:separate|Separate service|A network contract and recovery coordination are required.']};
p=applyKnowledgeCommand(p,{type:'knowledge.claim',payload:claim},at,'author').document;
assert.equal(domainShape(p.knowledge.claims[0]),'concern');
assert.deepEqual(releasedDesignConcerns(p),[],'candidate claims cannot offer a comparison');
// U3: was architecture.start of the candidate concern refused /current, released/ -> the guided start is refused (retired),
// and selection.start of the candidate concern is refused /current, released/, for a person and for a draft by Sol.
assert.throws(()=>applyArchitectureCommand(p,{type:'architecture.start',payload:{requirementId:'REQ-001',driverId:'QD-001',topic:'knowledge:service-ownership'}},at),RETIRED);
const START={kind:'option',concernId:'service-ownership',requirementId:'REQ-001',driverId:'QD-001',owner:'Facilities architect',reason:'Local ownership fits the present team; accept shared deployment.'};
for(const author of [undefined,{kind:'sol-draft',id:'facilities-architect',account:'person'}])assert.throws(()=>sel(p,'selection.start',START,{author}),/current, released/,'candidate claims cannot offer a comparison');
const candidateDoc=p;
// rc39: the entry offers Start a comparison; the concern picker is the start view's (architecture-task-ui.js startView), so the released concern is read there.
const entryContext={requirements:[p.artefacts.find(a=>a.id==='REQ-001')],drivers:p.quality.drivers,selected:{id:'REQ-001'},chapter:4,tasks:[]};
assert(architectureEntry(p,entryContext).includes('data-arc-action="launch"'),'the entry offers to start a comparison');
assert.equal(startView(p,entryContext).includes('Service ownership · released knowledge'),false);
assert.equal(selectionView(p,{concernId:'service-ownership'}).includes('data-sel-concern'),false,'nor is a selection of its options offered');
p=applyKnowledgeCommand(p,{type:'knowledge.review',payload:{id:p.knowledge.claims[0].id,reviewed:true,reviewer:'Second reviewer',reason:'Verified source and limited interpretation.',decision:'verified',sourceChecked:true,rightsChecked:true,conditionsChecked:true}},at,'reviewer').document;
p=applyKnowledgeCommand(p,{type:'knowledge.release',payload:{reviewed:true,reviewer:'Second reviewer',reason:'Release this synthetic concern.',title:'Synthetic concern',claimIds:[p.knowledge.claims[0].id]}},at,'author').document;
p=applyKnowledgeCommand(p,{type:'knowledge.activate',payload:{reviewed:true,reviewer:'Second reviewer',reason:'Use the reviewed concern.',id:p.knowledge.releases[0].id,stamp:knowledgeStamp(p)}},at,'author').document;
const concerns=releasedDesignConcerns(p);assert.deepEqual(concerns.map(x=>x.id),['service-ownership']);
assert.deepEqual(concerns[0].criteria.map(x=>x.id),['ownership','recovery']);
assert.deepEqual(concerns[0].options.map(x=>x.id),['local','separate']);
assert.equal(concerns[0].receipt.scoring,false);
// U3: was the guided picker offers the released concern as a choosable topic -> it no longer does (retired), and the
// selection view offers its options to compare: the requirement, the driver, a note on each released criterion for each
// option, the accountable architect and the reason.
const ui=startView(p,entryContext);assert.equal(ui.includes('Service ownership · released knowledge'),false,'the guided picker no longer offers it');assert.equal(/<option value="knowledge:service-ownership"/.test(ui),false);
const sv=selectionView(p,{concernId:'service-ownership',driverId:'QD-001'});assert(sv.includes('Compare the released options of Service ownership')&&sv.includes('data-sel-concern="service-ownership"')&&/<option value="REQ-001">/.test(sv)&&sv.includes('data-sel-action="start-option"'),'as a choosable concern: its options are compared as a selection');
assert.deepEqual([...sv.matchAll(/data-sel-note="([^"]+)"/g)].map(m=>m[1]),['local|ownership','local|recovery','separate|ownership','separate|recovery'],'each option is assessed on each released criterion');
// U3: was architecture.start opens a task whose governed concern is the released claim -> selection.start opens a selection
// of the concern's options pinned to exactly that claim; a task the guided path started (held from 5cae40a) names it too.
const started=sel(p,'selection.start',START),id=started.selected,D=doc=>doc.decisions.records.find(d=>d.id===id);let s=started.document;
assert.equal(D(s).selection.concern.receipt.claimId,concerns[0].receipt.claimId);assert.deepEqual(D(s).selection.concern.receipt,concerns[0].receipt);
const H0=held('started');let t=H0.coauthoring.designTasks[0];assert.equal(t.governedConcern.receipt.claimId,concerns[0].receipt.claimId);
// candidate claims cannot offer a comparison: a selection that names the concern while it is a candidate (a document made
// by hand: no command writes one) is offered none of its options
{const hand=structuredClone(candidateDoc);hand.decisions=structuredClone(s.decisions);assert.throws(()=>sel(hand,'selection.candidate',{id,candidate:{kind:'option',ref:{optionId:'local'}},notes:{ownership:'Assessed.',recovery:'Assessed.'}}),/no longer current/,'candidate claims cannot offer a comparison');}
assert.equal(assessInteraction(H0,t,'local').ready,false,'criterion answers are needed');
const notes={local:{ownership:'Facilities owns both modules and the schedule.',recovery:'Restore one process and reconcile reservations.'},separate:{ownership:'A separate team owns the schedule contract.',recovery:'Coordinate partial failure across services.'}};
// U3: was architecture.answers of one option's notes, then architecture.prepare refused /Assess every released approach/
// -> a held task is answered no more (retired); selection.candidate refuses an option not assessed on every released
// criterion /Assess every released approach/, and one option compared is no comparison: nothing is chosen.
assert.throws(()=>applyArchitectureCommand(H0,{type:'architecture.answers',payload:{id:t.id,taskRevision:t.revision,answers:{criteriaNotes:JSON.stringify({local:notes.local}),owner:'Facilities architect',reason:'Local ownership fits the present team.'}}},at),RETIRED);
let partial=sel(s,'selection.candidate',{id,candidate:{kind:'option',ref:{optionId:'local'}},notes:notes.local}).document;
assert.throws(()=>sel(partial,'selection.candidate',{id,candidate:{kind:'option',ref:{optionId:'separate'}},notes:{ownership:notes.separate.ownership}}),/Assess every released approach/,'a blank alternative cannot masquerade as a comparison');
assert.throws(()=>sel(partial,'selection.choose',{id,alternativeId:D(partial).alternatives[0].id,reason:'Local ownership fits the present team.',rejections:{}}),/Compare at least two candidates/,'nor is one option a comparison');
s=sel(partial,'selection.candidate',{id,candidate:{kind:'option',ref:{optionId:'separate'}},notes:notes.separate}).document;
// U3: was both options of the answered task read ready, with no score -> so they read on the task the guided path answered
// (held); the selection compares both, in order, and its reading holds no score, rank or weight.
const H1=held('answered');t=H1.coauthoring.designTasks[0];assert.equal(assessInteraction(H1,t,'local').ready,true);assert.equal(assessInteraction(H1,t,'separate').ready,true);assert.equal(assessInteraction(H1,t,'local').score,null);
{const reading=selectionReading(s,D(s));assert.deepEqual(reading.candidates.map(c=>c.title),['One application','Separate service']);JSON.stringify(reading,(k,v)=>{assert(!/^(score|rank|weight)s?$/i.test(k),'no score: '+k);return v;});}
// U3: was architecture.prepare writes no decision ('preparing does not mutate the current model') -> the task the guided
// path prepared (held) holds none, and a held task is prepared no more; the selection writes its decision and nothing else
// of the model, a proposal that joins no requirement's or driver's journey before a person chooses (ruling U4).
const H2=held('prepared');assert.equal(H2.decisions.records.length,0,'preparing does not mutate the current model');
assert.throws(()=>applyArchitectureCommand(H1,{type:'architecture.prepare',payload:{id:t.id,taskRevision:t.revision,optionId:'local'}},at),RETIRED);
assert.deepEqual(Object.keys(s).filter(k=>JSON.stringify(s[k])!==JSON.stringify(p[k])),['decisions'],'the selection writes its decision only');assert.deepEqual(edgesOf(s,id),[],'and joins no journey before a person chooses');
// U3: was the reviewed preview of the prepared alternative gives a draft decision of both options, 'One application'
// chosen, with no component -> the held alternative is not previewed (retired); a person's choice in the selection gives it.
const alternative=H2.modelAlternatives.records.find(a=>a.id===HELD.preparedAlternativeId);assert.throws(()=>previewAlternative(H2,alternative),RETIRED);
const local=D(s).alternatives.find(a=>a.title==='One application'),separate=D(s).alternatives.find(a=>a.title==='Separate service');
const chosen=sel(s,'selection.choose',{id,alternativeId:local.id,reason:'Local ownership fits the present team; accept shared deployment.',rejections:{[separate.id]:'Local ownership fits the present team; accept shared deployment.'},unproven:[]}).document;
assert.equal(chosen.realisation.components.length,0,'a domain concern does not fabricate components');
const decision=D(chosen);assert.equal(decision.status,'draft');assert.equal(decision.alternatives.length,2);assert.equal(decision.alternatives.find(a=>a.id===decision.selectedAlternativeId).title,'One application');assert(decision.alternatives.every(a=>a.assessments['QD-001'].effect==='unknown'));
assert(decision.alternatives[0].assessments['QD-001'].reason.includes('Facilities owns both modules'));
// Round 25 (D-25-10): a concern without the K2 shapes reads as before: its own scenario only, the criteria notes as the
// reason, the counterfactual as the consequence, one signal.
assert.deepEqual(decision.driverIds,['QD-001']);assert.deepEqual(decision.alternatives.map(a=>Object.keys(a.assessments)),[['QD-001'],['QD-001']]);
assert.equal(decision.alternatives[0].assessments['QD-001'].reason,'Ownership: Facilities owns both modules and the schedule. Recovery: Restore one process and reconcile reservations.');
// U3: was the preview's one signal ('Source-grounded comparison': options and criteria from the released claim, and no
// driver a criterion weighs) -> the decision names that released source, every alternative's evidence is it, and it names
// no driver but the comparison's own (above).
const receipt=concerns[0].receipt;
assert.equal(decision.alternatives[0].consequences,'Reconsider when the linked quality scenario, source conditions or project constraints change.');assert.equal(decision.source,'Released design concern '+receipt.claimId+' / '+receipt.releaseId+' · '+receipt.path+' @ '+receipt.revision+' lines '+receipt.lineStart+'–'+receipt.lineEnd);assert(decision.alternatives.every(a=>a.assessments['QD-001'].evidence===decision.source));
assert.deepEqual(assessInteraction(H2,t,'local').checks.map(c=>c.detail),['Reliable reservation','Facilities owns both modules and the schedule.','Restore one process and reconcile reservations.']);
assert.deepEqual(assessInteraction(H2,t,'local').caveats,['For an architecture with two responsibilities.','The source makes no measured reliability claim.','Released guidance informs a comparison; it does not score the alternatives, establish quality achievement or approve a choice.']);
assert.ok(!interactionReasoningGraph(H2,t,'local').edges.some(e=>e.kind==='weighs'),'and weighs no further driver');
// U3: was the reviewed apply gives a draft decision (not Chapter 3 acceptance) and the task applied and current -> the held
// alternative is applied no more (retired); the task the guided path applied (held) reads applied and current; a held task
// can still be set aside; and a second person's confirm of the person's choice is not Chapter 3 acceptance either.
assert.throws(()=>applyAlternativeCommand(H2,{type:'alternative.apply',payload:{id:alternative.id,alternativeRevision:alternative.revision,previewStamp:architecturePreviewStamp(H2,alternative),reviewed:true,reviewer:'Independent project architect',reason:'Reviewed both source-grounded options and criterion notes.'}},at),RETIRED);
const applied=held('applied');
assert.equal(applied.decisions.records[0].status,'draft','reviewed apply is not Chapter 3 acceptance');assert.equal(applied.coauthoring.designTasks[0].status,'applied');assert.equal(designBasisCurrent(applied,applied.coauthoring.designTasks[0]),true);
assert.equal(interactionContextCurrent(applied,applied.coauthoring.designTasks[0]),true);
assert.equal(claimReceiptCurrent(applied,concerns[0].receipt),true);
assert.equal(applyArchitectureCommand(H1,{type:'architecture.dismiss',payload:{id:t.id,taskRevision:t.revision,reason:'Compared as a selection now.'}},at).document.coauthoring.designTasks[0].status,'dismissed','a held task can be set aside');
const confirmed=sel(chosen,'selection.confirm',{id},{actor:'second-architect'}).document;
assert.equal(D(confirmed).status,'draft','a confirmed selection is not Chapter 3 acceptance');assert.deepEqual(selectionFindings(confirmed),[]);assert.equal(claimReceiptCurrent(confirmed,D(confirmed).selection.concern.receipt),true);
assert.deepEqual(edgesOf(confirmed,id),[['REQ-001',id,'design question'],['QD-001',id,'comparison criterion']],'the person\'s choice is the design change');
// U3: was the held proposal's preview refused /sources changed/ once the release is withdrawn -> it is refused whatever its
// sources (retired) and its task reads stale; the selection cannot bypass withdrawn authority either: its options are not
// chosen, and a chosen one is an error that refuses acceptance.
const deactivate=x=>applyKnowledgeCommand(x,{type:'knowledge.deactivate',payload:{reviewed:true,reviewer:'Second reviewer',reason:'Withdraw project activation.',id:x.knowledge.releases[0].id,stamp:knowledgeStamp(x)}},at,'author').document;
const deactivated=deactivate(H2);
assert.deepEqual(releasedDesignConcerns(deactivated),[]);assert.equal(interactionContextCurrent(deactivated,deactivated.coauthoring.designTasks[0]),false);
assert.throws(()=>previewAlternative(deactivated,deactivated.modelAlternatives.records[0]),RETIRED,'an existing proposal cannot bypass withdrawn authority');
{const off=deactivate(s);assert.deepEqual(releasedDesignConcerns(off),[]);assert.throws(()=>sel(off,'selection.choose',{id,alternativeId:local.id,reason:'Local ownership fits the present team.',rejections:{[separate.id]:'Shared deployment.'},unproven:[]}),/no longer current/,'an existing proposal cannot bypass withdrawn authority');}
assert.deepEqual(selectionFindings(deactivate(confirmed)).map(f=>[f.code,f.level]),[['selection-withdrawn','error']],'nor a chosen one');
console.log('PASS released design concern: candidate inert, source-governed options and criteria, architect assessment, a decision-only selection of the released options (the guided path retired, its held tasks read), stale-source refusal.');

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
  // U3: was architecture.start of the candidate concern refused /current, released/ -> the guided start is refused
  // (retired), and selection.start of the candidate concern is refused /current, released/.
  const START2={kind:'option',concernId:'schedule-ownership',requirementId:'REQ-001',driverId:'QD-001',owner:'Facilities architect',reason:'One application fits the present team.'};
  assert.throws(()=>applyArchitectureCommand(q,{type:'architecture.start',payload:{requirementId:'REQ-001',driverId:'QD-001',topic:'knowledge:schedule-ownership'}},at2),RETIRED);
  assert.throws(()=>sel(q,'selection.start',START2,{when:at2}),/current, released/);
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
  // U3: was architecture.start and architecture.answers of the released concern -> selection.start of its options, each
  // option added as a candidate with the same criterion notes; the checks, effects, caveats, score and reasoning graph read
  // the task the guided path answered (held from 5cae40a).
  const k2=sel(q,'selection.start',START2,{when:at2}),k2id=k2.selected,K=doc=>doc.decisions.records.find(d=>d.id===k2id);let qs=k2.document;
  const notes2={local:{recovery:'Restore one process and reconcile reservations.',operations:'Facilities runs the rebuild.'},separate:{recovery:'Coordinate partial failure across services.',operations:'A platform team runs the rebuild.'}};
  for(const optionId of ['local','separate'])qs=sel(qs,'selection.candidate',{id:k2id,candidate:{kind:'option',ref:{optionId}},notes:notes2[optionId]},{when:at2}).document;
  const Q1=held('k2answered');let t2=Q1.coauthoring.designTasks.at(-1);
  const code=id=>driverCode(q,q.quality.drivers.find(d=>d.id===id)),local=assessInteraction(Q1,t2,'local');
  assert.deepEqual(local.checks.map(c=>c.detail),['Reliable reservation','Restore one process and reconcile reservations. Released consequence: One restore point covers both modules. It weighs '+code('QD-001')+', '+code('QD-004')+' (recoverability).','Facilities runs the rebuild. Released consequence: One team runs the nightly rebuild. It weighs '+code('QD-003')+' (operational).']);
  assert.deepEqual(local.effects.map(e=>[e.quality,e.effect,e.why]),[['Recovery','Architect assessment needed','Restore one process and reconcile reservations. Released consequence: One restore point covers both modules.'],['Operations','Architect assessment needed','Facilities runs the rebuild. Released consequence: One team runs the nightly rebuild.']]);
  assert.ok(local.caveats.includes('The evidence One application needs, as the released concern states: A restore rehearsal of the shared release.')&&!local.caveats.some(x=>/failover test/.test(x)),'the evidence the option in focus needs, and not another\'s');
  assert.ok(local.score===null&&assessInteraction(Q1,t2,'separate').score===null&&local.ready,'no score');
  assert.deepEqual(interactionReasoningGraph(Q1,t2,'local').edges.filter(e=>e.kind==='weighs').map(e=>[e.from,e.to]),[['criterion:recovery','QD-001'],['criterion:recovery','QD-004'],['criterion:operations','QD-003']],'the reasoning graph shows what each criterion weighs');
  // Prepared, nothing is linked yet: the person's reviewed apply links the drivers, never silently.
  // U3: was architecture.prepare links nothing -> the task the guided path prepared (held) holds no decision, and a held
  // task is prepared no more (retired); the selection's decision links no driver until a person chooses (ruling U4).
  const Q2=held('k2prepared');assert.equal(Q2.decisions.records.length,0,'preparing links nothing');
  assert.throws(()=>applyArchitectureCommand(Q1,{type:'architecture.prepare',payload:{id:t2.id,taskRevision:t2.revision,optionId:'local'}},at2),RETIRED);
  assert.deepEqual(edgesOf(qs,k2id),[],'before a person chooses, the selection links no driver');
  // U3: was the preview of the prepared alternative and its decision -> the held alternative is not previewed (retired);
  // the decision assertions read the selection's decision.
  const alt2=Q2.modelAlternatives.records.find(a=>a.id===HELD.k2preparedAlternativeId);assert.throws(()=>previewAlternative(Q2,alt2),RETIRED);
  const d2=K(qs);
  // rc39: after the scenario and the criteria's drivers, the decision also records the requirement's other driver in scope (driver-scope.js), QD-002, so the record names every driver that reaches it; the criteria still weigh only the three (asserted above).
  assert.deepEqual(d2.driverIds,['QD-001','QD-004','QD-003','QD-002'],'the comparison\'s scenario, the drivers the criteria weigh, then the requirement\'s other driver in scope');
  assert.ok(d2.alternatives.every(a=>Object.values(a.assessments).every(v=>v.effect==='unknown')),'every effect stays unstated');
  const one=d2.alternatives.find(a=>a.title==='One application');
  assert.equal(one.consequences,'Reconsider when the linked quality scenario, source conditions or project constraints change. As the released concern states: Recovery: One restore point covers both modules. Operations: One team runs the nightly rebuild. The evidence it needs: A restore rehearsal of the shared release.');
  assert.deepEqual(Object.fromEntries(Object.entries(one.assessments).map(([k,v])=>[k,v.reason])),{'QD-001':'Recovery: Restore one process and reconcile reservations. Released consequence: One restore point covers both modules. Operations: Facilities runs the rebuild.','QD-004':'Recovery: Restore one process and reconcile reservations. Released consequence: One restore point covers both modules.','QD-003':'Operations: Facilities runs the rebuild. Released consequence: One team runs the nightly rebuild.'});
  // U3: was the preview's signal 'Drivers the released criteria weigh' (Recovery: QD-001, QD-004; Operations: QD-003),
  // their effects unstated -> the decision names each criterion's drivers with the criterion and its released consequence
  // in their reasons, exactly those, and every effect stays unstated (above) until a person records one.
  assert.deepEqual(concern.criteria.map(c=>d2.driverIds.filter(k=>one.assessments[k]?.reason.includes(c.label+': ')&&one.assessments[k].reason.includes('Released consequence: '+concern.options[0].consequences[c.id]))),[['QD-001','QD-004'],['QD-003']],'the drivers each released criterion weighs');
  // U3: was the person's reviewed apply links the drivers, and nothing is weighed until a person records an effect -> the
  // held alternative is applied no more (retired); the person's choice in the selection links them, and nothing is weighed:
  // a selection weighs no driver ('unweighed', ruling Q1; was 'unjudged', drivers weighed and no effect stated).
  assert.throws(()=>applyAlternativeCommand(Q2,{type:'alternative.apply',payload:{id:alt2.id,alternativeRevision:alt2.revision,previewStamp:architecturePreviewStamp(Q2,alt2),reviewed:true,reviewer:'Independent project architect',reason:'Reviewed both released options and the drivers they weigh.'}},at2),RETIRED);
  const other=d2.alternatives.find(a=>a.title==='Separate service'),applied2=sel(qs,'selection.choose',{id:k2id,alternativeId:one.id,reason:'One application fits the present team.',rejections:{[other.id]:'One application fits the present team.'},unproven:[]},{when:at2}).document;
  const linked=K(applied2),reading2=readDecision(applied2,linked);
  assert.deepEqual(linked.driverIds,['QD-001','QD-004','QD-003'],'applied, the decision weighs the linked drivers');
  assert.deepEqual(edgesOf(applied2,k2id).filter(e=>e[2]==='comparison criterion').map(e=>e[0]),linked.driverIds,'the person\'s choice links them, never silently');
  assert.ok(linked.alternatives.every(a=>Object.values(a.assessments).every(v=>v.effect==='unknown'&&!v.by))&&reading2.state==='unweighed'&&reading2.lead===null,'and nothing is weighed until a person records an effect');
  // Withdrawn or superseded, the concern stops offering, and its proposal cannot be previewed.
  // U3: was the held proposal's preview refused /sources changed/ -> it is refused whatever its sources (retired); the
  // selection's options are not chosen from a withdrawn or superseded concern, and a chosen one is an error.
  const target=q.knowledge.claims.find(c=>c.subjectId==='design-concern:schedule-ownership').id,withdraw=x=>applyKnowledgeCommand(x,{type:'knowledge.withdraw',payload:{...REVIEW,id:target,stamp:knowledgeImpactStamp(x,target)}},at2,'author').document;
  const withdrawnDoc=withdraw(Q2);
  assert.ok(!releasedDesignConcerns(withdrawnDoc).some(c=>c.id==='schedule-ownership'),'a withdrawn concern is not offered');
  assert.throws(()=>previewAlternative(withdrawnDoc,withdrawnDoc.modelAlternatives.records.find(a=>a.id===alt2.id)),RETIRED);
  const choose2={id:k2id,alternativeId:one.id,reason:'One application fits the present team.',rejections:{[other.id]:'Two teams.'},unproven:[]};
  assert.throws(()=>sel(withdraw(qs),'selection.choose',choose2,{when:at2}),/no longer current/);assert.deepEqual(selectionFindings(withdraw(applied2)).map(f=>f.code),['selection-withdrawn','selection-confirm']);
  const superseded=applyKnowledgeCommand(q,{type:'knowledge.source',payload:{title:'Synthetic scheduling note',body:'Synthetic scheduling note\nCompare owning the schedule in one application with two separate services.\n',path:'synthetic/schedule.txt',revision:'2',license:'Synthetic test material',supersedes:sid}},at2,'author').document;
  assert.deepEqual(releasedDesignConcerns(superseded),[],'a superseded source\'s concerns are not offered');
  {const off=applyKnowledgeCommand(qs,{type:'knowledge.source',payload:{title:'Synthetic scheduling note',body:'Synthetic scheduling note\nCompare owning the schedule in one application with two separate services.\n',path:'synthetic/schedule.txt',revision:'2',license:'Synthetic test material',supersedes:sid}},at2,'author').document;assert.throws(()=>sel(off,'selection.choose',choose2,{when:at2}),/no longer current/);}
  console.log('PASS K2 design concern: a criterion tied to a quality category and a driver kind links the project\'s drivers of them to the decision on the person\'s choice in a selection of the released options; each option\'s consequence per criterion and the evidence it needs appear in the checks, effects and caveats of a held task and in the decision record; effects stay unstated and no score; candidates, malformed shapes, withdrawn and superseded concerns offer nothing.');
}
