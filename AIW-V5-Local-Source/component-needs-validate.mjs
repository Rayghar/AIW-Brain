import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {seedProject} from './public/requirements-domain.js';
import {component,allocations,applyRealisationCommand} from './public/realisation-domain.js';
import {withTechnology,needsFor,needChanged,applyTechnologyCommand} from './public/technology-domain.js';
import {componentNeedStatus,componentNeedsPayload} from './public/component-needs.js';

// Synthetic records test review invalidation. These are not a real architect review.
let p=withTechnology(seedProject());
const id='api-pod';
p=applyRealisationCommand(p,{type:'realisation.component',payload:{id,status:'reviewed',assumptionsResolved:true}}).document;
p=applyTechnologyCommand(p,{type:'technology.needs',payload:{applicationId:id,boundaryId:'tb-002',confirmed:true,needs:needsFor(p,id).map(n=>({...n,confirmed:true}))}}).document;
assert.ok(needsFor(p,id).every(n=>componentNeedStatus(p,n)==='Reviewed'));
const before=component(p,id),beforeMaps=structuredClone(allocations(p,id));
const payload=componentNeedsPayload(before,{technologyNeeds:before.technologyNeeds+'; verified dispatch boundary',assumptions:'New unreviewed isolation assumption',source:'Synthetic source revision 2'});
assert.equal(payload.status,'candidate');
assert.equal(Object.hasOwn(payload,'allocations'),false);
assert.equal(Object.hasOwn(payload,'assumptionsResolved'),false);
const changed=withTechnology(applyRealisationCommand(p,{type:'realisation.component',payload}).document),after=component(changed,id);
assert.equal(after.assumptionsResolved,false,'editing assumptions must not re-assert their previous confirmation');
assert.equal(after.status,'candidate','the short editor has no control to review a changed design');
assert.deepEqual(allocations(changed,id),beforeMaps,'native partial updates preserve complete allocation records, including roles and IDs');
for(const key of ['title','kind','purpose','boundary','owner','inputs','outputs','rationale','dataIds','consumesDataIds','producesDataIds','decisionIds','requirementGroupIds','patternIds','properties','containerId','serves','open'])assert.deepEqual(after[key],before[key],key+' remains unchanged');
assert.ok(needsFor(changed,id).every(n=>needChanged(changed,n)&&componentNeedStatus(changed,n)==='Inputs changed · review needed'));
const unchanged=componentNeedsPayload(before,before);
assert.equal(Object.hasOwn(unchanged,'status'),false);
const same=applyRealisationCommand(p,{type:'realisation.component',payload:unchanged}).document;
assert.equal(component(same,id).status,'reviewed');
assert.equal(component(same,id).assumptionsResolved,true);
assert.equal(component(same,id).revision,before.revision,'an untouched form does not create another component revision');
const sourceOnly=applyRealisationCommand(p,{type:'realisation.component',payload:componentNeedsPayload(before,{...before,source:'Another synthetic source'})}).document;
assert.equal(component(sourceOnly,id).assumptionsResolved,true,'unchanged assumption confirmation is retained');
assert.equal(componentNeedStatus(changed,{...needsFor(changed,id)[0],state:'proposed'}),'Proposed');
assert.throws(()=>componentNeedsPayload(null,{}),/no longer exists/);
console.log('PASS short needs edits preserve allocations and unrelated fields, reopen changed assumptions, and invalidate displayed need reviews without inventing approval.');

const w=new Window({url:'http://fixture.local/?chapter=5&tab=work&section=technology'});
Object.assign(globalThis,{window:w,document:w.document,location:w.location,history:w.history,FormData:w.FormData,Event:w.Event,CustomEvent:w.CustomEvent,HTMLElement:w.HTMLElement,requestAnimationFrame:w.requestAnimationFrame.bind(w)});
const {createRealisationStudio}=await import('./public/realisation-ui.js');
const {logicalGraph}=await import('./public/logical-domain.js');
const store={value:{document:p}},studio=createRealisationStudio(store);
const bridge={state:{chapter:5,tab:'work',selected:id,visible:['physical','logical']},getNode:key=>logicalGraph(store.value.document).nodes.find(n=>n.id===key),closeModal(){},pauseFlow(){},render(){},toast(){},setTab(){}};
studio.bind(bridge);
document.body.innerHTML=studio.work();
const article=()=>[...document.querySelectorAll('.l-connection')].find(el=>el.querySelector('[data-a-id="'+id+'"]'));
assert.ok([...article().querySelectorAll('.a-structured-needs .chip')].every(el=>el.textContent==='Reviewed'));
store.value.document=changed;document.body.innerHTML=studio.work();
assert.ok([...article().querySelectorAll('.a-structured-needs .chip')].every(el=>el.textContent==='Inputs changed · review needed'),'the actual Work renderer uses the canonical changed state');
let sent;
w.aiwInterfaceImpact={decorateAssistant(){},stageModel(command){sent=command;return true;}};
article().querySelector('[data-a-action="edit-needs"]').click();
const form=document.querySelector('#a-needs-form');assert.ok(form);
form.elements.assumptions.value='A later unreviewed assumption';
form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
assert.equal(sent?.type,'realisation.component');
assert.equal(sent.payload.assumptions,'A later unreviewed assumption');
assert.equal(Object.hasOwn(sent.payload,'assumptionsResolved'),false);
assert.equal(Object.hasOwn(sent.payload,'allocations'),false);
studio.dispose();
console.log('PASS the actual Chapter 5 Work chips and short editor submit the same governed partial-update payload.');

// Many structured needs share one editor. All mounted fields must remain live, and a
// source ID absent from today's options must survive until the user explicitly removes it.
const {fieldHTML,recordField}=await import('./public/record-fields.js');
document.body.innerHTML='<form>'+Array.from({length:25},(_,i)=>fieldHTML({name:'links-'+i,label:'Links '+i,kind:'ids'},['retained-'+i],{grouped:true,options:[{id:'new-'+i,title:'New record '+i}]})).join('')+'</form>';
await new Promise(resolve=>setTimeout(resolve,10));
for(const [i,box] of [...document.querySelectorAll('[data-pick]')].entries()){
 box.querySelector('[data-pick-add]').click();
 assert.deepEqual(new w.FormData(document.querySelector('form')).getAll('links-'+i),['retained-'+i,'new-'+i],'mounted picker '+i+' preserves previous IDs and adds an exact selected ID');
}
document.body.innerHTML='<form>'+recordField('technology.needs','grounds','REQ-001, missing-source',{project:p,item:'TN-001'})+'</form>';
const grounds=document.querySelector('[data-pick-value]');
assert.equal(grounds.name,'grounds:TN-001','per-need grounds retain their own payload key');
assert.equal(grounds.value,'REQ-001, missing-source');
const added=document.querySelector('[data-pick-add]');const chosen=added.dataset.pickAdd;added.click();
assert.equal(grounds.value,'REQ-001, missing-source, '+chosen,'searching and choosing preserve existing source IDs');
await w.happyDOM.close();
console.log('PASS all 25 mounted pickers remain operable; existing and missing source IDs survive selection; per-need grounds keep their exact field names.');
