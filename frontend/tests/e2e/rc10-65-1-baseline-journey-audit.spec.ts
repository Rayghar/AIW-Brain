import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.65.1/baseline';
const roles = ['Solution Architect','Enterprise Architect','Platform Architect','Architecture Reviewer','Knowledge Curator'] as const;

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
function collectSignals(page: Page) {
  const errors:string[]=[]; const failed:string[]=[]; const responses:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
  page.on('requestfailed',r=>failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText ?? ''}`));
  page.on('response',r=>{ if(r.status() >= 400) responses.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
  return { errors, failed, responses };
}
function meaningful(values:string[]) { return values.filter(v=>!/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404|ERR_CONNECTION_REFUSED.*telemetry/i.test(v)); }

async function closeTransient(page: Page) {
  const viewbook = page.getByTestId('architecture-viewbook');
  if (await viewbook.isVisible().catch(()=>false)) {
    const close = page.getByRole('button',{name:/Close Architecture Viewbook/i});
    if(await close.isVisible().catch(()=>false)) await close.click();
  }
  const dialogs = page.getByRole('dialog');
  const count = await dialogs.count();
  for(let i=0;i<count;i++){
    const dialog=dialogs.nth(i);
    if(!await dialog.isVisible().catch(()=>false)) continue;
    const close=dialog.getByRole('button',{name:/close|cancel|dismiss|skip|not now/i}).first();
    if(await close.isVisible().catch(()=>false)) await close.click().catch(()=>{});
  }
  await page.keyboard.press('Escape').catch(()=>{});
}

async function createProject(page: Page) {
  await mountAiw(page);
  await expect(page.getByRole('heading',{name:/start a guided architecture design/i})).toBeVisible();
  await page.getByRole('button',{name:/new guided architecture project/i}).click();
  await page.getByLabel(/project name/i).fill('AIW Living Canvas Pilot Audit');
  await page.getByLabel(/business goal/i).fill('Design a regulated digital payments platform with secure multi-channel access, resilient transaction processing, auditable integrations and measurable recovery objectives.');
  await page.getByRole('button',{name:/create guided project/i}).click();
  await page.locator('.role-card').filter({hasText:/^Solution Architect/}).click();
  await closeTransient(page);
  await expect(page.locator('#aiw-main')).toBeVisible();
}

test.beforeAll(async()=>{ await mkdir(evidenceDir,{recursive:true}); });

test('complete role and lifecycle baseline audit', async({page},info)=>{
  test.setTimeout(30*60*1000);
  const signals=collectSignals(page);
  await createProject(page);
  const audit:any={project:'AIW Living Canvas Pilot Audit',viewport:info.project.name,roles:[],signals};

  for(const role of roles){
    await page.locator('label.role-journey-select select').selectOption({label:role}, { force: true });
    await page.waitForTimeout(500);
    await closeTransient(page);
    const rail=page.locator('.role-based-nav');
    await expect(rail).toBeVisible();
    const buttons=rail.locator('.role-based-nav__section button');
    const count=await buttons.count();
    const roleEntry:any={role,destinations:[]};
    for(let index=0;index<count;index++){
      const button=buttons.nth(index);
      const label=(await button.getAttribute('aria-label')) ?? (await button.innerText()).trim();
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await page.waitForTimeout(700);
      await closeTransient(page);
      const metrics=await page.evaluate(()=>{
        const main=document.querySelector('main');
        const flow=document.querySelector('.react-flow');
        const mainRect=main?.getBoundingClientRect(); const flowRect=flow?.getBoundingClientRect();
        const visible=(el:Element)=>{const r=(el as HTMLElement).getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
        const visibleButtons=[...document.querySelectorAll('button')].filter(visible) as HTMLButtonElement[];
        const mainButtons=main?[...main.querySelectorAll('button')].filter(visible) as HTMLButtonElement[]:[];
        const headings=main?[...main.querySelectorAll('h1,h2,h3')].filter(visible).slice(0,12).map(e=>(e.textContent||'').trim()):[];
        return {
          title:document.title,
          pageHeight:document.documentElement.scrollHeight,
          viewport:{width:innerWidth,height:innerHeight},
          horizontalOverflow:document.documentElement.scrollWidth-innerWidth,
          main:{top:mainRect?.top??null,height:mainRect?.height??null,textChars:(main?.textContent||'').trim().length,buttons:mainButtons.length,inputs:main?.querySelectorAll('input,select,textarea').length??0,headings},
          totalVisibleButtons:visibleButtons.length,
          canvas:flowRect?{top:flowRect.top,height:flowRect.height,width:flowRect.width,bottom:flowRect.bottom}:null,
          firstViewportMainButtons:mainButtons.filter(b=>b.getBoundingClientRect().top<innerHeight&&b.getBoundingClientRect().bottom>0).length,
          dialogs:[...document.querySelectorAll('[role="dialog"]')].filter(visible).map(e=>(e.getAttribute('aria-label')||e.querySelector('h1,h2,h3')?.textContent||'').trim()),
        };
      });
      const controls=await page.locator('main button:visible').evaluateAll((els)=>els.slice(0,200).map((el:any)=>({name:(el.getAttribute('aria-label')||el.innerText||el.title||'').trim().replace(/\s+/g,' '),title:el.title||'',disabled:el.disabled,className:el.className}))); 
      const file=`${String(index+1).padStart(2,'0')}-${slug(label)}-${slug(role)}-${info.project.name}`;
      await page.screenshot({path:`${evidenceDir}/${file}.png`,fullPage:true});
      roleEntry.destinations.push({label,metrics,controls});
    }
    audit.roles.push(roleEntry);
  }
  audit.signals={errors:meaningful(signals.errors),failed:meaningful(signals.failed),responses:signals.responses};
  await writeFile(`${evidenceDir}/baseline-audit-${info.project.name}.json`,JSON.stringify(audit,null,2));
  expect(meaningful(signals.errors)).toEqual([]);
});
