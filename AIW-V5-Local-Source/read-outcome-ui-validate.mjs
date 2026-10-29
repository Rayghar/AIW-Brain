// Real native forms and change review under Happy DOM. No browser rendering,
// customer data, live provider response or measured runtime outcome is implied.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w=new Window({url:'https://aiw.test/?chapter=8&tab=work',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator','CSS'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
document.body.innerHTML='<main id="app"></main><aside id="brain-panel"></aside><div id="toast"></div>';
globalThis.fetch=async(_url,opts={})=>{assert.equal(opts.method||'GET','GET');return Response.json({configured:false,draft:null,runs:[],actorKey:'authored-fixture'});};
const {readOutcomeFixture}=await import('./read-outcome-fixtures.mjs');
const {DRIVER_JOURNEY_AT:at}=await import('./driver-led-journey-fixtures.mjs');
const {createInterfacesStudio}=await import('./public/interfaces-ui.js');
const {applyInterfacesCommand,interfaceFindings,interfaceReading,exportInterfacesMarkdown}=await import('./public/interfaces-domain.js');
const {applyQualityCommand}=await import('./public/quality-domain.js');
const {applyAlternativeCommand}=await import('./public/model-alternatives.js');
const {applyInterfaceImpact}=await import('./public/interface-impact.js');
const {operationDefaults,operationAnswers,validateOperationReferences}=await import('./public/design-planner.js');
const {operationContext}=await import('./public/architecture-operations.js');
const {architectureIntelligence}=await import('./public/architecture-intelligence.js');
const {assessContractExecution,contractExecutionContext}=await import('./public/architecture-applicability.js');
const {mountBrainContext,launchIntelligenceAction}=await import('./public/brain-context-ui.js');
const {sddDocument}=await import('./public/sdd-document.js');
const {document:p,ids}=readOutcomeFixture(),writes=[],notices=[];
const store={value:{document:p,revision:1},async command(c){writes.push(structuredClone(c));const r=c.type.startsWith('alternative.')?applyAlternativeCommand(store.value.document,c,at):c.type==='interfaces.apply-impact'?applyInterfaceImpact(store.value.document,c,at):applyInterfacesCommand(store.value.document,c,at);store.value={document:r.document,revision:store.value.revision+1};return {...r,revision:store.value.revision};}};
window.aiwProjectStore=store;
const state={chapter:8,tab:'work',selected:ids.contractId,visible:['physical','interface'],cursor:false};
window.aiwRoute=url=>{const query=new URL(url,location.href).searchParams;state.chapter=Number(query.get('chapter'));state.tab=query.get('tab');state.selected=query.get('object');return true;};
const bridge={state,render(){document.querySelector('#app').innerHTML=window.aiwInterfaceImpact?.banner()||'';},persist(){},toast:m=>notices.push(m),getNode:id=>({id,title:id}),setTab(tab){state.tab=tab;}};
const studio=createInterfacesStudio(store);studio.bind(bridge);
const q=s=>document.querySelector(s),click=s=>{const e=q(s);assert(e,s);e.click();},discard=()=>{q('[data-i-action="close"]')?.click();q('[data-i-action="discard"]')?.click();};
// The established Happy DOM harness restores authored selected attributes;
// this models the browser's selected-option behavior, not product behavior.
const restoreSelections=()=>{for(const select of q('#i-editor').querySelectorAll('select')){const option=select.querySelector('option[selected]');if(option)select.value=option.value;}};
const value=(name,v)=>{const e=q('#i-editor').elements.namedItem(name);assert(e,name);e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));return e;};
const waitFor=async(test,label)=>{for(let i=0;i<200;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}assert.fail(label+' '+q('#i-dialog-error')?.textContent+' '+q('.ip-error')?.textContent+' '+notices.join('; '));};
const get=(doc=store.value.document)=>doc.interfaces.contracts.find(c=>c.id===ids.contractId);
const open=field=>document.dispatchEvent(new CustomEvent('aiw:sdd-edit',{detail:{chapter:8,projectId:p.id,objectId:ids.contractId,editor:'contract',field}}));
try{
 for(const field of ['outcomeReadTaskId','outcomeFreshness','outcomeMaxAgeSeconds']){
  open('execution.'+field);restoreSelections();
  const el=q('#i-editor').elements.namedItem('execution.'+field);
  assert.equal(document.activeElement,el);assert(el.closest('details').open);assert.match(el.closest('details').textContent,/Freshness of the result read/);
  if(field==='outcomeReadTaskId'){assert.equal(el.value,ids.readTaskId);assert(![...el.options].some(o=>o.value===ids.contractId));}
  if(field==='outcomeMaxAgeSeconds'){assert.equal(el.type,'number');assert.equal(el.value,'30');assert.equal(el.getAttribute('aria-describedby'),'i-read-note');}
  discard();
 }
 assert.equal(writes.length,0);
 open('execution.outcomeMaxAgeSeconds');restoreSelections();
 const original=structuredClone(get()),taskHistory=structuredClone(p.coauthoring.designTasks);
 value('execution.outcomeMaxAgeSeconds',5);value('contractVersion','submission-v3');
 q('#i-editor').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await waitFor(()=>q('[data-ip-action="details"]'),'Result freshness preview');click('[data-ip-action="details"]');
 assert.deepEqual(get(),original,'A preview does not change the saved result contract');
 click('[data-ip-action="edit"]');await waitFor(()=>q('#i-editor'),'Edit exact freshness draft');restoreSelections();
 assert.equal(q('#i-editor').elements.namedItem('execution.outcomeMaxAgeSeconds').value,'5');
 assert.equal(q('#i-editor').elements.namedItem('execution.outcomeReadTaskId').value,ids.readTaskId);
 q('#i-editor').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await waitFor(()=>!q('#i-editor')&&q('[data-ip-action="details"]'),'Refined freshness preview');click('[data-ip-action="details"]');click('[data-ip-action="apply"]');
 assert.match(q('.ip-error').textContent,/Confirm/);q('[data-ip-confirm]').checked=true;click('[data-ip-action="apply"]');
 await waitFor(()=>!studio.busy&&!q('.ip-dialog'),'Accepted freshness contract');
 assert.equal(get().execution.outcomeMaxAgeSeconds,5);assert.equal(typeof get().execution.outcomeMaxAgeSeconds,'number');
 assert.equal(get().execution.outcomeReadTaskId,ids.readTaskId);assert.equal(get().execution.outcomeFreshness,'bounded');
 assert.deepEqual(store.value.document.coauthoring.designTasks,taskHistory,'Changing the consumer contract preserves the accepted read design and its history');
 const report=assessContractExecution(get(),contractExecutionContext(store.value.document,get()));
 assert.equal(report.state,'excluded');assert(report.blockers.some(c=>c.id==='outcome-read-age'));
 assert(interfaceFindings(store.value.document).some(f=>f.objectId===ids.contractId&&f.fieldKey==='execution.outcomeMaxAgeSeconds'));
 const reading=architectureIntelligence(store.value.document,{chapter:8,id:ids.contractId}),insight=reading.insights.find(i=>i.kind==='composition'),action=insight.actions[0];
 assert.equal(action.fieldKey,'execution.outcomeMaxAgeSeconds');
 mountBrainContext(store.value.document,{chapter:8,id:ids.contractId},'work');
 assert.equal(launchIntelligenceAction({projectId:p.id,subjectId:ids.contractId,chapter:8,insightId:insight.id,actionId:action.id,basisStamp:reading.receipt.basisStamp,knowledgeStamp:reading.receipt.knowledgeStamp}),true);
 assert.equal(document.activeElement.name,'execution.outcomeMaxAgeSeconds');discard();
 console.log('PASS result-read native disclosure, exact repair focus, typed numeric draft, impact/edit, explicit acceptance and immutable accepted read history');

 const operation={kind:'operation',operation:{kind:'interaction',title:'Review the result read',proposedObjects:[],verification:{steps:[]}},answers:{}};
 const defaults=operationDefaults(p,operation,ids.contractId);
 assert.equal(defaults['execution.outcomeMaxAgeSeconds'],'30');
 assert.equal(defaults['execution.outcomeReadTaskId'],ids.readTaskId);
 validateOperationReferences(p,'interaction',defaults,operation);
 for(const bad of ['0','-1','Infinity','31536001'])assert.throws(()=>operationAnswers('interaction',{...defaults,'execution.outcomeMaxAgeSeconds':bad}),/between/);
 assert.throws(()=>validateOperationReferences(p,'interaction',{...defaults,'execution.outcomeReadTaskId':ids.contractId},operation),/current records/);
 const changed=applyQualityCommand(p,{type:'quality.driver',payload:{id:ids.freshnessDriverId,targetValue:'5'}},at).document;
 assert.notEqual(interfaceReading(p,get(p)),interfaceReading(changed,get(changed)),'A changed linked driver reopens the native contract review');
 assert.notDeepEqual(operationContext(p,'interaction',defaults,operation),operationContext(changed,'interaction',defaults,operation),'A saved operation reads the exact current dependencies of its linked read design');
 const legacy={...defaults};for(const key of ['outcomeReadTaskId','outcomeFreshness','outcomeMaxAgeSeconds'])delete legacy['execution.'+key];
 assert.notDeepEqual(operationContext(p,'interaction',legacy,operation),operationContext(changed,'interaction',legacy,operation),'Older operation drafts inherit currentness from the saved target link');
 const md=sddDocument(store.value.document,{figures:false}).markdown;
 for(const text of ['Result read: '+ids.readTaskId,'maximum source age 5 seconds','Current reading: conflict','Accepted architecture obligations'])assert(md.includes(text),text);
 assert(exportInterfacesMarkdown(store.value.document).includes('5'));
 console.log('PASS coordinated-draft numeric defaults/reference guards, exact driver-change invalidation and main SDD result-read explanation');
}finally{studio.dispose();document.dispatchEvent(new CustomEvent('aiw:project-switched'));await w.happyDOM.abort();w.close();}
