// One Chapter 10 regression: sticky-header placement controls must receive clicks
// while the header background continues to pass gestures to the canvas.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {chromium} from 'playwright';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'aiw-deploy-header-'));
process.env.PORT=String(await new Promise(resolve=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});}));
process.env.AIW_LOCAL_DB=path.join(dir,'project.sqlite');
process.env.AIW_LOCAL_FILES=path.join(dir,'files');
process.env.OPENAI_API_KEY='';process.env.ANTHROPIC_API_KEY='';
if(process.env.AIW_QA_CLIENT)process.env.AIW_CLIENT_DIR=process.env.AIW_QA_CLIENT;
const {server}=await import('./server.js');
const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE||undefined,headless:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${process.env.PORT}/?chapter=10&tab=model&model=deploy`,{waitUntil:'networkidle'});
 const toggle=page.locator('.cm-heads [data-dp="unplaced"]');await toggle.waitFor();
 const before=await page.evaluate(()=>JSON.stringify(window.aiwProjectStore.value.document));
 await page.locator('[data-dp="fit"]').click();
 assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 assert(await toggle.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'the visible header button receives its own pointer hit');
 assert.equal(await page.locator('.cm-heads').evaluate(el=>getComputedStyle(el).pointerEvents),'none','header background remains transparent to canvas gestures');
 await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 await toggle.focus();await page.keyboard.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),'true','keyboard expands placement details');
 await toggle.focus();await page.keyboard.press('Space');assert.equal(await toggle.getAttribute('aria-expanded'),'false','keyboard collapses placement details');
 await page.locator('.cm-zoom-value').click();
 const point=await page.evaluate(()=>{const s=document.querySelector('.cm-stage'),r=s.getBoundingClientRect();for(let y=r.y+140;y<r.bottom-25;y+=30)for(let x=r.x+260;x<r.right-25;x+=30){const e=document.elementFromPoint(x,y);if(e&&s.contains(e)&&!e.closest('button,a,select,input,.cm-minimap,.cm-key,.cm-heads,.cm-rail'))return {x,y};}return null;});
 assert(point,'a canvas background point remains available');
 const camera=()=>page.locator('.cm-world').evaluate(el=>el.style.transform),cameraBefore=await camera();
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x-100,point.y-65,{steps:5});await page.mouse.up();
 assert.notEqual(await camera(),cameraBefore,'ordinary canvas dragging still changes the camera');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.aiwProjectStore.value.document)),before,'view expansion and camera gestures never save architecture facts');
 assert.deepEqual(errors,[]);
 console.log('PASS Chapter 10 Not placed: pointer expand/collapse, keyboard Enter/Space, header gesture transparency, canvas drag, unchanged saved document.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await fs.rm(dir,{recursive:true,force:true});}
