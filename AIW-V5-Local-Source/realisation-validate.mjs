import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {applyLogicalCommand,logicalGraph,logicalProposal,mappingCurrent,physicalObjects} from './public/logical-domain.js';
import {withRealisation,components,component,allocations,componentSources,componentSourceChanged,realisationIntakeCurrent,realisationFindings,realisationMilestones,realisationProposal,applyRealisationCommand,realisationReviewCurrent,realisationHandoffCurrent,realisationScenarioCurrent,exportRealisationMarkdown} from './public/realisation-domain.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
const cmd=(p,type,payload={})=>applyRealisationCommand(p,{type:'realisation.'+type,payload}).document;
const legacy=seedProject(),base=withRealisation(legacy);
assert.equal(legacy.realisation,undefined);assert.deepEqual(base.artefacts,legacy.artefacts);
assert.deepEqual(components(base).map(c=>[c.id,c.ref]),[['api-pod','APP-001'],['risk-engine','APP-002'],['core-adapter','APP-003'],['worker','APP-004'],['notify-worker','APP-005']]);
assert.equal(new Set(logicalGraph(base).nodes.map(n=>n.id)).size,30);
const payload={title:'Pending-case coordinator',kind:'worker',purpose:'Coordinate pending-case enquiries',boundary:'Own case assignment and enquiry evidence, without repeating financial instructions',owner:'Payments operations',inputs:'Pending instruction and original reference',outputs:'Verified outcome or accountable escalation',rationale:'A separate work boundary makes pending cases visible and assignable.',source:'Illustrative review of recovery responsibilities',technologyNeeds:'Durable case dispatch and enquiry connectivity',assumptions:'Confirm investigation targets',status:'candidate',dataIds:[],decisionIds:['ADR-003'],allocations:[{logicalId:'hub',scope:'Own assignment and enquiry evidence for pending cases'}]};
let p=cmd(base,'intake');assert(realisationIntakeCurrent(p));
p=cmd(p,'component',payload);let c=components(p).at(-1),id=c.id;assert.equal(c.ref,'APP-006');assert(realisationIntakeCurrent(p),'Component edits must not force re-entry of the inherited intake');
assert.equal(allocations(p,id)[0].id,'MAP-006');assert(mappingCurrent(p,allocations(p,id)[0]));
assert(componentSources(p,id).requirements.some(q=>q.id==='REQ-004'));assert(componentSources(p,id).decisions.some(d=>d.id==='ADR-003'));
assert(realisationFindings(p).some(f=>f.code==='isolated'&&f.objectId===id));
// Round 11: what a component consumes and produces names data definitions; an unknown one is refused, a known one is kept and printed.
assert.throws(()=>cmd(p,'component',{...payload,id,consumesDataIds:['nothing-here']}),/existing data definitions/);
assert.throws(()=>cmd(p,'component',{...payload,id,producesDataIds:['dat-999']}),/existing data definitions/);
{const linked=cmd(p,'component',{...payload,id,consumesDataIds:['instruction'],producesDataIds:['settlement','instruction']}),c2=component(linked,id);assert.deepEqual([c2.consumesDataIds,c2.producesDataIds],[['instruction'],['settlement','instruction']]);assert.deepEqual([c2.dataIds],[[]],'owning is a separate list');
 const md=exportRealisationMarkdown(linked);assert(md.includes('Consumes data: Payment instruction')&&md.includes('Produces data: Settlement'),'the register prints what it consumes and produces');assert(!exportRealisationMarkdown(p).includes('Consumes data:'),'and nothing when nothing is linked');
 const broken=structuredClone(linked);broken.realisation.components.find(c=>c.id===id).producesDataIds=['gone'];assert(realisationFindings(broken).some(f=>f.code==='broken-data-flow'&&f.objectId===id),'a missing definition is a content gap');assert(!realisationFindings(linked).some(f=>f.code==='broken-data-flow'));
 assert(components(p).every(c=>Array.isArray(c.consumesDataIds)&&Array.isArray(c.producesDataIds)),'seeded components carry the two lists, empty');
 console.log('PASS a component names the data definitions it consumes and produces (round 11): an unknown one is refused, the lists are kept apart from what it owns, the register prints them, and a missing one is a content gap');}
p=cmd(p,'interaction',{from:'worker',to:id,label:'dispatch pending enquiry',interaction:'event',condition:'Only an uncertain outcome',failure:'Keep pending and escalate before any replay'});const interaction=p.realisation.connections.at(-1);
assert(!realisationFindings(p).some(f=>f.code==='isolated'&&f.objectId===id));
p=cmd(p,'interaction',{...interaction,label:'assign a pending case'});assert.equal(p.realisation.connections.at(-1).id,interaction.id);
assert.throws(()=>cmd(p,'interaction',{...interaction,id:null,to:'worker'}),/different/);
assert.throws(()=>cmd(p,'interaction',{...interaction,id:null,to:'hub'}),/allocations/);
assert.throws(()=>cmd(p,'interaction',{...interaction,id:null,to:'missing'}),/existing/);
assert.throws(()=>cmd(p,'component',{...payload,title:'',status:'reviewed'}),/Name/);
assert.throws(()=>cmd(p,'component',{...payload,dataIds:['missing']}),/data records/);
assert.throws(()=>cmd(p,'component',{...payload,decisionIds:['missing']}),/decisions/);
assert.throws(()=>cmd(p,'component',{...payload,allocations:[] ,status:'reviewed'}),/before marking/);
p=cmd(p,'component',{...payload,id,title:'Revised pending-case coordinator',status:'reviewed'});c=component(p,id);assert.equal(c.ref,'APP-006');assert.equal(c.revision,2);assert.equal(c.history[0].title,payload.title);
assert.equal(allocations(p,id)[0].id,'MAP-006');assert.equal(physicalObjects(p).find(n=>n.id===id).title,c.title);assert.equal(logicalGraph(p).nodes.find(n=>n.id===id).ref,'APP-006');
const overlap=cmd(p,'component',{...payload,id,dataIds:['instruction'],allocations:[{logicalId:'hub',scope:allocations(p,'worker')[0].scope}]});
assert(realisationFindings(overlap).some(f=>f.code.startsWith('data-owner')&&f.objectId===id));assert(realisationFindings(overlap).some(f=>f.code==='overlap'));
const original=JSON.stringify(p);for(const key of ['review','dedup','recovery'])assert(realisationProposal(p,key));assert.equal(JSON.stringify(p),original);
assert.throws(()=>cmd(p,'candidate',{...realisationProposal(p,'dedup')}),/Review/);
for(const key of ['review','dedup','recovery']){const q=realisationProposal(p,key);p=cmd(p,'candidate',{...q,reviewed:true});assert(realisationProposal(p,key).existingId);assert.throws(()=>cmd(p,'candidate',{...q,reviewed:true}),/already/);}
// Round 11 (the library): the same reviewed path takes a proposal from the library or a catalogue archetype; it must say
// where it comes from, and it saves a candidate with that origin and no interaction (component-library-validate.mjs has the rest).
assert.throws(()=>cmd(p,'candidate',{title:'From nowhere',kind:'service',key:'library',reviewed:true,allocations:[]}),/where the proposal comes from/);
{const {archetypeProposal,archetypeRecord}=await import('./public/component-snapshot.js');const {catalogue}=await import('./public/catalogue-store.js');const q=archetypeProposal(archetypeRecord(catalogue(),'ARCH-CACHE-CAPABILITY')),before=p.realisation.connections.length,z=cmd(p,'candidate',{...q,reviewed:true}),c=components(z).at(-1);assert.deepEqual([c.origin,c.status,c.library.archetypeId,c.patternKey],['archetype','candidate','ARCH-CACHE-CAPABILITY',null]);assert.equal(z.realisation.connections.length,before);assert.throws(()=>cmd(p,'candidate',{...q}),/Review/);}
const dedup=components(p).find(c=>c.patternKey==='dedup');assert.equal(dedup.kind,'store');assert(dedup.dataIds.some(id=>logicalGraph(p).nodes.some(n=>n.id===id&&n.title==='Idempotency result')));
p=cmd(p,'component',{...dedup,title:'Authoritative duplicate result store',allocations:allocations(p,dedup.id)});assert.equal(realisationProposal(p,'dedup').existingId,dedup.id);assert(component(p,dedup.id).boundary.includes('atomic'));
const ownershipRemoved=cmd(p,'component',{...component(p,dedup.id),allocations:allocations(p,dedup.id),dataIds:[]});assert(!logicalGraph(ownershipRemoved).edges.some(e=>e.from===dedup.id&&e.label==='owns'),'Ownership changes must remove the derived relationship');assert(logicalProposal(p,'dedup').existingId);assert(logicalProposal(p,'recovery').existingId);
const current=component(p,id);const changed=applyLogicalCommand(p,{type:'logical.responsibility',payload:{...p.logical.responsibilities.find(r=>r.id==='hub'),purpose:'Revised settlement responsibility'}}).document;
assert(componentSourceChanged(changed,component(changed,id)));assert(!realisationIntakeCurrent(changed));assert(realisationFindings(changed).some(f=>f.code==='mapping'));
assert.throws(()=>cmd(p,'scenario',{scenario:'success',visited:[0,4]}),/every/);
assert.throws(()=>cmd(p,'scenario',{scenario:'hold',visited:[0,1,2]}),/every/);
for(const [scenario,visited] of [['success',[0,1,2,3,4]],['hold',[0,1]],['timeout',[0,1,2,3]]])p=cmd(p,'scenario',{scenario,visited});
p=cmd(p,'review');assert(realisationReviewCurrent(p));assert.throws(()=>cmd(p,'handoff'),/Acknowledge/);p=cmd(p,'handoff',{acknowledge:true});assert(realisationHandoffCurrent(p));assert(p.realisation.handoff.componentRefs.includes('APP-006'));assert(realisationHandoffCurrent(cmd(p,'review')));
const revised=cmd(p,'component',{...component(p,id),allocations:allocations(p,id),inputs:'Updated pending input'});
assert(!realisationReviewCurrent(revised));assert(!realisationHandoffCurrent(revised));assert(!realisationScenarioCurrent(revised,'success'));
let ready=cmd(base,'intake');for(const [scenario,visited] of [['success',[0,1,2,3,4]],['hold',[0,1]],['timeout',[0,1,2,3]]])ready=cmd(ready,'scenario',{scenario,visited});ready=cmd(cmd(ready,'review'),'handoff',{acknowledge:true});assert(realisationMilestones(ready).every(m=>m.done),'Milestones must be attainable while reference assumptions remain openly labelled');
const md=exportRealisationMarkdown(p);for(const term of ['APP-006','MAP-006','REQ-004','ADR-003','Technology needs','Chapter 6 intake','Simulation reviews'])assert(md.includes(term));
const removed=cmd(p,'remove-interaction',{id:interaction.id});assert(realisationFindings(removed).some(f=>f.code==='isolated'&&f.objectId===id));
const DB=localDatabase(':memory:'),env={DB,ASSETS:{fetch:()=>new Response('asset')}};
const api=(path,method='GET',body=null,owner='architect-a',origin='https://aiw.test')=>{const headers=new Headers();if(owner)headers.set('oai-authenticated-user-id',owner);if(body){headers.set('Content-Type','application/json');headers.set('Origin',origin)}return worker.fetch(new Request('https://aiw.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),env)};
try{
 assert.equal((await api('/api/project','GET',null,null)).status,401);
 let state=await(await api('/api/project')).json();const body={revision:state.revision,command:{type:'realisation.component',payload}};
 assert.equal((await api('/api/commands','POST',body,'architect-a','https://other.test')).status,403);
 const saved=await api('/api/commands','POST',body);assert.equal(saved.status,200);state=await saved.json();
 assert.equal((await api('/api/commands','POST',body)).status,409);
 const reopened=await(await api('/api/project')).json();assert.equal(components(reopened.document).at(-1).ref,'APP-006');assert.equal(components(reopened.document).at(-1).inputs,payload.inputs);assert.deepEqual(reopened.document.artefacts,base.artefacts);
 assert.equal(components((await(await api('/api/project','GET',null,'architect-b')).json()).document).length,5);
 // Round 11: one component's specification through the export route, as Markdown, HTML and JSON.
 {const md=await api('/api/export?chapter=5&document=spec&id=api-pod&format=md');assert.equal(md.status,200);assert(md.headers.get('Content-Disposition').includes('Component_Specification_APP-001.md'));assert((await md.text()).startsWith('# Component specification · APP-001'));
  const html=await api('/api/export?chapter=5&document=spec&id=api-pod&format=html&view=1');assert.equal(html.status,200);assert(/text\/html/.test(html.headers.get('Content-Type'))&&/^inline/.test(html.headers.get('Content-Disposition')));assert((await html.text()).includes('APP-001'));
  const json=await api('/api/export?chapter=5&document=spec&id=api-pod&format=json');assert.equal(json.status,200);const spec=await json.json();assert.equal(spec.document,'component-specification');assert.equal(spec.ref,'APP-001');
  assert.equal((await api('/api/export?chapter=5&document=spec&id=nobody&format=md')).status,404);}
 for(const format of ['json','md']){const res=await api('/api/export?chapter=5&format='+format);assert.equal(res.status,200);assert(res.headers.get('Content-Disposition').includes(format==='md'?'Application_Realisation.md':'.json'));if(format==='json'){const bundle=await res.json();assert(bundle.connectedModel.nodes.some(n=>n.ref==='APP-006'));assert(bundle.realisationValidation.findings.some(f=>f.code==='isolated'));}else assert((await res.text()).includes('APP-006'));}
 const mapCommand={revision:state.revision,command:{type:'logical.mapping',payload:{logicalId:'hub',newComponent:true,componentTitle:'Later Chapter 4 candidate',componentPurpose:'A later logical allocation',scope:'Additional recovery role',owner:'Operations',evidence:'Reference',status:'candidate'}}};
 const sync=await api('/api/commands','POST',mapCommand);assert.equal(sync.status,200);const synced=await sync.json();const later=components(synced.document).find(c=>c.title==='Later Chapter 4 candidate');assert(later);assert.equal(later.technologyNeeds,'');assert(realisationFindings(synced.document).some(f=>f.code==='technology'&&f.objectId===later.id));
 console.log('PASS Application realisation: stable component and allocation identities; ownership and interaction validation; editable ghosts with explicit acceptance; source/review/scenario/handoff invalidation; 1024 layered layouts; Chapter 4 compatibility; authenticated persistence, isolation, concurrency, and exports.');
}finally{DB.close()}


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
  const {applyRealisationCommand: applyR, REALISATION_LIMITS: RL} = await import('./public/realisation-domain.js');
  assert.deepEqual({...RL}, {components: 500, interactions: 2000, links: 500}, 'round 12: a component links at most 500 responsibilities, data records, decisions or groups, refusing past them');
  bound('application components', RL.components, p => p.realisation.components, (p, n) => ({...structuredClone(p.realisation.components[0]), id: 'app-b' + n, ref: 'APP-B' + n, title: 'Bound component ' + n}), applyR, () => ({type: 'realisation.component', payload: {title: 'One component more', kind: 'service', allocations: [], dataIds: [], decisionIds: []}}), /^Error: This workspace keeps up to 500 application components\.$/);
  bound('interactions', RL.interactions, p => p.realisation.connections, (p, n) => ({id: 'INT-B' + n, from: 'bound-a' + n, to: 'bound-b' + n, label: 'bound ' + n, interaction: 'data', kind: 'trace', condition: '', failure: '', origin: 'user'}), applyR, p => ({type: 'realisation.interaction', payload: {from: p.realisation.components[0].id, to: p.realisation.components[1].id, label: 'one interaction more', interaction: 'data'}}), /^Error: This workspace keeps up to 2,000 interactions\.$/);
  console.log('PASS application components are bounded at 500 and interactions at 2,000, each refusing the next with "This workspace keeps up to …"');
}

// ---------------------------------------------------------------- rc39 (W3 step 2, PLAN §4.3.2): the Design basis on the record card
// The card's first disclosure is the design basis, read from the design-questions projection: the drivers reaching the
// record, the questions as rows with their state, the drivers that opened them, their answers with chapter and state,
// the story once decided, the caution behind "?", and one action per open or draft question (Decide → Co-design for a
// method topic, Open → Chapter N for another chapter's record). Every count printed is the projection's; the other
// disclosures stay as they were.
{
  const {recordCardHTML} = await import('./public/record-card.js');
  const {designQuestions} = await import('./public/design-questions.js');
  const {withFinalReview} = await import('./public/review-domain.js');
  const {seedProject: seedForBasis} = await import('./public/requirements-domain.js');
  const {Window} = await import('happy-dom');
  const w = new Window({url: 'https://aiw.test/'}), make = html => { const t = w.document.createElement('template'); t.innerHTML = html; return t.content; };
  const ref = withFinalReview(seedForBasis());
  const card = (p, chapter, id) => make(recordCardHTML(p, chapter, id, '<div class="t-dock-body"><p>native</p></div>', {nodes: [], edges: []}));
  try {
    const dq = designQuestions(ref, 'api-pod'), c = card(ref, 5, 'api-pod');
    const sections = [...c.querySelectorAll('.record-card > details')].map(d => d.dataset.cardSection);
    assert.equal(sections[0], 'design-basis', 'the design basis is the first disclosure: ' + sections.join(', '));
    assert.deepEqual(sections.slice(1), ['findings', 'connections', 'history'].filter(k => sections.includes(k)), 'the other disclosures follow as they were');
    const basis = c.querySelector('[data-card-section="design-basis"]');
    assert.equal(basis.open, true, 'open by default: the record has an open question');
    assert.equal(basis.querySelector('summary').textContent, 'Design basis · ' + dq.counts.open + ' open · ' + dq.counts.draft + ' draft', 'the summary counts from the projection (nothing decided yet, so no decided count)');
    assert.equal(basis.querySelector('.design-basis-lead').textContent, dq.drivers.length + ' drivers reach this record.');
    assert.deepEqual([...basis.querySelectorAll('[data-design-driver]')].map(li => li.dataset.designDriver), dq.drivers.map(d => d.id), 'the drivers reaching it, in the projection\'s order');
    const qd3 = basis.querySelector('[data-design-driver="QD-003"]');
    assert.match(qd3.textContent, /^QD-003 · .*At most 2 seconds · \w+Target unconfirmed$/, 'ref, title, target, priority and the unconfirmed chip: ' + qd3.textContent);
    assert.match(qd3.querySelector('a').getAttribute('href'), /chapter=2&tab=work&object=QD-003/);
    assert.deepEqual([...basis.querySelectorAll('.design-q')].map(li => li.dataset.designQuestion + ':' + li.dataset.designState), dq.questions.map(q => q.id + ':' + q.state), 'one row per question with its state');
    const read = basis.querySelector('.design-q[data-design-question="read-path"]');
    assert.equal(read.querySelector('.chip.design-state').textContent, 'Open');
    assert.equal(read.querySelector('b').textContent, 'Read from the authority or keep a bounded read copy?');
    assert.match(read.textContent, /Opened by QD-003/);
    assert.equal(read.querySelector('.design-caution p').textContent, dq.questions.find(q => q.id === 'read-path').caution, 'the caution behind "?"');
    const decide = read.querySelector('button[data-action="design-decide"]');
    assert.ok(decide && decide.dataset.question === 'read-path' && decide.dataset.record === 'api-pod' && decide.dataset.topic === 'reads' && decide.textContent === 'Decide → Co-design', 'Decide names the question, the record and the method topic');
    const idem = basis.querySelector('.design-q[data-design-question="idempotency"]');
    const openLink = idem.querySelector('a[data-design-open]');
    assert.ok(openLink && openLink.textContent === 'Open → Chapter 8' && /chapter=8&tab=work&object=api-pod/.test(openLink.getAttribute('href')), 'a question another chapter\'s record decides routes to that chapter\'s Work with the record selected');
    assert.equal(idem.querySelector('[data-action="design-decide"]'), null, 'and has no Decide of its own');
    const pers = basis.querySelector('.design-q[data-design-question="persistence"]');
    assert.equal(pers.querySelector('.chip.design-state').textContent, 'Draft');
    assert.ok([...pers.querySelectorAll('.design-answers li')].some(li => /^TN-002 → Transactional persistence, Chapter 6 · draft$/.test(li.textContent)), 'an answer reads "ref → title, Chapter N · state": ' + [...pers.querySelectorAll('.design-answers li')].map(li => li.textContent).join(' | '));
    assert.equal(basis.querySelectorAll('.design-story').length, 0, 'no story while nothing is decided');
    // A decided question: the story, no action.
    const decided = structuredClone(ref); decided.coauthoring ||= {}; decided.coauthoring.designTasks = [{id: 'DES-007', kind: 'architecture', topic: 'reads', status: 'applied', optionId: 'cache-aside', requirementId: 'REQ-001', driverId: 'QD-003', basis: {contextIds: ['api-pod']}, answers: {}}];
    const d = card(decided, 5, 'api-pod').querySelector('.design-q[data-design-question="read-path"]');
    assert.equal(d.dataset.designState, 'decided'); assert.equal(d.querySelector('.chip.design-state').textContent, 'Decided');
    assert.equal(d.querySelector('.design-story').textContent, 'Reuse a bounded read copy for APP-001, because QD-003 (DES-007).');
    assert.equal(d.querySelector('[data-action="design-decide"], a[data-design-open]'), null, 'a decided question carries no action');
    // Closed by default when nothing is open; absent on a record no projection reads; never on another chapter's card.
    const quiet = structuredClone(ref); quiet.quality.drivers = [];
    const q = card(quiet, 5, 'api-pod').querySelector('[data-card-section="design-basis"]');
    assert.ok(q && !q.open && q.querySelector('summary').textContent === 'Design basis · no design question yet' && /No architectural driver reaches this record yet\./.test(q.textContent));
    assert.equal(card(ref, 4, 'api').querySelector('[data-card-section="design-basis"]'), null, 'Chapter 4 cards are unchanged');
    console.log('PASS rc39: the Chapter 5 record card opens on its Design basis (drivers with target, priority and the unconfirmed chip; the questions as rows with state, openers, answers, caution, Decide → Co-design or Open → Chapter N; the story once decided; closed when nothing is open), counted from the design-questions projection; the other disclosures are as they were');
  } finally { await w.happyDOM.close(); }
}

// ---------------------------------------------------------------- rc39 (W3 step 4, PLAN §4.3.3): the Validate rule
// "A driver asks a design question no decision answers": one finding per open question per record, to confirm, its
// object the record, its detail the question and the drivers, through the chapter's own findings function; it leaves
// when the question is decided. Every count is the projection's.
{
  const {designQuestions, projectQuestions, DESIGN_QUESTION_RULE} = await import('./public/design-questions.js');
  const {withFinalReview} = await import('./public/review-domain.js');
  const {seedProject: seedForRule} = await import('./public/requirements-domain.js');
  const ref = withFinalReview(seedForRule());
  const fs = realisationFindings(ref).filter(f => f.code === 'design-question');
  assert.equal(fs.length, projectQuestions(ref).byChapter[5].open, 'one finding per open question on Chapter 5: ' + fs.length);
  for (const f of fs) { const r = designQuestions(ref, f.objectId), q = r.questions.find(x => x.id === f.questionId); assert.ok(q && q.state === 'open' && f.level === 'warning' && f.title === DESIGN_QUESTION_RULE && f.id === 'design-question/' + q.id + ':' + r.id && f.detail.startsWith(q.title + ' · asked by ' + q.because.join(', ') + ' of ' + r.ref + '.') && f.driverIds.join() === q.because.join(), JSON.stringify(f)); }
  const read = fs.find(f => f.objectId === 'api-pod' && f.questionId === 'read-path');
  assert.equal(read.detail, 'Read from the authority or keep a bounded read copy? · asked by QD-003 of APP-001. Decide it on the record card (Design basis) or record the answer in Chapter 5.');
  assert.ok(!realisationFindings(ref).some(f => f.code === 'design-question' && f.level === 'error'), 'to confirm, never to fix');
  const decided = structuredClone(ref); decided.coauthoring ||= {}; decided.coauthoring.designTasks = [{id: 'DES-007', kind: 'architecture', topic: 'reads', status: 'applied', optionId: 'cache-aside', requirementId: 'REQ-001', driverId: 'QD-003', basis: {contextIds: ['api-pod']}, answers: {}}];
  assert.ok(!realisationFindings(decided).some(f => f.id === 'design-question/read-path:api-pod'), 'a decided question raises nothing');
  assert.equal(realisationFindings(decided).filter(f => f.code === 'design-question').length, fs.length - 1);
  const quiet = structuredClone(ref); quiet.quality.drivers = [];
  assert.equal(realisationFindings(quiet).filter(f => f.code === 'design-question').length, 0, 'no driver, no question, no finding');
  console.log('PASS rc39: Chapter 5 checks carry "A driver asks a design question no decision answers", one per open question per component, to confirm, with the question and its drivers in the detail, from the design-questions projection; a decided question raises nothing');
}
