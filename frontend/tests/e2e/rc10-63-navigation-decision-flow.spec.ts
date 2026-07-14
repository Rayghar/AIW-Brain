import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.63/screenshots';
function errorsFor(page: Page) { const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); }); return errors; }
function meaningful(errors:string[]) { return errors.filter(e=>!/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404/i.test(e)); }
async function openSample(page:Page) { await mountAiw(page); await page.getByRole('button',{name:/open sample architecture/i}).click(); }
async function chooseRole(page:Page, role:string) { await mountAiw(page); await page.getByRole('button',{name:/Continue locally/i}).click(); await page.locator('.role-card').filter({hasText:role}).click(); const dialog=page.getByRole('dialog'); if(await dialog.isVisible().catch(()=>false)){ const close=dialog.getByRole('button',{name:/close|skip|not now/i}).first(); if(await close.isVisible().catch(()=>false)) await close.click(); } }

test.beforeAll(async()=>{ await mkdir(evidenceDir,{recursive:true}); });

test.describe('AIW rc.10.63 navigation spine and decision flows',()=>{
  test('role-aware left navigation is visible and top bar is context-only', async({page},info)=>{
    const errors=errorsFor(page); await openSample(page);
    await expect(page.locator('.role-based-nav')).toBeVisible();
    await expect(page.locator('.role-product-bar__lenses')).toHaveCount(0);
    await expect(page.locator('.role-product-bar__location')).toContainText(/Current workspace/i);
    await expect(page.getByRole('button',{name:'Architecture Composition'})).toBeVisible();
    await page.screenshot({path:`${evidenceDir}/01-navigation-spine-${info.project.name}.png`,fullPage:false});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1); expect(meaningful(errors)).toEqual([]);
  });

  test('Architecture Composition opens a lifecycle-native candidate and preview workflow', async({page},info)=>{
    const errors=errorsFor(page); await openSample(page);
    await page.getByRole('button',{name:'Architecture Composition'}).click();
    await expect(page.getByRole('heading',{name:/Choose patterns that fit this model scope/i})).toBeVisible();
    await expect(page.getByText(/Active stage/i).first()).toBeVisible();
    await expect(page.getByRole('button',{name:/Preview model change/i})).toBeVisible();
    await page.screenshot({path:`${evidenceDir}/02-composition-candidates-${info.project.name}.png`,fullPage:false});
    await page.getByRole('button',{name:/Preview model change/i}).click();
    await expect(page.locator('.rc56-composition-studio')).toBeVisible();
    expect(meaningful(errors)).toEqual([]);
  });

  test('Architecture Viewbook opens from the restored journey rail', async({page},info)=>{
    const errors=errorsFor(page); await openSample(page);
    await page.getByRole('button',{name:'Architecture Viewbook'}).click();
    await expect(page.getByTestId('architecture-viewbook')).toBeVisible();
    await expect(page.getByRole('navigation',{name:/Architecture viewpoints/i})).toBeVisible();
    await page.screenshot({path:`${evidenceDir}/03-viewbook-spine-${info.project.name}.png`,fullPage:false});
    expect(meaningful(errors)).toEqual([]);
  });

  test('Architecture Options starts with readiness and one generation action', async({page},info)=>{
    const errors=errorsFor(page); await openSample(page);
    await page.getByRole('button',{name:'Architecture Options'}).click();
    await expect(page.getByRole('heading',{name:/Generate and compare architecture alternatives/i})).toBeVisible();
    await expect(page.getByRole('button',{name:/Generate alternatives/i})).toBeVisible();
    await expect(page.getByText(/rc\.10\.57/i)).toHaveCount(0);
    await page.screenshot({path:`${evidenceDir}/04-options-readiness-${info.project.name}.png`,fullPage:false});
    expect(meaningful(errors)).toEqual([]);
  });

  test('cockpit shows authoritative journey progress instead of contradictory active-stage status', async({page},info)=>{
    const errors=errorsFor(page); await openSample(page);
    await page.getByRole('button',{name:'Project Cockpit'}).click();
    await expect(page.getByText('Journey progress')).toBeVisible();
    await expect(page.getByText(/stages ready or modelled/i)).toBeVisible();
    await page.screenshot({path:`${evidenceDir}/05-lifecycle-status-${info.project.name}.png`,fullPage:false});
    expect(meaningful(errors)).toEqual([]);
  });
  test('aliased portfolio menu entries resolve to distinct task intents', async({page},info)=>{
    const errors=errorsFor(page); await chooseRole(page,'Enterprise Architect');
    await page.getByRole('button',{name:'Risks'}).click();
    await expect(page.getByText(/Focused lens: Portfolio risks/i)).toBeVisible();
    await page.getByRole('button',{name:'Reuse'}).click();
    await expect(page.getByText(/Focused lens: Reuse opportunities/i)).toBeVisible();
    await page.screenshot({path:`${evidenceDir}/06-distinct-menu-intents-${info.project.name}.png`,fullPage:false});
    expect(meaningful(errors)).toEqual([]);
  });

});
