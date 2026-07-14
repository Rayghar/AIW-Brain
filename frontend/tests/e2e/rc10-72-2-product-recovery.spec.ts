import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.72.2/product-recovery';

function observe(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || /React Flow.*not initialized/i.test(message.text())) errors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    const value = `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`;
    if (!/presence\/heartbeat/i.test(value)) errors.push(value);
  });
  return errors;
}

function meaningful(errors: string[]) {
  return errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|ERR_ABORTED|LLM_ALL_ROUTES_FAILED/i.test(entry));
}

async function noOverflow(page: Page) {
  const result = await page.evaluate(() => {
    const main = document.getElementById('aiw-main');
    return {
      document: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      main: main ? Math.max(0, main.scrollWidth - main.clientWidth) : 0,
    };
  });
  if (result.document > 1 || result.main > 1) {
    const offenders = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("#aiw-main *")).map((el) => { const cs=getComputedStyle(el); return ({ cls: el.className, tag: el.tagName, left: Math.round(el.getBoundingClientRect().left), right: Math.round(el.getBoundingClientRect().right), width: Math.round(el.getBoundingClientRect().width), scroll: el.scrollWidth, client: el.clientWidth, position: cs.position, margin: cs.margin, padding: cs.padding, border: cs.borderWidth, transform: cs.transform, box: cs.boxSizing, maxWidth: cs.maxWidth, overflowX: cs.overflowX }); }).filter((item) => item.scroll > item.client + 1 || item.right > window.innerWidth + 1).sort((a,b) => Math.max(b.scroll-b.client,b.right-window.innerWidth)-Math.max(a.scroll-a.client,a.right-window.innerWidth)).slice(0,12));
    console.log("OVERFLOW", result, offenders);
  }
  expect(result.document).toBeLessThanOrEqual(1);
  expect(result.main).toBeLessThanOrEqual(1);
}

async function openSample(page: Page) {
  await mountAiw(page);
  await page.getByRole('button', { name: /open sample architecture/i }).click();
  await expect(page.locator('.guided-delivery')).toBeVisible();
}

async function openNavigation(page: Page, projectName: string): Promise<Locator> {
  const rail = page.getByTestId('role-navigation-v2');
  if (projectName.includes('laptop')) {
    const launcher = page.getByRole('button', { name: /Open role navigation/i });
    if (await launcher.isVisible().catch(() => false)) await launcher.click();
  }
  await expect(rail).toBeVisible();
  await expect(rail).toHaveAttribute('data-state', 'expanded');
  return rail;
}

async function nodeTransforms(page: Page) {
  return page.locator('.react-flow__node:not(.living-canvas-ghost-node)').evaluateAll((nodes) =>
    nodes.map((node) => ({
      id: node.getAttribute('data-id') ?? node.id,
      transform: (node as HTMLElement).style.transform,
      width: Math.round(node.getBoundingClientRect().width),
      height: Math.round(node.getBoundingClientRect().height),
    })).filter((item) => item.id),
  );
}

async function assertLeftAlignedNavigation(rail: Locator) {
  const alignments = await rail.locator('.aiw-primary-nav__label').evaluateAll((nodes) =>
    nodes.map((node) => getComputedStyle(node).textAlign),
  );
  expect(alignments.length).toBeGreaterThan(3);
  expect(new Set(alignments)).toEqual(new Set(['left']));
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('product recovery navigation and smart canvas remain coherent and reversible', async ({ page }, info) => {
  test.setTimeout(100_000);
  const errors = observe(page);
  await openSample(page);

  const main = page.locator('#aiw-main');
  let rail = await openNavigation(page, info.project.name);
  await assertLeftAlignedNavigation(rail);

  if (info.project.name.includes('laptop')) {
    const mainBefore = await main.boundingBox();
    const railBefore = await rail.boundingBox();
    await rail.hover();
    await page.waitForTimeout(220);
    const mainAfter = await main.boundingBox();
    const railAfter = await rail.boundingBox();
    expect(railAfter?.width).toBeCloseTo(railBefore!.width, 0);
    expect(mainAfter?.x).toBeCloseTo(mainBefore!.x, 0);
    expect(mainAfter?.width).toBeCloseTo(mainBefore!.width, 0);
    await page.screenshot({ path: `${evidenceDir}/navigation-overlay-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  } else {
    const railBefore = await rail.boundingBox();
    const mainBefore = await main.boundingBox();
    expect(railBefore?.width).toBeCloseTo(248, 0);
    expect(mainBefore?.x).toBeCloseTo(railBefore!.width, 0);
    await rail.hover();
    await page.waitForTimeout(220);
    const railAfter = await rail.boundingBox();
    const mainAfter = await main.boundingBox();
    expect(railAfter?.width).toBeCloseTo(railBefore!.width, 0);
    expect(mainAfter?.x).toBeCloseTo(mainBefore!.x, 0);
    expect(mainAfter?.width).toBeCloseTo(mainBefore!.width, 0);

    await page.getByTestId('role-rail-toggle').click();
    await expect(rail).toHaveAttribute('data-state', 'collapsed');
    const collapsed = await rail.boundingBox();
    expect(collapsed?.width).toBeCloseTo(76, 0);
    await rail.hover();
    await page.waitForTimeout(220);
    expect((await rail.boundingBox())?.width).toBeCloseTo(76, 0);
    await expect(rail.locator('.aiw-primary-nav__label').first()).toBeHidden();
    await page.getByTestId('role-rail-toggle').click();
    await expect(rail).toHaveAttribute('data-state', 'expanded');
    await page.screenshot({ path: `${evidenceDir}/navigation-desktop-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  }
  await noOverflow(page);

  // Use the rebuilt role navigation to enter the signature modelling surface.
  rail = await openNavigation(page, info.project.name);
  await rail.getByRole('button', { name: /^Logical Application$/i }).click();
  await expect(page.getByTestId('smart-arrange-canvas')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 20_000 });
  const before = await nodeTransforms(page);
  expect(before.length).toBeGreaterThan(2);

  const openArrange = async () => {
    await page.getByTestId('smart-arrange-canvas').click();
    await expect(page.locator('.stage-studio-arrange__menu')).toBeVisible();
  };
  await openArrange();
  await page.locator('[data-layout-mode="tree-vertical"]').click();
  await expect(page.locator('.canvas-layout-feedback')).toContainText(/tree vertical layout/i);
  await page.waitForTimeout(650);
  const tree = await nodeTransforms(page);
  expect(new Set(tree.map((item) => item.transform)).size).toBe(tree.length);
  await page.screenshot({ path: `${evidenceDir}/canvas-tree-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  await openArrange();
  await page.locator('[data-layout-mode="radial"]').click();
  await expect(page.locator('.canvas-layout-feedback')).toContainText(/radial layout/i);
  await page.waitForTimeout(650);
  const radial = await nodeTransforms(page);
  expect(radial).not.toEqual(tree);
  expect(new Set(radial.map((item) => item.transform)).size).toBe(radial.length);
  await page.screenshot({ path: `${evidenceDir}/canvas-radial-${info.project.name}.png`, fullPage: false, animations: 'disabled' });

  await openArrange();
  await page.getByRole('menuitem', { name: /Undo canvas arrangement/i }).click();
  await expect(page.locator('.canvas-layout-feedback')).toContainText(/Restored the previous canvas arrangement/i);
  await page.waitForTimeout(450);
  const restored = await nodeTransforms(page);
  expect(restored.map((item) => ({ id: item.id, transform: item.transform }))).toEqual(tree.map((item) => ({ id: item.id, transform: item.transform })));
  await noOverflow(page);

  // A Viewbook destination must open the Viewbook, not route back to the SDD workspace.
  rail = await openNavigation(page, info.project.name);
  await rail.getByRole('button', { name: /^Architecture Viewbook$/i }).click();
  await expect(page.getByTestId('architecture-viewbook')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('architecture-viewbook')).toContainText(/Interactive Architecture Viewbook/i);
  await page.screenshot({ path: `${evidenceDir}/viewbook-routing-${info.project.name}.png`, fullPage: false, animations: 'disabled' });
  await page.getByRole('button', { name: /Close Architecture Viewbook/i }).click();

  expect(meaningful(errors)).toEqual([]);
});
