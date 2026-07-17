import { describe, expect, it } from "vitest";
import { BIA1_SCENARIOS, sha256 } from "../src/bia1Benchmark.js";
import { architectureGenerationRequest, buildAiwBrainContext, buildDeterministicArchitecturePackage, evaluateArchitecturePackage } from "../src/bia1BenchmarkRuntime.js";

describe("BIA-1 replay and isolation", () => {
  it("replays deterministic output and evaluation identically", async () => {
    const scenario = BIA1_SCENARIOS[3]!;
    const context = await buildAiwBrainContext(scenario);
    const first = buildDeterministicArchitecturePackage(scenario, context);
    const second = buildDeterministicArchitecturePackage(scenario, context);
    expect(sha256(first)).toBe(sha256(second));
    expect(sha256(evaluateArchitecturePackage(scenario, first))).toBe(sha256(evaluateArchitecturePackage(scenario, second)));
  });

  it("never exposes evaluator-only expectations or reference material to generation prompts", async () => {
    const scenario = BIA1_SCENARIOS[0]!;
    const context = await buildAiwBrainContext(scenario);
    for (const prompt of [
      architectureGenerationRequest({ scenario, mode: "generic-gpt56-sol" }),
      architectureGenerationRequest({ scenario, mode: "aiw-full-brain", aiwContext: context }),
    ]) {
      expect(prompt.user).not.toContain("Agency Banking Solution SDD");
      expect(prompt.user).not.toContain("requiredConcernTerms");
      expect(prompt.user).not.toContain("GOLD_EXPECTATION");
    }
  });
});
