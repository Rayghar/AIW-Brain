// DOM and Worker integration checks. No browser, layout engine or production data.
import assert from 'node:assert/strict';
import {createProject} from './public/projects-domain.js';import {applyCommand} from './public/requirements-domain.js';import {applyLogicalCommand} from './public/logical-domain.js';import {applyRealisationCommand} from './public/realisation-domain.js';import {withFinalReview} from './public/review-domain.js';
function makeBlank(){let p=createProject({name:'Equipment reservations',template:'blank'},'equipment');p=applyCommand(p,{type:'artefact',payload:{type:'requirement',title:'Reserve available equipment',description:'Record an equipment reservation and retrieve its original outcome.',acceptance:'Repeated requests return the recorded outcome.',source:'Equipment workshop'}}).document;p=applyLogicalCommand(p,{type:'logical.responsibility',payload:{title:'Reserve equipment',purpose:'Record a reservation',boundary:'Own reservation acceptance',owner:'Equipment team',source:'Workshop',requirementIds:['REQ-001'],decisionIds:[]}}).document;
for(const title of ['Reservations','Coordination'])p=applyRealisationCommand(p,{type:'realisation.component',payload:{title,kind:'service',purpose:title,boundary:title,owner:'Equipment team',technologyNeeds:'',allocations:[{logicalId:'lr-001',scope:'Reservation behaviour'}]}}).document;
p=applyRealisationCommand(p,{type:'realisation.interaction',payload:{from:'obj-001',to:'obj-002',label:'coordinates reservation',interaction:'event',failure:'Retain an unknown outcome until reconciled.'}}).document;return withFinalReview(p);}

const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
const ch=8,blank=process.env.AIW_BLANK==='1',keyName=blank?'reservationId':'paymentReference';
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
if(blank){const fixture=makeBlank();await env.DB.prepare('INSERT INTO projects (owner_id,id,document,revision,updated_at) VALUES (?,?,?,1,?)').bind('ux-test',fixture.id,JSON.stringify(fixture),new Date().toISOString()).run();history.replaceState({},'', 'https://aiw.test/?chapter=8&tab=work&project='+fixture.id);}
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

const ex=a=>click('[data-ex-action="'+a+'"]'),answer=(k,v)=>input('[data-ex-answer="'+k+'"]',v),saved=()=>waitFor(()=>!w.aiwExchangeTask.busy,'Exchange save '+q('.dc-error')?.textContent);
w.aiwLogicalStudio.assistant('sol');ex('launch');assert.ok(q('.dc-dialog'));ex('start');await saved();assert.ok(q('[data-ex-answer="protocol"]'));
answer('title','A traceable initiation agreement');answer('purpose','Preserve the original recorded outcome.');answer('owner','Application team');answer('protocol','HTTPS JSON');answer('operation','Agreed initiation operation');answer('contractVersion','Working version 1');answer('evidence','Architecture workshop');ex('next');await saved();
assert.ok(q('[data-ex-answer="reuseDataId"]'));if(blank){answer('dataTitle','Reservation identity');answer('dataPurpose','Identify the original reservation.');answer('dataOwner','Equipment team');select('[data-ex-answer="authorityId"]','obj-001');select('[data-ex-answer="classification"]','Internal');answer('keyName',keyName);select('[data-ex-answer="keyType"]','string');answer('keyMeaning','Stable reservation identity.');answer('protection','Named identities and masked support views.');answer('retentionPolicy','Confirm the lifecycle with the accountable owner.');ex('next');await saved();}else assert.ok(q('.dc-reuse'));ex('close');await store.load();w.aiwLogicalStudio.assistant('sol');ex('launch');ex('resume');
// Resume deliberately skips complete persisted groups; reuse needs no duplicate data-entry.
assert.ok(q('[data-ex-answer="duplicatePolicy"]'));answer('correlationKey',keyName);answer('idempotencyKey',keyName);answer('duplicatePolicy','Return the original outcome for the original reference.');answer('timeoutPolicy','Treat missing acknowledgement as unknown.');answer('retryPolicy','Reconcile before repeating.');answer('failurePolicy','Distinguish rejection and uncertainty.');ex('next');await saved();
answer('authorization','Named service identities');answer('transport','Authenticated encrypted channel');answer('compatibility','Review changed fields with consumers before release.');answer('rationale','Reuse the established dictionary and preserve the original outcome across repeats.');ex('next');await saved();
assert.ok(q('.ip-dialog'),q('.dc-error')?.textContent);assert.equal(qa('dialog[open]').length,1);assert.equal(qa('[data-ip-change] option').length,2);assert.ok(impact.previewInChapter(8));assert.equal(impact.previewInChapter(4),false);assert.equal(store.value.document.interfaces.contracts[0].title,initial.interfaces.contracts[0].title);
ip('edit');assert.ok(q('.dc-dialog'));assert.equal(qa('dialog[open]').length,1);ex('save');await saved();ex('close');ip('details');ip('refresh');await waitFor(()=>!impact.busy,'Refresh reopened proposal');
ip('review');input('[data-ip-input="reviewer"]','Interface QA');input('[data-ip-input="reason"]','Reviewed the contract with its existing payload and source obligations.');q('[data-ip-confirm]').checked=true;ip('apply');await waitFor(()=>!impact.pending&&!impact.busy,'Accept contract and payload');
assert.equal(store.value.document.interfaces.contracts[0].title,'A traceable initiation agreement');if(blank){assert.equal(store.value.document.interfaces.data.length,1);assert.equal(store.value.document.interfaces.data[0].fields[0].name,keyName);}else assert.deepEqual(store.value.document.interfaces.data,initial.interfaces.data);const task=store.value.document.coauthoring.designTasks[0];assert.equal(task.status,'applied');assert.equal(task.applied.records.length,2);
w.aiwExchangeTask.openTask(task.id);assert.ok(q('.dc-dialog').textContent.includes('Interface QA'));ex('native');assert.ok(q('.i-dialog'));click('.i-dialog header button');
w.aiwLogicalStudio.assistant('mind');assert.ok(q('.ip-alternatives'));assert.ok(q('[data-ex-action="continue"]'));click('.i-dialog header button');
assert.deepEqual(errors,[]);assert.equal(qa('.journey-rail>section').length,3);console.log('PASS Exchange UI ('+(blank?'blank new payload':'reference reused dictionary')+'): inherited sources, persisted answers, reuse, resume, joint ghosts, same-dialog editing, explicit acceptance, unchanged dictionary, retained reasoning and native chapter actions.');await w.happyDOM.close();process.exit(0);
