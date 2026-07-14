import type {
  ArchitectureSynthesisRequest,
  ArchitectureSynthesisRun,
} from "@aiw/domain";
import { synthesizeArchitectureAlternatives } from "@aiw/engine";
import type { LlmGateway, LlmExecutionResult } from "./llmGateway.js";

interface NarrativeResponse {
  alternatives: Array<{
    id: string;
    summary: string;
    tradeoffNarrative: string;
  }>;
  portfolioNarrative: string;
}

export interface GovernedSynthesisResult {
  run: ArchitectureSynthesisRun;
  llmExecution?: LlmExecutionResult<NarrativeResponse>;
}

export async function runGovernedArchitectureSynthesis(
  request: ArchitectureSynthesisRequest,
  gateway: LlmGateway,
): Promise<GovernedSynthesisResult> {
  const run = synthesizeArchitectureAlternatives(request);
  if (!request.useLlmEnrichment || !run.alternatives.length) return { run };
  const bounded = run.alternatives.map((alternative) => ({
    id: alternative.id,
    strategyId: alternative.strategyId,
    name: alternative.name,
    summary: alternative.summary,
    patternIds: alternative.patternIds,
    scorecard: alternative.scorecard,
    obligations: alternative.obligations.map((item) => ({
      id: item.id,
      title: item.title,
      mandatory: item.mandatory,
    })),
    risks: alternative.risks,
    assumptions: alternative.assumptions,
    evidenceConnectorIds: alternative.evidenceConnectorIds,
  }));
  let execution: LlmExecutionResult<NarrativeResponse>;
  try {
    execution = await gateway.generateJson<NarrativeResponse>({
      purpose: "architecture-reasoning",
      schemaName: "aiw_architecture_synthesis_narrative",
      dataClassification: request.dataClassification ?? "internal",
      system: [
        "You are the bounded explanation layer of the Architecture Intelligence Workbench.",
        "Use only the supplied alternatives, Pattern DNA identifiers, scores, obligations, risks and evidence connector identifiers.",
        "Do not add technologies, patterns, facts or scores. Do not choose a winner. Explain trade-offs and uncertainty.",
        "Return JSON matching the schema exactly.",
      ].join(" "),
      user: JSON.stringify({
        project: {
          name: request.project.name,
          description: request.project.description,
          objectives: request.project.objectives,
          constraints: request.project.constraints,
          assumptions: request.project.assumptions,
          qualityPriorities: request.project.qualityPriorities,
        },
        knowledgeReleaseId: run.knowledgeReleaseId,
        alternatives: bounded,
      }),
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: ["alternatives", "portfolioNarrative"],
        properties: {
          alternatives: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "summary", "tradeoffNarrative"],
              properties: {
                id: {
                  type: "string",
                  enum: run.alternatives.map((item) => item.id),
                },
                summary: { type: "string" },
                tradeoffNarrative: { type: "string" },
              },
            },
          },
          portfolioNarrative: { type: "string" },
        },
      },
    });
  } catch {
    run.mode = "deterministic";
    run.warnings = [
      ...run.warnings,
      "External narrative enrichment was unavailable. AIW completed synthesis using the governed deterministic architecture kernel.",
    ];
    return { run };
  }
  for (const narrative of execution.value.alternatives) {
    const alternative = run.alternatives.find(
      (item) => item.id === narrative.id,
    );
    if (!alternative) continue;
    alternative.llmNarrative = {
      providerId: execution.providerId,
      model: execution.model,
      routeId: execution.routeId,
      summary: narrative.summary,
      tradeoffNarrative: narrative.tradeoffNarrative,
    };
  }
  run.mode = "llm-enriched";
  run.modelTrace = {
    providerId: execution.providerId,
    model: execution.model,
    routeId: execution.routeId,
    fallbackUsed: execution.fallbackUsed,
    requestFingerprint: execution.requestFingerprint,
  };
  return { run, llmExecution: execution };
}
