// DOM and Worker integration. No browser or layout engine.
import assert from 'node:assert/strict';
const {Window}=await import(process.env.AIW_DOM_MODULE||'happy-dom');
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url)).replace(/\/$/,'');
const ch=Number(process.env.AIW_CHAPTER||4),reads=process.env.AIW_TOPIC==='reads',persistence=process.env.AIW_TOPIC==='persistence';
const w=new Window({url:`https://aiw.test/?chapter=${ch}&tab=work&artefact=REQ-001`,width:Number(process.env.AIW_WIDTH||1440),height:900});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval'])globalThis[key]=w[key].bind(w);
// happy-dom has no CSS.escape; the browser does. The shim escapes as the browser would for the ids used here.
if(typeof globalThis.CSS==='undefined')globalThis.CSS={escape:v=>String(v).replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c)};
w.document.body.innerHTML='<div id="app"></div><div id="cursor-tip" hidden></div><div id="toast"></div>';
const {default:worker}=await import(pathToFileURL(root+'/worker.js'));
const {localDatabase}=await import(pathToFileURL(root+'/local-db.js'));
const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}};
// The signed-in person; a second person verifies claims (four eyes).
let actor='ux-test';
globalThis.fetch=(path,options={})=>worker.fetch(new Request(new URL(path,'https://aiw.test'),{...options,headers:{...options.headers,'oai-authenticated-user-id':actor,Origin:'https://aiw.test'}}),env);
const errors=[];w.addEventListener('error',e=>errors.push(e.message));
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const click=s=>{const el=q(s);assert.ok(el,'Missing '+s);el.focus();el.click();return el};
const waitFor=async(fn,message)=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setTimeout(r,25));}throw Error(message+' '+q('.ip-error')?.textContent+' ARC '+q('.arc-error')?.textContent+' ERRORS '+errors.join(';'))};

const api=async(path,body)=>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert(r.ok,await r.clone().text());return r.json();};
let fixture=await api('/api/projects',{name:'Equipment UI QA',template:'blank',brief:'Equipment reservations.'});
const send=async(type,payload)=>fixture=await api('/api/commands?project='+fixture.document.id,{revision:fixture.revision,command:{type,payload}});
await send('artefact',{type:'requirement',title:'Reserve equipment',description:'Accept reservation requests and return their recorded outcome.',acceptance:'One authoritative outcome per original request reference.',owner:'Facilities',source:'Workshop',confirmed:true});
await send('quality.driver',{title:'Recover delayed work',category:'recoverability',requirementIds:['REQ-001'],response:'Retain accepted work until processing recovers.',stimulus:'Processor outage',conditions:'Burst of reservations',metric:'Completion delay',targetValue:'30',unit:'minutes',operator:'At most',window:'Each request',measurement:'Failure exercise',confirmed:true,targetConfirmed:true});
await send('logical.responsibility',{title:'Equipment requests',purpose:'Accept equipment requests.',boundary:'Own the request boundary.',owner:'Facilities',source:'Workshop',requirementIds:['REQ-001'],decisionIds:[],confirmed:false});
history.replaceState({},'', 'https://aiw.test/?chapter='+ch+'&tab=work&driver=QD-001&selected='+fixture.document.logical.responsibilities[0].id+'&project='+fixture.document.id);
await import(pathToFileURL(root+'/public/entry.js'));
const store=w.aiwProjectStore;
const arc=a=>click('[data-arc-action="'+a+'"]');
const brain=a=>click('[data-brain-action="'+a+'"]');
const set=(name,value)=>{const el=q('[data-arc-field="'+name+'"]');assert(el,'Missing field '+name);el.value=value;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};
const saved=()=>waitFor(()=>!w.aiwArchitectureTask.busy,'Save architecture flow');
click('[data-brain-launch="mind"]');click('.brain-exploration > summary');await waitFor(()=>q('.kw-workspace'),'Deferred knowledge tools did not open in their existing disclosure');click('.brain-choices > summary');await waitFor(()=>q('.arc-entry'),'Deferred architecture choices did not open inside Proposals');assert.equal(qa('dialog[open]').length,0);

assert(q('.kw-workspace'),'Architecture knowledge stays inside Proposals');
const k=a=>click('[data-k-action="'+a+'"]');
const ks=(name,value)=>{const el=q('[data-k-field="'+name+'"]');assert(el,'Missing knowledge field '+name);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new Event(el.type==='checkbox'||el.tagName==='SELECT'?'change':'input',{bubbles:true}));};
const submit=async()=>{q('[data-k-save]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await waitFor(()=>!q('[data-k-save]')||q('.kw-error')?.textContent,'Knowledge save');assert(!q('.kw-error')?.textContent,q('.kw-error')?.textContent);};
const review=()=>{ks('reviewer','Synthetic UI reviewer');ks('reason','Synthetic acceptance workflow; not a real source approval.');ks('reviewed',true);};
q('[data-k-query]').value='load balancer';q('[data-k-search]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));assert(q('.kw-concepts').textContent.toLowerCase().includes('load'));
click('[data-k-action="tab"][data-view="sources"]');k('new-source');ks('title','Synthetic equipment cache source');brain('design');assert(q('.kw-leave'),'Unsaved source input is protected across companions');k('stay');ks('path','synthetic/reference.md');ks('revision','1');ks('license','Synthetic UI fixture written for this regression; no real reuse approval.');ks('body','A cached equipment description may be older when a read permits bounded staleness. This avoids a remote lookup and can reduce read latency. It requires a TTL check and a test of freshness and latency. It is unsuitable for authoritative reservation writes.');await submit();assert.equal(store.value.document.knowledge.sources.length,1);
k('new-claim');ks('lineStart','1');ks('lineEnd','1');ks('subjectId','PAT-CACHE-ASIDE');ks('predicate','permits bounded staleness');ks('statement','Equipment descriptions may use a bounded older cached copy.');ks('conditions','Description reads tolerate bounded age.');ks('limitations','This does not authorise reservation writes.');
ks('unitEnabled',true);assert(q('[data-k-field="unitMechanism"]'),'Structured guidance is authored inside the existing claim');ks('unitKind','product-mechanism');assert(q('[data-k-field="unitProduct"]').required&&q('[data-k-field="unitVersion"]').required,'A product mechanism must carry product and version scope');ks('unitKind','pattern');ks('unitMechanism','Cache equipment descriptions with bounded age to avoid remote lookups.');ks('unitCapability','Equipment description reads');ks('unitExclusions','Authoritative reservation writes');
const unitSet=(kind,index,property,value)=>{const el=q(`[data-k-unit-row="${kind}"][data-k-unit-index="${index}"][data-k-unit-property="${property}"]`);assert(el,'Missing '+kind+' '+index+' '+property);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));};
unitSet('effect',0,'quality','Latency');unitSet('effect',0,'rationale','Avoids a remote lookup for eligible description reads.');k('unit-add-effect');unitSet('effect',1,'quality','Freshness');unitSet('effect',1,'direction','tradeoff');unitSet('effect',1,'rationale','A cached description may be older within the permitted age.');unitSet('obligation',0,'action','Set and check a bounded TTL.');unitSet('obligation',0,'evidence','Measure freshness and latency in a read test.');k('unit-add-obligation');unitSet('obligation',1,'action','Unneeded draft');click('[data-k-action="unit-remove-obligation"][data-index="1"]');assert.equal(qa('[data-k-unit-row="obligation"][data-k-unit-property="action"]').length,1,'Removing a row preserves the remaining obligation');
assert.equal(qa('[data-k-unit-row="effect"][data-k-unit-property="quality"]').length,2);await submit();assert.equal(store.value.document.knowledge.claims.length,1);
assert.equal(store.value.document.knowledge.claims[0].architectureUnit.effects.length,2,'The typed unit travels with the candidate claim');
// The claim's author cannot verify it: the owner adds a second person to the project team, who verifies it.
assert.equal((await fetch('/api/access?project='+store.value.document.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actorId:'ux-reviewer',role:'editor'})})).status,200);
actor='ux-reviewer';k('review-claim');assert(q('.kw-unit-review')?.textContent.includes('bounded TTL'),'The independent reviewer sees the mechanism, effects and obligations');ks('sourceChecked',true);ks('rightsChecked',true);ks('conditionsChecked',true);review();await submit();actor='ux-test';
assert.equal(store.value.document.knowledge.claims[0].review?.actor,'ux-reviewer','the second person verified the claim');
click('[data-k-action="tab"][data-view="releases"]');assert(q('[data-k-signed-update]'),'Signed repository receipt and withdrawal control is visible');k('new-release');ks('title','Synthetic equipment knowledge');ks('claim:'+store.value.document.knowledge.claims[0].id,true);review();await submit();assert.equal(store.value.document.knowledge.pins.length,0);
k('activate');review();await submit();assert.equal(store.value.document.knowledge.pins.length,1);
click('[data-k-action="tab"][data-view="explore"]');q('[data-k-query]').value='equipment cache';q('[data-k-search]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));assert(q('.kw-workspace').textContent.includes('Reviewed support for this design'));k('link');review();await submit();assert.equal(store.value.document.knowledge.links.length,1);
// The exact-source reader resolves the same released claim and returns focus to its caller.
await import(pathToFileURL(root+'/public/knowledge-explanation-ui.js'));
const inspect=document.createElement('button');inspect.dataset.akSource=store.value.document.knowledge.claims[0].id;inspect.dataset.akRelease=store.value.document.knowledge.releases[0].id;document.body.append(inspect);inspect.focus();inspect.click();
await waitFor(()=>q('.ak-source-dialog[open]'),'Exact source dialog');assert(q('.ak-source-dialog').textContent.includes('synthetic/reference.md'));assert(q('.ak-source-dialog').textContent.includes('SHA-256'));assert(q('.ak-source-dialog pre').textContent.includes('bounded staleness'));click('.ak-source-dialog [data-dialog-close]');assert.equal(document.activeElement,inspect);inspect.remove();
click('[data-k-action="tab"][data-view="sources"]');k('withdraw');assert(q('[data-k-save]').textContent.includes('model rationale'));review();await submit();assert.equal(store.value.document.knowledge.withdrawals.length,1);
click('[data-k-action="tab"][data-view="explore"]');assert(q('.kw-warning').textContent.includes('excluded from reasoning'));assert(q('[data-workspace-sol]'),'Ask Sol remains available');assert(q('[data-brain-launch="mind"]'),'Co-design remains available');
assert.deepEqual(errors,[]);console.log('PASS mounted Brain UI/Worker: concept search, same-surface sources, unsaved guard, original → claim → review → release → explicit activation → object rationale → impact review → withdrawal. No rendered layout claim.');await w.happyDOM.close();env.DB.close();
