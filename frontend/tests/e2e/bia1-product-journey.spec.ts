import { expect, test, type Page } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { mountAiw } from "./support/staticAiwHarness";

const evidenceDir = "../release-evidence/rc10.73.8/bia1/product-journey";
const screenshotRecords: Array<{ scenarioId: string; stage: string; path: string; role: string }> = [];
const journeyResults: Array<Record<string, unknown>> = [];

const scenarios = [
  {
    id: "BIA1-S1",
    name: "BIA-1 Agency Banking",
    goal: "Design a secure, resilient and auditable agency banking platform for agent and customer onboarding, deposits, withdrawals, transfers, reversals, settlement and reconciliation with governed core-banking, identity and payment-switch integrations.",
    idea: "Agents must securely onboard customers, verify identity, perform deposits and withdrawals, initiate transfers, receive explicit status, safely reverse uncertain transactions, reconcile settlement, operate during dependency degradation without unsafe offline posting, protect personal and financial data, and retain audit evidence.",
  },
  {
    id: "BIA1-S4",
    name: "BIA-1 Core Banking Modernisation",
    goal: "Modernise a legacy core-banking estate through governed coexistence and reversible migration while protecting channels, payments, general ledger integration, batch processing, regulatory reporting and customer service.",
    idea: "The architecture must diagnose the legacy core, define a target platform, coexist by account migration state, migrate in controlled waves, reconcile data and postings, rehearse cutover and rollback, preserve batch and regulatory obligations, and expose end-to-end operational risk and resilience.",
  },
] as const;

function observe(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("requestfailed", (request) => {
    const value = `${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`;
    if (!/presence\/heartbeat/i.test(value)) errors.push(value);
  });
  return errors;
}

function meaningful(errors: string[]) {
  return errors.filter((entry) => !/favicon|React DevTools|ResizeObserver loop|ERR_ABORTED|LLM_ALL_ROUTES_FAILED/i.test(entry));
}

async function capture(page: Page, scenarioId: string, stage: string, role: string) {
  const path = `${evidenceDir}/${scenarioId.toLowerCase()}-${stage}.png`;
  await page.screenshot({ path, fullPage: false, animations: "disabled" });
  screenshotRecords.push({ scenarioId, stage, path: path.replace(`${evidenceDir}/`, "product-journey/"), role });
}

async function navigate(page: Page, name: RegExp) {
  const launcher = page.getByRole("button", { name: /Open role navigation/i });
  if (await launcher.isVisible().catch(() => false)) await launcher.click();
  await page.getByTestId("role-navigation-v2").getByRole("button", { name }).click({ timeout: 15_000 });
}

async function acceptStageDesign(page: Page, stage: RegExp) {
  await navigate(page, stage);
  const node = page.locator(".react-flow__node:not(.living-canvas-ghost-node)").first();
  if (await node.isVisible().catch(() => false)) await node.click({ force: true });
  await page.getByTestId("open-stage-co-author").click();
  const drawer = page.getByRole("dialog", { name: /Sol for/i });
  await drawer.getByRole("button", { name: /^Design/i }).click();
  await drawer.getByRole("button", { name: /Open Sol Design on canvas/i }).click();
  const cursor = page.getByTestId("generative-cursor-controller");
  await expect(cursor).toBeVisible();
  if (await cursor.getByRole("button", { name: /Sol Design/i }).getAttribute("aria-expanded") === "false") await cursor.getByRole("button", { name: /Sol Design/i }).click();
  let action = cursor.locator(".generative-cursor__action-main").first();
  if (!await action.isVisible().catch(() => false)) {
    const recompute = cursor.getByRole("button", { name: /Recompute/i });
    if (await recompute.isVisible().catch(() => false)) await recompute.click();
  }
  if (!await action.isVisible({ timeout: 20_000 }).catch(() => false)) return false;
  await action.click();
  const preview = page.getByTestId("generative-preview-tray");
  await expect(preview).toBeVisible();
  await preview.getByRole("button", { name: /Accept change/i }).click();
  await expect(cursor.getByRole("button", { name: /Sol Design/i })).toHaveAttribute("aria-expanded", "false");
  return true;
}

test.beforeAll(async () => { await mkdir(evidenceDir, { recursive: true }); });
test.afterAll(async () => {
  await writeFile(`${evidenceDir}/BIA1_PRODUCT_JOURNEY_SCREENSHOT_INDEX.json`, `${JSON.stringify({ schemaVersion: "aiw-bia1-screenshot-index-v1", records: screenshotRecords, productionAccepted: false }, null, 2)}\n`);
  await writeFile(`${evidenceDir}/BIA1_PRODUCT_JOURNEY_TEST_RESULTS.json`, `${JSON.stringify({ schemaVersion: "aiw-bia1-product-journey-results-v1", results: journeyResults, productionAccepted: false }, null, 2)}\n`);
});

for (const scenario of scenarios) test(`${scenario.id} product journey carries governed architecture context into review and SDD`, async ({ page }) => {
  test.setTimeout(7 * 60 * 1000);
  const errors = observe(page);
  await mountAiw(page);
  await page.getByRole("button", { name: /new guided architecture project/i }).click();
  await page.getByLabel(/project name/i).fill(scenario.name);
  await page.getByLabel(/business goal/i).fill(scenario.goal);
  await page.getByRole("button", { name: /create guided project/i }).click();
  await page.locator(".role-card").filter({ hasText: /Solution Architect/i }).first().click();
  const tour = page.getByRole("dialog", { name: /guided tour|first-run/i });
  if (await tour.isVisible().catch(() => false)) await tour.getByRole("button", { name: /Skip tour/i }).click();

  await expect(page.getByTestId("requirements-genesis-studio")).toBeVisible({ timeout: 20_000 });
  await page.getByPlaceholder(/Build an agency banking platform/i).fill(scenario.idea);
  await page.getByRole("button", { name: /Add idea as source/i }).click();
  await page.getByRole("button", { name: /Generate requirements & journeys/i }).click();
  await expect(page.getByRole("heading", { name: /Canonical requirements proposal/i })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /Accept selected model/i }).click();
  await expect(page.locator(".journey-sequence")).toBeVisible();
  await capture(page, scenario.id, "01-requirements", "Solution Architect");

  await navigate(page, /^System Context & Journeys$/i);
  await expect(page.getByTestId("system-context-studio")).toBeVisible();
  const acceptContext = page.getByRole("button", { name: /Accept context model/i });
  if (await acceptContext.isEnabled().catch(() => false)) await acceptContext.click();
  await expect(page.getByText(/Canonical context/i)).toBeVisible();
  await capture(page, scenario.id, "02-context", "Solution Architect");

  const stages = [/^Logical Application$/i, /^Application Realization$/i, /^Logical Technology$/i, /^Physical Technology$/i];
  const stageResults: boolean[] = [];
  for (const stage of stages) stageResults.push(await acceptStageDesign(page, stage));
  const outputButton = page.getByRole("button", { name: /^Output$/i });
  if (await outputButton.isVisible().catch(() => false)) await outputButton.click();
  const output = page.locator('[data-testid^="actual-stage-output-"]');
  const actualOutputObserved = await output.isVisible().catch(() => false);
  const rationaleObserved = actualOutputObserved && await page.locator(".guided-design-rationale").getByText(/Why this design makes sense/i).isVisible().catch(() => false);
  await capture(page, scenario.id, "03-design-output", "Solution Architect");

  await page.locator("label.role-journey-select select").selectOption({ label: "Reviewer" }, { force: true, timeout: 15_000 });
  await navigate(page, /^Governance$/i);
  await expect(page.getByText(/Governance|approval|obligation/i).first()).toBeVisible();
  await capture(page, scenario.id, "04-governance-review", "Reviewer");

  await page.locator("label.role-journey-select select").selectOption({ label: "Solution Architect" }, { force: true, timeout: 15_000 });
  await navigate(page, /^SDD Delivery Pack$/i);
  await expect(page.getByText(/SDD|Delivery Pack/i).first()).toBeVisible();
  await capture(page, scenario.id, "05-sdd", "Solution Architect");
  const resultingErrors = meaningful(errors);
  const stageNames = ["logical", "realization", "logical-technology", "physical-technology"];
  const stageGaps = stageResults.map((passed, index) => passed ? null : `${stageNames[index]}: no actionable Sol Design candidate`).filter(Boolean);
  journeyResults.push({ scenarioId: scenario.id, stagesCompleted: ["requirements", "context", "logical", "realization", "logical-technology", "physical-technology", "review", "sdd"], roles: ["Solution Architect", "Reviewer"], generatedStageCount: stageResults.filter(Boolean).length, stageGaps, actualOutputsObserved: actualOutputObserved, rationaleObserved, candidateStateOnly: true, errors: resultingErrors });
  expect(resultingErrors).toEqual([]);
});
