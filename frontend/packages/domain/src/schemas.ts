import { z } from 'zod';
import { architectureStages, entityKinds, findingSeverities, projectReviewActions, projectRoles, relationshipKinds } from './types.js';
import type { RequirementsIntelligenceState } from './requirementsGenesis.js';
import type { ArchitectureDesignGraph } from './architectureDesignGraph.js';

export const pointSchema = z.object({ x: z.number(), y: z.number() });

export const architectureNodeSchema = z.object({
  id: z.string().min(1),
  semanticId: z.string().optional(),
  kind: z.enum(entityKinds),
  stage: z.enum(architectureStages),
  label: z.string().min(1),
  description: z.string().optional(),
  properties: z.record(z.string(), z.unknown()),
  lineageFrom: z.array(z.string()),
  parentId: z.string().optional(),
  positions: z.record(z.string(), pointSchema),
  tags: z.array(z.string()),
  status: z.enum(['draft', 'reviewed', 'approved', 'deprecated']),
});

export const architectureEdgeSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  kind: z.enum(relationshipKinds),
  stage: z.enum(architectureStages),
  label: z.string().optional(),
  properties: z.record(z.string(), z.unknown()),
});


export const architectureInterfaceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  stage: z.enum(architectureStages),
  providerNodeId: z.string().min(1),
  consumerNodeIds: z.array(z.string()),
  interactionStyle: z.enum(['request-response','event','stream','batch','file-transfer','database']),
  protocol: z.string().min(1),
  operationOrEvent: z.string().min(1),
  schemaRef: z.string().optional(),
  version: z.string().min(1),
  authentication: z.string(),
  authorization: z.string(),
  encryption: z.string(),
  timeoutMs: z.number().int().positive().optional(),
  retryPolicy: z.string(),
  idempotency: z.string(),
  ordering: z.string(),
  deliveryGuarantee: z.string(),
  deadLetterPolicy: z.string(),
  replayPolicy: z.string(),
  slo: z.string(),
  dataClassification: z.enum(['public','internal','confidential','restricted']),
  owner: z.string().min(1),
  lifecycleStatus: z.enum(['proposed','active','deprecated','retired']),
  evidenceIds: z.array(z.string()),
  contractLocation: z.string().optional(),
  deprecationPolicy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const architectureNodeViewStateSchema = z.object({
  nodeId: z.string(), position: pointSchema.optional(), width: z.number().optional(), height: z.number().optional(),
  fillColor: z.string().optional(), borderColor: z.string().optional(), textColor: z.string().optional(), accentColor: z.string().optional(),
  shape: z.enum(['rounded-rectangle','rectangle','pill','hexagon','cylinder']).optional(), opacity: z.number().optional(), collapsed: z.boolean().optional(),
  locked: z.boolean().optional(), zIndex: z.number().optional(), labelDensity: z.enum(['executive','standard','detailed','diagnostic']).optional(), layerIds: z.array(z.string()).optional(),
});
const architectureEdgeViewStateSchema = z.object({ edgeId: z.string(), hidden: z.boolean().optional(), bundled: z.boolean().optional(), labelVisible: z.boolean().optional(), routeHint: z.enum(['straight','smooth','orthogonal']).optional(), layerIds: z.array(z.string()).optional() });
const architectureViewLayerSchema = z.object({ id:z.string(), name:z.string(), kind:z.enum(['stage','domain','boundary','runtime','evidence','annotation','relationship']), visible:z.boolean(), locked:z.boolean(), nodeIds:z.array(z.string()), edgeIds:z.array(z.string()), order:z.number() });
const architectureViewCommentSchema = z.object({ id:z.string(), targetType:z.enum(['node','edge','view']), targetId:z.string(), author:z.string(), message:z.string(), createdAt:z.string(), status:z.enum(['open','resolved']) });
export const architectureViewSchema = z.object({
  id:z.string(), projectId:z.string(), branchId:z.string(), name:z.string(), viewpointId:z.enum(['system-context','logical-application','application-realization','interface-event-flow','data-architecture','logical-technology','physical-deployment','security-trust','resilience-recovery','cross-stage-traceability']).optional(), kind:z.enum(['model','security','deployment','conformance','portfolio','executive','diagnostic']),
  density:z.enum(['executive','standard','detailed','diagnostic']), description:z.string().optional(), intent:z.string().optional(),
  filters:z.object({ stages:z.array(z.enum(architectureStages)).optional(), includeTags:z.array(z.string()).optional(), excludeTags:z.array(z.string()).optional(), includeNodeIds:z.array(z.string()).optional(), excludeNodeIds:z.array(z.string()).optional(), showFindings:z.boolean().optional(), showEvidence:z.boolean().optional(), showRuntime:z.boolean().optional(), visibleLayerIds:z.array(z.string()).optional() }),
  nodeStates:z.record(z.string(), architectureNodeViewStateSchema), edgeStates:z.record(z.string(), architectureEdgeViewStateSchema), layers:z.array(architectureViewLayerSchema).optional(), comments:z.array(architectureViewCommentSchema).optional(), presentationMode:z.boolean().optional(),
  createdAt:z.string(), updatedAt:z.string(), createdBy:z.string(), version:z.number().int().positive(),
});
export const architectureViewVersionSchema = z.object({ id:z.string(), viewId:z.string(), version:z.number().int().positive(), label:z.string(), createdAt:z.string(), createdBy:z.string(), snapshot:architectureViewSchema });

export const findingSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  severity: z.enum(findingSeverities),
  title: z.string(),
  message: z.string(),
  rationale: z.string(),
  affectedNodeIds: z.array(z.string()),
  affectedEdgeIds: z.array(z.string()),
  mitigations: z.array(z.string()),
  canOverride: z.boolean(),
});

export const architectureDecisionSchema = z.object({
  id: z.string(),
  title: z.string(),
  context: z.string(),
  decision: z.string(),
  drivers: z.array(z.string()),
  consideredOptions: z.array(z.string()),
  consequences: z.array(z.string()),
  status: z.enum(['proposed', 'accepted', 'rejected', 'superseded']),
  createdAt: z.string(),
  linkedRecordIds: z.array(z.string()).optional(),
  scopeNodeId: z.string().optional(),
});

export const projectMemberSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  email: z.string().email(),
  role: z.enum(projectRoles),
  status: z.enum(['active', 'invited', 'suspended']),
  joinedAt: z.string(),
});

export const reviewAssignmentSchema = z.object({
  id: z.string(),
  stage: z.enum(architectureStages),
  branchId: z.string(),
  snapshotId: z.string().optional(),
  assignedTo: z.string(),
  assignedBy: z.string(),
  status: z.enum(['open', 'in-progress', 'completed', 'cancelled', 'overdue']),
  priority: z.enum(['low', 'normal', 'high', 'critical']),
  instructions: z.string(),
  dueAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
});

export const discussionCommentSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  body: z.string().min(1),
  createdAt: z.string(),
  editedAt: z.string().optional(),
});

export const discussionThreadSchema = z.object({
  id: z.string(),
  targetType: z.enum(['project', 'stage', 'node', 'edge', 'decision', 'finding', 'approval', 'branch']),
  targetId: z.string(),
  title: z.string().min(1),
  status: z.enum(['open', 'resolved']),
  createdBy: z.string(),
  createdAt: z.string(),
  resolvedBy: z.string().optional(),
  resolvedAt: z.string().optional(),
  participantIds: z.array(z.string()),
  comments: z.array(discussionCommentSchema),
});

export const notificationSchema = z.object({
  id: z.string(),
  recipientId: z.string(),
  type: z.enum(['review-assigned', 'approval-requested', 'approval-decided', 'comment-added', 'mention', 'branch-merged', 'approval-expired', 'merge-conflict']),
  title: z.string(),
  message: z.string(),
  targetType: z.enum(['project', 'stage', 'node', 'edge', 'decision', 'finding', 'approval', 'branch', 'review']),
  targetId: z.string(),
  createdAt: z.string(),
  readAt: z.string().optional(),
});


export const runtimeResourceSchema = z.object({
  id: z.string().min(1), sourceType: z.enum(['kubernetes','terraform-state','openapi','manual','aws','azure','gcp','telemetry']), externalId: z.string().min(1),
  resourceType: z.string().min(1), name: z.string().min(1), provider: z.string().optional(), namespace: z.string().optional(),
  region: z.string().optional(), version: z.string().optional(), properties: z.record(z.string(), z.unknown()),
  labels: z.record(z.string(), z.string()), discoveredAt: z.string(),
});

export const runtimeRelationshipSchema = z.object({
  id: z.string().min(1), sourceResourceId: z.string().min(1), targetResourceId: z.string().min(1),
  kind: z.enum(['calls','publishes','subscribes','reads','writes','deployed-on','contains','depends-on']),
  properties: z.record(z.string(), z.unknown()),
});

export const runtimeInventorySchema = z.object({
  id: z.string().min(1), tenantId: z.string().min(1), projectId: z.string().min(1), branchId: z.string().min(1),
  name: z.string().min(1), sourceType: z.enum(['kubernetes','terraform-state','openapi','manual','aws','azure','gcp','telemetry']), capturedAt: z.string(),
  sourceRevision: z.string().optional(), rawFingerprint: z.string().min(1), resources: z.array(runtimeResourceSchema),
  relationships: z.array(runtimeRelationshipSchema),
});

export const driftFindingSchema = z.object({
  id: z.string().min(1), kind: z.enum(['missing-actual','unmanaged-actual','property-mismatch','topology-mismatch','version-drift','policy-violation','cost-drift','capacity-drift','resilience-drift']),
  severity: z.enum(findingSeverities), title: z.string(), message: z.string(), intendedNodeId: z.string().optional(),
  actualResourceId: z.string().optional(), propertyPath: z.string().optional(), intendedValue: z.unknown().optional(),
  actualValue: z.unknown().optional(), rationale: z.string(), recommendation: z.string(), status: z.enum(['open','accepted','resolved','ignored']),
});

export const driftReportSchema = z.object({
  id: z.string().min(1), inventoryId: z.string().min(1), projectRevision: z.number().int().nonnegative(), generatedAt: z.string(),
  summary: z.object({ matched: z.number().int().nonnegative(), missingActual: z.number().int().nonnegative(), unmanagedActual: z.number().int().nonnegative(), propertyMismatches: z.number().int().nonnegative(), topologyMismatches: z.number().int().nonnegative(), versionDrift: z.number().int().nonnegative() }),
  mappings: z.array(z.object({ intendedNodeId: z.string(), actualResourceId: z.string(), confidence: z.number().min(0).max(1), reasons: z.array(z.string()) })),
  findings: z.array(driftFindingSchema),
});

export const repositoryBindingSchema = z.object({
  id: z.string().min(1), provider: z.enum(['local','github','gitlab','azure-devops']), repositoryUrl: z.string(),
  defaultBranch: z.string().min(1), architecturePath: z.string().min(1), runtimeInventoryPath: z.string().min(1),
  policyGatePath: z.string().min(1), status: z.enum(['configured','connected','error']), lastSyncedAt: z.string().optional(),
});

export const architecturePolicyGateSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), enabled: z.boolean(), hardFindingThreshold: z.number().int().nonnegative(),
  significantFindingThreshold: z.number().int().nonnegative(), advisoryFindingThreshold: z.number().int().nonnegative(),
  maxMissingResources: z.number().int().nonnegative(), maxUnmanagedResources: z.number().int().nonnegative(),
  requiredApprovedStages: z.array(z.enum(architectureStages)),
});

export const observabilitySettingsSchema = z.object({
  serviceName: z.string().min(1), tracesEnabled: z.boolean(), metricsEnabled: z.boolean(), logsEnabled: z.boolean(),
  samplingRatio: z.number().min(0).max(1), otlpEndpointReference: z.string().optional(),
  targetAvailabilityPercent: z.number().min(0).max(100), targetP95LatencyMs: z.number().positive(),
});


export const inventoryCollectorSchema = z.object({
  id: z.string(), name: z.string().min(1), provider: z.enum(['aws','azure','gcp','kubernetes']), enabled: z.boolean(),
  schedule: z.string().min(1), scope: z.record(z.string(), z.string()), secretReferenceIds: z.array(z.string()),
  lastRunAt: z.string().optional(), nextRunAt: z.string().optional(), status: z.enum(['configured','running','healthy','degraded','disabled']),
});
export const collectorRunSchema = z.object({
  id: z.string(), collectorId: z.string(), startedAt: z.string(), completedAt: z.string().optional(),
  status: z.enum(['running','completed','failed']), inventoryId: z.string().optional(), resourceCount: z.number().int().nonnegative(),
  relationshipCount: z.number().int().nonnegative(), message: z.string(),
});
export const telemetrySpanEvidenceSchema = z.object({
  traceId: z.string(), spanId: z.string(), parentSpanId: z.string().optional(), serviceName: z.string(), peerService: z.string().optional(),
  operation: z.string(), protocol: z.string().optional(), status: z.enum(['ok','error']), durationMs: z.number().nonnegative(),
  observedAt: z.string(), attributes: z.record(z.string(), z.unknown()),
});
export const driftWaiverSchema = z.object({
  id: z.string(), findingId: z.string(), reason: z.string().min(1), ownerId: z.string(), approvedBy: z.string(),
  createdAt: z.string(), expiresAt: z.string(), status: z.enum(['active','expired','revoked']),
});
export const operationalDriftFindingSchema = z.object({
  id: z.string(), category: z.enum(['cost','capacity','resilience']), severity: z.enum(findingSeverities), title: z.string(), message: z.string(),
  intendedNodeId: z.string().optional(), actualResourceId: z.string().optional(), expectedValue: z.unknown().optional(), actualValue: z.unknown().optional(),
  estimatedMonthlyImpact: z.number().optional(), recommendation: z.string(), status: z.enum(['open','waived','resolved']),
});
export const operationalDriftReportSchema = z.object({
  id: z.string(), inventoryId: z.string(), generatedAt: z.string(), projectRevision: z.number().int().nonnegative(),
  summary: z.object({ cost: z.number().int().nonnegative(), capacity: z.number().int().nonnegative(), resilience: z.number().int().nonnegative(), estimatedMonthlyImpact: z.number() }),
  findings: z.array(operationalDriftFindingSchema),
});
export const remediationActionSchema = z.object({
  id: z.string(), findingId: z.string(), actionType: z.enum(['architecture-change','runtime-change','documentation-change','waiver']),
  title: z.string(), description: z.string(), targetIds: z.array(z.string()), risk: z.enum(['low','medium','high']),
  automation: z.enum(['manual','scaffolded','provider-preview']), status: z.enum(['proposed','approved','rejected','completed']),
});
export const remediationPlanSchema = z.object({
  id: z.string(), name: z.string(), sourceReportId: z.string(), createdAt: z.string(), createdBy: z.string(),
  status: z.enum(['draft','pending-approval','approved','rejected','completed']), approvedBy: z.string().optional(), approvedAt: z.string().optional(),
  actions: z.array(remediationActionSchema),
});
export const serviceLevelObjectiveSchema = z.object({
  id: z.string(), name: z.string(), targetNodeId: z.string().optional(), indicator: z.enum(['availability','latency-p95','error-rate','throughput','freshness']),
  target: z.number(), window: z.enum(['1h','24h','7d','30d']), warningThreshold: z.number(), criticalThreshold: z.number(), enabled: z.boolean(),
});
export const alertPolicySchema = z.object({
  id: z.string(), sloId: z.string(), name: z.string(), channels: z.array(z.enum(['email','webhook','pager','chat'])),
  severity: z.enum(['warning','critical']), burnRateThreshold: z.number().positive(), evaluationWindowMinutes: z.number().int().positive(), enabled: z.boolean(),
});
export const repositoryPullRequestSchema = z.object({
  id: z.string(), bindingId: z.string(), provider: z.enum(['local','github','gitlab','azure-devops']), title: z.string(),
  sourceBranch: z.string(), targetBranch: z.string(), status: z.enum(['preview','opened','merged','closed','failed']),
  files: z.array(z.object({ path: z.string(), operation: z.enum(['create','update','delete']), contentHash: z.string() })), createdAt: z.string(), url: z.string().optional(),
});
export const eventBrokerSettingsSchema = z.object({
  adapter: z.enum(['memory','webhook','kafka','service-bus','pubsub']), endpointReference: z.string().optional(), topic: z.string(),
  maxAttempts: z.number().int().positive(), retryDelayMs: z.number().int().nonnegative(), deadLetterEnabled: z.boolean(),
});
export const deploymentProfileSchema = z.object({
  id: z.string(), name: z.string(), environment: z.enum(['development','test','staging','production']), replicas: z.number().int().positive(),
  cpuRequest: z.string(), memoryRequest: z.string(), publicIngress: z.boolean(), autoscaling: z.boolean(), minReplicas: z.number().int().positive(), maxReplicas: z.number().int().positive(),
});

export const portfolioMetadataSchema = z.object({
  portfolioId: z.string().min(1), businessUnit: z.string().min(1), owner: z.string().min(1),
  criticality: z.enum(['low','medium','high','mission-critical']), lifecycle: z.enum(['invest','maintain','modernize','retire']),
  annualChangeBudget: z.number().nonnegative(), currency: z.string().min(3),
});
export const projectDependencySchema = z.object({
  id: z.string(), sourceProjectId: z.string(), targetProjectId: z.string(), kind: z.enum(['api','event','data','shared-technology','operational']),
  criticality: z.enum(['low','medium','high']), interfaceName: z.string(), dataClassification: z.enum(['public','internal','confidential','restricted']),
  status: z.enum(['proposed','active','deprecated']),
});
export const technologyStandardExceptionSchema = z.object({
  id: z.string(), standardId: z.string(), nodeId: z.string(), rationale: z.string(), owner: z.string(), expiresAt: z.string(),
  status: z.enum(['active','expired','revoked']),
});
export const technicalDebtItemSchema = z.object({
  id: z.string(), title: z.string(), category: z.enum(['architecture','technology','security','data','operations','delivery']),
  severity: z.enum(findingSeverities), description: z.string(), linkedNodeIds: z.array(z.string()), estimatedEffortDays: z.number().nonnegative(),
  annualCostImpact: z.number().nonnegative(), dueAt: z.string().optional(), status: z.enum(['open','planned','in-progress','resolved','accepted']),
});
export const buildingBlockUsageSchema = z.object({
  id: z.string(), buildingBlockId: z.string(), version: z.string(), scopeNodeId: z.string().optional(), status: z.enum(['proposed','adopted','diverged','retired']),
});
export const referenceArchitectureAssignmentSchema = z.object({
  id: z.string(), referenceArchitectureId: z.string(), version: z.string(), scopeNodeId: z.string().optional(),
  status: z.enum(['proposed','applicable','compliant','non-compliant','waived']),
});
export const technologyStandardSchema = z.object({
  id: z.string(), category: z.string(), technologyName: z.string(), matchTerms: z.array(z.string()), status: z.enum(['preferred','allowed','restricted','prohibited','deprecated']),
  preferredReplacement: z.string().optional(), rationale: z.string(), effectiveFrom: z.string(), evidenceIds: z.array(z.string()),
});
export const architectureBuildingBlockSchema = z.object({
  id: z.string(), name: z.string(), version: z.string(), category: z.string(), description: z.string(), requiredPatternIds: z.array(z.string()),
  qualityAttributeIds: z.array(z.string()), nodeTemplates: z.array(z.object({ kind: z.enum(entityKinds), stage: z.enum(architectureStages), label: z.string(), properties: z.record(z.string(), z.unknown()), tags: z.array(z.string()) })),
  edgeTemplates: z.array(z.object({ sourceLabel: z.string(), targetLabel: z.string(), kind: z.enum(relationshipKinds), stage: z.enum(architectureStages) })),
  status: z.enum(['draft','approved','deprecated']),
});
export const referenceArchitectureSchema = z.object({
  id: z.string(), name: z.string(), version: z.string(), description: z.string(), applicableContexts: z.array(z.string()),
  requiredStyleIds: z.array(z.string()), requiredPatternIds: z.array(z.string()), requiredNodeKinds: z.array(z.enum(entityKinds)),
  prohibitedTechnologyTerms: z.array(z.string()), requiredDecisionTerms: z.array(z.string()), minimumApprovedStages: z.number().int().nonnegative(),
  status: z.enum(['draft','approved','deprecated']),
});
export const enterpriseArchitectureCatalogSchema = z.object({
  id: z.string(), tenantId: z.string(), version: z.string(), technologyStandards: z.array(technologyStandardSchema),
  buildingBlocks: z.array(architectureBuildingBlockSchema), referenceArchitectures: z.array(referenceArchitectureSchema),
});


const requirementsIntelligenceSchema = z.custom<RequirementsIntelligenceState>((value) => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<RequirementsIntelligenceState>;
  return candidate.schemaVersion === '1.0' && typeof candidate.knowledgeReleaseId === 'string' && Array.isArray(candidate.sources) && Array.isArray(candidate.requirements) && Array.isArray(candidate.journeys) && Array.isArray(candidate.contextPackages);
});

const architectureDesignGraphSchema = z.custom<ArchitectureDesignGraph>((value) => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArchitectureDesignGraph>;
  return candidate.schemaVersion === '1.0'
    && typeof candidate.projectId === 'string'
    && typeof candidate.branchId === 'string'
    && typeof candidate.projectRevision === 'number'
    && typeof candidate.fingerprint === 'string'
    && Array.isArray(candidate.records)
    && Array.isArray(candidate.relationships)
    && Boolean(candidate.integrity && typeof candidate.integrity === 'object');
});

export const architectureProjectSchema = z.object({
  schemaVersion: z.literal('0.8.0'),
  tenantId: z.string().min(1),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  activeStage: z.enum(architectureStages),
  objectives: z.array(z.string()),
  constraints: z.array(z.string()),
  assumptions: z.array(z.string()),
  requirementsIntelligence: requirementsIntelligenceSchema.optional(),
  qualityPriorities: z.array(z.object({
    attributeId: z.string(),
    weight: z.number().min(0).max(5),
    rationale: z.string().optional(),
  })),
  qualityScenarios: z.array(z.object({
    id: z.string(),
    attributeId: z.string(),
    source: z.string(),
    stimulus: z.string(),
    environment: z.string(),
    artifact: z.string(),
    response: z.string(),
    responseMeasure: z.string(),
    weight: z.number().min(0).max(5),
  })),
  styleDecisions: z.array(z.object({
    id: z.string(),
    styleId: z.string(),
    scopeNodeId: z.string().optional(),
    stage: z.enum(architectureStages),
    rationale: z.string(),
    status: z.enum(['proposed', 'accepted', 'rejected', 'superseded']),
  })),
  patternSelections: z.array(z.object({
    id: z.string(),
    patternId: z.string(),
    scopeNodeId: z.string().optional(),
    stage: z.enum(architectureStages),
    rationale: z.string(),
    status: z.enum(['considering', 'accepted', 'rejected', 'superseded']),
    obligationsAcknowledged: z.array(z.string()),
  })),
  nodes: z.array(architectureNodeSchema),
  edges: z.array(architectureEdgeSchema),
  interfaces: z.array(architectureInterfaceSchema).default([]),
  architectureViews: z.array(architectureViewSchema).default([]),
  architectureViewVersions: z.array(architectureViewVersionSchema).default([]),
  designGraph: architectureDesignGraphSchema.optional(),
  decisions: z.array(architectureDecisionSchema),
  findings: z.array(findingSchema),
  context: z.object({
    teamSize: z.number().int().positive().optional(),
    deliveryHorizonMonths: z.number().positive().optional(),
    operationalMaturity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    budgetSensitivity: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    regulatoryExposure: z.enum(['low', 'medium', 'high']).optional(),
    preferredVendors: z.array(z.string()).optional(),
    prohibitedTechnologies: z.array(z.string()).optional(),
    problemShapes: z.array(z.string()).optional(),
    stakeholders: z.array(z.string()).optional(),
    inScopeCapabilities: z.array(z.string()).optional(),
    outOfScopeCapabilities: z.array(z.string()).optional(),
    dataClassifications: z.array(z.string()).optional(),
    regulatoryJurisdictions: z.array(z.string()).optional(),
    existingSystems: z.array(z.string()).optional(),
    workloadProfile: z.string().optional(),
    availabilityTarget: z.string().optional(),
    recoveryObjectives: z.string().optional(),
    teamTopology: z.string().optional(),
    architectureExperience: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    organizationalChangeReadiness: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    deploymentModel: z.enum(['on-premises', 'private-cloud', 'public-cloud', 'hybrid', 'edge', 'multi-cloud']).optional(),
    dataSensitivity: z.enum(['public', 'internal', 'confidential', 'restricted']).optional(),
    sovereigntyRequirements: z.array(z.string()).optional(),
    vendorMandates: z.array(z.string()).optional(),
    legacyConstraints: z.array(z.string()).optional(),
    transitionState: z.enum(['greenfield', 'incremental-modernization', 'migration', 'coexistence']).optional(),
    reversibilityPreference: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).optional(),
    supportModel: z.enum(['product-team', 'central-operations', 'managed-service', 'hybrid']).optional(),
    changeCadence: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
    peakLoadVariability: z.enum(['stable', 'seasonal', 'bursty', 'unpredictable']).optional(),
  }),
  branch: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    parentBranchId: z.string().optional(),
    baseRevision: z.number().int().nonnegative(),
    status: z.enum(['active', 'candidate', 'merged', 'archived']),
    createdAt: z.string(),
  }),
  stageApprovals: z.array(z.object({
    id: z.string(),
    stage: z.enum(architectureStages),
    status: z.enum(['not-requested', 'pending', 'approved', 'changes-requested', 'rejected']),
    requestedAt: z.string().optional(),
    requestedBy: z.string().optional(),
    decidedAt: z.string().optional(),
    reviewer: z.string().optional(),
    assignedReviewerId: z.string().optional(),
    dueAt: z.string().optional(),
    expiresAt: z.string().optional(),
    expiredAt: z.string().optional(),
    comments: z.array(z.string()),
    snapshotId: z.string().optional(),
  })),
  reviewDecisionLedger: z.array(z.object({
    id: z.string(), projectId: z.string(), branchId: z.string(),
    targetType: z.enum(['candidate', 'graph-object', 'risk', 'project']),
    targetId: z.string(), action: z.enum(projectReviewActions), actorRole: z.literal('reviewer'),
    actorId: z.string(), timestamp: z.string(), comment: z.string(), priorState: z.string(),
    resultingState: z.string(), authority: z.literal('project-candidate-review'), auditReference: z.string(),
  })).default([]),
  activeRulePackIds: z.array(z.string()),
  members: z.array(projectMemberSchema),
  reviewAssignments: z.array(reviewAssignmentSchema),
  discussionThreads: z.array(discussionThreadSchema),
  notifications: z.array(notificationSchema),
  coArchitectSessions: z.array(z.object({
    id: z.string(), title: z.string(), stage: z.enum(architectureStages), scopeNodeId: z.string().optional(), createdAt: z.string(), updatedAt: z.string(),
    messages: z.array(z.object({ id: z.string(), role: z.enum(['user','assistant']), content: z.string(), createdAt: z.string(), citedRecordIds: z.array(z.string()), modelTrace: z.object({ providerId: z.string(), model: z.string(), routeId: z.string(), fallbackUsed: z.boolean(), requestFingerprint: z.string() }).optional() })),
  })).default([]),
  aiReviewHistory: z.array(z.object({
    id: z.string(), createdAt: z.string(), stage: z.enum(architectureStages), scopeNodeId: z.string().optional(), source: z.enum(['deterministic','llm-assisted']), summary: z.string(), healthScore: z.number().min(0).max(100), proposalCount: z.number().int().nonnegative(), findingCount: z.number().int().nonnegative(), modelTrace: z.object({ providerId: z.string(), model: z.string(), routeId: z.string(), fallbackUsed: z.boolean(), requestFingerprint: z.string() }).optional(),
  })).default([]),
  collaborationSettings: z.object({
    approvalValidityDays: z.number().int().positive(),
    reviewDueDays: z.number().int().positive(),
    requireIndependentReviewer: z.boolean(),
    maxConcurrentEditors: z.number().int().positive(),
    presenceTtlSeconds: z.number().int().positive(),
    operationRetryLimit: z.number().int().nonnegative(),
  }),
  securitySettings: z.object({
    requireSso: z.boolean(),
    allowedIdentityProviderIds: z.array(z.string()),
    allowDevelopmentAuth: z.boolean(),
    sessionMaxAgeMinutes: z.number().int().positive(),
    auditRetentionDays: z.number().int().positive(),
    encryptionKeyReference: z.string().min(1),
  }),
  identityProviders: z.array(z.object({
    id: z.string(), tenantId: z.string(), type: z.enum(['oidc','saml','development']), name: z.string(),
    issuer: z.string(), clientId: z.string(), scopes: z.array(z.string()), enabled: z.boolean(),
  })),
  secretReferences: z.array(z.object({
    id: z.string(), provider: z.enum(['environment','vault','aws-secrets-manager','azure-key-vault','gcp-secret-manager']),
    locator: z.string().min(1), purpose: z.string().min(1), rotatedAt: z.string().optional(),
  })),
  observabilitySettings: observabilitySettingsSchema,
  repositoryBindings: z.array(repositoryBindingSchema),
  runtimeInventories: z.array(runtimeInventorySchema),
  driftReports: z.array(driftReportSchema),
  policyGates: z.array(architecturePolicyGateSchema),
  inventoryCollectors: z.array(inventoryCollectorSchema),
  collectorRuns: z.array(collectorRunSchema),
  operationalDriftReports: z.array(operationalDriftReportSchema),
  driftWaivers: z.array(driftWaiverSchema),
  remediationPlans: z.array(remediationPlanSchema),
  serviceLevelObjectives: z.array(serviceLevelObjectiveSchema),
  alertPolicies: z.array(alertPolicySchema),
  repositoryPullRequests: z.array(repositoryPullRequestSchema),
  eventBrokerSettings: eventBrokerSettingsSchema,
  deploymentProfiles: z.array(deploymentProfileSchema),
  portfolio: portfolioMetadataSchema,
  projectDependencies: z.array(projectDependencySchema),
  technologyStandardExceptions: z.array(technologyStandardExceptionSchema),
  technicalDebtItems: z.array(technicalDebtItemSchema),
  buildingBlockUsages: z.array(buildingBlockUsageSchema),
  referenceArchitectureAssignments: z.array(referenceArchitectureAssignmentSchema),
  revision: z.number().int().nonnegative(),
  updatedAt: z.string(),
});

const addNodeOperationSchema = z.object({ type: z.literal('ADD_NODE'), node: architectureNodeSchema });
const updateNodeOperationSchema = z.object({ type: z.literal('UPDATE_NODE'), nodeId: z.string(), patch: architectureNodeSchema.partial() });
const deleteNodeOperationSchema = z.object({ type: z.literal('DELETE_NODE'), nodeId: z.string() });
const addEdgeOperationSchema = z.object({ type: z.literal('ADD_EDGE'), edge: architectureEdgeSchema });
const updateEdgeOperationSchema = z.object({ type: z.literal('UPDATE_EDGE'), edgeId: z.string(), patch: architectureEdgeSchema.partial() });
const deleteEdgeOperationSchema = z.object({ type: z.literal('DELETE_EDGE'), edgeId: z.string() });

export const changeOperationSchema = z.discriminatedUnion('type', [
  addNodeOperationSchema,
  updateNodeOperationSchema,
  deleteNodeOperationSchema,
  addEdgeOperationSchema,
  updateEdgeOperationSchema,
  deleteEdgeOperationSchema,
]);

export const changeProposalSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  severity: z.enum(findingSeverities),
  operations: z.array(changeOperationSchema),
  evidenceRecordIds: z.array(z.string()),
  selected: z.boolean(),
});

export const auditResultSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  source: z.enum(['deterministic', 'llm-assisted']),
  summary: z.string(),
  healthScore: z.number().min(0).max(100),
  findings: z.array(findingSchema),
  proposals: z.array(changeProposalSchema),
  modelTrace: z.object({
    providerId: z.string(), model: z.string(), routeId: z.string(), fallbackUsed: z.boolean(), requestFingerprint: z.string(),
  }).optional(),
});

export const recommendationContextSchema = z.object({
  stage: z.enum(architectureStages),
  scopeNodeId: z.string().optional(),
  trigger: z.enum(['initial', 'intent-change', 'quality-change', 'style-selection', 'pattern-selection', 'canvas-change', 'scope-change']),
});

export const contextualRecommendationRequestSchema = z.object({
  project: architectureProjectSchema,
  context: recommendationContextSchema,
});


export const collaborationOperationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('UPSERT_NODE'), node: architectureNodeSchema }),
  z.object({ type: z.literal('DELETE_NODE'), nodeId: z.string() }),
  z.object({ type: z.literal('UPSERT_EDGE'), edge: architectureEdgeSchema }),
  z.object({ type: z.literal('DELETE_EDGE'), edgeId: z.string() }),
  z.object({ type: z.literal('ADD_COMMENT'), threadId: z.string(), comment: discussionCommentSchema }),
]);

export const collaborationOperationBatchSchema = z.object({
  operationId: z.string().min(1),
  idempotencyKey: z.string().min(8),
  tenantId: z.string().min(1),
  projectId: z.string(),
  branchId: z.string(),
  baseRevision: z.number().int().nonnegative(),
  actorId: z.string(),
  operations: z.array(collaborationOperationSchema).min(1),
});
