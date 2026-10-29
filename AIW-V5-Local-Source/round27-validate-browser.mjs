import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.AIW_PLAYWRIGHT_MODULE||'playwright');
const port=await new Promise(r=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const db='.aiw-local/round27-validate-'+port+'.sqlite',out=path.resolve('../evidence/round27/validate-'+Date.now());fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['server.js','--port',String(port)],{env:{...process.env,AIW_LOCAL_DB:db,OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});let log='';server.stdout.on('data',d=>{log+=d;});server.stderr.on('data',d=>{log+=d;});
process.on('exit',()=>server.kill());
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('ready'))resolve();});server.on('exit',c=>reject(Error('server exited '+c)));});
const base='http://127.0.0.1:'+port,browser=await chromium.launch({headless:true,executablePath:process.env.AIW_BROWSER_EXECUTABLE}),checks=[],errors=[];
let failure=null,page=null;
try{
 page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
 // rc38+ (rc41 W4): the chapter checks are one validation workspace per chapter (validation-workspace.js). W2 is reshaping
 // its frame this round, so the pins read its region name, roles, data attributes, counts and words, not its class chain.
 const open=async chapter=>{await page.goto(base+'/?chapter='+chapter+'&tab=validate',{waitUntil:'networkidle'});await page.waitForSelector('[data-validation-workspace$=":'+chapter+':"][data-bound="1"]');await page.waitForTimeout(400);};
 const region=chapter=>page.getByRole('region',{name:'Chapter '+chapter+' validation'});
 const RUN=/^Run (current )?checks$/;
 for(let chapter=1;chapter<=11;chapter++){
   await open(chapter);const R=region(chapter);
   assert.equal(await R.count(),1,'one validation region Chapter '+chapter);
   assert.equal(await page.getByRole('button',{name:RUN}).count(),1,'one native Run checks Chapter '+chapter);
   assert.equal(await R.getByRole('button',{name:RUN}).count(),1,'the native Run checks heads the validation region, Chapter '+chapter);
   assert.equal(await R.getByText(/^Checks (not recorded|out of date|current)$/).count(),1,'the check stamp stands beside it, Chapter '+chapter);
   const contract=await R.getByRole('navigation',{name:'Finding categories'}).locator('[data-validation-filter]').evaluateAll(xs=>xs.map(x=>({filter:x.dataset.validationFilter,pressed:x.getAttribute('aria-pressed')})));
   assert.ok(contract.length>=3,'filter contract Chapter '+chapter);assert.ok(contract.every(x=>x.filter&&['true','false'].includes(x.pressed)));assert.deepEqual(contract.filter(x=>x.pressed==='true').map(x=>x.filter),['all'],'one category chosen, All, Chapter '+chapter);
   assert.deepEqual(contract.slice(0,3).map(x=>x.filter),['all','gaps','review'],'All, Content gaps and Review items, Chapter '+chapter);
   const sets=await R.locator('[data-validation-set]').evaluateAll(xs=>xs.map(x=>[x.dataset.validationSet,x.getAttribute('aria-pressed')]));
   if(chapter===11)assert.deepEqual(sets,[['final','true'],['source','false']],'Chapter 11 opens on its final review checks, the inherited findings a separate set');
   else assert.deepEqual(sets,[],'only Chapter 11 has finding sets');
   const causes=R.locator('[data-validation-causes]'),causeRows=await R.locator('[data-validation-cause-row]').count();
   assert.equal(await causes.count(),1,'one cause overview Chapter '+chapter);
   assert.equal(await causes.evaluate(e=>e.tagName+':'+e.open),'DETAILS:false','the cause overview is folded under its count, Chapter '+chapter);
   assert.equal((await causes.locator('summary').first().textContent()).trim(),'Findings by cause · '+causeRows+' '+(causeRows===1?'cause':'causes'),'its summary counts its causes, Chapter '+chapter);
   assert.equal(await R.locator('[data-validation-support] #vx-sdd').evaluate(e=>e.tagName),'DETAILS');
   assert.equal(await page.locator('.vx-switch [data-vx-lens-view=case]').isVisible(),false);
   assert.ok(await page.locator('[data-vx-case-create]').isVisible());
   const queued=Number((await R.getByRole('region',{name:'Finding queue'}).locator('b').first().textContent()).match(/^(\d+) findings?$/)?.[1]);
   const rows=await R.locator('[data-validation-select]').evaluateAll(xs=>xs.map(x=>({key:x.dataset.validationSelect,meta:x.querySelector('span')?.innerText.replace(/\s+/g,' ').trim(),pressed:x.getAttribute('aria-pressed')})));
   assert.ok(queued>0,'Chapter '+chapter+' has findings to read');assert.equal(rows.length,Math.min(40,queued),'the queue draws its first page, Chapter '+chapter);
   assert.ok(rows.every(x=>new RegExp('^'+(chapter===11?'final':'chapter')+':\\S+$').test(x.key)),'finding identities Chapter '+chapter);
   assert.equal(new Set(rows.map(x=>x.key)).size,rows.length,'each finding once, Chapter '+chapter);
   assert.ok(rows.every(x=>/^(Content gap|Review item|Treated) \S/.test(x.meta)),'each finding names its status and the record it concerns, Chapter '+chapter);
   assert.equal(rows.filter(x=>x.pressed==='true').length,1,'the first finding is selected, Chapter '+chapter);
   const labels=await R.locator('[data-validation-cause-row] th > b,[data-validation-group-id] > summary > b').allTextContents();assert.ok(labels.length>=causeRows&&labels.every(x=>x.trim()&&!x.includes('…')),'full labels Chapter '+chapter);
   checks.push('Chapter '+chapter+' native filter/run/cause/identity/case/disclosure contract');
 }
 {await open(4);const R=region(4);await R.getByRole('button',{name:'Run checks'}).click();await R.getByText('Checks current',{exact:true}).waitFor();const record=R.locator('[aria-label="Readiness summary"] details');assert.equal(await record.locator('time').count(),1,'the check record names when it ran');assert.match(await record.evaluate(e=>e.textContent),/Matches the saved chapter\./);checks.push('Native check run stamps current revision');}
 {await open(1);const R=region(1);await R.locator('[data-validation-causes] > summary').click();const row=R.locator('[data-validation-cause-row^=":confirmation"]');const n=Number(await row.locator('[data-validation-cause-count]').textContent());assert.ok(n>0);await row.locator('[data-validation-cause-pick]').click();await page.waitForTimeout(500);
  const pick=R.locator('[data-validation-cause-row^=":confirmation"] [data-validation-cause-pick]');assert.equal(await pick.getAttribute('aria-pressed'),'true');assert.equal((await pick.textContent()).trim(),'Show all causes');
  assert.equal((await R.getByRole('region',{name:'Finding queue'}).locator('b').first().textContent()).trim(),n+' finding'+(n===1?'':'s'),'the queue narrows to the cause');
  assert.ok((await R.locator('[data-validation-select]').evaluateAll(xs=>xs.map(x=>x.dataset.validationSelect))).every(k=>k.startsWith('chapter:confirmation:')),'only that cause is listed');
  assert.ok(await R.locator('[data-validation-cause-row^=":confirmation"] [data-r-action="confirm-cause"]').count(),'the studio\'s own confirm action stays on its cause');checks.push('Chapter1 shared cause drill-down preserves native review action');}
 {await open(6);const R=region(6);await R.locator('[data-validation-filter=review]').click();await page.waitForTimeout(350);const needs=await R.locator('[data-validation-select^="chapter:need-review:TN-"]').evaluateAll(xs=>xs.map(x=>x.dataset.validationSelect.split(':').at(-1)));assert.ok(needs.length,'Chapter 6 lists needs under review by their own ID');
  const need=needs[0];await R.locator('[data-validation-select="chapter:need-review:'+need+'"]').click();await page.waitForTimeout(350);const parent=await page.evaluate(id=>window.aiwProjectStore.value.document.technology.needs.find(n=>n.id===id)?.applicationId,need);assert.ok(parent,'the need has a parent application');
  assert.ok(await R.getByRole('region',{name:'Selected finding'}).locator('a[href*="chapter=5"][href*="object='+parent+'"]').count(),'the selected need keeps its parent application among its connected records');
  await R.locator('[data-validation-group]').selectOption('object');await page.waitForTimeout(350);assert.ok((await R.locator('[data-validation-group-id] > summary').allTextContents()).some(x=>new RegExp('^'+need+' · .*\\d+ review items?$').test(x.replace(/\s+/g,' ').trim())),'By object groups the need under its own ID');
  // The view is remembered per project (aiw-validate-grouping); the viewer returns to the priority queue before leaving.
  await R.locator('[data-validation-group]').selectOption('priority');await page.waitForTimeout(350);assert.equal(await R.locator('[data-validation-group-id]').count(),0,'the priority queue has no groups');checks.push('Chapter6 needs group by their own ID and retain parent application');}
 {await open(11);const R=region(11);assert.ok(await R.locator('[data-validation-set=source]').isVisible());assert.match((await R.locator('[data-validation-set=source]').innerText()).replace(/\s+/g,' ').trim(),/^Inherited findings \d+$/,'inherited count labelled');await R.locator('[data-validation-passages]').click();assert.equal(await page.locator('#vx-sdd').evaluate(e=>e.open),true,'the passage count opens the SDD passages');const actions=page.locator('#vx-sdd [data-sdd-passage=actions]');assert.match(await actions.innerText(),/Nothing recorded yet/);assert.ok(!await actions.locator('.sdd-st.pass').count());checks.push('Empty Chapter11 obligations are not passing; inherited count labelled');}
 await page.setViewportSize({width:390,height:844});await open(8);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));{const causes=region(8).locator('[data-validation-causes]');await causes.locator('summary').first().focus();await page.keyboard.press('Enter');assert.equal(await causes.evaluate(e=>e.open),true);await page.keyboard.press('Enter');assert.equal(await causes.evaluate(e=>e.open),false);}await page.screenshot({path:path.join(out,'mobile-validate.png'),fullPage:true});checks.push('390px disclosure keyboard and no page overflow');
 // The visible-word budget is measured last so that every other check is read even while it is over (rc41 W4).
 await page.setViewportSize({width:1440,height:1000});await open(8);{const R=region(8);const words=await page.locator('.stage').evaluate(e=>e.innerText.split(/\s+/).filter(Boolean).length);assert.equal(await R.locator('[data-validation-causes]').evaluate(e=>e.open),false,'the dense causes stay folded');assert.equal(await R.locator('[data-validation-group-id][open]').count(),0,'no finding group is open in the priority queue');assert.ok(await R.getByRole('region',{name:'Finding queue'}).isVisible());await page.screenshot({path:path.join(out,'chapter8.png'),fullPage:true});assert.ok(words<900,'visible word bound '+words);checks.push('Chapter8 dense causes folded, '+words+' visible words below900');}
 assert.deepEqual(errors,[]);
}catch(error){failure=error.stack;if(page){fs.writeFileSync(path.join(out,'failed-page.txt'),await page.locator('body').innerText().catch(()=>''));await page.screenshot({path:path.join(out,'failure.png'),timeout:10000}).catch(()=>{});}throw error;}finally{await browser.close();server.kill();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,failure,providerCalls:0},null,2));fs.writeFileSync(path.join(out,'server.log'),log);console.log(JSON.stringify({out,passed:checks.length,errors,failure}));}
