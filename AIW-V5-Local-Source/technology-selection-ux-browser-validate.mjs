// A Chapter 7 architect can follow the next valid step from an empty realization.
// Approval only opens for a current, separately recorded architect selection.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.AIW_PLAYWRIGHT_MODULE||'playwright');
const port=await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const db='.aiw-local/technology-selection-ux-'+port+'.sqlite';
const server=spawn(process.execPath,['server.js','--port',String(port)],{env:{...process.env,AIW_LOCAL_DB:db,OPENAI_API_KEY:''},stdio:['ignore','pipe','inherit']});
process.on('exit',()=>{try{server.kill('SIGKILL')}catch{/* already exited */}});
await new Promise((resolve,reject)=>{server.stdout.on('data',chunk=>{if(String(chunk).includes('ready'))resolve()});server.on('exit',code=>reject(Error('Server exited '+code)))});
const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
 page.setDefaultTimeout(12000);
 page.on('pageerror',e=>errors.push(e.message));
 const seed=(type,payload)=>page.evaluate(async([type,payload])=>{
  const store=window.aiwProjectStore;
  const response=await fetch('/api/commands?response=sections',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Idempotency-Key':'selection-fixture-'+crypto.randomUUID()},body:JSON.stringify({revision:store.value.revision,command:{type,payload}})});
  const result=await response.json();if(!response.ok)throw Error(result.error);
  await store.load();return result.selected;
 },[type,payload]);
 await page.goto('http://127.0.0.1:'+port+'/?chapter=7&tab=work',{waitUntil:'networkidle'});
 console.log('Chapter 7 opened');
 const id=await page.evaluate(async()=>{
  const store=window.aiwProjectStore,{capabilities}=await import('/technology-domain.js');
  const cap=capabilities(store.value.document)[0];
  const result=await store.command({type:'techrealisation.plan',payload:{title:'Selection guidance test',purpose:'Realize the linked capability',owner:'Platform architect',mappings:[{capabilityId:cap.id,scope:'Candidate implementation'}]}});
  return result.selected;
 });
 const url='http://127.0.0.1:'+port+'/?chapter=7&tab=work&object='+encodeURIComponent(id);
 await page.goto(url,{waitUntil:'networkidle'});
 console.log('Empty realization opened',id);
 await page.goto(url.replace('tab=work','tab=model'),{waitUntil:'networkidle'});
 const inspector=await page.evaluate(()=>{
  const rect=e=>{const b=e.getBoundingClientRect();return {width:b.width,left:b.left,right:b.right}};
  const rail=document.querySelector('.studio>#inspector');
  return {position:document.body.dataset.lensPosition,stage:rect(document.querySelector('.studio>.stage')),inspector:rect(rail),overflow:rail.scrollWidth>rail.clientWidth+1};
 });
 assert.ok(inspector.inspector.width>=280&&!inspector.overflow,JSON.stringify(inspector));
 assert.ok(inspector.inspector.right<=1281,JSON.stringify(inspector));
 assert.match(await page.locator('#inspector .cm-spec').innerText(),/Add a technology option/);
 assert.equal(await page.locator('#inspector .cm-spec [data-act="record"]').count(),0);
 await page.locator('#inspector .cm-spec [data-act="add-option"]').click();
 await page.locator('#tr-option-form').waitFor();
 await page.locator('.tr-dialog header [data-tr-action="close"]').click();
 await page.goto(url,{waitUntil:'networkidle'});
 // rc39/rc40 Work (rc41 W4): the realization is the Work frame (.work-view); its next step is the frame's task action
 // (.work-task-actions, the primary beside Edit and New) and the approval sits under "External approval & model context"
 // (.work-support .l-model-actions).
 const main=page.locator('.work-view');
 assert.equal(await main.locator('.work-task-actions [data-tr-action="stage"][data-tr-stage="compare"]').innerText(),'Compare & add an option');
 assert.ok(await main.locator('.work-support .l-model-actions [data-tr-action="approval"]').isDisabled());
 assert.match(await main.innerText(),/Add a product or custom option/);
 await main.locator('.work-task-actions [data-tr-action="stage"][data-tr-stage="compare"]').click();
 assert.ok(await page.locator('.tr-library-picker').isVisible());
 await seed('techrealisation.option',{id,option:{title:'Candidate database',product:'PostgreSQL',version:'17',vendor:'Architecture team'}});
 // The work stage is part of the address (Compare adds stage=compare), so a reload reopens the comparison. Each state is
 // read on the realization's plan, which carries the next step beside the approval action: reopen it.
 assert.equal(new URL(page.url()).searchParams.get('stage'),'compare');
 await page.goto(url,{waitUntil:'networkidle'});
 console.log('Single option opened');
 // rc38 (the owner's snapshot; rc41 W4): with an option to prefer, the next step is "Choose draft preference"
 // (selectionNext: choose-preference), a dialog whose select offers the plan's options and saves a draft preference.
 assert.equal(await main.locator('.work-task-actions [data-tr-action="choose-preference"]').innerText(),'Choose draft preference');
 assert.ok(await main.locator('.work-support .l-model-actions [data-tr-action="approval"]').isDisabled());
 await main.locator('.work-task-actions [data-tr-action="choose-preference"]').click();
 await page.locator('#tr-preference-form').waitFor();
 assert.deepEqual(await page.locator('#tr-preference-form [name="optionId"] option').allInnerTexts(),['PostgreSQL'],'the one option to prefer');
 await page.locator('#tr-preference-form button[type="submit"]').click();
 await page.waitForFunction(id=>!!window.aiwProjectStore.value.document.technologyRealisation.records.find(r=>r.id===id)?.selectedOptionId,id);
 await seed('techrealisation.plan',{id,owner:''});
 await page.goto(url,{waitUntil:'networkidle'});
 console.log('Draft preference opened');
 assert.equal(await main.locator('.work-task-actions [data-tr-action="edit-plan"][data-tr-panel="0"]').innerText(),'Complete purpose & owner');
 await main.locator('.work-task-actions [data-tr-action="edit-plan"][data-tr-panel="0"]').click();
 assert.ok(await page.locator('#tr-plan-form [data-tr-panel="0"]').isVisible());
 await page.locator('.tr-dialog header [data-tr-action="close"]').click();
 await seed('techrealisation.plan',{id,owner:'Platform architect'});
 await page.reload({waitUntil:'networkidle'});
 assert.equal(await main.locator('.work-task-actions [data-tr-action="edit-plan"][data-tr-panel="2"]').innerText(),'Explain the selection');
 await page.goto(url.replace('tab=work','tab=model'),{waitUntil:'networkidle'});
 assert.equal(await page.locator('#inspector .cm-spec [data-act="record"]').count(),0);
 assert.match(await page.locator('#inspector .cm-spec').innerText(),/Explain the selection/);
 await page.goto(url,{waitUntil:'networkidle'});
 await main.locator('.work-task-actions [data-tr-action="edit-plan"][data-tr-panel="2"]').click();
 assert.ok(await page.locator('#tr-plan-form [data-tr-panel="2"]').isVisible());
 await page.locator('.tr-dialog header [data-tr-action="close"]').click();
 await seed('techrealisation.plan',{id,rationale:'The candidate offers a documented transaction boundary; verify resilience against the measured workload.'});
 await page.reload({waitUntil:'networkidle'});
 console.log('Rationale opened');
 assert.equal(await main.locator('.work-task-actions [data-tr-action="record"]').innerText(),'Review & record selection');
 assert.ok(await main.locator('.work-support .l-model-actions [data-tr-action="approval"]').isDisabled());
 await main.locator('.work-task-actions [data-tr-action="record"]').click();
 await page.locator('#tr-record-form [name="reviewed"]').check();
 await page.locator('#tr-record-form [type="submit"]').click();
 await page.waitForFunction(id=>!!window.aiwProjectStore.value.document.technologyRealisation.records.find(r=>r.id===id)?.recorded,id);
 console.log('Architect selection recorded');
 assert.ok(await main.locator('.work-support .l-model-actions [data-tr-action="approval"]').isEnabled());
 await page.goto(url.replace('tab=work','tab=model'),{waitUntil:'networkidle'});
 assert.match(await page.locator('#inspector .cm-spec').innerText(),/Record approval/);
 await page.goto(url,{waitUntil:'networkidle'});
 // The approval is folded under "External approval & model context"; opened as a viewer opens it.
 const approvalFold=main.locator('details.work-support > summary').filter({hasText:/^\s*External approval & model context\s*$/});
 assert.equal(await approvalFold.count(),1);
 if(!await approvalFold.evaluate(s=>s.parentElement.open))await approvalFold.click();
 await main.locator('.work-support .l-model-actions [data-tr-action="approval"]').click();
 assert.ok(await page.locator('#tr-approval-form').isVisible());
 await page.locator('.tr-dialog header [data-tr-action="close"]').click();
 const selectedOptionId=await page.evaluate(id=>window.aiwProjectStore.value.document.technologyRealisation.records.find(r=>r.id===id).selectedOptionId,id);
 await seed('techrealisation.option',{id,option:{id:selectedOptionId,drawbacks:'Retest after a topology change.'}});
 await page.reload({waitUntil:'networkidle'});
 assert.ok(await main.locator('.work-support .l-model-actions [data-tr-action="approval"]').isDisabled(),'an edited option makes earlier selection stale');
 assert.deepEqual(errors,[]);
 console.log('PASS Chapter 7 selection guidance: empty option, draft preference, missing rationale, current selection and stale approval states.');
}finally{await browser.close();server.kill();try{rmSync(db,{force:true})}catch{/* test scratch cleanup */}}
