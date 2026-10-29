import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync,cpSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import net from 'node:net';
import {chromium} from 'playwright';
// rc41 W4: without AIW_WALKTHROUGH_SOURCE_DIR (the regression runner sets none) the suite reads the shipped reference
// project on an isolated server from the source tree: it holds the two records the check walks (RUN-001 in Chapter 10,
// REQ-001 in Chapter 11). With the variable set, it reads that authored walkthrough's project and built client, as before.
const sourceDir=process.env.AIW_WALKTHROUGH_SOURCE_DIR&&resolve(process.env.AIW_WALKTHROUGH_SOURCE_DIR);
const authored=!!sourceDir;
if(authored&&(!existsSync(join(sourceDir,'results.json'))||!existsSync(join(sourceDir,'project.sqlite'))))throw Error('AIW_WALKTHROUGH_SOURCE_DIR must name an authored walkthrough directory containing results.json and project.sqlite. Create an authored run with scripts/refinement-walkthrough.mjs first.');
const projectId=authored?JSON.parse(readFileSync(join(sourceDir,'results.json'),'utf8')).projectId:'bank-payment';
if(!projectId)throw Error('The authored results.json must contain projectId.');
const clientDir=authored?resolve(process.env.AIW_WALKTHROUGH_CLIENT_DIR||'dist/client'):null;
if(authored&&!existsSync(join(clientDir,'index.html')))throw Error('Build the local client first with npm run build, or set AIW_WALKTHROUGH_CLIENT_DIR to a built client.');
const stamp=new Date().toISOString().replace(/[:.]/g,'-'),root=resolve(authored?'audit/refinement-validateoutput/inspector-toggle-regression-'+stamp:'.aiw-local/inspector-toggle-'+stamp);mkdirSync(root,{recursive:true});
if(authored){
 const sourceDb=new DatabaseSync(join(sourceDir,'project.sqlite'),{readOnly:true});
 try{if(!sourceDb.prepare('SELECT id FROM projects WHERE id=?').get(projectId))throw Error('The projectId from results.json is absent from the source database.');sourceDb.prepare('VACUUM INTO ?').run(join(root,'project.sqlite'));}finally{sourceDb.close();}
 if(existsSync(join(sourceDir,'stored-objects')))cpSync(join(sourceDir,'stored-objects'),join(root,'stored-objects'),{recursive:true});else mkdirSync(join(root,'stored-objects'));
 cpSync(clientDir,join(root,'client'),{recursive:true});
}else mkdirSync(join(root,'stored-objects'));
console.log('Evidence directory: '+root+(authored?'':' (the reference project)'));
const port=await new Promise(r=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const server=spawn(process.execPath,['server.js','--port',String(port),...(authored?['--client',join(root,'client')]:[])],{env:{...process.env,AIW_LOCAL_DB:root+'/project.sqlite',AIW_LOCAL_FILES:root+'/stored-objects',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''},stdio:['ignore','pipe','pipe']});
process.on('exit',()=>{try{server.kill('SIGKILL')}catch{/* already gone */}});let serverLog='';server.stdout.on('data',d=>serverLog+=d);server.stderr.on('data',d=>serverLog+=d);
await new Promise((r,j)=>{server.stdout.on('data',d=>{if(String(d).includes('ready'))r()});server.on('exit',c=>j(Error('Server '+c)));});
const browser=await chromium.launch({headless:true,executablePath:process.env.AIW_BROWSER_EXECUTABLE}),page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(8000);
const actions=[],guards=[],errors=[],failures=[],dialogs=[],requests=[];let stage='setup';
page.on('pageerror',e=>errors.push({stage,message:e.message}));page.on('request',r=>{if(r.method()==='POST')requests.push({stage,url:new URL(r.url()).pathname,body:r.postData()});});
const base='http://127.0.0.1:'+port;
const sleep=()=>page.waitForTimeout(120);
const snapshot=async()=>({url:page.url(),dialogs:await page.locator('dialog[open], [role="dialog"][aria-modal="true"]:visible').evaluateAll(ds=>ds.map(d=>({heading:d.querySelector('h1,h2,h3')?.textContent?.trim(),text:d.innerText.slice(0,18000),disabled:[...d.querySelectorAll('button:disabled')].map(b=>({text:b.innerText,reason:b.getAttribute('aria-describedby')||b.title}))}))),chapter:await page.evaluate(()=>document.querySelector('.chapter-header h1')?.textContent?.trim()||''),tab:new URL(page.url()).searchParams.get('tab')});
const label=async l=>l.evaluate(e=>(e.getAttribute('aria-label')||e.innerText||e.title||'').trim());
async function click(l,description){if(!await l.count()){guards.push({stage,description,state:'not present'});return false}if(!await l.isVisible()){guards.push({stage,description,state:'not visible'});return false}if(await l.isDisabled()){guards.push({stage,description,state:'disabled',text:await label(l)});return false}const before=page.url(),text=await label(l);console.log(stage+' | '+description+' | '+text);try{await l.click();await sleep();const after=await snapshot();actions.push({stage,description,text,before,after:after.url,dialog:after.dialogs.map(d=>d.heading)});dialogs.push(...after.dialogs.map(d=>({stage,trigger:description,...d})));return true}catch(e){failures.push({stage,description,message:e.message});return false}}
async function closeDialogs(){for(let i=0;i<4&&await page.locator('dialog[open], [role="dialog"][aria-modal="true"]:visible').count();i++){const d=page.locator('dialog[open], [role="dialog"][aria-modal="true"]:visible').last(),close=d.locator('[data-action="close-modal"], [data-dialog-close], [data-rv-action="close"], [data-l-action="close"], [data-i-action="close"], [data-sec-action="close"], [data-t-action="close"], [data-tr-action="close"], [data-rt-action="close"], [data-a-action="close"], [data-r-action="close"], [data-q-action="close"], [data-d-action="close"]:visible').first();if(await close.count())await click(close,'Cancel/close inspected dialog');else{await page.keyboard.press('Escape');actions.push({stage,description:'Escape closes inspected dialog',text:'Escape'});await sleep()}const discard=page.getByRole('button',{name:'Discard changes',exact:true});if(await discard.isVisible().catch(()=>false))await click(discard,'Discard unsubmitted test form');}}
async function open(ch,tab,object=''){await closeDialogs();await page.goto(base+'/?project='+projectId+'&chapter='+ch+'&tab='+tab+(object?'&object='+encodeURIComponent(object):''),{waitUntil:'networkidle'});const coach=page.locator('[data-coach="close"]');if(await coach.isVisible().catch(()=>false))await click(coach,'Close first steps overlay');}


const metrics=[];
try{
 for(const width of [1440,1024,390]){
  // rc41 close (strip C4): each width arrives without the Details choice the previous width's clicks remembered, so the
  // arrival reads the default rule; the viewer's own choice is remembered again by the toggles below.
  await page.evaluate(()=>{try{for(const k of Object.keys(localStorage))if(k.startsWith('aiw-details-v1:'))localStorage.removeItem(k);}catch{/* about:blank before the first page */}});
  await page.setViewportSize({width,height:1000});await open(10,'work','run-001');await open(11,'work','REQ-001');stage='Inspector Back and toggle '+width;
  const link=page.locator('#inspector a').filter({hasText:'← Back'}).first(),toggle=page.locator('.workspace-tools [data-panel-toggle][aria-controls="inspector"]');/* rc38: the toolbar's Details toggle */
  // rc41 close (strip C4): the held record opens the column by itself only where the column is one (≥ 1180 px); at
  // 1024 and 390 px it would be a sheet over the task, so it waits closed and the viewer opens it with the toolbar's toggle.
  const arrived=await page.evaluate(()=>({panel:document.body.dataset.panel,hidden:document.querySelector('#inspector')?.getAttribute('aria-hidden')}));
  if(width>=1180)assert.deepEqual(arrived,{panel:'open',hidden:'false'},'the held record opens the column at '+width);
  else{assert.deepEqual(arrived,{panel:'collapsed',hidden:'true'},'the held record leaves the sheet closed at '+width);assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert(await click(toggle,'Open the held record’s details'));assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#inspector').getAttribute('aria-hidden'),'false','the toolbar’s toggle opens it');}
  await link.scrollIntoViewIfNeeded();
  const geometry=await link.evaluate(e=>{const r=e.getBoundingClientRect(),p=document.querySelector('.workspace-tools [data-panel-toggle][aria-controls="inspector"]'),q=p?.getBoundingClientRect(),target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {link:{x:r.x,y:r.y,width:r.width,height:r.height},panel:q?{x:q.x,y:q.y,width:q.width,height:q.height}:null,centerHitsLink:e===target||e.contains(target),bodyWidth:document.documentElement.scrollWidth,viewport:innerWidth}});
  assert(geometry.centerHitsLink,'Back link center is covered at '+width);assert(geometry.bodyWidth<=width,'Horizontal overflow at '+width);
  const toggleVisible=await toggle.isVisible();
  // rc38 (rc41 W4): the Details are hidden with whichever of their toggles a viewer can reach unobstructed — the toolbar's
  // beside a docked column (1440), the open overlay's own "Close details ×" where the column lies over the toolbar (1024)
  // — and shown again with the toolbar's; both say so in aria-expanded.
  const hide=async()=>{const all=page.locator('[data-panel-toggle][aria-controls="inspector"]'),n=await all.count();for(let i=0;i<n;i++){const t=all.nth(i);if(!await t.isVisible())continue;if(await t.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e===hit||e.contains(hit);}))return t;}return null;};
  if(toggleVisible){const closer=await hide();assert(closer,'an unobstructed Details toggle at '+width);assert.equal(await closer.getAttribute('aria-expanded'),'true');assert(await click(closer,'Hide inspector'));assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#inspector').getAttribute('aria-hidden'),'true','the column is hidden');assert(await click(toggle,'Show inspector'));assert.equal(await toggle.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#inspector').getAttribute('aria-hidden'),'false','and shown again');}
  else {assert(width<=700,'Toggle unexpectedly hidden');guards.push({stage,description:'Panel toggle',state:'intentionally hidden on phone'});}
  await page.screenshot({path:root+'/inspector-'+width+'.png',fullPage:true});assert(await click(link,'Click unobstructed contextual Back'));assert.equal(new URL(page.url()).searchParams.get('chapter'),'10');assert.equal(new URL(page.url()).searchParams.get('tab'),'model');metrics.push({width,toggleVisible,geometry,backDestination:page.url()});
 }
 assert.equal(errors.length,0);assert.equal(failures.length,0);console.log(JSON.stringify({root,metrics,errors,failures}));
}catch(e){failures.push({stage,message:e.message});console.error(e);process.exitCode=1}
finally{writeFileSync(root+'/results.json',JSON.stringify({metrics,actions,guards,errors,failures},null,2));writeFileSync(root+'/server.log',serverLog);await browser.close();server.kill('SIGTERM');}
