// Cross-release interpretation changes must invalidate old reasoning without
// rewriting the publisher's evidence or an architect's adopted history.
import assert from 'node:assert/strict';
import {readyComposition,arc} from './composition-fixtures.mjs';
import {COMPOSITION_TOPICS,COMPOSITION_REFERENCES,compositionMethod,compositionSources} from './public/composition-knowledge.js';
import {COMPOSITION_METHOD_IDENTITIES,COMPOSITION_REFERENCE_IDS} from './public/composition-manifest.js';
import {ARCHITECTURE_EVALUATION_REVISION,architectureSources,interactionSourceReceipt,interactionReceiptCurrent,interactionGroundingCurrent,interactionContextCurrent,architectureGrounding} from './public/architecture-knowledge.js';
import {architectureSourceStamp} from './public/architecture-design.js';
import {changeFingerprint} from './public/changes-domain.js';
import {designBasisCurrent} from './public/design-task-state.js';
import {previewAlternative,applyAlternativeCommand} from './public/model-alternatives.js';
import {applyKnowledgeCommand,knowledgeImpactStamp,methodKnowledgeCurrent} from './public/knowledge-governance.js';

const at='2026-10-20T13:00:00.000Z',task=p=>p.coauthoring.designTasks.at(-1);
const priorReceipt=receipt=>{const old=structuredClone(receipt);delete old.sources.evaluationRevision;old.fingerprint=changeFingerprint(old.sources);return old;};
const concern={governedConcern:{id:'synthetic-concern',title:'Synthetic source-scoped decision',statement:'Compare explicit project criteria.',receipt:{claimId:'synthetic-claim',path:'synthetic/method.md',sourceHash:'a'.repeat(64),revision:'fixture-1',lineStart:1,lineEnd:1}}};
// Withdrawal governance shares stable identities with method definitions without
// eagerly loading the executable evaluator. Every registered identity is usable.
assert.deepEqual(Object.keys(COMPOSITION_METHOD_IDENTITIES),Object.keys(COMPOSITION_TOPICS));
assert.deepEqual(COMPOSITION_REFERENCE_IDS,Object.fromEntries(Object.entries(COMPOSITION_REFERENCES).map(([key,source])=>[key,source.id])));
const registered=new Map();
for(const [topic,identity] of Object.entries(COMPOSITION_METHOD_IDENTITIES)){
 assert.equal(compositionMethod(topic),identity.methodId);assert.equal(compositionSources(topic).id,identity.packId);
 registered.set(identity.packId,topic);
 for(const key of COMPOSITION_TOPICS[topic].refs)registered.set(COMPOSITION_REFERENCE_IDS[key],topic);
}
assert.equal(registered.size,Object.keys(COMPOSITION_METHOD_IDENTITIES).length+Object.keys(COMPOSITION_REFERENCE_IDS).length);
for(const [id,topic] of registered){
 const p=readyComposition(topic),receipt=structuredClone(task(p).methodReceipt);
 assert(methodKnowledgeCurrent(p,receipt));
 const withdrawn=applyKnowledgeCommand(p,{type:'knowledge.withdraw',payload:{id,stamp:knowledgeImpactStamp(p,id),reviewed:true,reviewer:'Synthetic architect',reason:'Verify the registered method or reference can be withdrawn.'}},at,'synthetic-actor').document;
 assert(!methodKnowledgeCurrent(withdrawn,receipt),id+' withdrawal invalidates its method support');
 assert(!interactionContextCurrent(withdrawn,task(withdrawn)),id+' withdrawal requires design review');
 assert.deepEqual(task(withdrawn).methodReceipt,receipt,'Withdrawal retains the exact recorded source receipt');
}
for(const scope of ['interaction','reads','persistence',...Object.keys(COMPOSITION_TOPICS),concern]){
 const current=interactionSourceReceipt(scope),prior=priorReceipt(current);
 assert.equal(current.sources.evaluationRevision,ARCHITECTURE_EVALUATION_REVISION);
 assert(interactionReceiptCurrent(current));assert(!interactionReceiptCurrent(prior),'A prior interpretation is stale even when publisher evidence is unchanged');
 assert.equal(prior.methodId,current.methodId);assert.equal(prior.packId,current.packId);
 assert.deepEqual(prior.sources.method,current.sources.method,'Original file hash, passage locators and text remain exact');
 assert.deepEqual(prior.sources.references,current.sources.references);
 assert.equal(architectureSources(scope).evaluationRevision,ARCHITECTURE_EVALUATION_REVISION);
}

const project=readyComposition('resilience'),method=architectureGrounding(project,{tasks:[]},{prompt:'Compare circuit breaker alternatives'}),oldMethod={...method,versionStamp:changeFingerprint([priorReceipt(interactionSourceReceipt('resilience')),null])};
assert(interactionGroundingCurrent(project,method));assert(!interactionGroundingCurrent(project,oldMethod),'A generation pinned to the old interpretation cannot remain current');
assert.equal(JSON.parse(method.excerpt).evaluationRevision,ARCHITECTURE_EVALUATION_REVISION);

const legacyDraft=structuredClone(project),oldDraftReceipt=priorReceipt(task(legacyDraft).methodReceipt);task(legacyDraft).methodReceipt=oldDraftReceipt;
assert(!designBasisCurrent(legacyDraft,task(legacyDraft)));assert(!interactionContextCurrent(legacyDraft,task(legacyDraft)));
assert.throws(()=>arc(legacyDraft,'architecture.prepare',{optionId:'protected-call'}),/Review the current sources first/);
assert.throws(()=>arc(legacyDraft,'architecture.refresh',{stamp:architectureSourceStamp(legacyDraft,task(legacyDraft)),reviewed:false,reviewer:'Synthetic architect',reason:'Review interpretation changes.'}),/Confirm the source review/);
const refreshed=arc(legacyDraft,'architecture.refresh',{stamp:architectureSourceStamp(legacyDraft,task(legacyDraft)),reviewed:true,reviewer:'Synthetic architect',reason:'Review current driver scope, applicability and obligations.'}).document;
assert(designBasisCurrent(refreshed,task(refreshed)));assert(interactionReceiptCurrent(task(refreshed).methodReceipt));assert.deepEqual(task(refreshed).history.at(-1).methodReceipt,oldDraftReceipt);
assert.deepEqual(task(refreshed).answers,task(legacyDraft).answers,'A source review retains the architect’s declarations');

const prepared=arc(project,'architecture.prepare',{optionId:'protected-call'}),alternative=prepared.document.modelAlternatives.records.find(a=>a.id===prepared.selected),preview=previewAlternative(prepared.document,alternative);
const applied=applyAlternativeCommand(prepared.document,{type:'alternative.apply',payload:{id:alternative.id,alternativeRevision:alternative.revision,previewStamp:preview.stamp,reviewed:true,reviewer:'Synthetic architect',reason:'Adopt the explicitly scoped caller policy.'}},at).document;
const legacyApplied=structuredClone(applied),historicalTask=task(legacyApplied);
historicalTask.methodReceipt=priorReceipt(historicalTask.methodReceipt);
historicalTask.applied.methodReceipt=priorReceipt(historicalTask.applied.methodReceipt);
const historicalAlternative=legacyApplied.modelAlternatives.records.find(a=>a.id===alternative.id);historicalAlternative.methodReceipt=priorReceipt(historicalAlternative.methodReceipt);
const adoptedBefore=structuredClone(historicalTask.applied),alternativeBefore=structuredClone(historicalAlternative),modelBefore=JSON.stringify([legacyApplied.realisation,legacyApplied.logical,legacyApplied.technology,legacyApplied.interfaces]);
assert(!designBasisCurrent(legacyApplied,historicalTask));
const reviewed=arc(legacyApplied,'architecture.refresh',{stamp:architectureSourceStamp(legacyApplied,historicalTask),reviewed:true,reviewer:'Synthetic architect',reason:'Review the new interpretation while retaining the prior adoption record.'}).document;
assert.equal(task(reviewed).status,'applied');assert(designBasisCurrent(reviewed,task(reviewed)));assert.equal(task(reviewed).methodReceipt.sources.evaluationRevision,ARCHITECTURE_EVALUATION_REVISION);
assert.deepEqual(task(reviewed).applied,adoptedBefore,'Source review never rewrites adopted history');assert.deepEqual(reviewed.modelAlternatives.records.find(a=>a.id===alternative.id),alternativeBefore);
assert.equal(JSON.stringify([reviewed.realisation,reviewed.logical,reviewed.technology,reviewed.interfaces]),modelBefore,'Source review does not reapply or modify the model');
console.log('PASS composition registry identity and source withdrawal, all method and governed-concern evaluation revisions, stale prior tasks/generations, deliberate source review, exact publisher evidence, retained declarations and immutable adopted history.');
