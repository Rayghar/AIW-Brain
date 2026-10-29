import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir,rm} from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

const require=createRequire(import.meta.url),{chromium}=require(process.env.AIW_PLAYWRIGHT_MODULE||'playwright');
const port=await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));});});
const db='.aiw-local/payment-journey-browser-'+port+'.sqlite',base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['server.js','--port',String(port)],{env:{...process.env,AIW_LOCAL_DB:db,OPENAI_API_KEY:''},stdio:['ignore','pipe','inherit']});
process.on('exit',()=>{try{server.kill('SIGKILL')}catch{/* stopped */}});
await new Promise((resolve,reject)=>{server.stdout.on('data',chunk=>{if(String(chunk).includes('ready'))resolve();});server.on('exit',code=>reject(Error('Server exited '+code)));});
const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE,headless:true});
try{
 const context=await browser.newContext({viewport:{width:1360,height:900},acceptDownloads:true}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?chapter=11&tab=work',{waitUntil:'networkidle'});
 await page.locator('[data-rv-action="stage"][data-rv-stage="case"]').click();
 await page.locator('[data-rv-action="case-new"]').click();
 await page.locator('#rv-case-form [name="title"]').fill('Payment evidence journey');
 await page.locator('#rv-case-form [name="purpose"]').fill('Trace the payment handoff into a deployed, observed choice.');
 await page.locator('#rv-case-form [name="mode"][value="end-to-end"]').check();
 await page.locator('#rv-case-form [name="caseRequirement"][value="REQ-001"]').check();
 await page.locator('#rv-case-form [type="submit"]').click();
 await page.locator('.ac-cover h3').filter({hasText:'Payment evidence journey'}).waitFor();
 const reading=await page.locator('.ac-journey').innerText();
 if(process.env.AIW_CASE_SCREENSHOTS){await mkdir(process.env.AIW_CASE_SCREENSHOTS,{recursive:true});await page.locator('.ac-journey').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.AIW_CASE_SCREENSHOTS,'payment-case-journey-desktop.png')});}
 for(const expected of ['End-to-end evidence journey','Trace one requirement','Compare two named product options','Record a specified technology choice','Link a current test or exercise'])assert.match(reading,new RegExp(expected));
 assert.match(await page.locator('.ac-gate').first().innerText(),/Case needs evidence/);
 const downloadPromise=page.waitForEvent('download');await page.locator('[data-rv-action="case-export-html"]').click();const download=await downloadPromise;
 assert.match(download.suggestedFilename(),/\.html$/);
 await page.goto(base+'/?chapter=11&tab=validate&case=AC-001',{waitUntil:'networkidle'});
 await page.locator('.vx-switch [data-vx-lens-view="case"]').click();
 assert.match(await page.locator('.vx-case-panel .ac-journey').innerText(),/Link a current test or exercise/);
 assert(await page.locator('.vx-case-work a[href*="chapter=7"]').count()>0);
 const phone=await context.newPage();await phone.setViewportSize({width:390,height:844});phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(base+'/?chapter=11&tab=validate&case=AC-001',{waitUntil:'networkidle'});
 await phone.locator('.vx-switch [data-vx-lens-view="case"]').click();
 await phone.locator('.vx-case-panel .ac-journey').waitFor();
 if(process.env.AIW_CASE_SCREENSHOTS){await phone.locator('.vx-case-panel .ac-journey').scrollIntoViewIfNeeded();await phone.screenshot({path:path.join(process.env.AIW_CASE_SCREENSHOTS,'payment-case-journey-phone.png')});}
 const widths=await phone.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth}));
 assert(widths.body<=widths.viewport+2,'Journey checklist overflows phone: '+JSON.stringify(widths));
 assert.deepEqual(errors,[]);
 console.log('Payment journey browser: explicit mode selection, evidence checklist, worklist links, dossier download, Validate reading and phone width passed.');
}finally{await browser.close();await new Promise(resolve=>{if(server.exitCode!==null||server.signalCode!==null)return resolve();server.once('exit',resolve);server.kill();});await rm(db,{force:true});}
