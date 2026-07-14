import type { ArchitectureProject, ProjectContext } from "@aiw/domain";
import type { LlmGateway } from "./llmGateway.js";

export interface DesignBriefProposal {
  problemStatement: string;
  objectives: string[];
  constraints: string[];
  assumptions: string[];
  context: Partial<ProjectContext>;
  qualityScenarios: Array<{
    attributeId: string;
    source: string;
    stimulus: string;
    environment: string;
    artifact: string;
    response: string;
    responseMeasure: string;
    weight: number;
  }>;
  clarificationQuestions: string[];
}

function unique(items: string[], limit: number): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(
    0,
    limit,
  );
}

function deterministicProposal(
  project: ArchitectureProject,
  briefText: string,
): DesignBriefProposal {
  const lines = briefText
    .split(/\n|(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const constraints = lines.filter((line) =>
    /must|cannot|shall|residen|regulat|budget|deadline|legacy|offline|country|jurisdiction|prohibit/i.test(
      line,
    ),
  );
  const objectives = lines.filter(
    (line) =>
      /support|enable|reduce|improve|process|serve|scale|provide|deliver/i.test(
        line,
      ) && !constraints.includes(line),
  );
  const assumptions = lines.filter((line) =>
    /assum|expected|initial|likely|team|estimate/i.test(line),
  );
  const problemStatement =
    project.description.trim() || lines[0] || briefText.trim();
  const qualityScenarios: DesignBriefProposal["qualityScenarios"] = [];
  if (/spike|scale|volume|traffic|throughput|concurrent/i.test(briefText))
    qualityScenarios.push({
      attributeId: "scalability",
      source: "Demand growth",
      stimulus: "Workload increases above the normal operating envelope",
      environment: "Peak production traffic",
      artifact: "Primary transaction path",
      response: "Scale capacity without losing accepted work",
      responseMeasure:
        "Meet the agreed throughput and latency target at peak load",
      weight: 4,
    });
  if (/outage|failure|available|reliab|no lost|resilien/i.test(briefText))
    qualityScenarios.push({
      attributeId: "availability",
      source: "Runtime dependency",
      stimulus: "A critical dependency becomes unavailable",
      environment: "Production operation",
      artifact: "Critical business flow",
      response: "Isolate the failure and preserve recoverable work",
      responseMeasure:
        "No confirmed transaction is lost and service recovers within the agreed objective",
      weight: 5,
    });
  if (
    /security|privacy|regulated|residen|personal data|payment|pci|pii/i.test(
      briefText,
    )
  )
    qualityScenarios.push({
      attributeId: "security",
      source: "External or internal threat actor",
      stimulus: "Attempts unauthorized access to protected data or functions",
      environment: "Production operation",
      artifact: "Trust boundary and protected data flow",
      response: "Deny unauthorized access and retain auditable evidence",
      responseMeasure:
        "No unauthorized disclosure; security event is detected and triaged within the agreed target",
      weight: 5,
    });

  const context: Partial<ProjectContext> = {};
  const jurisdictions = unique(
    lines.flatMap((line) =>
      [
        ...line.matchAll(/\b(NDPR|GDPR|POPIA|LGPD|PDPA|HIPAA|PCI[- ]?DSS)\b/gi),
      ].map((match) => match[1]!.toUpperCase()),
    ),
    8,
  );
  if (jurisdictions.length) context.regulatoryJurisdictions = jurisdictions;
  const classifications = unique(
    [
      ...(/\bPII\b|personal data/i.test(briefText) ? ["PII"] : []),
      ...(/\bPCI\b|cardholder|payment card/i.test(briefText) ? ["PCI"] : []),
      ...(/\bPHI\b|health data/i.test(briefText) ? ["PHI"] : []),
    ],
    6,
  );
  if (classifications.length) context.dataClassifications = classifications;
  const stakeholderLines = lines.filter((line) =>
    /customer|merchant|partner|staff|operator|architect|auditor|regulator|user/i.test(
      line,
    ),
  );
  if (stakeholderLines.length)
    context.stakeholders = unique(stakeholderLines, 8);
  const brownfield = lines.filter((line) =>
    /legacy|mainframe|existing system|current platform|brownfield/i.test(line),
  );
  if (brownfield.length) context.existingSystems = unique(brownfield, 8);
  const workload = lines.find((line) =>
    /volume|transaction|request|concurrent|peak|spiky|growth/i.test(line),
  );
  if (workload) context.workloadProfile = workload.slice(0, 200);
  const availability = briefText.match(/\b99(?:\.\d+)?%\b[^.!?]*/)?.[0];
  if (availability) context.availabilityTarget = availability.slice(0, 80);
  const recovery = lines.find((line) =>
    /\bRTO\b|\bRPO\b|recover(?:y)? within/i.test(line),
  );
  if (recovery) context.recoveryObjectives = recovery.slice(0, 120);
  const team = lines.find((line) =>
    /\bteam\b|engineer|squad|platform team/i.test(line),
  );
  if (team) context.teamTopology = team.slice(0, 160);

  const clarificationQuestions: string[] = [];
  if (!context.stakeholders?.length)
    clarificationQuestions.push(
      "Who are the primary users, decision makers and external actors?",
    );
  if (!context.workloadProfile)
    clarificationQuestions.push(
      "What are the current and forecast workload volumes, peaks and growth?",
    );
  if (!context.availabilityTarget && !context.recoveryObjectives)
    clarificationQuestions.push(
      "What availability, RTO and RPO objectives apply?",
    );
  if (!context.regulatoryJurisdictions?.length)
    clarificationQuestions.push(
      "Which jurisdictions, data-residency and regulatory obligations apply?",
    );
  return {
    problemStatement,
    objectives: unique([...project.objectives, ...objectives], 12),
    constraints: unique([...project.constraints, ...constraints], 12),
    assumptions: unique([...project.assumptions, ...assumptions], 12),
    context,
    qualityScenarios: qualityScenarios.slice(0, 4),
    clarificationQuestions,
  };
}

function boundedStringList(
  value: unknown,
  maxItems: number,
  maxLength = 200,
): string[] {
  return (Array.isArray(value) ? value : [])
    .map(String)
    .map((item) => item.slice(0, maxLength).trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function sanitizeProposal(
  raw: DesignBriefProposal,
  fallback: DesignBriefProposal,
): DesignBriefProposal {
  const contextRaw = (raw.context ?? {}) as Record<string, unknown>;
  const context: Partial<ProjectContext> = {};
  const listFields = [
    "problemShapes",
    "preferredVendors",
    "prohibitedTechnologies",
    "stakeholders",
    "inScopeCapabilities",
    "outOfScopeCapabilities",
    "dataClassifications",
    "regulatoryJurisdictions",
    "existingSystems",
  ] as const;
  for (const field of listFields) {
    const values = boundedStringList(
      contextRaw[field],
      field === "problemShapes" ? 6 : 10,
      100,
    );
    if (values.length) context[field] = values;
  }
  const textFields = [
    "workloadProfile",
    "availabilityTarget",
    "recoveryObjectives",
    "teamTopology",
  ] as const;
  for (const field of textFields) {
    const value = String(contextRaw[field] ?? "")
      .trim()
      .slice(0, 220);
    if (value) context[field] = value;
  }
  const teamSize = Math.round(Number(contextRaw.teamSize));
  if (teamSize > 0 && teamSize < 100000) context.teamSize = teamSize;
  const maturity = Math.round(Number(contextRaw.operationalMaturity));
  if (maturity >= 1 && maturity <= 5)
    context.operationalMaturity = maturity as 1 | 2 | 3 | 4 | 5;
  const budget = Math.round(Number(contextRaw.budgetSensitivity));
  if (budget >= 1 && budget <= 5)
    context.budgetSensitivity = budget as 1 | 2 | 3 | 4 | 5;
  if (["low", "medium", "high"].includes(String(contextRaw.regulatoryExposure)))
    context.regulatoryExposure = contextRaw.regulatoryExposure as
      "low" | "medium" | "high";

  const scenarios = (
    Array.isArray(raw.qualityScenarios) ? raw.qualityScenarios : []
  )
    .slice(0, 5)
    .map((scenario) => ({
      attributeId: String(scenario.attributeId ?? "").slice(0, 60),
      source: String(scenario.source ?? "").slice(0, 160),
      stimulus: String(scenario.stimulus ?? "").slice(0, 200),
      environment: String(scenario.environment ?? "").slice(0, 160),
      artifact: String(scenario.artifact ?? "").slice(0, 160),
      response: String(scenario.response ?? "").slice(0, 240),
      responseMeasure: String(scenario.responseMeasure ?? "").slice(0, 240),
      weight: Math.max(
        1,
        Math.min(5, Math.round(Number(scenario.weight) || 3)),
      ),
    }))
    .filter(
      (scenario) =>
        scenario.attributeId && scenario.stimulus && scenario.responseMeasure,
    );

  return {
    problemStatement: String(
      raw.problemStatement ?? fallback.problemStatement,
    ).slice(0, 2000),
    objectives: boundedStringList(raw.objectives, 12),
    constraints: boundedStringList(raw.constraints, 12),
    assumptions: boundedStringList(raw.assumptions, 12),
    context,
    qualityScenarios: scenarios,
    clarificationQuestions: boundedStringList(raw.clarificationQuestions, 10),
  };
}

export async function analyseDesignBrief(
  input: {
    project: ArchitectureProject;
    briefText: string;
    dataClassification?: "public" | "internal" | "confidential" | "restricted";
  },
  gateway: LlmGateway,
): Promise<{
  mode: "llm-assisted" | "deterministic-fallback";
  proposal: DesignBriefProposal;
  modelTrace?: {
    providerId: string;
    model: string;
    routeId: string;
    fallbackUsed: boolean;
    requestFingerprint: string;
  };
}> {
  const fallback = deterministicProposal(input.project, input.briefText);
  try {
    const result = await gateway.generateJson<DesignBriefProposal>({
      purpose: "architecture-reasoning",
      schemaName: "aiw_design_brief_proposal_v2",
      dataClassification: input.dataClassification ?? "internal",
      system:
        "You are the AIW design-brief analyst. Convert the supplied brief into reviewable architecture intent and structured enterprise context. Do not invent numeric targets. Preserve uncertainty as clarification questions. Return only the requested JSON.",
      user: JSON.stringify({
        existingProject: {
          description: input.project.description,
          objectives: input.project.objectives,
          constraints: input.project.constraints,
          assumptions: input.project.assumptions,
          context: input.project.context,
        },
        briefText: input.briefText,
      }),
      jsonSchema: {
        type: "object",
        additionalProperties: false,
        required: [
          "problemStatement",
          "objectives",
          "constraints",
          "assumptions",
          "context",
          "qualityScenarios",
          "clarificationQuestions",
        ],
        properties: {
          problemStatement: { type: "string" },
          objectives: {
            type: "array",
            maxItems: 12,
            items: { type: "string" },
          },
          constraints: {
            type: "array",
            maxItems: 12,
            items: { type: "string" },
          },
          assumptions: {
            type: "array",
            maxItems: 12,
            items: { type: "string" },
          },
          clarificationQuestions: {
            type: "array",
            maxItems: 10,
            items: { type: "string" },
          },
          context: {
            type: "object",
            additionalProperties: false,
            properties: {
              teamSize: { type: "number" },
              operationalMaturity: { type: "number" },
              budgetSensitivity: { type: "number" },
              regulatoryExposure: {
                type: "string",
                enum: ["low", "medium", "high"],
              },
              preferredVendors: { type: "array", items: { type: "string" } },
              prohibitedTechnologies: {
                type: "array",
                items: { type: "string" },
              },
              problemShapes: { type: "array", items: { type: "string" } },
              stakeholders: { type: "array", items: { type: "string" } },
              inScopeCapabilities: { type: "array", items: { type: "string" } },
              outOfScopeCapabilities: {
                type: "array",
                items: { type: "string" },
              },
              dataClassifications: { type: "array", items: { type: "string" } },
              regulatoryJurisdictions: {
                type: "array",
                items: { type: "string" },
              },
              existingSystems: { type: "array", items: { type: "string" } },
              workloadProfile: { type: "string" },
              availabilityTarget: { type: "string" },
              recoveryObjectives: { type: "string" },
              teamTopology: { type: "string" },
            },
          },
          qualityScenarios: {
            type: "array",
            maxItems: 5,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "attributeId",
                "source",
                "stimulus",
                "environment",
                "artifact",
                "response",
                "responseMeasure",
                "weight",
              ],
              properties: {
                attributeId: { type: "string" },
                source: { type: "string" },
                stimulus: { type: "string" },
                environment: { type: "string" },
                artifact: { type: "string" },
                response: { type: "string" },
                responseMeasure: { type: "string" },
                weight: { type: "number", minimum: 1, maximum: 5 },
              },
            },
          },
        },
      },
    });
    return {
      mode: "llm-assisted",
      proposal: sanitizeProposal(result.value, fallback),
      modelTrace: {
        providerId: result.providerId,
        model: result.model,
        routeId: result.routeId,
        fallbackUsed: result.fallbackUsed,
        requestFingerprint: result.requestFingerprint,
      },
    };
  } catch {
    return { mode: "deterministic-fallback", proposal: fallback };
  }
}
