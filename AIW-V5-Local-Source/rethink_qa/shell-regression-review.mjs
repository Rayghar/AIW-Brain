// Real chapter controls against the local Worker and DOM. This verifies navigation,
// not pixels or approval of the reference architecture.
import assert from 'node:assert/strict';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const w = new Window({url: 'https://aiw.test/?chapter=1&tab=work&section=requirement', width: 1440, height: 900});
for (const key of ['window', 'document', 'history', 'location', 'localStorage', 'CustomEvent', 'Event', 'FormData', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'MutationObserver', 'ResizeObserver', 'navigator']) {
  Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
}
for (const key of ['matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = w[key].bind(w);
document.body.innerHTML = '<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
const {default: worker} = await import('../worker.js');
const {localDatabase} = await import('../local-db.js');
const env = {DB: localDatabase(':memory:'), FILES: {async put() {}, async get() {return null;}, async delete() {}}, ASSETS: {fetch: () => new Response('asset')}};
let writes = 0;
globalThis.fetch = (path, options = {}) => {
  if (options.method && !['GET', 'HEAD'].includes(options.method)) writes++;
  return worker.fetch(new Request(new URL(path, 'https://aiw.test'), {...options, headers: {...options.headers, 'oai-authenticated-user-id': 'work-sections-test', Origin: 'https://aiw.test'}}), env);
};
const errors = [];
w.addEventListener('error', event => errors.push(event.message));
const q = selector => document.querySelector(selector);
const waitFor = async (predicate, label) => {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw Error(label);
};
const click = selector => {
  const button = q(selector); assert(button, 'Missing control: ' + selector); button.click();
};

const observations={selection:{},sol:[],errors};
try{
 await import('../public/entry.js');
 await waitFor(()=>q('.work-view[data-work-chapter="1"][data-work-section="requirement"]'),'Initial requirements Work');
 await (await import('../public/workspace-ux.js')).brainReady();
 const before=JSON.stringify(window.aiwProjectStore.value.document),writeBaseline=writes;
 const names=[...document.querySelectorAll('.r-record-main[data-r-select]')].slice(0,2).map(b=>b.dataset.rSelect);
 click(`[data-r-details="${names[0]}"]`);
 observations.selection.first={id:names[0],panel:document.body.dataset.panel,expanded:q('[data-panel-toggle]').getAttribute('aria-expanded')};
 click('[data-panel-toggle]');
 observations.selection.closed=document.body.dataset.panel;
 click(`[data-r-details="${names[0]}"]`);
 observations.selection.sameDetailsClick={panel:document.body.dataset.panel,selected:new URLSearchParams(location.search).get('object'),inspectorHidden:q('#inspector').getAttribute('aria-hidden')};
 click(`[data-r-details="${names[1]}"]`);
 observations.selection.otherDetailsClick={id:names[1],panel:document.body.dataset.panel};
 observations.selection.closeInsideInspector=!!q('#inspector [data-panel-toggle],#inspector [data-panel-close]');
 observations.nativeReplacement=[];
 for(const [ch,selector] of [[2,'[data-q-context]'],[3,'[data-d-node]'],[6,'[data-t-action="lens"]'],[7,'[data-tr-action="lens"]'],[8,'[data-i-action="lens"]'],[9,'[data-sec-action="lens"]'],[10,'[data-rt-action="lens"]'],[11,'[data-rv-action="lens"]']]){
  click(`a.chapter-item[data-chapter="${ch}"]`);
  await waitFor(()=>q(`.work-view[data-work-chapter="${ch}"]`),'Native replacement Work chapter '+ch);
  if(ch===2){click('[data-q-section="scenarios"]');click('[data-q-select]');}
  const native=q(selector);
  if(!native){observations.nativeReplacement.push({chapter:ch,selector,available:false});continue;}
  if(document.body.dataset.panel==='collapsed')click('.workspace-tools [data-panel-toggle]');
  native.click();
  await new Promise(resolve=>setTimeout(resolve,20));
  const record={chapter:ch,selector,available:true,closeInsideInspector:!!q('#inspector > .panel-dismiss'),panel:document.body.dataset.panel};
  if(q('#inspector > .panel-dismiss')){click('#inspector > .panel-dismiss');record.dismissed=document.body.dataset.panel==='collapsed';record.focusReturned=document.activeElement===q('.workspace-tools [data-panel-toggle]');click('.workspace-tools [data-panel-toggle]');record.reopened=document.body.dataset.panel==='open';}
  observations.nativeReplacement.push(record);
 }

 for(let ch=1;ch<=11;ch++){
  click(`a.chapter-item[data-chapter="${ch}"]`);
  await waitFor(()=>q(`.work-view[data-work-chapter="${ch}"]`),'Work chapter '+ch);
  click('[data-workspace-sol]');
  await waitFor(()=>q('#brain-panel:not([hidden])'),'Sol opens chapter '+ch);
  const native=q('#brain-panel .brain-native');
  observations.sol.push({chapter:ch,open:true,native:!!native,context:q('#brain-panel #brain-title')?.textContent,actions:native?[...native.querySelectorAll('button')].map(b=>b.textContent.trim()).slice(0,5):[],error:q('#brain-panel .brain-error')?.textContent||''});
  click('#brain-panel [data-brain-action="close"]');
 }
 observations.projectUnchanged=JSON.stringify(window.aiwProjectStore.value.document)===before;
 observations.writesAfterInitialization=writes-writeBaseline;
 console.log(JSON.stringify(observations,null,2));
 const {writeFile}=await import('node:fs/promises');await writeFile(new URL('./shell-regression-review-results.json',import.meta.url),JSON.stringify(observations,null,2));
}finally{await w.happyDOM.close();}
