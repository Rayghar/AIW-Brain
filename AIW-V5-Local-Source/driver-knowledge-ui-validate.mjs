// Synthetic DOM checks for the existing knowledge and option editors. No server
// or browser runtime: checks the actual controls and their native saved payload.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {architectureUnitFields,architectureUnitEditor,architectureUnitPayload,architectureUnitReviewHTML} from './public/architecture-unit-authoring-ui.js';
import {architectureUnitRecord} from './public/architecture-knowledge-unit.js';
import {configurationFieldsHTML,configurationFactsFromForm,configurationFactsHTML} from './public/product-configuration-ui.js';
import {evaluateArchitectureScope} from './public/architecture-applicability.js';
import {productMechanisms} from './public/product-applicability.js';

const w=new Window(),document=w.document;
const unit={kind:'product-mechanism',mechanism:'Sentinel can coordinate failover under the documented topology.',scope:{product:'Redis',version:'7.2'},effects:[{quality:'availability',direction:'supports',rationale:'Conditional on configured replication, failure domains and compatible clients.'}],obligations:[{action:'Test client recovery and acknowledged-write loss.',evidence:'A controlled primary-loss exercise with workload records.'}],exclusions:['No quorum remains reachable.'],applicability:{id:'sentinel-fixture',requires:[{id:'enabled',fact:'redis.sentinel',op:'eq',value:true,label:'Sentinel enabled',question:'Is Sentinel configured?',sourceIds:['synthetic-source']},{id:'instances',fact:'replicaCount',op:'gte',value:2,label:'At least two data instances'}],excludes:[{id:'unsupported',fact:'tier',op:'oneOf',value:['unsupported','retired'],label:'Unsupported edition'}]},placement:[{target:'capability',role:'failover coordination',reason:'Coordinate failover for the database clients.',capability:'caching'}]};
const fields=architectureUnitFields(unit),roundtrip=architectureUnitPayload(fields);
assert.deepEqual(roundtrip,architectureUnitRecord(unit),'The editable form preserves typed conditions, placement, provenance and values');
document.body.innerHTML=architectureUnitEditor(fields);
assert.equal(document.querySelectorAll('[data-k-unit-row="condition"][data-k-unit-property="fact"]').length,3);
assert.equal(document.querySelectorAll('[data-k-unit-row="placement"][data-k-unit-property="target"]').length,1);
assert.match(architectureUnitReviewHTML(unit),/At least two data instances/);
const invalid=structuredClone(fields);invalid.unitConditions[1].value='not a number';assert.throws(()=>architectureUnitPayload(invalid),/finite number/);
const unsafe=structuredClone(fields);unsafe.unitConditions[0].fact='constructor.prototype.enabled';assert.throws(()=>architectureUnitPayload(unsafe),/safe literal/);
const absent=evaluateArchitectureScope(unit,{product:'Redis',version:'7.2',serviceTier:'community'});assert.equal(absent.state,'needs-context');
const excluded=evaluateArchitectureScope(unit,{product:'Redis',version:'7.2',serviceTier:'community',replicaCount:1,configurationFacts:{'redis.sentinel':false}});assert.equal(excluded.state,'excluded');

document.body.innerHTML='<form>'+configurationFieldsHTML({product:'Redis',configurationFacts:{'redis.sentinel':false,'redis.sentinelCount':0}})+'</form>';
const form=document.querySelector('form'),fact=key=>form.querySelector('[data-tr-config="'+key+'"]');
// happy-dom 20.x does not consistently initialise select.value from a final
// selected option. Check the markup, then initialise the controls as specified.
assert(fact('redis.sentinel').querySelector('option[value="false"]').hasAttribute('selected'));
for(const select of form.querySelectorAll('select'))select.value=select.querySelector('option[selected]')?.getAttribute('value')||'';
assert.equal(fact('redis.sentinel').value,'false','False remains an explicit negative answer');
assert.equal(fact('redis.sentinelCount').value,'0','Zero is not converted to a missing count');
assert.equal(fact('redis.clientFailover').value,'','Unanswered stays unknown');
assert.deepEqual(configurationFactsFromForm(form),{'redis.sentinel':false,'redis.sentinelCount':0});
fact('redis.sentinel').value='true';fact('redis.sentinelCount').value='3';fact('redis.clientFailover').value='true';
const configured={product:'Redis',version:'7.2',replicaCount:2,failureDomains:'Two independent zones',configurationFacts:configurationFactsFromForm(form)};
assert.equal(productMechanisms(configured).find(m=>m.id==='redis-sentinel').applicability.state,'context-match');
fact('redis.sentinel').value='';assert.equal(Object.hasOwn(configurationFactsFromForm(form,configured.configurationFacts),'redis.sentinel'),false,'Clearing a fact removes the declaration');
fact('redis.sentinelCount').value='-1';assert.throws(()=>configurationFactsFromForm(form),/whole non-negative/);
assert.match(configurationFactsHTML(configured),/Yes/);
assert(!configurationFieldsHTML({product:'Redis'}).includes('<script>'));
const malicious={...unit,mechanism:'<script>alert(1)</script>'};assert(!architectureUnitReviewHTML(malicious).includes('<script>'),'Source text remains escaped');
await w.happyDOM.close();
console.log('PASS knowledge/configuration DOM: typed round trip, safe predicates, missing/false/zero distinctions, conditional Sentinel assessment, clearing facts, readable placement and escaped source text.');
