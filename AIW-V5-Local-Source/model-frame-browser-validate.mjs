import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
process.env.PORT=String(await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});}));
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'aiw-model-frame-'));process.env.AIW_LOCAL_DB=path.join(dir,'project.sqlite');
if(process.env.AIW_FRAME_CLIENT)process.env.AIW_CLIENT_DIR=process.env.AIW_FRAME_CLIENT;
const {server}=await import('./server.js');
const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE||'/workspace/scratch/8e11d52a9a55/browser_runtime/bin/chromium-aiw',headless:true});
const errors=[],readings=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 for(const chapter of Array.from({length:11},(_,i)=>i+1)){
  await page.goto(`http://127.0.0.1:${process.env.PORT}/?chapter=${chapter}&tab=model${[1,4].includes(chapter)?"&model=map":""}`,{waitUntil:'networkidle'});
  await page.locator('.cm-top[data-model-slot]').waitFor();
  const measurements=await page.evaluate(()=>{const frame=document.querySelector('.cm'),box=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {frame:box(frame),top:box(frame.querySelector('.cm-top')),commands:box(frame.querySelector('.cm-bar')),body:box(frame.querySelector('.cm-body')),footer:box(frame.querySelector('.cm-walk')),rows:getComputedStyle(frame).gridTemplateRows};});
  assert.ok(measurements.body.height>=360,`Chapter${chapter}: useful model content height ${measurements.body.height}`);
  assert.ok(measurements.footer.y+measurements.footer.height<=measurements.frame.y+measurements.frame.height+1,'footer stays inside its named frame');
  assert.equal(await page.locator('.cm-view-more,.cm-view-context').count(),0,'no overflow view menu or duplicate purpose row');
  assert.equal(await page.locator('.cm-qpick').count(),1,'one Questions guide opens the existing views');
  assert.equal(await page.locator('.cm-model-utility').count(),1,'one compact reading/checks/connection footer');
  assert.equal(await page.locator('.cm-top .cm-views').count(),1);
  if(chapter===1){
   for(const details of [false,true]){
    const toggle=page.locator('.workspace-tools [data-panel-toggle]');if((await toggle.getAttribute('aria-expanded')==='true')!==details)await toggle.click();
    for(const choice of ['.sm-addmenu button[data-type="requirement"]','.sm-addmenu button[data-sm="link"]']){
     await page.locator('.cm-add>summary').click();
     const menu=await page.locator('.cm-add>div').boundingBox(),frame=await page.locator('.cm').boundingBox();
     assert.ok(menu.x>=frame.x&&menu.x+menu.width<=frame.x+frame.width+1,`Add menu stays within the model with Details=${details}: ${JSON.stringify({menu,frame})}`);
     await page.locator(choice).click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');
    }
   }
   await page.locator('.workspace-tools [data-panel-toggle]').click();
  }
  const views=await page.locator('.cm-top .cm-view:not(.nt-shared-view)').evaluateAll(bs=>bs.filter(b=>!b.disabled).map(b=>b.dataset.id));
  for(const id of views){await page.locator(`.cm-top .cm-view[data-id="${id}"]`).click();assert.equal(await page.locator(`.cm-top .cm-view[data-id="${id}"]`).getAttribute('aria-pressed'),'true');}
  if(chapter===11){await page.locator('.cm-top [data-id="load"]').click();assert.equal(await page.locator('.cm-bar [data-dk-in]').count(),0);assert.ok(await page.locator('.cm-body .dk-objective [data-dk-in]').count()>0,'capacity inputs belong with the capacity result');}
  await page.locator('.cm-top [data-id="diagram"]').click();assert.equal(await page.locator('.cm-bar [data-nt="export"]').count(),0,'standard export shares the footer menu');
  await page.locator('.cm-zoom-value').click();assert.equal(await page.locator('.cm-zoom-value').innerText(),'100%');
  if(chapter===1){await page.locator('.cm-export>summary').click();for(const format of ['svg','png']){const pending=page.waitForEvent('download');await page.locator(`.cm-export-standard [data-nt="export"][data-id="${format}"]`).click();const download=await pending;assert.ok(download.suggestedFilename().endsWith('.'+format),'complete diagram '+format+' remains downloadable');assert.equal(await download.failure(),null);}await page.locator('.cm-export>summary').click();}
  if(chapter===5){await page.locator('.cm-top [data-id="layers"]').click();await page.locator('.cm-bar [data-nt="menu"][data-id="focus"]').click();const overlay=page.locator('input[data-nt="overlay"][data-id="findings"]');await overlay.click();await page.locator('.cm-bar [data-nt="menu"][data-id="focus"]').click();}
  await page.locator('.cm-top [data-id="table"]').click();await page.locator('.nt-table').waitFor();
  if(process.env.AIW_MODEL_FRAME_EVIDENCE&&[4,7,11].includes(chapter)){await fs.mkdir(process.env.AIW_MODEL_FRAME_EVIDENCE,{recursive:true});await page.screenshot({path:path.join(process.env.AIW_MODEL_FRAME_EVIDENCE,`model-frame-c${String(chapter).padStart(2,'0')}.png`)});}
  readings.push({chapter,...measurements,views});
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('.cm-top .pv-pick>summary').click();await page.locator('.cm-top .pv-new').click();await page.locator('.cm.pv').waitFor();
 assert.equal(await page.locator('.cm.pv .cm-top [data-id="board"]').count(),1,'saved-perspective frame contains every native chapter view at phone width');
 await page.locator('.cm.pv .cm-top [data-id="board"]').click();await page.locator('.cm.dk').waitFor();
 assert.equal(await page.locator('.cm-top [data-id="board"]').getAttribute('aria-pressed'),'true','phone perspective returns to a native view without direct-child coupling');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'phone page has no horizontal overflow');
 for(const chapter of [1,4]){
  await page.goto(`http://127.0.0.1:${process.env.PORT}/?chapter=${chapter}&tab=model${[1,4].includes(chapter)?"&model=map":""}`,{waitUntil:'networkidle'});
  await page.locator('.cm-top[data-model-slot]').waitFor();
  const bounds=await page.evaluate(()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};return {frame:box('.cm'),body:box('.cm-body'),stage:box('.cm-stage'),footer:box('.cm-walk'),tools:[...document.querySelectorAll('.cm-tools>*,.cm-zoom button')].filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return {name:e.innerText,x:r.x,right:r.right};})};});
  assert.ok(bounds.stage.y+bounds.stage.height<=bounds.footer.y+1,`Chapter ${chapter} phone canvas stays above footer`);
  for(const item of bounds.tools)assert.ok(item.x>=bounds.frame.x&&item.right<=bounds.frame.x+bounds.frame.width,`Chapter ${chapter} phone tool ${item.name} is inside frame`);
  // On a phone the footer is one row (rc39): the key, zoom, labels and export stand behind its Tools control.
  const tools=page.locator('[data-cm-tools-toggle]');assert.ok(await tools.isVisible()&&await tools.getAttribute('aria-expanded')==='false',`Chapter ${chapter} phone footer offers its Tools control, folded`);await tools.click();assert.equal(await tools.getAttribute('aria-expanded'),'true');
  const fit=page.locator('.cm-zoom [aria-label="Fit the whole picture"]');assert.equal(await fit.innerText(),'Fit');await fit.click();
  await page.locator('.cm-zoom-value').click();assert.equal(await page.locator('.cm-zoom-value').innerText(),'100%');
  await page.locator('.cm-export>summary').click();await page.locator('.cm-export [data-model-export=svg]').waitFor({state:'visible'});await page.locator('.cm-export>summary').click();
  if(chapter===1){await page.locator('.cm-add>summary').click();await page.locator('.sm-addmenu button[data-sm="link"]').click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');}
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({suite:'Model frame redesign',readings,errors},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});}
