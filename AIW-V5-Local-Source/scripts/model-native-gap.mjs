// Isolated synthetic UI checks. Requires AIW_QA_DIR with project.sqlite and stored-objects.
// Initial run also requires AIW_QA_PROJECT_ID; Dissect reuses model-command-evidence.json.
// Fixture: connected REQ-001, APP-001 (internal obj-001), interfaces/data, and runtime records.
// AIW_QA_CLIENT defaults to dist/client. AIW_BROWSER_EXECUTABLE is optional.
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
if(!process.env.AIW_QA_DIR)throw Error('AIW_QA_DIR must name an isolated fixture directory');
const qa=path.resolve(process.env.AIW_QA_DIR);
process.env.PORT=String(await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});}));
process.env.AIW_LOCAL_DB=path.join(qa,'project.sqlite');process.env.AIW_LOCAL_FILES=path.join(qa,'stored-objects');process.env.AIW_CLIENT_DIR=path.resolve(process.env.AIW_QA_CLIENT||'dist/client');process.env.OPENAI_API_KEY='';process.env.ANTHROPIC_API_KEY='';
const {server}=await import('../server.js');
const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE||undefined,headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(4500);
const result=JSON.parse(await fs.readFile(path.join(qa,'model-command-evidence.json'),'utf8'));
page.on('pageerror',e=>result.errors.push(e.message));
await page.exposeFunction('__modelGapClick',event=>result.interactionEvents.push(event));await page.addInitScript(()=>document.addEventListener('click',event=>{const e=event.target.closest('button,a[href],summary,input,select');if(e)window.__modelGapClick({chapter:Number(new URL(location.href).searchParams.get('chapter')),tab:'model',tag:e.tagName,label:(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,180),attributes:Object.fromEntries([...e.attributes].filter(a=>a.name.startsWith('data-')).map(a=>[a.name,a.value]))});},true));
const save=()=>fs.writeFile(path.join(qa,'model-command-evidence.json'),JSON.stringify(result,null,2));
const go=async(ch,view)=>{await page.goto(`http://127.0.0.1:${process.env.PORT}/?project=${result.projectId}&chapter=${ch}&tab=model&model=${view}`,{waitUntil:'networkidle'});await page.locator('.cm-top').waitFor();};
const click=async sel=>{await page.locator(sel).filter({visible:true}).first().click();result.actions.push({selector:sel,url:page.url()});};
const attempt=async(name,fn)=>{try{const detail=await fn();result.families.push({name,status:'passed',detail});console.log('PASS',name);}catch(e){result.families.push({name,status:'failed',error:e.message,url:page.url()});await page.screenshot({path:path.join(qa,'failure-'+result.families.length+'.png')});console.log('FAIL',name,e.message.split('\n')[0]);await page.keyboard.press('Escape');}await save();};
let before;
try{
 await go(8,'data');before=await page.evaluate(()=>JSON.stringify(window.aiwProjectStore.value.document));
 await attempt('Native Exchange lenses, camera and key',async()=>{
  const lenses=await page.locator('[data-ex="lens"]').evaluateAll(es=>es.map(e=>e.dataset.id));
  for(const id of lenses){await click(`[data-ex="lens"][data-id="${id}"]`);assert.equal(await page.locator(`[data-ex="lens"][data-id="${id}"]`).getAttribute('aria-pressed'),'true');}
  await click('[data-cm-camera="actual"]');assert.equal(await page.locator('.cm-zoom-value').innerText(),'100%');
  await click('[data-ex="zin"]');assert.equal(await page.locator('.cm-zoom-value').innerText(),'115%');
  await click('[data-ex="zout"]');assert.equal(await page.locator('.cm-zoom-value').innerText(),'100%');
  await click('[data-ex="fit"]');await click('[data-ex="key"]');assert.equal(await page.locator('[data-ex="key"]').getAttribute('aria-expanded'),'true');
  await click('[data-ex="key"]');assert.equal(await page.locator('[data-ex="key"]').getAttribute('aria-expanded'),'false');
  await click('[data-ex="scope"][data-kind="system"]');return {lenses,camera:'100% → 115% → 100% → Fit',key:'open and close',scope:'whole system'};
 });
 await attempt('Native Platform failure modes and local walkthrough',async()=>{
  await go(6,'platform');const lenses=await page.locator('[data-pf="lens"]').evaluateAll(es=>es.map(e=>e.dataset.id));
  for(const id of lenses){await click(`[data-pf="lens"][data-id="${id}"]`);assert.equal(await page.locator(`[data-pf="lens"][data-id="${id}"]`).getAttribute('aria-pressed'),'true');}
  await click('[data-pf="fit"]');const failure=page.locator('[data-pf="fail"]').filter({visible:true}).first();const id=await failure.getAttribute('data-id');await failure.click();
  assert.equal(await page.locator('.cm-view[data-id="failure"]').getAttribute('aria-pressed'),'true');
  const modes=await page.locator('[data-pf="mode"]').evaluateAll(es=>es.map(e=>({id:e.dataset.id,disabled:e.disabled,label:e.innerText})));
  for(const mode of modes){if(mode.disabled){result.unavailable.push({family:'Platform '+mode.id,reason:'Selected capability has no recorded failure domain'});continue;}await click(`[data-pf="mode"][data-id="${mode.id}"]`);assert.equal(await page.locator(`[data-pf="mode"][data-id="${mode.id}"]`).getAttribute('aria-pressed'),'true');}
  await click('[data-pf="scope"][data-kind="system"]');await click('.cm-view[data-id="platform"]');await click('[data-pf="walk-start"]');
  for(let i=0;i<3;i++)await click('[data-pf="walk-next"]');await click('[data-pf="walk-prev"]');await click('[data-pf="walk-stop"]');
  assert.equal(await page.locator('[data-pf="walk-stop"]').count(),0);return {lenses,failedCapability:id,modes,walk:'start, all four stages, previous, stop; no review receipt recorded'};
 });
 result.documentUnchanged=result.documentUnchanged&&before===await page.evaluate(()=>JSON.stringify(window.aiwProjectStore.value.document));
}finally{await save();await browser.close();await new Promise(r=>server.close(r));}
