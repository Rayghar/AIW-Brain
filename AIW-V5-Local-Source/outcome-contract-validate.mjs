// Authored positive/contrary scenarios; no live provider or runtime experiment.
import assert from 'node:assert/strict';
import {outcomeContractFixture,OUTCOME_FIXTURE_AT as at} from './outcome-contract-fixtures.mjs';
import {executionCompositionFixture} from './execution-composition-fixtures.mjs';
import {assessContractExecution,contractExecutionContext,executionMethodSource,executionMethodCurrent,normaliseContractExecution} from './public/architecture-applicability.js';
import {applyInterfacesCommand,contractReviewCurrent,interfaceSourceChanged,exportInterfacesMarkdown,withInterfaces} from './public/interfaces-domain.js';
import {applyRuntimeCommand} from './public/runtime-domain.js';
import {applyRecordLifecycleCommand as applyLifecycleCommand,referencesTo} from './public/record-lifecycle.js';
import {applyKnowledgeCommand,knowledgeImpactStamp} from './public/knowledge-governance.js';
import {previewInterfaceChange,rebaseInterfaceChange} from './public/interface-impact.js';

const fixture=outcomeContractFixture(),{ids}=fixture,p=fixture.document;
const contract=(p,id=ids.contractId)=>p.interfaces.contracts.find(c=>c.id===id);
const run=(p,payload)=>applyInterfacesCommand(p,{type:'interfaces.contract',payload},at).document;
const edit=(p,patch)=>run(p,{id:ids.contractId,execution:{...contract(p).execution,...patch}});
const read=p=>assessContractExecution(contract(p),contractExecutionContext(p,contract(p)));
const before=JSON.stringify(p),r=read(p);
assert.equal(r.state,'context-match');assert.equal(r.scope.outcomeContractId,ids.outcomeContractId);assert.equal(r.scope.outcomePathId,ids.outcomePathId);
assert(r.obligations.some(o=>o.id.endsWith(':linked-outcome')&&o.targetIds.includes(ids.outcomeContractId)&&o.targetIds.includes(ids.authority)&&o.verification==='pending'));
assert(r.placement.some(x=>x.role==='outcome-authority'&&x.componentId===ids.authority));
assert.equal(contract(p).correlationKey,'operation_id');assert.equal(contract(p,ids.outcomeContractId).correlationKey,'result_operation_id');
for(const domain of ['payment','fulfilment'])for(const kind of ['request','event']){const f=outcomeContractFixture({domain,kind}),c=f.document.interfaces.contracts.find(c=>c.id===f.ids.contractId);assert.equal(assessContractExecution(c,contractExecutionContext(f.document,c)).state,'context-match',domain+' '+kind);assert(!f.document.interfaces.contracts.find(c=>c.id===f.ids.outcomeContractId).execution,'The result contract need not rediscover its own result');}
assert.deepEqual(contract(withInterfaces(JSON.parse(JSON.stringify(p)))).execution,contract(p).execution);
assert(exportInterfacesMarkdown(p).includes('Separate result contract: '+ids.outcomeContractId));
assert.equal(executionMethodSource(p).receipt.version,6);assert(!executionMethodCurrent(p,{...executionMethodSource(p),receipt:{...executionMethodSource(p).receipt,version:3}}));
assert(JSON.parse(executionMethodSource(p).excerpt).outcomeScope.includes('One submission'));
console.log('PASS native status and event contracts in payment and fulfilment retain explicit meaning, correlation, placement, export and pending verification');

for(const key of ['outcomeContractId','outcomeAuthorityId','outcomeCorrelation','outcomeMeaning','outcomeResultKey','discovery'])assert.equal(read(edit(p,{[key]:undefined})).state,'needs-context',key);
const event=outcomeContractFixture({kind:'event'});assert.equal(read(edit(event.document,{discovery:undefined})).state,'needs-context','An unstated event discovery mode must not be interpreted as status-query direction');
assert.equal(read(run(p,{id:ids.outcomeContractId,contractVersion:''})).state,'needs-context');
for(const mutate of [q=>q.runtime.paths=q.runtime.paths.filter(x=>x.id!==ids.outcomePathId),q=>q.runtime.paths.find(x=>x.id===ids.outcomePathId).state='proposed',q=>q.interfaces.contracts.find(x=>x.id===ids.outcomeContractId).state='proposed',q=>q.interfaces.contracts=q.interfaces.contracts.filter(c=>c.id!==ids.outcomeContractId),q=>q.interfaces.data=q.interfaces.data.filter(d=>d.id!==ids.resultDataId),q=>q.realisation.components=q.realisation.components.filter(c=>c.id!==ids.authority)]){const q=structuredClone(p);mutate(q);assert.equal(read(q).state,'needs-context');}
const missingPath=structuredClone(p);missingPath.runtime.paths.find(x=>x.id===ids.outcomePathId).environmentId='another-environment';assert.equal(read(missingPath).state,'needs-context');
const legacy=executionCompositionFixture(),lc=legacy.document.interfaces.contracts.find(c=>c.id===legacy.ids.contractId);assert.equal(assessContractExecution(lc,contractExecutionContext(legacy.document,lc)).state,'context-match');
assert(!assessContractExecution(lc,contractExecutionContext(legacy.document,lc)).scope.outcomeContractId);
console.log('PASS missing, proposed, dangling and wrong-environment context stays unknown; legacy same-provider completion remains unchanged');

for(const [patch,id] of [[{outcomeCorrelation:'unrelated'},'outcome-correlation'],[{outcomeMeaning:'acceptance'},'outcome-meaning'],[{discovery:'manual-reconciliation'},'outcome-channel'],[{completion:'acceptance'},'outcome-completion'],[{outcomeResultKey:'absent_state'},'outcome-state-key']])assert(read(edit(p,patch)).blockers.some(c=>c.id===id),id);
for(const [patch,id] of [[{kind:'batch'},'outcome-kind'],[{from:ids.consumer},'outcome-caller'],[{to:ids.consumer},'outcome-authority'],[{correlationKey:'absent_identity'},'outcome-request-key'],[{execution:{completion:'acceptance'}},'outcome-contract-meaning']]){
 const result=read(run(p,{id:ids.outcomeContractId,...patch}));assert.equal(result.state,'excluded');const check=result.blockers.find(c=>c.id===id);assert(check,id);assert.equal(check.target.objectId,ids.outcomeContractId);
}
const wrongOwner=applyInterfacesCommand(p,{type:'interfaces.data',payload:{id:ids.resultDataId,authorityId:ids.producer}},at).document;assert(read(wrongOwner).blockers.some(c=>c.id==='outcome-data-authority'&&c.target.objectId===ids.resultDataId));
const identityField=p.interfaces.data.find(d=>d.id===ids.resultDataId).fields.find(f=>f.name==='result_operation_id');
const wrongType=applyInterfacesCommand(p,{type:'interfaces.field',payload:{id:ids.resultDataId,field:{id:identityField.id,type:'integer'}}},at).document;assert(read(wrongType).blockers.some(c=>c.id==='outcome-key-types'&&c.target.objectId===ids.resultDataId));
const queryField=p.interfaces.data.find(d=>d.id===ids.queryDataId).fields[0],wrongQueryType=applyInterfacesCommand(p,{type:'interfaces.field',payload:{id:ids.queryDataId,field:{id:queryField.id,type:'integer'}}},at).document;
assert(read(wrongQueryType).blockers.some(c=>c.id==='outcome-key-types'&&c.target.objectId===ids.queryDataId),'The remedy identifies the mismatched query dictionary, not the compatible result dictionary');
const elsewhere=applyRuntimeCommand(p,{type:'runtime.environment',payload:{title:'Separate result environment',stage:'Development design',assetIds:[ids.producer,ids.authority]}},at),wrongDeclaration=run(elsewhere.document,{id:ids.outcomeContractId,execution:{environmentId:elsewhere.selected}});
assert(read(wrongDeclaration).blockers.some(c=>c.id==='outcome-contract-environment'&&c.target.objectId===ids.outcomeContractId));
const multi=run(p,{title:'Another result endpoint',from:ids.producer,to:ids.authority,kind:'request',contractVersion:'v1'}),third=multi.interfaces.contracts.at(-1).id;
assert(read(run(multi,{id:ids.outcomeContractId,execution:{outcomeContractId:third}})).blockers.some(c=>c.id==='outcome-terminal'));
console.log('PASS acceptance-only results, wrong direction/kind/authority, unrelated identity, schema conflict and unsupported further links produce scoped native targets');

assert.throws(()=>edit(p,{outcomeContractId:ids.contractId}),/separate result contract/);
assert.throws(()=>edit(p,{outcomeContractId:'missing-contract'}),/separate result contract/);
assert.throws(()=>run(p,{id:ids.outcomeContractId,execution:{outcomeContractId:ids.contractId}}),/circular contract link/);
for(const key of ['invalid field','state.value','<state>'])assert.throws(()=>normaliseContractExecution({outcomeResultKey:key}),/exact dictionary field/);
assert.equal(normaliseContractExecution({outcomeResultKey:'business_state'}).outcomeResultKey,'business_state');
assert(referencesTo(p,ids.outcomeContractId).some(x=>x.includes(contract(p).ref)));
assert.throws(()=>applyLifecycleCommand(p,{type:'record.retire',payload:{id:ids.outcomeContractId,chapter:8,reason:'Exercise referenced retirement'}},at,'synthetic-reviewer'),/still named/);
assert.throws(()=>applyLifecycleCommand(p,{type:'record.retire',payload:{id:ids.authority,chapter:5,reason:'Exercise authority retirement'}},at,'synthetic-reviewer'),/still named/);
console.log('PASS canonical saves reject dangling, self and circular links; exact field names and existing lifecycle reference guards remain authoritative');

const reviewed=applyInterfacesCommand(p,{type:'interfaces.record-review',payload:{id:ids.contractId,reviewed:true,reviewer:'Synthetic reviewer',evidence:'Authored contract consistency exercise; no runtime evidence.'}},at).document;
assert(contractReviewCurrent(reviewed,contract(reviewed)));const originalReview=JSON.stringify(contract(reviewed).review);
const changed=run(reviewed,{id:ids.outcomeContractId,contractVersion:'result-v2'});assert(!contractReviewCurrent(changed,contract(changed)));assert(interfaceSourceChanged(changed,contract(changed)));assert.equal(JSON.stringify(contract(changed).review),originalReview);
const changedPayload=applyInterfacesCommand(reviewed,{type:'interfaces.field',payload:{id:ids.resultDataId,field:{id:identityField.id,description:'Changed identity meaning requiring renewed review.'}}},at).document;assert(!contractReviewCurrent(changedPayload,contract(changedPayload)));
const changedPath=applyRuntimeCommand(reviewed,{type:'runtime.path',payload:{id:ids.outcomePathId,route:'Revised result route.'}},at).document;assert(!contractReviewCurrent(changedPath,contract(changedPath)));
const withdrawal=applyKnowledgeCommand(p,{type:'knowledge.withdraw',payload:{id:'MS-ASYNC-OUTCOME',stamp:knowledgeImpactStamp(p,'MS-ASYNC-OUTCOME'),reviewed:true,reviewer:'Synthetic reviewer',reason:'Exercise scoped source withdrawal.'}},at,'synthetic-reviewer').document;assert(!executionMethodSource(withdrawal));assert.deepEqual(contract(withdrawal).execution,contract(p).execution);
const q=previewInterfaceChange(p,{type:'interfaces.contract',payload:{id:ids.contractId,execution:{...contract(p).execution,outcomeMeaning:'acceptance'}}});assert(q.fields.some(f=>f.key==='execution'));
assert(rebaseInterfaceChange(edit(p,{outcomeCorrelation:'unrelated'}),q).conflicts.length);assert.equal(JSON.stringify(p),before);
console.log('PASS linked contract/payload/path changes reopen native review, source withdrawal preserves declarations, and impact guards concurrent execution edits');
