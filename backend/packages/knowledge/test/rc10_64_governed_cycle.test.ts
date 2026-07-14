import { describe, expect, it } from "vitest";
import type { KnowledgeLibrary } from "@aiw/domain";
import {
  KnowledgeCycleGovernanceError,
  runGovernedKnowledgeCycle,
} from "../src/governedKnowledgeCycle.js";

function referenceLibrary(): KnowledgeLibrary {
  return {
    knowledgeReleaseId: "AKR-0.10.60",
    libraryId: "rc10-64-reference",
    version: "0.10.60",
    status: "released",
    generatedAt: "2026-07-11T20:00:00.000Z",
    disclaimer: "Governed reference fixture",
    qualityAttributes: [],
    viewpoints: [],
    evidence: [],
    rulePacks: [],
    architectureStyles: [],
    patterns: [{
      id: "PAT-OUTBOX",
      name: "Transactional Outbox",
      recordType: "pattern",
      category: "integration",
      status: "approved",
      applicableStages: ["applicationRealization", "logicalTechnology"],
      pairsWellWith: [],
      conflictsWith: [],
      obligations: ["Define outbox retention"],
      requires: [],
      qualityAttributeImpact: { reliability: 4 },
      risks: ["Duplicate delivery"],
      mitigations: ["Idempotent consumers"],
      evidence: [],
      owner: "AIW Knowledge Council",
      version: "2.0.0",
      calibrationNote: "Approved reference fixture",
    }],
  };
}

function changedLibrary(): KnowledgeLibrary {
  const proposed = structuredClone(referenceLibrary());
  proposed.knowledgeReleaseId = "AKR-0.10.64-CANDIDATE";
  proposed.patterns[0] = {
    ...proposed.patterns[0]!,
    obligations: [
      ...proposed.patterns[0]!.obligations,
      "Record independent replay and duplicate-delivery acceptance evidence",
    ],
  };
  return proposed;
}

describe("rc.10.65 governed knowledge cycle", () => {
  it("enforces candidate isolation, four-eyes review, promotion and tenant pinning", () => {
    const result = runGovernedKnowledgeCycle({
      currentLibrary: referenceLibrary(),
      proposedLibrary: changedLibrary(),
      actors: {
        extractor: "knowledge-extractor",
        reviewer: "architecture-reviewer",
        promoter: "knowledge-release-manager",
      },
      releaseId: "AKR-0.10.64-REFERENCE",
      tenantId: "tenant-reference",
      now: new Date("2026-07-11T22:00:00.000Z"),
    });

    expect(result.candidate.status).toBe("released");
    expect(result.manifest.releaseId).toBe("AKR-0.10.64-REFERENCE");
    expect(result.manifest.provenance.candidateKnowledgeInfluence).toBe("blocked-until-promotion");
    expect(result.pin.releaseId).toBe("AKR-0.10.64-REFERENCE");
    expect(new Set(result.receipts.map((receipt) => receipt.actor)).size).toBe(3);
    expect(result.receipts.map((receipt) => receipt.step)).toEqual([
      "extract",
      "validate",
      "approve",
      "promote",
      "pin",
    ]);
  });

  it("blocks actor reuse across governed duties", () => {
    expect(() => runGovernedKnowledgeCycle({
      currentLibrary: referenceLibrary(),
      proposedLibrary: changedLibrary(),
      actors: {
        extractor: "same-user",
        reviewer: "same-user",
        promoter: "release-manager",
      },
      releaseId: "AKR-BLOCKED",
      tenantId: "tenant-reference",
    })).toThrowError(KnowledgeCycleGovernanceError);
  });

  it("blocks unresolved contradiction or licence gates", () => {
    expect(() => runGovernedKnowledgeCycle({
      currentLibrary: referenceLibrary(),
      proposedLibrary: changedLibrary(),
      actors: {
        extractor: "extractor",
        reviewer: "reviewer",
        promoter: "promoter",
      },
      releaseId: "AKR-BLOCKED",
      tenantId: "tenant-reference",
      openContradictions: 1,
    })).toThrowError(/contradiction-gate/);
  });
});
