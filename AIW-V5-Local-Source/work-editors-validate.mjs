// Real chapter controls against the local Worker and DOM. This verifies navigation,
// not pixels or approval of the reference architecture.
import assert from 'node:assert/strict';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const w = new Window({url: 'https://aiw.test/?chapter=6&tab=work&section=dependencies', width: 1440, height: 900});
for (const key of ['window', 'document', 'history', 'location', 'localStorage', 'CustomEvent', 'Event', 'FormData', 'Node', 'Element', 'HTMLElement', 'SVGElement', 'MutationObserver', 'ResizeObserver', 'navigator']) {
  Object.defineProperty(globalThis, key, {value: key === 'window' ? w : w[key], configurable: true, writable: true});
}
for (const key of ['matchMedia', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = w[key].bind(w);
document.body.innerHTML = '<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
const {default: worker} = await import('./worker.js');
const {localDatabase} = await import('./local-db.js');
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

const cases=[
 [4,'l-stage','responsibilities','[data-l-action="new"]','l'],[4,'l-stage','connections','[data-l-action="connect"]','l'],[4,'l-stage','mappings','[data-l-action="map"]','l'],[4,'l-stage','groups','[data-l-action="new-group"]','l'],
 [5,'a-stage','components','[data-a-action="new"]','a'],[5,'a-stage','interactions','[data-a-action="connect"]','a'],[5,'a-stage','technology','[data-a-action="edit-needs"]','a'],
 [6,'t-stage','capabilities','[data-t-action="new"]','t'],[6,'t-stage','dependencies','[data-t-action="connect"]','t'],[6,'t-stage','dependencies','[data-t-action="boundary"]','t'],
 [7,'tr-stage','plans','[data-tr-action="edit-plan"]','tr'],[7,'tr-stage','plans','[data-tr-action="new"]','tr'],[7,'tr-stage','connections','[data-tr-action="connection"]','tr'],
 [8,'i-stage','contracts','[data-i-action="edit-contract"]','i'],[8,'i-stage','contracts','[data-i-action="new-contract"]','i'],[8,'i-stage','parties','[data-i-action="party"]','i'],[8,'i-stage','data','[data-i-action="edit-data"]','i'],[8,'i-stage','data','[data-i-action="new-data"]','i'],[8,'i-stage','lineage','[data-i-action="lineage"]','i'],
 [9,'sec-stage','threats','[data-sec-action="edit-threat"]','sec'],[9,'sec-stage','threats','[data-sec-action="new-threat"]','sec'],[9,'sec-stage','controls','[data-sec-action="edit-control"]','sec'],[9,'sec-stage','controls','[data-sec-action="new-control"]','sec'],
 [10,'rt-stage','placement','[data-rt-action="placement"]','rt'],[10,'rt-stage','recovery','[data-rt-action="edit-plan"]','rt'],[10,'rt-stage','operate','[data-rt-action="edit-plan"]','rt'],
 [11,'rv-stage','document','[data-rv-action="narrative"]','rv'],[11,'rv-stage','delivery','[data-rv-action="action"]','rv']
];
try{
 await import('./public/entry.js');
 await waitFor(()=>q('.work-view'),'Initial Work');
 const before=JSON.stringify(window.aiwProjectStore.value.document),writeBaseline=writes;
 let last=0;
 for(const [chapter,attribute,section,action,prefix] of cases){
  if(chapter!==last){click(`a[data-chapter="${chapter}"]`);await waitFor(()=>q(`[data-work-chapter="${chapter}"]`),'Chapter '+chapter);last=chapter;}
  click(`.work-stages [data-${attribute}="${section}"]`);
  await waitFor(()=>q(`[data-work-section="${section}"]`),'Section '+section);
  const target=q('.work-view '+action);assert(target&&!target.disabled,'Enabled editor '+chapter+' '+action);target.click();
  await waitFor(()=>q('dialog form, [role="dialog"] form'),'Editor opens '+chapter+' '+section+' '+action);
  const dialog=q('dialog, [role="dialog"]');assert(dialog.querySelector('input,textarea,select'),'The intended native form is usable');
  const close=dialog.querySelector(`[data-${prefix}-action="close"]`);assert(close,'Native cancel remains reachable');close.click();
  await waitFor(()=>!q('dialog, [role="dialog"]'),'Native cancel closes '+chapter+' '+section);
 }
 // The refined entry uses the same native editor and unsaved-change guard.
 click('a[data-chapter="4"]');await waitFor(()=>q('[data-work-chapter="4"]'),'Return to logical Work');
 click('.work-stages [data-l-stage="responsibilities"]');
 const opener=q('.work-task-actions [data-l-action="new"]');opener.focus();opener.click();
 await waitFor(()=>q('.l-dialog input[name="title"]'),'Native responsibility definition opens');
 const field=q('.l-dialog input[name="title"]');field.value='Unsaved Work composition check';field.dispatchEvent(new Event('input',{bubbles:true}));
 click('.l-dialog [data-l-action="close"]');
 assert.equal(q('.l-dialog .l-discard').hidden,false,'Closing a changed native form asks about unsaved changes');
 click('.l-dialog [data-l-action="keep"]');assert(q('.l-dialog input[name="title"]'),'Keep editing preserves the open editor');assert.equal(q('.l-dialog input[name="title"]').value,field.value);
 click('.l-dialog [data-l-action="close"]');click('.l-dialog [data-l-action="discard"]');
 await waitFor(()=>!q('.l-dialog'),'Explicit discard returns to the task');
 assert(document.activeElement===opener,'Focus returns to the actual Work action');
 assert.equal(JSON.stringify(window.aiwProjectStore.value.document),before,'Opening/cancelling cannot save design changes');
 assert.equal(writes,writeBaseline,'Opening/cancelling cannot save or generate');assert.deepEqual(errors,[]);
 console.log('PASS: 28 native Work editor open/cancel paths across Chapters 4–11; changed-field close/keep/discard and focus return; promoted primary actions and contextual forms; no writes, changed records or DOM errors.');
}finally{await w.happyDOM.close();}
