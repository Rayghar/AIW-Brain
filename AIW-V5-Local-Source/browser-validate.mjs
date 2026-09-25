import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.AIW_PLAYWRIGHT_MODULE||'playwright');
const serverless=process.env.AIW_CHROMIUM_MODULE?(await import(process.env.AIW_CHROMIUM_MODULE)).default:null;
const {server}=await import('./server.js');
const out=process.env.AIW_TEST_OUTPUT||'test-results';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.AIW_BROWSER_EXECUTABLE,args:serverless?.args||[],headless:true});
const errors=[],checks=[],snapshots=[];
const ctx=await browser.newContext({viewport:{width:1440,height:1080},acceptDownloads:true});
const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(6000);
const click=async selector=>page.locator(selector).click();
const has=async(selector,text)=>assert((await page.locator(selector).innerText()).toLowerCase().includes(text.toLowerCase()),`${selector} should contain ${text}`);
const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('aiw-v5-explorer-v1')));
const pass=name=>{checks.push(name);console.log('PASS',name)};
async function shot(name,p=page,fullPage=true){const file=`${out}/${name}.png`;await p.screenshot({path:file,fullPage});snapshots.push(file)}
try{
  await page.goto('http://127.0.0.1:4173/?chapter=4');
  await page.waitForTimeout(400);await shot('desktop-initial');
  assert.equal(await page.locator('[data-node]').count(),10);
  assert.equal(await page.locator('#progress-percent').innerText(),'0%');
  await page.locator('[data-node="api"]').hover();await page.locator('#cursor-tip').waitFor({state:'visible'});await has('#cursor-tip','Chapter 4 / model');
  await click('[data-action="cursor"]');assert.equal(await page.locator('#cursor-tip').isVisible(),false);await click('[data-action="cursor"]');
  await page.locator('[data-node="risk"]').focus();await page.keyboard.press('Enter');await has('#inspector h2','Risk screening');
  pass('Cursor hover, toggle and keyboard object selection');
  for(const id of ['physical','data','technology','interface','security','deployment'])await click(`[data-layer="${id}"]`);
  assert.equal(await page.locator('[data-node]').count(),30);
  await click('[data-action="all-layers"]');assert.equal(await page.locator('[data-node]').count(),0);await has('.empty-state','fresh perspective');
  await click('[data-action="default-layers"]');assert.equal(await page.locator('[data-node]').count(),10);
  await page.locator('#model-search').fill('certificate lifecycle');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await has('#inspector h2','Service trust');assert.equal(await page.locator('[data-layer="security"]').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('[data-action="focus-model"]').getAttribute('aria-pressed'),'true');
  await click('[data-action="focus-model"]');
  await click('[data-action="expand-model"]');assert.equal(await page.locator('.wide-canvas').count(),1);await click('[data-action="expand-model"]');
  await click('[data-action="zoom-in"]');await has('#zoom-value','120%');await click('[data-action="zoom-out"]');await click('[data-action="fit"]');await has('#zoom-value','100%');
  const graph=page.locator('#canvas');const box=await graph.boundingBox();await page.mouse.move(box.x+30,box.y+35);await page.mouse.down();await page.mouse.move(box.x+70,box.y+60);await page.mouse.up();await click('[data-action="fit"]');
  pass('All eight layers, empty state, hidden-layer search, focus, widen, zoom and pan');
  await click('[data-chapter="4"]');
  await click('[data-action="motion"]');assert.equal(await page.locator('.flow-dot').count(),0);await click('[data-action="motion"]');
  await click('.canvas-toolbar [data-action="play"]');await click('#flow-panel [data-action="play"]');assert.equal(await page.locator('.flow-dot').count(),0);
  await click('[data-action="restart-flow"]');
  await page.locator('#scenario').selectOption('hold');for(let i=0;i<2;i++)await click('[data-action="step-flow"]');await has('.journey-copy','No ledger posting');assert(await page.locator('[data-action="step-flow"]').isDisabled());assert(await page.locator('[data-stage="2"]').isDisabled());
  await page.locator('#scenario').selectOption('timeout');for(let i=0;i<4;i++)await click('[data-action="step-flow"]');await has('.journey-copy','Outcome stays pending');assert(await page.locator('[data-stage="4"]').isDisabled());
  await page.locator('#scenario').selectOption('success');await click('.canvas-toolbar [data-action="play"]');await page.getByText('Journey complete · 5 steps traced',{exact:true}).waitFor({timeout:16000});assert((await state()).completed.includes('flow'));
  pass('Play/pause/restart, risk hold, settlement timeout and complete animated payment');
  await click('[data-tab="work"]');await page.locator('#architect-note').fill('Review duplicate handling before implementation.');await click('[data-action="review4"]');await click('[data-action="next"]');await has('.breadcrumb','Chapter 05');assert.equal(await page.locator('[data-node="worker"]').count(),1);
  await click('[data-action="sol"]');await has('.dialog','Chapter 5 / model');await page.keyboard.press('Escape');assert.equal(await page.locator('.dialog').count(),0);
  await click('[data-action="mind"]');await has('.dialog','Mind Factory');await page.locator('.dialog [data-propose="review"]').click();assert.equal(await page.locator('.node.ghost').count(),1);await click('[data-action="dismiss"]');assert.equal(await page.locator('.node.ghost').count(),0);
  for(const id of ['review','dedup','recovery']){await click('[data-action="mind"]');await page.locator(`.dialog [data-propose="${id}"]`).click();await click(`[data-accept="${id}"]`)}
  assert.equal((await state()).accepted.length,3);
  await click('[data-remove="recovery"]');assert.equal((await state()).accepted.length,2);await click('[data-action="mind"]');await page.locator('.dialog [data-propose="recovery"]').click();await click('[data-accept="recovery"]');
  await click('[data-tab="validate"]');await click('[data-action="validate"]');assert.equal(await page.locator('.validation-row').count(),6);await has('.content-card','independent review');
  pass('Chapter handoff, Sol/Mind, ghost dismiss, all three candidate changes, undo and validation');
  await click('[data-tab="output"]');await page.locator('.object-link[data-select="ledger"]').hover();await page.locator('#cursor-tip').waitFor({state:'visible'});await has('#cursor-tip','Chapter 5 / output');
  await click('.object-link[data-select="ledger"]');await has('#inspector h2','Core ledger');
  const dlPromise=page.waitForEvent('download');await click('[data-action="export"]');const dl=await dlPromise;await dl.saveAs(`${out}/model.json`);const exported=JSON.parse(await fs.readFile(`${out}/model.json`,'utf8'));assert.equal(exported.nodes.length,33);assert.equal(exported.workingCandidates.length,3);assert(exported.architectNote.includes('duplicate'));assert.equal(exported.validation.findings.at(-1).ok,false);
  const mdPromise=page.waitForEvent('download');await click('[data-action="export-summary"]');const md=await mdPromise;await md.saveAs(`${out}/reading.md`);assert((await fs.readFile(`${out}/reading.md`,'utf8')).includes('Review findings'));
  await page.reload();assert.equal((await state()).accepted.length,3);await has('.content-card','Review duplicate handling');
  assert.equal(await page.locator('#progress-percent').innerText(),'100%');
  await click('[data-tab="work"]');await page.locator('#architect-note').fill('Updated review note.');assert(!(await state()).completed.includes('export'));
  await click('[data-tab="model"]');await page.locator('#model-search').fill('core ledger');await page.keyboard.press('Enter');await page.mouse.move(0,0);await shot('desktop-focus');
  pass('Output-aware cursor, both downloads, retained state and truthful progress invalidation');
  for(const width of [1280,1024,768]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No horizontal overflow at ${width}`)}
  const mobileCtx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,acceptDownloads:true});await mobileCtx.addInitScript(()=>localStorage.clear());const m=await mobileCtx.newPage();m.on('pageerror',e=>errors.push(e.message));await m.goto('http://127.0.0.1:4173/?chapter=4');
  assert(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await m.locator('.sidebar').isVisible(),false);
  await m.locator('[data-action="layers-menu"]').tap();assert(await m.locator('.sidebar').isVisible());await m.locator('[data-action="all-layers"]').tap();assert.equal(await m.locator('[data-node]').count(),30);await m.locator('[data-action="layers-menu"]').tap();
  assert(await m.locator('#canvas').evaluate(el=>el.scrollHeight>el.clientHeight));
  await m.locator('#model-search').fill('Risk screening');await m.locator('#model-search').press('Enter');await m.locator('[data-node="risk"]').tap();await hasMobile('Risk screening');await m.locator('[data-action="back-canvas"]').tap();
  await m.locator('[data-action="sol"]').tap();assert(await m.locator('.dialog').isVisible());await m.locator('[data-action="close-modal"]').tap();
  await m.locator('[data-action="layers-menu"]').tap();await m.locator('[data-chapter="5"]').tap();await m.locator('[data-action="layers-menu"]').tap();await m.locator('#model-search').fill('Settlement worker');await m.locator('#model-search').press('Enter');await m.locator('#canvas').scrollIntoViewIfNeeded();await m.waitForTimeout(400);assert.equal(await m.locator('#cursor-tip').isVisible(),false);await shot('mobile-model',m,false);
  for(const tab of ['work','validate','output']){await m.locator(`[data-tab="${tab}"]`).tap();assert(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No mobile overflow in ${tab}`)}
  await shot('mobile-output',m,true);
  pass('Responsive tablet widths and touch-driven mobile layers, search, inspector, dialogs and tabs');
  await m.emulateMedia({reducedMotion:'reduce'});await m.locator('[data-tab="model"]').tap();assert.equal(await m.locator('.flow-dot').count(),0);
  pass('Reduced-motion preference');
  if(process.env.AIW_AXE_SCRIPT){
    await page.setViewportSize({width:1440,height:1080});
    await page.addScriptTag({path:process.env.AIW_AXE_SCRIPT});
    await m.addScriptTag({path:process.env.AIW_AXE_SCRIPT});
    const audits=[];
    async function audit(name,p=page){
      await p.waitForTimeout(450);
      const result=await p.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
      audits.push({name,violations:result.violations});
    }
    for(const tab of ['model','work','validate','output']){await click(`[data-tab="${tab}"]`);await audit(`desktop-${tab}`)}
    await click('[data-tab="model"]');
    for(const dialog of ['sol','mind']){await click(`[data-action="${dialog}"]`);await audit(dialog);await page.keyboard.press('Escape')}
    await audit('mobile-model',m);
    await fs.writeFile(`${out}/accessibility.json`,JSON.stringify(audits,null,2));
    assert.equal(audits.reduce((count,a)=>count+a.violations.length,0),0,'Accessibility findings remain; see test-results/accessibility.json');
    pass('Automated accessibility checks across four tabs, both dialogs and mobile');
  }
  assert.deepEqual(errors,[]);pass('No browser JavaScript errors');
  await fs.writeFile(`${out}/browser-report.json`,JSON.stringify({status:'passed',checks,errors,snapshots},null,2));
  async function hasMobile(text){assert((await m.locator('#inspector h2').innerText()).includes(text))}
}catch(error){await shot('failure').catch(()=>{});console.error(error.stack);process.exitCode=1}
finally{await browser.close();server.close();}
