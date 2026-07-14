import { z } from "zod";
import {
  sprint78PatternCorpus,
  auditResultSchema,
  changeProposalSchema,
  createId,
  type ArchitectureProject,
  type AuditResult,
  type ChangeProposal,
  type KnowledgeLibrary,
} from "@aiw/domain";
import {
  buildRecommendationEvidencePack,
  recommendInContext,
  runDeterministicAudit,
  validateProposedEdge,
  validateProposedNode,
} from "@aiw/engine";
import type { LlmGateway } from "./llmGateway.js";
import { buildApprovedKnowledgeGroundingPack } from "./approvedKnowledgeGrounding.js";

const aiResponseSchema = z.object({
  summary: z.string().min(1),
  proposals: z.array(changeProposalSchema).max(12),
});

function keepSafeProposals(
  project: ArchitectureProject,
  proposals: ChangeProposal[],
  approvedEvidenceIds: Set<string>,
): ChangeProposal[] {
  const allowedEvidence = approvedEvidenceIds;
  return proposals.flatMap((proposal) => {
    const evidenceRecordIds = proposal.evidenceRecordIds.filter((id) =>
      allowedEvidence.has(id),
    );
    if (!evidenceRecordIds.length) return [];
    const operations = proposal.operations.filter((operation) => {
      if (operation.type === "ADD_NODE")
        return validateProposedNode(project, operation.node).allowed;
      if (operation.type === "ADD_EDGE")
        return validateProposedEdge(project, operation.edge).allowed;
      if (operation.type === "UPDATE_NODE")
        return project.nodes.some((node) => node.id === operation.nodeId);
      if (operation.type === "UPDATE_EDGE")
        return project.edges.some((edge) => edge.id === operation.edgeId);
      // Destructive operations are never accepted from an LLM proposal in v0.9.1.
      return false;
    });
    if (!operations.length) return [];
    return [
      {
        ...proposal,
        severity:
          proposal.severity === "HARD" ? "SIGNIFICANT" : proposal.severity,
        operations,
        evidenceRecordIds,
        selected: false,
      },
    ];
  });
}

export async function runAiAssistedAudit(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  gateway: LlmGateway,
): Promise<AuditResult> {
  const deterministic = runDeterministicAudit(project, library);
  const contextual = recommendInContext(project, library, {
    stage: project.activeStage,
    trigger: "scope-change",
  });
  const relevantRecordIds = new Set([
    ...project.styleDecisions
      .filter((item) => item.status === "accepted")
      .map((item) => item.styleId),
    ...project.patternSelections
      .filter(
        (item) => item.status === "accepted" || item.status === "considering",
      )
      .map((item) => item.patternId),
    ...contextual.styles
      .filter((item) => item.eligible)
      .slice(0, 4)
      .map((item) => item.styleId),
    ...contextual.patterns
      .filter((item) => item.eligible)
      .slice(0, 10)
      .map((item) => item.patternId),
  ]);
  const selectedNodeText = project.nodes
    .filter((node) => node.stage === project.activeStage)
    .slice(0, 25)
    .map((node) => `${node.label} ${node.kind} ${node.description ?? ""}`)
    .join(" ");
  const patternPack = buildRecommendationEvidencePack(
    {
      query: [
        project.name,
        project.description,
        ...project.objectives,
        ...project.constraints,
        selectedNodeText,
      ].join(" "),
      project,
      stage: project.activeStage,
      limit: 16,
    },
    sprint78PatternCorpus,
  );
  patternPack.approvedRecordIds.forEach((id) => relevantRecordIds.add(id));
  const approvedGrounding = buildApprovedKnowledgeGroundingPack({
    activeKnowledgeReleaseId: patternPack.knowledgeRelease,
    recordIds: patternPack.approvedRecordIds,
  });
  const relevantKnowledge = {
    knowledgeRelease: patternPack.knowledgeRelease,
    styles: library.architectureStyles
      .filter((style) => relevantRecordIds.has(style.id))
      .map((style) => ({
        id: style.id,
        name: style.name,
        traits: style.traits ?? [],
        obligations: style.obligations,
        whenToConsider: style.whenToConsider,
        whenToAvoidOrQuestion: style.whenToAvoidOrQuestion,
      })),
    corePatterns: library.patterns
      .filter((pattern) => relevantRecordIds.has(pattern.id))
      .map((pattern) => ({
        id: pattern.id,
        name: pattern.name,
        category: pattern.category,
        obligations: pattern.obligations,
        requires: pattern.requires,
        conflictsWith: pattern.conflictsWith,
        risks: pattern.risks,
        mitigations: pattern.mitigations,
      })),
    patternDnaRecords: sprint78PatternCorpus
      .filter((record) => patternPack.approvedRecordIds.includes(record.id))
      .map((record) => ({
        id: record.id,
        name: record.name,
        recordType: record.recordType,
        category: record.category,
        summary: record.summary,
        problem: record.problem,
        context: record.context,
        forces: record.forces,
        applicabilityRules: record.applicabilityRules,
        exclusions: record.exclusions,
        prerequisites: record.prerequisites,
        complements: record.complements,
        conflicts: record.conflicts,
        qualityImpacts: record.qualityImpacts,
        obligations: record.obligations,
        risks: record.risks,
        mitigations: record.mitigations,
        evidence: record.evidence,
        maturity: record.maturity,
        review: record.review,
      })),
    recommendations: patternPack.recommendations,
    approvedEvidence: patternPack.approvedEvidence,
    opposingEvidence: patternPack.opposingEvidence,
    openQuestions: patternPack.openQuestions,
    approvedClaimGrounding: approvedGrounding.sources,
    sourceFingerprint: approvedGrounding.sourceFingerprint,
  };

  try {
    const execution = await gateway.generateJson<unknown>({
      purpose: "architecture-reasoning",
      schemaName: "aiw_architecture_audit_proposals",
      dataClassification: "internal",
      system: [
        "You are the embedded co-architect inside the Architecture Intelligence Workbench.",
        "The deterministic findings, eligibility decisions and scores are authoritative and must never be overridden.",
        "Use only the supplied project vocabulary and knowledge record identifiers.",
        "Return reviewable, reversible proposals only. Never delete nodes or edges. Never emit HARD severity.",
        "Every proposal must cite at least one supplied knowledge record identifier.",
        "Do not claim that the design is correct, complete or production-ready.",
      ].join(" "),
      user: JSON.stringify({
        project,
        deterministicAudit: deterministic,
        contextualRecommendations: contextual,
        relevantKnowledge,
      }),
      grounding: {
        allowedReferenceIds: [...relevantRecordIds],
        sources: approvedGrounding.sources,
        requireCitations: true,
        minimumSupportScore: 0.05,
      },
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["summary", "proposals"],
        properties: {
          summary: { type: "string" },
          proposals: {
            type: "array",
            maxItems: 12,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "id",
                "title",
                "rationale",
                "severity",
                "operations",
                "evidenceRecordIds",
                "selected",
              ],
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                rationale: { type: "string" },
                severity: { type: "string", enum: ["SIGNIFICANT", "ADVISORY"] },
                selected: { type: "boolean", enum: [false] },
                evidenceRecordIds: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string", enum: [...relevantRecordIds] },
                },
                operations: {
                  type: "array",
                  minItems: 1,
                  items: { type: "object" },
                },
              },
            },
          },
        },
      },
    });
    const parsed = aiResponseSchema.safeParse(execution.value);
    if (!parsed.success) return deterministic;
    const proposals = keepSafeProposals(
      project,
      parsed.data.proposals as unknown as ChangeProposal[],
      new Set(patternPack.approvedRecordIds),
    );
    return auditResultSchema.parse({
      ...deterministic,
      id: createId("audit"),
      createdAt: new Date().toISOString(),
      source: "llm-assisted",
      summary: parsed.data.summary,
      proposals,
      modelTrace: {
        providerId: execution.providerId,
        model: execution.model,
        routeId: execution.routeId,
        fallbackUsed: execution.fallbackUsed,
        requestFingerprint: execution.requestFingerprint,
      },
    }) as unknown as AuditResult;
  } catch {
    return deterministic;
  }
}
