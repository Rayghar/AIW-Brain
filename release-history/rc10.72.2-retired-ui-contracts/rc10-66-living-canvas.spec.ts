import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { mountAiw } from './support/staticAiwHarness';

const evidenceDir = 'release-evidence/rc10.66/screenshots';

function errors(page: Page) {
  const values: string[] = [];
  page.on('pageerror', (error) => values.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') values.push(message.text()); });
  page.on('requestfailed', (request) => values.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`));
  return values;
}

function meaningful(values: string[]) {
  return values.filter((value) => !/favicon|React DevTools|ResizeObserver loop|net::ERR_ABORTED|Failed to load resource.*404|telemetry/i.test(value));
}

async function createFreshGuidedProject(page: Page, suffix: string, prepareRealization = false) {
  const authResponse = await fetch('http://127.0.0.1:4100/api/auth/development-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-aiw-tenant-id': 'tenant-reference', 'x-aiw-user-id': 'user-owner' },
    body: JSON.stringify({
      subject: 'user-owner',
      email: 'architect@example.com',
      displayName: 'Architecture Owner',
      tenantId: 'tenant-reference',
      ttlMinutes: 120,
    }),
  });
  expect(authResponse.ok).toBeTruthy();
  const auth = await authResponse.json() as { token: string };
  const name = `Living Canvas ${suffix}-${Date.now()}`;
  const createResponse = await fetch('http://127.0.0.1:4100/api/projects', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${auth.token}`,
      'x-aiw-tenant-id': 'tenant-reference',
      'x-aiw-user-id': 'user-owner',
    },
    body: JSON.stringify({
      name,
      template: 'microservice',
      description: 'Customers need a secure, resilient order-to-payment journey with clear API ownership, auditability and external channel integration.',
    }),
  });
  expect(createResponse.ok).toBeTruthy();
  let project = await createResponse.json() as { id: string; tenantId: string; revision: number; branch: { id: string } };
  if (prepareRealization) {
    for (let index = 0; index < 2; index += 1) {
      const event = {
        id: `e2e-gesture-${index}-${Date.now()}`,
        kind: 'candidate-requested',
        occurredAt: new Date().toISOString(),
        tenantId: project.tenantId,
        projectId: project.id,
        branchId: project.branch.id,
        revision: project.revision,
        actorId: 'user-owner',
        actorRole: 'solution-architect',
        stage: 'qualityDrivers',
        targetStage: 'logicalApplication',
        decompositionLevel: 'system',
        autonomyMode: 'guide',
      };
      const actionsResponse = await fetch(`http://127.0.0.1:4100/api/projects/${project.id}/branches/${project.branch.id}/living-canvas/actions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${auth.token}`,
          'x-aiw-tenant-id': 'tenant-reference',
          'x-aiw-user-id': 'user-owner',
        },
        body: JSON.stringify({ event, outcomeHistory: [] }),
      });
      expect(actionsResponse.ok).toBeTruthy();
      const envelope = await actionsResponse.json() as { actions: Array<Record<string, unknown>> };
      expect(envelope.actions.length).toBeGreaterThan(0);
      const applyResponse = await fetch(`http://127.0.0.1:4100/api/projects/${project.id}/branches/${project.branch.id}/living-canvas/apply`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${auth.token}`,
          'x-aiw-tenant-id': 'tenant-reference',
          'x-aiw-user-id': 'user-owner',
          'idempotency-key': `e2e-living-canvas-${project.id}-${project.revision}-${index}`,
        },
        body: JSON.stringify({ action: envelope.actions[0], expectedRevision: project.revision, rationale: 'Prepare realization browser journey' }),
      });
      expect(applyResponse.ok).toBeTruthy();
      const applied = await applyResponse.json() as { project: typeof project };
      project = applied.project;
    }
  }
  await mountAiw(page, {
    initialStorage: {
      'aiw-access-token': auth.token,
      'aiw-tenant-id': 'tenant-reference',
      'aiw-user-id': 'user-owner',
    },
  });
  await page.locator('.project-card').filter({ hasText: name }).click();
  const roleCard = page.locator('.role-card').filter({ hasText: /Solution Architect/i }).first();
  await roleCard.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => undefined);
  if (await roleCard.isVisible().catch(() => false)) await roleCard.click();
  const logicalNav = page.getByRole('button', { name: 'Logical Application', exact: true });
  await logicalNav.waitFor({ state: 'visible', timeout: 12_000 });
  const tour = page.getByRole('dialog', { name: /AIW anchored first-run guided tour/i });
  await tour.waitFor({ state: 'visible', timeout: 1_500 }).catch(() => undefined);
  if (await tour.isVisible().catch(() => false)) await tour.getByRole('button', { name: /Skip tour/i }).click();
  await page.waitForTimeout(150);
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });

test('Living Canvas previews and applies deterministic logical-stage actions', async ({ page }, info) => {
  const observed = errors(page);
  await createFreshGuidedProject(page, `logical-${info.project.name}`);
  await page.getByRole('button', { name: 'Logical Application', exact: true }).click();
  const cursor = page.getByTestId('generative-cursor-controller');
  await expect(cursor).toBeVisible();
  await expect(cursor.getByText('Living Canvas', { exact: true })).toBeVisible();
  await expect(cursor.getByText(/next action/i)).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/living-canvas-logical-${info.project.name}.png`, fullPage: false });

  const firstAction = cursor.locator('.generative-cursor__action-main').first();
  await expect(firstAction).toBeVisible();
  await firstAction.click();
  const preview = page.getByTestId('generative-preview-tray');
  await expect(preview).toBeVisible();
  await expect(preview.getByText(/preview before mutation/i)).toBeVisible();
  await expect(page.locator('.architecture-node.is-living-canvas-ghost').first()).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/living-canvas-preview-${info.project.name}.png`, fullPage: false });

  await preview.getByRole('button', { name: /Accept change/i }).click();
  await expect(page.getByTestId('generative-preview-tray')).toBeHidden();
  await expect(cursor.getByRole('button', { name: /Roll back last/i })).toBeEnabled();
  await page.screenshot({ path: `${evidenceDir}/living-canvas-applied-${info.project.name}.png`, fullPage: false });
  expect(meaningful(observed)).toEqual([]);
});

test('Living Canvas supports focus, modes, keyboard refresh and app-realization guidance', async ({ page }, info) => {
  const observed = errors(page);
  await createFreshGuidedProject(page, `realization-${info.project.name}`, true);
  const cockpitStage = page.locator('.cockpit-lifecycle-card button').filter({ hasText: 'Application Realization' }).first();
  if (await cockpitStage.isVisible().catch(() => false)) {
    await cockpitStage.click();
  } else {
    await page.getByRole('button', { name: 'Application Realization', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Application Realization', exact: true })).toBeVisible();
  const cursor = page.getByTestId('generative-cursor-controller');
  await expect(cursor).toBeVisible();
  await cursor.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(cursor.getByRole('button', { name: 'Compose', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await cursor.getByRole('button', { name: /Next unresolved scope/i }).click();
  await page.keyboard.press('Control+Space');
  await expect(cursor.locator('.generative-cursor__action-main').first()).toBeVisible();
  await page.screenshot({ path: `${evidenceDir}/living-canvas-realization-${info.project.name}.png`, fullPage: false });
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth));
  expect(overflow).toBeLessThanOrEqual(1);
  expect(meaningful(observed)).toEqual([]);
});
