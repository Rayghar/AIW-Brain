// Native editor/impact integration in a DOM harness, not a browser-layout or live-service test.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w=new Window({url:'https://aiw.test/?project=journey-museum&chapter=8&tab=work',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator','CSS'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
document.body.innerHTML='<main id="app"></main><aside id="brain-panel"></aside><div id="toast"></div>';
globalThis.fetch=async(url,opts={})=>{assert.equal(opts.method||'GET','GET');return Response.json({configured:false,draft:null,runs:[],actorKey:'synthetic-fixture'});};
const {executionJourneyFixture,JOURNEY_FIXTURE_AT:at}=await import('./execution-journey-fixtures.mjs');
const {createInterfacesStudio}=await import('./public/interfaces-ui.js');
const {applyInterfacesCommand}=await import('./public/interfaces-domain.js');
const {applyAlternativeCommand}=await import('./public/model-alternatives.js');
const {applyInterfaceImpact}=await import('./public/interface-impact.js');
const {executionJourney}=await import('./public/architecture-applicability.js');
const f=executionJourneyFixture(),[root,child]=f.ids.contractIds,old=f.document.interfaces.contracts.find(c=>c.id===child),declaration={...old.execution,backoffBudgetMs:0};delete declaration.invocationParentId;
const initial=applyInterfacesCommand(f.document,{type:'interfaces.contract',payload:{id:child,execution:declaration}},at).document,writes=[],notices=[];
const store={value:{document:initial,revision:1},async command(c){writes.push(structuredClone(c));const r=c.type.startsWith('alternative.')?applyAlternativeCommand(store.value.document,c,at):c.type==='interfaces.apply-impact'?applyInterfaceImpact(store.value.document,c,at):applyInterfacesCommand(store.value.document,c,at);store.value={document:r.document,revision:store.value.revision+1};return {...r,revision:store.value.revision};}};
window.aiwProjectStore=store;
const state={chapter:8,tab:'work',selected:child,visible:['physical','interface'],cursor:false},bridge={state,render(){document.querySelector('#app').innerHTML=window.aiwInterfaceImpact?.banner()||'';},persist(){},toast:m=>notices.push(m),getNode:id=>({id,title:id}),setTab(tab){state.tab=tab;}};
const studio=createInterfacesStudio(store);studio.bind(bridge);
const q=s=>document.querySelector(s),click=s=>{const e=q(s);assert(e,s);e.click();},get=()=>store.value.document.interfaces.contracts.find(c=>c.id===child),field=name=>q('#i-editor').elements.namedItem(name);
const waitFor=async(test,label)=>{for(let i=0;i<200;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}assert.fail(label+' '+q('#i-dialog-error')?.textContent+' '+q('.ip-error')?.textContent+' '+notices.join('; '));};
// Restore authored selected attributes after Happy DOM 20 parses the form.
const restoreSelections=()=>{for(const select of q('#i-editor').querySelectorAll('select')){const selected=select.querySelector('option[selected]');if(selected)select.value=selected.value;}};
try{
 const before=JSON.stringify(get());
 document.dispatchEvent(new CustomEvent('aiw:sdd-edit',{detail:{chapter:8,projectId:initial.id,objectId:child,editor:'contract',field:'execution.invocationParentId'}}));
 assert.equal(document.activeElement,field('execution.invocationParentId'));assert(field('execution.invocationParentId').closest('details').open);
 assert([...field('execution.invocationParentId').options].some(o=>o.value===root));assert(![...field('execution.invocationParentId').options].some(o=>o.value===child));
 assert.match(field('execution.invocationParentId').closest('details').textContent,/once per parent attempt/);
 restoreSelections();field('execution.invocationParentId').value=root;field('execution.invocationParentId').dispatchEvent(new Event('change',{bubbles:true}));
 q('#i-editor').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>q('[data-ip-action="details"]'),'Native impact preview');click('[data-ip-action="details"]');
 assert.equal(JSON.stringify(get()),before,'Preview retains canonical facts');
 click('[data-ip-action="edit"]');await waitFor(()=>q('#i-editor'),'Return to exact native declaration');restoreSelections();
 assert.equal(field('execution.invocationParentId').value,root);assert.equal(field('execution.backoffBudgetMs').value,'0');
 q('#i-editor').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>!q('#i-editor')&&q('[data-ip-action="details"]'),'Revised native preview');click('[data-ip-action="details"]');
 click('[data-ip-action="apply"]');assert.match(q('.ip-error').textContent,/Confirm/);
 q('[data-ip-confirm]').checked=true;click('[data-ip-action="apply"]');await waitFor(()=>!studio.busy&&!q('.ip-dialog'),'Reviewed acceptance');
 assert.equal(get().execution.invocationParentId,root);assert.equal(get().execution.backoffBudgetMs,0);
 const journey=executionJourney(store.value.document,root);assert(journey.ready);assert.equal(journey.calculations.find(c=>c.kind==='nested-attempts').value,24);assert(journey.obligations.every(o=>o.verification==='pending'));
 assert(writes.some(c=>c.type==='interfaces.apply-impact'&&c.payload.reviewed===true));
 console.log('PASS exact native parent picker/focus, explanatory disclosure, preview/edit retention, explicit zero, reviewed acceptance and shared journey recalculation');
}finally{studio.dispose();document.dispatchEvent(new CustomEvent('aiw:project-switched'));await w.happyDOM.abort();w.close();}
