// Actual native form/actions under Happy DOM; no rendered browser or provider.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w=new Window({url:'https://aiw.test/?project=execution-composition-fixture&chapter=8&tab=work',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator','CSS'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
document.body.innerHTML='<main id="app"></main><aside id="brain-panel"></aside><div id="toast"></div>';
globalThis.fetch=async(url,opts={})=>{assert.equal(opts.method||'GET','GET');return Response.json({configured:false,draft:null,runs:[],actorKey:'fixture'});};
const {outcomeContractFixture,OUTCOME_FIXTURE_AT:at}=await import('./outcome-contract-fixtures.mjs');
const {createInterfacesStudio}=await import('./public/interfaces-ui.js');
const {applyInterfacesCommand,interfaceFindings}=await import('./public/interfaces-domain.js');
const {applyAlternativeCommand}=await import('./public/model-alternatives.js');
const {applyInterfaceImpact}=await import('./public/interface-impact.js');
const {architectureIntelligence}=await import('./public/architecture-intelligence.js');
const {mountBrainContext,launchIntelligenceAction}=await import('./public/brain-context-ui.js');
const {mountValidationWorkspace}=await import('./public/validation-workspace.js');
const {document:p,ids}=outcomeContractFixture(),writes=[],notices=[];
const store={value:{document:p,revision:1},async command(c){writes.push(structuredClone(c));const r=c.type.startsWith('alternative.')?applyAlternativeCommand(store.value.document,c,at):c.type==='interfaces.apply-impact'?applyInterfaceImpact(store.value.document,c,at):applyInterfacesCommand(store.value.document,c,at);store.value={document:r.document,revision:store.value.revision+1};return {...r,revision:store.value.revision};}};
window.aiwProjectStore=store;
const state={chapter:8,tab:'work',selected:ids.contractId,visible:['physical','interface'],cursor:false};
const bridge={state,render(){document.querySelector('#app').innerHTML=window.aiwInterfaceImpact?.banner()||'';},persist(){},toast:m=>notices.push(m),getNode:id=>({id,title:id}),setTab(tab){state.tab=tab;}};
const studio=createInterfacesStudio(store);studio.bind(bridge);
window.aiwRoute=url=>{const query=new URL(url,location.href).searchParams;state.chapter=Number(query.get('chapter'));state.tab=query.get('tab');state.selected=query.get('object');return true;};
const q=s=>document.querySelector(s),click=s=>{const e=q(s);assert(e,s);e.click();},discard=()=>{q('[data-i-action="close"]')?.click();q('[data-i-action="discard"]')?.click();};
const restoreSelections=()=>{for(const select of q('#i-editor').querySelectorAll('select')){const option=select.querySelector('option[selected]');if(option)select.value=option.value;}}; // Happy DOM parser limitation, same as the existing caller harness.
const value=(name,v)=>{const e=q('#i-editor').elements.namedItem(name);assert(e,name);e.value=String(v);e.dispatchEvent(new Event('change',{bubbles:true}));return e;};
const waitFor=async(test,label)=>{for(let i=0;i<200;i++){if(test())return;await new Promise(r=>setTimeout(r,10));}assert.fail(label+' '+q('#i-dialog-error')?.textContent+' '+q('.ip-error')?.textContent+' '+notices.join('; '));};
const get=()=>store.value.document.interfaces.contracts.find(c=>c.id===ids.contractId);
try{
 for(const [type,payload,target,field,editor] of [
  ['interfaces.contract',{id:ids.outcomeContractId,kind:'batch'},ids.outcomeContractId,'kind','contract'],
  ['interfaces.data',{id:ids.resultDataId,authorityId:ids.producer},ids.resultDataId,'authorityId','data']
 ]){
  store.value.document=applyInterfacesCommand(p,{type,payload},at).document;state.selected=ids.contractId;state.tab='work';
  mountBrainContext(store.value.document,{chapter:8,id:ids.contractId},'work');
  const reading=architectureIntelligence(store.value.document,{chapter:8,id:ids.contractId}),insight=reading.insights.find(i=>i.kind==='composition'),action=insight.actions[0];
  assert.equal(action.objectId,target);assert.equal(action.fieldKey,field);
  const request={projectId:p.id,subjectId:ids.contractId,chapter:8,insightId:insight.id,actionId:action.id,basisStamp:reading.receipt.basisStamp,knowledgeStamp:reading.receipt.knowledgeStamp};
  assert.equal(launchIntelligenceAction({...request,basisStamp:'earlier'}),false);assert(!q('dialog[open]'));
  assert.equal(launchIntelligenceAction(request),true);assert.equal(state.selected,target);assert.equal(document.activeElement.name,field);assert(q(editor==='data'?'#i-data-form':'#i-editor'));discard();
  state.tab='validate';state.selected=ids.contractId;document.querySelector('#app').innerHTML=studio.validation();
  const finding=interfaceFindings(store.value.document).find(f=>f.code==='execution'&&f.objectId===ids.contractId);assert.equal(finding.target.objectId,target);
  mountValidationWorkspace(q('#app'));click('[data-validation-select="chapter:'+finding.id+'"]');
  click('[data-i-action="fix"][data-i-id="'+finding.id+'"]');assert.equal(state.tab,'work');assert.equal(state.selected,target);assert.equal(document.activeElement.name,field);discard();
 }
 assert.equal(writes.length,0);
 console.log('PASS current guidance and Validate remedies open the exact linked contract or data authority field; stale guidance and read-only navigation cannot write');

 store.value.document=p;state.tab='work';state.selected=ids.contractId;
 const event=()=>document.dispatchEvent(new CustomEvent('aiw:sdd-edit',{detail:{chapter:8,projectId:p.id,objectId:ids.contractId,editor:'contract',field:'execution.outcomeContractId'}}));event();restoreSelections();
 const original=JSON.stringify(get()),link=q('#i-editor').elements.namedItem('execution.outcomeContractId');
 assert(![...link.options].some(o=>o.value===ids.contractId));assert(q('#i-outcome-fields option[value="business_state"]'));
 value('execution.outcomeResultKey','authored_state');value('execution.outcomeContractId','');assert.equal(q('#i-outcome-fields').children.length,0);assert.equal(q('#i-editor').elements.namedItem('execution.outcomeResultKey').value,'authored_state');
 value('execution.outcomeContractId',ids.outcomeContractId);assert(q('#i-outcome-fields option[value="business_state"]'));assert.equal(q('#i-editor').elements.namedItem('execution.outcomeResultKey').value,'authored_state');
 value('execution.outcomeResultKey','business_state');value('execution.outcomeCorrelation','same-operation');value('execution.outcomeMeaning','business-outcome');value('contractVersion','submission-v2');
 const form=q('#i-editor');event();assert.equal(q('#i-editor'),form);assert(!q('.l-discard').hidden);click('[data-i-action="keep"]');
 form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>q('[data-ip-action="details"]'),'Native outcome preview');click('[data-ip-action="details"]');assert.equal(JSON.stringify(get()),original);click('[data-ip-action="edit"]');await waitFor(()=>q('#i-editor'),'Native outcome edit');restoreSelections();
 for(const [name,v] of Object.entries({outcomeContractId:ids.outcomeContractId,outcomeCorrelation:'same-operation',outcomeMeaning:'business-outcome',outcomeResultKey:'business_state'}))assert.equal(q('#i-editor').elements.namedItem('execution.'+name).value,v);
 q('#i-editor').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>!q('#i-editor')&&q('[data-ip-action="details"]'),'Revised outcome preview');click('[data-ip-action="details"]');click('[data-ip-action="apply"]');assert.match(q('.ip-error').textContent,/Confirm/);q('[data-ip-confirm]').checked=true;click('[data-ip-action="apply"]');await waitFor(()=>!studio.busy&&!q('.ip-dialog'),'Accepted outcome change');
 assert.equal(get().contractVersion,'submission-v2');assert.deepEqual(get().execution,p.interfaces.contracts.find(c=>c.id===ids.contractId).execution);assert(writes.some(c=>c.type==='interfaces.apply-impact'&&c.payload.reviewed));
 console.log('PASS exact result choices and authored field text survive changing suggestions, dirty navigation, preview/edit and explicit native acceptance');
}finally{studio.dispose();document.dispatchEvent(new CustomEvent('aiw:project-switched'));await w.happyDOM.abort();w.close();}
