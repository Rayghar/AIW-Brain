import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.65/screenshots';
function collectErrors(page: Page) { const errors:string[]=[]; page.on('pageerror', e=>errors.push(e.message)); page.on('console', m=>{ if(m.type()==='error') errors.push(m.text()); }); return errors; }
function meaningful(errors:string[]) { return errors.filter(e=>!/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404/i.test(e)); }
async function openSample(page:Page) { await mountAiw(page); await page.getByRole('button',{name:/open sample architecture/i}).click(); }

test.beforeAll(async()=>{ await mkdir(evidenceDir,{recursive:true}); });

test('professional SDD delivery is readable, evidence-led and responsive', async({page},info)=>{
  const errors=collectErrors(page);
  await openSample(page);
  await page.getByRole('button',{name:'SDD Pack'}).click();
  await page.getByRole('button',{name:/Open delivery generator/i}).click();
  await expect(page.getByRole('heading',{name:/Generate the final SDD only from a governed baseline/i})).toBeVisible();
  await expect(page.getByText('Professional SDD readiness')).toBeVisible();
  await expect(page.getByText('Professional PDF SDD')).toBeVisible();
  await expect(page.getByRole('button',{name:/Download professional PDF/i})).toBeVisible();
  await expect(page.getByText(/32 model objects/i)).toBeVisible();
  await page.getByRole('button',{name:/Preview SDD/i}).click();
  await expect(page.getByText(/Executive architecture summary/i)).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({path:`${evidenceDir}/professional-sdd-${info.project.name}.png`,fullPage:false});
  expect(meaningful(errors)).toEqual([]);
});
