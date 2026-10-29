// A recorded Chapter 7 choice can become historical when a connected source changes without
// editing the realisation itself. Every reader must agree about that transition.
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {applyTechnologyRealisationCommand,selectionState,selectionLabel,exportTechnologyRealisationMarkdown} from './public/technology-realisation-domain.js';
import {modelDossierHTML} from './public/model-dossier.js';
import {technologyProductUsage} from './public/technology-catalogue.js';
import {stackSource,STATE_LABEL} from './public/stack-model.js';
import {failureGroundingHTML} from './public/platform-view.js';
import {sddDocument} from './public/sdd-document.js';

let p=withFinalReview(seedProject());
const id='tr-001',capId=p.technologyRealisation.mappings.find(m=>m.realizationId===id).capabilityId;
const record=q=>q.technologyRealisation.records.find(r=>r.id===id);
const run=(type,payload)=>{p=applyTechnologyRealisationCommand(p,{type:'techrealisation.'+type,payload},'2026-10-11T12:00:00Z').document;};
assert.equal(selectionState(p,record(p)),'none');
run('plan',{id,rationale:'A synthetic design rationale for the application execution option.'});
run('preference',{id,optionId:record(p).options[0].id});
assert.equal(selectionState(p,record(p)),'preferred');
run('record',{id,reviewed:true});
assert.equal(selectionState(p,record(p)),'recorded');
run('approval',{id,reviewer:'Fixture reviewer',authority:'Fixture board',evidence:'Synthetic approval fixture',confirmed:true});
assert.equal(selectionState(p,record(p)),'approved');
const approved=structuredClone(p),approvedRecord=record(approved);
const unrelated=structuredClone(approved);
unrelated.technology.capabilities.find(c=>c.id!==capId).revision++;
assert.equal(selectionState(unrelated,record(unrelated)),'approved','an unrelated capability does not invalidate a selected product');

const stale=structuredClone(approved),source=stale.technology.capabilities.find(c=>c.id===capId);
source.revision++;
assert.equal(record(stale).revision,approvedRecord.revision,'only the connected Chapter 6 input changed');
assert.equal(selectionState(stale,record(stale)),'stale');
assert.equal(selectionLabel(stale,record(stale)),STATE_LABEL.stale);
assert.match(modelDossierHTML(stale,id),/Selection<\/dt><dd>Selection needs review<\/dd>/);
assert.match(modelDossierHTML(stale,'api-pod'),/Product for TC-001<\/dt><dd>Selection needs review: Kubernetes/,'the inherited component product is historical too');
assert.match(failureGroundingHTML(stale,[capId],['api-pod']),/Kubernetes[^<]*Selection needs review/);
assert.equal(stackSource(stale).R.get(id).state,'stale');
const use=technologyProductUsage(stale,'Kubernetes').find(u=>u.realizationId===id&&u.selected);
assert.equal(use.status,'Selection needs review');
assert.equal(use.recorded,false);
assert.equal(use.approved,false);
const chapter7=exportTechnologyRealisationMarkdown(stale);
assert.match(chapter7,/Selection: TO-001 · [^\n]+ · Selection needs review/);
assert.match(chapter7,/Governance: No current external approval evidence/);
const sdd=sddDocument(stale,{figures:false}).markdown;
assert.match(sdd,/TC-001 [^\n]+Kubernetes 1\.31 \(Selection needs review\)/,'the SDD component detail does not silently retain approval');
assert.match(sdd,/TC-001 Kubernetes 1\.31 \(Selection needs review\)/,'the SDD component table agrees with its detail');

const kafka=structuredClone(stale),messaging=kafka.technologyRealisation.records.find(r=>r.id==='tr-003');
messaging.selectedOptionId=messaging.options.find(o=>o.product==='Apache Kafka')?.id;
assert(messaging.selectedOptionId,'the reference comparison includes Kafka');
assert.match(modelDossierHTML(kafka,messaging.id),/Source applicability<\/dt><dd>Option specifies Apache Kafka version 3\.9; bundled mechanism documentation cites version 4\.3/);
assert.match(sddDocument(kafka,{figures:false}).markdown,/source applicability: Option specifies Apache Kafka version 3\.9; bundled mechanism documentation cites version 4\.3/,'the SDD does not silently borrow version-specific documentation');
assert.equal(JSON.stringify(approved),JSON.stringify(p),'all changed readers are pure and leave the source project untouched');
console.log('Selection consistency: source-snapshot staleness and approval across dossier, inherited component, failure reading, Stack, SDD and Chapter 7 export; source-version warning.');
