// Real SQLite/worker authorization and saved synthetic runs; no model calls.
import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {createProject} from './shared/projects-domain.js';
import {applyCommand} from './public/requirements-domain.js';
import {reasoningPacket} from './public/brain-reasoning.js';
const owner='history-owner',projectId='history-project',target='M:1:REQ-001',other='M:1:REQ-002',files=new Map();
const env={DB:localDatabase(':memory:'),FILES:{async get(k){return files.has(k)?{text:async()=>files.get(k)}:null},async put(k,v){files.set(k,v)}},ASSETS:{fetch:()=>new Response('asset')}};
let p=createProject({name:'Synthetic reasoning history',template:'blank'},projectId);
for(const title of ['Reserve equipment','Inspect equipment'])p=applyCommand(p,{type:'artefact',payload:{type:'requirement',title,description:'Retain one authoritative outcome.',acceptance:'Observe the authoritative result.',source:'Synthetic service regression'}}).document;
const at='2026-10-13T10:00:00.000Z';
async function putProject(actor,id){await env.DB.prepare('INSERT INTO projects(owner_id,id,document,revision,updated_at) VALUES(?,?,?,1,?)').bind(actor,id,JSON.stringify({...p,id}),at).run();}
await putProject(owner,projectId);await putProject(owner,'other-project');await putProject('foreign-actor',projectId);
const packet=reasoningPacket(p,{task:'decisions',ids:[target],scope:target,prompt:'Assess this synthetic record.'});
const otherPacket=reasoningPacket(p,{task:'decisions',ids:[other],scope:'chapter-batch',prompt:'Assess a different synthetic record.'});
packet.sources.push({ref:'S99',id:'synthetic-source',kind:'project-source',objectId:'SRC-SYNTHETIC',title:'Synthetic exact source',posture:'Synthetic fixture only',revision:7,passage:'P-007',versionStamp:'source-version-7',receipt:{locator:'synthetic-original.md:2-4',sourceHash:'a'.repeat(64)},excerpt:'Synthetic test passage; no architectural authority.',truncated:false,applicableTo:[target]});
async function save(id,minute,{actor=owner,project=projectId,item=target,withheld=false,stale=false,sqlObject='batch-scope',status='completed',missing=false}={}){
 const key='intelligence/'+encodeURIComponent(actor)+'/'+project+'/'+id+'.json',createdAt=new Date(Date.parse(at)+minute*60000).toISOString();
 const ownPacket=structuredClone(item===target?packet:otherPacket);
 if(stale)ownPacket.items[0].stamp='synthetic-older-record';
 const run={id,projectId:project,actor,status,mode:'reason',provider:'synthetic',model:'fixture-only',createdAt,packet:ownPacket,result:{summary:'Saved synthetic assessment',assessments:[{id:item,headline:id,reasoning:'Synthetic advisory text.',withheld,issues:withheld?['Synthetic consistency failure']:[],sourceRefs:['S1'],verification:[]}]},groundingReview:{accepted:!withheld,withheld:withheld?[item]:[]}};
 if(!missing)files.set(key,JSON.stringify(run));
 await env.DB.prepare("INSERT INTO intelligence_runs(owner_id,id,project_id,object_id,mode,input_stamp,status,provider,model,storage_key,created_at,updated_at,actor_id,reserved_tokens,used_tokens) VALUES(?,?,?,?,'reason','fixture',?,'synthetic','fixture-only',?,?,?,?,0,0)").bind(actor,id,project,sqlObject,status,key,createdAt,createdAt,actor).run();
 return run;
}
await save('old-answer',1,{stale:true});await save('withheld-answer',2,{withheld:true});await save('latest-answer',3);
await save('unrelated-newer',4,{item:other,sqlObject:target});
await save('foreign-project-answer',5,{project:'other-project'});await save('foreign-actor-answer',6,{actor:'foreign-actor'});
await save('pending-answer',7,{status:'pending'});await save('unreadable-answer',8,{missing:true});
async function get(item,{actor=owner,project=projectId}={}){
 const url='https://aiw.test/api/intelligence/reasonings?project='+project+(item===undefined?'':'&item='+encodeURIComponent(item));
 const r=await worker.fetch(new Request(url,{headers:actor?{'oai-authenticated-user-id':actor}:{}}),env);return {status:r.status,data:await r.json()};
}
const originalFetch=globalThis.fetch;let providerCalls=0;globalThis.fetch=()=>{providerCalls++;throw Error('Read-only history cannot call providers');};
try{
 const modelBefore=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();
 const defaults=await get();assert.equal(defaults.status,200);assert.equal(defaults.data.history,undefined);
 assert.deepEqual(defaults.data.runs.map(r=>r.id),['unrelated-newer','latest-answer'],'Default endpoint still keeps the newest assessment of each item');
 const history=await get(target);assert.equal(history.status,200,JSON.stringify(history.data));
 assert.deepEqual(history.data.runs.map(r=>r.id),['latest-answer','withheld-answer','old-answer'],'Match saved assessment IDs, not SQL batch/object scope');
 assert.equal(history.data.history.item,target);assert.equal(history.data.history.limit,20);assert.equal(history.data.history.scanLimit,400);assert.equal(history.data.history.returned,3);assert.equal(history.data.history.unreadable,1);assert.equal(history.data.history.limitReached,false);assert.match(history.data.history.availability,/bounded history/);
 assert.equal(history.data.runs[0].current,true);assert.equal(history.data.runs[2].current,false);assert.equal(history.data.runs[1].result.assessments[0].withheld,true);assert.deepEqual(history.data.runs[1].groundingReview.withheld,[target]);
 const source=history.data.runs[0].packet.sources.find(s=>s.ref==='S99');assert.equal(source.revision,7);assert.equal(source.passage,'P-007');assert.equal(source.versionStamp,'source-version-7');assert.equal(source.receipt.locator,'synthetic-original.md:2-4');assert.equal(source.excerpt,packet.sources.at(-1).excerpt);assert(history.data.runs[0].packet.brainReceipt.instructions.sha256);
 assert.equal((await get(target,{actor:null})).status,401);assert.equal((await get(target,{actor:'ungranted-stranger'})).status,404);
 assert.deepEqual((await get(target,{actor:'foreign-actor'})).data.runs.map(r=>r.id),['foreign-actor-answer']);
 assert.deepEqual((await get(target,{project:'other-project'})).data.runs.map(r=>r.id),['foreign-project-answer']);
 await env.DB.prepare('INSERT INTO project_access(owner_id,project_id,actor_id,role,created_at) VALUES(?,?,?,?,?)').bind(owner,projectId,'permitted-viewer','viewer',at).run();
 assert.deepEqual((await get(target,{actor:'permitted-viewer'})).data.runs.map(r=>r.id),history.data.runs.map(r=>r.id),'An explicitly authorized collaborator retains existing project read access');
 for(const invalid of ['',target+' ',target+';DROP TABLE projects','M:1:'+'x'.repeat(160)])assert.equal((await get(invalid)).status,400);
 assert.equal((await get('M:1:NO-SAVED-ASSESSMENT')).data.runs.length,0);
 // Retention and unreadable storage are reported; no claim of complete history.
 for(let i=0;i<21;i++)await save('bounded-'+i,10+i);
 const bounded=await get(target);assert.equal(bounded.data.runs.length,20);assert.equal(bounded.data.runs[0].id,'bounded-20');assert.equal(bounded.data.runs.at(-1).id,'bounded-1');assert.equal(bounded.data.history.limitReached,true);assert.equal(bounded.data.history.scanned,20);
 for(let i=0;i<400;i++)await save('later-unrelated-'+i,100+i,{item:other,sqlObject:target});
 const scanned=await get(target);assert.equal(scanned.data.runs.length,0);assert.equal(scanned.data.history.scanned,400);assert.equal(scanned.data.history.scanLimitReached,true,'Older matches outside the disclosed scan window are not presented as complete available history');
 const modelAfter=await env.DB.prepare('SELECT document,revision FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first();assert.deepEqual(modelAfter,modelBefore);assert.equal(providerCalls,0);
 console.log('PASS: exact-item saved reasoning history, default latest projection, 20-run bound, withheld/stale/source receipts, malformed IDs, actor/project isolation, no provider calls or model mutation.');
}finally{globalThis.fetch=originalFetch;env.DB.close();}
