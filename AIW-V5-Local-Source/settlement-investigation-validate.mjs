import assert from 'node:assert/strict';
import {createProject} from './public/projects-domain.js';
import {architectureModel,chapterArchitectureView,CHAPTER_STAGES} from './public/architecture-model.js';
import {settlementInvestigation,settlementPolicyCommand,relationshipReading} from './public/settlement-investigation.js';
import {previewInterfaceChange,applyInterfaceImpact} from './public/interface-impact.js';
import {assembleSDD} from './public/review-domain.js';

const bank=createProject({name:'Bank Payment Journey',template:'bank-payment'},'investigation-check');
const graph=architectureModel(bank),caseFile=settlementInvestigation(bank,graph);
assert.ok(caseFile?.illustrative);
const legacy=structuredClone(bank);delete legacy.workspace.template;
assert.ok(settlementInvestigation(legacy,architectureModel(legacy)),'Older saved payment projects retain the case journey');
assert.deepEqual(caseFile.stages.map(s=>s.chapter),[4,5,6,7,8,9,10,11]);
for(const stage of caseFile.stages){
 assert.ok(stage.object,`Chapter ${stage.chapter} must retain a real object identity`);
 const view=chapterArchitectureView(graph,{chapter:stage.chapter,scopeId:stage.chapter<=7?'GRP-003':graph.root,selectedId:stage.id,anchorId:'worker',concern:CHAPTER_STAGES[stage.chapter].concern,mode:'guided',investigationId:'bank-settlement-uncertainty'});
 assert.ok(view.objects.some(o=>o.id===stage.id),`Chapter ${stage.chapter} must show the followed subject`);
 if(stage.chapter===11)assert.deepEqual(new Set(view.objects.map(o=>o.id)),new Set(['REQ-004','QD-004','ADR-003','hub']));
}
const relation=relationshipReading(bank,graph,graph.relationships.find(e=>e.id==='contract:network'));
assert.ok(relation.illustrative);
assert.deepEqual(relation.linked.map(o=>o.id),['REQ-004','QD-004','ADR-003']);
assert.ok(relation.checks.some(s=>/retry and repeat/.test(s)));
const oneHop=chapterArchitectureView(graph,{scopeId:graph.root,selectedId:'gateway',neighbourId:'gateway',mode:'explore',concern:'realization'});
assert.ok(oneHop.objects.some(o=>o.id==='worker'));
assert.ok(oneHop.objects.length<oneHop.totalObjects);

const command=settlementPolicyCommand(caseFile),preview=previewInterfaceChange(bank,command);
assert.equal(bank.interfaces.contracts.find(c=>c.id==='network').timeoutPolicy,'');
assert.deepEqual(preview.fields.map(f=>f.key),['timeoutPolicy','retryPolicy','failurePolicy','assumptions']);
assert.ok([1,2,3,4,5,8,9,10].every(ch=>preview.items.some(i=>i.chapter===ch)));
const accepted=applyInterfaceImpact(bank,{type:'interfaces.apply-impact',payload:{command,previewStamp:preview.stamp,reviewed:true}}).document;
assert.ok(assembleSDD(accepted).includes(command.payload.timeoutPolicy));
assert.ok(!assembleSDD(bank).includes(command.payload.timeoutPolicy));
assert.equal(settlementInvestigation(accepted,architectureModel(accepted)).decision?.status,'draft');
assert.equal(settlementInvestigation(createProject({name:'Blank',template:'blank'},'other-project'),architectureModel(createProject({name:'Blank',template:'blank'},'other-project'))),null);
console.log('Settlement investigation: connected chapters, scoped neighbours, sourced relationship and reviewable SDD change verified.');
