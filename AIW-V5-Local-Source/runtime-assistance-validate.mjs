// Real chapter controls against the local Worker and DOM. This verifies navigation,
// not pixels or approval of the reference architecture.
import assert from 'node:assert/strict';
const {Window} = await import(process.env.AIW_DOM_MODULE || 'happy-dom');
const w = new Window({url: 'https://aiw.test/?chapter=10&tab=work&object=project&section=placement', width: 1440, height: 900});
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


const {createRuntimeStudio}=await import('./public/runtime-ui.js');
const {registerAssistantSurface}=await import('./public/assistant-surface.js');
const {withFinalReview}=await import('./public/review-domain.js');
const {seedProject}=await import('./public/requirements-domain.js');
const {createProject}=await import('./shared/projects-domain.js');
const reference=withFinalReview(seedProject()),blank=withFinalReview(createProject({name:'Empty runtime context',template:'blank'},'runtime-co-design-empty'));
let directCases=0;
for(const [p,selected,tab='work'] of [[reference,'project'],[reference,reference.runtime.plans[1].id],[reference,reference.runtime.plans[1].assetId],[blank,'project'],...[ 'model','validate','output' ].map(tab=>[reference,'project',tab])]){
 const before=JSON.stringify(p),state={chapter:10,tab,selected,runtimeEnvironment:p.runtime.environments[0]?.id,visible:['deployment'],cursor:true};
 const studio=createRuntimeStudio({value:{document:p},command(){throw Error('Assistance must not save');}});
 studio.bind({state,getNode:id=>({id,title:id,layer:'deployment'}),render(){},persist(){},toast(){}});
 let captured;registerAssistantSurface(view=>{captured=view;return true;});
 const work=document.createElement('div');work.innerHTML=studio.work();const planId=work.querySelector('[name="rtPlan"]')?.value,plan=p.runtime.plans.find(r=>r.id===planId);
 assert.doesNotThrow(()=>studio.assistant('mind'));
 assert.equal(captured.kind,'mind');const view=document.createElement('div');view.innerHTML=captured.body;
 if(plan){assert(view.textContent.includes(plan.ref+' · '+plan.title),'Co-design identifies the same canonical operating plan as Work');}
 else assert.match(view.textContent,/No environment yet/,'An empty project remains a valid chapter context');
 assert.equal(view.querySelectorAll('[data-rt-action="ghost"]').length,3,'All native runtime proposals remain available');
 assert.equal(state.selected,selected,'Opening guidance cannot silently select another record');
 assert.equal(JSON.stringify(p),before);studio.dispose();directCases++;
}
registerAssistantSurface(null);
try{
 await import('./public/entry.js');
 await waitFor(()=>q('[data-work-chapter="10"]'),'Chapter 10 Work arrives');
 const route=location.href,before=JSON.stringify(window.aiwProjectStore.value.document),writeBaseline=writes;
 click('[data-workspace-sol]');await waitFor(()=>q('#brain-panel:not([hidden])'),'Ask Sol opens');
 click('#brain-panel [data-brain-action="mind"]');
 await waitFor(()=>q('#brain-panel:not([hidden]) .brain-modes [data-brain-action="mind"][aria-pressed="true"]'),'Co-design remains open after switching from Ask Sol');
 assert.equal(location.href,route,'The assistance transition does not reroute Work or change selection');
 assert.equal(JSON.stringify(window.aiwProjectStore.value.document),before);assert.equal(writes,writeBaseline);assert.deepEqual(errors,[]);
 click('#brain-panel [data-brain-action="close"]');
 console.log('PASS: '+directCases+' native runtime Co-design contexts (project, plan, asset, blank and all four tabs), matching Work plan and preserving all 3 proposals; actual Ask Sol → Co-design transition stays open with unchanged route, record and project, no writes or DOM errors.');
}finally{await w.happyDOM.close();}
