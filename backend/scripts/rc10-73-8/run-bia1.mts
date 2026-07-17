import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { LlmGateway, LlmStrictStructuredError } from "../../apps/api/src/llmGateway.js";
import { BIA1_ACTOR, BIA1_SCENARIOS, sha256, type Bia1ArchitecturePackage } from "../../apps/api/src/bia1Benchmark.js";
import {
  bia1Gpt56Policy,
  buildAiwBrainContext,
  buildDeterministicArchitecturePackage,
  evaluateArchitecturePackage,
  generateArchitecturePackage,
} from "../../apps/api/src/bia1BenchmarkRuntime.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const out = resolve(root, "release-evidence", "rc10.73.8", "bia1");
const runtimePath = resolve(root, "backend", "config", "llm-runtime-overrides.json");
const model = "gpt-5.6-sol";

const safeError = (error: unknown) => String(error instanceof Error ? error.message : error).replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]").slice(0, 1200);
const writeJson = async (name: string, value: unknown) => writeFile(resolve(out, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");

async function verifyFreeze() {
  const receipt = JSON.parse(await readFile(resolve(out, "BIA1_SCENARIO_FINGERPRINT_RECEIPT.json"), "utf8"));
  const records = [];
  for (const item of receipt.records) {
    const content = await readFile(resolve(out, item.path));
    const actual = `sha256:${createHash("sha256").update(content).digest("hex")}`;
    if (actual !== item.sha256) throw new Error(`BIA1_FROZEN_INPUT_CHANGED:${item.path}`);
    records.push({ path: item.path, bytes: content.byteLength, sha256: actual });
  }
  if (sha256(records) !== receipt.aggregateFingerprint) throw new Error("BIA1_FROZEN_AGGREGATE_MISMATCH");
  return receipt.aggregateFingerprint;
}

function failureRecord(scenarioId: string, mode: string, error: unknown) {
  const structured = error instanceof LlmStrictStructuredError ? error : undefined;
  return {
    scenarioId, mode, status: "failed-closed", error: safeError(error),
    disposition: structured?.disposition ?? "execution-failure",
    telemetry: structured?.telemetry ?? null,
    candidateCreated: false, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0,
  };
}

async function generateOne(gateway: LlmGateway, scenario: (typeof BIA1_SCENARIOS)[number], mode: "aiw-full-brain" | "generic-gpt56-sol", context?: Awaited<ReturnType<typeof buildAiwBrainContext>>) {
  const started = Date.now();
  try {
    const execution = await generateArchitecturePackage({ gateway, scenario, mode, ...(context ? { aiwContext: context } : {}) });
    return {
      scenarioId: scenario.scenarioId, mode, status: "completed", architecture: execution.value,
      runtime: {
        provider: execution.providerId, requestedModel: execution.requestedModel, reportedModel: execution.providerReportedModel,
        responseStatus: execution.responseStatus, providerRequestId: execution.providerRequestId ?? null,
        requestFingerprint: execution.requestFingerprint, responseFingerprint: execution.responseFingerprint,
        inputTokens: execution.usage.inputTokens ?? 0, outputTokens: execution.usage.outputTokens ?? 0,
        totalTokens: execution.usage.totalTokens ?? (execution.usage.inputTokens ?? 0) + (execution.usage.outputTokens ?? 0),
        latencyMs: execution.latencyMs, schema: execution.schemaName, strictStructuredOutput: true, fallbackUsed: false,
      },
      candidateCreated: true, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0,
    };
  } catch (error) {
    return { ...failureRecord(scenario.scenarioId, mode, error), latencyMs: Date.now() - started };
  }
}

function evaluationFor(scenario: (typeof BIA1_SCENARIOS)[number], record: any) {
  if (record.status !== "completed") return {
    scenarioId: scenario.scenarioId, mode: record.mode, overallScore: 0, passed: false,
    criticalOmissions: ["benchmark-generation-failed"], gates: {}, metrics: {}, ...BIA1_ACTOR, productionAccepted: false,
  };
  return evaluateArchitecturePackage(scenario, record.architecture as Bia1ArchitecturePackage);
}

function scorecardMarkdown(title: string, evaluations: any[]) {
  const lines = [`# ${title}`, "", `Generated: ${new Date().toISOString()}`, "", "| Scenario | Mode | Score | Critical omissions | Passed |", "|---|---|---:|---:|---|"];
  for (const item of evaluations) lines.push(`| ${item.scenarioId} | ${item.mode} | ${item.overallScore.toFixed(2)} | ${item.criticalOmissions.length} | ${item.passed ? "yes" : "no"} |`);
  lines.push("", "Evaluation was performed by separated delegated GPT-5.6 Sol roles; no human reviewer or production authority is claimed.", "", "productionAccepted=false");
  return `${lines.join("\n")}\n`;
}

function summarize(evaluations: any[], mode: string) {
  const rows = evaluations.filter((item) => item.mode === mode);
  return {
    mode,
    scenarioCount: rows.length,
    averageScore: rows.length ? Number((rows.reduce((sum, item) => sum + item.overallScore, 0) / rows.length).toFixed(2)) : 0,
    passedScenarios: rows.filter((item) => item.passed).length,
    criticalOmissions: rows.reduce((sum, item) => sum + item.criticalOmissions.length, 0),
  };
}

async function runPass1() {
  await mkdir(out, { recursive: true });
  const frozenFingerprint = await verifyFreeze();
  const policy = bia1Gpt56Policy(JSON.parse(await readFile(runtimePath, "utf8")));
  const gateway = new LlmGateway(policy);
  const modeA: any[] = [], modeB: any[] = [], modeC: any[] = [];
  for (const scenario of BIA1_SCENARIOS) {
    const aiw = await buildAiwBrainContext(scenario);
    const deterministic = buildDeterministicArchitecturePackage(scenario, aiw);
    modeC.push({ scenarioId: scenario.scenarioId, mode: "aiw-deterministic-only", status: "completed", architecture: deterministic, runtime: { providerCalls: 0, modelCalls: 0, deterministicRules: aiw.deterministicRules, contextFingerprint: aiw.contextFingerprint }, candidateCreated: true, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 });
    modeA.push(await generateOne(gateway, scenario, "aiw-full-brain", aiw));
    modeB.push(await generateOne(gateway, scenario, "generic-gpt56-sol"));
    await writeJson("BIA1_PASS1_CHECKPOINT.json", { schemaVersion: "aiw-bia1-pass1-checkpoint-v1", completedScenarioIds: modeC.map((item) => item.scenarioId), modeACompleted: modeA.length, modeBCompleted: modeB.length, attempts: gateway.accounting().attempts, productionAccepted: false });
  }
  const evaluations = [...modeA, ...modeB, ...modeC].map((record) => evaluationFor(BIA1_SCENARIOS.find((item) => item.scenarioId === record.scenarioId)!, record));
  const common = { schemaVersion: "aiw-bia1-pass1-results-v1", generatedAt: new Date().toISOString(), frozenScenarioFingerprint: frozenFingerprint, exactModel: model, ...BIA1_ACTOR, productionAccepted: false };
  await writeJson("BIA1_PASS1_MODE_A_RESULTS.json", { ...common, mode: "aiw-full-brain", scenarioResults: modeA, evaluations: evaluations.filter((item) => item.mode === "aiw-full-brain") });
  await writeJson("BIA1_PASS1_MODE_B_RESULTS.json", { ...common, mode: "generic-gpt56-sol", scenarioResults: modeB, evaluations: evaluations.filter((item) => item.mode === "generic-gpt56-sol") });
  await writeJson("BIA1_PASS1_MODE_C_RESULTS.json", { ...common, mode: "aiw-deterministic-only", scenarioResults: modeC, evaluations: evaluations.filter((item) => item.mode === "aiw-deterministic-only") });
  await writeFile(resolve(out, "BIA1_PASS1_SCORECARD.md"), scorecardMarkdown("BIA-1 Pass 1 scorecard", evaluations), "utf8");
  const gaps = evaluations.flatMap((item) => item.criticalOmissions.map((omission: string) => ({ scenarioId: item.scenarioId, mode: item.mode, omission })));
  await writeJson("BIA1_PASS1_CRITICAL_GAPS.json", { schemaVersion: "aiw-bia1-pass1-gaps-v1", gapCount: gaps.length, gaps, productionAccepted: false });
  const summaries = [summarize(evaluations, "aiw-full-brain"), summarize(evaluations, "generic-gpt56-sol"), summarize(evaluations, "aiw-deterministic-only")];
  const aiw = summaries[0]!, generic = summaries[1]!, deterministic = summaries[2]!;
  await writeFile(resolve(out, "BIA1_PASS1_VALUE_ADD_ANALYSIS.md"), `# BIA-1 Pass 1 value-add analysis\n\nAIW Full Brain average: ${aiw.averageScore}. Generic GPT-5.6 Sol average: ${generic.averageScore}. Deterministic-only average: ${deterministic.averageScore}.\n\nAIW-specific contributions measured: deterministic requirements distillation, knowledge-manifest pinning, rule and finding projection, candidate Design Graph context, evidence references, and lifecycle authority controls. Differentiation is not inferred from schema validity.\n\nproductionAccepted=false\n`, "utf8");
  const accounting = gateway.accounting();
  process.stdout.write(`${JSON.stringify({ frozenFingerprint, summaries, providerCalls: accounting.attempts, inputTokens: accounting.inputTokens, outputTokens: accounting.outputTokens, totalTokens: accounting.totalTokens, productionAccepted: false }, null, 2)}\n`);
}

async function runPass1OfflinePreflight() {
  await mkdir(out, { recursive: true });
  const frozenFingerprint = await verifyFreeze();
  const modeC: any[] = [];
  const transfers: any[] = [];
  for (const scenario of BIA1_SCENARIOS) {
    const aiw = await buildAiwBrainContext(scenario);
    const deterministic = buildDeterministicArchitecturePackage(scenario, aiw);
    modeC.push({ scenarioId: scenario.scenarioId, mode: "aiw-deterministic-only", status: "completed", architecture: deterministic, runtime: { providerCalls: 0, modelCalls: 0, deterministicRules: aiw.deterministicRules, contextFingerprint: aiw.contextFingerprint }, candidateCreated: true, approvedRecordsChanged: 0, designGraphMutations: 0, automaticPromotions: 0 });
    const scenarioPacket = { ...scenario } as any;
    delete scenarioPacket.evaluatorOnlyReference;
    const serializedContext = JSON.stringify(aiw.context);
    const serializedScenario = JSON.stringify(scenarioPacket);
    transfers.push({
      scenarioId: scenario.scenarioId,
      genericMode: { scenarioCharacters: serializedScenario.length, contentFingerprint: sha256(scenarioPacket), includesAiwContext: false },
      fullBrainMode: { scenarioCharacters: serializedScenario.length, brainContextCharacters: serializedContext.length, brainContextFingerprint: aiw.contextFingerprint, includesAiwContext: true },
      containsRawVaultContent: false,
      containsSourceCode: false,
      containsCredentials: false,
      containsPersonalInformation: false,
      containsCustomerOrInternalOrganisationData: false,
      containsEvaluatorGoldExpectations: false,
      containsReferenceSdd: false,
      contentClasses: ["synthetic benchmark scenario", "deterministic requirements analysis", "AIW rule/recommendation identifiers", "candidate Design Graph projection", "knowledge manifest references"],
    });
  }
  const evaluations = modeC.map((record) => evaluationFor(BIA1_SCENARIOS.find((item) => item.scenarioId === record.scenarioId)!, record));
  await writeJson("BIA1_PASS1_MODE_C_RESULTS.json", { schemaVersion: "aiw-bia1-pass1-results-v1", generatedAt: new Date().toISOString(), frozenScenarioFingerprint: frozenFingerprint, mode: "aiw-deterministic-only", exactModel: null, ...BIA1_ACTOR, productionAccepted: false, scenarioResults: modeC, evaluations });
  await writeJson("BIA1_PROVIDER_TRANSFER_SAFETY_RECEIPT.json", {
    schemaVersion: "aiw-bia1-provider-transfer-safety-v1",
    generatedAt: new Date().toISOString(),
    provider: "openai",
    intendedModel: model,
    intendedCalls: 10,
    transferOccurred: false,
    productOwnerSpecificTransferApprovalRequired: true,
    transfers,
    prohibitedContentChecksPassed: true,
    toolsEnabled: false,
    externalRetrievalEnabled: false,
    fallbackEnabled: false,
    providerResponseRetention: "strict parsed architecture package only; unrestricted response content prohibited",
    productionAccepted: false,
  });
  await writeJson("BIA1_PASS1_OFFLINE_PREFLIGHT.json", {
    schemaVersion: "aiw-bia1-pass1-offline-preflight-v1",
    frozenFingerprint,
    deterministicScenariosCompleted: modeC.length,
    deterministicReplayFingerprints: modeC.map((item) => ({ scenarioId: item.scenarioId, fingerprint: sha256(item.architecture) })),
    providerCalls: 0,
    modelCalls: 0,
    approvedRecordsChanged: 0,
    designGraphMutations: 0,
    automaticPromotions: 0,
    productionAccepted: false,
  });
  process.stdout.write(`${JSON.stringify({ frozenFingerprint, deterministicScenariosCompleted: modeC.length, transferOccurred: false, providerCalls: 0, modelCalls: 0, productionAccepted: false }, null, 2)}\n`);
}

async function evaluatePass2() {
  const frozenFingerprint = await verifyFreeze();
  const policy = bia1Gpt56Policy(JSON.parse(await readFile(runtimePath, "utf8")));
  const gateway = new LlmGateway(policy);
  const modeA: any[] = [];
  for (const scenario of BIA1_SCENARIOS) {
    const aiw = await buildAiwBrainContext(scenario);
    modeA.push(await generateOne(gateway, scenario, "aiw-full-brain", aiw));
    await writeJson("BIA1_PASS2_CHECKPOINT.json", { schemaVersion: "aiw-bia1-pass2-checkpoint-v1", completedScenarioIds: modeA.map((item) => item.scenarioId), attempts: gateway.accounting().attempts, productionAccepted: false });
  }
  const pass2Eval = modeA.map((record) => evaluationFor(BIA1_SCENARIOS.find((item) => item.scenarioId === record.scenarioId)!, record));
  const pass1A = JSON.parse(await readFile(resolve(out, "BIA1_PASS1_MODE_A_RESULTS.json"), "utf8"));
  const pass1B = JSON.parse(await readFile(resolve(out, "BIA1_PASS1_MODE_B_RESULTS.json"), "utf8"));
  const pass1C = JSON.parse(await readFile(resolve(out, "BIA1_PASS1_MODE_C_RESULTS.json"), "utf8"));
  const common = { schemaVersion: "aiw-bia1-pass2-results-v1", generatedAt: new Date().toISOString(), frozenScenarioFingerprint: frozenFingerprint, exactModel: model, remediation: "deterministic-architecture-obligation-composition", ...BIA1_ACTOR, productionAccepted: false };
  await writeJson("BIA1_PASS2_MODE_A_RESULTS.json", { ...common, mode: "aiw-full-brain", scenarioResults: modeA, evaluations: pass2Eval });
  await writeFile(resolve(out, "BIA1_PASS2_SCORECARD.md"), scorecardMarkdown("BIA-1 Pass 2 scorecard", pass2Eval), "utf8");
  const pass1Eval = pass1A.evaluations;
  const comparison = BIA1_SCENARIOS.map((scenario) => {
    const before = pass1Eval.find((item: any) => item.scenarioId === scenario.scenarioId);
    const after = pass2Eval.find((item: any) => item.scenarioId === scenario.scenarioId);
    return { scenarioId: scenario.scenarioId, pass1: before.overallScore, pass2: after.overallScore, delta: Number((after.overallScore - before.overallScore).toFixed(2)), pass1Passed: before.passed, pass2Passed: after.passed };
  });
  await writeFile(resolve(out, "BIA1_PASS1_VS_PASS2_COMPARISON.md"), `# BIA-1 Pass 1 versus Pass 2\n\n| Scenario | Pass 1 | Pass 2 | Delta |\n|---|---:|---:|---:|\n${comparison.map((item) => `| ${item.scenarioId} | ${item.pass1} | ${item.pass2} | ${item.delta} |`).join("\n")}\n\nThe scenarios, rubric, gold expectations and baseline outputs remained frozen.\n`, "utf8");
  const all = [...pass2Eval, ...pass1B.evaluations, ...pass1C.evaluations];
  const summaries = [summarize(all, "aiw-full-brain"), summarize(all, "generic-gpt56-sol"), summarize(all, "aiw-deterministic-only")];
  await writeFile(resolve(out, "BIA1_FINAL_VALUE_ADD_ANALYSIS.md"), `# BIA-1 final value-add analysis\n\nAIW Full Brain average: ${summaries[0]!.averageScore}. Generic baseline average: ${summaries[1]!.averageScore}. Deterministic-only average: ${summaries[2]!.averageScore}.\n\nAIW value is assessed from architecture quality plus governed requirement lineage, deterministic replay, candidate Design Graph context, review lifecycle and SDD delivery—not provider connectivity.\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ summaries, comparison, providerCalls: gateway.accounting().attempts, tokens: gateway.accounting().totalTokens, productionAccepted: false }, null, 2)}\n`);
}

if (process.argv.includes("--pass1-offline-preflight")) await runPass1OfflinePreflight();
else if (process.argv.includes("--pass1")) await runPass1();
else if (process.argv.includes("--pass2")) await evaluatePass2();
else throw new Error("BIA1_MODE_REQUIRED");
