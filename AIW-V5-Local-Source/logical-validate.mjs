import assert from 'node:assert/strict';
import {seedProject,applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyDecisionCommand} from './public/decisions-domain.js';
import {withLogical,applyLogicalCommand,logicalGraph,logicalFindings,logicalMilestones,logicalReviewCurrent,logicalHandoffCurrent,logicalSourceChanged,logicalProposal,mappingCurrent,scenarioCurrent,exportLogicalMarkdown} from './public/logical-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
const cmd=(p,type,payload={})=>applyLogicalCommand(p,{type:'logical.'+type,payload}).document;
const legacy=seedProject(),base=withLogical(legacy);
assert.equal(legacy.logical,undefined);assert.deepEqual(base.artefacts,legacy.artefacts);assert.equal(base.logical.responsibilities.length,5);assert.equal(logicalGraph(base).nodes.length,30);assert.equal(logicalGraph(base).edges.length,43);
assert.deepEqual(base.logical.responsibilities.map(r=>r.ref),['LR-001','LR-002','LR-003','LR-004','LR-005']);
const untouched=JSON.stringify(base);logicalProposal(base,'review','risk');assert.equal(JSON.stringify(base),untouched,'Ghost preview is non-mutating');
let p=cmd(base,'group',{title:'Operations investigation',purpose:'Accountability for pending and held instructions'});const group=p.logical.groups.at(-1).id;
p=cmd(p,'responsibility',{title:'Pending payment investigation',purpose:'Investigate ageing uncertain instructions',boundary:'Own enquiries and escalation; never authorise blind replay.',owner:'Payments operations',source:'Prototype reference review',groupId:group,requirementIds:['REQ-004'],decisionIds:['ADR-003'],confirmed:true});const r=p.logical.responsibilities.at(-1);assert.equal(r.ref,'LR-006');assert(logicalFindings(p).some(f=>f.code==='disconnected'&&f.objectId===r.id));assert(logicalFindings(p).some(f=>f.code==='unmapped'&&f.objectId===r.id));
p=cmd(p,'connection',{from:'hub',to:r.id,label:'assign pending investigation',kind:'flow',condition:'Outcome remains uncertain'});assert(!logicalFindings(p).some(f=>f.code==='disconnected'&&f.objectId===r.id));const connection=p.logical.connections.at(-1);
p=cmd(p,'connection',{...connection,label:'assign owned pending investigation'});assert.equal(p.logical.connections.at(-1).id,connection.id);
assert.throws(()=>cmd(p,'connection',{from:r.id,to:r.id,label:'Self'}),/two different/);assert.throws(()=>cmd(p,'connection',{from:r.id,to:'missing',label:'Broken'}),/existing/);assert.throws(()=>cmd(p,'connection',{from:r.id,to:'worker',label:'Implements'}),/implementation mappings/);assert.throws(()=>cmd(p,'responsibility',{title:'Wrong refs',requirementIds:['REQ-NONE'],decisionIds:[]}),/existing requirements/);
p=cmd(p,'mapping',{logicalId:r.id,newComponent:true,componentTitle:'Investigation worker',componentPurpose:'Tracks pending-case enquiries and escalation.',scope:'Own the investigation state',owner:'Payments operations',evidence:'Working architecture allocation',status:'reviewed'});const mapping=p.logical.mappings.at(-1),component=p.logical.assets.at(-1);assert(mappingCurrent(p,mapping));assert(logicalGraph(p).edges.some(e=>e.mappingId===mapping.id&&e.from===r.id&&e.to===component.id));
p=cmd(p,'responsibility',{...r,title:'Settlement investigation',boundary:'Retain the reference and record every enquiry before escalation.'});assert.equal(p.logical.responsibilities.at(-1).id,r.id);assert.equal(p.logical.responsibilities.at(-1).ref,'LR-006');assert(!mappingCurrent(p,p.logical.mappings.at(-1)));assert(logicalFindings(p).some(f=>f.code==='stale-mapping'&&f.mappingId===mapping.id));assert(p.logical.responsibilities.at(-1).history.length);
p=cmd(p,'mapping',{...mapping,scope:'Enquiries and escalation for retained settlement references',status:'reviewed'});assert(mappingCurrent(p,p.logical.mappings.at(-1)));
// New responsibilities are valid shared references in earlier studios.
const driver=p.quality.drivers.find(d=>d.id==='QD-004');let q=applyQualityCommand(p,{type:'quality.driver',payload:{...driver,responsibilityIds:[...driver.responsibilityIds,r.id]}}).document;assert(q.quality.drivers.find(d=>d.id==='QD-004').responsibilityIds.includes(r.id));
const decision=q.decisions.records.find(d=>d.id==='ADR-003'),alternative=decision.alternatives[0];q=applyDecisionCommand(q,{type:'decision.alternative',payload:{...alternative,id:decision.id,alternativeId:alternative.id,responsibilityIds:[...alternative.responsibilityIds,r.id],relationships:[...alternative.relationships,{from:'hub',to:r.id,label:'assign enquiry'}]}}).document;assert(q.decisions.records.find(d=>d.id===decision.id).alternatives[0].responsibilityIds.includes(r.id));
const updated=applyCommand(p,{type:'artefact',payload:{...p.artefacts.find(a=>a.id==='REQ-004'),description:'Changed settlement requirement'}}).document;assert(logicalSourceChanged(updated,updated.logical.responsibilities.find(x=>x.id===r.id)));assert(!logicalReviewCurrent(updated));
for(const key of ['review','dedup','recovery']){const prop=logicalProposal(p,key);p=cmd(p,'candidate',{...prop,source:prop.sourceEvidence});assert(logicalProposal(p,key).existingId);assert.throws(()=>cmd(p,'candidate',{...prop,source:prop.sourceEvidence}),/already/);}
const reviewCandidate=p.logical.responsibilities.find(r=>r.candidateKey==='review');p=cmd(p,'responsibility',{...reviewCandidate,title:'Reviewed held-payment responsibility'});assert.equal(logicalProposal(p,'review').existingId,reviewCandidate.id);assert.equal(p.logical.assets.find(a=>a.candidateKey==='dedup').attrs.Obligation,'Retain the original instruction reference and authoritative result.');assert(p.logical.responsibilities.some(r=>r.candidateKey==='review'));assert(p.logical.assets.some(a=>a.candidateKey==='dedup'&&a.layer==='data'));assert(p.logical.assets.some(a=>a.candidateKey==='recovery'&&a.layer==='physical'));
assert.throws(()=>cmd(p,'scenario',{scenario:'hold',visited:[0,1,2]}),/Trace each/);assert.throws(()=>cmd(p,'scenario',{scenario:'success',visited:[0,4]}),/Trace each/);
for(const [scenario,visited] of [['success',[0,1,2,3,4]],['hold',[0,1]],['timeout',[0,1,2,3]]])p=cmd(p,'scenario',{scenario,visited});assert(['success','hold','timeout'].every(id=>scenarioCurrent(p,id)));
p=cmd(cmd(p,'intake'),'review');assert(logicalReviewCurrent(p));assert.throws(()=>cmd(p,'handoff'),/Acknowledge/);p=cmd(p,'handoff',{acknowledge:true});assert(logicalHandoffCurrent(p));assert(p.logical.handoff.responsibilityIds.includes(r.id));assert(logicalHandoffCurrent(cmd(p,'review')),'Repeating checks on unchanged inputs preserves the valid handoff');
const edited=cmd(p,'responsibility',{...p.logical.responsibilities.find(x=>x.id===r.id),title:'Revised investigation boundary'});assert(!logicalHandoffCurrent(edited));assert(!logicalReviewCurrent(edited));assert(!scenarioCurrent(edited,'success'));
let complete=cmd(base,'intake');for(const [scenario,visited] of [['success',[0,1,2,3,4]],['hold',[0,1]],['timeout',[0,1,2,3]]])complete=cmd(complete,'scenario',{scenario,visited});complete=cmd(cmd(complete,'review'),'handoff',{acknowledge:true});assert(logicalMilestones(complete).every(m=>m.done),'Progress is attainable with openly retained reference-review findings');
const removed=cmd(base,'remove-connection',{id:base.logical.connections.find(e=>e.from==='initiate'&&e.to==='api').id});assert(logicalFindings(removed).some(f=>f.code==='process-gap'));const unmapped=cmd(base,'remove-mapping',{id:'MAP-001'});assert(logicalFindings(unmapped).some(f=>f.code==='unmapped'&&f.objectId==='api'));
const md=exportLogicalMarkdown(p);for(const token of ['LR-006','MAP-006','REQ-004','ADR-003','Simulation','Open findings'])assert(md.includes(token));
const DB=localDatabase(':memory:'),env={DB,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env)};
try{assert.equal((await api('/api/project','GET',null,null)).status,401);let state=await(await api('/api/project')).json();const payload={title:'Saved operations boundary',purpose:'Own enquiries',boundary:'Keep the reference',owner:'Operations',source:'Review',groupId:'GRP-003',requirementIds:['REQ-004'],decisionIds:['ADR-003']};const body={revision:state.revision,command:{type:'logical.responsibility',payload}};assert.equal((await api('/api/commands','POST',body,'architect-a','https://elsewhere.test')).status,403);const save=await api('/api/commands','POST',body);assert.equal(save.status,200);state=await save.json();assert.equal(state.selected,'lr-006');assert.equal((await api('/api/commands','POST',body)).status,409);const reopened=await(await api('/api/project')).json();assert.equal(reopened.document.logical.responsibilities.at(-1).title,payload.title);assert.equal(reopened.document.logical.responsibilities.at(-1).ref,'LR-006');assert.equal((await(await api('/api/project','GET',null,'architect-b')).json()).document.logical.responsibilities.length,5);for(const format of ['json','md']){const res=await api('/api/export?chapter=4&format='+format);assert.equal(res.status,200);assert(res.headers.get('Content-Disposition').includes(format==='md'?'Logical_Model.md':'.json'));if(format==='json'){const bundle=await res.json();assert(bundle.connectedModel.nodes.some(n=>n.id==='lr-006'));assert(bundle.logicalValidation.findings.some(f=>f.code==='disconnected'));}else assert((await res.text()).includes('LR-006'));}console.log('PASS Logical application: persistent stable responsibility/group/connection/mapping references; shared upstream links; ghost non-mutation and explicit acceptance; source/mapping/scenario/handoff invalidation; requirement coverage and disconnected-object findings; 1024 desktop/mobile grouped layer layouts; authenticated saving, reopening, isolation, concurrency, and exports.');}finally{DB.close()}

// ---------------------------------------------------------------- bounds (round 5, R5-G)
// A workspace keeps up to 500 records of a collection (2,000 relationships and fields): at the bound the next one is
// refused with the workspace's wording and nothing changes; one under it, the next is accepted and the bound is reached.
import * as boundsMemo from './public/document-memo.js';
import * as boundsReview from './public/review-domain.js';
import * as boundsSeed from './public/requirements-domain.js';
{
  const base = boundsReview.withFinalReview(boundsSeed.seedProject()), at = '2026-10-02T12:00:00.000Z';
  const filled = (limit, list, make) => { const p = boundsMemo.documentClone(base), xs = list(p); for (let n = 0; xs.length < limit; n++) xs.push(make(p, n)); return p; };
  const bound = (what, limit, list, make, apply, command, words) => {
    const full = filled(limit, list, make), before = JSON.stringify(full);
    assert.throws(() => apply(full, command(full), at), words, what + ': the ' + (limit + 1) + 'st is refused');
    assert.equal(JSON.stringify(full), before, what + ': a refused record changes nothing');
    const under = filled(limit - 1, list, make), after = apply(under, command(under), at).document;
    assert.equal(list(after).length, limit, what + ': the last one under the bound is accepted');
  };
  const {applyLogicalCommand: applyL, LOGICAL_LIMITS: LL} = await import('./public/logical-domain.js');
  assert.deepEqual({...LL}, {responsibilities: 500, connections: 2000, requirements: 5000, links: 500}, 'round 12: a responsibility links at most 5,000 requirements and 500 decisions or groups, refusing past them');
  bound('responsibilities', LL.responsibilities, p => p.logical.responsibilities, (p, n) => ({...structuredClone(p.logical.responsibilities[0]), id: 'lr-b' + n, ref: 'LR-B' + n, title: 'Bound responsibility ' + n}), applyL, () => ({type: 'logical.responsibility', payload: {title: 'One responsibility more', requirementIds: [], decisionIds: []}}), /^Error: This workspace keeps up to 500 responsibilities\.$/);
  bound('connections', LL.connections, p => p.logical.connections, (p, n) => ({id: 'REL-B' + n, from: 'bound-a' + n, to: 'bound-b' + n, label: 'bound ' + n, kind: 'flow', condition: '', origin: 'user'}), applyL, p => ({type: 'logical.connection', payload: {from: p.logical.responsibilities[0].id, to: p.logical.responsibilities[2].id, label: 'one connection more', kind: 'flow'}}), /^Error: This workspace keeps up to 2,000 connections\.$/);
  console.log('PASS responsibilities are bounded at 500 and connections at 2,000, each refusing the next with "This workspace keeps up to …"');
}

// Round 12 (GR-CMP-09): a journey step reaches a responsibility through a connection of kind "serves" or "realises",
// typed Serving or Realization in ArchiMate 3.1 with the responsibility as the source whichever end it is drawn from,
// and no relation-invalid finding is raised. A flow between them crosses layers: its finding suggests the two kinds.
{
  const {relationshipFindings, typedRecordedRelationships} = await import('./public/architecture-model.js');
  const {CONNECTION_KINDS} = await import('./public/logical-domain.js');
  assert.deepEqual(CONNECTION_KINDS.map(([k]) => k), ['trace', 'flow', 'serves', 'realises']);
  const step = logicalGraph(base).nodes.find(n => n.layer === 'process').id, r = base.logical.responsibilities[0].id;
  let q = base;
  q = cmd(q, 'connection', {from: step, to: r, label: 'is served by', kind: 'serves', condition: ''});
  q = cmd(q, 'connection', {from: r, to: step, label: 'realises', kind: 'realises', condition: ''});
  q = cmd(q, 'connection', {from: r, to: step, label: 'serves', kind: 'serves', condition: ''});
  const mine = q.logical.connections.slice(-3);
  assert.deepEqual(mine.map(e => e.kind), ['serves', 'realises', 'serves'], 'each kind is kept as chosen');
  const typed = typedRecordedRelationships(q, {chapter: 4}).filter(e => mine.some(m => m.id === e.id));
  assert.deepEqual(typed.map(e => [e.archimate.type, e.archimate.valid, e.archimate.source, e.archimate.target]), [['Serving', true, 'ApplicationComponent', 'BusinessProcess'], ['Realization', true, 'ApplicationComponent', 'BusinessProcess'], ['Serving', true, 'ApplicationComponent', 'BusinessProcess']], 'the responsibility serves or realises the step, whichever end it was drawn from');
  assert.deepEqual(relationshipFindings(q, {chapter: 4}), [], 'no relation-invalid finding');
  assert.ok(!logicalFindings(q).some(f => f.code === 'process-gap' && f.objectId === step), 'a step a responsibility serves has its responsibility');
  // A flow from the step to the responsibility crosses layers: the finding says which kinds say it.
  const flowed = cmd(base, 'connection', {from: step, to: r, label: 'hands to', kind: 'flow', condition: ''}), flow = flowed.logical.connections.at(-1);
  const invalid = relationshipFindings(flowed, {chapter: 4}).find(f => f.relationshipId === flow.id);
  assert.ok(invalid && invalid.code === 'RELATION-INVALID', 'a flow between a journey step and a responsibility is not allowed');
  assert.deepEqual(invalid.suggest, ['serves', 'realises']); assert.match(invalid.detail, /choose “serves” or “realises”/);
  const retyped = cmd(flowed, 'connection', {...flow, kind: 'serves'});
  assert.deepEqual(relationshipFindings(retyped, {chapter: 4}), [], 'retyped as serves, the finding clears');
  assert.match(exportLogicalMarkdown(retyped), /hands to · Serves the journey step/);
  console.log('PASS round 12: a journey step connects to a responsibility with kind serves or realises, typed Serving or Realization from the responsibility whichever end it is drawn from, with no relation-invalid finding; a flow between them is invalid and its finding suggests serves or realises');
}
