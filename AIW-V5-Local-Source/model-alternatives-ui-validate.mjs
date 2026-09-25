// DOM and Worker integration checks. No browser, layout engine or production data.
import assert from 'node:assert/strict';
const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
const ch=4;
const w=new Window({url:`https://aiw.test/?chapter=${ch}&tab=work`,width:1440,height:900});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
w.document.body.innerHTML='<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
const {default:worker}=await import(pathToFileURL(root+'/worker.js'));
const {localDatabase}=await import(pathToFileURL(root+'/local-db.js'));
const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}};
globalThis.fetch=(path,options={})=>worker.fetch(new Request(new URL(path,'https://aiw.test'),{...options,headers:{...options.headers,'oai-authenticated-user-id':'ux-test',Origin:'https://aiw.test'}}),env);
const errors=[];w.addEventListener('error',e=>errors.push(e.message));
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);assert.ok(el,'Missing '+s);el.focus();el.click();return el};
const waitFor=async(fn,message)=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw Error(message+' '+q('.ip-error')?.textContent)};
await import(pathToFileURL(root+'/public/entry.js'));
const input=(selector,value)=>{const el=q(selector);assert.ok(el,'Missing '+selector);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));return el;};
const select=(selector,value)=>{const el=q(selector);assert.ok(el,'Missing '+selector);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));return el;};
const submit=selector=>{assert.ok(q(selector),'Missing '+selector);q(selector).dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));};
const ip=a=>click('[data-ip-action="'+a+'"]');
const store=w.aiwProjectStore,impact=w.aiwInterfaceImpact,initial=structuredClone(store.value.document);
const dirtyUnload=()=>{const event=new Event('beforeunload',{cancelable:true});w.dispatchEvent(event);return event.defaultPrevented;};
const openMind=()=>w.aiwLogicalStudio.assistant('mind');
const record=(p,id)=>[...p.logical.responsibilities,...p.realisation.components,...p.technology.capabilities,...p.technologyRealisation.records].find(r=>r.id===id);
const review=()=>{if(!q('.ip-dialog'))ip('details');};
// Use the real chapter editors and their submit handlers.
w.aiwEditModelProposal({type:'logical.responsibility',payload:{id:'api'}});
input('#l-responsibility-form [name="boundary"]','Own request acceptance and duplicate protection.');submit('#l-responsibility-form');
assert.ok(impact.pending);assert.equal(qa('dialog[open]').length,0);assert.ok(dirtyUnload());
assert.equal(record(store.value.document,'api').boundary,record(initial,'api').boundary,'Preview leaves model unchanged');
review();assert.equal(qa('[data-ip-change] option').length,1);
for(const [key,form,field,value] of [
 ['realisation.component:api-pod','#a-component-form','boundary','Implement request acceptance and duplicate detection.'],
 ['technology.capability:tc-001','#t-capability-form','purpose','Support duplicate-safe request processing.'],
 ['techrealisation.plan:tr-001','#tr-plan-form','operationsPlan','A named operator monitors duplicate rejection and recovery.']
]){
 ip('add');select('[data-ip-add-record]',key);ip('add-edit');assert.equal(qa('dialog[open]').length,1);input(form+' [name="'+field+'"]',value);submit(form);assert.equal(qa('dialog[open]').length,0);review();
}
assert.equal(qa('[data-ip-change] option').length,4);assert.equal(impact.decorate({nodes:['api','api-pod','tc-001','tr-001'].map(id=>({id,attrs:{}})),edges:[]}).nodes.filter(n=>n.ghost).length,4);
// Save and close; persisted proposals survive reloading the project store.
ip('save-form');input('[data-ip-input="name"]','Coordinated duplicate protection');input('[data-ip-input="rationale"]','Align the request boundary, application implementation, capability and operator obligations.');ip('save');assert.equal(q('[data-ip-input="name"]').disabled,true,'Saving locks the submitted form');
await waitFor(()=>store.value.document.modelAlternatives?.records.length===1&&!impact.busy,'Alternative was not saved');
assert.equal(dirtyUnload(),false,'Durably saved proposal does not warn on reload');
assert.equal(record(store.value.document,'api').boundary,record(initial,'api').boundary);
ip('close');ip('dismiss');assert.equal(impact.pending,false);await store.load();
openMind();assert.ok(q('.ip-alternatives'));assert.equal(qa('dialog[open]').length,1);ip('alternative-preview');assert.ok(q('.ip-dialog'));assert.equal(qa('[data-ip-change] option').length,4);assert.equal(qa('dialog[open]').length,1);
// Re-edit one record without losing the other three; the editor starts with staged values.
select('[data-ip-change]','logical.responsibility:api');ip('edit');assert.equal(q('#l-responsibility-form [name="boundary"]').value,'Own request acceptance and duplicate protection.');input('#l-responsibility-form [name="boundary"]','Delegate duplicate protection to a dedicated request ledger.');submit('#l-responsibility-form');review();assert.equal(qa('[data-ip-change] option').length,4);
ip('save-form');ip('save-as');input('[data-ip-input="name"]','Dedicated request ledger');input('[data-ip-input="rationale"]','Compare a dedicated boundary while retaining the shared operational obligations.');ip('save');await waitFor(()=>store.value.document.modelAlternatives.records.length===2&&!impact.busy,'Second alternative save');
ip('close');ip('dismiss');openMind();select('[data-ip-alternative-left]','ALT-001');select('[data-ip-alternative-right]','ALT-002');ip('alternative-compare');assert.ok(q('.ip-dialog').textContent.includes('Delegate duplicate protection'));assert.ok(q('.ip-dialog').textContent.includes('Own request acceptance'));assert.ok(q('.ip-dialog').textContent.includes('does not rank'));assert.equal(impact.pending,false);
ip('close');openMind();select('[data-ip-alternative-left]','ALT-001');ip('alternative-preview');
// An independent concurrent edit must survive refresh and trigger overlap disclosure.
const {modelEditSnapshot}=await import(pathToFileURL(root+'/public/model-impact.js'));
const current=store.value.document,command={type:'logical.responsibility',payload:{id:'api',...modelEditSnapshot(current,{type:'logical.responsibility',payload:{id:'api'}}),owner:'Concurrent owner',boundary:'Latest saved boundary'}};
await store.command(command);ip('refresh');await waitFor(()=>!impact.busy,'Refresh completed');assert.ok(q('.ip-overlaps'));assert.ok(q('.ip-overlaps').textContent.includes('Latest saved boundary'));assert.equal(record(impact.document,'api').owner,'Concurrent owner');assert.equal(q('[data-ip-confirm]'),null);
// Saving metadata is separate from applying, and partial review cannot accept.
ip('review');ip('apply');assert.ok(q('.ip-error').textContent.includes('Confirm'));
input('[data-ip-input="reviewer"]','QA architect');input('[data-ip-input="reason"]','Accept aligned duplicate protection while preserving the separately updated owner.');q('[data-ip-confirm]').checked=true;ip('apply');await waitFor(()=>!impact.pending&&!impact.busy,'Proposal application');
assert.equal(record(store.value.document,'api').boundary,'Own request acceptance and duplicate protection.');assert.equal(record(store.value.document,'api').owner,'Concurrent owner');
const accepted=store.value.document.modelAlternatives.records.find(a=>a.id==='ALT-001');assert.equal(accepted.status,'applied');assert.equal(accepted.applied.changeIds.length,4);assert.equal(store.value.document.changes.events.slice(-4).every(e=>e.proposal.alternativeId==='ALT-001'),true);
// A saved design's reasoning, review identity and immutable history remain inspectable.
openMind();select('[data-ip-alternative-left]','ALT-001');ip('alternative-details');assert.ok(q('.ip-dialog').textContent.includes('QA architect'));assert.ok(q('.ip-dialog').textContent.includes('Proposed values at this revision'));ip('close');
openMind();select('[data-ip-alternative-left]','ALT-002');ip('alternative-details');input('[data-ip-input="archiveReason"]','The combined boundary was accepted after comparison.');ip('archive');await waitFor(()=>store.value.document.modelAlternatives.records.find(a=>a.id==='ALT-002').status==='archived'&&!impact.busy,'Archive alternative');assert.ok(q('.ip-dialog').textContent.includes('Set aside: The combined boundary'));
ip('close');
// Opening another alternative cannot silently replace unsaved work.
w.aiwEditModelProposal({type:'logical.responsibility',payload:{id:'api'}});
input('#l-responsibility-form [name="purpose"]','Unsaved exploration must remain available.');submit('#l-responsibility-form');
const pendingPurpose=record(impact.document,'api').purpose;openMind();select('[data-ip-alternative-left]','ALT-001');ip('alternative-preview');
assert.equal(record(impact.document,'api').purpose,pendingPurpose);assert.ok(q('.ip-alternatives'),'Unsaved-switch guard retains the assistant');
click('dialog[open] header button');ip('dismiss');assert.ok(q('.ip-dialog').textContent.includes('Discard the unsaved proposal?'));ip('keep');ip('close');assert.ok(impact.pending);ip('dismiss');ip('discard-confirm');assert.equal(impact.pending,false);assert.equal(dirtyUnload(),false);
// Already-applied alternatives open their retained reasoning without duplicating CHG entries.
const count=store.value.document.changes.events.length;openMind();select('[data-ip-alternative-left]','ALT-001');ip('alternative-preview');assert.equal(impact.pending,false);assert.ok(q('.ip-dialog').textContent.includes('already matches'));assert.equal(q('[data-ip-action="apply"]'),null);assert.equal(store.value.document.changes.events.length,count);ip('close');
// The shared Chapter 8 review still applies a single interface change.
const contract=store.value.document.interfaces.contracts.find(c=>c.id==='rest');assert.equal(impact.stage({type:'interfaces.contract',payload:{...contract,to:'worker'}}),true);review();assert.equal(q('[data-ip-change]'),null);assert.ok(q('[data-ip-confirm]'));q('[data-ip-confirm]').checked=true;ip('apply');await waitFor(()=>!impact.pending&&!impact.busy,'Interface review application');assert.equal(store.value.document.interfaces.contracts.find(c=>c.id==='rest').to,'worker');assert.equal(store.value.document.changes.events.at(-1).source.chapter,8);
assert.equal(qa('.journey-rail>section').length,3);assert.equal(qa('.ev-launcher,.lens-position-controls').length,0);assert.deepEqual(errors,[]);
console.log('PASS Alternatives UI: four real editors, combined ghosts, save/reload/resume, prefilled editing, distinct alternatives, comparison, current-model rebase, overlaps, explicit reviewed application, preserved unrelated edits, reasoning/history, set-aside, unsaved-switch/discard guards, already-applied detection and shared interface acceptance; refined workbench retained.');
await w.happyDOM.close();process.exit(0);
