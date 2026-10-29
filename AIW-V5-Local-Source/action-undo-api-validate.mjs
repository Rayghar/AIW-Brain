import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {createProjectStore} from './public/project-store.js';
import {confirmationPlan,confirmationCandidates} from './public/validation-confirmation-domain.js';
import {digest} from './public/brain-integrity.js';

// The real HTTP handler, database persistence and browser-store delta path; all identities and reviews are fixtures.
const files=new Map(),DB=localDatabase(':memory:'),env={DB,FILES:{async put(k,v){files.set(k,v)},async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async delete(k){files.delete(k)}},ASSETS:{fetch:()=>new Response('asset')}},checks=[],originalFetch=globalThis.fetch;
const api=(url,options={})=>{const headers=new Headers(options.headers);headers.set('oai-authenticated-user-id','undo-regression');if(options.method==='POST')headers.set('Origin','https://aiw.test');return worker.fetch(new Request(new URL(url,'https://aiw.test'),{...options,headers}),env);};
globalThis.fetch=api;
try{
 const store=createProjectStore();await store.load();const original=structuredClone(store.value.document.quality.intake);
 await store.command({type:'quality.intake',payload:{}});
 const receipt=store.undoAvailable;assert.ok(receipt,'delta response exposes the server-issued latest receipt');
 const reopened=await (await api('/api/project')).json();assert.equal(reopened.document.workbench.history.at(-1).undo.id,receipt.id);
 await store.undoLastAction();assert.deepEqual(store.value.document.quality.intake,original);assert.equal(store.undoAvailable,null);
 assert.ok(store.value.document.workbench.history.some(h=>h.undoOf===receipt.id));
 const persisted=await (await api('/api/project')).json();assert.deepEqual(persisted.document.quality.intake,original);assert.ok(persisted.document.workbench.history.some(h=>h.undoOf===receipt.id));checks.push('server receipt survives storage/reload and store delta Undo');
 const replay=await api('/api/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:persisted.revision,command:{type:'action.undo',payload:{receiptId:receipt.id}}})});assert.equal(replay.status,400);checks.push('HTTP replay refuses consumed receipt');
 await store.command({type:'decision.intake',payload:{}});const old=store.undoAvailable;assert.ok(old);
 await store.command({type:'decision.review',payload:{}});assert.equal(store.undoAvailable,null);await assert.rejects(()=>store.undoLastAction(),/latest|no longer|saved/i);checks.push('later save removes Undo availability');
 await store.command({type:'quality.intake',payload:{}});const queuedReceipt=store.undoAvailable;
 const first=store.command({type:'quality.review',payload:{}}),stale=store.command({type:'action.undo',payload:{receiptId:queuedReceipt.id}},{expectedRevision:queuedReceipt.revision});
 const rejected=assert.rejects(stale,/Another save finished before Undo/);await first;await rejected;assert.notEqual(store.status,'saving');await store.load();checks.push('queued stale Undo refuses before request and does not leave saving stuck');
 const p=store.value.document,id=confirmationCandidates(p,1)[0].id,command=confirmationPlan(p,1,[id],{reviewed:true,reviewer:'Synthetic review fixture',evidence:'Regression fixture only; no project approval.',basis:digest(p)});
 await store.command(command);const h=store.value.document.workbench.history.findLast(x=>x.commands?.some(c=>c.type==='requirements.confirm'));
 assert.ok(h);assert.equal(h.actor,'undo-regression');assert.equal(store.value.document.artefacts.find(a=>a.id===id).confirmed,true);checks.push('reviewed selection executes native confirmation with authenticated HTTP actor');
 console.log(JSON.stringify({ok:true,checks,providerCalls:0}));
}finally{globalThis.fetch=originalFetch;DB.close();}
