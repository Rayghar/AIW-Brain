import {
  AIW_INTELLIGENCE_CONSTITUTION_VERSION,
  buildArchitectureDesignGraph,
  getArchitectureDesignGraphStateAuthority,
  type ArchitectureBrainAuthorityAudit,
  type ArchitectureBrainAuthorityContribution,
  type ArchitectureBrainProposalReceipt,
  type ArchitectureBrainTaskKind,
  type ArchitectureKnowledgeManifest,
  type ArchitectureProject,
} from "@aiw/domain";

export const AIW_BRAIN_ORCHESTRATOR_VERSION = "1.6.0-rc10.73.4";
export const AIW_KERNEL_VERSION = "AIW-KERNEL-2.0";
export const AIW_LIFECYCLE_GRAMMAR_VERSION = "LIFECYCLE-GRAMMAR-1.0";
export const AIW_PATTERN_DNA_RELEASE = "PDNA-2.0";
export const AIW_LLM_AUTHORITY_POLICY = "LLM-AUTHORITY-1.0";
export const AIW_DEFAULT_KNOWLEDGE_RELEASE = "AKR-0.10.73.5";
export const AIW_CAMBRIDGE_RULESET = "CAMBRIDGE-SA-1.0";

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return `fnv1a-${(result >>> 0).toString(16).padStart(8, "0")}`;
}

export function createArchitectureKnowledgeManifest(input: {
  project: ArchitectureProject;
  applicationVersion?: string;
  knowledgeReleaseId?: string;
  patternDnaReleaseId?: string;
  cambridgeRulesetId?: string;
  enterprisePolicyPackIds?: string[];
  pinnedAt?: string;
}): ArchitectureKnowledgeManifest {
  const pinnedAt = input.pinnedAt ?? new Date().toISOString();
  const designGraph = buildArchitectureDesignGraph(input.project);
  const stateAuthority = getArchitectureDesignGraphStateAuthority(designGraph);
  const manifest = {
    schemaVersion: "1.0" as const,
    applicationVersion: input.applicationVersion ?? "0.10.0-rc.10.73.5",
    kernelVersion: AIW_KERNEL_VERSION,
    lifecycleGrammarVersion: AIW_LIFECYCLE_GRAMMAR_VERSION,
    knowledgeReleaseId:
      input.knowledgeReleaseId ??
      input.project.requirementsIntelligence?.knowledgeReleaseId ??
      AIW_DEFAULT_KNOWLEDGE_RELEASE,
    patternDnaReleaseId: input.patternDnaReleaseId ?? AIW_PATTERN_DNA_RELEASE,
    cambridgeRulesetId: input.cambridgeRulesetId ?? AIW_CAMBRIDGE_RULESET,
    enterprisePolicyPackIds: [
      ...new Set(
        input.enterprisePolicyPackIds ?? input.project.activeRulePackIds,
      ),
    ].sort(),
    llmAuthorityPolicyId: AIW_LLM_AUTHORITY_POLICY,
    constitutionVersion: AIW_INTELLIGENCE_CONSTITUTION_VERSION,
    pinnedAt,
    fingerprint: "",
    designGraphRevision: designGraph.graphRevision,
    designGraphFingerprint: designGraph.fingerprint,
    designGraphProjectionMode: designGraph.projectionMode,
    designGraphIntegrityHealthy: designGraph.integrity.healthy,
    designGraphStateAuthorityMode: stateAuthority ? 'graph-primary' as const : 'compatibility-projection' as const,
    designGraphCanonicalStateKinds: stateAuthority?.canonicalStateKinds ?? [],
  };
  manifest.fingerprint = hash(
    JSON.stringify({
      ...manifest,
      pinnedAt: undefined,
      fingerprint: undefined,
    }),
  );
  return manifest;
}

export function defaultArchitectureBrainAuthorityChain(): ArchitectureBrainAuthorityContribution[] {
  return [
    {
      authority: "canonical-model",
      responsibility:
        "Supplies the accepted project truth, revision and lineage context.",
      mayMutateCanonicalModel: false,
    },
    {
      authority: "deterministic-kernel",
      responsibility:
        "Owns eligibility, validation, policy, ranking boundaries and safe mutation constraints.",
      mayMutateCanonicalModel: false,
    },
    {
      authority: "approved-knowledge",
      responsibility:
        "Supplies released patterns, tactics, methods, obligations and evidence.",
      mayMutateCanonicalModel: false,
    },
    {
      authority: "governed-llm",
      responsibility:
        "May interpret ambiguity, draft structured alternatives and explain trade-offs within supplied evidence.",
      mayMutateCanonicalModel: false,
    },
    {
      authority: "architect",
      responsibility:
        "Accepts, edits or rejects proposals and is the only design authority that can approve canonical change.",
      mayMutateCanonicalModel: true,
    },
  ];
}

export function createArchitectureBrainProposalReceipt(input: {
  task: ArchitectureBrainTaskKind;
  project: ArchitectureProject;
  manifest: ArchitectureKnowledgeManifest;
  stage?: string;
  scopeRef?: string;
  deterministicRules?: string[];
  knowledgeRefs?: string[];
  llmRequested?: boolean;
  llmTrace?: {
    providerId?: string;
    model?: string;
    routeId?: string;
    requestFingerprint?: string;
    latencyMs?: number;
    fallbackUsed?: boolean;
  };
  warnings?: string[];
  context?: ArchitectureBrainProposalReceipt["context"];
  reasoning?: ArchitectureBrainProposalReceipt["reasoning"];
  quality?: ArchitectureBrainProposalReceipt["quality"];
  lineagePaths?: ArchitectureBrainProposalReceipt["lineagePaths"];
}): ArchitectureBrainProposalReceipt {
  const designGraph = buildArchitectureDesignGraph(input.project);
  const stateAuthority = getArchitectureDesignGraphStateAuthority(designGraph);
  const contextFingerprint = hash(
    JSON.stringify({
      projectId: input.project.id,
      branchId: input.project.branch.id,
      revision: input.project.revision,
      task: input.task,
      stage: input.stage ?? input.project.activeStage,
      scopeRef: input.scopeRef ?? null,
      manifest: input.manifest.fingerprint,
      designGraph: designGraph.fingerprint,
    }),
  );
  const llm = input.llmTrace;
  return {
    schemaVersion: "1.0",
    proposalId: `BRAIN-${input.task}-${hash(`${contextFingerprint}|${Date.now()}`)}`,
    task: input.task,
    projectId: input.project.id,
    branchId: input.project.branch.id,
    projectRevision: input.project.revision,
    stage: input.stage ?? input.project.activeStage,
    ...(input.scopeRef ? { scopeRef: input.scopeRef } : {}),
    contextFingerprint,
    graph: {
      revision: designGraph.graphRevision,
      fingerprint: designGraph.fingerprint,
      projectionMode: designGraph.projectionMode,
      integrityHealthy: designGraph.integrity.healthy,
      legacyProjectionUsed: designGraph.projectionMode === "legacy-project-projection",
      stateAuthorityMode: stateAuthority ? 'graph-primary' : 'compatibility-projection',
      canonicalStateKinds: stateAuthority?.canonicalStateKinds ?? [],
      ...(stateAuthority ? { lastWritePath: stateAuthority.lastWritePath } : {}),
    },
    generatedAt: new Date().toISOString(),
    manifest: input.manifest,
    authorityChain: defaultArchitectureBrainAuthorityChain(),
    deterministicRules: [...new Set(input.deterministicRules ?? [])],
    knowledgeRefs: [...new Set(input.knowledgeRefs ?? [])],
    llm: {
      requested: input.llmRequested ?? false,
      used: Boolean(llm?.providerId && !llm?.fallbackUsed),
      fallbackUsed: Boolean(llm?.fallbackUsed),
      ...(llm?.providerId ? { providerId: llm.providerId } : {}),
      ...(llm?.model ? { model: llm.model } : {}),
      ...(llm?.routeId ? { routeId: llm.routeId } : {}),
      ...(llm?.requestFingerprint
        ? { requestFingerprint: llm.requestFingerprint }
        : {}),
      ...(typeof llm?.latencyMs === "number"
        ? { latencyMs: llm.latencyMs }
        : {}),
    },
    governance: {
      humanApprovalRequired: true,
      directModelMutationAllowed: false,
      staleIfProjectRevisionChanges: true,
      auditRequired: true,
    },
    warnings: [...new Set([
      ...(input.warnings ?? []),
      ...designGraph.integrity.errors,
      ...(designGraph.projectionMode === "legacy-project-projection"
        ? ["The Brain is using the compatibility Design Graph projection until an architect materializes the canonical graph."]
        : []),
    ])],
    ...(input.context ? { context: input.context } : {}),
    ...(input.reasoning ? { reasoning: input.reasoning } : {}),
    ...(input.quality ? { quality: input.quality } : {}),
    ...(input.lineagePaths ? { lineagePaths: input.lineagePaths } : {}),
  };
}

export function architectureBrainAuthorityAudit(
  applicationVersion = "0.10.0-rc.10.73.5",
): ArchitectureBrainAuthorityAudit {
  const paths: ArchitectureBrainAuthorityAudit["paths"] = [
    {
      id: "canonical-design-graph",
      capability: "Canonical Architecture Design Graph projection and architect-approved materialization",
      category: "architecture-runtime",
      entryPoint: "/api/projects/:projectId/branches/:branchId/design-graph/preview",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "human-approved-change-set",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes: "All Brain receipts are pinned to a deterministic Design Graph fingerprint. Requirements, evidence, interfaces, decisions, findings and risks become graph-primary in rc.10.73.1; legacy fields remain compatibility projections.",
    },
    {
      id: "durable-brain-transactions",
      capability: "Durable Brain proposal, deterministic verification, independent review, waiver and commit ledger",
      category: "architecture-runtime",
      entryPoint: "/api/projects/:projectId/branches/:branchId/brain-transactions",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "human-approved-change-set",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes:
        "Every bounded cognitive call is post-validated against an explicit schema, provider-bound prompts are redacted, and claim-bearing outputs are constrained to approved grounding with deterministic citation and entailment checks. The durable transaction and human-approval boundary remains authoritative.",
    },
    {
      id: "workspace-projection",
      capability: "Workspace recommendations, validation and Brain signals",
      category: "architecture-runtime",
      entryPoint: "/api/architecture-brain/workspace-projection",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "none",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes:
        "The browser receives a governed projection and owns no competing recommendation engine.",
    },
    {
      id: "requirements-distillation",
      capability: "Requirements Intelligence distillation",
      category: "architecture-runtime",
      entryPoint: "/api/requirements-intelligence/distill",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "human-approved-change-set",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes:
        "LLM enrichment and deterministic compilation are fused behind one receipt.",
    },
    {
      id: "system-context",
      capability: "System Context compilation and acceptance",
      category: "architecture-runtime",
      entryPoint:
        "/api/projects/:projectId/branches/:branchId/system-context/preview",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "human-approved-change-set",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes:
        "The server compiles the context topology from accepted journeys; the browser only previews and accepts it.",
    },
    {
      id: "design-brief",
      capability: "Design brief analysis",
      category: "architecture-runtime",
      entryPoint: "/api/design-brief/analyse",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "none",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes: "Produces a non-mutating proposal.",
    },
    {
      id: "stage-co-author",
      capability: "Stage field drafting and rationale",
      category: "architecture-runtime",
      entryPoint: "/api/projects/:projectId/branches/:branchId/stage-co-author",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "human-approved-change-set",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes:
        "The browser no longer owns a competing architecture recommendation path.",
    },
    {
      id: "living-canvas",
      capability: "Generative cursor actions",
      category: "architecture-runtime",
      entryPoint:
        "/api/projects/:projectId/branches/:branchId/living-canvas/actions",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "human-approved-change-set",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes:
        "Deterministic actions are authoritative; LLM output is candidate enrichment.",
    },
    {
      id: "co-architect",
      capability: "Ask Sol explain and challenge",
      category: "architecture-runtime",
      entryPoint: "/api/co-architect/ask",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "none",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes: "Uses the same manifest and receipt as other design surfaces.",
    },
    {
      id: "design-ranking",
      capability: "Style ranking explanation",
      category: "architecture-runtime",
      entryPoint: "/api/design/explain-ranking",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "none",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes: "Explanation cannot alter deterministic scores.",
    },
    {
      id: "stage-advice",
      capability: "Stage guidance",
      category: "architecture-runtime",
      entryPoint: "/api/design/stage-advice",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "none",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes: "Context and LLM contribution are recorded consistently.",
    },
    {
      id: "synthesis",
      capability: "Architecture alternatives and trade-off narratives",
      category: "architecture-runtime",
      entryPoint: "/api/synthesis/runs",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "human-approved-change-set",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes:
        "The kernel generates alternatives; the LLM may only explain them.",
    },
    {
      id: "assisted-audit",
      capability: "LLM-assisted architecture audit",
      category: "architecture-runtime",
      entryPoint: "/api/audits/assisted",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "none",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes: "Assurance output remains advisory until reviewer disposition.",
    },
    {
      id: "review-studio",
      capability: "Whole-design architecture review and review-derived delivery evidence",
      category: "architecture-runtime",
      entryPoint: "/api/review-studio/run",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "none",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes:
        "Review generation executes through the Brain runtime; delivery-pack and ADR projections consume the governed review result.",
    },
    {
      id: "legacy-project-intelligence-aliases",
      capability: "Compatibility endpoints for recommendation, validation, governance, policy and event evaluation",
      category: "architecture-runtime",
      entryPoint:
        "/api/recommendations, /api/validate, /api/audits/deterministic, /api/intelligence/evaluate, /api/governance/evaluate, /api/governance/approval-readiness, /api/policy-gates/evaluate, /api/synthesis/assess",
      orchestrated: true,
      directLlmAllowed: false,
      mutationAuthority: "none",
      owner: "AIW Brain Orchestrator",
      status: "consolidated",
      notes:
        "The routes are non-authoritative compatibility aliases. They emit deprecation and Brain-authority headers and delegate to the same runtime boundary as canonical surfaces.",
    },
    {
      id: "knowledge-extraction",
      capability: "Mind Factory knowledge extraction",
      category: "knowledge-supply-chain",
      entryPoint: "Mind Factory worker/routes",
      orchestrated: false,
      directLlmAllowed: true,
      mutationAuthority: "knowledge-governance",
      owner: "Mind Factory",
      status: "isolated-by-design",
      notes:
        "This path creates candidate claims, not project architecture. Promotion still requires independent approval.",
    },
    {
      id: "knowledge-promotion",
      capability: "Knowledge record drafting and promotion assistance",
      category: "knowledge-supply-chain",
      entryPoint: "Knowledge Operations",
      orchestrated: false,
      directLlmAllowed: true,
      mutationAuthority: "knowledge-governance",
      owner: "Mind Factory",
      status: "isolated-by-design",
      notes:
        "Kept outside the project Brain runtime to preserve separation of duties.",
    },
    {
      id: "llm-health-probe",
      capability: "Provider health probe",
      category: "operational-control",
      entryPoint: "/api/llm-brain/active-probe",
      orchestrated: false,
      directLlmAllowed: true,
      mutationAuthority: "none",
      owner: "Platform Operations",
      status: "isolated-by-design",
      notes: "Operational probe does not perform architecture reasoning.",
    },
  ];
  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    applicationVersion,
    controllingPrinciple:
      "One Brain, one canonical model, one governed knowledge manifest, one proposal receipt and many interaction surfaces.",
    paths,
    summary: {
      totalPaths: paths.length,
      consolidatedPaths: paths.filter((item) => item.status === "consolidated")
        .length,
      isolatedByDesignPaths: paths.filter(
        (item) => item.status === "isolated-by-design",
      ).length,
      migrationRequiredPaths: paths.filter(
        (item) => item.status === "migration-required",
      ).length,
      blockedPaths: paths.filter((item) => item.status === "blocked").length,
    },
  };
}
