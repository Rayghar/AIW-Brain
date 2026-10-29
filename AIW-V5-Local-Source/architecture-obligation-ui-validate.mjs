// Native Chapter 11 DOM and canonical command proof. No browser or live provider.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w=new Window({url:'https://aiw.test/?chapter=11&tab=work',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const key of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','SVGElement','MutationObserver','ResizeObserver','navigator','CSS'])Object.defineProperty(globalThis,key,{value:key==='window'?w:w[key],configurable:true,writable:true});
for(const key of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[key]=w[key].bind(w);
globalThis.fetch=async()=>{throw Error('Verification forms must not call a provider or fetch an evidence reference.');};
const {acceptedObligationFixture,obligationAt,reviewCommand}=await import('./architecture-obligation-fixtures.mjs');
const {createReviewStudio}=await import('./public/review-ui.js');
const {applyFinalReviewCommand,withFinalReview}=await import('./public/review-domain.js');
const {applyEvidenceCommand}=await import('./public/evidence-domain.js');
const {applyQualityCommand}=await import('./public/quality-domain.js');
const {architectureObligationsFor}=await import('./public/architecture-obligations.js');
let initial=acceptedObligationFixture();
const evidenceSource={title:'Synthetic saved exercise',location:'fixture://observed/deadline',excerpt:'Synthetic exercise retained one effect for the original identity.',status:'Confirmed',confirmedBy:'Synthetic reviewer',reviewed:true};
initial=applyEvidenceCommand(initial,{type:'evidence.source',payload:evidenceSource},obligationAt,'synthetic-reviewer').document;
let saved=JSON.stringify(initial),commands=[],notices=[];
const store={value:{document:initial,revision:1},async command(command){const result=applyFinalReviewCommand(this.value.document,command,obligationAt,'synthetic-reviewer');commands.push(structuredClone(command));saved=JSON.stringify(result.document);this.value={document:withFinalReview(JSON.parse(saved)),revision:this.value.revision+1};return {...result,document:this.value.document};},async load(){this.value={document:withFinalReview(JSON.parse(saved)),revision:this.value.revision+1};}};
window.aiwProjectStore=store;
document.body.innerHTML='<div id="review-root"></div><div id="toast"></div>';
let studio;const state={chapter:11,tab:'work',selected:'obj-001',reviewRequirement:'REQ-001',visible:['physical'],cursor:false},render=()=>{document.querySelector('#review-root').innerHTML=state.tab==='output'?studio.output():state.tab==='validate'?studio.validation():studio.work();};
studio=createReviewStudio(store);studio.bind({state,persist(){},render,toast:s=>notices.push(s),getNode:()=>null,setTab(tab){state.tab=tab;render();}});studio.openSection('delivery');render();
const q=selector=>document.querySelector(selector),click=selector=>{const el=q(selector);assert(el,'Missing '+selector);el.click();return el;},input=(name,value)=>{const el=q('.rv-dialog [name="'+name+'"]');assert(el,'Missing input '+name);el.value=value;el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));return el;};
const waitFor=async(check,message)=>{for(let i=0;i<150;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.fail(message+' '+q('#rv-dialog-error')?.textContent);};
const submit=id=>q('#'+id).dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
const closed=()=>waitFor(()=>!q('.rv-dialog')&&!studio.busy,'The native action did not save');
const obligation=id=>architectureObligationsFor(store.value.document).find(o=>o.id===id);
const [first,second]=architectureObligationsFor(initial),accepted=JSON.stringify(initial.coauthoring.designTasks[0].applied),methodReceipt=JSON.stringify(initial.coauthoring.designTasks[0].methodReceipt);
const openAction=id=>click('[data-rv-action="action"][data-rv-id="'+id+'"]');
const openEvidence=id=>click('[data-rv-action="delivery"][data-rv-id="'+id+'"]');
const fillEvidence=()=>{input('status','Verified');input('progress','Observed one authoritative effect after the original operation was repeated.');input('reviewer','Synthetic verification reviewer');input('reference','fixture://observed/deadline');q('[name="evidenceSourceIds"]').checked=true;};
try{
 assert.match(q('#review-root').textContent,/6 open obligation/);
 click('[data-rv-action="obligation"][data-rv-id="'+first.id+'"]');
 assert.equal(q('[name="architectureObligationId"]').value,first.id);assert.equal(q('[name="acceptance"]').value,first.evidence);
 assert.deepEqual(new FormData(q('#rv-action-form')).getAll('objectIds'),first.targetIds);
 input('owner','Synthetic delivery owner');input('due','2026-11-01');
 click('.rv-dialog [data-rv-action="close"]');assert.equal(q('.rv-dialog .l-discard').hidden,false);assert.equal(commands.length,0);click('.rv-dialog [data-rv-action="keep"]');
 submit('rv-action-form');await closed();const id=store.value.document.finalReview.actions[0].id;
 assert.equal(obligation(first.id).verificationState,'evidence-awaiting');assert.equal(commands[0].type,'review.action');assert.equal(commands[0].payload.architectureObligation.obligationId,first.id);
 await store.load();render();openAction(id);assert.equal(q('[name="owner"]').value,'Synthetic delivery owner');assert.equal(q('[name="architectureObligationId"]').value,first.id);click('.rv-dialog [data-rv-action="close"]');assert.equal(commands.length,1,'Resume and inspect never save');
 console.log('PASS native create/cancel/save/resume preserves exact obligation, required targets and draft state');

 openEvidence(id);assert.equal(q('[name="evidenceSourceIds"]').checked,false,'Evidence is never preselected');assert.equal(q('[name="evidenceSourceIds"]').value,initial.coauthoring.sources[0].id);
 assert.match(q('.rv-dialog blockquote').textContent,/Synthetic exercise retained one effect/);assert.match(q('.rv-dialog').textContent,/Saved revision SHA-256: [a-f0-9]{64}/);
 fillEvidence();submit('rv-delivery-form');await waitFor(()=>!q('#rv-dialog-error').hidden,'Unreviewed evidence should be rejected');assert.equal(obligation(first.id).verificationState,'evidence-awaiting');
 q('[name="reviewed"]').checked=true;submit('rv-delivery-form');await closed();assert.equal(obligation(first.id).verificationState,'current-verified');assert.equal(obligation(second.id).verificationState,'open');
 const firstProof=JSON.stringify(store.value.document.finalReview.actions[0].verification);assert.equal(store.value.document.finalReview.actions[0].verification.evidenceSources[0].revision,1);
 state.tab='output';render();assert.match(q('#review-root').textContent,/1 current verification recorded/);state.tab='validate';render();assert.equal(q('[data-rv-id="architecture-obligation:'+first.id+'"]'),null);state.tab='work';render();
 assert.equal(JSON.stringify(store.value.document.coauthoring.designTasks[0].applied),accepted);assert.equal(JSON.stringify(store.value.document.coauthoring.designTasks[0].methodReceipt),methodReceipt);
 console.log('PASS native explicit evidence review, current status in Work/Validate/Output and immutable adoption');

 openEvidence(id);fillEvidence();q('[name="reviewed"]').checked=true;
 store.value.document=applyQualityCommand(store.value.document,{type:'quality.driver',payload:{...store.value.document.quality.drivers[0],targetValue:'15'}},obligationAt).document;
 submit('rv-delivery-form');await waitFor(()=>q('#rv-dialog-error')?.textContent.includes('basis changed'),'An open evidence form must reject a changed driver');assert.equal(JSON.stringify(store.value.document.finalReview.actions[0].verification),firstProof);
 click('.rv-dialog [data-rv-action="close"]');click('.rv-dialog [data-rv-action="discard"]');render();assert.equal(obligation(first.id).verificationState,'review-required');
 openAction(id);assert.match(q('.rv-dialog').textContent,/linked source, driver, boundary/);submit('rv-action-form');await closed();assert.equal(obligation(first.id).verificationState,'evidence-awaiting');assert(store.value.document.finalReview.actions[0].history.some(h=>h.verification?.reference==='fixture://observed/deadline'));
 openEvidence(id);fillEvidence();q('[name="reviewed"]').checked=true;submit('rv-delivery-form');await closed();assert.equal(obligation(first.id).verificationState,'current-verified');
 console.log('PASS stale open form rejection, deliberate definition review and retained historical evidence');

 // A previously independent action can be explicitly linked. Similar text alone never does so.
 store.value.document=reviewCommand(store.value.document,'action',{title:second.action,owner:'Other owner',due:'2026-11-02',acceptance:'',objectIds:[initial.realisation.components[1].id]});saved=JSON.stringify(store.value.document);render();const independentId=store.value.document.finalReview.actions.at(-1).id;
 assert.equal(obligation(second.id).verificationState,'open');openAction(independentId);input('architectureObligationId',second.id);
 assert.equal(q('[name="acceptance"]').value,second.evidence);assert(new FormData(q('#rv-action-form')).getAll('objectIds').includes(second.targetIds[0]));
 submit('rv-action-form');await closed();assert.equal(obligation(second.id).verificationState,'evidence-awaiting');assert.equal(obligation(first.id).verificationState,'current-verified');
 openEvidence(id);fillEvidence();q('[name="reviewed"]').checked=true;
 store.value.document=applyEvidenceCommand(store.value.document,{type:'evidence.source',payload:{...evidenceSource,id:initial.coauthoring.sources[0].id,excerpt:evidenceSource.excerpt+' Revised observations.'}},obligationAt,'synthetic-reviewer').document;
 submit('rv-delivery-form');await waitFor(()=>q('#rv-dialog-error')?.textContent.includes('current confirmed revision'),'A changed evidence source must reject the captured revision');
 const writes=commands.length,projectId=store.value.document.id;store.value.document={...store.value.document,id:'different-project'};submit('rv-delivery-form');await waitFor(()=>q('#rv-dialog-error')?.textContent.includes('project changed'),'A form cannot continue into a different project');assert.equal(commands.length,writes);store.value.document={...store.value.document,id:projectId};
 assert.equal(JSON.stringify(store.value.document.coauthoring.designTasks[0].applied),accepted);assert.equal(JSON.stringify(store.value.document.coauthoring.designTasks[0].methodReceipt),methodReceipt);
 console.log('PASS explicit existing-action link, evidence revision and project guards; no provider call or implicit verification');
}finally{studio.dispose();await w.happyDOM.cancelAsync();}
