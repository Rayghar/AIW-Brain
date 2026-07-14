import { expect, test, type Page } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir='release-evidence/rc10.65.1/baseline-role-audit';
const role=process.env.AIW_AUDIT_ROLE ?? 'Solution Architect';
const startIndex=Math.max(0,Number(process.env.AIW_AUDIT_START ?? '0'));
const endIndex=process.env.AIW_AUDIT_END ? Number(process.env.AIW_AUDIT_END) : Number.POSITIVE_INFINITY;
function slug(v:string){return v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function collect(page:Page){const errors:string[]=[];const failed:string[]=[];const bad:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText??''}`));page.on('response',r=>{if(r.status()>=400)bad.push(`${r.status()} ${r.request().method()} ${r.url()}`);});return{errors,failed,bad};}
const meaningful=(v:string[])=>v.filter(x=>!/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404|telemetry/i.test(x));
async function closeTransient(page:Page){
  const viewbook=page.getByTestId('architecture-viewbook');if(await viewbook.isVisible().catch(()=>false)){const b=page.getByRole('button',{name:/Close Architecture Viewbook/i});if(await b.isVisible().catch(()=>false))await b.click().catch(()=>{});}
  for(const sel of ['.toast','.notification-toast']){const c=page.locator(sel).getByRole('button',{name:/close|dismiss/i});if(await c.isVisible().catch(()=>false))await c.click().catch(()=>{});}
  await page.keyboard.press('Escape').catch(()=>{});
}
async function start(page:Page){
  await mountAiw(page);
  await page.getByRole('button',{name:/new guided architecture project/i}).click();
  await page.getByLabel(/project name/i).fill('AIW Living Canvas Pilot Audit');
  await page.getByLabel(/business goal/i).fill('Design a regulated digital payments platform with secure multi-channel access, resilient transaction processing, auditable integrations, data protection and measurable recovery objectives.');
  await page.getByRole('button',{name:/create guided project/i}).click();
  await page.locator('.role-card').filter({hasText:/^Solution Architect/}).click();
  const tour=page.getByRole('dialog');if(await tour.isVisible().catch(()=>false)){const c=tour.getByRole('button',{name:/close|skip|not now/i}).first();if(await c.isVisible().catch(()=>false))await c.click();}
  await page.locator('label.role-journey-select select').selectOption({label:role},{force:true});
  await page.waitForTimeout(450);await closeTransient(page);
}
async function metrics(page:Page){return await page.evaluate(()=>{const vis=(e:Element)=>{const r=(e as HTMLElement).getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};const main=document.querySelector('main');const flow=document.querySelector('.react-flow');const r=flow?.getBoundingClientRect();const buttons=main?[...main.querySelectorAll('button')].filter(vis) as HTMLButtonElement[]:[];return{pageHeight:document.documentElement.scrollHeight,overflowX:document.documentElement.scrollWidth-innerWidth,textChars:(main?.textContent||'').trim().length,visibleButtons:buttons.length,visibleInputs:main?.querySelectorAll('input,select,textarea').length??0,headings:main?[...main.querySelectorAll('h1,h2,h3')].filter(vis).slice(0,15).map(e=>(e.textContent||'').trim()):[],firstViewportButtons:buttons.filter(b=>{const q=b.getBoundingClientRect();return q.top<innerHeight&&q.bottom>0;}).length,canvas:r?{top:r.top,bottom:r.bottom,width:r.width,height:r.height}:null};});}

test.beforeAll(async()=>mkdir(evidenceDir,{recursive:true}));
test(`${role} complete navigation and control inventory`,async({page},info)=>{
  test.setTimeout(20*60*1000);const signals=collect(page);await start(page);const rail=page.locator('.role-based-nav');await expect(rail).toBeVisible();const nav=rail.locator('.role-based-nav__section button');const n=await nav.count();const out:any={role,project:'AIW Living Canvas Pilot Audit',destinations:[],signals:{}};
  for(let i=startIndex;i<n && i<endIndex;i++){
    const b=nav.nth(i);const label=(await b.getAttribute('aria-label'))??(await b.innerText()).trim();await b.scrollIntoViewIfNeeded();await b.click();await page.waitForTimeout(520);await closeTransient(page);
    const controlInventory=await page.locator('main button:visible').evaluateAll((els:any[])=>els.map((e:any,index:number)=>({index,name:(e.getAttribute('aria-label')||e.innerText||e.title||'').trim().replace(/\s+/g,' '),title:e.title||'',disabled:!!e.disabled,kind:e.getAttribute('type')||'button'})).slice(0,250));
    const entry={index:i+1,label,metrics:await metrics(page),controls:controlInventory};out.destinations.push(entry);
    const stem=`${slug(role)}-${String(i+1).padStart(2,'0')}-${slug(label)}-${info.project.name}`;
    await page.screenshot({path:`${evidenceDir}/${stem}-viewport.png`,fullPage:false});
    if(i===0||entry.metrics.pageHeight>1800) await page.screenshot({path:`${evidenceDir}/${stem}-full.png`,fullPage:true});
    await writeFile(`${evidenceDir}/${slug(role)}-${info.project.name}.json`,JSON.stringify(out,null,2));
  }
  out.signals={errors:meaningful(signals.errors),failed:meaningful(signals.failed),responses:signals.bad};await writeFile(`${evidenceDir}/${slug(role)}-${info.project.name}.json`,JSON.stringify(out,null,2));
});
