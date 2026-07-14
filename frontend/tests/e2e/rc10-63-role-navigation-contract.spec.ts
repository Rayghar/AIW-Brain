import { expect, test, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.63/role-navigation';
const roles = ['Solution Architect','Enterprise Architect','Platform Architect','Architecture Reviewer','Knowledge Curator','Administrator'] as const;

function collectSignals(page: Page) {
  const errors:string[]=[]; const failed:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
  page.on('requestfailed',r=>failed.push(`${r.method()} ${r.url()} ${r.failure()?.errorText ?? ''}`));
  return { errors, failed };
}
function meaningful(errors:string[]) { return errors.filter(e=>!/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404|ERR_CONNECTION_REFUSED.*telemetry/i.test(e)); }
async function chooseRole(page:Page, role:string) {
  await mountAiw(page);
  await page.getByRole('button',{name:/Continue locally/i}).click();
  await page.locator('.role-card').filter({hasText:role}).click();
  const dialog=page.getByRole('dialog');
  if(await dialog.isVisible().catch(()=>false)){
    const close=dialog.getByRole('button',{name:/close|skip|not now/i}).first();
    if(await close.isVisible().catch(()=>false)) await close.click();
  }
}

test.beforeAll(async()=>{ await mkdir(evidenceDir,{recursive:true}); });

for (const role of roles) {
  test(`${role} rail destinations are operable and preserve orientation`, async({page},info)=>{
    const signals=collectSignals(page); await chooseRole(page,role);
    const rail=page.locator('.role-based-nav'); await expect(rail).toBeVisible();
    const buttons=rail.locator('.role-based-nav__section button');
    const count=await buttons.count(); expect(count).toBeGreaterThan(0);
    const destinations:string[]=[];
    for(let index=0; index<count; index++){
      const button=buttons.nth(index);
      const label=(await button.getAttribute('aria-label')) ?? (await button.innerText()).trim();
      destinations.push(label);
      await button.scrollIntoViewIfNeeded();
      await button.click();
      await page.waitForTimeout(320);
      const viewbook=page.getByTestId('architecture-viewbook');
      if(await viewbook.isVisible().catch(()=>false)){
        await page.getByRole('button',{name:'Close Architecture Viewbook'}).click();
      }
      await expect(page.locator('main').first()).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/Something went wrong|Unhandled application error|Cannot read properties of/i);
    }
    const slug=role.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    await page.screenshot({path:`${evidenceDir}/${slug}-${info.project.name}.png`,fullPage:false});
    await writeFile(`${evidenceDir}/${slug}-${info.project.name}.json`,JSON.stringify({role,count,destinations,errors:meaningful(signals.errors),failed:signals.failed.filter(item=>!/ERR_ABORTED|favicon/i.test(item))},null,2));
    expect(meaningful(signals.errors)).toEqual([]);
  });
}
