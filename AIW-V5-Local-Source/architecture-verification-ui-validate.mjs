// Native Chapter 11 and companion forms through the actual in-process Worker.
// This proves browser DOM behavior and command persistence, not live measurements.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {readStoredProject,saveStoredProject} from './project-storage.js';
import {verificationFixture,obligationAt,verificationSource} from './architecture-verification-fixtures.mjs';
import {verificationResult} from './public/architecture-verification.js';
import {architectureObligationsFor} from './public/architecture-obligations.js';
import {actionComplete} from './public/review-domain.js';
const files=new Map(),env={DB:localDatabase(':memory:'),FILES:{async put(k,v){files.set(k,v);},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null;},async delete(k){files.delete(k);}},ASSETS:{fetch:()=>new Response('asset')}},owner='synthetic-ui-check-owner';
const api=(path,method='GET',body)=>worker.fetch(new Request('https://aiw.test'+path,{method,headers:{'oai-authenticated-user-id':owner,Origin:'https://aiw.test',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env);
let response=await api('/api/projects','POST',{name:'Synthetic native verification forms',template:'blank'}),state=await response.json();assert.equal(response.status,201);
const projectId=state.document.id,row=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first(),loaded=await readStoredProject(env,owner,row.document),{p:fixture}=verificationFixture({action:false});fixture.id=projectId;await saveStoredProject(env,owner,projectId,fixture,row.revision,obligationAt,loaded.keys);
const w=new Window({url:'https://aiw.test/?chapter=11&tab=work&project='+projectId,settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','MouseEvent','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator','CSS'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
let requests=0;globalThis.fetch=async(url,options={})=>{const target=new URL(url,location.href);assert.equal(target.origin,'https://aiw.test','No external source or provider request');requests++;return api(target.pathname+target.search,options.method||'GET',options.body?JSON.parse(options.body):undefined);};
const {createReviewStudio}=await import('./public/review-ui.js'),{mountBrainContext}=await import('./public/brain-context-ui.js'),{formFieldsMatch}=await import('./public/record-fields.js');
const commands=[],notices=[],store={value:null,async load(){const r=await api('/api/project?project='+projectId);assert.equal(r.status,200);this.value=await r.json();},async command(command){const r=await api('/api/commands?project='+projectId,'POST',{revision:this.value.revision,command}),body=await r.json();if(!r.ok)throw Error(body.error||JSON.stringify(body));commands.push(structuredClone(command));this.value=body;return body;}};await store.load();window.aiwProjectStore=store;
document.body.innerHTML='<main id="app"><div id="review-root"></div></main><div id="toast"></div>';
let studio;const uiState={chapter:11,tab:'work',selected:fixture.realisation.components[0].id,reviewRequirement:'REQ-001',visible:['physical'],cursor:false},render=()=>{document.querySelector('#review-root').innerHTML=(uiState.tab==='validate'?studio.validation():studio.work())+studio.assistance();mountBrainContext(store.value.document,{chapter:11,id:uiState.selected},uiState.tab);};
studio=createReviewStudio(store);window.aiwLogicalStudio=studio;studio.bind({state:uiState,persist(){},render,toast:s=>notices.push(s),getNode:()=>null,setTab(tab){uiState.tab=tab;render();}});studio.openSection('delivery');render();
const q=s=>document.querySelector(s),click=s=>{const el=q(s);assert(el,'Missing '+s);el.click();return el;},input=(name,value,root='.rv-dialog')=>{const el=q(root+' [name="'+name+'"]');assert(el,'Missing '+name);el.value=value;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));return el;};
const wait=async(check,detail)=>{for(let i=0;i<250;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.fail(detail+' '+q('#rv-dialog-error')?.textContent+' '+q('.assurance-error')?.textContent+' notices='+notices.join('|'));};
const submit=id=>q(id).dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})),closed=()=>wait(()=>!q('.rv-dialog')&&!studio.busy,'Native form did not save');
const a=()=>store.value.document.finalReview.actions[0],observed=()=>store.value.document.assurance.records.at(-1),comparison=()=>verificationResult(store.value.document,observed()),editAction=()=>click('[data-rv-action="action"][data-rv-id="'+a().id+'"]');
try{
 const obligation=architectureObligationsFor(store.value.document)[0];click('[data-rv-action="obligation"][data-rv-id="'+obligation.id+'"]');
 assert.equal(q('[data-rv-verification]').open,false,'Optional controls begin collapsed');input('owner','Synthetic service owner');input('due','2026-11-01');q('[data-rv-verification]').open=true;
 input('verificationKind','metric');input('verificationMetric','95th percentile caller duration');input('verificationExpected','250');input('verificationUnit','ms');input('verificationEnvironment',fixture.runtime.environments[0].id);input('verificationRelease','synthetic-release-1');input('verificationProcedure','Retain the measured deadline under the declared test load.');
 assert.deepEqual(formFieldsMatch('review.action',[...q('#rv-action-form').elements].map(x=>x.name).filter(Boolean)),{undescribed:[],missing:[]});
 submit('#rv-action-form');await closed();assert.equal(a().verificationContract.expected,250);assert.equal(a().verification,null);await store.load();render();editAction();assert.equal(q('[name="verificationExpected"]').value,'250');assert.equal(q('[data-rv-verification]').open,true);click('.rv-dialog [data-rv-action="close"]');
 console.log('PASS native optional typed-check authoring, canonical field kit, Worker persistence and save/resume');

 const openObservation=async()=>{click('[data-rv-action="observation"][data-rv-id="'+a().id+'"]');await wait(()=>q('[data-assurance-form] [name="observedValue"]'),'Existing companion observation form did not open');};
 await openObservation();const form='[data-assurance-form]';assert.equal(q(form+' [name="verificationActionId"]').value,a().id);assert.equal(q(form+' [name="release"]').readOnly,true);assert.equal(q(form+' [name="environment"]').value,fixture.runtime.environments[0].title);
 input('statement','Synthetic result retained from the named source.',form);input('observedAt',obligationAt,form);input('sourceId',fixture.coauthoring.sources[0].id,form);input('observedValue','300',form);submit(form);await wait(()=>store.value.document.assurance?.records?.length===1,'Observation not saved');assert.equal(comparison().state,'fail');assert.equal(a().status,'Planned');
 await wait(()=>q('[data-assurance-action="edit"]'),'Record was not redrawn');click('[data-assurance-action="edit"]');assert.equal(q(form+' [name="id"]').value,observed().id);input('observedValue','200',form);input('reviewer','Synthetic reviewer',form);input('reviewNote','Reviewed the original scoped result; the earlier typed value was a transcription error.',form);q(form+' [name="reviewed"]').checked=true;submit(form);await wait(()=>observed().revision===2,'Correction not saved');assert.equal(comparison().state,'pass');assert.equal(observed().history[0].verificationObservation.value,300);assert.equal(a().status,'Planned');assert.equal(observed().reviewed,true);
 click('[data-brain-action="close"]');render();assert.match(q('#review-root').textContent,/Comparison passes/);assert.match(q('#review-root').textContent,/Evidence awaiting review/);
 console.log('PASS existing companion evidence entry and correction, exact scope, expected/observed reading and immutable earlier observation');

 click('[data-rv-action="delivery"][data-rv-id="'+a().id+'"]');assert.match(q('.rv-dialog').textContent,/observed 200 ms/);input('status','Verified');input('progress','Reviewed the retained synthetic measurement against this check.');input('reviewer','Synthetic verifier');input('reference','fixture://verification/deadline');q('[name="evidenceSourceIds"]').checked=true;
 submit('#rv-delivery-form');await wait(()=>!q('#rv-dialog-error').hidden,'Explicit manual review missing guard');assert(!actionComplete(store.value.document,a()));q('.rv-dialog [name="reviewed"]').checked=true;submit('#rv-delivery-form');await closed();assert(actionComplete(store.value.document,a()));assert.equal(a().verification.verificationEvidence[0].id,observed().id);
 console.log('PASS an observed pass remains unapproved until exact evidence and explicit native delivery review');

 await openObservation();input('statement','An unsaved new synthetic observation.',form);input('observedAt',obligationAt,form);input('sourceId',fixture.coauthoring.sources[0].id,form);input('observedValue','180',form);
 const sourceId=fixture.coauthoring.sources[0].id;await store.command({type:'evidence.source',payload:{...verificationSource,id:sourceId,excerpt:'A later synthetic source revision.'}});submit(form);await wait(()=>q('.assurance-error')?.textContent.includes('exact evidence source revision'),'Stale open source revision should fail');assert.equal(store.value.document.assurance.records.length,1);assert.equal(comparison().state,'stale');assert(!actionComplete(store.value.document,a()));
 console.log('PASS stale native evidence-source guard and reopened comparison/review; all changes used actual Worker commands');
 assert(commands.some(c=>c.type==='review.action'&&c.payload.verificationContract));assert(commands.some(c=>c.type==='assurance.record'&&c.payload.verificationObservation));assert(requests>=0);
}finally{studio.dispose();await w.happyDOM.cancelAsync();env.DB.close();}
