import type { ArchitectureProject, ArchitectureStage } from "@aiw/domain";
import { deliveryStages } from "./guidedDeliveryStages";
import type { DeliveryCheck, DeliveryLifecycleState, DeliveryStageAssessment, DeliveryStageId, DeliveryStageStatus } from "./guidedDeliveryTypes";

function hasText(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasText);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasText);
  return false;
}

function propertyValue(node: ArchitectureProject["nodes"][number], terms: string[]): boolean {
  return Object.entries(node.properties ?? {}).some(([key, value]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    return terms.some((term) => normalized.includes(term.replace(/[^a-z0-9]/g, ""))) && hasText(value);
  });
}

function nodeMatches(node: ArchitectureProject["nodes"][number], terms: string[]): boolean {
  const text = `${node.kind} ${node.label} ${node.description ?? ""} ${node.tags.join(" ")} ${JSON.stringify(node.properties)}`.toLowerCase();
  return terms.some((term) => text.includes(term.toLowerCase()));
}

function evidence(done: boolean, value: string): string | undefined {
  return done ? value : undefined;
}

function required(id: string, label: string, description: string, done: boolean, value: string, actionLabel?: string): DeliveryCheck {
  return {
    id,
    label,
    description,
    done,
    required: true,
    ...(done ? { evidence: value } : {}),
    ...(actionLabel ? { actionLabel } : {}),
  };
}

function recommended(id: string, label: string, description: string, done: boolean, value: string, actionLabel?: string): DeliveryCheck {
  return {
    id,
    label,
    description,
    done,
    required: false,
    ...(done ? { evidence: value } : {}),
    ...(actionLabel ? { actionLabel } : {}),
  };
}

function stageNodes(project: ArchitectureProject, stage: ArchitectureStage) {
  return project.nodes.filter((node) => node.stage === stage && node.status !== "deprecated");
}

function completionKey(project: ArchitectureProject, stageId: DeliveryStageId) {
  return `${project.id}:${project.branch.id}:${stageId}`;
}

function latestApproval(project: ArchitectureProject, stage: ArchitectureStage) {
  return [...project.stageApprovals].reverse().find((item) => item.stage === stage);
}

function scenarioComplete(scenario: ArchitectureProject["qualityScenarios"][number]) {
  return [scenario.source, scenario.stimulus, scenario.environment, scenario.artifact, scenario.response, scenario.responseMeasure].every((item) => item.trim().length > 0);
}

function scenarioCategoryLooksWrong(scenario: ArchitectureProject["qualityScenarios"][number]) {
  const text = `${scenario.source} ${scenario.stimulus} ${scenario.response} ${scenario.responseMeasure}`.toLowerCase();
  const securitySignal = /attack|credential|breach|fraud|unauthor|encrypt|identity|compromis|malicious/.test(text);
  return securitySignal && !/security|privacy/.test(scenario.attributeId.toLowerCase());
}

function acceptedPatternObligationsSatisfied(project: ArchitectureProject) {
  const accepted = project.patternSelections.filter((item) => item.status === "accepted");
  return accepted.length === 0 || accepted.every((item) => item.obligationsAcknowledged.length > 0);
}

function reviewBlockerCount(project: ArchitectureProject) {
  return project.findings.filter((finding) => finding.severity === "HARD").length;
}

function checksForStage(project: ArchitectureProject, stageId: DeliveryStageId, lifecycle?: DeliveryLifecycleState): DeliveryCheck[] {
  const context = project.context ?? {};
  const logicalNodes = stageNodes(project, "logicalApplication");
  const realizationNodes = stageNodes(project, "applicationRealization");
  const logicalTechnologyNodes = stageNodes(project, "logicalTechnology");
  const physicalNodes = stageNodes(project, "physicalTechnology");
  const acceptedStyles = project.styleDecisions.filter((item) => item.status === "accepted");
  const acceptedPatterns = project.patternSelections.filter((item) => item.status === "accepted");

  if (stageId === "requirements") {
    const intelligence = project.requirementsIntelligence;
    const acceptedRequirements = intelligence?.requirements.filter((item) => item.status === "accepted") ?? [];
    const acceptedJourneys = intelligence?.journeys.filter((item) => item.status === "accepted") ?? [];
    const acceptedStakeholders = intelligence?.stakeholders.filter((item) => item.status === "accepted") ?? [];
    return [
      required("problem", "Problem and outcome are explicit", "The brief must explain the problem, intended outcome and why the architecture is needed.", project.description.trim().length >= 40 || acceptedRequirements.some((item) => ["business", "functional"].includes(item.type) && item.statement.trim().length >= 40), `${project.description.trim().length} brief characters · ${acceptedRequirements.filter((item) => ["business", "functional"].includes(item.type)).length} accepted outcome requirement(s)`, "Complete problem statement"),
      required("objectives", "Business objectives are recorded", "Record at least two concrete objectives or success outcomes.", project.objectives.filter((item) => item.trim()).length >= 2 || acceptedRequirements.filter((item) => item.type === "business").length >= 2, `${project.objectives.length} objective(s) · ${acceptedRequirements.filter((item) => item.type === "business").length} accepted business requirement(s)`, "Generate or add objectives"),
      required("scope", "Scope boundary is defined", "Identify in-scope and out-of-scope capabilities.", (context.inScopeCapabilities?.length ?? 0) > 0 && (context.outOfScopeCapabilities?.length ?? 0) > 0, `${context.inScopeCapabilities?.length ?? 0} in scope · ${context.outOfScopeCapabilities?.length ?? 0} out of scope`, "Define scope"),
      required("stakeholders", "Stakeholders and approvers are identified", "At least one accountable stakeholder or architecture approver is required.", (context.stakeholders?.length ?? 0) > 0 || acceptedStakeholders.length > 0, `${context.stakeholders?.length ?? 0} context stakeholder(s) · ${acceptedStakeholders.length} accepted stakeholder(s)`, "Generate or add stakeholders"),
      required("constraints", "Constraints and existing systems are captured", "Record delivery, regulatory, platform or legacy constraints and the relevant existing estate.", (project.constraints.length > 0 || acceptedRequirements.some((item) => item.type === "constraint")) && ((context.existingSystems?.length ?? 0) > 0 || acceptedRequirements.some((item) => item.type === "integration")), `${project.constraints.length} legacy constraint(s) · ${acceptedRequirements.filter((item) => item.type === "constraint").length} canonical constraint(s) · ${context.existingSystems?.length ?? 0} existing system(s)`, "Capture constraints"),
      required("feasibility", "Enterprise feasibility context is complete", "Team, delivery horizon, operating maturity, deployment model and data sensitivity must be known or explicitly marked unknown.", Boolean(context.teamSize && context.deliveryHorizonMonths && context.operationalMaturity && context.deploymentModel && context.dataSensitivity), "Team, timeline, maturity, deployment and sensitivity captured", "Complete feasibility context"),
      required("journeys", "Major solution journeys are modelled", "Represent the critical happy, alternate and failure paths that later architecture must enable.", acceptedJourneys.length > 0, `${acceptedJourneys.length} accepted journey(s)`, "Generate Journey Atlas"),
      recommended("assumptions", "Assumptions are explicit", "Record assumptions that could invalidate the design if they change.", project.assumptions.length > 0, `${project.assumptions.length} assumption(s)`, "Add assumptions"),
    ];
  }

  if (stageId === "quality") {
    const highPriority = project.qualityPriorities.filter((item) => item.weight >= 3);
    const completeScenarios = project.qualityScenarios.filter(scenarioComplete);
    const mismatches = project.qualityScenarios.filter(scenarioCategoryLooksWrong);
    const distinctWeights = new Set(highPriority.map((item) => item.weight));
    return [
      required("drivers", "At least three drivers are prioritised", "Select the few quality attributes that materially shape the architecture.", highPriority.length >= 3, `${highPriority.length} priority driver(s)`, "Prioritise drivers"),
      required("scenarios", "At least three measurable scenarios are complete", "Each scenario must contain source, stimulus, environment, artifact, response and response measure.", completeScenarios.length >= 3 && completeScenarios.length === project.qualityScenarios.length, `${completeScenarios.length}/${project.qualityScenarios.length} complete scenario(s)`, "Complete scenarios"),
      required("classification", "Scenario categories match their content", "Security, privacy, resilience and other scenario signals must be classified correctly.", mismatches.length === 0, mismatches.length === 0 ? "No obvious classification mismatch" : `${mismatches.length} possible mismatch(es)`, "Review scenario categories"),
      required("security", "Security or privacy is represented", "A regulated or sensitive design must explicitly include a security/privacy scenario.", project.qualityScenarios.some((item) => /security|privacy/.test(item.attributeId.toLowerCase())), "Security/privacy scenario present", "Add security scenario"),
      required("resilience", "Reliability or recoverability is represented", "The driver pack must include failure and recovery behaviour.", project.qualityScenarios.some((item) => /reliab|availab|recover|resilien/.test(item.attributeId.toLowerCase())), "Resilience scenario present", "Add resilience scenario"),
      recommended("tradeoff", "Priorities express a trade-off", "Avoid assigning the same maximum weight to every important attribute.", distinctWeights.size > 1 || highPriority.length <= 3, `${distinctWeights.size} distinct priority level(s)`, "Review trade-offs"),
    ];
  }

  if (stageId === "context") {
    const intelligence = project.requirementsIntelligence;
    const acceptedRequirements = intelligence?.requirements.filter((item) => item.status === "accepted") ?? [];
    const acceptedJourneys = intelligence?.journeys.filter((item) => item.status === "accepted") ?? [];
    const acceptedStakeholders = intelligence?.stakeholders.filter((item) => item.status === "accepted") ?? [];
    const contextPackage = intelligence?.contextPackages.find((item) => item.target === "systemContext");
    const contextNodes = logicalNodes.filter((node) => node.tags.some((tag) => ["system-context", "context-actor", "context-external", "system-of-interest"].includes(tag)));
    const systemOfInterest = contextNodes.some((node) => node.tags.includes("system-of-interest"));
    const actorCount = contextNodes.filter((node) => node.tags.includes("context-actor")).length;
    const externalCount = contextNodes.filter((node) => node.tags.includes("context-external")).length;
    const contextNodeIds = new Set(contextNodes.map((node) => node.id));
    const interactionCount = project.edges.filter((edge) => edge.stage === "logicalApplication" && contextNodeIds.has(edge.sourceId) && contextNodeIds.has(edge.targetId)).length;
    const representedJourneyRefs = new Set(contextNodes.flatMap((node) => Array.isArray(node.properties?.journeyRefs) ? node.properties.journeyRefs as string[] : []));
    return [
      required("context-source", "Approved requirements context is available", "System Context must be generated from reviewed requirements rather than an untraceable blank canvas.", acceptedRequirements.length > 0 && Boolean(contextPackage), `${acceptedRequirements.length} accepted requirement(s) · ${contextPackage ? "compiled context available" : "context not compiled"}`, "Complete requirements distillation"),
      required("context-boundary", "System of interest is explicit", "Create one governed system boundary that represents what the solution is responsible for.", systemOfInterest, systemOfInterest ? "System of interest represented" : "System boundary missing", "Generate context model"),
      required("context-actors", "Major actors are represented", "Promote approved human and organisational actors into the context view.", actorCount > 0 || acceptedStakeholders.length === 0, `${actorCount} context actor(s) · ${acceptedStakeholders.length} accepted stakeholder(s)`, "Add actors"),
      required("context-externals", "External systems are represented", "Model external systems and existing estate that participate in approved journeys.", externalCount > 0 || (context.existingSystems?.length ?? 0) === 0, `${externalCount} external context system(s)`, "Add external systems"),
      required("context-interactions", "Context interactions are modelled", "Connect actors and external systems to the system of interest using meaningful outcomes and information exchanges.", interactionCount >= Math.min(2, Math.max(1, contextNodes.length - 1)), `${interactionCount} context relationship(s)`, "Connect context participants"),
      required("context-journeys", "Approved journeys inform the context", "Every critical journey should contribute participants or interactions to the System Context.", acceptedJourneys.length > 0, `${acceptedJourneys.length} accepted journey(s)`, "Approve journeys"),
      required("context-coverage", "Critical journey coverage is visible", "Context objects must preserve journey lineage so downstream decomposition can explain its source.", acceptedJourneys.length === 0 || representedJourneyRefs.size > 0, `${representedJourneyRefs.size}/${acceptedJourneys.length} journey reference(s) represented`, "Review journey coverage"),
      recommended("context-questions", "Critical context questions are resolved", "Resolve high-impact questions about boundaries, integrations and ownership before decomposition.", (intelligence?.openQuestions.filter((item) => item.status === "open" && (item.impact === "critical" || item.impact === "high")).length ?? 0) === 0, `${intelligence?.openQuestions.filter((item) => item.status === "open").length ?? 0} open question(s)`, "Resolve context questions"),
    ];
  }

  if (stageId === "logical") {
    const dataOwnership = logicalNodes.some((node) => propertyValue(node, ["dataowner", "ownership", "systemofrecord", "boundedcontext"]));
    const externalSystem = logicalNodes.some((node) => nodeMatches(node, ["external system", "core banking", "third party", "partner"]));
    const interfaceSignal = logicalNodes.some((node) => propertyValue(node, ["interface", "api", "event", "port", "contract"])) || project.edges.length >= 2;
    return [
      required("objects", "Logical actors, domains and services are modelled", "Create enough logical objects to express the problem boundary and responsibilities.", logicalNodes.length >= 3, `${logicalNodes.length} logical object(s)`, "Model logical architecture"),
      required("style", "A style decision is accepted with rationale", "The architecture direction must be selected and justified against drivers and feasibility.", acceptedStyles.some((item) => item.rationale.trim().length >= 20), `${acceptedStyles.length} accepted style(s)`, "Choose architecture style"),
      required("relationships", "Key interactions are connected", "Model the primary business and integration relationships.", project.edges.filter((edge) => edge.stage === "logicalApplication").length >= 2, `${project.edges.filter((edge) => edge.stage === "logicalApplication").length} logical relationship(s)`, "Connect components"),
      required("ownership", "Data or bounded-context ownership is explicit", "At least one logical component must identify data ownership or bounded context.", dataOwnership, "Ownership metadata found", "Define ownership"),
      required("existing", "Existing and external systems appear in the model", "The logical view must reflect the relevant existing estate captured in the brief.", (context.existingSystems?.length ?? 0) === 0 || externalSystem, externalSystem ? "External/existing system represented" : "No external system represented", "Add existing systems"),
      required("interfaces", "Interfaces or event semantics are identified", "Relationships alone are insufficient; identify the contract, port, API or event responsibility.", interfaceSignal, "Interface or contract signal present", "Define interfaces"),
      required("obligations", "Accepted pattern obligations are acknowledged", "A pattern cannot be accepted without its implementation and assurance obligations.", acceptedPatternObligationsSatisfied(project), `${acceptedPatterns.length} accepted pattern(s)`, "Review pattern obligations"),
    ];
  }

  if (stageId === "realization") {
    const lineage = realizationNodes.filter((node) => node.lineageFrom.length > 0);
    const contracts = realizationNodes.filter((node) => propertyValue(node, ["api", "interface", "contract", "event", "protocol", "inbound", "outbound"]));
    const owners = realizationNodes.filter((node) => propertyValue(node, ["owner", "team", "support"]));
    const runtime = realizationNodes.filter((node) => propertyValue(node, ["runtime", "deployment", "technology", "language", "framework"]));
    const workersComplete = realizationNodes.filter((node) => nodeMatches(node, ["worker", "consumer"]))
      .every((node) => propertyValue(node, ["retry", "deadletter", "dlq", "idempot", "ordering", "event"]));
    return [
      required("objects", "Applications, APIs and deployable units are modelled", "Translate logical responsibilities into implementable units.", realizationNodes.length >= 3, `${realizationNodes.length} realization object(s)`, "Model realization"),
      required("lineage", "Every realization object traces upstream", "Each application component must identify the logical component it realizes.", realizationNodes.length > 0 && lineage.length === realizationNodes.length, `${lineage.length}/${realizationNodes.length} with lineage`, "Add lineage"),
      required("contracts", "Interfaces and contracts are defined", "APIs, events and integrations need protocol, ownership and failure semantics.", contracts.length >= Math.min(2, realizationNodes.length), `${contracts.length} component(s) with contract metadata`, "Define contracts"),
      required("owners", "Every deployable unit has an owner", "Assign product, engineering or operations ownership.", realizationNodes.length > 0 && owners.length === realizationNodes.length, `${owners.length}/${realizationNodes.length} owned`, "Assign owners"),
      required("runtime", "Runtime intention is specified", "Avoid leaving implementation runtime and deployment expectations as TBD.", realizationNodes.length > 0 && runtime.length === realizationNodes.length, `${runtime.length}/${realizationNodes.length} with runtime metadata`, "Specify runtime"),
      required("workers", "Asynchronous workers define failure semantics", "Consumers must define event, retry, idempotency and dead-letter behaviour.", workersComplete, "Worker failure semantics complete", "Complete worker semantics"),
    ];
  }

  if (stageId === "logicalTechnology") {
    const traced = logicalTechnologyNodes.filter((node) => node.lineageFrom.length > 0);
    const security = logicalTechnologyNodes.some((node) => nodeMatches(node, ["identity", "security", "iam", "secret", "key management", "policy"]));
    const data = logicalTechnologyNodes.some((node) => nodeMatches(node, ["database", "data platform", "cache", "storage", "stream"]));
    const observability = logicalTechnologyNodes.some((node) => nodeMatches(node, ["observability", "monitoring", "logging", "tracing", "metrics"]));
    const decision = project.decisions.some((item) => item.title.toLowerCase().includes("technology") || item.drivers.some((driver) => driver.toLowerCase().includes("technology")));
    return [
      required("objects", "Required platform capabilities are modelled", "Cover runtime, integration, data, security and observability needs.", logicalTechnologyNodes.length >= 4, `${logicalTechnologyNodes.length} technology object(s)`, "Model capabilities"),
      required("trace", "Capabilities trace to application needs", "Every capability must identify the application component or driver it supports.", logicalTechnologyNodes.length > 0 && traced.length === logicalTechnologyNodes.length, `${traced.length}/${logicalTechnologyNodes.length} with lineage`, "Link capabilities"),
      required("security", "Identity, secrets or security capability is present", "Security cannot remain an implicit cross-cutting concern.", security, "Security capability present", "Add security capability"),
      required("data", "Data-management capability is present", "Model storage, data processing, caching or streaming where relevant.", data, "Data capability present", "Add data capability"),
      required("observability", "Observability capability is present", "Logs, metrics and traces must be part of the technology design.", observability, "Observability capability present", "Add observability"),
      required("obligations", "Pattern obligations are satisfied or assigned", "Technology selection must close obligations created earlier.", acceptedPatternObligationsSatisfied(project), "Pattern obligations acknowledged", "Resolve obligations"),
      recommended("decision", "Technology decision is recorded", "Capture alternatives, operational burden and standards impact.", decision, `${project.decisions.length} total decision(s)`, "Record technology decision"),
    ];
  }

  if (stageId === "physicalTechnology") {
    const region = physicalNodes.some((node) => nodeMatches(node, ["region", "location", "datacenter", "data centre"]));
    const zones = physicalNodes.filter((node) => nodeMatches(node, ["availability zone", "zone"]));
    const network = physicalNodes.some((node) => nodeMatches(node, ["network", "trust zone", "subnet", "firewall", "ingress", "egress"]));
    const resilience = physicalNodes.some((node) => propertyValue(node, ["failover", "redundancy", "replica", "backup", "rto", "rpo", "recovery", "multiaz", "availabilityzones"]));
    const capacity = physicalNodes.some((node) => propertyValue(node, ["capacity", "sizing", "cost", "throughput", "autoscal", "replica"]));
    const runtimeEvidence = project.runtimeInventories.length > 0 || project.inventoryCollectors.length > 0 || project.deploymentProfiles.length > 0;
    return [
      required("objects", "Deployment topology is modelled", "Create regions, environments, zones, clusters and runtime nodes.", physicalNodes.length >= 4, `${physicalNodes.length} physical object(s)`, "Model deployment"),
      required("region", "Location and residency placement is explicit", "Represent the required region or data-centre location and sovereignty boundary.", region, "Region/location represented", "Define regions"),
      required("zones", "Redundancy spans multiple zones or failure domains", "Do not claim multi-zone resilience from a single zone object or an unverified property.", zones.length >= 2, `${zones.length} explicit zone object(s)`, "Add failure domains"),
      required("network", "Network and trust boundaries are modelled", "Represent ingress, egress, private zones and protected data paths.", network, "Network/trust boundary represented", "Model network zones"),
      required("resilience", "Recovery and failover are defined", "Specify failover, backup, recovery objectives and degraded operation.", resilience && Boolean(context.recoveryObjectives), "Resilience metadata and recovery objective present", "Define recovery"),
      required("capacity", "Capacity or cost assumptions are recorded", "Document sizing, autoscaling, throughput or cost constraints.", capacity, "Capacity/cost metadata present", "Add capacity assumptions"),
      recommended("evidence", "Runtime evidence is attached", "Attach inventory, collector or deployment-profile evidence before production acceptance.", runtimeEvidence, `${project.runtimeInventories.length} inventory · ${project.inventoryCollectors.length} collector · ${project.deploymentProfiles.length} profile`, "Attach runtime evidence"),
    ];
  }

  if (stageId === "review") {
    const approval = latestApproval(project, "validationRealization");
    const completedAssignment = project.reviewAssignments.some((item) => item.stage === "validationRealization" && item.status === "completed");
    const openHard = reviewBlockerCount(project);
    return [
      required("record", "A review run is persisted", "Persist the review summary and findings against the current project revision.", project.aiReviewHistory.length > 0, `${project.aiReviewHistory.length} review record(s)`, "Record review"),
      required("findings", "Material findings are persisted", "The governed project must contain the review findings, not only render them temporarily.", project.findings.length > 0, `${project.findings.length} persisted finding(s)`, "Persist findings"),
      required("decisions", "ADRs and fitness evidence are recorded", "Convert accepted recommendations into governed decisions and fitness-test artifacts.", project.decisions.length > 0, `${project.decisions.length} decision(s)`, "Record outputs"),
      required("blockers", "No unresolved hard blocker remains", "Resolve the issue or record an authorised waiver before approval.", openHard === 0, `${openHard} hard blocker(s)`, "Resolve blockers"),
      required("assignment", "Independent review is completed", "A named reviewer must complete the assigned review where policy requires it.", !project.collaborationSettings.requireIndependentReviewer || completedAssignment, completedAssignment ? "Independent review completed" : "Independent review outstanding", "Assign reviewer"),
      required("approval", "The submitted baseline has a disposition", "Submit an immutable baseline and record approval, changes requested or rejection.", approval?.status === "approved", approval ? `Latest disposition: ${approval.status}` : "No disposition", "Submit for approval"),
    ];
  }

  const reviewApproval = latestApproval(project, "validationRealization");
  const generatedSddArtifact = lifecycle?.artifacts?.some((item) => item.stepId === "sdd" && (item.status === "generated" || item.status === "downloaded")) ?? false;
  return [
    required("approved", "Review baseline is approved", "A final governed pack cannot be generated from an unapproved design.", reviewApproval?.status === "approved", reviewApproval ? `Review status: ${reviewApproval.status}` : "No review approval", "Complete review"),
    required("blockers", "No hard blocker remains", "The final pack must not conceal unresolved hard findings.", reviewBlockerCount(project) === 0, `${reviewBlockerCount(project)} hard blocker(s)`, "Resolve blockers"),
    required("model", "All architecture stages contain model content", "Logical, realization, logical technology and physical technology views are mandatory.", [logicalNodes, realizationNodes, logicalTechnologyNodes, physicalNodes].every((items) => items.length > 0), `${logicalNodes.length}/${realizationNodes.length}/${logicalTechnologyNodes.length}/${physicalNodes.length} stage object counts`, "Complete architecture model"),
    required("interfaces", "Interface and ownership evidence is present", "The delivery pack must contain enough information for implementation teams.", realizationNodes.some((node) => propertyValue(node, ["api", "interface", "contract", "event"])) && realizationNodes.some((node) => propertyValue(node, ["owner", "team"])), "Interface and ownership metadata present", "Complete realization details"),
    required("operations", "Recovery and operational evidence is present", "The SDD must describe recovery, observability and operational ownership.", Boolean(context.recoveryObjectives) && logicalTechnologyNodes.some((node) => nodeMatches(node, ["observability", "monitoring", "logging", "tracing"])) && physicalNodes.some((node) => propertyValue(node, ["failover", "backup", "rto", "rpo", "recovery"])), "Recovery, observability and failover represented", "Complete operations design"),
    recommended("generated", "Final pack has been generated", "Generate the approved SDD and evidence archive.", generatedSddArtifact, "Generation is recorded in the lifecycle artifact ledger", "Generate delivery pack"),
  ];
}

function hasProgress(project: ArchitectureProject, stageId: DeliveryStageId) {
  if (stageId === "requirements") return Boolean(project.description.trim() || project.objectives.length || project.constraints.length);
  if (stageId === "quality") return project.qualityPriorities.some((item) => item.weight > 0) || project.qualityScenarios.length > 0;
  if (stageId === "context") return Boolean(project.requirementsIntelligence?.contextPackages.some((item) => item.target === "systemContext")) || stageNodes(project, "logicalApplication").some((node) => node.tags.includes("system-context") || node.tags.includes("system-of-interest"));
  if (stageId === "logical") return stageNodes(project, "logicalApplication").length > 0 || project.styleDecisions.length > 0 || project.patternSelections.length > 0;
  if (stageId === "realization") return stageNodes(project, "applicationRealization").length > 0;
  if (stageId === "logicalTechnology") return stageNodes(project, "logicalTechnology").length > 0;
  if (stageId === "physicalTechnology") return stageNodes(project, "physicalTechnology").length > 0;
  if (stageId === "review") return project.aiReviewHistory.length > 0 || project.findings.length > 0 || project.stageApprovals.some((item) => item.stage === "validationRealization");
  return project.stageApprovals.some((item) => item.stage === "validationRealization" && item.status === "approved");
}

export function assessDeliveryStage(project: ArchitectureProject, stageId: DeliveryStageId, lifecycle?: DeliveryLifecycleState): DeliveryStageAssessment {
  const definition = deliveryStages.find((item) => item.id === stageId)!;
  const checks = checksForStage(project, stageId, lifecycle);
  const requiredChecks = checks.filter((item) => item.required);
  const requiredPassed = requiredChecks.filter((item) => item.done).length;
  const blockers = requiredChecks.filter((item) => !item.done);
  const warnings = checks.filter((item) => !item.required && !item.done);
  const progress = Math.round((checks.filter((item) => item.done).length / Math.max(1, checks.length)) * 100);
  const approval = definition.architectureStage ? latestApproval(project, definition.architectureStage) : undefined;
  const completion = lifecycle?.completions?.[completionKey(project, stageId)];
  const validationBlockers = stageId === "review" ? blockers.filter((item) => item.id !== "approval") : blockers;
  let status: DeliveryStageStatus;
  if (stageId === "sdd" && completion?.status === "completed") status = "delivered";
  else if (approval?.status === "approved") status = "approved";
  else if (approval?.status === "pending" || completion?.status === "completed") status = "submitted";
  else if (validationBlockers.length === 0 && requiredChecks.length > 0 && warnings.length === 0) status = "validated";
  else if (validationBlockers.length === 0 && requiredChecks.length > 0) status = "inputs-complete";
  else if (hasProgress(project, stageId)) status = "in-progress";
  else status = "not-started";
  if (approval?.status === "changes-requested" || approval?.status === "rejected") status = "blocked";

  const nextAction = status === "approved" || status === "delivered"
    ? status === "delivered" ? "Delivery pack is ready for implementation handoff" : "Continue to the next stage"
    : status === "submitted"
      ? "Await or record the review disposition"
      : blockers[0]?.actionLabel ?? (blockers.length ? "Resolve the first required item" : "Complete and hand off this stage");

  return {
    definition,
    status,
    progress,
    requiredPassed,
    requiredTotal: requiredChecks.length,
    checks,
    blockers,
    warnings,
    evidence: checks.filter((item) => item.done && item.evidence).map((item) => item.evidence!) ,
    nextAction,
  };
}
