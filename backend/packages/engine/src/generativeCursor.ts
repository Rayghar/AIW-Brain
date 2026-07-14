import type {
  ArchitectureEdge,
  ArchitectureInterface,
  ArchitectureMutationSet,
  ArchitectureNode,
  ArchitectureProject,
  ArchitectureScopeSnapshot,
  ArchitectureStage,
  AutonomyMode,
  DesignGestureEvent,
  DecompositionLevel,
  GenerativeActionOption,
  GenerativeActionResult,
  GenerativeDesignContext,
  GenerativeLifecycleStage,
  GenerativeOutcomeHistoryItem,
  GenerativePreview,
  KnowledgeLibrary,
  LivingCanvasActionEnvelope,
  LlmCoCreationProposal,
  MutationOperation,
  Point,
  StageDecompositionSession,
  StageTransformationGrammar,
} from '@aiw/domain';
import { validateProject, validateProposedEdge, validateProposedNode } from './validation.js';

const STAGE_ORDER: ArchitectureStage[] = [
  'designIntent',
  'logicalApplication',
  'applicationRealization',
  'logicalTechnology',
  'physicalTechnology',
  'validationRealization',
];

const NOISE_BUDGET = 5;
const DEFAULT_KNOWLEDGE_RELEASE = 'AKR-0.10.60';

export interface GenerativeContextInput {
  project: ArchitectureProject;
  library: KnowledgeLibrary;
  event: DesignGestureEvent;
  permissions?: string[];
  outcomeHistory?: GenerativeOutcomeHistoryItem[];
}

export interface OrchestrateDesignActionsInput extends GenerativeContextInput {
  session?: StageDecompositionSession | null;
}

export interface ApplyGenerativeActionInput {
  project: ArchitectureProject;
  action: GenerativeActionOption;
  actorId: string;
  actorRole: string;
  rationale?: string;
}

export class StaleGenerativeProposalError extends Error {
  readonly code = 'STALE_GENERATIVE_PROPOSAL';
  constructor(message = 'The architecture changed after this proposal was generated. Recompute the Living Canvas actions before applying it.') {
    super(message);
  }
}

export class InvalidGenerativeMutationError extends Error {
  readonly code = 'INVALID_GENERATIVE_MUTATION';
  constructor(message: string) { super(message); }
}

function stableHash(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `gac-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function slug(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 54) || 'scope';
}

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }

export function architectureStageToGenerativeStage(stage: ArchitectureStage, project?: ArchitectureProject): GenerativeLifecycleStage {
  if (stage === 'designIntent') {
    const hasDrivers = Boolean(project?.qualityPriorities.some((item) => item.weight > 0) || project?.qualityScenarios.length);
    return hasDrivers ? 'qualityDrivers' : 'requirements';
  }
  if (stage === 'logicalApplication') return 'logicalApplication';
  if (stage === 'applicationRealization') return 'applicationRealization';
  if (stage === 'logicalTechnology') return 'logicalTechnology';
  if (stage === 'physicalTechnology') return 'physicalTechnology';
  return 'reviewAssurance';
}

export function generativeStageToArchitectureStage(stage: GenerativeLifecycleStage): ArchitectureStage {
  if (stage === 'requirements' || stage === 'qualityDrivers') return 'designIntent';
  if (stage === 'logicalApplication') return 'logicalApplication';
  if (stage === 'applicationRealization') return 'applicationRealization';
  if (stage === 'logicalTechnology') return 'logicalTechnology';
  if (stage === 'physicalTechnology') return 'physicalTechnology';
  return 'validationRealization';
}

export function defaultTargetGenerativeStage(project: ArchitectureProject, event?: Partial<DesignGestureEvent>): GenerativeLifecycleStage {
  if (event?.targetStage) return event.targetStage;
  const stage = event?.stage ?? architectureStageToGenerativeStage(project.activeStage, project);
  if (stage === 'requirements') return 'qualityDrivers';
  if (stage === 'qualityDrivers') return 'logicalApplication';
  if (stage === 'logicalApplication') return 'applicationRealization';
  if (stage === 'applicationRealization') return 'logicalTechnology';
  if (stage === 'logicalTechnology') return 'physicalTechnology';
  if (stage === 'physicalTechnology') return 'reviewAssurance';
  return 'sddPack';
}

function snapshotFor(project: ArchitectureProject, node: ArchitectureNode): ArchitectureScopeSnapshot {
  const interfaces = project.interfaces ?? [];
  return {
    scopeId: node.id,
    semanticId: node.semanticId ?? node.id,
    kind: node.kind,
    label: node.label,
    stage: node.stage,
    ...(node.parentId ? { parentId: node.parentId } : {}),
    childIds: project.nodes.filter((item) => item.parentId === node.id).map((item) => item.id),
    inboundRelationshipIds: project.edges.filter((edge) => edge.targetId === node.id).map((edge) => edge.id),
    outboundRelationshipIds: project.edges.filter((edge) => edge.sourceId === node.id).map((edge) => edge.id),
    interfaceIds: interfaces.filter((item) => item.providerNodeId === node.id || item.consumerNodeIds.includes(node.id)).map((item) => item.id),
    lineageFrom: [...(node.lineageFrom ?? [])],
    properties: { ...node.properties },
  };
}

function semanticNeighbourhood(project: ArchitectureProject, selected?: ArchitectureNode): ArchitectureScopeSnapshot[] {
  if (!selected) return [];
  const ids = new Set<string>([selected.id]);
  if (selected.parentId) ids.add(selected.parentId);
  for (const node of project.nodes) if (node.parentId === selected.id) ids.add(node.id);
  for (const edge of project.edges) {
    if (edge.sourceId === selected.id) ids.add(edge.targetId);
    if (edge.targetId === selected.id) ids.add(edge.sourceId);
  }
  for (const lineage of selected.lineageFrom ?? []) ids.add(lineage);
  return project.nodes.filter((node) => ids.has(node.id)).slice(0, 24).map((node) => snapshotFor(project, node));
}

function qualityScenarioText(project: ArchitectureProject): GenerativeDesignContext['qualityScenarios'] {
  const weights = new Map(project.qualityPriorities.map((item) => [item.attributeId, item.weight]));
  return project.qualityScenarios.map((item) => ({
    id: item.id,
    attribute: item.attributeId,
    weight: item.weight || weights.get(item.attributeId) || 0,
    scenario: [item.source, item.stimulus, item.environment, item.artifact, item.response, item.responseMeasure].filter(Boolean).join(' · '),
    measurable: Boolean(item.responseMeasure.trim()),
    calibrationState: item.responseMeasure.trim() ? 'approved-scoring' : 'advisory',
  }));
}

function requirementRefs(project: ArchitectureProject): GenerativeDesignContext['requirements'] {
  return [
    ...project.objectives.map((statement, index) => ({ id: `objective-${index + 1}`, kind: 'objective' as const, statement, authority: 'target' as const })),
    ...(project.description.trim() ? [{ id: 'requirement-problem-statement', kind: 'requirement' as const, statement: project.description.trim(), authority: 'fact' as const }] : []),
    ...project.constraints.map((statement, index) => ({ id: `constraint-${index + 1}`, kind: 'constraint' as const, statement, authority: 'fact' as const })),
    ...project.assumptions.map((statement, index) => ({ id: `assumption-${index + 1}`, kind: 'assumption' as const, statement, authority: 'assumption' as const })),
  ];
}

function designForces(project: ArchitectureProject): GenerativeDesignContext['designForces'] {
  const priorities = [...project.qualityPriorities]
    .filter((item) => item.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map((item) => ({ id: `force-quality-${item.attributeId}`, statement: `Prioritize ${item.attributeId}`, weight: item.weight, source: 'quality-priority' }));
  const constraints = project.constraints.map((statement, index) => ({ id: `force-constraint-${index + 1}`, statement, weight: 5, source: 'constraint' }));
  return [...priorities, ...constraints].slice(0, 16);
}

function sourceScopesFor(project: ArchitectureProject, sourceStage: GenerativeLifecycleStage, targetStage: GenerativeLifecycleStage): ArchitectureNode[] {
  if ((sourceStage === 'requirements' || sourceStage === 'qualityDrivers') && targetStage === 'logicalApplication') {
    return project.nodes.filter((node) => node.stage === 'logicalApplication' && ['System', 'Domain', 'LogicalService', 'Actor', 'ExternalSystem'].includes(node.kind));
  }
  const sourceArchitectureStage = generativeStageToArchitectureStage(sourceStage);
  return project.nodes.filter((node) => node.stage === sourceArchitectureStage);
}

function isScopeCompleted(project: ArchitectureProject, scope: ArchitectureNode, targetStage: GenerativeLifecycleStage): boolean {
  const target = generativeStageToArchitectureStage(targetStage);
  if (target === 'logicalApplication') {
    if (scope.kind === 'System') return project.nodes.some((node) => node.stage === target && node.parentId === scope.id && ['Domain', 'LogicalService'].includes(node.kind));
    if (scope.kind === 'Domain') return project.nodes.some((node) => node.stage === target && (node.parentId === scope.id || node.lineageFrom.includes(scope.id)) && node.kind === 'LogicalService');
    if (scope.kind === 'Actor' || scope.kind === 'ExternalSystem') return project.edges.some((edge) => edge.stage === target && (edge.sourceId === scope.id || edge.targetId === scope.id));
    return Boolean(project.nodes.some((node) => node.stage === target && node.lineageFrom.includes(scope.id)));
  }
  return project.nodes.some((node) => node.stage === target && node.lineageFrom.includes(scope.id));
}

function unresolvedScopes(project: ArchitectureProject, sourceStage: GenerativeLifecycleStage, targetStage: GenerativeLifecycleStage): { unresolved: string[]; completed: string[] } {
  const scopes = sourceScopesFor(project, sourceStage, targetStage);
  if (!scopes.length && targetStage === 'logicalApplication') return { unresolved: ['intent:project'], completed: [] };
  const unresolved: string[] = [];
  const completed: string[] = [];
  for (const scope of scopes) (isScopeCompleted(project, scope, targetStage) ? completed : unresolved).push(scope.id);
  return { unresolved, completed };
}

export function assembleGenerativeDesignContext(input: GenerativeContextInput): GenerativeDesignContext {
  const { project, library, event } = input;
  if (event.tenantId !== project.tenantId || event.projectId !== project.id || event.branchId !== project.branch.id) {
    throw new InvalidGenerativeMutationError('The design gesture does not belong to this tenant, project and branch.');
  }
  const stage = event.stage;
  const targetStage = defaultTargetGenerativeStage(project, event);
  const architectureStage = generativeStageToArchitectureStage(stage);
  const targetArchitectureStage = generativeStageToArchitectureStage(targetStage);
  const selected = event.selectedScopeId ? project.nodes.find((node) => node.id === event.selectedScopeId) : undefined;
  const scopeState = unresolvedScopes(project, stage, targetStage);
  const outcomeHistory = (input.outcomeHistory ?? []).slice(-40);
  const contextSeed = {
    tenantId: project.tenantId,
    projectId: project.id,
    branchId: project.branch.id,
    revision: project.revision,
    stage,
    targetStage,
    selectedScopeId: selected?.id ?? event.selectedScopeId ?? null,
    knowledgeReleaseId: library.knowledgeReleaseId ?? DEFAULT_KNOWLEDGE_RELEASE,
    acceptedStyleIds: project.styleDecisions.filter((item) => item.status === 'accepted').map((item) => item.styleId),
    acceptedPatternIds: project.patternSelections.filter((item) => item.status === 'accepted').map((item) => item.patternId),
    requirements: {
      description: project.description,
      objectives: project.objectives,
      constraints: project.constraints,
      assumptions: project.assumptions,
    },
    quality: {
      priorities: project.qualityPriorities.map((item) => [item.attributeId, item.weight]),
      scenarios: project.qualityScenarios.map((item) => [item.id, item.attributeId, item.source, item.stimulus, item.environment, item.artifact, item.response, item.responseMeasure, item.weight]),
    },
    model: {
      nodes: project.nodes.map((node) => [node.id, node.semanticId, node.kind, node.stage, node.parentId, node.lineageFrom, node.label, node.properties]),
      relationships: project.edges.map((edge) => [edge.id, edge.sourceId, edge.targetId, edge.kind, edge.stage, edge.properties]),
      interfaces: (project.interfaces ?? []).map((item) => [item.id, item.providerNodeId, item.consumerNodeIds, item.interactionStyle, item.operationOrEvent, item.version]),
    },
    decisions: project.decisions.map((item) => [item.id, item.status, item.decision]),
    outcomes: outcomeHistory.map((item) => [item.actionSemanticKey, item.outcome]),
  };
  const contextFingerprint = stableHash(contextSeed);
  const currentStageObjectIds = project.nodes.filter((node) => node.stage === targetArchitectureStage).map((node) => node.id);
  const currentStageRelationshipIds = project.edges.filter((edge) => edge.stage === targetArchitectureStage).map((edge) => edge.id);
  return {
    schemaVersion: '1.0',
    tenantId: project.tenantId,
    projectId: project.id,
    branchId: project.branch.id,
    revision: project.revision,
    stage,
    targetStage,
    architectureStage,
    targetArchitectureStage,
    ...(event.viewpointId ? { viewpointId: event.viewpointId } : {}),
    ...(event.decompositionLevel ? { decompositionLevel: event.decompositionLevel } : {}),
    activeKnowledgeReleaseId: library.knowledgeReleaseId ?? DEFAULT_KNOWLEDGE_RELEASE,
    ...(selected ? { selectedScope: snapshotFor(project, selected) } : {}),
    semanticNeighbourhood: semanticNeighbourhood(project, selected),
    unresolvedUpstreamScopeIds: scopeState.unresolved,
    completedUpstreamScopeIds: scopeState.completed,
    currentStageObjectIds,
    currentStageRelationshipIds,
    requirements: requirementRefs(project),
    qualityScenarios: qualityScenarioText(project),
    designForces: designForces(project),
    acceptedStyleIds: project.styleDecisions.filter((item) => item.status === 'accepted').map((item) => item.styleId),
    acceptedPatternIds: project.patternSelections.filter((item) => item.status === 'accepted').map((item) => item.patternId),
    acceptedTacticIds: unique(project.nodes.flatMap((node) => Array.isArray(node.properties.tacticIds) ? node.properties.tacticIds.map(String) : [])),
    decisionIds: project.decisions.filter((item) => item.status === 'accepted').map((item) => item.id),
    obligationIds: project.findings.filter((item) => item.ruleId.startsWith('OBL-') || item.ruleId.startsWith('GAC-OBLIGATION')).map((item) => item.id),
    findingIds: project.findings.map((item) => item.id),
    evidenceIds: unique((project.interfaces ?? []).flatMap((item) => item.evidenceIds)),
    policyIds: [...project.activeRulePackIds],
    openQuestionIds: project.findings.filter((item) => /question|clarif|missing/i.test(`${item.title} ${item.message}`)).map((item) => item.id),
    actor: { id: event.actorId, role: event.actorRole, permissions: [...(input.permissions ?? [])] },
    autonomyMode: event.autonomyMode,
    recentOutcomeHistory: outcomeHistory,
    contextFingerprint,
  };
}

export const qualityToLogicalPilotGrammar: StageTransformationGrammar = {
  id: 'GAC-GRAMMAR-QUALITY-TO-LOGICAL',
  version: '1.0.0',
  sourceStage: 'qualityDrivers',
  targetStage: 'logicalApplication',
  sourceArchitectureStage: 'designIntent',
  targetArchitectureStage: 'logicalApplication',
  permittedSourceKinds: ['Objective', 'Requirement', 'Constraint', 'Assumption', 'QualityScenario'],
  permittedTargetKinds: ['System', 'Actor', 'ExternalSystem', 'Domain', 'LogicalService', 'Control'],
  decompositionRules: [
    { ruleId: 'Q2L-SYSTEM', when: 'No system-of-interest exists', generate: ['System'] },
    { ruleId: 'Q2L-DOMAIN', when: 'System scope selected', generate: ['Domain', 'LogicalService'] },
    { ruleId: 'Q2L-QUALITY-RESPONSIBILITY', when: 'High-weight quality driver exists', generate: ['LogicalService', 'Control'] },
  ],
  consolidationRules: [],
  preservationRules: [{ ruleId: 'Q2L-REQUIREMENT-LINEAGE', preserve: 'requirement and quality references on generated objects' }],
  relationshipPropagationRules: [{ ruleId: 'Q2L-CONTEXT-INTERACTION', generate: 'actor/external-system interactions with the system of interest' }],
  interfaceDerivationRules: [],
  boundaryDerivationRules: [{ ruleId: 'Q2L-SYSTEM-BOUNDARY', generate: 'system-of-interest boundary' }],
  qualityTacticRules: [
    { attribute: 'security', generateResponsibility: 'Identity and Access Service' },
    { attribute: 'availability', generateResponsibility: 'Resilience Coordination Service' },
    { attribute: 'scalability', generateResponsibility: 'Asynchronous Work Coordinator' },
    { attribute: 'performance', generateResponsibility: 'Read-Optimized Query Service' },
  ],
  patternKitRefs: ['PAT-API-GATEWAY', 'PAT-CIRCUIT-BREAKER', 'PAT-OUTBOX'],
  completionRules: [
    { ruleId: 'Q2L-COMPLETE-SYSTEM', condition: 'At least one system of interest exists' },
    { ruleId: 'Q2L-COMPLETE-RESPONSIBILITY', condition: 'At least one logical responsibility exists' },
  ],
  knowledgeReleaseId: DEFAULT_KNOWLEDGE_RELEASE,
  status: 'released',
};

export const logicalToRealizationPilotGrammar: StageTransformationGrammar = {
  id: 'GAC-GRAMMAR-LOGICAL-TO-REALIZATION',
  version: '1.0.0',
  sourceStage: 'logicalApplication',
  targetStage: 'applicationRealization',
  sourceArchitectureStage: 'logicalApplication',
  targetArchitectureStage: 'applicationRealization',
  permittedSourceKinds: ['System', 'Domain', 'LogicalService', 'Actor', 'ExternalSystem', 'DataDomain'],
  permittedTargetKinds: ['ApplicationComponent', 'DeployableUnit', 'Module', 'API', 'Event', 'DataStore', 'Control'],
  decompositionRules: [
    { ruleId: 'L2R-SERVICE-API', sourceKind: 'LogicalService', generate: ['DeployableUnit', 'API'] },
    { ruleId: 'L2R-SERVICE-WORKER', sourceKind: 'LogicalService', when: 'event-driven or asynchronous responsibility', generate: ['DeployableUnit', 'Event'] },
    { ruleId: 'L2R-SYSTEM-EDGE', sourceKind: 'System', when: 'external interactions exist', generate: ['ApplicationComponent', 'Control'] },
  ],
  consolidationRules: [{ ruleId: 'L2R-MERGE-RESPONSIBILITIES', when: 'cohesive logical services share ownership and lifecycle' }],
  preservationRules: [{ ruleId: 'L2R-LINEAGE', preserve: 'every realization object records one or more logical sources' }],
  relationshipPropagationRules: [{ ruleId: 'L2R-PROPAGATE', preserve: 'upstream provider/consumer intent as candidate realization relationships' }],
  interfaceDerivationRules: [{ ruleId: 'L2R-API-CONTRACT', when: 'external or synchronous relationship', generate: 'API interface contract' }],
  boundaryDerivationRules: [{ ruleId: 'L2R-TRUST-BOUNDARY', when: 'public entry point or external system', generate: 'access control boundary' }],
  qualityTacticRules: [
    { attribute: 'security', generate: ['API Gateway', 'Identity Control'] },
    { attribute: 'availability', generate: ['Circuit Breaker', 'Retry Policy'] },
    { attribute: 'faultTolerance', generate: ['Event Worker', 'Dead Letter Handling'] },
    { attribute: 'scalability', generate: ['Stateless API', 'Asynchronous Worker'] },
  ],
  patternKitRefs: ['PAT-API-GATEWAY', 'PAT-BFF', 'PAT-OUTBOX', 'PAT-CIRCUIT-BREAKER'],
  completionRules: [
    { ruleId: 'L2R-COMPLETE-LINEAGE', condition: 'Every selected logical responsibility is realized or explicitly deferred' },
    { ruleId: 'L2R-COMPLETE-INTERACTION', condition: 'Upstream relationships are mapped or explicitly deferred' },
  ],
  knowledgeReleaseId: DEFAULT_KNOWLEDGE_RELEASE,
  status: 'released',
};



export const realizationToLogicalTechnologyGrammar: StageTransformationGrammar = {
  id: 'GAC-GRAMMAR-REALIZATION-TO-LOGICAL-TECHNOLOGY',
  version: '1.0.0',
  sourceStage: 'applicationRealization',
  targetStage: 'logicalTechnology',
  sourceArchitectureStage: 'applicationRealization',
  targetArchitectureStage: 'logicalTechnology',
  permittedSourceKinds: ['ApplicationComponent', 'DeployableUnit', 'Module', 'API', 'Event', 'DataStore', 'Control'],
  permittedTargetKinds: ['LogicalTechnologyCapability', 'Runtime', 'Control'],
  decompositionRules: [
    { ruleId: 'R2T-RUNTIME', when: 'Deployable application boundary exists', generate: ['LogicalTechnologyCapability', 'Runtime'] },
    { ruleId: 'R2T-INTEGRATION', when: 'API or event interaction exists', generate: ['LogicalTechnologyCapability'] },
    { ruleId: 'R2T-DATA', when: 'Owned state exists', generate: ['LogicalTechnologyCapability'] },
  ],
  consolidationRules: [{ ruleId: 'R2T-SHARED-PLATFORM', when: 'Multiple realizations require the same platform capability' }],
  preservationRules: [{ ruleId: 'R2T-LINEAGE', preserve: 'every technology capability records the application realization it enables' }],
  relationshipPropagationRules: [{ ruleId: 'R2T-PROPAGATE', preserve: 'application interaction intent as logical technology dependencies' }],
  interfaceDerivationRules: [{ ruleId: 'R2T-CONTRACT-REQUIREMENTS', preserve: 'interface protocol, delivery and security requirements on capability metadata' }],
  boundaryDerivationRules: [{ ruleId: 'R2T-TRUST-CAPABILITY', when: 'public or restricted interface exists', generate: 'identity and policy enforcement capability' }],
  qualityTacticRules: [
    { attribute: 'security', generate: ['Identity and Policy Enforcement Capability', 'Secrets and Key Management Capability'] },
    { attribute: 'availability', generate: ['Service Resilience Capability', 'Health and Failover Capability'] },
    { attribute: 'scalability', generate: ['Elastic Runtime Capability', 'Messaging and Back-pressure Capability'] },
    { attribute: 'performance', generate: ['Caching Capability', 'Read Optimization Capability'] },
    { attribute: 'observability', generate: ['Telemetry and Observability Capability'] },
  ],
  patternKitRefs: ['PAT-API-GATEWAY', 'PAT-CIRCUIT-BREAKER', 'PAT-OUTBOX', 'PAT-CQRS'],
  completionRules: [
    { ruleId: 'R2T-COMPLETE-RUNTIME', condition: 'Every deployable realization maps to a runtime capability or is explicitly deferred' },
    { ruleId: 'R2T-COMPLETE-INTERACTION', condition: 'Every API/event relationship maps to an integration capability or is explicitly deferred' },
  ],
  knowledgeReleaseId: DEFAULT_KNOWLEDGE_RELEASE,
  status: 'released',
};

export const logicalTechnologyToPhysicalTechnologyGrammar: StageTransformationGrammar = {
  id: 'GAC-GRAMMAR-LOGICAL-TO-PHYSICAL-TECHNOLOGY',
  version: '1.0.0',
  sourceStage: 'logicalTechnology',
  targetStage: 'physicalTechnology',
  sourceArchitectureStage: 'logicalTechnology',
  targetArchitectureStage: 'physicalTechnology',
  permittedSourceKinds: ['LogicalTechnologyCapability', 'Runtime', 'Control'],
  permittedTargetKinds: ['TechnologyProduct', 'TechnologyComponent', 'DeploymentNode', 'Environment', 'Region', 'AvailabilityZone', 'NetworkZone', 'Runtime', 'Control'],
  decompositionRules: [
    { ruleId: 'T2P-RUNTIME', sourceKind: 'LogicalTechnologyCapability', when: 'runtime capability', generate: ['TechnologyProduct', 'DeploymentNode'] },
    { ruleId: 'T2P-DATA', sourceKind: 'LogicalTechnologyCapability', when: 'data capability', generate: ['TechnologyProduct', 'DeploymentNode'] },
    { ruleId: 'T2P-INTEGRATION', sourceKind: 'LogicalTechnologyCapability', when: 'integration capability', generate: ['TechnologyProduct', 'DeploymentNode'] },
  ],
  consolidationRules: [{ ruleId: 'T2P-SHARED-SERVICE', when: 'Multiple logical capabilities can be safely served by one governed product' }],
  preservationRules: [{ ruleId: 'T2P-LINEAGE', preserve: 'every physical product and deployment node records the logical capability it realizes' }],
  relationshipPropagationRules: [{ ruleId: 'T2P-PROPAGATE', preserve: 'logical technology dependencies as deployed communication and hosting relationships' }],
  interfaceDerivationRules: [{ ruleId: 'T2P-ENDPOINT', preserve: 'interface endpoints inherit protocol, classification and SLO requirements' }],
  boundaryDerivationRules: [
    { ruleId: 'T2P-ENVIRONMENT', generate: 'environment boundary' },
    { ruleId: 'T2P-FAILURE-DOMAINS', when: 'availability is high priority', generate: 'region and availability-zone boundaries' },
    { ruleId: 'T2P-NETWORK-ZONE', when: 'security is high priority', generate: 'network-zone boundary' },
  ],
  qualityTacticRules: [
    { attribute: 'availability', configure: { replicas: 2, availabilityZones: 2 } },
    { attribute: 'security', configure: { networkSegmentation: true, managedIdentity: true } },
    { attribute: 'scalability', configure: { horizontalScaling: true, autoscaling: true } },
    { attribute: 'recoverability', configure: { backup: true, recoveryPlan: true } },
  ],
  patternKitRefs: ['PAT-CELL-BASED', 'PAT-CIRCUIT-BREAKER', 'PAT-OUTBOX'],
  completionRules: [
    { ruleId: 'T2P-COMPLETE-PRODUCT', condition: 'Every selected logical technology capability maps to a provider-neutral physical product or is explicitly deferred' },
    { ruleId: 'T2P-COMPLETE-FAILURE-DOMAIN', condition: 'High-availability workloads span at least two failure domains' },
  ],
  knowledgeReleaseId: DEFAULT_KNOWLEDGE_RELEASE,
  status: 'released',
};

interface ExecutablePatternKit {
  id: string;
  appliesTo: Array<ArchitectureNode['kind']>;
  targetStage: ArchitectureStage;
  componentLabels: string[];
  relationshipPosture: 'synchronous' | 'asynchronous' | 'mixed';
  obligations: string[];
  fitnessTests: string[];
}

const EXECUTABLE_PATTERN_KITS: ExecutablePatternKit[] = [
  {
    id: 'PAT-API-GATEWAY',
    appliesTo: ['System', 'DeployableUnit', 'ApplicationComponent'],
    targetStage: 'applicationRealization',
    componentLabels: ['API Policy Router', 'Authentication Adapter', 'Rate-Limit Policy'],
    relationshipPosture: 'synchronous',
    obligations: ['Define public API authentication and authorization.', 'Define gateway availability, throttling and observability SLOs.'],
    fitnessTests: ['Every public API is routed through one governed access-control point.'],
  },
  {
    id: 'PAT-OUTBOX',
    appliesTo: ['DeployableUnit', 'ApplicationComponent', 'DataStore'],
    targetStage: 'applicationRealization',
    componentLabels: ['Transactional Outbox', 'Outbox Publisher', 'Idempotency Guard'],
    relationshipPosture: 'asynchronous',
    obligations: ['Define relay retry and dead-letter handling.', 'Define idempotent event-consumer behavior.'],
    fitnessTests: ['No domain event is published outside the transaction boundary without an outbox or equivalent atomicity mechanism.'],
  },
  {
    id: 'PAT-CIRCUIT-BREAKER',
    appliesTo: ['DeployableUnit', 'ApplicationComponent', 'LogicalTechnologyCapability'],
    targetStage: 'applicationRealization',
    componentLabels: ['Resilience Policy', 'Dependency Health Monitor'],
    relationshipPosture: 'synchronous',
    obligations: ['Define timeout, retry and circuit thresholds.', 'Define fallback and degraded-service behavior.'],
    fitnessTests: ['Every remote synchronous dependency has an explicit timeout and failure-isolation policy.'],
  },
  {
    id: 'PAT-CQRS',
    appliesTo: ['DeployableUnit', 'ApplicationComponent', 'DataStore'],
    targetStage: 'applicationRealization',
    componentLabels: ['Command Handler', 'Query Handler', 'Projection Updater'],
    relationshipPosture: 'mixed',
    obligations: ['Define projection freshness and rebuild behavior.', 'Define consistency expectations between write and read models.'],
    fitnessTests: ['Command and query responsibilities remain separately testable and traceable.'],
  },
];

const GRAMMARS: StageTransformationGrammar[] = [
  qualityToLogicalPilotGrammar,
  logicalToRealizationPilotGrammar,
  realizationToLogicalTechnologyGrammar,
  logicalTechnologyToPhysicalTechnologyGrammar,
];

export function stageTransformationGrammars(): StageTransformationGrammar[] { return GRAMMARS.map((item) => structuredClone(item)); }

export function resolveStageTransformationGrammar(sourceStage: GenerativeLifecycleStage, targetStage: GenerativeLifecycleStage): StageTransformationGrammar | null {
  if (sourceStage === 'requirements' && targetStage === 'logicalApplication') return structuredClone(qualityToLogicalPilotGrammar);
  return structuredClone(GRAMMARS.find((item) => item.sourceStage === sourceStage && item.targetStage === targetStage) ?? null);
}

function focusPriority(project: ArchitectureProject, id: string): number {
  if (id === 'intent:project') return 1000;
  const node = project.nodes.find((item) => item.id === id);
  if (!node) return 0;
  let score = 0;
  if (node.properties.systemOfInterest === true || node.tags.includes('system-of-interest')) score += 100;
  if (node.kind === 'System') score += 80;
  if (node.kind === 'Domain') score += 60;
  if (node.kind === 'LogicalService') score += 50;
  if (node.kind === 'Actor' || node.kind === 'ExternalSystem') score += 25;
  score += project.edges.filter((edge) => edge.sourceId === node.id || edge.targetId === node.id).length * 4;
  return score;
}

export function buildScopeFocusQueue(project: ArchitectureProject, context: GenerativeDesignContext): string[] {
  return [...context.unresolvedUpstreamScopeIds].sort((a, b) => focusPriority(project, b) - focusPriority(project, a) || a.localeCompare(b));
}

function sessionBlockers(project: ArchitectureProject, context: GenerativeDesignContext): string[] {
  const blockers: string[] = [];
  if (context.targetStage === 'logicalApplication') {
    if (!project.nodes.some((node) => node.stage === 'logicalApplication' && node.kind === 'System')) blockers.push('Establish the system of interest.');
    if (!project.nodes.some((node) => node.stage === 'logicalApplication' && ['Domain', 'LogicalService'].includes(node.kind))) blockers.push('Define at least one logical responsibility.');
  }
  if (context.targetStage === 'applicationRealization') {
    const logical = project.nodes.filter((node) => node.stage === 'logicalApplication' && ['Domain', 'LogicalService'].includes(node.kind));
    const unresolved = logical.filter((source) => !project.nodes.some((node) => node.stage === 'applicationRealization' && node.lineageFrom.includes(source.id)));
    if (unresolved.length) blockers.push(`${unresolved.length} logical scope(s) still need a realization decision.`);
  }
  if (context.targetStage === 'logicalTechnology') {
    const realizations = project.nodes.filter((node) => node.stage === 'applicationRealization' && ['DeployableUnit', 'ApplicationComponent', 'DataStore', 'API', 'Event'].includes(node.kind));
    const unresolved = realizations.filter((source) => !project.nodes.some((node) => node.stage === 'logicalTechnology' && node.lineageFrom.includes(source.id)));
    if (unresolved.length) blockers.push(`${unresolved.length} application realization scope(s) still need a logical technology decision.`);
  }
  if (context.targetStage === 'physicalTechnology') {
    const capabilities = project.nodes.filter((node) => node.stage === 'logicalTechnology' && ['LogicalTechnologyCapability', 'Runtime', 'Control'].includes(node.kind));
    const unresolved = capabilities.filter((source) => !project.nodes.some((node) => node.stage === 'physicalTechnology' && node.lineageFrom.includes(source.id)));
    if (unresolved.length) blockers.push(`${unresolved.length} logical technology capability scope(s) still need a physical realization decision.`);
  }
  return blockers;
}

export function createStageDecompositionSession(project: ArchitectureProject, context: GenerativeDesignContext, previous?: StageDecompositionSession | null): StageDecompositionSession {
  const now = new Date().toISOString();
  const queue = buildScopeFocusQueue(project, context);
  const inherited = previous && previous.projectId === project.id && previous.branchId === project.branch.id && previous.targetStage === context.targetStage;
  const completed = unique([...(inherited ? previous.completedScopeIds : []), ...context.completedUpstreamScopeIds]);
  const deferred = inherited ? previous.deferredScopeIds.filter((id) => context.unresolvedUpstreamScopeIds.includes(id)) : [];
  const skipped = inherited ? previous.skippedScopeIds.filter((id) => context.unresolvedUpstreamScopeIds.includes(id)) : [];
  const blocked = inherited ? previous.blockedScopeIds.filter((id) => context.unresolvedUpstreamScopeIds.includes(id)) : [];
  const unresolved = queue.filter((id) => !completed.includes(id) && !deferred.includes(id) && !skipped.includes(id));
  const denominator = unique([...completed, ...unresolved, ...deferred, ...skipped, ...blocked]).length || 1;
  const finalizationBlockers = sessionBlockers(project, context);
  return {
    id: inherited ? previous.id : `gac-session-${project.id}-${context.targetStage}-${stableHash([project.branch.id, context.targetStage])}`,
    tenantId: project.tenantId,
    projectId: project.id,
    branchId: project.branch.id,
    basedOnRevision: project.revision,
    sourceStage: context.stage,
    targetStage: context.targetStage,
    autonomyMode: context.autonomyMode,
    eligibleScopeIds: unique([...context.unresolvedUpstreamScopeIds, ...context.completedUpstreamScopeIds]),
    ...(unresolved[0] ? { activeScopeId: unresolved[0] } : {}),
    completedScopeIds: completed,
    deferredScopeIds: deferred,
    skippedScopeIds: skipped,
    blockedScopeIds: blocked,
    unresolvedScopeIds: unresolved,
    unresolvedRelationshipIds: [],
    unresolvedInterfaceIds: [],
    acceptedActionIds: inherited ? [...previous.acceptedActionIds] : [],
    rejectedActionIds: inherited ? [...previous.rejectedActionIds] : [],
    pendingProposalIds: inherited ? [...previous.pendingProposalIds] : [],
    coveragePercent: Math.round(((completed.length + deferred.length + skipped.length) / denominator) * 100),
    readyToFinalize: unresolved.length === 0 && finalizationBlockers.length === 0,
    finalizationBlockers,
    contextFingerprint: context.contextFingerprint,
    createdAt: inherited ? previous.createdAt : now,
    updatedAt: now,
  };
}

function nodePosition(context: GenerativeDesignContext, event: DesignGestureEvent, offset = 0): Point {
  const base = event.canvasPoint ?? { x: 280, y: 180 };
  return { x: base.x + (offset % 2) * 230, y: base.y + Math.floor(offset / 2) * 150 };
}

function deterministicNode(input: {
  project: ArchitectureProject;
  context: GenerativeDesignContext;
  event: DesignGestureEvent;
  scopeId?: string;
  kind: ArchitectureNode['kind'];
  label: string;
  description: string;
  stage: ArchitectureStage;
  decompositionLevel: DecompositionLevel;
  offset?: number;
  lineageFrom?: string[];
  parentId?: string;
  tags?: string[];
  properties?: Record<string, unknown>;
  semanticSuffix?: string;
}): ArchitectureNode {
  const semanticKey = `${input.context.targetStage}:${input.scopeId ?? 'project'}:${input.kind}:${input.semanticSuffix ?? input.label}`;
  const id = `gac-node-${slug(semanticKey)}-${stableHash(semanticKey).slice(-6)}`;
  return {
    id,
    semanticId: `semantic:${semanticKey}`,
    kind: input.kind,
    stage: input.stage,
    label: input.label,
    description: input.description,
    properties: {
      decompositionLevel: input.decompositionLevel,
      generatedBy: 'AIW deterministic Living Canvas',
      generativeAuthority: 'deterministic-eligible',
      generativeContextFingerprint: input.context.contextFingerprint,
      requirementRefs: input.context.requirements.slice(0, 6).map((item) => item.id),
      qualityScenarioRefs: input.context.qualityScenarios.slice(0, 6).map((item) => item.id),
      ...(input.scopeId ? { sourceScopeId: input.scopeId } : {}),
      ...(input.properties ?? {}),
    },
    lineageFrom: [...(input.lineageFrom ?? [])],
    ...(input.parentId ? { parentId: input.parentId } : {}),
    positions: { [input.stage]: nodePosition(input.context, input.event, input.offset ?? 0) },
    tags: unique(['living-canvas', 'deterministic-generated', ...(input.tags ?? [])]),
    status: 'draft',
  };
}

function deterministicEdge(context: GenerativeDesignContext, sourceId: string, targetId: string, kind: ArchitectureEdge['kind'], stage: ArchitectureStage, label: string): ArchitectureEdge {
  const key = `${context.targetStage}:${sourceId}:${kind}:${targetId}`;
  return {
    id: `gac-edge-${slug(key)}-${stableHash(key).slice(-6)}`,
    sourceId,
    targetId,
    kind,
    stage,
    label,
    properties: {
      generatedBy: 'AIW deterministic Living Canvas',
      generativeContextFingerprint: context.contextFingerprint,
      protocolStyle: kind === 'publishes' || kind === 'subscribes' ? 'asynchronous' : 'synchronous',
    },
  };
}

function deterministicInterface(context: GenerativeDesignContext, providerId: string, consumerIds: string[], name: string, operationOrEvent: string): ArchitectureInterface {
  const now = new Date().toISOString();
  const key = `${providerId}:${consumerIds.join(',')}:${operationOrEvent}`;
  return {
    id: `gac-interface-${slug(key)}-${stableHash(key).slice(-6)}`,
    name,
    stage: context.targetArchitectureStage,
    providerNodeId: providerId,
    consumerNodeIds: [...consumerIds],
    interactionStyle: 'request-response',
    protocol: 'HTTPS',
    operationOrEvent,
    version: 'v1-draft',
    authentication: 'To be confirmed',
    authorization: 'Least privilege policy required',
    encryption: 'TLS in transit',
    retryPolicy: 'Bounded retry after idempotency review',
    idempotency: 'Required for mutating operations',
    ordering: 'Not guaranteed',
    deliveryGuarantee: 'At-most-once request; application retry policy required',
    deadLetterPolicy: 'Not applicable to request-response',
    replayPolicy: 'Not applicable to request-response',
    slo: 'Derived from the linked quality scenario',
    dataClassification: 'internal',
    owner: 'Architecture owner to assign',
    lifecycleStatus: 'proposed',
    evidenceIds: [],
    createdAt: now,
    updatedAt: now,
  };
}


function deterministicEventInterface(context: GenerativeDesignContext, providerId: string, consumerIds: string[], name: string, operationOrEvent: string): ArchitectureInterface {
  const contract = deterministicInterface(context, providerId, consumerIds, name, operationOrEvent);
  return {
    ...contract,
    interactionStyle: 'event',
    protocol: 'AsyncAPI-compatible event contract',
    authentication: 'Producer and consumer workload identity required',
    retryPolicy: 'Exponential backoff with bounded retries',
    idempotency: 'Required for every consumer',
    ordering: 'Per aggregate/key where required',
    deliveryGuarantee: 'At-least-once unless explicitly constrained',
    deadLetterPolicy: 'Required with operational ownership',
    replayPolicy: 'Defined retention and controlled replay required',
  };
}

function inverseFor(operations: MutationOperation[]): MutationOperation[] {
  const inverse: MutationOperation[] = [];
  for (const operation of [...operations].reverse()) {
    if (operation.type === 'create-node') inverse.push({ type: 'remove-node', nodeId: operation.node.id });
    else if (operation.type === 'create-boundary') inverse.push({ type: 'remove-node', nodeId: operation.boundary.id });
    else if (operation.type === 'create-relationship') inverse.push({ type: 'remove-relationship', relationshipId: operation.relationship.id });
    else if (operation.type === 'create-interface') inverse.push({ type: 'remove-interface', interfaceId: operation.interface.id });
    else if (operation.type === 'create-finding') inverse.push({ type: 'remove-finding', findingId: operation.finding.id });
    else if (operation.type === 'create-obligation') inverse.push({ type: 'remove-finding', findingId: operation.obligation.id });
    else if (operation.type === 'create-risk') inverse.push({ type: 'remove-finding', findingId: operation.risk.id });
    else if (operation.type === 'create-fitness-test') inverse.push({ type: 'remove-finding', findingId: operation.fitnessTest.id });
  }
  return inverse;
}

function validateOperations(project: ArchitectureProject, operations: MutationOperation[]): ArchitectureMutationSet['validation'] {
  const validation: ArchitectureMutationSet['validation'] = [];
  let candidate = structuredClone(project);
  for (const operation of operations) {
    if (operation.type === 'create-node' || operation.type === 'create-boundary') {
      const node = operation.type === 'create-node' ? operation.node : operation.boundary;
      const check = validateProposedNode(candidate, node);
      validation.push({ ruleId: 'GAC-NODE-ELIGIBILITY', result: check.allowed ? 'pass' : 'fail', message: check.allowed ? `${node.label} is valid at ${node.stage}.` : (check.findings[0]?.message ?? `${node.label} is not eligible.`) });
      if (check.allowed && !candidate.nodes.some((item) => item.id === node.id || item.semanticId === node.semanticId)) candidate.nodes.push(node);
    }
    if (operation.type === 'create-relationship') {
      const check = validateProposedEdge(candidate, operation.relationship);
      validation.push({ ruleId: 'GAC-RELATIONSHIP-ELIGIBILITY', result: check.allowed ? 'pass' : 'fail', message: check.allowed ? `${operation.relationship.label ?? operation.relationship.kind} is structurally valid.` : (check.findings[0]?.message ?? 'Relationship is not eligible.') });
      if (check.allowed && !candidate.edges.some((item) => item.id === operation.relationship.id)) candidate.edges.push(operation.relationship);
    }
  }
  const hard = validateProject(candidate).filter((item) => item.severity === 'HARD');
  validation.push({ ruleId: 'GAC-CANONICAL-PREFLIGHT', result: hard.length ? 'fail' : 'pass', message: hard.length ? hard.map((item) => item.message).join(' ') : 'No hard canonical-model violation is introduced.' });
  return validation;
}

function mutationSet(input: {
  project: ArchitectureProject;
  context: GenerativeDesignContext;
  semanticKey: string;
  title: string;
  rationale: string;
  operations: MutationOperation[];
  risk?: 'low' | 'medium' | 'high';
}): ArchitectureMutationSet {
  const validation = validateOperations(input.project, input.operations);
  return {
    id: `gac-mutation-${stableHash([input.project.id, input.project.branch.id, input.project.revision, input.semanticKey])}`,
    semanticKey: input.semanticKey,
    idempotencyKey: stableHash([input.project.id, input.project.branch.id, input.semanticKey]),
    projectId: input.project.id,
    branchId: input.project.branch.id,
    basedOnRevision: input.project.revision,
    basedOnKnowledgeReleaseId: input.context.activeKnowledgeReleaseId,
    contextFingerprint: input.context.contextFingerprint,
    title: input.title,
    rationale: input.rationale,
    risk: input.risk ?? 'low',
    preconditions: [
      { code: 'REVISION-CURRENT', description: `Project remains at revision ${input.project.revision}.`, satisfied: true },
      { code: 'TENANT-BRANCH-MATCH', description: 'The proposal belongs to this tenant and branch.', satisfied: true },
      { code: 'HUMAN-APPROVAL', description: 'The architect must explicitly accept the proposal.', satisfied: false },
    ],
    operations: input.operations,
    inverseOperations: inverseFor(input.operations),
    affectedSemanticIds: unique(input.operations.flatMap((operation) => {
      if (operation.type === 'create-node') return [operation.node.semanticId ?? operation.node.id];
      if (operation.type === 'create-boundary') return [operation.boundary.semanticId ?? operation.boundary.id];
      if (operation.type === 'create-relationship') return [operation.relationship.id];
      if (operation.type === 'create-interface') return [operation.interface.id];
      return [];
    })),
    validation,
    requiresHumanApproval: true,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
}

export function buildGenerativePreview(actionId: string, set: ArchitectureMutationSet): GenerativePreview {
  const nodes = set.operations.flatMap((operation) => operation.type === 'create-node' ? [operation.node] : operation.type === 'create-boundary' ? [operation.boundary] : []);
  const relationships = set.operations.flatMap((operation) => operation.type === 'create-relationship' ? [operation.relationship] : []);
  const interfaces = set.operations.flatMap((operation) => operation.type === 'create-interface' ? [operation.interface] : []);
  const removedNodeIds = set.operations.flatMap((operation) => operation.type === 'remove-node' ? [operation.nodeId] : []);
  const removedRelationshipIds = set.operations.flatMap((operation) => operation.type === 'remove-relationship' ? [operation.relationshipId] : []);
  const accessibleDescription = [
    nodes.length ? `${nodes.length} proposed object${nodes.length === 1 ? '' : 's'}: ${nodes.map((node) => `${node.label} (${node.kind})`).join(', ')}` : '',
    relationships.length ? `${relationships.length} proposed relationship${relationships.length === 1 ? '' : 's'}: ${relationships.map((edge) => `${edge.sourceId} ${edge.kind} ${edge.targetId}`).join(', ')}` : '',
    interfaces.length ? `${interfaces.length} proposed interface${interfaces.length === 1 ? '' : 's'}: ${interfaces.map((item) => item.name).join(', ')}` : '',
  ].filter(Boolean).join('. ');
  return {
    actionId,
    basedOnRevision: set.basedOnRevision,
    contextFingerprint: set.contextFingerprint,
    nodes,
    relationships,
    interfaces,
    removedNodeIds,
    removedRelationshipIds,
    summary: set.title,
    accessibleDescription: accessibleDescription || 'This proposal changes architecture metadata without adding visible topology.',
    consequenceSummary: [
      `${set.operations.length} atomic operation(s) will be applied together.`,
      `${set.validation.filter((item) => item.result === 'pass').length} preflight rule(s) pass; ${set.validation.filter((item) => item.result === 'fail').length} fail.`,
      'The mutation remains human-controlled and reversible.',
    ],
    validation: set.validation,
  };
}

function option(input: {
  project: ArchitectureProject;
  context: GenerativeDesignContext;
  semanticKey: string;
  actionType: GenerativeActionOption['actionType'];
  label: string;
  shortDescription: string;
  authorityClass: GenerativeActionOption['authorityClass'];
  rank: number;
  confidence: number;
  operations: MutationOperation[];
  targetScopeId?: string;
  whyNow: string;
  whyHere: string;
  basedOn: string[];
  ifOmitted: string;
  alternatives?: string[];
  qualityEffects?: GenerativeActionOption['qualityEffects'];
  patternRefs?: string[];
  obligations?: GenerativeActionOption['obligations'];
  risks?: GenerativeActionOption['risks'];
  projectedCoverageDelta?: number;
}): GenerativeActionOption {
  const set = mutationSet({ project: input.project, context: input.context, semanticKey: input.semanticKey, title: input.label, rationale: `${input.whyNow} ${input.whyHere}`, operations: input.operations, risk: input.risks?.some((risk) => risk.severity === 'high') ? 'high' : 'low' });
  const eligible = !set.validation.some((item) => item.result === 'fail');
  const id = `gac-action-${stableHash([input.context.contextFingerprint, input.semanticKey])}`;
  return {
    id,
    semanticKey: input.semanticKey,
    actionType: input.actionType,
    label: input.label,
    shortDescription: input.shortDescription,
    targetStage: input.context.targetStage,
    ...(input.targetScopeId ? { targetScopeId: input.targetScopeId } : {}),
    authorityClass: input.authorityClass,
    rank: input.rank,
    confidence: input.confidence,
    eligibility: {
      eligible,
      reasons: [input.whyNow, input.whyHere],
      prerequisites: set.validation.filter((item) => item.result === 'fail').map((item) => item.message),
    },
    explanation: { whyNow: input.whyNow, whyHere: input.whyHere, basedOn: input.basedOn, ifOmitted: input.ifOmitted, alternatives: input.alternatives ?? [] },
    requirementRefs: input.context.requirements.slice(0, 8).map((item) => item.id),
    qualityScenarioRefs: input.context.qualityScenarios.slice(0, 8).map((item) => item.id),
    styleRefs: input.context.acceptedStyleIds,
    patternRefs: input.patternRefs ?? [],
    tacticRefs: input.context.acceptedTacticIds,
    evidenceRefs: input.context.evidenceIds,
    knowledgeClaimRefs: [],
    qualityEffects: input.qualityEffects ?? [],
    obligations: input.obligations ?? [],
    risks: input.risks ?? [],
    mutationSet: set,
    ...(input.projectedCoverageDelta !== undefined ? { projectedCoverageDelta: input.projectedCoverageDelta } : {}),
    preview: buildGenerativePreview(id, set),
  };
}

function topQuality(project: ArchitectureProject, ids: string[]): { attributeId: string; weight: number } | undefined {
  return [...project.qualityPriorities].filter((item) => ids.includes(item.attributeId)).sort((a, b) => b.weight - a.weight)[0];
}

function inferPrimaryActor(project: ArchitectureProject): string {
  const text = `${project.description} ${project.objectives.join(' ')}`.toLowerCase();
  if (/customer|consumer|shopper|citizen|patient|student/.test(text)) return 'Customer';
  if (/employee|staff|agent|operator|administrator/.test(text)) return 'Staff User';
  if (/partner|merchant|supplier|vendor/.test(text)) return 'Business Partner';
  return 'Primary User';
}

function inferSystemName(project: ArchitectureProject): string {
  const cleaned = project.name.replace(/\b(reference|design|architecture|project)\b/gi, '').replace(/\s+/g, ' ').trim();
  return cleaned || 'System of Interest';
}

const DOMAIN_LEXICON: Array<{ re: RegExp; domain: string; service: string }> = [
  { re: /order|commerce|checkout|cart/, domain: 'Order Management Domain', service: 'Order Management Service' },
  { re: /payment|billing|invoice|settlement/, domain: 'Payment Domain', service: 'Payment Processing Service' },
  { re: /customer|client|profile|onboard/, domain: 'Customer Domain', service: 'Customer Management Service' },
  { re: /identity|auth|access|login/, domain: 'Identity Domain', service: 'Identity and Access Service' },
  { re: /report|analytics|insight|dashboard/, domain: 'Reporting Domain', service: 'Reporting and Insights Service' },
  { re: /fulfil|delivery|shipment|dispatch/, domain: 'Fulfilment Domain', service: 'Fulfilment Coordination Service' },
  { re: /case|complaint|support|service desk/, domain: 'Service Management Domain', service: 'Case Management Service' },
  { re: /risk|fraud|compliance/, domain: 'Risk and Compliance Domain', service: 'Risk Decision Service' },
];

function inferDomainCandidates(project: ArchitectureProject): Array<{ domain: string; service: string; source: string }> {
  const inputs = [project.description, ...project.objectives, ...project.constraints];
  const found: Array<{ domain: string; service: string; source: string }> = [];
  for (const text of inputs) {
    const match = DOMAIN_LEXICON.find((item) => item.re.test(text));
    if (match && !found.some((item) => item.domain === match.domain)) found.push({ domain: match.domain, service: match.service, source: text });
  }
  if (!found.length) found.push({ domain: 'Core Business Domain', service: 'Core Business Service', source: project.objectives[0] ?? project.description });
  return found.slice(0, 3);
}

function qualityDrivenLogicalAction(project: ArchitectureProject, context: GenerativeDesignContext, event: DesignGestureEvent, parentId?: string): GenerativeActionOption | null {
  const candidates = [
    { ids: ['security'], label: 'Identity and Access Service', description: 'Own authentication, authorization and identity-policy responsibilities.', quality: 'security', patternRefs: ['PAT-API-GATEWAY'] },
    { ids: ['availability', 'faultTolerance', 'reliability'], label: 'Resilience Coordination Service', description: 'Own failure isolation, retry and recovery responsibilities.', quality: 'availability', patternRefs: ['PAT-CIRCUIT-BREAKER'] },
    { ids: ['scalability', 'elasticity'], label: 'Asynchronous Work Coordinator', description: 'Own asynchronous workload distribution and back-pressure responsibilities.', quality: 'scalability', patternRefs: ['PAT-OUTBOX'] },
    { ids: ['performance'], label: 'Read-Optimized Query Service', description: 'Separate latency-sensitive query responsibilities from transactional changes.', quality: 'performance', patternRefs: ['PAT-CQRS'] },
  ];
  const selected = candidates.map((candidate) => ({ candidate, priority: topQuality(project, candidate.ids) })).filter((item) => (item.priority?.weight ?? 0) >= 4).sort((a, b) => (b.priority?.weight ?? 0) - (a.priority?.weight ?? 0))[0];
  if (!selected) return null;
  if (project.nodes.some((node) => node.stage === 'logicalApplication' && node.label === selected.candidate.label)) return null;
  const node = deterministicNode({ project, context, event, ...(parentId ? { scopeId: parentId, parentId } : {}), kind: 'LogicalService', label: selected.candidate.label, description: selected.candidate.description, stage: 'logicalApplication', decompositionLevel: 'system', lineageFrom: [], tags: ['quality-driven', selected.candidate.quality], properties: { supportedQualityAttribute: selected.candidate.quality } });
  return option({
    project,
    context,
    semanticKey: `quality-responsibility:${selected.candidate.quality}:${parentId ?? 'project'}`,
    actionType: 'apply-tactic',
    label: `Add ${selected.candidate.label}`,
    shortDescription: selected.candidate.description,
    authorityClass: 'knowledge-recommended',
    rank: 82 + (selected.priority?.weight ?? 0),
    confidence: 0.88,
    operations: [{ type: 'create-node', node }],
    ...(parentId ? { targetScopeId: parentId } : {}),
    whyNow: `${selected.candidate.quality} is a top-weighted quality driver.`,
    whyHere: parentId ? 'The selected system scope needs an explicit logical responsibility that realizes the driver.' : 'The logical model needs an explicit responsibility that realizes the driver.',
    basedOn: [`quality priority ${selected.candidate.quality}`, context.activeKnowledgeReleaseId, ...selected.candidate.patternRefs],
    ifOmitted: `The ${selected.candidate.quality} objective remains a narrative target without an owned logical responsibility.`,
    alternatives: ['Record a different tactic and responsibility', 'Defer with an explicit rationale'],
    qualityEffects: [{ attribute: selected.candidate.quality, effect: 'positive', explanation: `Creates an owned logical responsibility for ${selected.candidate.quality}.` }],
    patternRefs: selected.candidate.patternRefs,
    obligations: [{ id: `obl-${selected.candidate.quality}`, title: `Define measurable ${selected.candidate.quality} behavior`, mandatory: true }],
    projectedCoverageDelta: 12,
  });
}

function logicalActions(project: ArchitectureProject, context: GenerativeDesignContext, event: DesignGestureEvent): GenerativeActionOption[] {
  const actions: GenerativeActionOption[] = [];
  const selected = context.selectedScope ? project.nodes.find((node) => node.id === context.selectedScope?.scopeId) : undefined;
  const systems = project.nodes.filter((node) => node.stage === 'logicalApplication' && node.kind === 'System');
  const system = selected?.kind === 'System' ? selected : systems.find((node) => node.properties.systemOfInterest === true || node.tags.includes('system-of-interest')) ?? systems[0];

  if (!systems.length) {
    const systemNode = deterministicNode({ project, context, event, kind: 'System', label: inferSystemName(project), description: project.description || 'System boundary generated from the accepted design intent.', stage: 'logicalApplication', decompositionLevel: 'system', tags: ['system-of-interest', 'context'], properties: { systemOfInterest: true, objectiveIds: context.requirements.filter((item) => item.kind === 'objective').map((item) => item.id) } });
    actions.push(option({ project, context, semanticKey: 'establish-system-of-interest', actionType: 'create-element', label: `Create ${systemNode.label} boundary`, shortDescription: 'Establish the system of interest as the anchor for context and decomposition.', authorityClass: 'deterministic-required', rank: 100, confidence: 0.99, operations: [{ type: 'create-node', node: systemNode }], whyNow: 'Logical modelling cannot progress without a system of interest.', whyHere: 'The logical-application canvas is empty.', basedOn: ['STG-002', 'Q2L-SYSTEM', ...context.requirements.slice(0, 3).map((item) => item.id)], ifOmitted: 'Actors, domains and relationships have no governed system boundary.', alternatives: ['Select an existing system boundary', 'Clarify whether this project models a subsystem'], projectedCoverageDelta: 25 }));
  }

  const actorLabel = inferPrimaryActor(project);
  if (!project.nodes.some((node) => node.stage === 'logicalApplication' && node.kind === 'Actor' && node.label === actorLabel)) {
    const actor = deterministicNode({ project, context, event, kind: 'Actor', label: actorLabel, description: 'Primary human or organisational actor inferred deterministically from the design intent.', stage: 'logicalApplication', decompositionLevel: 'landscape', offset: 1, tags: ['external', 'context-actor'] });
    const operations: MutationOperation[] = [{ type: 'create-node', node: actor }];
    if (system) operations.push({ type: 'create-relationship', relationship: deterministicEdge(context, actor.id, system.id, 'communicatesWith', 'logicalApplication', 'uses') });
    actions.push(option({ project, context, semanticKey: `add-primary-actor:${actorLabel}`, actionType: 'compose-local-topology', label: `Add ${actorLabel}`, shortDescription: 'Add the primary actor and map its interaction with the system of interest.', authorityClass: 'architecture-inference', rank: system ? 83 : 68, confidence: 0.76, operations, ...(system ? { targetScopeId: system.id } : {}), whyNow: 'The requirements describe a user-facing outcome but the context model has no primary actor.', whyHere: system ? `The actor belongs at the boundary of ${system.label}.` : 'The actor belongs in the system-context view.', basedOn: context.requirements.slice(0, 4).map((item) => item.id), ifOmitted: 'The model cannot demonstrate who receives the intended outcome.', alternatives: ['Add a business partner', 'Add an automated external system'], projectedCoverageDelta: 10 }));
  }

  if (system) {
    const domainCandidates = inferDomainCandidates(project);
    for (const [index, candidate] of domainCandidates.entries()) {
      if (project.nodes.some((node) => node.stage === 'logicalApplication' && node.label === candidate.domain)) continue;
      const domain = deterministicNode({ project, context, event, scopeId: system.id, kind: 'Domain', label: candidate.domain, description: `Responsibility boundary derived from: ${candidate.source}`, stage: 'logicalApplication', decompositionLevel: 'system', offset: index + 1, parentId: system.id, tags: ['business-domain', 'requirement-derived'] });
      const service = deterministicNode({ project, context, event, scopeId: domain.id, kind: 'LogicalService', label: candidate.service, description: `Logical responsibility inside ${candidate.domain}.`, stage: 'logicalApplication', decompositionLevel: 'system', offset: index + 2, parentId: domain.id, lineageFrom: [], tags: ['business-service', 'requirement-derived'] });
      const contains = deterministicEdge(context, domain.id, service.id, 'contains', 'logicalApplication', 'contains responsibility');
      actions.push(option({ project, context, semanticKey: `decompose-system:${system.id}:${candidate.domain}`, actionType: 'decompose-scope', label: `Add ${candidate.domain}`, shortDescription: `Create ${candidate.domain} with ${candidate.service}.`, authorityClass: 'architecture-inference', rank: 90 - index * 3, confidence: 0.84 - index * 0.04, operations: [{ type: 'create-node', node: domain }, { type: 'create-node', node: service }, { type: 'create-relationship', relationship: contains }], targetScopeId: system.id, whyNow: 'The requirements contain a stable business responsibility that is not yet represented.', whyHere: `${system.label} is the selected system boundary.`, basedOn: [candidate.source, 'Q2L-DOMAIN', context.activeKnowledgeReleaseId], ifOmitted: 'The system remains an undifferentiated box and cannot be realized into owned application responsibilities.', alternatives: domainCandidates.filter((item) => item.domain !== candidate.domain).map((item) => item.domain), projectedCoverageDelta: Math.max(8, 20 - index * 4) }));
    }
    const qualityAction = qualityDrivenLogicalAction(project, context, event, system.id);
    if (qualityAction) actions.push(qualityAction);
  }

  if (selected && (selected.kind === 'Actor' || selected.kind === 'ExternalSystem') && system && !project.edges.some((edge) => (edge.sourceId === selected.id && edge.targetId === system.id) || (edge.sourceId === system.id && edge.targetId === selected.id))) {
    const edge = deterministicEdge(context, selected.id, system.id, selected.kind === 'Actor' ? 'communicatesWith' : 'dependsOn', 'logicalApplication', selected.kind === 'Actor' ? 'uses' : 'integrates with');
    actions.push(option({ project, context, semanticKey: `map-context-relationship:${selected.id}:${system.id}`, actionType: 'map-relationship', label: `Connect ${selected.label} to ${system.label}`, shortDescription: 'Preserve the context interaction as an explicit semantic relationship.', authorityClass: 'deterministic-required', rank: 96, confidence: 0.98, operations: [{ type: 'create-relationship', relationship: edge }], targetScopeId: selected.id, whyNow: 'The selected context object has no interaction in the model.', whyHere: `${selected.label} is adjacent to the system of interest.`, basedOn: ['STG-005', 'Q2L-CONTEXT-INTERACTION'], ifOmitted: 'The context object is orphaned and its architectural relevance is unclear.', alternatives: ['Reverse the dependency direction', 'Mark the object out of scope'], projectedCoverageDelta: 8 }));
  }

  return actions;
}

function inferRealizationPosture(project: ArchitectureProject, scope: ArchitectureNode): 'api' | 'worker' | 'component' {
  const text = `${scope.label} ${scope.description ?? ''} ${scope.tags.join(' ')}`.toLowerCase();
  if (/event|async|queue|process|worker|job|notification|fulfil|settle/.test(text) || project.styleDecisions.some((item) => item.status === 'accepted' && /EVENT/i.test(item.styleId))) return 'worker';
  if (/api|query|customer|channel|gateway|request|service/.test(text)) return 'api';
  return 'component';
}

function realizationActionsForScope(project: ArchitectureProject, context: GenerativeDesignContext, event: DesignGestureEvent, scope: ArchitectureNode): GenerativeActionOption[] {
  const actions: GenerativeActionOption[] = [];
  const existing = project.nodes.filter((node) => node.stage === 'applicationRealization' && node.lineageFrom.includes(scope.id));
  const system = scope.kind === 'System' ? scope : project.nodes.find((node) => node.kind === 'System' && node.stage === 'logicalApplication' && (scope.parentId === node.id || node.properties.systemOfInterest === true));

  if (scope.kind === 'System') {
    const externalInteractions = project.edges.filter((edge) => edge.stage === 'logicalApplication' && (edge.sourceId === scope.id || edge.targetId === scope.id)).filter((edge) => {
      const other = project.nodes.find((node) => node.id === (edge.sourceId === scope.id ? edge.targetId : edge.sourceId));
      return other?.kind === 'Actor' || other?.kind === 'ExternalSystem';
    });
    if (externalInteractions.length && !project.nodes.some((node) => node.stage === 'applicationRealization' && /gateway/i.test(node.label))) {
      const gateway = deterministicNode({ project, context, event, scopeId: scope.id, kind: 'ApplicationComponent', label: `${scope.label} API Gateway`, description: 'Public entry point for authentication, routing, throttling and observability.', stage: 'applicationRealization', decompositionLevel: 'container', parentId: scope.id, lineageFrom: [scope.id], tags: ['api-gateway', 'security-boundary'], properties: { public: true, responsibility: 'External API policy and routing' } });
      actions.push(option({ project, context, semanticKey: `realize-system-edge:${scope.id}`, actionType: 'compose-local-topology', label: 'Add governed API entry point', shortDescription: 'Create an API gateway realization for external interactions.', authorityClass: 'knowledge-recommended', rank: 94, confidence: 0.91, operations: [{ type: 'create-node', node: gateway }], targetScopeId: scope.id, whyNow: 'The logical context includes external interactions and security is an active design concern.', whyHere: `${scope.label} owns the external trust boundary.`, basedOn: ['L2R-SYSTEM-EDGE', 'PAT-API-GATEWAY', ...externalInteractions.map((item) => item.id)], ifOmitted: 'Authentication, throttling and routing responsibilities remain distributed or implicit.', alternatives: ['Direct channel-to-service access with explicit controls', 'Backend-for-Frontend per channel'], patternRefs: ['PAT-API-GATEWAY'], qualityEffects: [{ attribute: 'security', effect: 'positive', explanation: 'Centralizes external access-control policy.' }, { attribute: 'availability', effect: 'mixed', explanation: 'Adds a control point that must itself be resilient.' }], obligations: [{ id: 'obl-gateway-ha', title: 'Make the API entry point highly available', mandatory: true }], projectedCoverageDelta: 14 }));
    }
  }

  if (scope.kind === 'Domain' || scope.kind === 'LogicalService') {
    const posture = inferRealizationPosture(project, scope);
    if (!existing.length || !existing.some((node) => node.kind === 'DeployableUnit' || node.kind === 'ApplicationComponent')) {
      const label = posture === 'worker' ? `${scope.label.replace(/ Service$/i, '')} Worker` : posture === 'api' ? `${scope.label.replace(/ Service$/i, '')} API` : `${scope.label.replace(/ Domain$/i, '')} Application Component`;
      const kind: ArchitectureNode['kind'] = posture === 'component' ? 'ApplicationComponent' : 'DeployableUnit';
      const realization = deterministicNode({ project, context, event, scopeId: scope.id, kind, label, description: `Application realization of ${scope.label}.`, stage: 'applicationRealization', decompositionLevel: 'container', ...(system ? { parentId: system.id } : {}), lineageFrom: [scope.id], tags: [posture, 'realization'], properties: { responsibility: scope.description ?? scope.label, public: posture === 'api' && project.edges.some((edge) => edge.targetId === scope.id && project.nodes.some((node) => node.id === edge.sourceId && node.kind === 'Actor')) } });
      const operations: MutationOperation[] = [{ type: 'create-node', node: realization }];
      const interfaceConsumers = project.edges.filter((edge) => edge.stage === 'logicalApplication' && edge.targetId === scope.id).map((edge) => edge.sourceId).filter((id) => project.nodes.some((node) => node.id === id && (node.kind === 'Actor' || node.kind === 'ExternalSystem')));
      if (posture === 'api' && interfaceConsumers.length) {
        operations.push({ type: 'create-interface', interface: deterministicInterface(context, realization.id, interfaceConsumers, `${scope.label} API`, `Invoke ${scope.label}`) });
      }
      actions.push(option({ project, context, semanticKey: `realize-scope:${scope.id}:${posture}`, actionType: 'decompose-scope', label: `Realize as ${posture === 'worker' ? 'event worker' : posture === 'api' ? 'API application' : 'application component'}`, shortDescription: `Create ${label} with lineage back to ${scope.label}.`, authorityClass: 'deterministic-eligible', rank: 98, confidence: 0.94, operations, targetScopeId: scope.id, whyNow: `${scope.label} has no accepted application realization.`, whyHere: `The proposal is scoped to ${scope.label} and preserves its responsibility lineage.`, basedOn: ['STG-003', 'L2R-LINEAGE', ...context.acceptedStyleIds, ...context.acceptedPatternIds], ifOmitted: 'The logical responsibility remains unassigned to an implementable application boundary.', alternatives: posture === 'api' ? ['Realize as event worker', 'Merge into an existing modular application'] : ['Realize as API application', 'Merge into an existing modular application'], projectedCoverageDelta: Math.round(100 / Math.max(1, context.unresolvedUpstreamScopeIds.length)) }));
    }

    const dataHint = /order|payment|customer|account|case|record|state|ledger|profile/.test(`${scope.label} ${scope.description ?? ''}`.toLowerCase());
    if (dataHint && !existing.some((node) => node.kind === 'DataStore') && !project.nodes.some((node) => node.stage === 'applicationRealization' && node.kind === 'DataStore' && node.lineageFrom.includes(scope.id))) {
      const store = deterministicNode({ project, context, event, scopeId: scope.id, kind: 'DataStore', label: `${scope.label.replace(/ Service| Domain/gi, '')} State Store`, description: `Owned state for ${scope.label}.`, stage: 'applicationRealization', decompositionLevel: 'container', ...(system ? { parentId: system.id } : {}), lineageFrom: [scope.id], tags: ['data', 'owned-state'], properties: { owner: scope.properties.owner ?? 'Architecture owner to assign', consistency: topQuality(project, ['consistency'])?.weight && topQuality(project, ['consistency'])!.weight >= 4 ? 'strong' : 'to-be-decided' } });
      const provider = existing.find((node) => node.kind === 'DeployableUnit' || node.kind === 'ApplicationComponent');
      const operations: MutationOperation[] = [{ type: 'create-node', node: store }];
      if (provider) operations.push({ type: 'create-relationship', relationship: deterministicEdge(context, provider.id, store.id, 'writes', 'applicationRealization', 'owns state') });
      actions.push(option({ project, context, semanticKey: `owned-state:${scope.id}`, actionType: 'create-element', label: `Add owned state for ${scope.label}`, shortDescription: 'Make data ownership and consistency responsibilities explicit.', authorityClass: 'architecture-inference', rank: 76, confidence: 0.78, operations, targetScopeId: scope.id, whyNow: 'The logical responsibility contains stateful business concepts.', whyHere: `${scope.label} should own or explicitly delegate its state.`, basedOn: ['L2R-SERVICE-API', ...context.requirements.slice(0, 3).map((item) => item.id)], ifOmitted: 'Data ownership and consistency remain ambiguous.', alternatives: ['Use an existing shared store with an explicit exception', 'Model the scope as stateless'], qualityEffects: [{ attribute: 'modifiability', effect: 'positive', explanation: 'Makes data ownership explicit.' }, { attribute: 'consistency', effect: 'mixed', explanation: 'Requires a consistency and transaction-boundary decision.' }], obligations: [{ id: `obl-data-${scope.id}`, title: 'Define classification, backup, RPO and RTO', mandatory: true }], projectedCoverageDelta: 5 }));
    }
  }


  if (scope.stage === 'applicationRealization' && ['DeployableUnit', 'ApplicationComponent'].includes(scope.kind)) {
    const existingComponents = project.nodes.filter((node) => node.stage === 'applicationRealization' && node.parentId === scope.id && ['Module', 'API', 'Control', 'Event'].includes(node.kind));
    const baseComponents: Array<{ kind: ArchitectureNode['kind']; label: string; description: string; tags: string[] }> = [
      { kind: 'Module', label: `${scope.label} Use-Case Coordinator`, description: `Coordinates application use cases owned by ${scope.label}.`, tags: ['c4-component', 'application-service'] },
      { kind: 'Module', label: `${scope.label} Domain Adapter`, description: `Maps application commands and queries to domain responsibilities for ${scope.label}.`, tags: ['c4-component', 'domain-adapter'] },
      { kind: 'API', label: `${scope.label} Contract Adapter`, description: `Owns inbound or outbound contract translation for ${scope.label}.`, tags: ['c4-component', 'interface-adapter'] },
    ];
    const missing = baseComponents.filter((candidate) => !existingComponents.some((node) => node.label === candidate.label));
    if (missing.length) {
      const operations: MutationOperation[] = missing.map((candidate, index) => ({
        type: 'create-node',
        node: deterministicNode({
          project,
          context,
          event,
          scopeId: scope.id,
          kind: candidate.kind,
          label: candidate.label,
          description: candidate.description,
          stage: 'applicationRealization',
          decompositionLevel: 'component',
          offset: index,
          parentId: scope.id,
          lineageFrom: [...scope.lineageFrom, scope.id],
          tags: candidate.tags,
          properties: { c4Level: 'component', containerId: scope.id },
        }),
      }));
      const generatedNodes = operations.flatMap((operation) => operation.type === 'create-node' ? [operation.node] : []);
      if (generatedNodes.length >= 2) operations.push({ type: 'create-relationship', relationship: deterministicEdge(context, generatedNodes[0]!.id, generatedNodes[1]!.id, 'dependsOn', 'applicationRealization', 'coordinates domain work') });
      if (generatedNodes.length >= 3) operations.push({ type: 'create-relationship', relationship: deterministicEdge(context, generatedNodes[2]!.id, generatedNodes[0]!.id, 'communicatesWith', 'applicationRealization', 'invokes use case') });
      actions.push(option({
        project,
        context,
        semanticKey: `c4-component-decomposition:${scope.id}`,
        actionType: 'decompose-scope',
        label: `Decompose ${scope.label} into components`,
        shortDescription: 'Create a C4-style component model inside the selected container boundary.',
        authorityClass: 'deterministic-eligible',
        rank: 102,
        confidence: 0.93,
        operations,
        targetScopeId: scope.id,
        whyNow: `${scope.label} is a realized container with no complete internal responsibility model.`,
        whyHere: `The selected container is the correct boundary for component decomposition.`,
        basedOn: ['C4-CONTAINER-TO-COMPONENT', 'STG-003', ...context.acceptedPatternIds],
        ifOmitted: 'Implementation responsibilities remain hidden inside an undifferentiated deployable box.',
        alternatives: ['Keep the container black-boxed and record why component detail is unnecessary', 'Import components from architecture-as-code'],
        projectedCoverageDelta: 12,
      }));
    }

    for (const patternId of context.acceptedPatternIds) {
      const kit = EXECUTABLE_PATTERN_KITS.find((candidate) => candidate.id === patternId && candidate.appliesTo.includes(scope.kind) && candidate.targetStage === 'applicationRealization');
      if (!kit) continue;
      const missingLabels = kit.componentLabels.filter((label) => !project.nodes.some((node) => node.parentId === scope.id && node.label === `${scope.label} ${label}`));
      if (!missingLabels.length) continue;
      const operations: MutationOperation[] = [];
      const nodes = missingLabels.map((label, index) => deterministicNode({
        project,
        context,
        event,
        scopeId: scope.id,
        kind: /policy|guard|monitor/i.test(label) ? 'Control' : /publisher|handler|updater|adapter/i.test(label) ? 'Module' : 'ApplicationComponent',
        label: `${scope.label} ${label}`,
        description: `${label} generated from executable Pattern DNA kit ${patternId}.`,
        stage: 'applicationRealization',
        decompositionLevel: 'component',
        offset: index + 3,
        parentId: scope.id,
        lineageFrom: [...scope.lineageFrom, scope.id],
        tags: ['pattern-dna-generated', patternId.toLowerCase()],
        properties: { patternId, patternKitRelease: context.activeKnowledgeReleaseId, c4Level: 'component' },
      }));
      operations.push(...nodes.map((node) => ({ type: 'create-node', node } as MutationOperation)));
      if (nodes[0]) operations.push({ type: 'create-relationship', relationship: deterministicEdge(context, scope.id, nodes[0].id, 'contains', 'applicationRealization', `applies ${patternId}`) });
      for (let index = 1; index < nodes.length; index += 1) {
        operations.push({ type: 'create-relationship', relationship: deterministicEdge(context, nodes[index - 1]!.id, nodes[index]!.id, kit.relationshipPosture === 'asynchronous' ? 'publishes' : 'dependsOn', 'applicationRealization', kit.relationshipPosture === 'asynchronous' ? 'emits' : 'uses') });
      }
      for (const [index, obligation] of kit.obligations.entries()) operations.push({ type: 'create-obligation', obligation: { id: `gac-obligation-${slug(`${patternId}-${scope.id}-${index}`)}`, title: obligation, description: obligation, scopeId: scope.id, mandatory: true, sourceRefs: [patternId, context.activeKnowledgeReleaseId] } });
      for (const [index, statement] of kit.fitnessTests.entries()) operations.push({ type: 'create-fitness-test', fitnessTest: { id: `gac-fitness-${slug(`${patternId}-${scope.id}-${index}`)}`, title: `${patternId} fitness test`, statement, scopeId: scope.id, sourceRefs: [patternId, context.activeKnowledgeReleaseId] } });
      actions.push(option({
        project,
        context,
        semanticKey: `apply-pattern-kit:${patternId}:${scope.id}`,
        actionType: 'apply-pattern',
        label: `Apply ${patternId.replace('PAT-', '').replaceAll('-', ' ')}`,
        shortDescription: `Generate the executable ${patternId} component, relationship and obligation kit inside ${scope.label}.`,
        authorityClass: 'knowledge-recommended',
        rank: 96,
        confidence: 0.92,
        operations,
        targetScopeId: scope.id,
        whyNow: `${patternId} is accepted for this architecture and has not yet been realized inside ${scope.label}.`,
        whyHere: `${scope.label} is an eligible realization boundary for this Pattern DNA kit.`,
        basedOn: [patternId, context.activeKnowledgeReleaseId],
        ifOmitted: 'The pattern remains a recorded decision without executable topology, obligations or conformance checks.',
        alternatives: ['Reject or supersede the pattern decision', 'Apply an equivalent governed implementation manually'],
        patternRefs: [patternId],
        obligations: kit.obligations.map((title, index) => ({ id: `gac-obligation-${slug(`${patternId}-${scope.id}-${index}`)}`, title, mandatory: true })),
        projectedCoverageDelta: 10,
      }));
    }
  }

  const quality = topQuality(project, ['availability', 'faultTolerance', 'security', 'scalability']);
  if (scope.kind === 'LogicalService' && quality && quality.weight >= 4) {
    const existingRealization = existing.find((node) => ['DeployableUnit', 'ApplicationComponent'].includes(node.kind));
    if (existingRealization && quality.attributeId === 'security' && !project.nodes.some((node) => node.stage === 'applicationRealization' && node.kind === 'Control' && node.lineageFrom.includes(scope.id))) {
      const control = deterministicNode({ project, context, event, scopeId: scope.id, kind: 'Control', label: `${scope.label} Access Control`, description: 'Authentication and authorization control for the realized service boundary.', stage: 'applicationRealization', decompositionLevel: 'component', parentId: existingRealization.id, lineageFrom: [scope.id], tags: ['security', 'access-control'], properties: { authentication: 'OIDC/OAuth2 to be confirmed', authorization: 'least privilege' } });
      const edge = deterministicEdge(context, existingRealization.id, control.id, 'protectedBy', 'applicationRealization', 'protected by');
      actions.push(option({ project, context, semanticKey: `security-control:${scope.id}`, actionType: 'apply-tactic', label: 'Add access-control responsibility', shortDescription: `Protect ${existingRealization.label} with an explicit control component.`, authorityClass: 'knowledge-recommended', rank: 84, confidence: 0.89, operations: [{ type: 'create-node', node: control }, { type: 'create-relationship', relationship: edge }], targetScopeId: scope.id, whyNow: 'Security is a top driver and the realization has no explicit access-control component.', whyHere: `${existingRealization.label} is the implementable boundary for this responsibility.`, basedOn: ['security quality priority', 'L2R-TRUST-BOUNDARY'], ifOmitted: 'Authentication and authorization remain properties without an owned enforcement point.', alternatives: ['Delegate to a shared gateway and record the dependency'], qualityEffects: [{ attribute: 'security', effect: 'positive', explanation: 'Makes the enforcement point explicit.' }], obligations: [{ id: `obl-access-${scope.id}`, title: 'Define authentication and authorization policy', mandatory: true }], projectedCoverageDelta: 6 }));
    }
  }

  return actions;
}

function realizationActions(project: ArchitectureProject, context: GenerativeDesignContext, event: DesignGestureEvent): GenerativeActionOption[] {
  const selected = context.selectedScope ? project.nodes.find((node) => node.id === context.selectedScope?.scopeId) : undefined;
  const queue = selected
    ? [selected.id]
    : buildScopeFocusQueue(project, context).filter((id) => id !== 'intent:project');
  const actions: GenerativeActionOption[] = [];
  for (const scopeId of queue.slice(0, 12)) {
    const scope = project.nodes.find((node) => node.id === scopeId);
    if (!scope) continue;
    actions.push(...realizationActionsForScope(project, context, event, scope));
    // Keep the interaction bounded while still skipping scopes that are already complete
    // or that have no eligible realization action.
    if (actions.length >= NOISE_BUDGET * 2) break;
  }
  return actions;
}


function bestDownstreamFor(project: ArchitectureProject, sourceId: string, targetStage: ArchitectureStage): ArchitectureNode | undefined {
  return project.nodes.find((node) => node.stage === targetStage && node.lineageFrom.includes(sourceId));
}

function mappedRelationshipExists(project: ArchitectureProject, sourceId: string, targetId: string, stage: ArchitectureStage): boolean {
  return project.edges.some((edge) => edge.stage === stage && edge.sourceId === sourceId && edge.targetId === targetId);
}

function relationshipPropagationActions(project: ArchitectureProject, context: GenerativeDesignContext): GenerativeActionOption[] {
  const sourceStage = context.architectureStage;
  const targetStage = context.targetArchitectureStage;
  const actions: GenerativeActionOption[] = [];
  const candidateEdges = project.edges.filter((edge) => edge.stage === sourceStage && edge.kind !== 'contains');
  for (const sourceEdge of candidateEdges.slice(0, 24)) {
    const sourceTarget = bestDownstreamFor(project, sourceEdge.sourceId, targetStage);
    const targetTarget = bestDownstreamFor(project, sourceEdge.targetId, targetStage);
    if (!sourceTarget || !targetTarget || mappedRelationshipExists(project, sourceTarget.id, targetTarget.id, targetStage)) continue;
    const asyncPosture = sourceEdge.kind === 'publishes' || sourceEdge.kind === 'subscribes' || sourceEdge.properties.protocolStyle === 'asynchronous';
    const targetKind: ArchitectureEdge['kind'] = targetStage === 'physicalTechnology' ? 'communicatesWith' : asyncPosture ? 'publishes' : sourceEdge.kind === 'dependsOn' ? 'dependsOn' : 'communicatesWith';
    const relationship = deterministicEdge(context, sourceTarget.id, targetTarget.id, targetKind, targetStage, sourceEdge.label ?? (asyncPosture ? 'publishes event' : 'communicates with'));
    relationship.properties = { ...relationship.properties, propagatedFromRelationshipId: sourceEdge.id, disposition: 'refined', sourceRelationshipKind: sourceEdge.kind };
    const operations: MutationOperation[] = [{ type: 'create-relationship', relationship }];
    if (targetStage === 'applicationRealization') {
      const existingContract = (project.interfaces ?? []).some((contract) => contract.providerNodeId === targetTarget.id && contract.consumerNodeIds.includes(sourceTarget.id));
      if (!existingContract) {
        operations.push({
          type: 'create-interface',
          interface: asyncPosture
            ? deterministicEventInterface(context, sourceTarget.id, [targetTarget.id], `${sourceTarget.label} to ${targetTarget.label} event`, sourceEdge.label ?? 'DomainEvent')
            : deterministicInterface(context, targetTarget.id, [sourceTarget.id], `${targetTarget.label} API`, sourceEdge.label ?? `Invoke ${targetTarget.label}`),
        });
      }
    }
    actions.push(option({
      project,
      context,
      semanticKey: `propagate-relationship:${sourceEdge.id}:${targetStage}`,
      actionType: 'map-relationship',
      label: `Map ${sourceTarget.label} → ${targetTarget.label}`,
      shortDescription: `Refine upstream relationship “${sourceEdge.label ?? sourceEdge.kind}” into the ${targetStage} model.`,
      authorityClass: 'deterministic-required',
      rank: 101,
      confidence: 0.97,
      operations,
      targetScopeId: sourceEdge.sourceId,
      whyNow: 'Both upstream endpoints have downstream realizations, but their interaction has not yet been mapped.',
      whyHere: `${sourceEdge.label ?? sourceEdge.kind} must remain traceable across the stage boundary.`,
      basedOn: [sourceEdge.id, 'RELATIONSHIP-PROPAGATION', context.activeKnowledgeReleaseId],
      ifOmitted: 'The downstream model would contain disconnected objects and lose interaction lineage.',
      alternatives: ['Explicitly defer the relationship with a rationale', 'Replace it with an event or batch contract'],
      projectedCoverageDelta: 6,
    }));
  }
  return actions;
}

const LOGICAL_TECH_KITS: Array<{
  re: RegExp;
  label: string;
  tags: string[];
  capabilityType: string;
}> = [
  { re: /api|gateway|public|http|request/i, label: 'API Management Capability', tags: ['integration', 'api-management'], capabilityType: 'integration' },
  { re: /worker|event|queue|outbox|publisher|subscriber/i, label: 'Messaging and Event Streaming Capability', tags: ['integration', 'messaging'], capabilityType: 'messaging' },
  { re: /store|database|state|ledger|record/i, label: 'Durable Data Management Capability', tags: ['data', 'persistence'], capabilityType: 'data' },
  { re: /control|identity|access|authentication|authorization/i, label: 'Identity and Policy Enforcement Capability', tags: ['security', 'identity'], capabilityType: 'security' },
  { re: /cache|query|read/i, label: 'Caching and Read Optimization Capability', tags: ['performance', 'cache'], capabilityType: 'performance' },
];

function logicalTechnologyActions(project: ArchitectureProject, context: GenerativeDesignContext, event: DesignGestureEvent): GenerativeActionOption[] {
  const selected = context.selectedScope ? project.nodes.find((node) => node.id === context.selectedScope?.scopeId) : undefined;
  const queue = selected ? [selected.id] : buildScopeFocusQueue(project, context).filter((id) => id !== 'intent:project');
  const actions: GenerativeActionOption[] = [];
  for (const scopeId of queue.slice(0, 18)) {
    const scope = project.nodes.find((node) => node.id === scopeId);
    if (!scope || scope.stage !== 'applicationRealization') continue;
    const existing = project.nodes.filter((node) => node.stage === 'logicalTechnology' && node.lineageFrom.includes(scope.id));
    const text = `${scope.label} ${scope.description ?? ''} ${scope.tags.join(' ')}`;
    const kits = LOGICAL_TECH_KITS.filter((kit) => kit.re.test(text));
    if (!kits.length && ['DeployableUnit', 'ApplicationComponent', 'Module'].includes(scope.kind)) kits.push({ re: /.*/, label: 'Application Runtime Capability', tags: ['runtime', 'compute'], capabilityType: 'runtime' });
    for (const [index, kit] of kits.entries()) {
      if (existing.some((node) => node.label === kit.label)) continue;
      const capability = deterministicNode({
        project,
        context,
        event,
        scopeId: scope.id,
        kind: 'LogicalTechnologyCapability',
        label: kit.label,
        description: `${kit.label} required to enable ${scope.label}.`,
        stage: 'logicalTechnology',
        decompositionLevel: 'deployment',
        offset: index,
        lineageFrom: [scope.id],
        tags: [...kit.tags, 'provider-neutral'],
        properties: {
          capabilityType: kit.capabilityType,
          providerNeutral: true,
          interfaceRequirementIds: (project.interfaces ?? []).filter((contract) => contract.providerNodeId === scope.id || contract.consumerNodeIds.includes(scope.id)).map((contract) => contract.id),
          qualityChain: context.qualityScenarios.slice(0, 5).map((scenario) => scenario.attribute),
        },
      });
      const operations: MutationOperation[] = [{ type: 'create-node', node: capability }];
      operations.push({ type: 'create-lineage', sourceId: scope.id, targetId: capability.id, relationship: 'mapsTo' });
      actions.push(option({
        project,
        context,
        semanticKey: `logical-technology:${scope.id}:${kit.capabilityType}`,
        actionType: 'decompose-scope',
        label: `Add ${kit.label}`,
        shortDescription: `Map ${scope.label} to a provider-neutral ${kit.capabilityType} capability.`,
        authorityClass: 'deterministic-eligible',
        rank: 98 - index,
        confidence: 0.94,
        operations,
        targetScopeId: scope.id,
        whyNow: `${scope.label} is realized but has no complete provider-neutral technology capability mapping.`,
        whyHere: `${scope.label} creates the runtime, integration, data or control requirement represented by this capability.`,
        basedOn: ['R2T-LINEAGE', ...context.acceptedPatternIds, ...context.qualityScenarios.slice(0, 4).map((scenario) => scenario.id)],
        ifOmitted: 'The architecture jumps from application responsibilities directly to products without an explainable provider-neutral technology layer.',
        alternatives: ['Map to an existing shared technology capability', 'Defer with an explicit platform dependency'],
        projectedCoverageDelta: Math.round(100 / Math.max(1, context.unresolvedUpstreamScopeIds.length)),
      }));
    }
  }

  const qualities = [...project.qualityPriorities].filter((priority) => priority.weight >= 4).sort((a, b) => b.weight - a.weight);
  const qualityCapabilityMap: Record<string, { label: string; tags: string[]; patternRefs: string[] }> = {
    availability: { label: 'Service Resilience and Failover Capability', tags: ['availability', 'resilience'], patternRefs: ['PAT-CIRCUIT-BREAKER'] },
    faultTolerance: { label: 'Failure Isolation and Recovery Capability', tags: ['fault-tolerance', 'resilience'], patternRefs: ['PAT-CIRCUIT-BREAKER'] },
    security: { label: 'Identity, Secrets and Policy Capability', tags: ['security', 'identity'], patternRefs: ['PAT-API-GATEWAY'] },
    scalability: { label: 'Elastic Runtime and Back-pressure Capability', tags: ['scalability', 'elasticity'], patternRefs: ['PAT-OUTBOX'] },
    performance: { label: 'Caching and Read Optimization Capability', tags: ['performance', 'cache'], patternRefs: ['PAT-CQRS'] },
    observability: { label: 'Telemetry and Operational Insight Capability', tags: ['observability', 'telemetry'], patternRefs: [] },
    recoverability: { label: 'Backup and Recovery Capability', tags: ['recoverability', 'backup'], patternRefs: [] },
  };
  for (const quality of qualities.slice(0, 3)) {
    const mapping = qualityCapabilityMap[quality.attributeId];
    if (!mapping || project.nodes.some((node) => node.stage === 'logicalTechnology' && node.label === mapping.label)) continue;
    const capability = deterministicNode({ project, context, event, kind: 'LogicalTechnologyCapability', label: mapping.label, description: `Provider-neutral capability derived from the high-priority ${quality.attributeId} driver.`, stage: 'logicalTechnology', decompositionLevel: 'deployment', tags: [...mapping.tags, 'quality-driven', 'provider-neutral'], properties: { supportedQualityAttribute: quality.attributeId, qualityWeight: quality.weight, tacticChain: `${quality.attributeId} → tactic → logical technology capability` } });
    actions.push(option({ project, context, semanticKey: `quality-capability:${quality.attributeId}`, actionType: 'apply-tactic', label: `Realize ${quality.attributeId} as a technology capability`, shortDescription: `Create ${mapping.label} from the quality-driver-to-tactic chain.`, authorityClass: 'knowledge-recommended', rank: 92 + quality.weight, confidence: 0.91, operations: [{ type: 'create-node', node: capability }], whyNow: `${quality.attributeId} is weighted ${quality.weight}/5 but has no explicit technology capability.`, whyHere: 'The logical technology stage must make the tactic and platform responsibility explicit before product selection.', basedOn: [`quality:${quality.attributeId}`, ...mapping.patternRefs, context.activeKnowledgeReleaseId], ifOmitted: `The ${quality.attributeId} target remains a narrative statement rather than a platform responsibility.`, alternatives: ['Use an existing enterprise capability and record the dependency', 'Lower or defer the driver with governance approval'], patternRefs: mapping.patternRefs, qualityEffects: [{ attribute: quality.attributeId, effect: 'positive', explanation: 'Creates an explicit provider-neutral technology responsibility.' }], projectedCoverageDelta: 8 }));
  }

  actions.push(...relationshipPropagationActions(project, context));
  return actions;
}

function inferPhysicalProduct(scope: ArchitectureNode): { label: string; productClass: string; tags: string[] } {
  const text = `${scope.label} ${scope.tags.join(' ')}`.toLowerCase();
  if (/api management|gateway/.test(text)) return { label: 'Managed API Gateway Product', productClass: 'api-management', tags: ['integration', 'gateway'] };
  if (/messaging|event|stream|queue/.test(text)) return { label: 'Managed Messaging Product', productClass: 'messaging', tags: ['integration', 'messaging'] };
  if (/data|database|persistence|store/.test(text)) return { label: 'Managed Database Product', productClass: 'database', tags: ['data', 'managed-database'] };
  if (/identity|policy|security|secret/.test(text)) return { label: 'Identity and Key Management Product', productClass: 'identity-security', tags: ['security', 'identity'] };
  if (/observability|telemetry|insight/.test(text)) return { label: 'Observability Platform Product', productClass: 'observability', tags: ['observability', 'telemetry'] };
  if (/backup|recovery/.test(text)) return { label: 'Backup and Recovery Product', productClass: 'recovery', tags: ['recoverability', 'backup'] };
  return { label: 'Application Runtime Product', productClass: 'runtime', tags: ['runtime', 'compute'] };
}

function physicalTechnologyActions(project: ArchitectureProject, context: GenerativeDesignContext, event: DesignGestureEvent): GenerativeActionOption[] {
  const selected = context.selectedScope ? project.nodes.find((node) => node.id === context.selectedScope?.scopeId) : undefined;
  const queue = selected ? [selected.id] : buildScopeFocusQueue(project, context).filter((id) => id !== 'intent:project');
  const actions: GenerativeActionOption[] = [];
  const availability = topQuality(project, ['availability', 'faultTolerance', 'reliability']);
  const security = topQuality(project, ['security']);
  const environment = project.nodes.find((node) => node.stage === 'physicalTechnology' && node.kind === 'Environment' && node.label === 'Production Environment');
  for (const scopeId of queue.slice(0, 18)) {
    const scope = project.nodes.find((node) => node.id === scopeId);
    if (!scope || scope.stage !== 'logicalTechnology') continue;
    const existing = project.nodes.filter((node) => node.stage === 'physicalTechnology' && node.lineageFrom.includes(scope.id));
    const product = inferPhysicalProduct(scope);
    if (existing.some((node) => node.kind === 'TechnologyProduct')) continue;
    const env = environment ?? deterministicNode({ project, context, event, kind: 'Environment', label: 'Production Environment', description: 'Governed production environment boundary.', stage: 'physicalTechnology', decompositionLevel: 'deployment', tags: ['environment', 'production'], properties: { environment: 'production' } });
    const productNode = deterministicNode({ project, context, event, scopeId: scope.id, kind: 'TechnologyProduct', label: `${scope.label} — ${product.label}`, description: `Provider-neutral physical product class for ${scope.label}; provider overlay is selected later.`, stage: 'physicalTechnology', decompositionLevel: 'deployment', offset: 1, parentId: env.id, lineageFrom: [scope.id], tags: [...product.tags, 'provider-neutral-product-class'], properties: { productClass: product.productClass, providerNeutral: true, providerOverlayStatus: 'not-selected', supportedCapabilityId: scope.id } });
    const deployment = deterministicNode({ project, context, event, scopeId: scope.id, kind: 'DeploymentNode', label: `${scope.label} Deployment`, description: `Deployment topology for ${scope.label}.`, stage: 'physicalTechnology', decompositionLevel: 'deployment', offset: 2, parentId: env.id, lineageFrom: [scope.id], tags: ['deployment', product.productClass], properties: { replicas: availability && availability.weight >= 4 ? 2 : 1, availabilityZones: availability && availability.weight >= 4 ? 2 : 1, autoscaling: topQuality(project, ['scalability'])?.weight && topQuality(project, ['scalability'])!.weight >= 4, networkSegmentation: Boolean(security && security.weight >= 4), providerNeutral: true } });
    const operations: MutationOperation[] = [];
    if (!environment) operations.push({ type: 'create-node', node: env });
    operations.push({ type: 'create-node', node: productNode }, { type: 'create-node', node: deployment });
    operations.push({ type: 'create-relationship', relationship: deterministicEdge(context, productNode.id, deployment.id, 'deployedOn', 'physicalTechnology', 'deployed on') });
    operations.push({ type: 'create-lineage', sourceId: scope.id, targetId: productNode.id, relationship: 'mapsTo' });
    const obligations: GenerativeActionOption['obligations'] = [];
    if (availability && availability.weight >= 4) {
      obligations.push({ id: `obl-ha-${scope.id}`, title: 'Validate multi-zone failure and recovery behavior', mandatory: true });
      operations.push({ type: 'create-fitness-test', fitnessTest: { id: `gac-fitness-ha-${slug(scope.id)}`, title: 'High-availability deployment test', statement: 'Critical physical deployments use at least two replicas across at least two independent failure domains.', scopeId: deployment.id, sourceRefs: ['availability', scope.id] } });
    }
    if (security && security.weight >= 4) obligations.push({ id: `obl-network-${scope.id}`, title: 'Define trust zone, workload identity and secret handling', mandatory: true });
    actions.push(option({ project, context, semanticKey: `physical-realization:${scope.id}:${product.productClass}`, actionType: 'decompose-scope', label: `Realize ${scope.label}`, shortDescription: `Create a provider-neutral product class and deployment topology for ${scope.label}.`, authorityClass: 'deterministic-eligible', rank: 99, confidence: 0.94, operations, targetScopeId: scope.id, whyNow: `${scope.label} has no physical realization.`, whyHere: 'The physical technology stage converts provider-neutral capability requirements into deployable product classes and failure domains.', basedOn: ['T2P-LINEAGE', ...context.qualityScenarios.slice(0, 5).map((scenario) => scenario.id), ...context.acceptedPatternIds], ifOmitted: 'The architecture cannot demonstrate where the capability runs, how it scales or how it survives failure.', alternatives: ['Map to an existing enterprise platform product', 'Defer provider selection while keeping the product class'], obligations, qualityEffects: [availability && availability.weight >= 4 ? { attribute: availability.attributeId, effect: 'positive', explanation: 'Creates multi-replica, multi-zone deployment defaults.' } : { attribute: 'simplicity', effect: 'positive', explanation: 'Keeps provider selection separate from topology intent.' }], projectedCoverageDelta: Math.round(100 / Math.max(1, context.unresolvedUpstreamScopeIds.length)) }));
  }
  actions.push(...relationshipPropagationActions(project, context));
  return actions;
}

function composeActionFromGroup(project: ArchitectureProject, context: GenerativeDesignContext, actions: GenerativeActionOption[], label: string, semanticKey: string, scopeIds: string[]): GenerativeActionOption | null {
  const eligible = actions.filter((action) => action.eligibility.eligible);
  if (!eligible.length) return null;
  const operationKeys = new Set<string>();
  const operations: MutationOperation[] = [];
  for (const action of eligible) {
    for (const operation of action.mutationSet.operations) {
      const key = JSON.stringify(operation);
      if (!operationKeys.has(key)) { operationKeys.add(key); operations.push(operation); }
    }
  }
  return option({
    project,
    context,
    semanticKey,
    actionType: context.autonomyMode === 'draft-stage' ? 'finalize-stage' : 'compose-local-topology',
    label,
    shortDescription: context.autonomyMode === 'draft-stage' ? `Draft ${scopeIds.length} unresolved scopes as one reviewable stage proposal.` : 'Apply a coherent local topology rather than isolated object changes.',
    authorityClass: 'deterministic-eligible',
    rank: 125,
    confidence: Math.min(...eligible.map((action) => action.confidence)),
    operations,
    ...(scopeIds[0] ? { targetScopeId: scopeIds[0] } : {}),
    whyNow: context.autonomyMode === 'draft-stage' ? 'The architect requested a bounded whole-stage draft.' : 'The selected scope has multiple compatible next actions that form one coherent topology.',
    whyHere: scopeIds.length === 1 ? `All proposed changes belong to ${scopeIds[0]}.` : `${scopeIds.length} unresolved scopes are included with explicit lineage.`,
    basedOn: unique(eligible.flatMap((action) => action.explanation.basedOn)),
    ifOmitted: 'The same model can still be built through Guide mode one decision at a time.',
    alternatives: ['Switch to Guide mode', 'Accept only one local proposal', 'Defer selected scopes'],
    patternRefs: unique(eligible.flatMap((action) => action.patternRefs)),
    obligations: unique(eligible.flatMap((action) => action.obligations).map((item) => item.id)).map((id) => eligible.flatMap((action) => action.obligations).find((item) => item.id === id)!),
    risks: unique(eligible.flatMap((action) => action.risks).map((item) => item.id)).map((id) => eligible.flatMap((action) => action.risks).find((item) => item.id === id)!),
    qualityEffects: eligible.flatMap((action) => action.qualityEffects).slice(0, 8),
    projectedCoverageDelta: Math.min(100, eligible.reduce((sum, action) => sum + (action.projectedCoverageDelta ?? 0), 0)),
  });
}

export interface CompileGovernedLlmAlternativesInput {
  project: ArchitectureProject;
  envelope: LivingCanvasActionEnvelope;
  proposal: LlmCoCreationProposal;
}

/**
 * Compile an LLM proposal only from deterministic action primitives that have already
 * passed canonical eligibility and preflight. The model can rank and bundle; it can
 * never invent an operation, canonical identifier or direct mutation.
 */
export function compileGovernedLlmAlternatives(input: CompileGovernedLlmAlternativesInput): GenerativeActionOption[] {
  const eligibleByKey = new Map(input.envelope.actions.filter((action) => action.eligibility.eligible).map((action) => [action.semanticKey, action]));
  const adjusted = input.envelope.actions.map((action) => {
    const adjustment = input.proposal.rankAdjustments.find((item) => item.actionSemanticKey === action.semanticKey);
    if (!adjustment || !eligibleByKey.has(action.semanticKey)) return action;
    const delta = Math.max(-20, Math.min(20, Math.round(adjustment.delta)));
    return {
      ...action,
      rank: action.rank + delta,
      explanation: {
        ...action.explanation,
        basedOn: unique([...action.explanation.basedOn, `Governed LLM ranking: ${adjustment.reason}`]),
      },
    };
  });

  const llmActions: GenerativeActionOption[] = [];
  for (const alternative of input.proposal.alternatives.slice(0, 3)) {
    const selected = unique(alternative.selectedActionSemanticKeys)
      .map((key) => eligibleByKey.get(key))
      .filter((action): action is GenerativeActionOption => Boolean(action));
    if (!selected.length) continue;
    const scopeIds = unique(selected.map((action) => action.targetScopeId).filter((id): id is string => Boolean(id)));
    const operationKeys = new Set<string>();
    const operations: MutationOperation[] = [];
    for (const action of selected) {
      for (const operation of action.mutationSet.operations) {
        const key = JSON.stringify(operation);
        if (!operationKeys.has(key)) { operationKeys.add(key); operations.push(operation); }
      }
    }
    const compiled = option({
      project: input.project,
      context: input.envelope.context,
      semanticKey: `llm-governed:${alternative.id}:${stableHash(selected.map((action) => action.semanticKey))}`,
      actionType: selected.length > 1 ? 'compose-local-topology' : selected[0]!.actionType,
      label: alternative.title,
      shortDescription: alternative.summary,
      authorityClass: 'llm-proposed',
      rank: 132 - llmActions.length,
      confidence: Math.max(0, Math.min(1, alternative.confidence)),
      operations,
      ...(scopeIds[0] ? { targetScopeId: scopeIds[0] } : {}),
      whyNow: alternative.rationale,
      whyHere: scopeIds.length === 1 ? `The proposal is bounded to ${scopeIds[0]}.` : `The proposal combines ${scopeIds.length || selected.length} canonically eligible design decisions.`,
      basedOn: unique([...selected.flatMap((action) => action.explanation.basedOn), ...alternative.citedRecordIds]),
      ifOmitted: alternative.omittedConsequences.join(' ') || 'The architect can continue with the deterministic action list instead.',
      alternatives: unique([...alternative.tradeOffs, ...selected.flatMap((action) => action.explanation.alternatives)]).slice(0, 8),
      patternRefs: unique(selected.flatMap((action) => action.patternRefs)),
      obligations: unique(selected.flatMap((action) => action.obligations).map((item) => item.id)).map((id) => selected.flatMap((action) => action.obligations).find((item) => item.id === id)!),
      risks: unique(selected.flatMap((action) => action.risks).map((item) => item.id)).map((id) => selected.flatMap((action) => action.risks).find((item) => item.id === id)!),
      qualityEffects: selected.flatMap((action) => action.qualityEffects).slice(0, 8),
      projectedCoverageDelta: Math.min(100, selected.reduce((sum, action) => sum + (action.projectedCoverageDelta ?? 0), 0)),
    });
    llmActions.push({
      ...compiled,
      knowledgeClaimRefs: unique(alternative.citedRecordIds),
      preview: {
        ...compiled.preview,
        consequenceSummary: [...compiled.preview.consequenceSummary, 'The language model selected only prevalidated deterministic operations; it did not author canonical mutations.'],
      },
    });
  }

  return [...llmActions, ...adjusted]
    .sort((a, b) => b.rank - a.rank || b.confidence - a.confidence || a.label.localeCompare(b.label))
    .slice(0, input.envelope.noiseBudget);
}

function shapeActionsForAutonomy(project: ArchitectureProject, context: GenerativeDesignContext, actions: GenerativeActionOption[]): GenerativeActionOption[] {
  if (context.autonomyMode === 'guide') return actions;
  if (context.autonomyMode === 'compose') {
    const scopeId = context.selectedScope?.scopeId ?? actions.find((action) => action.targetScopeId)?.targetScopeId;
    if (!scopeId) return actions;
    const local = actions.filter((action) => action.targetScopeId === scopeId).slice(0, 4);
    const composed = composeActionFromGroup(project, context, local, `Compose ${context.selectedScope?.label ?? 'selected scope'}`, `compose-scope:${scopeId}:${context.targetStage}`, [scopeId]);
    return composed ? [composed, ...actions.filter((action) => action.targetScopeId !== scopeId)] : actions;
  }
  const scopeIds = unique(actions.map((action) => action.targetScopeId).filter((id): id is string => Boolean(id))).slice(0, 5);
  const stageActions: GenerativeActionOption[] = [];
  for (const scopeId of scopeIds) {
    const first = actions.find((action) => action.targetScopeId === scopeId && action.eligibility.eligible);
    if (first) stageActions.push(first);
  }
  if (!stageActions.length) stageActions.push(...actions.filter((action) => action.eligibility.eligible).slice(0, 5));
  const draft = composeActionFromGroup(project, context, stageActions, `Draft ${context.targetStage.replace(/([A-Z])/g, ' $1').toLowerCase()} stage`, `draft-stage:${context.targetStage}:${context.contextFingerprint}`, scopeIds);
  return draft ? [draft, ...actions.filter((action) => action.authorityClass === 'deterministic-required').slice(0, 2)] : actions;
}

function clarificationActions(project: ArchitectureProject, context: GenerativeDesignContext): GenerativeActionOption[] {
  const actions: GenerativeActionOption[] = [];
  if (!project.description.trim()) {
    actions.push(option({ project, context, semanticKey: 'clarify-problem-statement', actionType: 'clarify-intent', label: 'Clarify the system purpose', shortDescription: 'Return to Requirements and capture the problem statement before generating topology.', authorityClass: 'deterministic-required', rank: 120, confidence: 1, operations: [{ type: 'focus', viewId: 'requirements' }], whyNow: 'The design intent has no problem statement.', whyHere: 'Every generated object must trace to an explicit purpose.', basedOn: ['GAC-005', 'STG-002'], ifOmitted: 'Generated topology would be based on weak or invented intent.', alternatives: [] }));
  }
  if (!project.objectives.length) {
    actions.push(option({ project, context, semanticKey: 'clarify-objectives', actionType: 'clarify-intent', label: 'Define measurable objectives', shortDescription: 'Capture at least one business or technical objective before decomposition.', authorityClass: 'deterministic-required', rank: 118, confidence: 1, operations: [{ type: 'focus', viewId: 'requirements' }], whyNow: 'No objective is available for model lineage.', whyHere: 'The Living Canvas requires a reason for every generated object.', basedOn: ['GAT-004'], ifOmitted: 'Generated elements would be orphaned from product intent.', alternatives: [] }));
  }
  return actions;
}

function dedupeAndRank(actions: GenerativeActionOption[], context: GenerativeDesignContext): GenerativeActionOption[] {
  const outcome = new Map(context.recentOutcomeHistory.map((item) => [item.actionSemanticKey, item.outcome]));
  const seen = new Set<string>();
  const ranked = actions.filter((action) => {
    if (seen.has(action.semanticKey)) return false;
    seen.add(action.semanticKey);
    return true;
  }).map((action) => {
    const prior = outcome.get(action.semanticKey);
    const adjustment = prior === 'rejected' ? -18 : prior === 'deferred' ? -8 : prior === 'accepted' ? -30 : 0;
    return { ...action, rank: action.rank + adjustment };
  }).sort((a, b) => b.rank - a.rank || b.confidence - a.confidence || a.label.localeCompare(b.label));
  return ranked.slice(0, NOISE_BUDGET);
}

export function orchestrateDeterministicDesignActions(input: OrchestrateDesignActionsInput): LivingCanvasActionEnvelope {
  const context = assembleGenerativeDesignContext(input);
  const grammar = resolveStageTransformationGrammar(context.stage, context.targetStage);
  let actions: GenerativeActionOption[] = clarificationActions(input.project, context);
  if (grammar) {
    if (context.targetStage === 'logicalApplication') actions.push(...logicalActions(input.project, context, input.event));
    else if (context.targetStage === 'applicationRealization') {
      actions.push(...realizationActions(input.project, context, input.event));
      actions.push(...relationshipPropagationActions(input.project, context));
    }
    else if (context.targetStage === 'logicalTechnology') actions.push(...logicalTechnologyActions(input.project, context, input.event));
    else if (context.targetStage === 'physicalTechnology') actions.push(...physicalTechnologyActions(input.project, context, input.event));
  }
  if (!grammar && !actions.length) {
    actions.push(option({ project: input.project, context, semanticKey: `unsupported-grammar:${context.stage}:${context.targetStage}`, actionType: 'clarify-intent', label: 'Open governed stage handoff', shortDescription: 'No Living Canvas transformation grammar is released for this non-model handoff. Continue through the existing governed stage-transition workflow.', authorityClass: 'deterministic-required', rank: 50, confidence: 1, operations: [{ type: 'focus', viewId: 'stage-transition' }], whyNow: `No released Living Canvas grammar exists for ${context.stage} to ${context.targetStage}.`, whyHere: 'The canonical stage-transition service remains authoritative for this handoff.', basedOn: ['released model-stage boundary'], ifOmitted: 'The user may assume an unsupported generative path is complete.', alternatives: ['Continue through the existing stage-transition studio'] }));
  }
  const shaped = shapeActionsForAutonomy(input.project, context, actions);
  const ranked = dedupeAndRank(shaped, context);
  const session = createStageDecompositionSession(input.project, context, input.session);
  session.pendingProposalIds = ranked.map((item) => item.id);
  return {
    context,
    session,
    actions: ranked,
    focusQueue: buildScopeFocusQueue(input.project, context),
    generatedAt: new Date().toISOString(),
    deterministicOnly: true,
    noiseBudget: NOISE_BUDGET,
  };
}

function patchNode(node: ArchitectureNode, patch: Partial<ArchitectureNode>): ArchitectureNode {
  return { ...node, ...patch, properties: patch.properties ? { ...node.properties, ...patch.properties } : node.properties, positions: patch.positions ? { ...node.positions, ...patch.positions } : node.positions };
}

function applyOperation(project: ArchitectureProject, operation: MutationOperation): void {
  if (operation.type === 'create-node' || operation.type === 'create-boundary') {
    const node = structuredClone(operation.type === 'create-node' ? operation.node : operation.boundary);
    if (!project.nodes.some((item) => item.id === node.id || (node.semanticId && item.semanticId === node.semanticId))) project.nodes.push(node);
    return;
  }
  if (operation.type === 'update-node') {
    const index = project.nodes.findIndex((item) => item.id === operation.nodeId);
    if (index >= 0) project.nodes[index] = patchNode(project.nodes[index]!, operation.patch);
    return;
  }
  if (operation.type === 'remove-node') {
    project.nodes = project.nodes.filter((item) => item.id !== operation.nodeId);
    project.edges = project.edges.filter((edge) => edge.sourceId !== operation.nodeId && edge.targetId !== operation.nodeId);
    project.interfaces = (project.interfaces ?? []).filter((item) => item.providerNodeId !== operation.nodeId && !item.consumerNodeIds.includes(operation.nodeId));
    return;
  }
  if (operation.type === 'create-relationship') {
    const edge = structuredClone(operation.relationship);
    if (!project.edges.some((item) => item.id === edge.id || (item.sourceId === edge.sourceId && item.targetId === edge.targetId && item.kind === edge.kind))) project.edges.push(edge);
    return;
  }
  if (operation.type === 'update-relationship') {
    const index = project.edges.findIndex((item) => item.id === operation.relationshipId);
    if (index >= 0) project.edges[index] = { ...project.edges[index]!, ...operation.patch, properties: operation.patch.properties ? { ...project.edges[index]!.properties, ...operation.patch.properties } : project.edges[index]!.properties };
    return;
  }
  if (operation.type === 'remove-relationship') { project.edges = project.edges.filter((item) => item.id !== operation.relationshipId); return; }
  if (operation.type === 'create-interface') {
    project.interfaces ??= [];
    const contract = structuredClone(operation.interface);
    if (!project.interfaces.some((item) => item.id === contract.id || (item.providerNodeId === contract.providerNodeId && item.operationOrEvent === contract.operationOrEvent))) project.interfaces.push(contract);
    return;
  }
  if (operation.type === 'update-interface') {
    project.interfaces ??= [];
    const index = project.interfaces.findIndex((item) => item.id === operation.interfaceId);
    if (index >= 0) project.interfaces[index] = { ...project.interfaces[index]!, ...operation.patch };
    return;
  }
  if (operation.type === 'remove-interface') { project.interfaces = (project.interfaces ?? []).filter((item) => item.id !== operation.interfaceId); return; }
  if (operation.type === 'assign-parent') {
    const node = project.nodes.find((item) => item.id === operation.nodeId);
    if (node) node.parentId = operation.parentId;
    return;
  }
  if (operation.type === 'create-lineage') {
    const node = project.nodes.find((item) => item.id === operation.targetId);
    if (node && !node.lineageFrom.includes(operation.sourceId)) node.lineageFrom.push(operation.sourceId);
    return;
  }
  if (operation.type === 'accept-style') {
    if (!project.styleDecisions.some((item) => item.styleId === operation.styleId && item.scopeNodeId === operation.scopeId && item.status === 'accepted')) project.styleDecisions.push({ id: `gac-style-${stableHash([operation.styleId, operation.scopeId])}`, styleId: operation.styleId, ...(operation.scopeId ? { scopeNodeId: operation.scopeId } : {}), stage: project.activeStage, rationale: 'Accepted through the Living Canvas.', status: 'accepted' });
    return;
  }
  if (operation.type === 'accept-pattern') {
    if (!project.patternSelections.some((item) => item.patternId === operation.patternId && item.scopeNodeId === operation.scopeId && item.status === 'accepted')) project.patternSelections.push({ id: `gac-pattern-${stableHash([operation.patternId, operation.scopeId])}`, patternId: operation.patternId, ...(operation.scopeId ? { scopeNodeId: operation.scopeId } : {}), stage: project.activeStage, rationale: 'Accepted through the Living Canvas.', status: 'accepted', obligationsAcknowledged: [] });
    return;
  }
  if (operation.type === 'create-decision') {
    if (!project.decisions.some((item) => item.id === operation.decision.id)) project.decisions.push(structuredClone(operation.decision));
    return;
  }
  if (operation.type === 'create-finding') {
    if (!project.findings.some((item) => item.id === operation.finding.id)) project.findings.push(structuredClone(operation.finding));
    return;
  }
  if (operation.type === 'remove-finding') {
    project.findings = project.findings.filter((item) => item.id !== operation.findingId);
    return;
  }
  if (operation.type === 'create-fitness-test') {
    if (!project.findings.some((item) => item.id === operation.fitnessTest.id)) project.findings.push({
      id: operation.fitnessTest.id,
      ruleId: 'GAC-FITNESS-TEST',
      severity: 'ADVISORY',
      title: operation.fitnessTest.title,
      message: operation.fitnessTest.statement,
      rationale: `Generated from ${operation.fitnessTest.sourceRefs.join(', ') || 'Living Canvas stage co-creation'}.`,
      affectedNodeIds: operation.fitnessTest.scopeId ? [operation.fitnessTest.scopeId] : [],
      affectedEdgeIds: [],
      mitigations: ['Implement this as an executable architecture fitness test in the delivery repository.'],
      canOverride: true,
    });
    return;
  }
  if (operation.type === 'create-obligation') {
    if (!project.findings.some((item) => item.id === operation.obligation.id)) project.findings.push({ id: operation.obligation.id, ruleId: 'GAC-OBLIGATION', severity: operation.obligation.mandatory ? 'SIGNIFICANT' : 'ADVISORY', title: operation.obligation.title, message: operation.obligation.description, rationale: `Created by ${operation.obligation.sourceRefs.join(', ') || 'Living Canvas'}.`, affectedNodeIds: operation.obligation.scopeId ? [operation.obligation.scopeId] : [], affectedEdgeIds: [], mitigations: ['Complete or explicitly waive this obligation before stage finalization.'], canOverride: true });
    return;
  }
  if (operation.type === 'create-risk') {
    if (!project.findings.some((item) => item.id === operation.risk.id)) project.findings.push({ id: operation.risk.id, ruleId: 'GAC-RISK', severity: operation.risk.severity === 'high' ? 'SIGNIFICANT' : 'ADVISORY', title: operation.risk.title, message: operation.risk.description, rationale: `Created by ${operation.risk.sourceRefs.join(', ') || 'Living Canvas'}.`, affectedNodeIds: operation.risk.scopeId ? [operation.risk.scopeId] : [], affectedEdgeIds: [], mitigations: ['Record an explicit treatment decision.'], canOverride: true });
    return;
  }
  if (operation.type === 'create-port') {
    const node = project.nodes.find((item) => item.id === operation.nodeId);
    if (node) {
      const ports = Array.isArray(node.properties.ports) ? [...node.properties.ports] : [];
      if (!ports.some((item) => typeof item === 'object' && item && (item as { id?: unknown }).id === operation.port.id)) ports.push(structuredClone(operation.port));
      node.properties.ports = ports;
    }
    return;
  }
  if (operation.type === 'bind-interface') {
    const contract = (project.interfaces ?? []).find((item) => item.id === operation.interfaceId);
    if (contract) { contract.providerNodeId = operation.providerId; contract.consumerNodeIds = unique(operation.consumerIds); contract.updatedAt = new Date().toISOString(); }
    return;
  }
  // Remaining metadata-only operations are consumed by the UI/session layer by the Living Canvas session layer.
}

export function proposalIsStale(project: ArchitectureProject, mutation: ArchitectureMutationSet): boolean {
  return mutation.projectId !== project.id || mutation.branchId !== project.branch.id || mutation.basedOnRevision !== project.revision || Boolean(mutation.expiresAt && Date.parse(mutation.expiresAt) < Date.now());
}

export function applyGenerativeAction(input: ApplyGenerativeActionInput): GenerativeActionResult {
  const { project, action } = input;
  if (!action.eligibility.eligible) throw new InvalidGenerativeMutationError(action.eligibility.prerequisites.join(' ') || 'The action is not eligible.');
  if (proposalIsStale(project, action.mutationSet)) throw new StaleGenerativeProposalError();
  if (action.mutationSet.contextFingerprint !== action.preview.contextFingerprint) throw new InvalidGenerativeMutationError('The preview and mutation context fingerprints do not match.');
  if (action.mutationSet.validation.some((item) => item.result === 'fail')) throw new InvalidGenerativeMutationError('The proposal failed canonical preflight and cannot be accepted.');
  const next = structuredClone(project);
  const previousRevision = next.revision;
  for (const operation of action.mutationSet.operations) applyOperation(next, operation);
  const hard = validateProject(next).filter((item) => item.severity === 'HARD');
  if (hard.length) throw new InvalidGenerativeMutationError(hard.map((item) => item.message).join(' '));
  next.revision += 1;
  next.updatedAt = new Date().toISOString();
  const createdNodeIds = action.mutationSet.operations.flatMap((operation) => operation.type === 'create-node' ? [operation.node.id] : operation.type === 'create-boundary' ? [operation.boundary.id] : []);
  const createdRelationshipIds = action.mutationSet.operations.flatMap((operation) => operation.type === 'create-relationship' ? [operation.relationship.id] : []);
  const createdInterfaceIds = action.mutationSet.operations.flatMap((operation) => operation.type === 'create-interface' ? [operation.interface.id] : []);
  return {
    project: next,
    appliedActionId: action.id,
    appliedMutationSetId: action.mutationSet.id,
    previousRevision,
    nextRevision: next.revision,
    createdNodeIds,
    createdRelationshipIds,
    createdInterfaceIds,
    ...(createdNodeIds[0] ? { nextFocusScopeId: createdNodeIds[0] } : {}),
    audit: { actorId: input.actorId, actorRole: input.actorRole, acceptedAt: new Date().toISOString(), ...(input.rationale ? { rationale: input.rationale } : {}), authorityClass: action.authorityClass, contextFingerprint: action.mutationSet.contextFingerprint },
  };
}

export function rollbackGenerativeMutation(project: ArchitectureProject, action: GenerativeActionOption): ArchitectureProject {
  const next = structuredClone(project);
  for (const operation of action.mutationSet.inverseOperations) applyOperation(next, operation);
  next.revision += 1;
  next.updatedAt = new Date().toISOString();
  return next;
}

export function advanceStageDecompositionSession(session: StageDecompositionSession, action: GenerativeActionOption, result: GenerativeActionResult, nextContext: GenerativeDesignContext): StageDecompositionSession {
  const next = createStageDecompositionSession(result.project, nextContext, session);
  next.acceptedActionIds = unique([...session.acceptedActionIds, action.id]);
  next.pendingProposalIds = next.pendingProposalIds.filter((id) => id !== action.id);
  if (action.targetScopeId) next.completedScopeIds = unique([...next.completedScopeIds, action.targetScopeId]);
  next.updatedAt = new Date().toISOString();
  return next;
}

export function livingCanvasReleaseDescriptor() {
  return {
    version: '0.10.0-rc.10.68.0',
    codename: 'Sol Governed Co-Creation Brain',
    deterministicOnly: false,
    contracts: ['DesignGestureEvent', 'GenerativeDesignContext', 'GenerativeActionOption', 'ArchitectureMutationSet', 'StageDecompositionSession', 'StageTransformationGrammar'],
    releasedGrammars: GRAMMARS.map((grammar) => grammar.id),
    c4Journey: ['system-context', 'container', 'component'],
    autonomyModes: ['guide', 'compose', 'draft-stage'],
    executablePatternKits: EXECUTABLE_PATTERN_KITS.map((kit) => kit.id),
    relationshipPropagation: true,
    qualityDriverTacticChain: true,
    noiseBudget: NOISE_BUDGET,
    governedLlmCoCreation: true,
    llmMutationAuthority: 'none',
    mindFactoryFeedback: true,
    humanApprovalRequired: true,
  } as const;
}
