// Source or built-client regression: preserved shell routes, optional inspection and persisted preferences.
// This exercises view actions only, on a fresh local database, without a provider or release build.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {chromium} from 'playwright';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'aiw-shell-restore-'));
process.env.PORT=String(await new Promise(resolve=>{const server=net.createServer().listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});}));
process.env.AIW_LOCAL_DB=path.join(dir,'project.sqlite');process.env.AIW_LOCAL_FILES=path.join(dir,'objects');process.env.AIW_CLIENT_DIR=process.env.AIW_SHELL_RESTORATION_CLIENT||'public';
process.env.OPENAI_API_KEY='';process.env.ANTHROPIC_API_KEY='';
const {server}=await import('./server.js');
const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
let failure=null;const startedAt=new Date().toISOString();
page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:'+process.env.PORT,button=()=>page.locator('.workspace-tools [data-panel-toggle]');
async function go(chapter,tab,object=''){await page.goto(base+'/?chapter='+chapter+'&tab='+tab+(object?'&object='+encodeURIComponent(object):''),{waitUntil:'networkidle'});await page.waitForFunction(()=>!!window.aiwProjectStore?.value?.document);const coach=page.locator('[data-coach="close"]');if(await coach.isVisible())await coach.click();}
async function state(expected){await page.waitForFunction(value=>document.body.dataset.panel===value,expected);assert.equal(await button().getAttribute('aria-expanded'),String(expected==='open'));}
try{
 await go(4,'work');const record=await page.evaluate(()=>window.aiwProjectStore.value.document.logical.responsibilities[0].id);
 assert(await page.locator('#yah-text').isVisible());assert.match(await page.locator('#yah-text').innerText(),/Work/);assert(await page.locator('.chapter-next').isVisible());
 await page.locator('.workspace-next').click();await page.locator('#l-intake-form').waitFor();await page.keyboard.press('Escape');checks.push('Native Next task opens the Chapter 4 input-review workflow.');
 await go(4,'model');assert(await page.locator('.workspace-next').isVisible());await page.locator('.workspace-next').click();await page.locator('#l-intake-form').waitFor();await page.keyboard.press('Escape');checks.push('Model footer Next task invokes the same native Chapter 4 workflow.');await go(4,'work');
 await page.evaluate(()=>localStorage.setItem('aiw.panel.collapsed','1'));await page.reload({waitUntil:'networkidle'});await state('collapsed');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('aiw-details-v1:bank-payment'))['4:work']),true);checks.push('Legacy collapsed preference migrated.');
 await button().click();await state('open');await page.reload({waitUntil:'networkidle'});await state('open');
 await button().click();await state('collapsed');await page.reload({waitUntil:'networkidle'});await state('collapsed');
 await page.evaluate(id=>document.dispatchEvent(new CustomEvent('aiw:inspect-record',{detail:{id}})),record);await state('open');assert(await page.locator('[data-record-card="'+record+'"]').isVisible());
 await page.reload({waitUntil:'networkidle'});await state('collapsed');checks.push('Explicit inspection opens without erasing the saved closed preference; both manual states survive reload.');
 for(const tab of ['validate','output']){
  await go(11,tab);await state('collapsed');const stage=page.locator('.studio>.stage');await stage.evaluate(e=>{e.scrollTop=180;});
  const before=await page.evaluate(()=>({chapter:new URL(location.href).searchParams.get('chapter'),tab:new URL(location.href).searchParams.get('tab'),scope:new URL(location.href).searchParams.get('scope'),scroll:document.querySelector('.studio>.stage').scrollTop,frame:document.querySelector('.output-inline-preview')?.getAttribute('src'),document:document.querySelector('[data-output-document][aria-pressed=true]')?.dataset.outputDocument}));
  await page.evaluate(id=>document.dispatchEvent(new CustomEvent('aiw:inspect-record',{detail:{id,chapter:99}})),record);await state('open');
  assert(await page.locator('#inspector [data-record-card="'+record+'"]').isVisible());assert.match(await page.locator('.inspector-context').innerText(),/Chapter 04/i);assert(await page.locator('#inspector [data-nt-dossier="'+record+'"]').isVisible());
  const after=await page.evaluate(()=>({chapter:new URL(location.href).searchParams.get('chapter'),tab:new URL(location.href).searchParams.get('tab'),scope:new URL(location.href).searchParams.get('scope'),scroll:document.querySelector('.studio>.stage').scrollTop,frame:document.querySelector('.output-inline-preview')?.getAttribute('src'),document:document.querySelector('[data-output-document][aria-pressed=true]')?.dataset.outputDocument}));assert.deepEqual(after,before);
  assert.equal(await page.locator('.studio>.stage').evaluate(e=>Math.round(e.getBoundingClientRect().width)),await page.locator('.studio').evaluate(e=>Math.round(e.getBoundingClientRect().width)),'Optional review drawer must not shrink queue/preview into a third column');
  await page.locator('#inspector>.panel-dismiss').click();await state('collapsed');checks.push(tab+': canonical foreign record inspected without changing chapter/tab/scope/scroll or output selection.');
 }
 for(const width of [1024,390]){
  await page.setViewportSize({width,height:1000});await go(11,'validate');await page.evaluate(id=>document.dispatchEvent(new CustomEvent('aiw:inspect-record',{detail:{id}})),record);await state('open');
  const geometry=await page.locator('#inspector').evaluate(e=>{const r=e.getBoundingClientRect(),close=e.querySelector('.panel-dismiss').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,closeTop:close.top,scroll:document.documentElement.scrollWidth,width:innerWidth,height:innerHeight};});
  assert(geometry.left>=0&&geometry.right<=width&&geometry.top>=0&&geometry.bottom<=1000,JSON.stringify(geometry));assert(geometry.scroll<=width,JSON.stringify(geometry));assert(geometry.closeTop>=0&&geometry.closeTop<1000);
  await page.keyboard.press('Escape');await state('collapsed');assert(await page.locator('#yah-text').isVisible());checks.push(width+'px: bounded drawer, visible close and location, Escape dismissal, no horizontal overflow.');
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors},null,2));
}catch(error){failure={message:error.message,stack:error.stack};throw error;}
finally{
 if(process.env.AIW_SHELL_RESTORATION_EVIDENCE){
  const evidence=path.resolve(process.env.AIW_SHELL_RESTORATION_EVIDENCE);await fs.mkdir(path.dirname(evidence),{recursive:true});
  await fs.writeFile(evidence,JSON.stringify({startedAt,finishedAt:new Date().toISOString(),client:path.resolve(process.env.AIW_CLIENT_DIR),executable:process.env.AIW_BROWSER_EXECUTABLE||'Playwright default',status:failure?'failed':'passed',checks,errors,failure,authority:'Synthetic local browser test on a temporary database; no provider calls, approvals or publication.'},null,2)+'\n');
 }
 await browser.close();await new Promise(resolve=>server.close(resolve));await fs.rm(dir,{recursive:true,force:true});
}

