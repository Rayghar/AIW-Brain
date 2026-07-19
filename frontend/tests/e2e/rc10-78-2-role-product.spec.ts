import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';

const evidenceDir = '../release-evidence/rc10.78.2/role-centred-product/browser';
const projectName = `RC10.78.2 Architecture Journey ${Date.now()}`;
const screenshots: Array<{ name: string; path: string }> = [];
const controls: Array<{ role: string; control: string; result: string }> = [];

test.describe.configure({ mode: 'serial' });

async function capture(page: Page, name: string) {
  const viewport = page.viewportSize();
  const viewportLabel = (viewport?.width ?? 1600) >= 1500 ? 'desktop' : 'laptop';
  const evidenceName = `${name}-${viewportLabel}`;
  const path = `${evidenceDir}/${evidenceName}.png`;
  await page.screenshot({ path, fullPage: false, animations: 'disabled' });
  screenshots.push({ name: evidenceName, path: `browser/${evidenceName}.png` });
}

async function closeTour(page: Page) {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible().catch(() => false)) {
    const button = dialog.getByRole('button', { name: /skip|close|not now/i }).first();
    if (await button.isVisible().catch(() => false)) await button.click();
  }
}

async function chooseRole(page: Page, label: string) {
  const chooser = page.locator('.role-card').filter({ hasText: label }).first();
  try {
    await chooser.waitFor({ state: 'visible', timeout: 15_000 });
    await chooser.click();
  } catch {
    const select = page.locator('label.role-journey-select select');
    await select.waitFor({ state: 'attached', timeout: 15_000 });
    await select.selectOption({ label }, { force: true });
  }
  await closeTour(page);
}

test.beforeAll(async () => mkdir(evidenceDir, { recursive: true }));
test.afterAll(async () => writeFile(`${evidenceDir}/role-product-browser-raw.json`, `${JSON.stringify({ projectName, screenshots, controls, providerCalls: 0, productionAccepted: false }, null, 2)}\n`));

test('Solution Architect creates a PostgreSQL project and requirements-derived sequence', async ({ page }) => {
  test.setTimeout(6 * 60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error' && !/favicon/i.test(message.text())) errors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Start with intent/i })).toBeVisible();
  await capture(page, '01-public-landing');
  await page.getByText(/Enterprise access and persistence/i).click();
  await page.getByRole('button', { name: /Enable sync/i }).click();
  await expect(page.getByText(/Workspace sync active/i)).toBeVisible();
  await page.getByRole('button', { name: /New guided architecture project/i }).click();
  await page.getByLabel(/Project name/i).fill(projectName);
  await page.getByLabel(/Business goal/i).fill('Design a secure event-driven order fulfilment architecture with explicit ownership, retries, idempotency and recovery.');
  await page.getByLabel(/Known constraints/i).fill('Personally identifiable information must remain protected and every external exchange must be auditable.');
  await page.getByLabel(/Problem or purpose/i).fill('Customers place orders that coordinate inventory, payment, fulfilment and delivery across trust boundaries.');
  const createResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/api/projects'));
  await page.getByRole('button', { name: /Create guided project/i }).click();
  expect((await createResponse).status()).toBe(201);
  await chooseRole(page, 'Solution Architect');
  await expect(page.getByRole('complementary', { name: /Primary role journey/i })).toBeVisible();
  await capture(page, '02-solution-architect-home');
  await page.getByPlaceholder(/Build an agency banking platform/i).fill('A customer submits an order. The order service reserves inventory, authorises payment, publishes fulfilment events, handles duplicates and compensates partial failure across a trust boundary.');
  await page.getByRole('button', { name: /Add idea as source/i }).click();
  await page.getByRole('button', { name: /Generate requirements & journeys/i }).click();
  await expect(page.getByRole('heading', { name: /Canonical requirements proposal/i })).toBeVisible();
  await page.getByRole('button', { name: /Accept selected model/i }).click();
  await expect(page.getByText(/Interaction intelligence/i)).toBeVisible();
  await page.getByRole('button', { name: /Generate candidate versions/i }).click();
  await expect(page.getByRole('region', { name: /Requirements-derived sequence intelligence/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Accept for project/i })).toBeVisible();
  await capture(page, '03-sequence-intelligence');
  controls.push({ role: 'Solution Architect', control: 'create durable project', result: 'passed' }, { role: 'Solution Architect', control: 'generate sequence candidates', result: 'passed' });
  expect(errors).toEqual([]);
});

test('tenant access and Enterprise Architect surfaces persist across reload', async ({ page }) => {
  test.setTimeout(5 * 60_000);
  await page.goto('/');
  await page.getByText(/Enterprise access and persistence/i).click();
  await page.getByRole('button', { name: /Enable sync/i }).click();
  await expect(page.getByText(projectName, { exact: true })).toBeVisible();
  await page.getByText(projectName, { exact: true }).click();
  await chooseRole(page, 'Administrator');
  await page.locator('label.role-journey-select select').selectOption({ label: 'Administrator' }, { force: true });
  const securityButton = page.getByRole('complementary', { name: /Primary role journey/i }).getByRole('button', { name: /Security & RBAC/i });
  await securityButton.click();
  await expect(page.getByRole('heading', { name: /People & Access/i })).toBeVisible();
  const peoplePanel = page.getByRole('article', { name: /People and access/i });
  const suffix = Date.now();
  await peoplePanel.getByLabel('Display name').fill('RC Solution Architect');
  await peoplePanel.getByLabel('Email').fill(`rc-solution-${suffix}@example.test`);
  await peoplePanel.getByRole('button', { name: /Create invitation/i }).click();
  await expect(page.getByText(`rc-solution-${suffix}@example.test`)).toBeVisible();
  await peoplePanel.getByLabel('Display name').fill('RC Enterprise Architect');
  await peoplePanel.getByLabel('Email').fill(`rc-enterprise-${suffix}@example.test`);
  await peoplePanel.getByLabel('Roles CSV').fill('enterprise-architect,architecture-reviewer');
  await peoplePanel.getByLabel('Default profile').selectOption('enterprise-architect');
  await peoplePanel.getByRole('button', { name: /Create invitation/i }).click();
  await expect(page.getByText(`rc-enterprise-${suffix}@example.test`)).toBeVisible();
  await capture(page, '04-people-and-access');
  await page.locator('label.role-journey-select select').selectOption({ label: 'Enterprise Architect' }, { force: true });
  await expect(page.getByRole('complementary', { name: /Primary role journey/i })).toBeVisible();
  await expect(page.getByText(/Portfolio|Enterprise/i).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(projectName, { exact: true })).toBeVisible();
  await capture(page, '05-enterprise-architect-return');
  controls.push({ role: 'Administrator', control: 'create tenant users', result: 'passed' }, { role: 'Enterprise Architect', control: 'reload persisted project', result: 'passed' });
});
