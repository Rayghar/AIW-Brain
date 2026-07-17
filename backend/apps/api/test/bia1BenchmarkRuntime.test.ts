import { describe, expect, it } from "vitest";
import { BIA1_SCENARIOS, bia1ArchitecturePackageSchema } from "../src/bia1Benchmark.js";
import { architectureGenerationRequest, buildAiwBrainContext, buildDeterministicArchitecturePackage, evaluateArchitecturePackage } from "../src/bia1BenchmarkRuntime.js";

describe("BIA-1 runtime isolation and deterministic baseline", () => {
  it("runs the actual AIW deterministic Brain without mutating approved state", async () => {
    const result = await buildAiwBrainContext(BIA1_SCENARIOS[0]!);
    expect(result.context.requirementsIntelligence.requirements.length).toBeGreaterThan(0);
    expect(result.context.approvedRecordsChanged).toBe(0);
    expect(result.context.designGraphMutations).toBe(0);
    expect(result.context.automaticPromotions).toBe(0);
    expect(result.contextCharacters).toBeLessThanOrEqual(120_000);
    expect(result.context.contextComposition.rawRuntimeStructuresTransferred).toBe(false);
    expect(result.context.requirementsIntelligence.scenarioRequirementTraceability.some((item) => item.id === "AB-FR-001")).toBe(true);
  });

  it("keeps the generic prompt free of AIW context and evaluator-only material", () => {
    const scenario = BIA1_SCENARIOS[0]!;
    const prompt = architectureGenerationRequest({ scenario, mode: "generic-gpt56-sol" });
    expect(prompt.user).not.toContain("AIW BRAIN CONTEXT");
    expect(prompt.user).not.toContain("Agency Banking Solution SDD");
    expect(prompt.user).not.toContain("requiredConcernTerms");
  });

  it("produces a schema-valid deterministic-only candidate and evaluates it", async () => {
    const scenario = BIA1_SCENARIOS[1]!;
    const context = await buildAiwBrainContext(scenario);
    const value = buildDeterministicArchitecturePackage(scenario, context);
    expect(bia1ArchitecturePackageSchema.parse(value).mode).toBe("aiw-deterministic-only");
    expect(evaluateArchitecturePackage(scenario, value).productionAccepted).toBe(false);
  });
});
