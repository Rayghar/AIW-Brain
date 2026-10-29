import assert from 'node:assert/strict';
import {referenceProject} from './notation-fixtures.mjs';
import {technologyComparison} from './public/sol-comparison.js';
import {solSection} from './public/chapter-sol.js';
import {intelligenceSection, providerInput} from './public/intelligence-ui.js';
import {SOL} from './public/brain-reasoning-ui.js';
import {reasoningPacket} from './public/brain-reasoning.js';
import {architectureBrain} from './public/architecture-brain.js';
import {brainContext} from './public/aiw-brain.js';
import {intelligencePacket} from './public/intelligence-context.js';

const p = referenceProject(), r = p.technologyRealisation.records.find(x => x.ref === 'TR-003');
assert(r, 'reference project contains the messaging realization');
const c = technologyComparison(p, `M:7:${r.id}`);
assert.deepEqual(c.options.map(o => o.product), ['RabbitMQ', 'Apache Kafka']);
assert.match(c.prompt, /TO-005 RabbitMQ.*TO-006 Apache Kafka/);
assert.match(c.prompt, /QD-002 Keep instruction intake available.*99\.9/);
assert.match(c.prompt, /2 other linked criteria lack a detailed scenario reading in this packet/);
assert(!c.prompt.includes('QD-001 Preserve one financial effect'), 'scenario targets omitted by the bounded packet are not presented as evidence');
assert.match(c.prompt, /reliability, recovery or scalability target changes/);
assert.match(c.prompt, /do not invent measured results or make a selection/);
assert(c.prompt.length <= 1000, 'the preset fits the visible question field');
assert(c.drivers.length >= 2, 'the comparison follows linked quality scenarios');
const prepared = reasoningPacket(p, {task:'decisions', ids:[`M:7:${r.id}`], scope:`M:7:${r.id}`, prompt:c.prompt});
assert.deepEqual(prepared.items[0].allowed.preferred, c.options.map(o => o.id), 'the existing reasoning contract permits these saved product choices');
assert.equal(prepared.request.prompt, c.prompt, 'the question is bound to the preview packet');
assert(prepared.sources.some(s => s.kind === 'chapter-reading' && /RabbitMQ/.test(s.excerpt)), 'the provider packet contains the saved option reading');
for (const id of ['QD-002','QD-004','QD-006']) assert(prepared.sources.some(s => s.kind === 'model' && s.title.startsWith(id)), `${id} has a detailed source in the provider packet`);
const methodIds=prepared.sources.filter(s=>s.kind==='brain-method').map(s=>s.objectId);
assert.deepEqual(methodIds,['PB-050','PB-309'],'the product comparison receives recovery and communication guidance, not a Facade, secure proxy, generic tactic summary, or unrelated monolith trade-off');
assert.equal(prepared.sources.filter(s=>s.kind==='product-mechanism').length,6,'the governed product-mechanism sources remain available');
assert.equal(prepared.stamp,reasoningPacket(p,{task:'decisions',ids:[`M:7:${r.id}`],scope:`M:7:${r.id}`,prompt:c.prompt}).stamp,'the ranked packet remains deterministic');
const context=brainContext(p,{chapter:7,id:r.id});
assert.equal(architectureBrain(p,context,{query:'Assess the Facade pattern for a complex subsystem'}).methods[0]?.method.id,'PB-104','directly named Playbook guidance is still retrievable');
assert.equal(architectureBrain(p,context,{query:'How should a secure communication pattern protect channels?'}).methods[0]?.method.id,'PB-105','a relevant security pattern is still retrievable');
const named=intelligencePacket(p,{chapter:7,objectId:r.id,mode:'mind',prompt:'Compare RabbitMQ with Dedicated messaging service for reliability and scalability.'});
assert(!named.sources.some(s=>s.kind==='brain-method'&&['PB-103','PB-104','PB-105','TO-014'].includes(s.objectId)),'the other Sol route shares the same subject-first retrieval');
assert.deepEqual(technologyComparison(p, `M:7:${r.id}`, r.options[1].id).options.map(o => o.id), [r.options[1].id, r.options[0].id], 'the selected candidate is the first comparison option');

const model = solSection(p, 7, r.id, {inPanel: true});
assert.match(model, /data-dk="sol-compare"[\s\S]*RabbitMQ.*Apache Kafka/);
assert.match(model, /selection stays in Chapter 7 Work/);
const composer = intelligenceSection(p, {chapter: 7, selected: r}, 'design');
assert.match(composer, /data-job="compare-products"/);
assert.match(composer, /RabbitMQ.*Apache Kafka.*5 linked quality scenarios/);
assert(!composer.includes('data-intel-action="generate"'), 'record questions use the chapter reasoning path');

const single = structuredClone(p), singleRecord = single.technologyRealisation.records.find(x => x.id === r.id);
singleRecord.options = singleRecord.options.slice(0, 1);
const unavailable = technologyComparison(single, `M:7:${r.id}`);
assert.equal(unavailable.options.length, 0);
assert.match(unavailable.summary, /Add a second option.*Chapter 7 Work/);
assert(!intelligenceSection(single, {chapter: 7, selected: singleRecord}, 'design').includes('data-job="compare-products"'), 'a comparison is unavailable with one option');
assert.match(solSection(single, 7, r.id, {inPanel: true}), /Add a second option/);

const withoutDrivers = structuredClone(p);
withoutDrivers.technologyRealisation.mappings = withoutDrivers.technologyRealisation.mappings.filter(m => m.realizationId !== r.id);
assert.match(technologyComparison(withoutDrivers, `M:7:${r.id}`).prompt, /No quality scenario is linked; identify the missing trace/);
assert.equal(technologyComparison(p, 'M:4:api'), null);

SOL.byItem.set(`M:7:${r.id}`, {run:{id:'saved-run'}, a:{headline:'Candidate fit needs confirmation'}, item:{stamp:'earlier-stamp'}});
const prior = intelligenceSection(p, {chapter: 7, selected: r}, 'design');
assert.match(prior, /Saved assessment saved-run.*source changed.*Candidate fit needs confirmation/);
assert.match(prior, /Ask a follow-up/);
assert.match(prior, /Only the saved run ID and headline enter its question; this is not a chat transcript/);
SOL.byItem.clear();

const packet = {disclosure:{redactContacts:true},request:{prompt:'Ask ana@example.org about password=P@ssw0rd!'},
  missing:['Call +234 803 123 4567'],links:[{label:'ana@example.org'}],sources:[{excerpt:'password=P@ssw0rd!'}]};
const input = providerInput(packet);
assert.match(JSON.stringify(input), /\[email redacted\]/);
assert.match(JSON.stringify(input), /\[phone-like value redacted\]/);
assert.match(JSON.stringify(input), /\[secret redacted\]/);
assert(!JSON.stringify(input).includes('ana@example.org') && !JSON.stringify(input).includes('P@ssw0rd!'));
assert(packet.request.prompt.includes('ana@example.org'), 'the provider preview does not mutate the prepared packet');

console.log('PASS Sol Chapter 7 product comparison: named candidates, linked scenarios and targets, no selection claim, missing-data guidance, and explicit saved-assessment context.');
