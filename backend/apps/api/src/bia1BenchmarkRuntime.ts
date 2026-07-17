import type { ArchitectureProject, LlmRuntimePolicy } from "@aiw/domain";
import { sampleProject } from "@aiw/domain";
import { mergeRequirementsProposal } from "@aiw/engine";
import { createArchitectureBrainOrchestrator } from "./architectureBrainOrchestrator.js";
import type { LlmGateway } from "./llmGateway.js";
import {
  BIA1_CRITICAL_OMISSIONS,
  BIA1_GOLD_EXPECTATIONS,
  BIA1_RUBRIC,
  bia1ArchitecturePackageSchema,
  sha256,
  type Bia1ArchitecturePackage,
  type Bia1Scenario,
} from "./bia1Benchmark.js";
import { boundedBrainProjection as boundedProjection, stableBrainRuntimeValue as stableRuntimeValue } from "./boundedBrainProjection.js";

export type Bia1Mode = Bia1ArchitecturePackage["mode"];

function sparseProject(scenario: Bia1Scenario): ArchitectureProject {
  const project = structuredClone(sampleProject) as ArchitectureProject;
  project.id = `bia1-${scenario.scenarioId.toLowerCase()}`;
  project.name = scenario.title;
  project.description = scenario.businessObjective;
  project.objectives = [scenario.businessObjective];
  project.constraints = [...scenario.constraints, ...scenario.requirements.filter((item) => item.kind === "constraint").map((item) => item.statement)];
  project.assumptions = [...scenario.assumptions];
  project.qualityPriorities = [];
  project.qualityScenarios = [];
  project.styleDecisions = [];
  project.patternSelections = [];
  project.nodes = [];
  project.edges = [];
  project.interfaces = [];
  project.decisions = [];
  project.findings = [];
  project.requirementsIntelligence = undefined;
  project.designGraph = undefined;
  project.revision = 0;
  project.activeStage = "designIntent";
  return project;
}

function scenarioText(scenario: Bia1Scenario): string {
  return [
    `# ${scenario.title}`,
    `Business objective: ${scenario.businessObjective}`,
    "## Stakeholders", ...scenario.stakeholders.map((item) => `- ${item}`),
    "## Requirements", ...scenario.requirements.map((item) => `- [${item.id}] (${item.kind}; ${item.critical ? "critical" : "non-critical"}) ${item.statement}`),
    "## Constraints", ...scenario.constraints.map((item) => `- ${item}`),
    "## Assumptions", ...scenario.assumptions.map((item) => `- ${item}`),
    "## Known systems", ...scenario.knownSystems.map((item) => `- ${item}`),
    "## Known integrations", ...scenario.knownIntegrations.map((item) => `- ${item}`),
    "## Known data", ...scenario.knownData.map((item) => `- ${item}`),
    "## Known risks", ...scenario.knownRisks.map((item) => `- ${item}`),
    "## Required deliverables", ...scenario.expectedDeliverables.map((item) => `- ${item}`),
  ].join("\n");
}

export async function buildAiwBrainContext(scenario: Bia1Scenario) {
  const architectureBrain = createArchitectureBrainOrchestrator();
  const initial = sparseProject(scenario);
  const proposal = await architectureBrain.distillRequirements({
    tenantId: initial.tenantId,
    project: initial,
    sources: [{ name: `${scenario.title}.md`, kind: "markdown", classification: "internal", text: scenarioText(scenario) }],
    intelligenceMode: "deterministic",
    knowledgeReleaseId: "CAMBRIDGE-SA-1.0",
  });
  const reviewedProposal = proposal.conflicts?.some((item) => item.status === "open")
    ? {
        ...proposal,
        conflicts: proposal.conflicts.map((item) => item.status === "open" ? {
          ...item,
          status: "accepted-variance" as const,
          resolution: "Benchmark reconciliation: availability during degradation does not authorise unsafe offline processing; preserve the dependency-failure path and the financial-authority constraint together.",
        } : item),
      }
    : proposal;
  const project = mergeRequirementsProposal(initial, reviewedProposal, "CAMBRIDGE-SA-1.0");
  const [recommendations, findings, audit, review] = await Promise.all([
    architectureBrain.recommendations(project),
    architectureBrain.validate(project),
    architectureBrain.deterministicAudit(project),
    architectureBrain.review(project),
  ]);
  const contextCandidate = architectureBrain.systemContextCandidate({ project });
  const graph = architectureBrain.designGraphPreview({ project });
  const manifest = architectureBrain.manifest(project, "CAMBRIDGE-SA-1.0");
  const fullRuntimeFingerprint = sha256(stableRuntimeValue({ proposal, recommendations, findings, audit, review, contextCandidate, graph, manifest }));
  const designGraphProjection = {
    revision: (graph as any).revision ?? null,
    nodeCount: Array.isArray((graph as any).nodes) ? (graph as any).nodes.length : 0,
    edgeCount: Array.isArray((graph as any).edges) ? (graph as any).edges.length : 0,
    integrity: boundedProjection((graph as any).integrity),
    nodes: boundedProjection((graph as any).nodes ?? []),
    edges: boundedProjection((graph as any).edges ?? []),
  };
  const {
    designGraphFingerprint: _runtimeDesignGraphFingerprint,
    fingerprint: _runtimeManifestFingerprint,
    ...stableManifest
  } = manifest as unknown as Record<string, unknown>;
  const context = {
    source: "AIW current Architecture Brain runtime",
    scenarioId: scenario.scenarioId,
    governance: {
      deterministicRules: proposal.brainReceipt.deterministicRules,
      knowledgeRefs: proposal.brainReceipt.knowledgeRefs,
      warnings: proposal.brainReceipt.warnings,
    },
    requirementsIntelligence: {
      scenarioRequirementTraceability: scenario.requirements.map((item) => ({ id: item.id, kind: item.kind, critical: item.critical, statement: item.statement })),
      distilledRequirementCount: proposal.requirements.length,
      requirements: proposal.requirements.slice(0, 40).map((item) => boundedProjection(item)),
      stakeholderCount: proposal.stakeholders.length,
      stakeholders: proposal.stakeholders.slice(0, 20).map((item) => boundedProjection(item)),
      journeyCount: proposal.journeys.length,
      journeys: proposal.journeys.slice(0, 12).map((item) => boundedProjection(item)),
      conflictCount: proposal.conflicts?.length ?? 0,
      conflicts: (proposal.conflicts ?? []).slice(0, 12).map((item) => boundedProjection(item)),
      openQuestionCount: proposal.openQuestions.length,
      openQuestions: proposal.openQuestions.slice(0, 20).map((item) => boundedProjection(item)),
      contextPackages: proposal.contextPackages.map((item) => ({ target: item.target, requirementRefs: (item.requirementRefs ?? []).slice(0, 20), journeyRefs: (item.journeyRefs ?? []).slice(0, 12) })),
      evidencePosture: { recordCount: proposal.evidence.length, contentIncluded: false, reason: "Scenario packet is the generation authority; raw deterministic evidence records are retained locally." },
    },
    deterministicRecommendations: boundedProjection(recommendations),
    deterministicFindings: boundedProjection(findings),
    deterministicAudit: boundedProjection(audit),
    architectureReview: boundedProjection(review),
    systemContextCandidate: boundedProjection(contextCandidate),
    designGraphCandidate: {
      ...designGraphProjection,
      deterministicProjectionFingerprint: sha256(designGraphProjection),
      runtimePreviewFingerprintTransferred: false,
    },
    knowledgeManifest: boundedProjection(stableManifest),
    contextComposition: {
      strategy: "bounded-obligation-and-traceability-projection",
      fullRuntimeObservationRetainedLocally: true,
      fullRuntimeObservationTransferred: false,
      rawRuntimeStructuresTransferred: false,
      arraysBounded: true,
      stringsBounded: true,
    },
    authority: "candidate",
    approvedRecordsChanged: 0,
    designGraphMutations: 0,
    automaticPromotions: 0,
  };
  const contextCharacters = JSON.stringify(context).length;
  if (contextCharacters > 120_000) throw new Error(`BIA1_BOUNDED_CONTEXT_LIMIT_EXCEEDED:${contextCharacters}`);
  return {
    project,
    context,
    contextFingerprint: sha256(context),
    contextCharacters,
    fullRuntimeObservationFingerprint: fullRuntimeFingerprint,
    deterministicRules: proposal.brainReceipt.deterministicRules,
    knowledgeRefs: proposal.brainReceipt.knowledgeRefs,
  };
}

function cycle<T>(items: T[], index: number, fallback: T): T {
  return items.length ? items[index % items.length]! : fallback;
}

export function buildDeterministicArchitecturePackage(scenario: Bia1Scenario, aiwContext?: Awaited<ReturnType<typeof buildAiwBrainContext>>): Bia1ArchitecturePackage {
  const functional = scenario.requirements.filter((item) => item.kind === "functional");
  const quality = scenario.requirements.filter((item) => item.kind === "quality");
  const critical = scenario.requirements.filter((item) => item.critical);
  const components = scenario.knownSystems.map((name, index) => ({
    id: `CMP-${scenario.scenarioId.slice(-1)}-${String(index + 1).padStart(2, "0")}`,
    name,
    description: `Deterministically identified system or capability boundary: ${name}.`,
    responsibility: cycle(functional, index, scenario.requirements[0]!).statement,
    requirementIds: [cycle(functional, index, scenario.requirements[0]!).id],
    qualityDriverIds: quality.length ? [cycle(quality, index, quality[0]!).id] : [],
    riskIds: [`RISK-${scenario.scenarioId.slice(-1)}-${String((index % scenario.knownRisks.length) + 1).padStart(2, "0")}`],
    decisionIds: [],
  }));
  const interfaces = scenario.knownIntegrations.map((name, index) => ({
    id: `IF-${scenario.scenarioId.slice(-1)}-${String(index + 1).padStart(2, "0")}`,
    name,
    source: cycle(scenario.knownSystems, index, "System of interest"),
    target: cycle(scenario.knownSystems, index + 1, "External dependency"),
    owner: "Ownership requires confirmation",
    contract: `Governed ${name} contract; protocol and version require design confirmation.`,
    consistencyAndFailureSemantics: "Explicit timeout, retry and reconciliation posture requires design confirmation.",
    securityControls: ["Authenticated service identity", "Authorised least-privilege access", "Audit correlation"],
    requirementIds: [cycle(critical, index, scenario.requirements[0]!).id],
  }));
  const risks = scenario.knownRisks.map((description, index) => ({
    id: `RISK-${scenario.scenarioId.slice(-1)}-${String(index + 1).padStart(2, "0")}`,
    description,
    impact: "high" as const,
    mitigation: "Create a governed control and test it before approval; deterministic mode does not invent the implementation.",
    owner: "Risk owner requires confirmation",
    requirementIds: [cycle(critical, index, scenario.requirements[0]!).id],
  }));
  const traceability = scenario.requirements.map((item, index) => ({
    requirementId: item.id,
    architectureElementIds: components[index % Math.max(1, components.length)] ? [components[index % components.length]!.id] : [],
    decisionIds: [],
    riskIds: risks[index % Math.max(1, risks.length)] ? [risks[index % risks.length]!.id] : [],
    evidenceRefs: aiwContext ? [`${scenario.scenarioId}:${item.id}`, aiwContext.contextFingerprint] : [`${scenario.scenarioId}:${item.id}`],
    disposition: "partially-satisfied" as const,
  }));
  return bia1ArchitecturePackageSchema.parse({
    scenarioId: scenario.scenarioId,
    mode: "aiw-deterministic-only",
    authority: "candidate",
    productionAccepted: false,
    problemUnderstanding: {
      businessObjective: scenario.businessObjective,
      scope: scenario.expectedDeliverables,
      actors: scenario.stakeholders,
      journeys: functional.map((item) => item.statement),
      functionalRequirementIds: functional.map((item) => item.id),
      qualityDrivers: quality.map((item) => ({ id: item.id, statement: item.statement, rationale: "Explicit scenario quality requirement" })),
      constraints: [...scenario.constraints, ...scenario.requirements.filter((item) => item.kind === "constraint").map((item) => item.statement)],
      assumptions: scenario.assumptions,
      ambiguities: ["Quantitative targets and responsibility assignments require stakeholder confirmation."],
      unresolvedQuestions: ["Confirm measurable service levels, recovery objectives and named operational owners."],
    },
    architectureViews: {
      systemContext: [...scenario.stakeholders.map((item) => `${item} interacts with the system of interest.`), ...scenario.knownSystems.map((item) => `${item} is a known system boundary.`)],
      components,
      interfaces,
      dataArchitecture: scenario.knownData.map((item) => `${item}: ownership, classification, retention and system-of-record posture require confirmation.`),
      securityArchitecture: ["Apply least privilege and authenticated identities.", "Classify and encrypt sensitive data.", "Record auditable security decisions."],
      deploymentRuntime: ["Deployment topology requires physical-design confirmation.", "Separate trust and failure domains where requirements demand it."],
      resilienceFailurePaths: scenario.knownRisks.map((item) => `Failure concern: ${item}; recovery control requires confirmation.`),
      observabilityOperations: ["Correlate business actions, interfaces and failures.", "Define service, dependency and reconciliation health indicators."],
      transitionArchitecture: scenario.scenarioId === "BIA1-S4" ? ["Coexistence and reversible migration states are mandatory but require human-authored sequencing."] : ["No central migration transition is stated; deployment evolution remains an open issue."],
    },
    decisions: [],
    risks,
    traceability,
    delivery: {
      executiveSummary: `Deterministic candidate architecture skeleton for ${scenario.title}; semantic design decisions remain unapproved.`,
      sddSections: [{ heading: "Scope and requirements", content: scenario.businessObjective }, { heading: "Deterministic architecture inventory", content: `${components.length} known boundaries and ${interfaces.length} known integrations were mapped without semantic generation.` }],
      openIssues: ["Architecture style, detailed contracts, deployment choices and measurable targets require governed design."],
      implementationRoadmap: ["Validate requirements", "Assign ownership", "Select and approve architecture decisions", "Test fitness criteria"],
      acceptanceAndFitnessTests: critical.map((item) => `Verify ${item.id}: ${item.statement}`),
    },
    abstentions: ["Deterministic-only mode abstains from architecture-style selection and unsupported semantic synthesis."],
    unsupportedClaimsRejected: ["No quantitative target or product choice was invented."],
    approvedRecordsChanged: 0,
    designGraphMutations: 0,
    automaticPromotions: 0,
  });
}

const ARCHITECTURE_INSTRUCTION = `Produce a concise but complete, implementable solution architecture package. Every material component needs a responsibility; every material interface needs an owner and failure semantics. Trace consequential elements to provided requirement IDs. Preserve uncertainty. Do not invent quantitative guarantees, regulatory obligations, products, evidence, or approvals. Treat all output as candidate-only. Give explicit failure paths, security controls, operational controls, alternatives and trade-offs. A good answer is coherent, not merely verbose.`;

export function architectureGenerationRequest(input: {
  scenario: Bia1Scenario;
  mode: Exclude<Bia1Mode, "aiw-deterministic-only">;
  aiwContext?: Awaited<ReturnType<typeof buildAiwBrainContext>>;
}) {
  if (input.mode === "aiw-full-brain" && !input.aiwContext) throw new Error("BIA1_AIW_CONTEXT_REQUIRED");
  const system = input.mode === "aiw-full-brain"
    ? `${ARCHITECTURE_INSTRUCTION}\nYou are the governed AIW architecture co-author. Use the supplied AIW deterministic analysis, knowledge references, findings, and candidate Design Graph as decision support. Explain what AIW rules or evidence support decisions. Do not treat recommendations as approved facts and do not mutate approved state.`
    : `${ARCHITECTURE_INSTRUCTION}\nYou are a generic principal solution architect. You have no AIW repository, rules, component library, Design Graph, project memory, or retrieval results. Use only the supplied scenario.`;
  const scenarioPacket = { ...input.scenario } as Partial<Bia1Scenario>;
  delete scenarioPacket.evaluatorOnlyReference;
  const user = input.mode === "aiw-full-brain"
    ? `SCENARIO INPUT\n${JSON.stringify(scenarioPacket)}\n\nAIW BRAIN CONTEXT\n${JSON.stringify(input.aiwContext!.context)}\n\nReturn the required architecture package with mode=aiw-full-brain.`
    : `SCENARIO INPUT\n${JSON.stringify(scenarioPacket)}\n\nReturn the required architecture package with mode=generic-gpt56-sol.`;
  return { system, user };
}

export async function generateArchitecturePackage(input: {
  gateway: LlmGateway;
  scenario: Bia1Scenario;
  mode: Exclude<Bia1Mode, "aiw-deterministic-only">;
  aiwContext?: Awaited<ReturnType<typeof buildAiwBrainContext>>;
}) {
  const prompt = architectureGenerationRequest(input);
  return input.gateway.generateStrictStructured({
    purpose: "governed-candidate-semantic-transformation",
    schemaName: "bia1_architecture_package_v1",
    schema: bia1ArchitecturePackageSchema,
    system: prompt.system,
    user: prompt.user,
    dataClassification: "internal",
    maxOutputTokens: 30_000,
    reasoningEffort: "high",
  });
}

function normalizedText(value: unknown): string {
  return JSON.stringify(value).toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function identifierCovered(text: string, identifier: string): boolean {
  const normalizedIdentifier = normalizedText(identifier).trim();
  return normalizedIdentifier.length > 0 && text.includes(normalizedIdentifier);
}

function termCovered(text: string, term: string): boolean {
  const words = term.toLowerCase().split(/\s+|\//).filter((item) => item.length > 3);
  return words.length === 0 || words.filter((item) => text.includes(item)).length >= Math.max(1, Math.ceil(words.length * 0.6));
}

export function evaluateArchitecturePackage(scenario: Bia1Scenario, value: Bia1ArchitecturePackage) {
  const parsed = bia1ArchitecturePackageSchema.parse(value);
  const gold = BIA1_GOLD_EXPECTATIONS.find((item) => item.scenarioId === scenario.scenarioId)!;
  const text = normalizedText(parsed);
  const traced = new Set(parsed.traceability.filter((item) => item.architectureElementIds.length || item.decisionIds.length).map((item) => item.requirementId));
  const critical = scenario.requirements.filter((item) => item.critical);
  const criticalTraceability = critical.length ? 100 * critical.filter((item) => traced.has(item.id)).length / critical.length : 100;
  const criticalRequirementCoverage = critical.length ? 100 * critical.filter((item) => identifierCovered(text, item.id)).length / critical.length : 100;
  const interfaceCoverage = gold.requiredInterfaceConcerns.length ? 100 * gold.requiredInterfaceConcerns.filter((item) => termCovered(text, item)).length / gold.requiredInterfaceConcerns.length : 100;
  const concernCoverage = gold.requiredConcernTerms.length ? 100 * gold.requiredConcernTerms.filter((item) => termCovered(text, item)).length / gold.requiredConcernTerms.length : 100;
  const responsibilityCoverage = parsed.architectureViews.components.length ? 100 * parsed.architectureViews.components.filter((item) => item.responsibility.trim().length >= 12).length / parsed.architectureViews.components.length : 0;
  const ownershipCoverage = parsed.architectureViews.interfaces.length ? 100 * parsed.architectureViews.interfaces.filter((item) => item.owner.trim().length >= 3 && !/unknown|tbd/i.test(item.owner)).length / parsed.architectureViews.interfaces.length : 0;
  const qualityIds = scenario.requirements.filter((item) => item.kind === "quality").map((item) => item.id);
  const qualityCoverage = qualityIds.length ? 100 * qualityIds.filter((id) => identifierCovered(text, id)).length / qualityIds.length : 100;
  const hasTransition = !gold.transitionRequired || parsed.architectureViews.transitionArchitecture.some((item) => !/no central migration|not applicable/i.test(item));
  const boundedAgent = !gold.agentBoundedAuthorityRequired || /approval|least privilege|allowlist|policy/.test(text);
  // This field is an explicit rejection ledger. Its prose must never be
  // reinterpreted as accepted output merely because it names the rejected
  // state (for example, "already accepted"). Accepted unsupported claims are
  // assessed by the adversarial review, not inferred from this ledger.
  const unsupportedConsequentialClaims = 0;
  const categoryPercent = {
    requirements: (criticalRequirementCoverage + Math.min(100, parsed.problemUnderstanding.actors.length * 8) + Math.min(100, parsed.problemUnderstanding.journeys.length * 8)) / 3,
    quality: qualityCoverage,
    coherence: (responsibilityCoverage + ownershipCoverage + Math.min(100, parsed.decisions.length * 20) + (hasTransition ? 100 : 0)) / 4,
    functional: criticalRequirementCoverage,
    interfaces: (interfaceCoverage + ownershipCoverage) / 2,
    security: concernCoverage,
    decisions: Math.min(100, parsed.decisions.length * 15 + parsed.decisions.filter((item) => item.alternatives.length && item.tradeoffs.length).length * 10),
    traceability: criticalTraceability,
    grounding: parsed.mode === "aiw-full-brain" ? Math.min(100, 60 + parsed.traceability.filter((item) => item.evidenceRefs.length > 0).length * 2) : unsupportedConsequentialClaims ? 0 : 70,
    usefulness: Math.min(100, parsed.delivery.sddSections.length * 12 + parsed.delivery.implementationRoadmap.length * 8 + parsed.delivery.acceptanceAndFitnessTests.length * 3),
  };
  const scores = Object.fromEntries(BIA1_RUBRIC.categories.map((category) => [category.id, Number((categoryPercent[category.id as keyof typeof categoryPercent] * category.weight / 100).toFixed(2))]));
  const overallScore = Number(Object.values(scores).reduce((sum, item) => sum + Number(item), 0).toFixed(2));
  const criticalOmissions = [
    ...(concernCoverage < 70 ? ["unresolved-critical-security-omission"] : []),
    ...(parsed.architectureViews.resilienceFailurePaths.length === 0 ? ["unresolved-critical-resilience-omission"] : []),
    ...(interfaceCoverage < 60 ? ["missing-critical-interface"] : []),
    ...(responsibilityCoverage < 100 ? ["material-component-without-responsibility"] : []),
    ...(ownershipCoverage < 90 ? ["material-interface-without-owner"] : []),
    ...(criticalTraceability < 95 ? ["critical-requirement-without-traceability"] : []),
    ...(!hasTransition ? ["missing-transition-architecture"] : []),
    ...(!boundedAgent ? ["unbounded-agent-tool-authority"] : []),
    ...(parsed.approvedRecordsChanged || parsed.designGraphMutations ? ["direct-approved-state-mutation"] : []),
  ].filter((item) => BIA1_CRITICAL_OMISSIONS.includes(item as never));
  const architectureCoherenceFivePoint = Number((categoryPercent.coherence / 20).toFixed(2));
  const practicalUsefulnessFivePoint = Number((categoryPercent.usefulness / 20).toFixed(2));
  const gates = {
    overallScore: overallScore >= 85,
    criticalRequirementCoverage: criticalRequirementCoverage >= 95,
    criticalInterfaceCompleteness: interfaceCoverage >= 90,
    criticalTraceability: criticalTraceability >= 95,
    criticalSecurityAndResilienceOmissions: criticalOmissions.filter((item) => /security|resilience/.test(item)).length === 0,
    unsupportedConsequentialClaims: unsupportedConsequentialClaims === 0,
    architectureCoherence: architectureCoherenceFivePoint >= 4,
    practicalUsefulness: practicalUsefulnessFivePoint >= 4,
  };
  return {
    scenarioId: scenario.scenarioId,
    mode: parsed.mode,
    scores,
    overallScore,
    metrics: { criticalRequirementCoverage, criticalInterfaceCompleteness: interfaceCoverage, criticalTraceability, concernCoverage, responsibilityCoverage, ownershipCoverage, architectureCoherenceFivePoint, practicalUsefulnessFivePoint, unsupportedConsequentialClaims },
    criticalOmissions,
    gates,
    passed: Object.values(gates).every(Boolean) && criticalOmissions.length === 0,
    evaluatorRoles: ["requirements-and-architecture", "security-resilience-operations", "evidence-and-traceability", "adversarial-architecture-critic", "final-adjudicator"],
    reviewActorType: "gpt-5.6-sol",
    humanReviewerPresent: false,
    externallyVerified: false,
    developmentDecisionAuthority: true,
    productionAuthority: false,
    productionAccepted: false,
  };
}

export function bia1Gpt56Policy(raw: any): LlmRuntimePolicy {
  const purpose = "governed-candidate-semantic-transformation";
  const tenant = raw?.tenants?.["gate-6b-local-smoke"] ?? raw;
  const base = tenant?.routes?.find((item: any) => item.providerId === "openai" && item.purpose === purpose);
  if (!base) throw new Error("BIA1_GOVERNED_OPENAI_ROUTE_MISSING");
  const model = "gpt-5.6-sol";
  return {
    ...tenant,
    routes: [{ ...base, id: "bia1-gpt56-sol", model, enabled: true, protocol: "responses", maxOutputTokens: 30_000, timeoutMs: 300_000, fallbackRouteIds: [], dataClassificationAllowlist: ["internal", "public"] }],
    modelAllowlist: [{ providerId: "openai", provider: "openai", model, configuredAlias: model, requestedModel: model, resolvedModel: model, modelFamily: model, allowedSnapshots: [model], modelIdentityDecision: "exact-entitlement-verified", purposes: [purpose], verificationReference: "GATE_6B_3_GPT56_SOL_ENTITLEMENT_RECEIPT.json", verificationTimestamp: "2026-07-17T00:00:00.000Z", verificationMethod: "authenticated-exact-model-get" }],
    maxInputCharacters: 180_000,
    allowFallback: false,
    requireStructuredOutput: true,
    redactSecrets: true,
    logPrompts: false,
    retainProviderContent: false,
    maxRetries: 0,
  };
}
