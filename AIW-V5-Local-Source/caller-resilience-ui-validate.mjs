// Exercise the existing native contract editor and impact review. No rendered browser or provider.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w=new Window({url:'https://aiw.test/?project=execution-composition-fixture&chapter=8&tab=work',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator','CSS'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
document.body.innerHTML='<main id="app"></main><aside id="brain-panel"></aside><div id="toast"></div>';
globalThis.fetch=async(url,opts={})=>{assert.equal(opts.method||'GET','GET');return Response.json({configured:false,draft:null,runs:[],actorKey:'fixture'});};
const {executionCompositionFixture,EXECUTION_FIXTURE_AT:at}=await import('./execution-composition-fixtures.mjs');
const {createInterfacesStudio}=await import('./public/interfaces-ui.js');
const {applyInterfacesCommand}=await import('./public/interfaces-domain.js');
const {applyAlternativeCommand}=await import('./public/model-alternatives.js');
const {applyInterfaceImpact}=await import('./public/interface-impact.js');
const {assessContractExecution,contractExecutionContext}=await import('./public/architecture-applicability.js');
const {document:p,ids:{contractId}}=executionCompositionFixture(),writes=[],notices=[];
const store={value:{document:p,revision:1},async command(c){writes.push(structuredClone(c));const r=c.type.startsWith('alternative.')?applyAlternativeCommand(store.value.document,c,at):c.type==='interfaces.apply-impact'?applyInterfaceImpact(store.value.document,c,at):applyInterfacesCommand(store.value.document,c,at);store.value={document:r.document,revision:store.value.revision+1};return {...r,revision:store.value.revision};}};
window.aiwProjectStore=store;
const state={chapter:8,tab:'work',selected:contractId,visible:['physical','interface'],cursor:false};
const bridge={state,render(){document.querySelector('#app').innerHTML=window.aiwInterfaceImpact?.banner()||'';},persist(){},toast:m=>notices.push(m),getNode:id=>({id,title:id}),setTab(tab){state.tab=tab;}};
const studio=createInterfacesStudio(store);studio.bind(bridge);
const q=s=>document.querySelector(s),click=s=>{const e=q(s);assert(e,s);e.click();},value=(name,v)=>{const e=q('#i-editor').elements.namedItem(name);assert(e,name);e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));return e;};
const waitFor=async(test,label)=>{for(let i=0;i<200;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}assert.fail(label+' '+q('#i-dialog-error')?.textContent+' '+q('.ip-error')?.textContent+' '+notices.join('; ')+' '+[...document.querySelectorAll('[aria-invalid=true]')].map(e=>e.name+': '+e.validationMessage).join('; '));};
const get=()=>store.value.document.interfaces.contracts.find(c=>c.id===contractId);
// Happy DOM 20's HTML parser loses later option[selected] state (even in a bare
// select). Restore the authored selected attributes before exercising the form;
// this is a DOM-harness limitation, not a replacement production code path.
const restoreSelections=()=>{for(const select of q('#i-editor').querySelectorAll('select')){const selected=select.querySelector('option[selected]');if(selected)select.value=selected.value;}};
try{
 const initial=JSON.stringify(get());
 document.dispatchEvent(new CustomEvent('aiw:sdd-edit',{detail:{chapter:8,projectId:p.id,objectId:contractId,editor:'contract',field:'execution.backoffBudgetMs'}}));
 assert.equal(document.activeElement,q('#i-editor').elements.namedItem('execution.backoffBudgetMs'));
 assert(q('#i-editor').elements.namedItem('execution.backoffBudgetMs').closest('details').open);
 restoreSelections();for(const name of ['from','to'])assert.equal(q('#i-editor').elements.namedItem(name).value,get()[name],name+' retains its saved native participant');
 value('kind','request');
 for(const [k,v] of Object.entries({callerRetries:'bounded',maxAttempts:3,attemptTimeoutMs:200,backoffBudgetMs:0,callerBudgetMs:600,retryFailures:'transient-only',retryLayers:'one-owner',circuitBreaker:'caller',openCircuit:'stop'}))value('execution.'+k,v);
 const delay=q('#i-editor').elements.namedItem('execution.backoffBudgetMs');assert.equal(delay.type,'number');assert.equal(delay.min,'0');assert.equal(delay.value,'0');
 q('#i-editor').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>q('[data-ip-action="details"]'),'Native impact preview');click('[data-ip-action="details"]');assert(q('.ip-dialog'));
 assert.equal(JSON.stringify(get()),initial,'Preview must leave the saved execution contract unchanged');
 click('[data-ip-action="edit"]');await waitFor(()=>q('#i-editor'),'Return to native contract');
 restoreSelections();
 assert.equal(q('#i-editor').elements.namedItem('execution.backoffBudgetMs').value,'0');
 assert.equal(q('#i-editor').elements.namedItem('execution.maxAttempts').value,'3');
 console.log('PASS native caller fields accept typed numeric input and retain explicit zero through impact preview and edit');
 q('#i-editor').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>!q('#i-editor')&&q('[data-ip-action="details"]'),'Revised preview');click('[data-ip-action="details"]');assert(q('.ip-dialog'));
 click('[data-ip-action="apply"]');assert.match(q('.ip-error').textContent,/Confirm/);
 q('[data-ip-confirm]').checked=true;click('[data-ip-action="apply"]');await waitFor(()=>!studio.busy&&!q('.ip-dialog'),'Reviewed acceptance');
 assert.equal(get().execution.backoffBudgetMs,0);assert.equal(typeof get().execution.maxAttempts,'number');assert.equal(get().execution.callerBudgetMs,600);
 const result=assessContractExecution(get(),contractExecutionContext(store.value.document,get()));assert.equal(result.state,'context-match');assert.equal(result.calculations[0].value,600);assert(result.obligations.every(o=>o.verification==='pending'));
 assert(writes.some(c=>c.type==='interfaces.apply-impact'&&c.payload.reviewed===true));
 console.log('PASS explicit native impact review saves exact numbers, recomputes the bounded composition and keeps verification pending');
}finally{studio.dispose();document.dispatchEvent(new CustomEvent('aiw:project-switched'));await w.happyDOM.abort();w.close();}
