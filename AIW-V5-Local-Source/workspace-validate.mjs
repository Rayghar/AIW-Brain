import assert from 'node:assert/strict';
import {createProjectStore} from './public/project-store.js';

// Exercise the client boundary: a failed or conflicting save must retain the last
// saved model, show failure, and use the refreshed revision for a deliberate retry.
const originalFetch=globalThis.fetch;
try{
  const store=createProjectStore();
  globalThis.fetch=async()=>Response.json({revision:3,document:{name:'Saved project'}});
  await store.load();
  let finish;
  globalThis.fetch=()=>new Promise(resolve=>{finish=resolve});
  const pending=store.command({type:'example',payload:{name:'New draft'}});
  assert.equal(store.status,'saving');
  assert.equal(store.value.document.name,'Saved project');
  finish(Response.json({error:'Another tab saved first.'},{status:409}));
  await assert.rejects(pending,e=>e.conflict===true);
  assert.equal(store.status,'error');
  assert.equal(store.value.revision,3);
  assert.equal(store.value.document.name,'Saved project');
  globalThis.fetch=async()=>Response.json({revision:4,document:{name:'Other saved revision'}});
  await store.load();
  globalThis.fetch=async(path,options)=>{
    assert.equal(JSON.parse(options.body).revision,4);
    return Response.json({revision:5,document:{name:'Reviewed retry'}});
  };
  await store.command({type:'example',payload:{name:'Reviewed retry'}});
  assert.equal(store.status,'saved');
  assert.equal(store.value.document.name,'Reviewed retry');
  globalThis.fetch=async()=>new Response('Temporary outage',{status:503});
  await assert.rejects(store.command({type:'example'}),/input is still here/);
  assert.equal(store.status,'error');
  assert.equal(store.value.revision,5);
  console.log('PASS Workspace client: visible pending/saved/error states, last-good project preservation, conflict recovery, current-revision retry, and invalid-response handling.');
}finally{globalThis.fetch=originalFetch;}
