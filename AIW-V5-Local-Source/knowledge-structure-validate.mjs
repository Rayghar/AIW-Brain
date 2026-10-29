// Source-backed interpretation of the supplied AKR structure and native reviewed
// claims. All project content below is original synthetic test material.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
import {BRAIN_CATALOGUE} from './public/brain-catalogue.js';
import {CATALOGUE} from './public/catalogue-index.js';
import {MARKED_RECORDS} from './public/catalogue-curation.js';
import {knowledgeStructures,knowledgeStructureSource,catalogueStructureSource} from './public/knowledge-structure.js';
import {applyKnowledgeCommand,knowledgeStamp,knowledgeImpactStamp,knowledgeImpact,claimReceiptCurrent} from './public/knowledge-governance.js';
import {evaluateApplicability} from './public/architecture-applicability.js';
import {sha256} from './public/brain-integrity.js';

const at='2026-10-20T15:00:00.000Z',author='synthetic-author',reviewer='synthetic-reviewer';
let p=createProject({name:'Synthetic repository reasoning',template:'blank'},'structured-knowledge');
const command=(type,payload,actor=author)=>{const result=applyKnowledgeCommand(p,{type:'knowledge.'+type,payload},at,actor);p=result.document;return result.selected;};
const all=knowledgeStructures(p),rawById=new Map(BRAIN_CATALOGUE.records.map(r=>[r.id,r]));
assert.equal(all.catalogueLoaded,true);assert.equal(BRAIN_CATALOGUE.records.length,328);
assert.equal(all.records.length,328-MARKED_RECORDS.length);
assert.deepEqual(BRAIN_CATALOGUE.knowledgeObjects.coverage,{total:1326,dnaProjections:328,editorialLineageClaims:984,atomicSeedLeads:14});
assert.equal(all.coverage.totalKnowledgeObjects,1326);assert.equal(all.coverage.editorialLineageClaims,984);assert.equal(all.reviewLeads.length,14);
const sorted=value=>Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;
for(const lead of all.reviewLeads){
 const raw=BRAIN_CATALOGUE.knowledgeObjects.seedLeads.find(x=>x.objectId===lead.id),{sourcePointer,objectSha256,...original}=raw;
 const canonical=JSON.stringify(sorted(original)).replace(/[\u0080-\uffff]/g,ch=>'\\u'+ch.charCodeAt(0).toString(16).padStart(4,'0'));
 assert.equal(sha256(canonical),objectSha256,'Every atomic lead retains the exact original object hash');
 assert.equal(lead.receipt.sourcePointer,sourcePointer);assert.equal(lead.receipt.objectHash,objectSha256);assert.equal(lead.receipt.sourceHash,BRAIN_CATALOGUE.knowledgeObjects.sourceSha256);
 assert.deepEqual(lead.provenance,raw.provenance);assert.equal(lead.polarity,raw.polarity);assert.equal(lead.statement,raw.statement);
 for(const key of ['conditions','limitations'])assert.deepEqual(lead[key].map(x=>x.text),raw[key]);
 assert.equal(lead.status,'discovery-only');assert.equal(lead.authority.evaluateFit,false);assert.equal(lead.authority.scoring,false);assert.equal(lead.authority.automaticMutation,false);
 assert.equal(lead.acquisition.immutableRevision,null);assert.equal(lead.acquisition.passageHash,null,'A seed-* excerpt identifier is never an exact acquired passage hash');
 assert(!all.records.some(r=>r.id===lead.id||r.claimId===lead.claimId),'Archive seed review is not a project-reviewed active claim');
 assert.equal(knowledgeStructureSource(lead),null,'Discovery metadata never enters generic reasoning sources');
 for(const id of lead.linkedDnaIds){
  const record=rawById.get(id);assert(record.id===lead.subjectId||record.lineageSummary.claimIds.includes(lead.claimId));
  assert(knowledgeStructures(p,{conceptIds:[id]}).reviewLeads.some(x=>x.id===lead.id));
 }
}
assert.deepEqual(BRAIN_CATALOGUE.records.map(r=>r.recordSha256),CATALOGUE.records.map((r,i)=>Buffer.from(CATALOGUE.recordHashes.slice(i*43,i*43+43),'base64url').toString('hex')),'The enriched source projection retains every indexed full-record hash');
for(const record of all.records){
 const raw=rawById.get(record.id),source=knowledgeStructureSource(record),content=JSON.parse(source.excerpt);
 assert.equal(record.authority.evaluateFit,false);assert.equal(record.authority.scoring,false);assert.equal(record.authority.automaticMutation,false);
 assert.deepEqual(record.applicableStages,raw.applicableStages);assert.equal(record.category,raw.category);
 assert.equal(record.verificationHints[0].text,raw.fitnessTests[0]);
 assert.equal(source.receipt.recordHash,raw.recordSha256);assert.equal(source.receipt.sourcePointer,raw.sourcePointer);assert.equal(source.receipt.sourceHash,BRAIN_CATALOGUE.sourceSha256);
 assert(!source.excerpt.includes('"magnitude"'));assert(!record.effects.some(e=>'magnitude' in e));
 assert(record.effects.every(e=>e.evaluated===false));assert(content.qualityConsiderations.length);
 assert.deepEqual(catalogueStructureSource(raw),source,'Native guidance and Brain use the same exact source projection');
 assert(source.excerpt.length<=6500,'The source excerpt remains bounded valid JSON');
 for(const item of [...record.conditions,...record.prerequisites,...record.obligations,...record.verificationHints]){
  assert(item.sourceField.startsWith(raw.sourcePointer+'/'));
  const original=item.sourceField.slice(raw.sourcePointer.length+1).split('/').reduce((value,key)=>value[key],raw);
  assert.equal(item.text,typeof original==='string'?original:original.description||original.title,'Every condition/obligation/test identifies its actual source field');
 }
}
// Generated sharing is lossless and immutable, including nested data.
const ordinary=BRAIN_CATALOGUE.records.find(r=>r.knowledgeAuthority.activeUse==='descriptive-and-editorial-composition-only');
assert(Object.isFrozen(ordinary.knowledgeAuthority));assert.throws(()=>{ordinary.knowledgeAuthority.scoringCalibrated=true;},TypeError);
const condition=BRAIN_CATALOGUE.records[0].qualityImpacts[0].conditions;
assert(Object.isFrozen(condition));assert.throws(()=>condition.push('invented condition'),TypeError);

const anchor=all.records.find(r=>r.record.complements?.length&&r.record.conflicts?.length),oneHop=knowledgeStructures(p,{conceptIds:[anchor.id]}),expected=new Set([anchor.id,...anchor.record.complements,...anchor.record.conflicts,...anchor.record.alternatives]);
assert(oneHop.records.every(r=>expected.has(r.id)));assert(oneHop.relations.every(r=>r.from===anchor.id),'No transitive relation becomes an additional intent anchor');
for(const edge of all.relations){
 const key={complement:'complements',conflict:'conflicts',alternative:'alternatives'}[edge.kind];
 assert(rawById.get(edge.from)[key].includes(edge.to));assert.equal(edge.authority,'editorial');assert.equal(edge.evaluated,false);
 const source=knowledgeStructureSource(all.records.find(r=>r.id===edge.from));
 assert(JSON.parse(source.excerpt)[key].includes(edge.to),'Every exposed relation remains in its declaring source excerpt');
 if(edge.targetState==='stub'){assert(!all.records.some(r=>r.id===edge.to));assert(all.unavailable.some(r=>r.id===edge.to&&r.state==='stub'));}
}
for(const id of MARKED_RECORDS){assert(!all.records.some(r=>r.id===id));assert(all.unavailable.some(r=>r.id===id&&r.state==='marked'));}

const review={reviewed:true,reviewer:'Synthetic second architect',reason:'Checked the exact source, permissions, interpretation and conditions.',sourceChecked:true,rightsChecked:true,conditionsChecked:true,decision:'verified'};
const sourceId=command('source',{title:'Synthetic scoped repeated-effect policy',body:'Only repeat an operation when its business effect is idempotent or atomically deduplicated. An attempt deadline and finite budget still apply.',revision:'fixture-1',path:'synthetic/repeated-effect.txt',license:'Original synthetic test material'});
const unit={kind:'tactic',mechanism:'Bound repeated work and protect its business effect.',effects:[{quality:'reliability',direction:'supports',rationale:'A safely repeated request may recover a transient failure; success remains unverified.'}],obligations:[{action:'Prove repeated business effects are controlled.',evidence:'Repeat an uncertain request and verify one effect.'}],exclusions:['Unprotected repeated side effects.'],applicability:{requires:[{id:'safe-repeat',fact:'operation.repeatable',op:'eq',value:true,label:'The operation can be repeated safely.'}]},placement:[{target:'caller',reason:'The caller owns the attempt and deadline policy.'}]};
const claimId=command('claim',{sourceId,lineStart:1,lineEnd:1,subjectId:'synthetic-repeat-policy',predicate:'requires',statement:'Repeated attempts require a safe business effect and a finite budget.',claimType:'prerequisite',polarity:'requires',conditions:['The selected operation may repeat.'],limitations:['This does not prove successful completion.'],architectureUnit:unit});
assert(!knowledgeStructures(p).records.some(r=>r.claimId===claimId),'An unreleased candidate is never a reasoning record');
command('review',{...review,id:claimId},reviewer);
assert(!knowledgeStructures(p).records.some(r=>r.claimId===claimId),'Review alone does not activate a release');
const releaseId=command('release',{...review,title:'Synthetic controlled repeat policy',claimIds:[claimId]});
command('activate',{...review,id:releaseId,stamp:knowledgeStamp(p)});
const before=JSON.stringify(p),released=knowledgeStructures(p,{conceptIds:['synthetic-repeat-policy']}).records;
assert.equal(released.length,1);const interpreted=released[0],source=knowledgeStructureSource(interpreted);
assert.equal(interpreted.authority.kind,'project-reviewed');assert.equal(interpreted.authority.evaluateFit,true);assert.equal(interpreted.sourceId,sourceId);
assert.deepEqual(interpreted.applicability,unit.applicability);assert.deepEqual(interpreted.placement,unit.placement);assert(claimReceiptCurrent(p,interpreted.receipt));
assert.equal(evaluateApplicability(interpreted.applicability,{}).state,'needs-context');
assert.equal(evaluateApplicability(interpreted.applicability,{'operation.repeatable':{value:false,status:'declared'}}).state,'excluded');
assert.equal(evaluateApplicability(interpreted.applicability,{'operation.repeatable':{value:true,status:'declared'}}).state,'context-match');
assert.equal(JSON.parse(source.excerpt).sourcePassage,p.knowledge.sources.find(s=>s.id===sourceId).body);
assert.equal(JSON.stringify(p),before,'Reading and serializing knowledge never mutates the project');
command('withdraw',{...review,id:sourceId,stamp:knowledgeImpactStamp(p,sourceId)});
assert(!knowledgeStructures(p).records.some(r=>r.claimId===claimId));assert(!claimReceiptCurrent(p,interpreted.receipt));
assert(knowledgeStructures(p).unavailable.some(r=>r.claimId===claimId&&r.state==='ineligible'));
assert.deepEqual(p.knowledge.releases[0].claims[0].architectureUnit,interpreted.receipt.architectureUnit,'Withdrawal retains the original interpretation');

const revoked=anchor.record.complements.find(id=>all.records.some(r=>r.id===id));
assert(revoked);command('withdraw',{...review,id:revoked,stamp:knowledgeImpactStamp(p,revoked)});
const afterRecord=knowledgeStructures(p,{conceptIds:[anchor.id]});
assert(!afterRecord.records.some(r=>r.id===revoked));assert(afterRecord.relations.some(r=>r.to===revoked&&r.targetState==='withdrawn'));
assert(afterRecord.records.some(r=>r.id===anchor.id),'Withdrawing one relation target does not withdraw its source');
p.coauthoring||={};p.coauthoring.assessments=[{id:'synthetic-reading',title:'Synthetic use of the catalogue',sources:[catalogueStructureSource(rawById.get(anchor.id))]}];
assert(knowledgeImpact(p,BRAIN_CATALOGUE.releaseId).some(x=>x.id==='synthetic-reading'));
command('withdraw',{...review,id:BRAIN_CATALOGUE.releaseId,stamp:knowledgeImpactStamp(p,BRAIN_CATALOGUE.releaseId)});
assert(!knowledgeStructures(p).records.some(r=>r.origin==='catalogue'));
assert.equal(knowledgeStructures(p).reviewLeads.length,0,'Catalogue release withdrawal also withholds its unpinned discovery leads');
assert(p.knowledge.withdrawals.some(w=>w.targetId===revoked)&&p.knowledge.withdrawals.some(w=>w.targetId===BRAIN_CATALOGUE.releaseId));
console.log('PASS supplied catalogue structure, immutable source identities, qualitative non-scoring effects, exact one-hop relationships and field locators, shared source serialization, native independent review/release/withdrawal, typed applicability and retained history.');
