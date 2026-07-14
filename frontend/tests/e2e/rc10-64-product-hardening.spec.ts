import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.64/screenshots';
function collectErrors(page: Page) { const errors:string[]=[]; page.on('pageerror', e=>errors.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errors.push(m.text()); }); return errors; }
function meaningful(errors:string[]) { return errors.filter(e=>!/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404/i.test(e)); }
async function openSample(page:Page) { await mountAiw(page); await page.getByRole('button',{name:/open sample architecture/i}).click(); }
async function chooseRole(page:Page, role:string) { await mountAiw(page); await page.getByRole('button',{name:/Continue locally/i}).click(); await page.locator('.role-card').filter({hasText:role}).click(); const dialog=page.getByRole('dialog'); if(await dialog.isVisible().catch(()=>false)){ const close=dialog.getByRole('button',{name:/close|skip|not now/i}).first(); if(await close.isVisible().catch(()=>false)) await close.click(); } }
async function assertNoOverflow(page:Page) { const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth); expect(overflow).toBeLessThanOrEqual(1); }

test.beforeAll(async()=>{ await mkdir(evidenceDir,{recursive:true}); });

test.describe('AIW rc.10.65 product hardening',()=>{
  test('cockpit and readiness rail consume one lifecycle status model', async({page},info)=>{
    const errors=collectErrors(page); await openSample(page); await page.getByRole('button',{name:'Project Cockpit'}).click();
    await expect(page.getByText('Journey progress')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Stage progress'})).toBeVisible();
    await expect(page.locator('button[title="Problem, scope and constraints"]')).toContainText(/In progress|Ready|Inputs complete|Modelled/i);
    await expect(page.getByText(/stages ready or modelled/i)).toBeVisible();
    await page.screenshot({path:`${evidenceDir}/01-lifecycle-status-${info.project.name}.png`,fullPage:false});
    await assertNoOverflow(page); expect(meaningful(errors)).toEqual([]);
  });

  test('enterprise shared workspaces expose distinct task contracts', async({page},info)=>{
    const errors=collectErrors(page); await chooseRole(page,'Enterprise Architect');
    await page.getByRole('button',{name:'Risks'}).click();
    await expect(page.locator('[data-task-intent="risk-concentration"]')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Risk concentration'})).toBeVisible();
    await page.getByRole('button',{name:'Reuse'}).click();
    await expect(page.locator('[data-task-intent="reuse-candidates"]')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Reuse candidates'})).toBeVisible();
    await page.screenshot({path:`${evidenceDir}/02-task-contracts-${info.project.name}.png`,fullPage:false});
    await assertNoOverflow(page); expect(meaningful(errors)).toEqual([]);
  });

  test('reviewer Evidence destination opens a dedicated evidence ledger lens', async({page},info)=>{
    const errors=collectErrors(page); await chooseRole(page,'Architecture Reviewer');
    await page.getByRole('button',{name:'Evidence'}).click();
    await expect(page.locator('[data-task-intent="evidence-ledger"]')).toBeVisible();
    await expect(page.getByTestId('evidence-ledger-lens')).toBeVisible();
    await expect(page.getByRole('heading',{name:/Verify architecture evidence/i})).toBeVisible();
    await page.screenshot({path:`${evidenceDir}/03-evidence-ledger-${info.project.name}.png`,fullPage:false});
    await assertNoOverflow(page); expect(meaningful(errors)).toEqual([]);
  });

  test('keyboard focus and reduced motion remain usable at desktop and laptop widths', async({page},info)=>{
    const errors=collectErrors(page); await page.emulateMedia({reducedMotion:'reduce'}); await openSample(page);
    const skip=page.getByRole('link',{name:/Skip to main content/i});
    await skip.focus(); await expect(skip).toBeFocused();
    await expect(page.locator('html')).toHaveCSS('scroll-behavior', /auto|smooth/);
    await page.screenshot({path:`${evidenceDir}/04-keyboard-reduced-motion-${info.project.name}.png`,fullPage:false});
    await assertNoOverflow(page); expect(meaningful(errors)).toEqual([]);
  });
});
