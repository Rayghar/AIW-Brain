import { describe, expect, it } from "vitest";
import {
  BIA1_CRITICAL_OMISSIONS,
  BIA1_GOLD_EXPECTATIONS,
  BIA1_RUBRIC,
  BIA1_SCENARIOS,
  bia1ArchitecturePackageSchema,
  sha256,
} from "../src/bia1Benchmark.js";

describe("BIA-1 frozen benchmark contract", () => {
  it("defines five stable scenarios with unique, traceable requirements", () => {
    expect(BIA1_SCENARIOS).toHaveLength(5);
    expect(new Set(BIA1_SCENARIOS.map((item) => item.scenarioId)).size).toBe(5);
    for (const scenario of BIA1_SCENARIOS) {
      expect(scenario.productionAccepted).toBe(false);
      expect(scenario.requirements.length).toBeGreaterThanOrEqual(10);
      expect(new Set(scenario.requirements.map((item) => item.id)).size).toBe(scenario.requirements.length);
      expect(scenario.requirements.some((item) => item.critical)).toBe(true);
    }
  });

  it("freezes a 100 point concern-based rubric and evaluator-only expectations", () => {
    expect(BIA1_RUBRIC.categories.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    expect(BIA1_CRITICAL_OMISSIONS).toContain("direct-approved-state-mutation");
    expect(BIA1_GOLD_EXPECTATIONS).toHaveLength(5);
    expect(BIA1_GOLD_EXPECTATIONS.every((item) => item.generationAccessProhibited)).toBe(true);
  });

  it("requires candidate authority and prohibits benchmark mutation of approved state", () => {
    const result = bia1ArchitecturePackageSchema.safeParse({ scenarioId: "BIA1-S1", mode: "aiw-full-brain", authority: "approved", productionAccepted: true });
    expect(result.success).toBe(false);
  });

  it("fingerprints canonically", () => {
    expect(sha256({ b: 2, a: 1 })).toBe(sha256({ a: 1, b: 2 }));
  });
});
