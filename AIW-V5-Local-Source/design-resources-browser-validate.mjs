// The project rail's three resource routes, real product and component handoffs, and honest
// repository posture. Runs the same shell, Chapter 5 library and Chapter 7 editor as a user.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {rmSync} from 'node:fs';
import net from 'node:net';

const {chromium}=createRequire(import.meta.url)(process.env.AIW_PLAYWRIGHT_MODULE||'playwright');
const port=await new Promise(resolve=>{const socket=net.createServer().listen(0,'127.0.0.1',()=>{const n=socket.address().port;socket.close(()=>resolve(n));});});
const db='.aiw-local/design-resources-'+port+'.sqlite';
const server=spawn(process.execPath,['server.js','--port',String(port)],{env:{...process.env,AIW_LOCAL_DB:db,OPENAI_API_KEY:''},stdio:['ignore','pipe','inherit']});
process.on('exit',()=>{try{server.kill('SIGKILL');}catch{/* already stopped */}});
await new Promise((resolve,reject)=>{server.stdout.on('data',chunk=>{if(String(chunk).includes('ready'))resolve();});server.on('exit',code=>reject(Error('Server exited '+code)));});
const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE,headless:true});
const base='http://127.0.0.1:'+port,checks=[],errors=[];
// Synthetic data exercises the gated repository projection without shipping customer source material.
const sampleScenes=[
 {id:'sample-pack:scene-01',sourceMediaId:'sample-pack:scene-01',sceneId:'scene-01',packId:'sample-pack',videoId:'recording-a',videoKey:'sample-pack:recording-a',fileName:'sample-a.mp4',videoTitle:'System design workshop',startMs:10000,endMs:20000,startFrame:300,endFrame:599,title:'Queue tradeoffs',summary:'A team considers an asynchronous queue for reliability.',assetTypes:['ArchitectureDecision','Pattern'],candidateEntities:['Queue'],relatedNodes:[{id:'concept-01',type:'Pattern',title:'Asynchronous queue',description:'Decoupled work'}],relatedEdges:[{subjectId:'concept-01',predicate:'SUPPORTS',objectId:'concept-02'}],rightsState:'restricted-source-review-required',authorityState:'candidate',originalVideosPresent:false,transcriptAvailable:false},
 {id:'sample-pack:scene-02',sourceMediaId:'sample-pack:scene-02',sceneId:'scene-02',packId:'sample-pack',videoId:'recording-a',videoKey:'sample-pack:recording-a',fileName:'sample-a.mp4',videoTitle:'System design workshop',startMs:22000,endMs:30000,startFrame:660,endFrame:899,title:'Latency measurement',summary:'The team outlines a response time test.',assetTypes:['TestEvidence'],candidateEntities:['Latency'],relatedNodes:[],relatedEdges:[],rightsState:'restricted-source-review-required',authorityState:'candidate',originalVideosPresent:false,transcriptAvailable:false},
 {id:'sample-pack:scene-03',sourceMediaId:'sample-pack:scene-03',sceneId:'scene-03',packId:'sample-pack',videoId:'recording-b',videoKey:'sample-pack:recording-b',fileName:'sample-b.mp4',videoTitle:'Service design review',startMs:50000,endMs:70000,startFrame:1500,endFrame:2099,title:'Batch load choice',summary:'The team reviews a batch option.',assetTypes:['ArchitectureDecision'],candidateEntities:['Batch'],relatedNodes:[],relatedEdges:[],rightsState:'restricted-source-review-required',authorityState:'candidate',originalVideosPresent:false,transcriptAvailable:false}
];
const sampleVideos=[
 {id:'sample-pack:recording-a',videoId:'recording-a',packId:'sample-pack',title:'System design workshop',fileName:'sample-a.mp4',mediaAvailable:false,transcriptAvailable:false},
 {id:'sample-pack:recording-b',videoId:'recording-b',packId:'sample-pack',title:'Service design review',fileName:'sample-b.mp4',mediaAvailable:false,transcriptAvailable:false}
];
async function mockMedia(page,{empty=false,forbidden=false}={}){
 await page.route('**/api/knowledge/corpus?*',async route=>{
  const url=new URL(route.request().url()),view=url.searchParams.get('view');
  if(view!=='video'&&view!=='video-status')return route.continue();
  if(forbidden)return route.fulfill({status:403,contentType:'application/json',body:'{"error":"forbidden"}'});
  const counts={packs:empty?0:1,videos:empty?0:2,scenes:empty?0:3,assets:empty?0:2,relationships:empty?0:1};
  if(view==='video-status')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({connected:true,configured:true,counts,packs:[]})});
  const key=url.searchParams.get('key'),q=(url.searchParams.get('q')||'').toLowerCase(),area=url.searchParams.get('area'),videoKey=url.searchParams.get('videoKey'),offset=Number(url.searchParams.get('offset')||0);
  let results=empty?[]:sampleScenes.filter(x=>(!key||x.id===key)&&(!videoKey||x.videoKey===videoKey)&&(!q||[x.title,x.summary,...x.candidateEntities].join(' ').toLowerCase().includes(q))&&(!area||area==='options'&&x.assetTypes.some(t=>/Decision|Pattern/.test(t))||area==='assurance'&&x.assetTypes.some(t=>/Evidence/.test(t))));
  const total=results.length;results=key?results:results.slice(offset,offset+2);
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({connected:true,configured:true,total,offset,limit:2,nextOffset:key||offset+results.length>=total?null:offset+results.length,results,videos:empty?[]:sampleVideos,counts,provenance:{source:'synthetic test'}})});
 });
}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?chapter=4&tab=work',{waitUntil:'networkidle'});
 await page.waitForSelector('.rail-resources [data-resource-open="technology"]');
 assert.deepEqual(await page.$$eval('.rail-resources button span:first-child',xs=>xs.map(x=>x.textContent.trim())),['Component library','Technology products','Knowledge repository']);
 const origin=await page.evaluate(()=>{window.__hubMarker='read-only';return performance.timeOrigin;});
 const before=await page.evaluate(()=>JSON.stringify(window.aiwProjectStore.value.document));

 await page.click('[data-resource-open="technology"]');await page.waitForSelector('.dr-dialog[open]');
 for(const name of ['PostgreSQL','MySQL','Apache Kafka','RabbitMQ','Redis'])assert.ok(await page.locator('.dr-products button').filter({hasText:name}).count(),name+' is discoverable');
 await page.fill('[data-dr-search]','Kafka');
 assert.equal(await page.locator('.dr-products button:visible').count(),1);
 assert.match(await page.locator('.dr-detail').innerText(),/Apache Kafka[\s\S]*In this design[\s\S]*Chapter 7/i);
 await page.locator('.dr-products button:visible').click();
 await page.screenshot({path:'/tmp/aiw-design-resources-desktop.png'});
 const detail=await page.locator('.dr-detail').innerText();
 assert.match(detail,/Why considered or chosen[\s\S]*No effect on a connected quality driver[\s\S]*Evidence and authority[\s\S]*Version[\s\S]*Service tier/i,'decision and evidence precede specifications');
 assert.match(page.url(),/resources=technology/);assert.match(page.url(),/resourceProduct=kafka/);assert.match(page.url(),/resourceQuery=Kafka/);
 assert.ok(await page.locator('.dr-detail a[href*="chapter=7"][href*="model=options"]').count(),'a used product links to its existing options model');
 checks.push('the rail opens named products and the current Chapter 7 option, specification, impact and evidence reading');

 await page.fill('[data-dr-search]','MySQL');
 assert.match(await page.locator('.dr-detail').innerText(),/MySQL[\s\S]*not in a recorded Chapter 7 comparison/i);
 const add=page.locator('.dr-detail a[href*="product=mysql"]');assert.ok(await add.count(),'a transactional realization can receive a MySQL candidate');
 await add.first().click();await page.waitForSelector('.stage [data-tr-action], .tr-dialog, dialog[open]');
 assert.equal(await page.evaluate(()=>window.__hubMarker),'read-only','product navigation stays in the same document');
 assert.equal(await page.evaluate(()=>performance.timeOrigin),origin);
 assert.equal(new URL(page.url()).searchParams.get('chapter'),'7');
 assert.equal(await page.evaluate(()=>window.aiwLogicalStudio.selectedProductId),'mysql','the product is staged for the existing option editor');
 assert.equal(new URL(page.url()).searchParams.has('resources'),false,'the Chapter 7 URL is its own destination');
 await page.waitForSelector('.tr-product-arrival');
 assert.match(await page.locator('.tr-product-arrival').innerText(),/MySQL[\s\S]*Add as option/i);
 await page.click('.tr-product-arrival [data-tr-action="add-library"]');
 await page.waitForSelector('dialog[open] #tr-option-form');
 assert.equal(await page.locator('#tr-option-form [name="product"]').inputValue(),'MySQL');
 assert.match(await page.locator('#tr-option-form').innerText(),/Saving creates an option[\s\S]*does not choose it/i);
 checks.push('MySQL moves in place into the existing Chapter 7 editor, prefilled but unsaved and unselected');
 if(await page.locator('dialog[open]').count())await page.keyboard.press('Escape');

 await page.goBack({waitUntil:'domcontentloaded'});await page.waitForSelector('.dr-dialog[open]');
 assert.equal(new URL(page.url()).searchParams.get('resourceProduct'),'mysql');
 assert.equal(new URL(page.url()).searchParams.get('resourceQuery'),'MySQL');
 assert.match(await page.locator('.dr-detail').innerText(),/MySQL[\s\S]*not in a recorded Chapter 7 comparison/i);
 await page.click('.dr-close');await page.waitForSelector('.dr-dialog',{state:'detached'});
 assert.equal(new URL(page.url()).searchParams.has('resources'),false,'close returns to the chapter route');
 checks.push('Back restores the product search and selected detail; closing returns to the chapter');
 await page.click('[data-resource-open="technology"]');await page.waitForSelector('.dr-dialog[open]');
 await page.keyboard.press('Escape');await page.waitForSelector('.dr-dialog',{state:'detached'});
 await page.waitForFunction(()=>!new URLSearchParams(location.search).has('resources'));
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.resourceOpen),'technology','Escape returns focus to the opener');
 checks.push('Escape closes the resource route and returns keyboard focus to its chapter-rail opener');

 const bookmarked=await browser.newPage({viewport:{width:1280,height:800}});bookmarked.on('pageerror',e=>errors.push(e.message));
 await bookmarked.goto(base+'/?chapter=7&tab=work&resources=technology&resourceProduct=kafka&resourceQuery=Kafka&resourceCapability=category%3Amessaging&resourceStatus=in-design',{waitUntil:'networkidle'});
 await bookmarked.waitForSelector('.dr-dialog[open]');
 assert.equal(await bookmarked.locator('[data-dr-search]').inputValue(),'Kafka');
 assert.equal(await bookmarked.locator('[data-dr-filter="capability"]').inputValue(),'category:messaging');
 assert.equal(await bookmarked.locator('[data-dr-filter="status"]').inputValue(),'in-design');
 assert.equal(await bookmarked.locator('.dr-product-title').innerText(),'Apache Kafka');
 assert.equal(await bookmarked.locator('[data-dr-product]:visible').count(),1);
 await bookmarked.reload({waitUntil:'networkidle'});await bookmarked.waitForSelector('.dr-dialog[open]');
 assert.equal(await bookmarked.locator('.dr-product-title').innerText(),'Apache Kafka','direct link reload preserves filters and selected product');
 await bookmarked.click('.dr-close');await bookmarked.waitForSelector('.dr-dialog',{state:'detached'});
 assert.equal(new URL(bookmarked.url()).searchParams.has('resources'),false,'direct bookmark close removes resource params without a history loop');
 assert.equal(await bookmarked.evaluate(()=>window.aiwRoute('/?chapter=7&tab=work&resources=technology&resourceProduct=mysql&resourceQuery=MySQL&resourceStatus=not-considered')),true);
 await bookmarked.waitForSelector('.dr-dialog[open]');
 assert.equal(await bookmarked.locator('.dr-product-title').innerText(),'MySQL');
 assert.equal(new URL(bookmarked.url()).searchParams.get('resourceStatus'),'not-considered');
 checks.push('a bookmarked or in-app project/product/filter route opens once, survives reload, and closes cleanly');
 await bookmarked.close();

 await page.click('[data-resource-open="components"]');await page.waitForSelector('.dr-dialog[open]');
 assert.match(await page.locator('.dr-body').innerText(),/Component library[\s\S]*Catalogue archetypes[\s\S]*descriptive roles/i);
 await page.click('[data-dr-action="browse-components"]');await page.waitForSelector('dialog[open] [data-cl-search]');
 assert.equal(new URL(page.url()).searchParams.get('chapter'),'5');
 assert.equal(await page.evaluate(()=>performance.timeOrigin),origin,'component browser opens in place');
 checks.push('the visible component library enters the existing Chapter 5 proposal browser');
 await page.keyboard.press('Escape');

 await page.click('[data-resource-open="knowledge"]');await page.waitForSelector('.dr-dialog[open]');
 await page.waitForFunction(()=>document.querySelector('.dr-status b')?.textContent.includes('not connected'));
 assert.match(await page.locator('.dr-body').innerText(),/not connected[\s\S]*Originals in this project[\s\S]*Eligible signed repository claims/i);
 await page.click('[data-dr-action="open-sources"]');await page.waitForSelector('#brain-panel .kw-tabs [data-view="sources"][aria-pressed="true"]');
 assert.match(await page.locator('#brain-panel .kw-body').innerText(),/Knowledge repository · not connected/i);
 checks.push('the repository entry exposes its actual local connection and review state, then opens the exact Sources workspace');

 await mockMedia(page);
 await page.click('[data-resource-open="knowledge"]');await page.waitForSelector('.dr-dialog[open]');
 await page.click('[data-dr-lens="scenes"]');await page.waitForSelector('[data-dr-scene="sample-pack:scene-01"]');
 assert.match(await page.locator('.dr-knowledge-lenses').innerText(),/Source media/);
 assert.doesNotMatch(await page.locator('.dr-video-intro').innerText(),/candidate|laptop|supplied/i);
 assert.equal(await page.locator('[data-dr-scene]').count(),2);
 await page.click('[data-dr-action="more-media"]');await page.waitForSelector('[data-dr-scene="sample-pack:scene-03"]');
 assert.equal(await page.locator('[data-dr-scene]').count(),3);
 await page.selectOption('[data-dr-scene-video]','sample-pack:recording-b');
 await page.waitForFunction(()=>document.querySelectorAll('[data-dr-scene]').length===1);
 assert.equal(await page.locator('.dr-scene-title').innerText(),'Batch load choice');
 await page.selectOption('[data-dr-scene-video]','');
 await page.selectOption('[data-dr-scene-area]','options');
 await page.waitForFunction(()=>document.querySelector('.dr-scene-count')?.textContent.includes('2 matching scenes'));
 await page.fill('[data-dr-scene-search]','queue');
 await page.waitForFunction(()=>document.querySelector('.dr-scene-count')?.textContent.includes('1 matching scenes'));
 assert.equal(await page.locator('.dr-scene-title').innerText(),'Queue tradeoffs');
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.drSceneSearch!==undefined),true);
 const sceneReading=await page.locator('.dr-scene-detail').innerText();
 assert.match(sceneReading,/sample-pack[\s\S]*recording-a[\s\S]*scene-01[\s\S]*00:10–00:20/i);
 assert.match(sceneReading,/Frame span[\s\S]*300–599[\s\S]*Restricted[\s\S]*Candidate interpretation/i);
 assert.equal(await page.locator('.dr-scene-detail a[href*="chapter="]').count(),0);
 assert.equal(await page.locator('.dr-scene-detail video, .dr-scene-detail a:has-text("Watch why")').count(),0);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async locator=>{window.__copiedSceneLocator=locator;}}}));
 await page.click('[data-dr-action="copy-scene-locator"]');await page.waitForFunction(()=>!!window.__copiedSceneLocator);
 assert.match(await page.evaluate(()=>window.__copiedSceneLocator),/sample-a\.mp4 · sample-pack · recording-a · scene-01 · 00:10–00:20 · frames 300–599/);
 assert.equal(new URL(page.url()).searchParams.get('resourceScene'),'sample-pack:scene-01');
 checks.push('project-gated media filters, paginates and copies a pack-scoped locator without a design shortcut');
 await page.fill('[data-dr-scene-search]','no-matching-synthetic-scene');
 await page.waitForFunction(()=>document.querySelector('.dr-scene-count')?.textContent.includes('0 matching scenes'));
 assert.equal(await page.locator('.dr-no-scenes').isVisible(),true);
 await page.fill('[data-dr-scene-search]','queue');
 await page.waitForFunction(()=>document.querySelector('.dr-scene-count')?.textContent.includes('1 matching scenes'));
 const mediaURL=page.url();
 const scenePage=await browser.newPage({viewport:{width:1280,height:800}});scenePage.on('pageerror',e=>errors.push(e.message));
 await mockMedia(scenePage);
 await scenePage.goto(mediaURL,{waitUntil:'networkidle'});await scenePage.waitForSelector('.dr-scene-title');
 assert.equal(await scenePage.locator('.dr-scene-title').innerText(),'Queue tradeoffs');
 await scenePage.reload({waitUntil:'networkidle'});await scenePage.waitForSelector('.dr-scene-title');
 assert.equal(await scenePage.locator('.dr-scene-title').innerText(),'Queue tradeoffs');
 await scenePage.click('.dr-scene-detail [data-dr-action="open-sources"]');
 await scenePage.waitForSelector('#brain-panel .kw-tabs [data-view="sources"][aria-pressed="true"]');
 assert.equal(new URL(scenePage.url()).searchParams.has('resources'),false);
 checks.push('a pack-scoped link survives reload and hands off to governed Sources');
 await scenePage.close();
 const deep=await browser.newPage({viewport:{width:1280,height:800}});deep.on('pageerror',e=>errors.push(e.message));
 await mockMedia(deep);
 await deep.goto(base+'/?chapter=4&tab=work&resources=knowledge&resourceLens=scenes&resourceScene=sample-pack%3Ascene-03',{waitUntil:'networkidle'});
 await deep.waitForSelector('.dr-scene-title');
 assert.equal(await deep.locator('.dr-scene-title').innerText(),'Batch load choice');
 await deep.close();
 const denied=await browser.newPage({viewport:{width:1280,height:800}});denied.on('pageerror',e=>errors.push(e.message));
 await mockMedia(denied,{forbidden:true});
 await denied.goto(base+'/?chapter=4&tab=work&resources=knowledge&resourceLens=scenes',{waitUntil:'networkidle'});
 await denied.waitForSelector('.dr-media-state:has-text("Source media is unavailable")');
 assert.equal(await denied.locator('[data-dr-scene]').count(),0);
 await denied.close();
 const empty=await browser.newPage({viewport:{width:1280,height:800}});empty.on('pageerror',e=>errors.push(e.message));
 await mockMedia(empty,{empty:true});
 await empty.goto(base+'/?chapter=4&tab=work&resources=knowledge&resourceLens=scenes',{waitUntil:'networkidle'});
 await empty.waitForSelector('.dr-no-scenes:visible');
 assert.match(await empty.locator('.dr-no-scenes').innerText(),/No source media is available to this workspace yet/i);
 assert.ok(await empty.locator('[data-dr-action="retry-media"]').count());
 await empty.close();
 checks.push('deep links use exact scoped lookup; empty and denied workspaces reveal no catalogue');
 assert.equal(await page.evaluate(()=>JSON.stringify(window.aiwProjectStore.value.document)),before,'resource discovery and handoffs did not mutate the project');
 await page.keyboard.press('Escape');
 const mobile=await browser.newPage({viewport:{width:390,height:844}});mobile.on('pageerror',e=>errors.push(e.message));
 await mockMedia(mobile);
 await mobile.goto(base+'/?chapter=4&tab=work',{waitUntil:'networkidle'});
 await mobile.click('.mobile-layers');await mobile.click('.journey-rail.open [data-resource-open="technology"]');
 await mobile.waitForSelector('.dr-dialog[open]');
 await mobile.screenshot({path:'/tmp/aiw-design-resources-phone.png'});
 assert.ok(await mobile.evaluate(()=>{const d=document.querySelector('.dr-dialog').getBoundingClientRect();return d.left>=-1&&d.right<=innerWidth+1&&d.width>=innerWidth-1;}),'the library fits the phone viewport');
 assert.ok(await mobile.evaluate(()=>{const detail=document.querySelector('.dr-detail-slot'),picker=document.querySelector('.dr-picker'),body=document.querySelector('.dr-body').getBoundingClientRect(),r=picker.getBoundingClientRect();return getComputedStyle(detail).display==='none'&&getComputedStyle(picker).display!=='none'&&r.left>=body.left-1&&r.right<=body.right+1;}),'phone list shows one full-width product picker without a clipped detail column');
 await mobile.click('[data-dr-product="mysql"]');
 assert.equal(await mobile.evaluate(()=>document.activeElement?.classList.contains('dr-product-title')),true,'phone selection focuses the explanation heading');
 assert.ok(await mobile.evaluate(()=>getComputedStyle(document.querySelector('.dr-picker')).display==='none'&&getComputedStyle(document.querySelector('.dr-detail-slot')).display!=='none'),'phone detail hides the picker and exposes the whole explanation');
 assert.ok(await mobile.evaluate(()=>{const r=document.querySelector('.dr-detail').getBoundingClientRect(),body=document.querySelector('.dr-body').getBoundingClientRect();return r.top>=body.top-1&&r.top<body.bottom&&r.right<=innerWidth+1;}),'the selected product detail is revealed in the phone scroll area');
 await mobile.screenshot({path:'/tmp/aiw-design-resources-phone-detail.png'});
 await mobile.click('[data-dr-action="back-products"]');
 assert.equal(await mobile.evaluate(()=>document.activeElement?.dataset.drProduct),'mysql','phone Back to products restores the selected list item');
 checks.push('the phone drawer reaches the same resources; selecting a product reveals its explanation within the viewport');
 await mobile.click('[data-dr-tab="knowledge"]');await mobile.click('[data-dr-lens="scenes"]');
 await mobile.selectOption('[data-dr-scene-video]','sample-pack:recording-a');await mobile.fill('[data-dr-scene-search]','queue');
 await mobile.waitForSelector('[data-dr-scene="sample-pack:scene-01"]');await mobile.click('[data-dr-scene="sample-pack:scene-01"]');
 assert.equal(await mobile.evaluate(()=>document.activeElement?.classList.contains('dr-scene-title')),true,'scene heading receives keyboard focus');
 assert.ok(await mobile.evaluate(()=>{const d=document.querySelector('.dr-scene-detail').getBoundingClientRect(),b=document.querySelector('.dr-body').getBoundingClientRect();return d.left>=-1&&d.right<=innerWidth+1&&d.top>=b.top-1&&d.top<b.bottom;}),'scene detail is visible and fits the phone viewport');
 checks.push('on a phone the chosen scene stays readable, focused and within the knowledge drawer');
 const narrow=await browser.newPage({viewport:{width:320,height:640}});narrow.on('pageerror',e=>errors.push(e.message));
 await narrow.goto(base+'/?chapter=4&tab=work',{waitUntil:'networkidle'});await narrow.click('.mobile-layers');await narrow.click('.journey-rail.open [data-resource-open="technology"]');await narrow.waitForSelector('.dr-dialog[open]');
 assert.ok(await narrow.evaluate(()=>{const picker=document.querySelector('.dr-picker').getBoundingClientRect(),detail=document.querySelector('.dr-detail-slot');return getComputedStyle(detail).display==='none'&&picker.left>=-1&&picker.right<=innerWidth+1;}),'320px list has no clipped detail column');
 await narrow.click('[data-dr-product="mysql"]');
 assert.ok(await narrow.evaluate(()=>{const detail=document.querySelector('.dr-detail').getBoundingClientRect();return getComputedStyle(document.querySelector('.dr-picker')).display==='none'&&detail.left>=-1&&detail.right<=innerWidth+1;}),'320px product detail occupies the full phone width');
 checks.push('320px and 390px switch one full-width list or detail surface without a leaking column');
 await narrow.close();
 assert.deepEqual(errors,[]);
}finally{await browser.close();server.kill();for(const suffix of ['','-wal','-shm'])try{rmSync(db+suffix,{force:true});}catch{/* cleanup only */}}
console.log(JSON.stringify({suite:'design resources rendered',passed:checks.length,checks},null,2));
