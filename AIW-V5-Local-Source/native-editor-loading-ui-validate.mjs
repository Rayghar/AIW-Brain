// Controlled module arrival and native DOM state. No browser, HTTP listener or provider.
import assert from 'node:assert/strict';
import {createProject} from './shared/projects-domain.js';
const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
const w=new Window({url:'https://aiw.test/?chapter=8&tab=work'});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
const {createDeferredInterfaceImpactWorkspace,createDeferredExchangeTaskWorkspace}=await import('./public/workspace-ux.js');
const base=createProject({name:'Native loading',template:'bank-payment'},'native-loading');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup(){
 document.body.innerHTML='';const store={value:{document:structuredClone(base),revision:1}},notices=[],b={state:{chapter:8,tab:'work',selected:'rest'},toast:message=>notices.push(message)},calls=[];
 let created=0,disposed=0;
 const module={createInterfaceImpactWorkspace(options){created++;let pending=false;const instance={stage(command){calls.push(command);pending=true;options.onStage();return true;},loadAlternative(id){calls.push(id);pending=true;return true;},previewInChapter:()=>pending,commandFor:()=>null,decorate:g=>g,objectContext:()=>'',explanation:()=>null,banner:()=>'',reminder:()=>'',open(){},edit(){},dismiss(){pending=false;},get pending(){return pending},get busy(){return false},get document(){return pending?store.value.document:null},dispose(){disposed++;}};window.aiwInterfaceImpact=instance;return instance;}};
 return {store,b,calls,notices,module,options:{store,bridge:()=>b,onStage(){calls.push('staged')},onEdit(){},onApplied(){}},get created(){return created},get disposed(){return disposed}};
}
function editor(value='Unsaved purpose'){const el=document.createElement('dialog');el.setAttribute('open','');el.innerHTML='<header>Native editor</header><div role="alert" hidden></div><form><input name="purpose"></form>';el.querySelector('input').value=value;document.body.append(el);return el;}
const command={type:'interfaces.contract',payload:{id:'rest',purpose:'Proposed purpose'}};
// No eager module work, and every synchronous graph/read method remains usable.
let x=setup(),gate=deferred(),loads=0,impact=createDeferredInterfaceImpactWorkspace(x.options,()=>{loads++;return gate.promise;});
const graph={nodes:[],edges:[]};assert.equal(loads,0);assert.equal(impact.pending,false);assert.equal(impact.document,null);assert.equal(impact.previewInChapter(8),false);assert.equal(impact.decorate(graph),graph);assert.equal(impact.banner(),'');assert.equal(impact.commandFor('interfaces.contract','rest'),null);
const el=editor(),staging=impact.stage(command);assert.equal(impact.busy,true);await tick();assert.equal(loads,1);assert.equal(x.created,0);el.querySelector('input').value='Typed while loading';gate.resolve(x.module);assert.match(await staging,/editor changed/);assert.equal(x.created,0);assert.deepEqual(x.calls,[]);assert.equal(el.querySelector('input').value,'Typed while loading');assert.equal(impact.busy,false);
assert.equal(await impact.stage(command),true);assert.equal(x.created,1);assert.equal(window.aiwInterfaceImpact,impact);assert.equal(impact.pending,true);assert.equal(impact.document,x.store.value.document);impact.dispose();assert.equal(x.disposed,1);assert.equal(window.aiwInterfaceImpact,undefined);
// Late module arrival cannot act after project/revision/selection/editor replacement or disposal.
for(const change of ['project','revision','selection','editor','editor-step','disposed']){
 x=setup();gate=deferred();impact=createDeferredInterfaceImpactWorkspace(x.options,()=>gate.promise);const original=editor(),pending=impact.stage(command);
 if(change==='project')x.store.value.document.id='another-project';
 if(change==='revision')x.store.value.revision++;
 if(change==='selection')x.b.state.selected='instruction';
 if(change==='editor'){original.remove();editor('Newer editor input');}
 if(change==='editor-step')original.querySelector('form').hidden=true;
 let replacement;if(change==='disposed'){impact.dispose();assert.equal(impact.busy,false);replacement=createDeferredInterfaceImpactWorkspace(x.options,async()=>x.module);}
 gate.resolve(x.module);assert.equal(typeof await pending,'string');assert.equal(x.created,0,change);assert.deepEqual(x.calls,[],change);
 if(replacement){assert.equal(window.aiwInterfaceImpact,replacement);replacement.dispose();}else impact.dispose();
}
// A failed import is retryable. stageModel awaits actual staging, never returns a Promise as success or falls through after cancellation.
x=setup();loads=0;impact=createDeferredInterfaceImpactWorkspace(x.options,()=>++loads===1?Promise.reject(Error('Synthetic offline module')):Promise.resolve(x.module));editor();
assert.match(await impact.stage(command),/Synthetic offline/);assert.equal(x.created,0);assert.equal(impact.busy,false);assert.equal(await impact.stage(command),true);assert.equal(loads,2);impact.dispose();
x=setup();gate=deferred();impact=createDeferredInterfaceImpactWorkspace(x.options,()=>gate.promise);let finished=0;
assert.equal(await impact.stageModel({type:'logical.scenario',payload:{}},()=>finished++),null);assert.equal(x.created,0);
const modelStage=impact.stageModel({type:'logical.responsibility',payload:{id:'api',purpose:'Reviewed purpose'}},()=>finished++);assert.equal(finished,0);gate.resolve(x.module);assert.equal(await modelStage,true);assert.equal(finished,1);impact.dispose();
x=setup();gate=deferred();impact=createDeferredInterfaceImpactWorkspace(x.options,()=>gate.promise);const cancelled=impact.stageModel({type:'logical.responsibility',payload:{id:'api'}},()=>finished++);impact.dispose();gate.resolve(x.module);assert.equal(typeof await cancelled,'string');assert.equal(finished,1);
console.log('PASS deferred impact: synchronous unloaded readings, first-action load, retry, exact project/revision/selection/editor guards, typed-input retention, disposed arrival, global API continuity and awaited stageModel.');
// Exchange guidance loads in the existing dialog and retries there without replacing its inputs.
x=setup();loads=0;let exchangeCreates=0,decorations=0,opened=[];
const exchangeModule={createExchangeTaskWorkspace(){exchangeCreates++;const instance={decorateAssistant(host){decorations++;const entry=document.createElement('section');entry.className='dc-entry';entry.textContent='Guided exchange design';host.append(entry);},openTask:id=>opened.push(id),dispose(){},get busy(){return false},get opening(){return false}};window.aiwExchangeTask=instance;return instance;}};
let exchange=createDeferredExchangeTaskWorkspace({...x.options,openSol(){}},()=>++loads===1?Promise.reject(Error('Synthetic exchange load failure')):Promise.resolve(exchangeModule));
assert.equal(loads,0);const host=editor('Keep my private input');exchange.decorateAssistant(host,'sol');assert.match(host.querySelector('[role="status"]').textContent,/Opening/);await tick();const retry=host.querySelector('[role="status"] button');assert(retry);retry.click();await tick();assert.equal(exchangeCreates,1);assert.equal(decorations,1);assert.equal(host.querySelector('input').value,'Keep my private input');assert.equal(window.aiwExchangeTask,exchange);assert.equal(host.querySelector('[role="status"]'),null);exchange.dispose();
// A first direct task open is also bound to its initiating context, and can resume after a cancelled arrival.
x=setup();gate=deferred();exchangeCreates=0;opened=[];exchange=createDeferredExchangeTaskWorkspace({...x.options,openSol(){}},()=>gate.promise);
const open=exchange.openTask('DES-007');assert.equal(exchange.busy,true);x.b.state.selected='instruction';gate.resolve(exchangeModule);await open;assert.equal(exchangeCreates,0);assert.deepEqual(opened,[]);assert.equal(exchange.busy,false);
await exchange.openTask('DES-007');assert.equal(exchangeCreates,1);assert.deepEqual(opened,['DES-007']);exchange.dispose();
console.log('PASS deferred exchange: no startup load, in-dialog failure/retry, preserved native input, global API continuity, cancelled stale opening and exact task resume.');
await w.happyDOM.close();
