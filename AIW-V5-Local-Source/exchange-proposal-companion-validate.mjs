// Exercise the native studio, shell and Exchange Model together. A contract is
// drawn as a message, so proposal review must not depend on a graph-node specimen.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w = new Window({url:'https://aiw.test/?chapter=8&tab=work',width:1440,height:1000});
for (const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator']) {
  Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
}
for (const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame']) globalThis[key]=w[key].bind(w);
document.body.innerHTML='<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
const {default:worker}=await import('./worker.js');
const {localDatabase}=await import('./local-db.js');
const env={DB:localDatabase(':memory:'),FILES:{async put(){},async get(){return null;},async delete(){}},ASSETS:{fetch:()=>new Response('asset')}};
let writes=0;
globalThis.fetch=(path,options={})=>{
  if(options.method&&!['GET','HEAD'].includes(options.method))writes++;
  return worker.fetch(new Request(new URL(path,'https://aiw.test'),{...options,headers:{...options.headers,'oai-authenticated-user-id':'exchange-proposal-regression',Origin:'https://aiw.test'}}),env);
};
const q=selector=>document.querySelector(selector),errors=[];
w.addEventListener('error',event=>errors.push(event.message));
const waitFor=async(predicate,label)=>{for(let i=0;i<200;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error(label);};
const click=selector=>{const el=q(selector);assert(el,'Missing control: '+selector);el.click();};
try{
  await import('./public/entry.js');
  await waitFor(()=>q('[data-i-action="new-contract"]'),'Chapter 8 Work loads');
  const p=window.aiwProjectStore.value.document,contract=p.interfaces.contracts[0],data=p.interfaces.data[0],before=JSON.stringify(p),writeBaseline=writes;
  // This is the same native rule-preview entry used by the Co-design panel.
  for(const [key,record] of [['reference',contract],['lifecycle',data]]){
    window.aiwLogicalStudio.preview(key,record.id);
    await waitFor(()=>q('.cm [data-ex="lens"]'),'Native Data flow opens');
    if(q('[data-panel-toggle]').getAttribute('aria-expanded')!=='true')click('[data-panel-toggle]');
    await waitFor(()=>q(`[data-interface-proposal="${record.id}"]`),'Active proposal reaches the Model companion');
    assert.equal(q('[data-ex="view"][data-id="data"]').getAttribute('aria-pressed'),'true','the native Data flow view is retained');
    if(key==='reference')assert(q(`.cm-mvl[data-sel="${record.id}"]`),'the proposal contract is drawn as a message');
    assert.equal(document.querySelectorAll('#inspector [data-i-action="edit-ghost"]').length,1,'one native proposal review command');
    assert.equal(document.querySelectorAll('#inspector [data-i-action="dismiss"]').length,1,'one native proposal dismissal command');
    assert.match(q('[data-interface-proposal]').textContent,/Unsaved proposal/);
    assert.match(q('[data-interface-proposal]').textContent,/does not establish provider agreement/);
    click('#inspector [data-i-action="edit-ghost"]');
    await waitFor(()=>q('.i-dialog form'),'Native proposal editor opens');
    assert.equal(q('.i-dialog [name="title"]').value,record.title,'editor retains the proposed record');
    click('.i-dialog [data-i-action="close"]');
    await waitFor(()=>!q('.i-dialog'),'Unchanged editor closes');
    // Closing/reopening the optional companion must keep the pending review.
    click('[data-panel-toggle]');click('[data-panel-toggle]');
    await waitFor(()=>q('#inspector [data-i-action="dismiss"]'),'Proposal survives companion reopening');
    click('#inspector [data-i-action="dismiss"]');
    await waitFor(()=>!window.aiwLogicalStudio.proposal&&!q('[data-interface-proposal]'),'Dismiss returns to saved Model details');
    assert.equal(JSON.stringify(window.aiwProjectStore.value.document),before,'review, cancel and dismissal leave saved architecture unchanged');
    assert.equal(writes,writeBaseline,'review does not submit a command');
  }
  assert.deepEqual(errors,[]);
  console.log('PASS native Chapter 8 contract-edge and data proposals: one review/dismiss path, native editor, companion reopen, dismissal, no writes or fact changes.');
}finally{
  // Let the native view's debounced resize finish before destroying its DOM.
  await new Promise(resolve=>setTimeout(resolve,180));
  await w.happyDOM.close();
}
