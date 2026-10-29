// Chapter 6's create action must hand a new project from Application needs into the saved capability.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const require=createRequire(import.meta.url),{chromium}=require(process.env.AIW_PLAYWRIGHT_MODULE||'playwright');
const port=await new Promise(resolve=>{const server=net.createServer().listen(0,'127.0.0.1',()=>{const value=server.address().port;server.close(()=>resolve(value));});});
const db='.aiw-local/technology-capability-handoff-'+port+'.sqlite',base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.js','--port',String(port)],{env:{...process.env,AIW_LOCAL_DB:db,OPENAI_API_KEY:''},stdio:['ignore','pipe','inherit']});
process.on('exit',()=>{try{server.kill('SIGKILL')}catch{/* already stopped */}});
await new Promise((resolve,reject)=>{server.stdout.on('data',chunk=>{if(String(chunk).includes('ready'))resolve();});server.on('exit',code=>reject(Error('Server exited '+code)));});
const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE,headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/',{waitUntil:'networkidle'});
 const projectId=await page.evaluate(async()=>{
  const response=await fetch('/api/projects',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Capability handoff',template:'blank',brief:''})});
  assertResponse(response);const id=(await response.json()).document.id;
  const state=await (await fetch('/api/project?project='+encodeURIComponent(id),{credentials:'same-origin'})).json();
  const component=await fetch('/api/commands?project='+encodeURIComponent(id),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:state.revision,command:{type:'realisation.component',payload:{title:'Payment intake',kind:'service',purpose:'Take payment instructions',technologyNeeds:'Persist a durable payment instruction record.'}}})});
  assertResponse(component);return id;
  function assertResponse(response){if(!response.ok)throw Error('Setup request failed: '+response.status);}
 });
 await page.goto(base+'/?chapter=7&tab=work&project='+projectId,{waitUntil:'networkidle'});
 // rc39/rc40 Work (rc41 W4): an empty Chapter 7 is the Work frame's .work-empty in its body, saying what it needs first.
 await page.locator('.work-view .work-body > .work-empty').waitFor();
 assert.match(await page.locator('.work-view .work-body > .work-empty').innerText(),/^Create a capability in Chapter 6 before defining or reviewing its realization\.\s+A logical capability is required\.\s+Open logical technology →$/);
 assert.equal(await page.locator('.studio>#inspector:visible').count(),0,'An empty Chapter 7 reading should use the width for its next action');
 const emptyWidth=await page.locator('.studio').evaluate(e=>({container:e.clientWidth,stage:e.querySelector('.stage').getBoundingClientRect().width}));
 assert.ok(emptyWidth.stage>=emptyWidth.container-4,'The empty state uses the available main surface: '+JSON.stringify(emptyWidth));
 await page.goto(base+'/?chapter=6&tab=work&project='+projectId,{waitUntil:'networkidle'});
 await page.locator('.work-stages [data-t-stage="needs"][aria-pressed="true"]').waitFor();
 // rc39/rc40 Work (rc41 W4): the Needs stage lists each application's needs with no create action; "New capability" is
 // the Capabilities stage's primary frame action. The person moves to Capabilities and creates there, mapping the need.
 assert.equal(await page.locator('.work-view .work-task-actions [data-t-action="new"]').count(),0,'Needs offers no create action of its own');
 await page.locator('.work-view .work-body [data-work-need]').first().waitFor();
 await page.locator('.work-stages [data-t-stage="capabilities"]').click();
 await page.locator('.work-stages [data-t-stage="capabilities"][aria-pressed="true"]').waitFor();
 assert.equal(await page.locator('.work-view .work-task-actions [data-t-action="new"]').innerText(),'New capability');
 await page.locator('.work-view .work-task-actions [data-t-action="new"]').click();
 await page.locator('#t-capability-form [name="title"]').fill('Durable payment storage');
 await page.locator('#t-capability-form [name="category"]').selectOption('transactional');
 await page.locator('#t-capability-form [name="purpose"]').fill('Keep durable payment instructions.');
 await page.locator('#t-capability-form [data-t-step="1"]').first().click();
 await page.locator('#t-capability-form .t-map-group summary').first().click();
 const need=page.locator('#t-capability-form [name="needIds"]').first();
 await need.check();
 await page.locator('#t-capability-form button[type="submit"]').click();
 await page.locator('.t-cap-card.just-saved').waitFor();
 assert.equal(await page.locator('.work-stages [data-t-stage="capabilities"]').getAttribute('aria-pressed'),'true');
 assert.match(await page.locator('.t-cap-card.just-saved').innerText(),/Durable payment storage[\s\S]*Saved to this project[\s\S]*Review support & rationale/i);
 const created=page.locator('.t-cap-card.just-saved .l-record-title');
 assert.equal(await created.innerText(),'Durable payment storage');
 assert.equal(await created.evaluate(e=>document.activeElement===e),true,'Keyboard focus follows the saved record');
 const selectedId=await created.getAttribute('data-select');
 const stored=(await (await page.request.get(base+'/api/project?project='+projectId)).json()).document;
 assert.equal(stored.technology.capabilities.find(c=>c.id===selectedId)?.title,'Durable payment storage');
 assert.equal(stored.technology.mappings.some(m=>m.capabilityId===selectedId),true,'Support mapping is retained');
 await page.setViewportSize({width:390,height:844});
 assert(await page.locator('.t-cap-card.just-saved [data-t-action="edit-support"]').isVisible());
 const width=await page.evaluate(()=>({page:document.body.scrollWidth,view:innerWidth}));
 assert(width.page<=width.view+2,'Capability handoff must fit a phone: '+JSON.stringify(width));
 await page.locator('.t-cap-card.just-saved [data-t-action="edit-support"]').click();
 assert.equal(await page.locator('#t-capability-form [data-t-panel="1"]').isVisible(),true,'Next action opens the support and rationale step');
 assert.equal(await page.locator('#t-capability-form [name="needIds"]').first().isChecked(),true);
 await page.keyboard.press('Escape');
 await page.locator('.work-stages [data-t-stage="needs"]').click();
 await page.locator('.work-stages [data-t-stage="capabilities"]').click();
 assert.equal(await page.locator('.t-cap-card.just-saved').count(),0,'Transient feedback leaves when the architect changes stage');
 await page.reload({waitUntil:'networkidle'});
 await page.locator('.work-stages [data-t-stage="capabilities"]').click();
 assert.equal(await page.locator('.t-cap-card .l-record-title[data-select="'+selectedId+'"]').count(),1,'Saved record remains visible after reload');
 assert.deepEqual(errors,[]);
 console.log('Chapter 6 capability handoff: Chapter 7 empty state names its prerequisite; New capability on the Capabilities stage mapped to an application need, persisted mapping, focused Capabilities record, next support action and reload passed.');
}finally{await browser.close();server.kill();rmSync(db,{force:true});}
