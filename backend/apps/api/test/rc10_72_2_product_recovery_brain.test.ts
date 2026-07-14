import { describe, expect, it } from "vitest";
import { sampleProject, type ArchitectureProject } from "@aiw/domain";
import { buildApp } from "../src/app.js";
import { InMemoryProjectRepository } from "../src/repository.js";

const headers = {
  "x-aiw-tenant-id": "tenant-reference",
  "x-aiw-user-id": "user-owner",
};

describe("rc.10.72.2 product recovery brain context", () => {
  it("preserves requirements and system-context lifecycle semantics instead of collapsing them into logical application", async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const project = (await repository.getProject(
        "tenant-reference",
        sampleProject.id,
        sampleProject.branch.id,
      )) as ArchitectureProject;
      const requirements = await app.inject({
        method: "POST",
        url: "/api/co-architect/ask",
        headers,
        payload: {
          projectId: project.id,
          branchId: project.branch.id,
          expectedRevision: project.revision,
          lifecycleStage: "requirements",
          scopeLabel: "Solution intent and requirements baseline",
          question:
            "What is the most important unresolved requirement decision?",
        },
      });
      expect(requirements.statusCode).toBe(200);
      const requirementsAnswer = requirements.json();
      expect(requirementsAnswer.contextSummary.lifecycleStage).toBe(
        "requirements",
      );
      expect(requirementsAnswer.contextSummary.scopeLabel).toContain(
        "requirements",
      );
      expect(requirementsAnswer.recommendation).toMatch(
        /requirement|outcome|scope|stakeholder|journey|clarif/i,
      );
      expect(requirementsAnswer.citedRecordIds).toContain("legacy-objective-1");
      expect(requirementsAnswer.qualityReceipt.gates.find((gate: { dimension: string }) => gate.dimension === "evidence-grounding")?.status).toBe("passed");
      expect(requirementsAnswer.observations.join(" ")).not.toMatch(
        /places order|highest deterministic concern/i,
      );
      expect(requirementsAnswer.brainReceipt.task).toBe("explain-or-challenge");
      expect(
        requirementsAnswer.brainReceipt.governance.directModelMutationAllowed,
      ).toBe(false);

      const context = await app.inject({
        method: "POST",
        url: "/api/co-architect/ask",
        headers,
        payload: {
          projectId: project.id,
          branchId: project.branch.id,
          expectedRevision: project.revision,
          lifecycleStage: "context",
          scopeLabel: "System boundary and external interactions",
          question:
            "Which actor, external system or interaction is missing from the System Context?",
        },
      });
      expect(context.statusCode).toBe(200);
      const contextAnswer = context.json();
      expect(contextAnswer.contextSummary.lifecycleStage).toBe("context");
      expect(contextAnswer.contextSummary.architectureStage).toBe(
        "logicalApplication",
      );
      expect(contextAnswer.contextSummary.scopeLabel).toContain(
        "System boundary",
      );
      expect(contextAnswer.recommendation).toMatch(
        /context|boundary|actor|external|journey|interaction/i,
      );
      expect(contextAnswer.observations.join(" ")).not.toMatch(
        /generic software architecture/i,
      );
    } finally {
      await app.close();
    }
  });

  it("returns a structured, evidence-bounded deterministic answer when no governed LLM route is available", async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const project = (await repository.getProject(
        "tenant-reference",
        sampleProject.id,
        sampleProject.branch.id,
      )) as ArchitectureProject;
      const response = await app.inject({
        method: "POST",
        url: "/api/co-architect/ask",
        headers,
        payload: {
          projectId: project.id,
          branchId: project.branch.id,
          expectedRevision: project.revision,
          lifecycleStage: "review",
          scopeLabel: "Approval readiness",
          question: "What blocks approval and what should I resolve first?",
        },
      });
      expect(response.statusCode).toBe(200);
      const answer = response.json();
      expect(answer.mode).toBe("deterministic-fallback");
      expect(answer.answer.length).toBeGreaterThan(30);
      expect(answer.observations.length).toBeGreaterThan(0);
      expect(answer.recommendation.length).toBeGreaterThan(20);
      expect(Array.isArray(answer.tradeOffs)).toBe(true);
      expect(Array.isArray(answer.clarifyingQuestions)).toBe(true);
      expect(answer.contextSummary.lifecycleStage).toBe("review");
      expect(answer.brainReceipt.llm.requested).toBe(true);
      expect(answer.brainReceipt.warnings).toContain(
        "No governed LLM answer was used.",
      );
    } finally {
      await app.close();
    }
  });

  it("uses an explicit read-only compatibility projection for legacy projects instead of presenting Sol as context-free", async () => {
    const repository = new InMemoryProjectRepository();
    const app = await buildApp({ repository, logger: false });
    try {
      const seeded = (await repository.getProject(
        "tenant-reference",
        sampleProject.id,
        sampleProject.branch.id,
      )) as ArchitectureProject;
      const legacyProject = structuredClone(seeded);
      legacyProject.requirementsIntelligence = undefined;
      legacyProject.objectives = [
        "Enable agents to serve customers through governed cash-in and cash-out journeys.",
        "Preserve traceability and operational accountability across every transaction.",
      ];
      legacyProject.constraints = [
        "Integrate with the existing core ledger and identity services.",
      ];
      await repository.saveProject(legacyProject, seeded.revision);

      const response = await app.inject({
        method: "POST",
        url: "/api/co-architect/ask",
        headers,
        payload: {
          projectId: legacyProject.id,
          branchId: legacyProject.branch.id,
          expectedRevision: legacyProject.revision,
          lifecycleStage: "requirements",
          scopeLabel: "Legacy project intent",
          question: "Which requirement and journey should be clarified first?",
        },
      });
      expect(response.statusCode).toBe(200);
      const answer = response.json();
      expect(answer.contextSummary.requirementCount).toBeGreaterThan(0);
      expect(answer.contextSummary.journeyCount).toBeGreaterThan(0);
      expect(answer.observations.join(" ")).toMatch(
        /compatibility projection/i,
      );
      expect(answer.brainReceipt.governance.directModelMutationAllowed).toBe(
        false,
      );
    } finally {
      await app.close();
    }
  });
});
