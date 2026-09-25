// DOM and Worker integration. No browser or layout engine.
import assert from 'node:assert/strict';
const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
const topic=process.env.AIW_TOPIC||'delivery';
const ch=Number(process.env.AIW_CHAPTER||4),reads=process.env.AIW_TOPIC==='reads',persistence=process.env.AIW_TOPIC==='persistence';
const w=new Window({url:`https://aiw.test/?chapter=${ch}&tab=work&artefact=REQ-001`,width:Number(process.env.AIW_WIDTH||1440),height:900});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval'])globalThis[key]=w[key].bind(w);
w.document.body.innerHTML='<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
const {default:worker}=await import(pathToFileURL(root+'/worker.js'));
const {localDatabase}=await import(pathToFileURL(root+'/local-db.js'));
const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}};
globalThis.fetch=(path,options={})=>worker.fetch(new Request(new URL(path,'https://aiw.test'),{...options,headers:{...options.headers,'oai-authenticated-user-id':'ux-test',Origin:'https://aiw.test'}}),env);
const errors=[];w.addEventListener('error',e=>errors.push(e.message));
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);assert.ok(el,'Missing '+s);el.focus();el.click();return el};
const waitFor=async(fn,message)=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw Error(message+' '+q('.ip-error')?.textContent+' ARC '+q('.arc-error')?.textContent+' ERRORS '+errors.join(';'))};

const api=async(path,body)=>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert(r.ok,await r.clone().text());return r.json();};
const {compositionFixtureAnswers}=await import('./composition-fixtures.mjs');
let fixture=await api('/api/projects',{name:'Equipment UI QA',template:'blank',brief:'Equipment reservations.'});
const send=async(type,payload)=>fixture=await api('/api/commands?project='+fixture.document.id,{revision:fixture.revision,command:{type,payload}});
await send('artefact',{type:'requirement',title:'Reserve equipment',description:'Accept reservation requests and return their recorded outcome.',acceptance:'One authoritative outcome per original request reference.',owner:'Facilities',source:'Workshop',confirmed:true});
await send('quality.driver',{title:'Recover delayed work',category:'recoverability',requirementIds:['REQ-001'],response:'Retain accepted work until processing recovers.',stimulus:'Processor outage',conditions:'Burst of reservations',metric:'Completion delay',targetValue:'30',unit:'minutes',operator:'At most',window:'Each request',measurement:'Failure exercise',confirmed:true,targetConfirmed:true});
await send('knowledge.source',{title:'Synthetic observation log',path:'synthetic/observations.txt',revision:'test-1',body:'Synthetic observed values: 98, 100, 102.\nThis is test data, not a production measurement.'});
await send('logical.responsibility',{title:'Equipment requests',purpose:'Accept equipment requests.',boundary:'Own the request boundary.',owner:'Facilities',source:'Workshop',requirementIds:['REQ-001'],decisionIds:[],confirmed:false});
history.replaceState({},'', 'https://aiw.test/?chapter='+ch+'&tab=work&driver=QD-001&selected='+fixture.document.logical.responsibilities[0].id+'&project='+fixture.document.id);
await import(pathToFileURL(root+'/public/entry.js'));
const store=w.aiwProjectStore;
const arc=a=>click('[data-arc-action="'+a+'"]');
const brain=a=>click('[data-brain-action="'+a+'"]');
const set=(name,value)=>{const el=q('[data-arc-field="'+name+'"]');assert(el,'Missing field '+name);el.value=value;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};
const concern=topic=>{const el=q('[data-arc-concern]');assert(el);el.value=topic;el.dispatchEvent(new Event('change',{bubbles:true}));};
const saved=()=>waitFor(()=>!w.aiwArchitectureTask.busy,'Save architecture flow');
click('[data-brain-launch="mind"]');assert(q('.arc-entry'),'Architecture choices are inside Mind Factory');assert.equal(qa('dialog[open]').length,0);

const advanced={delivery:'transactional-outbox',resilience:'protected-call',distribution:'balanced-pool',structure:'service-boundaries'}[topic];
concern(topic);arc('launch');arc('start');await saved();
click('[data-arc-action="option"][data-option="'+advanced+'"]');
assert(q('.arc-topology svg'),'A role diagram is visible');arc('conditions');
for(const el of qa('[data-arc-field]')){const key=el.dataset.arcField;assert(Object.hasOwn(compositionFixtureAnswers,key),'Fixture explicitly covers '+key);set(key,compositionFixtureAnswers[key]);}
brain('design');assert(q('.arc-leave'));arc('stay');arc('save-compare');await saved();arc('objects');
for(const key of ['trustName','trustPolicy','reason',...(topic==='delivery'?['dataScope','classification','retention','isolation']:[])])set(key,compositionFixtureAnswers[key]);
arc('save');await saved();arc('evidence');
const inputSets={delivery:{arrival:20,service:15,workers:2,backlog:120},resilience:{attempts:3,timeout:100,backoff:10,cap:15,concurrency:5},distribution:{arrival:80,service:60,workers:3,downstream:100,efficiency:100},structure:{calls:3,roundTrip:4,local:5}};
for(const [key,value] of Object.entries(inputSets[topic])){const el=q('[data-arc-analysis="'+key+'"]');assert(el);el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));}
arc('calculate');assert(q('.arc-numbers'));assert(q('.arc-quant-compare'),'The alternative uses the same numerical assumptions');arc('save');await saved();arc('objects');arc('prepare');await saved();
await waitFor(()=>q('.ip-dialog[open]'),'Composition model review');assert.equal(store.value.document.realisation.components.length,0);
click('[data-ip-action="section"][data-ip-section="review"]');for(const [key,value] of [['reviewer','Synthetic UI architect'],['reason','Reviewed responsibilities, support, conditions and quantitative assumptions.']]){const el=q('[data-ip-input="'+key+'"]');el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));}
q('[data-ip-confirm]').checked=true;click('[data-ip-action="apply"]');await waitFor(()=>store.value.document.coauthoring.designTasks[0].status==='applied','Accept composition');
click('[data-brain-launch="mind"]');assert(q('.architecture-workspace').textContent.includes('Accepted working design'));assert(q('.arc-analysis'),'Accepted design retains its numerical method');
const measure=(key,value)=>{const el=q('[data-arc-measure="'+key+'"]');assert(el,key);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};
measure('samples','98, 100, 102');measure('environment','Synthetic UI acceptance');measure('workload','Fixed controlled values, no production claim.');measure('procedure','Test the full evidence recording flow.');measure('sourceId',store.value.document.knowledge.sources[0].id);measure('lineStart','1');measure('lineEnd','2');measure('reviewer','Synthetic UI architect');measure('reason','The observed difference needs context-specific interpretation.');measure('reviewed',true);
brain('design');assert(q('.arc-leave'),'Measurement input is protected');arc('stay');arc('measure');await saved();assert(!q('.arc-error')?.textContent,q('.arc-error')?.textContent);
assert.equal(store.value.document.coauthoring.designTasks[0].measurements.length,1);assert.equal(store.value.document.coauthoring.designTasks[0].measurements[0].actor,'ux-test');assert(q('.arc-measure-result').textContent.includes('Current design'));assert.equal(qa('.brain-assistance button').length,3);
const {exportSDD}=await import('./public/review-domain.js');assert(exportSDD(store.value.document).includes('Observed')||exportSDD(store.value.document).includes('observed mean'));
assert.deepEqual(errors,[]);console.log('PASS '+topic+' UI/Worker: diagram, conditions, evidence calculator, alternative comparison, unsaved guards, model review, acceptance, source-bound measurements, owner and SDD. No rendered layout claim.');await w.happyDOM.close();env.DB.close();
