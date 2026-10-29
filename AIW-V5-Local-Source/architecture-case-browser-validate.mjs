// Real browser smoke test of the Chapter 11 case path and its portable dossier.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFile,rm} from 'node:fs/promises';
import net from 'node:net';

const require=createRequire(import.meta.url),{chromium}=require(process.env.AIW_PLAYWRIGHT_MODULE||'playwright');
const port=await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));});});
const db='.aiw-local/architecture-case-browser-'+port+'.sqlite';
const server=spawn(process.execPath,['server.js','--port',String(port)],{env:{...process.env,AIW_LOCAL_DB:db,OPENAI_API_KEY:''},stdio:['ignore','pipe','inherit']});
process.on('exit',()=>{try{server.kill('SIGKILL')}catch{/* already stopped */}});
await new Promise((resolve,reject)=>{server.stdout.on('data',chunk=>{if(String(chunk).includes('ready'))resolve();});server.on('exit',code=>reject(Error('Server exited '+code)));});
const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE,headless:true});
try{
 const context=await browser.newContext({acceptDownloads:true,viewport:{width:1440,height:900}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+port+'/?chapter=11&tab=work',{waitUntil:'networkidle'});
 await page.locator('[data-rv-action="stage"][data-rv-stage="case"]').click();
 await page.locator('[data-rv-action="case-new"]').click();
 await page.locator('#rv-case-form [name="title"]').fill('Payment submission evidence');
 await page.locator('#rv-case-form [name="purpose"]').fill('Follow one payment requirement through design choices and evidence.');
 await page.locator('#rv-case-form [name="caseRequirement"][value="REQ-001"]').check();
 await page.locator('#rv-case-form [type="submit"]').click();
 await page.locator('.ac-cover h3').filter({hasText:'Payment submission evidence'}).waitFor();
 const text=await page.locator('.ac-panel').textContent();
 for(const expected of ['Whole project · separate gate','ADR-001','PostgreSQL','MongoDB','Source-use judgement','SDD approval remains open'])assert.match(text,new RegExp(expected,'i'));
 await page.locator('.ac-jump a[href="#ac-choices"]').click();
 assert.equal(await page.locator('#ac-choices').isVisible(),true);
 const downloadPromise=page.waitForEvent('download');
 await page.locator('[data-rv-action="case-export-html"]').click();
 const download=await downloadPromise,html=await readFile(await download.path(),'utf8');
 for(const expected of ['ADR-001','PostgreSQL','MongoDB','Whole-project SDD gate','source-use judgement','REQ-001'])assert.match(html,new RegExp(expected,'i'));
 assert.doesNotMatch(html,/<script[^>]*src=/i);
 await page.locator('#ac-choices a[href*="chapter=7"]').first().click();
 await page.waitForURL(/chapter=7/);
 assert.match(page.url(),/tab=model/);
 await page.goBack({waitUntil:'networkidle'});
 await page.locator('.ac-cover h3').waitFor();
 const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});
 await mobile.goto('http://127.0.0.1:'+port+'/?chapter=11&tab=work',{waitUntil:'networkidle'});
 await mobile.locator('[data-rv-action="stage"][data-rv-stage="case"]').click();
 await mobile.locator('.ac-choice').first().waitFor();
 const bounds=await mobile.evaluate(()=>({body:document.body.scrollWidth,viewport:innerWidth,casePanel:document.querySelector('.ac-panel')?.getBoundingClientRect().width}));
 assert.ok(bounds.body<=bounds.viewport+2,'Mobile case dossier must not cause horizontal page overflow: '+JSON.stringify(bounds));
 assert.deepEqual(errors,[]);
 console.log('Architecture case browser: scope save, separated SDD gate, decisions/products, anchored navigation, HTML dossier, model deep link and mobile containment passed.');
}finally{await browser.close();server.kill();await rm(db,{force:true});}
