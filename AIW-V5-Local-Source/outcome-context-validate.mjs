// Exact linked source closure and currentness. No provider call or runtime evidence.
import assert from 'node:assert/strict';
import {outcomeContractFixture,OUTCOME_FIXTURE_AT as at} from './outcome-contract-fixtures.mjs';
import {applyCommand} from './public/requirements-domain.js';
import {applyQualityCommand} from './public/quality-domain.js';
import {applyInterfacesCommand} from './public/interfaces-domain.js';
import {architectureIntelligence,architectureIntelligenceSource,architectureIntelligenceCurrent} from './public/architecture-intelligence.js';
import {intelligencePacket,packArchitectureIntelligence} from './public/intelligence-context.js';

let {document:p,ids}=outcomeContractFixture();
const run=(fn,type,payload)=>{const r=fn(p,{type,payload},at);p=r.document;return r.selected;};
const resultRequirement=run(applyCommand,'artefact',{type:'requirement',title:'Retain an inspectable business result',description:'The result authority must retain pending and final states under the original operation identity.',acceptance:'A later read preserves the original outcome meaning.',owner:'Synthetic result owner',source:'Authored source-closure scenario.'});
const resultDriver=run(applyQualityCommand,'quality.driver',{kind:'data',title:'Preserve result meaning',description:'The status dictionary belongs to the result authority.',requirementIds:[resultRequirement]});
const resultConstraint=run(applyCommand,'artefact',{type:'constraint',title:'Retain the original result authority',description:'A consumer copy cannot replace the authoritative result.',links:[['new','constrains',resultRequirement]]});
run(applyInterfacesCommand,'interfaces.contract',{id:ids.outcomeContractId,requirementIds:[resultRequirement]});
const before=JSON.stringify(p),selection={chapter:8,id:ids.contractId},reading=architectureIntelligence(p,selection),insight=reading.insights.find(i=>i.kind==='composition');
const required=[ids.contractId,ids.outcomeContractId,ids.authority,ids.queryDataId,ids.resultDataId,ids.outcomePathId,ids.pathId,ids.environmentId,ids.requirementId,ids.driverId,resultRequirement,resultDriver,resultConstraint];
for(const id of required)assert(insight.sourceRefs.includes('model:'+id),'The reading needs '+id);
assert(insight.driverIds.includes(resultDriver));
const captured=architectureIntelligenceSource(reading,{maxCharacters:12000});assert(architectureIntelligenceCurrent(p,captured));
const mutations=[
 q=>q.interfaces.contracts.find(r=>r.id===ids.outcomeContractId).contractVersion='result-v2',
 q=>q.interfaces.data.find(r=>r.id===ids.queryDataId).fields[0].description='Revised correlation semantics.',
 q=>q.interfaces.data.find(r=>r.id===ids.resultDataId).fields[1].enumeration='PENDING\nCOMPLETED\nCANCELLED',
 q=>q.realisation.components.find(r=>r.id===ids.authority).owner='Revised accountable owner',
 q=>q.runtime.paths.find(r=>r.id===ids.outcomePathId).route='Revised result route',
 q=>q.artefacts.find(r=>r.id===resultRequirement).acceptance='Revised result acceptance',
 q=>q.quality.drivers.find(r=>r.id===resultDriver).description='Revised result driver',
 q=>q.artefacts.find(r=>r.id===resultConstraint).description='Revised authority constraint'
];
for(const mutate of mutations){const q=structuredClone(p);mutate(q);assert(!architectureIntelligenceCurrent(q,captured),'Linked model and decision facts invalidate the earlier reading');}
const resultReading=architectureIntelligence(p,{chapter:8,id:ids.outcomeContractId});assert(resultReading.insights.some(i=>i.id===insight.id),'Selecting the result retains its submission context');
const resultCaptured=architectureIntelligenceSource(resultReading,{maxCharacters:12000}),q=structuredClone(p);q.artefacts.find(r=>r.id===ids.requirementId).acceptance='Revised submission acceptance';assert(!architectureIntelligenceCurrent(q,resultCaptured));
console.log('PASS linked contracts, dictionaries, authority, paths and their scoped drivers/requirements/constraints form a currentness-sensitive source closure in either selection');

const request={chapter:8,objectId:ids.contractId,mode:'challenge',prompt:'Review submission and authoritative business-result discovery together.'};
const packet=intelligencePacket(p,request),derived=packet.sources.find(s=>s.kind==='architecture-intelligence'&&JSON.parse(s.excerpt).insights.some(i=>i.id===insight.id));
assert(derived,'The bounded packet must retain this complete two-contract scenario');
const composed=JSON.parse(derived.excerpt).insights.find(i=>i.id===insight.id);
assert.deepEqual(composed.checks.map(c=>c.id),insight.checks.map(c=>c.id));
assert.deepEqual(composed.obligations.map(o=>[o.id,o.action,o.evidence,o.targetIds]),insight.obligations.map(o=>[o.id,o.action,o.evidence,o.targetIds]));
assert.deepEqual(composed.scope,insight.scope);assert.deepEqual(composed.placement,insight.placement);
assert(derived.receipt.sourceRefs.every(id=>packet.sources.some(s=>s.id===id)));
assert(packet.coverage.characters<=28000);assert(packet.sources.length<=22);
for(const excludedId of [ids.resultDataId,ids.outcomePathId,resultConstraint]){
 const packed=packArchitectureIntelligence([{...reading,insights:[insight]}],{excluded:new Set([excludedId])});assert.equal(packed.sources.length,0,'Excluded support withholds the deduction as a whole');
 const redacted=structuredClone(p);redacted.workspace={...redacted.workspace,aiPolicy:{...redacted.workspace?.aiPolicy,excludedObjectIds:[excludedId]}};
 const safe=intelligencePacket(redacted,request);assert(!safe.sources.some(s=>s.kind==='architecture-intelligence'&&JSON.parse(s.excerpt).insights.some(i=>i.id===insight.id)));
}
const small=packArchitectureIntelligence([{...reading,insights:[insight]}],{maxCharacters:4000});assert.equal(small.sources.length,0);assert.equal(small.omitted,1);
assert.equal(JSON.stringify(p),before);
console.log('PASS all checks, verification responsibilities and exact supporting records fit the provider bounds; excluded or undersized support withholds the whole deduction without altering saved facts');
