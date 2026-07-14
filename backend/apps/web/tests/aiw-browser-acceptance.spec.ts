import { test, expect } from '@playwright/test';

const navLabels = [
  'Project Cockpit',
  'Guided Journey',
  'Design Brief',
  'Quality Drivers',
  'Logical Application',
  'Application Realization',
  'Logical Technology',
  'Physical Technology',
  'Review & Realize',
  'Pattern Explorer',
  'Architecture Synthesis',
  'Governance',
  'Collaboration',
  'Security',
  'Drift',
  'Continuous Conformance',
  'Operational Intelligence',
  'Enterprise Runtime',
  'Portfolio',
  'Comparison',
  'Pilot Evaluation',
  'Admin Control Plane',
  'Mind Factory',
  'Knowledge Governance',
  'Knowledge Sources',
  'LLM Routes',
  'GitHub Repos',
  'Workers',
  'Audit',
  'Tenant Settings',
  'Production Readiness',
];

test.describe('AIW rc.10.42 browser acceptance', () => {
  test('left navigation opens every major workspace without runtime console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (['error'].includes(message.type())) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    const enterButton = page.getByRole('button', { name: /enter|open|reference|start/i }).first();
    if (await enterButton.count()) await enterButton.click();
    await expect(page.locator('#aiw-main')).toBeVisible();

    for (const label of navLabels) {
      const button = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
      if (!(await button.count())) continue;
      await button.click();
      await expect(page.locator('#aiw-main')).toBeVisible();
      await expect(page.locator('body')).not.toContainText('Cannot read properties of undefined');
    }

    expect(errors.filter((entry) => !/React DevTools|vite/i.test(entry))).toEqual([]);
  });
});
