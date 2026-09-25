import assert from 'node:assert/strict';
import {createProject} from './public/projects-domain.js';
import {journeyIndex,journeyTargets,journeyObjectURL,journeyStatus} from './public/journey-context.js';
const p=createProject({name:'Journey validation',template:'bank-payment'},'journey-test');
const before=JSON.stringify(p),index=journeyIndex(p);
assert.equal(JSON.stringify(p),before,'Exploration must not mutate project records');
assert.deepEqual(journeyTargets(index,'ledger',5).map(t=>t.node.id),['core-adapter']);
assert.deepEqual(journeyTargets(index,'core-adapter',4).map(t=>t.node.id),['ledger']);
assert.equal(journeyTargets(index,'core-adapter',1)[0].node.id,'REQ-003');
assert.equal(journeyTargets(index,'postgres',7)[0].node.id,'tr-002');
assert.ok(journeyTargets(index,'ledger',9).some(t=>t.node.id==='audit'));
assert.ok(journeyTargets(index,'worker',10).some(t=>t.node.id==='run-004'));
assert.ok(journeyTargets(index,'ledger',1).every(t=>t.path.length>0));
assert.ok(journeyTargets(index,'REQ-003',3).some(t=>t.node.id==='ADR-002'));
for(const chapter of [1,2,3,4,5,6,7,8,9,10])for(const item of journeyTargets(index,'ledger',chapter)){
 assert.ok(item.path.every(e=>index.nodes.has(e.from)&&index.nodes.has(e.to)));
 assert.equal(item.node.chapter,chapter);
 const u=new URL(journeyObjectURL(item.node),'https://example.test');
 assert.equal(Number(u.searchParams.get('chapter')),chapter);
 assert.equal(u.searchParams.get(chapter===1?'artefact':chapter===2?'driver':chapter===3?'decision':'object'),item.node.id);
}
assert.equal(journeyStatus(index.nodes.get('REQ-003')),'Illustrative reference');
assert.equal(journeyStatus(index.nodes.get('ADR-002')),'draft decision');
assert.equal(journeyTargets(index,'unsaved-ghost',5).length,0);
const blank=createProject({name:'Blank service design',template:'blank'},'blank-test');
assert.equal(journeyIndex(blank).nodes.size,0,'Blank project has no bank context');
// Two unrelated responsibilities share compute. Forward-and-back topology must
// not imply that one fulfils the other responsibility's requirement.
const custom={nodes:new Map([
 ['qa',{id:'qa',chapter:1}],['qb',{id:'qb',chapter:1}],
 ['la',{id:'la',chapter:4}],['lb',{id:'lb',chapter:4}],
 ['aa',{id:'aa',chapter:5}],['ab',{id:'ab',chapter:5}],['compute',{id:'compute',chapter:6}],['realization',{id:'realization',chapter:7}]
]),edges:[['qa','la'],['qb','lb'],['la','aa'],['lb','ab'],['aa','compute'],['ab','compute'],['compute','realization']].map(([from,to])=>({from,to,label:'test link'}))};
assert.deepEqual(journeyTargets(custom,'aa',1).map(t=>t.node.id),['qa']);
assert.deepEqual(journeyTargets(custom,'qa',5).map(t=>t.node.id),['aa']);
assert.deepEqual(journeyTargets(custom,'qa',7).map(t=>t.node.id),['realization']);
assert.deepEqual(journeyTargets(custom,'compute',5).map(t=>t.node.id),['aa','ab'],'Shared technology exposes both consumers explicitly');
const changed=structuredClone(p);changed.logical.mappings=changed.logical.mappings.filter(m=>m.logicalId!=='ledger');
assert.deepEqual(journeyTargets(journeyIndex(changed),'ledger',5),[],'Removed allocation is not reconstructed from a reference example');
console.log('PASS Connected journey: saved trace paths, reverse navigation, unambiguous stable references, shared-capability isolation, removed-link handling, ghost exclusion, blank-project isolation, and non-mutating exploration.');
