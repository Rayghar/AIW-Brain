import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = process.env.AIW_EVIDENCE_DIR ?? 'release-evidence/rc10.65.1/same-project-post-audit';
const defaultRoles = ['Solution Architect','Enterprise Architect','Platform Architect','Reviewer','Knowledge Curator'] as const;
const roles = (process.env.AIW_AUDIT_ROLES?.split('|').filter(Boolean) ?? [...defaultRoles]) as readonly string[];
const slug = (value:string) => value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const meaningful=(values:string[])=>values.filter(v=>!/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404|telemetry/i.test(v));

function signals(page:Page){
  const errors:string[]=[]; const failed:string[]=[]; const responses:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
  page.on('requestfailed',r=>failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText??''}`));
  page.on('response',r=>{if(r.status()>=400) responses.push(`${r.status()} ${r.request().method()} ${r.url()}`);});
  return {errors,failed,responses};
}
async function closeTransient(page:Page){
  const viewbook=page.getByTestId('architecture-viewbook');
  if(await viewbook.isVisible().catch(()=>false)) await page.getByRole('button',{name:/Close Architecture Viewbook/i}).click().catch(()=>{});
  const dialogs=page.getByRole('dialog');
  for(let i=0;i<await dialogs.count();i++){
    const dialog=dialogs.nth(i); if(!await dialog.isVisible().catch(()=>false)) continue;
    const close=dialog.getByRole('button',{name:/close|cancel|dismiss|skip|not now/i}).first();
    if(await close.isVisible().catch(()=>false)) await close.click().catch(()=>{});
  }
  await page.keyboard.press('Escape').catch(()=>{});
}
async function metric(page:Page){
  return page.evaluate(()=>{
    const main=document.querySelector('main');
    const visible=(el:Element)=>{const r=(el as HTMLElement).getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
    const buttons=main?[...main.querySelectorAll('button')].filter(visible) as HTMLButtonElement[]:[];
    const flow=document.querySelector('.react-flow'); const fr=flow?.getBoundingClientRect();
    return {
      height:document.documentElement.scrollHeight,
      overflowX:Math.max(0,document.documentElement.scrollWidth-innerWidth),
      textChars:(main?.textContent??'').trim().length,
      visibleButtons:buttons.length,
      firstViewportButtons:buttons.filter(b=>{const r=b.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).length,
      inputs:main?.querySelectorAll('input,select,textarea').length??0,
      headings:main?[...main.querySelectorAll('h1,h2,h3')].filter(visible).slice(0,12).map(x=>(x.textContent??'').trim()):[],
      canvas:fr?{top:Math.round(fr.top),width:Math.round(fr.width),height:Math.round(fr.height),bottom:Math.round(fr.bottom)}:null,
      controls:buttons.slice(0,220).map(b=>({name:(b.getAttribute('aria-label')||b.innerText||b.title||'').trim().replace(/\s+/g,' '),disabled:b.disabled,title:b.title||''})),
    };
  });
}

test.beforeAll(async()=>mkdir(evidenceDir,{recursive:true}));

test('five non-admin roles on one project after remediation',async({page},info)=>{
  test.setTimeout(10*60*1000);
  const observed=signals(page);
  await mountAiw(page);
  await page.getByRole('button',{name:/new guided architecture project/i}).click();
  await page.getByLabel(/project name/i).fill('AIW Living Canvas Pilot Audit');
  await page.getByLabel(/business goal/i).fill('Design a regulated digital payments platform with secure multi-channel access, resilient transaction processing, auditable integrations, data protection and measurable recovery objectives.');
  await page.getByRole('button',{name:/create guided project/i}).click();
  await page.locator('.role-card').filter({hasText:/^Solution Architect/}).click();
  await closeTransient(page);
  const audit:any={project:'AIW Living Canvas Pilot Audit',sameProject:true,roles:[],signals:{}};
  for(const role of roles){
    await page.locator('label.role-journey-select select').selectOption({label:role},{force:true});
    await page.waitForTimeout(180); await closeTransient(page);
    const rail=page.locator('.role-based-nav'); await expect(rail).toBeVisible();
    const nav=rail.locator('.role-based-nav__section button'); const count=await nav.count();
    const roleAudit:any={role,destinations:[]};
    for(let i=0;i<count;i++){
      const b=nav.nth(i); const label=(await b.getAttribute('aria-label'))??(await b.innerText()).trim();
      await b.scrollIntoViewIfNeeded(); await b.click({timeout:10000}); await page.waitForTimeout(180); await closeTransient(page);
      const data=await metric(page); roleAudit.destinations.push({index:i+1,label,...data});
      await page.screenshot({path:`${evidenceDir}/${slug(role)}-${String(i+1).padStart(2,'0')}-${slug(label)}-${info.project.name}.png`,fullPage:false});
    }
    audit.roles.push(roleAudit);
    await writeFile(`${evidenceDir}/same-project-post-audit-${info.project.name}.json`,JSON.stringify(audit,null,2));
  }
  audit.signals={errors:meaningful(observed.errors),failed:meaningful(observed.failed),responses:observed.responses.filter(v=>!/^404 /.test(v))};
  await writeFile(`${evidenceDir}/same-project-post-audit-${info.project.name}.json`,JSON.stringify(audit,null,2));
  expect(audit.signals.errors).toEqual([]);
  expect(audit.signals.failed).toEqual([]);
  expect(audit.signals.responses).toEqual([]);
});
