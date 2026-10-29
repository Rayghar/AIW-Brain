// Synthetic domain regressions. No provider call, human approval or payment observation.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {chapterInsight} from './public/chapter-insight.js';
import {chapterChecks,scopedChecks} from './public/readiness-model.js';
import {CHAPTERS,finalMilestones,inheritedFindings,applyFinalReviewCommand} from './public/review-domain.js';
import {applyDecisionCommand,decisionCurrent,decisionSourceChanged,decisionFindings} from './public/decisions-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {scopeLens} from './public/module-lens.js';
import {settleDocument,unmemoised} from './public/document-memo.js';

const checks=[],pass=s=>checks.push(s), clone=structuredClone;
const fixture=createProject({name:'Synthetic header',template:'bank-payment'},'header-fixture');
const p=settleDocument(clone(fixture)), before=JSON.stringify(p), realFetch=globalThis.fetch;
let calls=0;globalThis.fetch=()=>{calls++;throw Error('Header insight must never use a provider or network');};
const targets=x=>[...x.nextActions.map(a=>a.target),...x.openDecisions.items.map(a=>a.target),...x.projectProgress.chapters.flatMap(c=>[c.target,...c.stages.map(s=>s.target)])];
const query=t=>new URL(t.url,'https://aiw.test').searchParams;
for(let chapter=1;chapter<=11;chapter++){
  const x=chapterInsight(p,chapter), C=chapterChecks(p,chapter), ms=chapter===11?finalMilestones(p):CHAPTERS.find(c=>c.id===chapter).milestones(p);
  assert.deepEqual([x.progress.done,x.progress.total],[C.milestones.done,C.milestones.total]);
  assert.deepEqual(x.progress.milestones,ms.map(({id,name,done})=>({id,name,done:!!done})));
  assert.match(x.progress.label,/milestones met$/);assert.equal(x.progress.scope,'chapter');assert.equal(x.progress.illustrative,true);
  assert.equal(x.projectProgress.chapters.length,11);assert.equal(x.projectProgress.done,x.projectProgress.chapters.reduce((n,c)=>n+c.done,0));
  assert.equal(x.projectProgress.total,x.projectProgress.chapters.reduce((n,c)=>n+c.total,0));
  assert(x.nextActions.length>0&&x.nextActions.length<=3);assert(x.openDecisions.items.length<=3);assert(x.lead.why&&x.lead.rule);
  for(const t of targets(x)){assert.equal(query(t).get('project'),p.id);assert(query(t).has('scope'),'Every link explicitly retains or clears the scope');assert(t.chapter>=1&&t.chapter<=11);if(t.objectId)assert.equal(query(t).get(t.chapter===1?'artefact':t.chapter===2?'driver':t.chapter===3?'decision':'object'),t.objectId);}
}
assert.equal(JSON.stringify(p),before);assert.equal(calls,0);
const leaked=chapterInsight(p,3);leaked.lead.title='Caller mutation';leaked.projectProgress.chapters[0].done=999;
assert.notEqual(chapterInsight(p,3).lead.title,'Caller mutation');assert.notEqual(chapterInsight(p,3).projectProgress.chapters[0].done,999);
assert.deepEqual(unmemoised(()=>chapterInsight(p,3)),chapterInsight(p,3),'Cached and uncached domain readings agree');
const oldLocation=globalThis.location;globalThis.location={origin:'https://foreign.test',search:'?project=another-project&scope=foreign-module'};
for(const t of targets(chapterInsight(clone(fixture),4)))assert.equal(query(t).get('project'),fixture.id,'The saved project wins over ambient browser location');
if(oldLocation===undefined)delete globalThis.location;else globalThis.location=oldLocation;
pass('All eleven chapters read canonical milestones, exact project/record routes and bounded actions without network, mutation or cache leakage');

const blank=settleDocument(createProject({name:'Blank header',template:'blank'},'blank-header'));
for(let chapter=1;chapter<=11;chapter++){
  const x=chapterInsight(blank,chapter);assert.equal(x.lead.kind,'start');assert.equal(x.attention,false);assert.equal(x.lead.target.chapter,1);assert.equal(x.lead.target.tab,'work');assert.equal(x.openDecisions.count,0);assert.equal(x.progress.illustrative,false);
}
assert.equal(chapterInsight(p,0),null);assert.equal(chapterInsight(null,1),null);
pass('Empty chapters offer requirement capture in Chapter1 without a false critical-warning or invented decision');

const cmd=(p,type,payload={})=>applyDecisionCommand(p,{type:'decision.'+type,payload}).document;
const get=(p,id)=>p.decisions.records.find(d=>d.id===id);
function prepare(p,id,index=0){const d=get(p,id),a=d.alternatives[index];p=cmd(p,'alternative',{...a,id,alternativeId:a.id,assessments:Object.fromEntries(d.driverIds.map(q=>[q,{effect:a.assessments[q]?.effect||'neutral',reason:'Synthetic mechanism comparison.',evidence:'Synthetic analysis; no runtime measurement.'}]))});p=cmd(p,'choose',{id,alternativeId:a.id});p=cmd(p,'save',{...get(p,id),rationale:'Synthetic choice with explicit failure boundary.',mitigation:'Proposed timeout, concurrency and restart tests.'});return cmd(p,'record',{id});}
const unresolved=chapterInsight(p,3).openDecisions.items.find(d=>d.id==='ADR-001');assert.equal(unresolved.state,'unresolved');
let chosen=cmd(fixture,'choose',{id:'ADR-001',alternativeId:'ALT-002'});
assert.equal(chapterInsight(chosen,3).openDecisions.items.find(d=>d.id==='ADR-001').state,'selected-not-accepted');
let accepted=cmd(prepare(fixture,'ADR-001',1),'accept',{id:'ADR-001',acknowledge:true});
assert(decisionCurrent(accepted,get(accepted,'ADR-001')));assert.equal(get(accepted,'ADR-001').governance,null);
assert(!chapterInsight(accepted,3).openDecisions.items.some(d=>d.id==='ADR-001'),'Current architect acceptance is not an unresolved choice');
const source=accepted.artefacts.find(r=>r.id===get(accepted,'ADR-001').requirementIds[0]);
const changed=applyCommand(accepted,{type:'artefact',payload:{...source,description:source.description+' A changed requirement boundary.'}}).document;
assert(decisionSourceChanged(changed,get(changed,'ADR-001')));
const stale=chapterInsight(changed,3).openDecisions.items.find(d=>d.id==='ADR-001');assert.equal(stale.state,'needs-review');assert.equal(stale.architectAccepted,false);assert.equal(stale.externalApproval,false);assert.equal(stale.target.objectId,'ADR-001');
const superseded=clone(fixture);superseded.decisions.records[0].status='superseded';assert(!chapterInsight(superseded,3).openDecisions.items.some(d=>d.id==='ADR-001'));
pass('Unresolved, selected, architect accepted, superseded and source-stale decisions remain distinct; no external approval is inferred');

let broken=applyQualityCommand(fixture,{type:'quality.driver',payload:{kind:'constraint',title:'Synthetic on-premises boundary',description:'Hosting stays on premises.',impact:'No public cloud runtime.',constraintIds:['CON-001'],priority:'High'}}).document;
const constraint=broken.quality.drivers.at(-1).id;
broken=cmd(broken,'save',{id:'ADR-001',driverIds:[...get(broken,'ADR-001').driverIds,constraint]});
broken=cmd(broken,'alternative',{id:'ADR-001',alternativeId:'ALT-002',assessments:{...get(broken,'ADR-001').alternatives.find(a=>a.id==='ALT-002').assessments,[constraint]:{effect:'violates',reason:'Requires public cloud.',evidence:'Synthetic recorded assessment.'}}});
broken=cmd(broken,'choose',{id:'ADR-001',alternativeId:'ALT-002'});
assert(decisionFindings(broken).some(f=>f.decisionId==='ADR-001'&&f.code==='breaks'));
const brokenItem=chapterInsight(broken,3).openDecisions.items.find(d=>d.id==='ADR-001');assert.equal(brokenItem.state,'needs-review');assert.match(brokenItem.reason,/breaks/);
const dominated=cmd(fixture,'choose',{id:'ADR-003',alternativeId:'ALT-006'});assert.equal(chapterInsight(dominated,3).openDecisions.items.find(d=>d.id==='ADR-003').state,'needs-review');
pass('Round25 hard-constraint violations and dominated working choices use their actual decision findings');

const first=chapterInsight(p,6).lead;assert.equal(first.kind,'finding');
const finding=inheritedFindings(p).find(f=>f.id===first.id);assert(finding);
const treated=applyFinalReviewCommand(fixture,{type:'review.disposition',payload:{findingId:finding.id,stamp:finding.stamp,treatment:'Accepted design limitation',rationale:'Synthetic regression treatment only.',reviewer:'Synthetic fixture reviewer',reference:'FIXTURE-NOT-APPROVAL',reviewed:true}}).document;
const after=chapterInsight(treated,6);assert.equal(after.progress.toFix,chapterInsight(p,6).progress.toFix-1);assert(!after.nextActions.some(a=>a.id===first.id));
assert(after.progress.treated>0);
pass('Chapter11-treated findings are not resurfaced as untreated header errors');

const event={id:'CH-FIXTURE',source:{chapter:1,id:'REQ-001',ref:'REQ-001'},items:[{id:'api',ref:'LR-001',chapter:4,key:'4:api',reviews:[]}]};
const journal=clone(fixture);journal.changes={...journal.changes,events:[event]};
const change=chapterInsight(journal,4,{selectedId:'api'});assert.equal(change.lead.kind,'changed');assert.equal(change.lead.scope,'selected');assert.equal(change.lead.target.objectId,'api');
const deleted=clone(journal);deleted.changes.events[0].items[0].id='removed-record';
const missing=chapterInsight(deleted,4);assert.equal(missing.lead.kind,'changed');assert.equal(missing.lead.target.objectId,null);assert.equal(missing.lead.target.tab,'validate');assert(!missing.lead.target.url.includes('removed-record'));
assert.notEqual(chapterInsight(journal,7).lead.id,change.lead.id,'A different chapter does not borrow an unrelated change as its lead');
pass('Current change reviews outrank ordinary gaps and target the exact surviving record; deleted targets fall back honestly to Validate');

const modules=clone(fixture), reqs=modules.artefacts.filter(a=>a.type==='requirement').map(a=>a.id);
modules.requirementGroups={version:1,counter:2,records:[{id:'RG-001',kind:'module',role:'business',title:'Synthetic module A',memberIds:[reqs[0]],rule:[],state:'proposed'},{id:'RG-002',kind:'module',role:'business',title:'Synthetic module B',memberIds:reqs.slice(1),rule:[],state:'proposed'}]};
const scoped=settleDocument(modules), lens=scopeLens(scoped,'RG-001');assert(lens);assert(!lens.shows.has(reqs[1]));
const insight=chapterInsight(scoped,1,{scopeId:'RG-001',selectedId:reqs[1]}), C=scopedChecks(scoped,1,lens);
assert.equal(insight.scope.id,lens.id);assert.equal(insight.progress.findingsScope,'module');assert.deepEqual([insight.progress.toFix,insight.progress.toConfirm],[C.toFix,C.toConfirm]);
assert.equal(insight.progress.total,chapterChecks(scoped,1).milestones.total,'Milestones explicitly stay chapter-wide');
assert(!insight.nextActions.some(a=>a.target.objectId===reqs[1]));
for(const a of insight.nextActions)if(a.target.objectId)assert(lens.shows.has(a.target.objectId));
for(const a of insight.openDecisions.items)assert.equal(query(a.target).get('scope'),'','Project decision queue clears active module scope');
for(const c of insight.projectProgress.chapters)assert.equal(query(c.target).get('scope'),'');
assert.equal(chapterInsight(scoped,11,{scopeId:'RG-001'}).progress.findingsScope,'chapter','Focused module context never becomes whole-SDD approval');
pass('Module-scoped findings exclude foreign records while whole-project decision/progress links clear scope explicitly');

let ready=fixture;for(const id of ['ADR-001','ADR-002','ADR-003']){ready=cmd(prepare(ready,id),'accept',{id,acknowledge:true});const d=get(ready,id);ready=cmd(ready,'apply-impact',{id,alternativeId:d.selectedAlternativeId,revision:d.revision});}ready=cmd(cmd(cmd(ready,'intake'),'review'),'handoff',{acknowledge:true});
const positive=chapterInsight(ready,3);assert.equal(positive.progress.done,positive.progress.total);assert.equal(positive.lead.kind,'positive');assert.match(positive.lead.title,/milestones met/);assert.match(positive.lead.why,/not external approval/);assert(positive.progress.toConfirm>0,'Positive progress retains genuine confirmation items');
pass('Genuine completed milestone sets get a positive insight while remaining confirmations and approval boundaries stay explicit');

const large=clone(fixture), req=large.artefacts.find(a=>a.type==='requirement');
for(let i=0;i<500;i++)large.artefacts.push({...clone(req),id:'REQ-HEADER-'+i,title:'Synthetic requirement '+i});
settleDocument(large);const at=performance.now(), initial=chapterInsight(large,1), coldMs=performance.now()-at;
const warm=performance.now();for(let i=0;i<40;i++){const x=chapterInsight(large,i%11+1);assert(x.nextActions.length<=3);assert.equal(x.projectProgress.total,initial.projectProgress.total);}const warmMs=performance.now()-warm;
assert(warmMs<Math.max(2000,coldMs*5),'Repeated header reads must reuse the settled-document domain projection');
assert.equal(calls,0);globalThis.fetch=realFetch;
pass('A 500-record expansion keeps bounded projections and reuses the settled-document cache');
console.log(JSON.stringify({passed:checks.length,checks,performance:{coldMs:Math.round(coldMs),fortyCachedReadsMs:Math.round(warmMs)},authority:'Synthetic domain verification; no human approval or provider execution.'},null,2));
