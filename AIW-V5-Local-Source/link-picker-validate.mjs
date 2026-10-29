import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {architectureModel} from './public/architecture-model.js';
import {decorateLinkPickers,relationshipVerbOptions} from './public/link-pickers.js';
const p=withFinalReview(seedProject()),before=JSON.stringify(p),objects=[...architectureModel(p).objects.values()];
const responsibility=objects.find(o=>o.type==='responsibility'),journey=objects.find(o=>o.type==='journey'),capability=objects.find(o=>o.type==='capability'),component=objects.find(o=>o.type==='component');
assert.ok(responsibility&&journey&&capability&&component);
const read=relationshipVerbOptions(p,{chapter:4,from:responsibility.id,to:journey.id,values:['trace','flow','serves','realises']});
assert.equal(read.find(r=>r.value==='flow').allowed,false,'a cross-layer process flow is not substituted for serving a journey');
assert.equal(read.find(r=>r.value==='serves').allowed,true);assert.equal(read.find(r=>r.value==='realises').allowed,true);
const back=relationshipVerbOptions(p,{chapter:4,from:journey.id,to:responsibility.id,values:['serves','realises']});assert.ok(back.every(r=>r.allowed),'canonical reversed layered relationships remain supported');
const technology=relationshipVerbOptions(p,{chapter:6,from:capability.id,to:component.id,values:['dependency','trust','resilience','data']});
assert.ok(technology.filter(r=>r.value!=='data').every(r=>!r.allowed),'capability prerequisites cannot be used as an application mapping');assert.ok(technology.find(r=>r.value==='data').allowed);
const w=new Window({url:'http://fixture.local/?chapter=4&tab=work'});Object.assign(globalThis,{window:w,document:w.document,location:w.location});
document.body.innerHTML=`<dialog><form id="l-connection-form"><select name="from"><option value="${responsibility.id}">Responsibility</option><option value="${journey.id}">Journey</option></select><select name="to"><option value="${journey.id}">Journey</option><option value="${responsibility.id}">Responsibility</option></select><select name="kind"><option value="flow">Flow</option><option value="serves">Serves</option><option value="realises">Realises</option><option value="trace">Trace</option></select></form></dialog>`;
const dialog=document.querySelector('dialog'),form=dialog.querySelector('form'),verb=form.elements.kind;decorateLinkPickers(dialog,p);
assert.equal(verb.value,'flow','a changed or invalid choice is not silently replaced');assert.equal(verb.validity.valid,false);assert.match(verb.validationMessage,/does not fit/);
verb.value='serves';verb.dispatchEvent(new w.Event('change'));assert.equal(verb.validity.valid,true);assert.equal(verb.querySelector('[value=flow]').hidden,true);
assert.equal(form.elements.from.querySelector('optgroup').label.startsWith('Chapter 4'),true,'current chapter records lead native endpoint groups');
decorateLinkPickers(dialog,p);assert.equal(dialog.querySelectorAll('.link-picker-search').length,2,'remount does not duplicate controls');
// Each chapter opens only its own form: missing earlier forms must not stop decoration.
for(const [formId,kindField] of [['a-interaction-form','interaction'],['t-dependency-form','type']]){
 document.body.innerHTML=`<dialog><form id="${formId}"><select name="from"><option value="${capability.id}">Capability</option></select><select name="to"><option value="${component.id}">Component</option></select><select name="${kindField}"><option value="data">Data</option><option value="dependency">Dependency</option></select></form></dialog>`;
 const chapterDialog=document.querySelector('dialog');decorateLinkPickers(chapterDialog,p);
 assert.equal(chapterDialog.querySelector('[name="'+kindField+'"]').dataset.typedPicker,'true',formId+' receives typed verb validation when the Chapter 4 form is absent');
}
assert.equal(JSON.stringify(p),before,'reading choices never changes model records');await w.happyDOM.close();
console.log('Relationship pickers: canonical layered direction, invalid flow filtering, capability-only prerequisites, exact values, visible invalid current choice, grouped endpoints and no mutations passed.');
