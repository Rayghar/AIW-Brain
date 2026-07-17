import type { RequirementsIntelligenceState } from './requirementsGenesis.js';
export const architectureStages = [
  'designIntent',
  'logicalApplication',
  'applicationRealization',
  'logicalTechnology',
  'physicalTechnology',
  'validationRealization',
] as const;
export type ArchitectureStage = (typeof architectureStages)[number];

export const findingSeverities = ['HARD', 'SIGNIFICANT', 'ADVISORY'] as const;
export type FindingSeverity = (typeof findingSeverities)[number];

export const entityKinds = [
  'Stakeholder',
  'Objective',
  'Requirement',
  'QualityScenario',
  'Constraint',
  'Assumption',
  'System',
  'Actor',
  'ExternalSystem',
  'Domain',
  'Capability',
  'LogicalService',
  'ApplicationComponent',
  'Module',
  'DeployableUnit',
  'Interface',
  'API',
  'Event',
  'DataDomain',
  'DataEntity',
  'DataStore',
  'LogicalTechnologyCapability',
  'TechnologyProduct',
  'TechnologyComponent',
  'DeploymentNode',
  'Environment',
  'Region',
  'AvailabilityZone',
  'NetworkZone',
  'Runtime',
  'Control',
  'Risk',
  'ArchitectureStyle',
  'Pattern',
  'Tactic',
] as const;
export type EntityKind = (typeof entityKinds)[number];

export const relationshipKinds = [
  'motivates',
  'constrains',
  'satisfies',
  'realizes',
  'implements',
  'contains',
  'dependsOn',
  'communicatesWith',
  'exposes',
  'consumes',
  'publishes',
  'subscribes',
  'reads',
  'writes',
  'stores',
  'deployedOn',
  'hostedBy',
  'locatedIn',
  'protectedBy',
  'observedBy',
  'derivedFrom',
  'replaces',
  'mapsTo',
  'supports',
  'requires',
  'recommends',
  'mitigates',
  'governedBy',
  'selectedBecauseOf',
] as const;
export type RelationshipKind = (typeof relationshipKinds)[number];

export interface Point {
  x: number;
  y: number;
}

export interface ArchitectureNode {
  id: string;
  semanticId?: string | undefined;
  kind: EntityKind;
  stage: ArchitectureStage;
  label: string;
  description?: string | undefined;
  properties: Record<string, unknown>;
  lineageFrom: string[];
  parentId?: string | undefined;
  positions: Record<string, Point>;
  tags: string[];
  status: 'draft' | 'reviewed' | 'approved' | 'deprecated';
}

export interface ArchitectureEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: RelationshipKind;
  stage: ArchitectureStage;
  label?: string | undefined;
  properties: Record<string, unknown>;
}


export const interfaceInteractionStyles = ['request-response','event','stream','batch','file-transfer','database'] as const;
export type InterfaceInteractionStyle = (typeof interfaceInteractionStyles)[number];
export const interfaceLifecycleStatuses = ['proposed','active','deprecated','retired'] as const;
export type InterfaceLifecycleStatus = (typeof interfaceLifecycleStatuses)[number];

export interface ArchitectureInterface {
  id: string;
  name: string;
  stage: ArchitectureStage;
  providerNodeId: string;
  consumerNodeIds: string[];
  interactionStyle: InterfaceInteractionStyle;
  protocol: string;
  operationOrEvent: string;
  schemaRef?: string | undefined;
  version: string;
  authentication: string;
  authorization: string;
  encryption: string;
  timeoutMs?: number | undefined;
  retryPolicy: string;
  idempotency: string;
  ordering: string;
  deliveryGuarantee: string;
  deadLetterPolicy: string;
  replayPolicy: string;
  slo: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  owner: string;
  lifecycleStatus: InterfaceLifecycleStatus;
  evidenceIds: string[];
  contractLocation?: string | undefined;
  deprecationPolicy?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface QualityPriority {
  attributeId: string;
  weight: number;
  rationale?: string | undefined;
}

export interface QualityScenario {
  id: string;
  attributeId: string;
  source: string;
  stimulus: string;
  environment: string;
  artifact: string;
  response: string;
  responseMeasure: string;
  weight: number;
}

export interface ScopedStyleDecision {
  id: string;
  styleId: string;
  scopeNodeId?: string | undefined;
  stage: ArchitectureStage;
  rationale: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'superseded';
}

export interface PatternSelection {
  id: string;
  patternId: string;
  scopeNodeId?: string | undefined;
  stage: ArchitectureStage;
  rationale: string;
  status: 'considering' | 'accepted' | 'rejected' | 'superseded';
  obligationsAcknowledged: string[];
}

export interface ArchitectureDecision {
  id: string;
  title: string;
  context: string;
  decision: string;
  drivers: string[];
  consideredOptions: string[];
  consequences: string[];
  status: 'proposed' | 'accepted' | 'rejected' | 'superseded';
  createdAt: string;
  linkedRecordIds?: string[] | undefined;
  scopeNodeId?: string | undefined;
}

export interface Finding {
  id: string;
  ruleId: string;
  severity: FindingSeverity;
  title: string;
  message: string;
  rationale: string;
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  mitigations: string[];
  canOverride: boolean;
}

export interface ProjectContext {
  teamSize?: number | undefined;
  deliveryHorizonMonths?: number | undefined;
  operationalMaturity?: 1 | 2 | 3 | 4 | 5 | undefined;
  budgetSensitivity?: 1 | 2 | 3 | 4 | 5 | undefined;
  regulatoryExposure?: 'low' | 'medium' | 'high' | undefined;
  preferredVendors?: string[] | undefined;
  prohibitedTechnologies?: string[] | undefined;
  /** Problem-shape signals are stable machine identifiers used by applicability gates. */
  problemShapes?: string[] | undefined;
  stakeholders?: string[] | undefined;
  inScopeCapabilities?: string[] | undefined;
  outOfScopeCapabilities?: string[] | undefined;
  dataClassifications?: string[] | undefined;
  regulatoryJurisdictions?: string[] | undefined;
  existingSystems?: string[] | undefined;
  workloadProfile?: string | undefined;
  availabilityTarget?: string | undefined;
  recoveryObjectives?: string | undefined;
  teamTopology?: string | undefined;
  /** Experience applying architecture styles and operating distributed systems. */
  architectureExperience?: 1 | 2 | 3 | 4 | 5 | undefined;
  /** Ability of the organisation to absorb operating-model and platform change. */
  organizationalChangeReadiness?: 1 | 2 | 3 | 4 | 5 | undefined;
  deploymentModel?: 'on-premises' | 'private-cloud' | 'public-cloud' | 'hybrid' | 'edge' | 'multi-cloud' | undefined;
  dataSensitivity?: 'public' | 'internal' | 'confidential' | 'restricted' | undefined;
  sovereigntyRequirements?: string[] | undefined;
  vendorMandates?: string[] | undefined;
  legacyConstraints?: string[] | undefined;
  transitionState?: 'greenfield' | 'incremental-modernization' | 'migration' | 'coexistence' | undefined;
  reversibilityPreference?: 1 | 2 | 3 | 4 | 5 | undefined;
  supportModel?: 'product-team' | 'central-operations' | 'managed-service' | 'hybrid' | undefined;
  changeCadence?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | undefined;
  peakLoadVariability?: 'stable' | 'seasonal' | 'bursty' | 'unpredictable' | undefined;
}

export type ApprovalStatus = 'not-requested' | 'pending' | 'approved' | 'changes-requested' | 'rejected';

export interface StageApproval {
  id: string;
  stage: ArchitectureStage;
  status: ApprovalStatus;
  requestedAt?: string | undefined;
  requestedBy?: string | undefined;
  decidedAt?: string | undefined;
  reviewer?: string | undefined;
  assignedReviewerId?: string | undefined;
  dueAt?: string | undefined;
  expiresAt?: string | undefined;
  expiredAt?: string | undefined;
  comments: string[];
  snapshotId?: string | undefined;
}

export const projectReviewActions = [
  'approve-project-candidate',
  'return-with-comments',
  'reject-candidate',
  'request-evidence',
  'request-regeneration',
  'mark-risk-accepted',
  'record-exception',
] as const;
export type ProjectReviewAction = (typeof projectReviewActions)[number];

export interface ProjectReviewDecision {
  id: string;
  projectId: string;
  branchId: string;
  targetType: 'candidate' | 'graph-object' | 'risk' | 'project';
  targetId: string;
  action: ProjectReviewAction;
  actorRole: 'reviewer';
  actorId: string;
  timestamp: string;
  comment: string;
  priorState: string;
  resultingState: string;
  authority: 'project-candidate-review';
  auditReference: string;
}

export const projectRoles = ['owner', 'architect', 'reviewer', 'governance', 'contributor', 'viewer'] as const;
export type ProjectRole = (typeof projectRoles)[number];

export const projectPermissions = [
  'project.read', 'project.edit', 'branch.create', 'branch.merge', 'review.assign',
  'review.decide', 'approval.request', 'approval.decide', 'comment.create',
  'comment.resolve', 'member.manage', 'rulepack.manage', 'artifact.generate',
] as const;
export type ProjectPermission = (typeof projectPermissions)[number];

export interface ProjectMember {
  id: string;
  displayName: string;
  email: string;
  role: ProjectRole;
  status: 'active' | 'invited' | 'suspended';
  joinedAt: string;
}

export interface ReviewAssignment {
  id: string;
  stage: ArchitectureStage;
  branchId: string;
  snapshotId?: string | undefined;
  assignedTo: string;
  assignedBy: string;
  status: 'open' | 'in-progress' | 'completed' | 'cancelled' | 'overdue';
  priority: 'low' | 'normal' | 'high' | 'critical';
  instructions: string;
  dueAt?: string | undefined;
  completedAt?: string | undefined;
  createdAt: string;
}

export interface DiscussionComment {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  editedAt?: string | undefined;
}

export interface DiscussionThread {
  id: string;
  targetType: 'project' | 'stage' | 'node' | 'edge' | 'decision' | 'finding' | 'approval' | 'branch';
  targetId: string;
  title: string;
  status: 'open' | 'resolved';
  createdBy: string;
  createdAt: string;
  resolvedBy?: string | undefined;
  resolvedAt?: string | undefined;
  participantIds: string[];
  comments: DiscussionComment[];
}

export interface WorkbenchNotification {
  id: string;
  recipientId: string;
  type: 'review-assigned' | 'approval-requested' | 'approval-decided' | 'comment-added' | 'mention' | 'branch-merged' | 'approval-expired' | 'merge-conflict';
  title: string;
  message: string;
  targetType: DiscussionThread['targetType'] | 'review';
  targetId: string;
  createdAt: string;
  readAt?: string | undefined;
}

export interface CollaborationSettings {
  approvalValidityDays: number;
  reviewDueDays: number;
  requireIndependentReviewer: boolean;
  maxConcurrentEditors: number;
  presenceTtlSeconds: number;
  operationRetryLimit: number;
}


export type GovernancePredicate =
  | 'PROHIBIT_TECHNOLOGY'
  | 'REQUIRE_NODE_KIND'
  | 'REQUIRE_PROPERTY'
  | 'REQUIRE_PATTERN'
  | 'REQUIRE_DECISION'
  | 'LIMIT_SINGLE_ZONE_CRITICAL';

export interface GovernanceRule {
  id: string;
  title: string;
  description: string;
  severity: FindingSeverity;
  predicate: GovernancePredicate;
  parameters: Record<string, unknown>;
  rationale: string;
  mitigations: string[];
  evidenceIds: string[];
  enabled: boolean;
}

export interface GovernanceRulePack {
  id: string;
  name: string;
  version: string;
  description: string;
  status: 'draft' | 'approved' | 'deprecated';
  rules: GovernanceRule[];
}

export interface EvidenceReference {
  id: string;
  title: string;
  publisher: string;
  referenceType: 'standard' | 'book' | 'vendor-guidance' | 'internal-standard' | 'community-pattern';
  locator?: string | undefined;
  summary: string;
  authorityLevel: 1 | 2 | 3 | 4 | 5;
  reviewedAt: string;
}

export interface BranchMetadata {
  id: string;
  name: string;
  description: string;
  parentBranchId?: string | undefined;
  baseRevision: number;
  status: 'active' | 'candidate' | 'merged' | 'archived';
  createdAt: string;
}

export type IdentityProviderType = 'oidc' | 'saml' | 'development';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended';
  allowedEmailDomains: string[];
  dataRegion: string;
  createdAt: string;
}

export interface IdentityProviderConfig {
  id: string;
  tenantId: string;
  type: IdentityProviderType;
  name: string;
  issuer: string;
  clientId: string;
  scopes: string[];
  enabled: boolean;
}

export interface TenantSecuritySettings {
  requireSso: boolean;
  allowedIdentityProviderIds: string[];
  allowDevelopmentAuth: boolean;
  sessionMaxAgeMinutes: number;
  auditRetentionDays: number;
  encryptionKeyReference: string;
}

export interface SecretReference {
  id: string;
  provider: 'environment' | 'vault' | 'aws-secrets-manager' | 'azure-key-vault' | 'gcp-secret-manager';
  locator: string;
  purpose: string;
  rotatedAt?: string | undefined;
}

export interface AuthenticatedPrincipal {
  subject: string;
  email: string;
  displayName: string;
  tenantId: string;
  providerId: string;
  issuedAt: string;
  expiresAt: string;
  /** Enterprise roles are supplied by OIDC/proxy-verified claims or explicit development tokens. */
  roles?: string[] | undefined;
  /** Auth mode is used by production hardening gates to prevent dev-auth assumptions leaking into prod. */
  authMode?: 'development' | 'development-token' | 'oidc' | 'proxy-verified-oidc' | undefined;
  roleSource?: 'claim' | 'group' | 'mapping' | 'manual' | 'development-default' | undefined;
}

export interface AuditEvent {
  id: string;
  tenantId: string;
  projectId?: string | undefined;
  branchId?: string | undefined;
  actorId: string;
  eventType: string;
  action: string;
  targetType: string;
  targetId?: string | undefined;
  outcome: 'success' | 'denied' | 'conflict' | 'failure';
  occurredAt: string;
  retentionUntil: string;
  correlationId: string;
  metadata: Record<string, unknown>;
}

export interface ActivityEvent {
  id: string;
  tenantId: string;
  projectId: string;
  branchId: string;
  type: string;
  actorId: string;
  summary: string;
  createdAt: string;
  revision: number;
  correlationId: string;
}

export interface IdempotencyReceipt {
  key: string;
  tenantId: string;
  scope: string;
  requestHash: string;
  status: 'processing' | 'completed' | 'failed';
  response?: unknown;
  createdAt: string;
  expiresAt: string;
}


export type PortfolioCriticality = 'low' | 'medium' | 'high' | 'mission-critical';

export interface PortfolioMetadata {
  portfolioId: string;
  businessUnit: string;
  owner: string;
  criticality: PortfolioCriticality;
  lifecycle: 'invest' | 'maintain' | 'modernize' | 'retire';
  annualChangeBudget: number;
  currency: string;
}

export interface ProjectDependency {
  id: string;
  sourceProjectId: string;
  targetProjectId: string;
  kind: 'api' | 'event' | 'data' | 'shared-technology' | 'operational';
  criticality: 'low' | 'medium' | 'high';
  interfaceName: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  status: 'proposed' | 'active' | 'deprecated';
}

export interface TechnologyStandardException {
  id: string;
  standardId: string;
  nodeId: string;
  rationale: string;
  owner: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
}

export interface TechnicalDebtItem {
  id: string;
  title: string;
  category: 'architecture' | 'technology' | 'security' | 'data' | 'operations' | 'delivery';
  severity: FindingSeverity;
  description: string;
  linkedNodeIds: string[];
  estimatedEffortDays: number;
  annualCostImpact: number;
  dueAt?: string | undefined;
  status: 'open' | 'planned' | 'in-progress' | 'resolved' | 'accepted';
}

export interface BuildingBlockUsage {
  id: string;
  buildingBlockId: string;
  version: string;
  scopeNodeId?: string | undefined;
  status: 'proposed' | 'adopted' | 'diverged' | 'retired';
}

export interface ReferenceArchitectureAssignment {
  id: string;
  referenceArchitectureId: string;
  version: string;
  scopeNodeId?: string | undefined;
  status: 'proposed' | 'applicable' | 'compliant' | 'non-compliant' | 'waived';
}

export interface TechnologyStandard {
  id: string;
  category: string;
  technologyName: string;
  matchTerms: string[];
  status: 'preferred' | 'allowed' | 'restricted' | 'prohibited' | 'deprecated';
  preferredReplacement?: string | undefined;
  rationale: string;
  effectiveFrom: string;
  evidenceIds: string[];
}

export interface ArchitectureBuildingBlock {
  id: string;
  name: string;
  version: string;
  category: string;
  description: string;
  requiredPatternIds: string[];
  qualityAttributeIds: string[];
  nodeTemplates: Array<{ kind: EntityKind; stage: ArchitectureStage; label: string; properties: Record<string, unknown>; tags: string[] }>;
  edgeTemplates: Array<{ sourceLabel: string; targetLabel: string; kind: RelationshipKind; stage: ArchitectureStage }>;
  status: 'draft' | 'approved' | 'deprecated';
}

export interface ReferenceArchitecture {
  id: string;
  name: string;
  version: string;
  description: string;
  applicableContexts: string[];
  requiredStyleIds: string[];
  requiredPatternIds: string[];
  requiredNodeKinds: EntityKind[];
  prohibitedTechnologyTerms: string[];
  requiredDecisionTerms: string[];
  minimumApprovedStages: number;
  status: 'draft' | 'approved' | 'deprecated';
}

export interface EnterpriseArchitectureCatalog {
  id: string;
  tenantId: string;
  version: string;
  technologyStandards: TechnologyStandard[];
  buildingBlocks: ArchitectureBuildingBlock[];
  referenceArchitectures: ReferenceArchitecture[];
}

export interface PortfolioDependencyGraph {
  projects: Array<{ id: string; name: string; criticality: PortfolioCriticality; owner: string }>;
  dependencies: ProjectDependency[];
  centrality: Array<{ projectId: string; inbound: number; outbound: number; score: number }>;
  singlePointsOfDependency: string[];
}

export interface TechnologyStandardizationFinding {
  id: string;
  projectId: string;
  nodeId: string;
  technology: string;
  standardId?: string | undefined;
  status: TechnologyStandard['status'] | 'unclassified';
  severity: FindingSeverity;
  recommendation: string;
}

export interface TechnologyStandardizationReport {
  score: number;
  classified: number;
  unclassified: number;
  preferred: number;
  restricted: number;
  prohibited: number;
  deprecated: number;
  fragmentationByCategory: Array<{ category: string; technologies: string[]; count: number }>;
  findings: TechnologyStandardizationFinding[];
}

export interface PortfolioRiskHeatmapEntry {
  projectId: string;
  projectName: string;
  criticality: PortfolioCriticality;
  riskScore: number;
  technicalDebtScore: number;
  governanceScore: number;
  operationalScore: number;
  dependencyScore: number;
  riskBand: 'low' | 'moderate' | 'high' | 'critical';
  drivers: string[];
}

export interface PortfolioCostSummary {
  currency: string;
  expectedMonthlyCost: number;
  actualMonthlyCost: number;
  monthlyVariance: number;
  annualTechnicalDebtImpact: number;
  byProject: Array<{ projectId: string; expectedMonthlyCost: number; actualMonthlyCost: number; variance: number }>;
}

export interface ReferenceComplianceReport {
  projectId: string;
  referenceArchitectureId: string;
  score: number;
  compliant: boolean;
  missingStyles: string[];
  missingPatterns: string[];
  missingNodeKinds: EntityKind[];
  prohibitedTechnologies: string[];
  missingDecisions: string[];
  approvalGap: number;
}

export interface BuildingBlockReuseReport {
  usages: Array<{ buildingBlockId: string; projectIds: string[]; adoptionCount: number }>;
  duplicateCandidates: Array<{ signature: string; projectIds: string[]; labels: string[]; recommendation: string }>;
  reuseScore: number;
}

export interface InvestmentRecommendation {
  id: string;
  title: string;
  category: 'risk-reduction' | 'standardization' | 'modernization' | 'cost-optimization' | 'resilience' | 'reuse';
  priority: 'now' | 'next' | 'later';
  projectIds: string[];
  rationale: string;
  estimatedEffortDays: number;
  estimatedAnnualBenefit: number;
  dependencies: string[];
}

export interface PortfolioIntelligenceReport {
  generatedAt: string;
  portfolioId: string;
  dependencyGraph: PortfolioDependencyGraph;
  standardization: TechnologyStandardizationReport;
  riskHeatmap: PortfolioRiskHeatmapEntry[];
  costs: PortfolioCostSummary;
  compliance: ReferenceComplianceReport[];
  reuse: BuildingBlockReuseReport;
  roadmap: InvestmentRecommendation[];
  summary: { projects: number; highRiskProjects: number; totalDependencies: number; standardizationScore: number; complianceScore: number; monthlyCostVariance: number };
}


export interface CoArchitectMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citedRecordIds: string[];
  modelTrace?: { providerId: string; model: string; routeId: string; fallbackUsed: boolean; requestFingerprint: string } | undefined;
}

export interface CoArchitectSession {
  id: string;
  title: string;
  stage: ArchitectureStage;
  scopeNodeId?: string | undefined;
  createdAt: string;
  updatedAt: string;
  messages: CoArchitectMessage[];
}

export interface AiReviewRecord {
  id: string;
  createdAt: string;
  stage: ArchitectureStage;
  scopeNodeId?: string | undefined;
  source: 'deterministic' | 'llm-assisted';
  summary: string;
  healthScore: number;
  proposalCount: number;
  findingCount: number;
  modelTrace?: { providerId: string; model: string; routeId: string; fallbackUsed: boolean; requestFingerprint: string } | undefined;
}

export interface ArchitectureProject {
  schemaVersion: '0.8.0';
  tenantId: string;
  id: string;
  name: string;
  description: string;
  activeStage: ArchitectureStage;
  objectives: string[];
  constraints: string[];
  assumptions: string[];
  requirementsIntelligence?: RequirementsIntelligenceState | undefined;
  qualityPriorities: QualityPriority[];
  qualityScenarios: QualityScenario[];
  styleDecisions: ScopedStyleDecision[];
  patternSelections: PatternSelection[];
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  interfaces?: ArchitectureInterface[] | undefined;
  architectureViews?: import('./architectureView.js').ArchitectureView[] | undefined;
  architectureViewVersions?: import('./architectureView.js').ArchitectureViewVersion[] | undefined;
  designGraph?: import('./architectureDesignGraph.js').ArchitectureDesignGraph | undefined;
  decisions: ArchitectureDecision[];
  findings: Finding[];
  context: ProjectContext;
  branch: BranchMetadata;
  stageApprovals: StageApproval[];
  reviewDecisionLedger?: ProjectReviewDecision[] | undefined;
  activeRulePackIds: string[];
  members: ProjectMember[];
  reviewAssignments: ReviewAssignment[];
  discussionThreads: DiscussionThread[];
  notifications: WorkbenchNotification[];
  coArchitectSessions: CoArchitectSession[];
  aiReviewHistory: AiReviewRecord[];
  collaborationSettings: CollaborationSettings;
  securitySettings: TenantSecuritySettings;
  identityProviders: IdentityProviderConfig[];
  secretReferences: SecretReference[];
  observabilitySettings: ObservabilitySettings;
  repositoryBindings: RepositoryBinding[];
  runtimeInventories: RuntimeInventory[];
  driftReports: DriftReport[];
  policyGates: ArchitecturePolicyGate[];
  inventoryCollectors: InventoryCollector[];
  collectorRuns: CollectorRun[];
  operationalDriftReports: OperationalDriftReport[];
  driftWaivers: DriftWaiver[];
  remediationPlans: RemediationPlan[];
  serviceLevelObjectives: ServiceLevelObjective[];
  alertPolicies: AlertPolicy[];
  repositoryPullRequests: RepositoryPullRequest[];
  eventBrokerSettings: EventBrokerSettings;
  deploymentProfiles: DeploymentProfile[];
  portfolio: PortfolioMetadata;
  projectDependencies: ProjectDependency[];
  technologyStandardExceptions: TechnologyStandardException[];
  technicalDebtItems: TechnicalDebtItem[];
  buildingBlockUsages: BuildingBlockUsage[];
  referenceArchitectureAssignments: ReferenceArchitectureAssignment[];
  revision: number;
  updatedAt: string;
}

export type CalibrationLifecycle =
  | 'unrated'
  | 'draft-ai'
  | 'expert-reviewed'
  | 'benchmark-approved'
  | 'production'
  | 'deprecated'
  // Backward-compatible values retained for older project and library files.
  | 'approved'
  | 'pending-expert-calibration';

export interface QualityAttributeRecord {
  /** Canonical stable machine identifier used by projects and style ratings. */
  id: string;
  legacyId?: string | undefined;
  name: string;
  definition: string;
  measures: string;
  exampleTactics: string;
  calibrated?: boolean | undefined;
  calibrationConfidence?: number | undefined;
  calibrationStatus?: CalibrationLifecycle | undefined;
  calibrationOwner?: string | undefined;
  calibrationReviewedAt?: string | undefined;
  calibrationEvidenceIds?: string[] | undefined;
  calibrationBenchmarkIds?: string[] | undefined;
  calibrationVersion?: string | undefined;
}

export interface ArchitectureStyleApplicability {
  minTeamSize?: number | undefined;
  maxTeamSize?: number | undefined;
  minOperationalMaturity?: 1 | 2 | 3 | 4 | 5 | undefined;
  maxDeliveryHorizonMonths?: number | undefined;
  requiredContextSignals?: string[] | undefined;
  excludedContextSignals?: string[] | undefined;
}


export interface ArchitectureStyleRecord {
  id: string;
  name: string;
  recordType: 'architectureStyle';
  status: string;
  applicableStages: ArchitectureStage[];
  qualityAttributeRatings: Record<string, number>;
  whenToConsider: string[];
  whenToAvoidOrQuestion: string[];
  requires: string[];
  recommends: string[];
  tensions: string[];
  obligations: string[];
  evidence: unknown[];
  owner: string;
  version: string;
  calibrationNote: string;
  /** Stable semantic traits used by recommendation logic; display names are never parsed. */
  traits?: string[] | undefined;
  applicability?: ArchitectureStyleApplicability | undefined;
  /** Technologies that are mandatory for this style, if any. Abstract styles usually leave this empty. */
  requiredTechnologies?: string[] | undefined;
  /** Known optional technology realizations. Prohibitions are checked here, not against the style name. */
  technologyRealizations?: string[] | undefined;
}

export interface RecommendationContribution {
  attributeId: string;
  weight: number;
  rating: number;
  normalizedRating: number;
  points: number;
  calibrated: boolean;
}

export interface PatternRecord {
  id: string;
  name: string;
  recordType: 'pattern';
  category: string;
  status: string;
  applicableStages: ArchitectureStage[];
  pairsWellWith: string[];
  conflictsWith: string[];
  obligations: string[];
  requires: string[];
  qualityAttributeImpact: Record<string, number>;
  risks: string[];
  mitigations: string[];
  evidence: unknown[];
  owner: string;
  version: string;
  calibrationNote: string;
}

export interface ViewpointRecord {
  id: string;
  name: string;
  purpose: string;
  allowedEntityTypes: EntityKind[];
  allowedRelationshipTypes: RelationshipKind[];
}

export interface KnowledgeLibrary {
  /** Approved Pattern DNA release used for production retrieval and citations. */
  knowledgeReleaseId?: string | undefined;
  libraryId: string;
  version: string;
  status: string;
  generatedAt: string;
  disclaimer: string;
  qualityAttributes: QualityAttributeRecord[];
  architectureStyles: ArchitectureStyleRecord[];
  patterns: PatternRecord[];
  viewpoints: ViewpointRecord[];
  evidence: EvidenceReference[];
  rulePacks: GovernanceRulePack[];
}

export type RecommendationFeasibility = 'strong' | 'conditional' | 'weak' | 'infeasible';

export interface RecommendationConfidenceBreakdown {
  /** Strength and diversity of approved supporting evidence. */
  evidence: number;
  /** Completeness of project, organisational and operating context. */
  contextCompleteness: number;
  /** Coverage by deterministic rules and approved quality calibrations. */
  deterministicRule: number;
  /** Empirical support from comparable outcomes; intentionally conservative until telemetry exists. */
  outcome: number;
  /** LLM interpretation confidence. Null means the deterministic rank did not use an LLM. */
  modelInterpretation: number | null;
  /** Sensitivity of the rank to small context or driver changes. */
  stability: number;
  overall: number;
  basis: string[];
}

export interface RecommendationAlternative {
  styleId: string;
  styleName: string;
  score: number;
  reasonRankedLower: string;
}

export interface RecommendationScore {
  styleId: string;
  styleName: string;
  score: number;
  eligible: boolean;
  feasibility: RecommendationFeasibility;
  disqualifiers: string[];
  strengths: string[];
  tradeoffs: string[];
  assumptions: string[];
  obligations: string[];
  contributions: RecommendationContribution[];
  calibratedWeight: number;
  ignoredPriorityIds: string[];
  contextAdjustments: Array<{ ruleId: string; delta: number; explanation: string }>;
  confidence: RecommendationConfidenceBreakdown;
  contextGaps: string[];
  changeTriggers: string[];
  whyRankedHere: string[];
  alternativesConsidered: RecommendationAlternative[];
}

export interface DesignGuidanceAction {
  type: 'navigate' | 'run-audit' | 'accept-style' | 'review-pattern' | 'select-node' | 'open-knowledge' | 'none';
  label: string;
  target?: string | undefined;
}

export interface DesignGuidanceItem {
  id: string;
  stage: ArchitectureStage;
  placement: 'brief' | 'quality' | 'canvas' | 'inspector' | 'review' | 'navigation' | 'global';
  priority: 'critical' | 'high' | 'medium' | 'low';
  kind: 'next-step' | 'warning' | 'recommendation' | 'knowledge-tip' | 'obligation';
  title: string;
  message: string;
  rationale: string;
  linkedRecordIds: string[];
  source: 'deterministic-knowledge' | 'llm-enriched';
  action: DesignGuidanceAction;
  dismissible: boolean;
}

export interface PatternRecommendation {
  patternId: string;
  patternName: string;
  category: string;
  score: number;
  eligible: boolean;
  status: 'not-selected' | 'considering' | 'accepted' | 'conflicting';
  reasons: string[];
  tradeoffs: string[];
  obligations: string[];
  unmetPrerequisites: string[];
  conflicts: string[];
  scopeNodeId?: string | undefined;
}

export interface DecisionSuggestion {
  id: string;
  title: string;
  stage: ArchitectureStage;
  scopeNodeId?: string | undefined;
  context: string;
  recommendedDecision: string;
  drivers: string[];
  consideredOptions: string[];
  consequences: string[];
  linkedRecordIds: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface RecommendationContext {
  stage: ArchitectureStage;
  scopeNodeId?: string | undefined;
  trigger: 'initial' | 'intent-change' | 'quality-change' | 'style-selection' | 'pattern-selection' | 'canvas-change' | 'scope-change';
}

export interface ContextualRecommendationBundle {
  generatedAt: string;
  context: RecommendationContext;
  headline: string;
  styles: RecommendationScore[];
  patterns: PatternRecommendation[];
  decisions: DecisionSuggestion[];
  obligations: Array<{ sourceRecordId: string; sourceName: string; obligation: string; satisfied: boolean }>;
  warnings: string[];
}

export interface ProjectSnapshot {
  id: string;
  projectId: string;
  revision: number;
  label: string;
  status: 'draft' | 'reviewed' | 'approved';
  createdAt: string;
  contentHash: string;
  project: ArchitectureProject;
}

export type ChangeOperation =
  | { type: 'ADD_NODE'; node: ArchitectureNode }
  | { type: 'UPDATE_NODE'; nodeId: string; patch: Partial<ArchitectureNode> }
  | { type: 'DELETE_NODE'; nodeId: string }
  | { type: 'ADD_EDGE'; edge: ArchitectureEdge }
  | { type: 'UPDATE_EDGE'; edgeId: string; patch: Partial<ArchitectureEdge> }
  | { type: 'DELETE_EDGE'; edgeId: string };

export interface ChangeProposal {
  id: string;
  title: string;
  rationale: string;
  severity: FindingSeverity;
  operations: ChangeOperation[];
  evidenceRecordIds: string[];
  selected: boolean;
}

export interface AuditResult {
  id: string;
  createdAt: string;
  source: 'deterministic' | 'llm-assisted';
  summary: string;
  healthScore: number;
  findings: Finding[];
  proposals: ChangeProposal[];
  modelTrace?: {
    providerId: string;
    model: string;
    routeId: string;
    fallbackUsed: boolean;
    requestFingerprint: string;
  } | undefined;
}

export interface ArchitectureBranch {
  metadata: BranchMetadata;
  project: ArchitectureProject;
}

export interface ModelDifference {
  id: string;
  category: 'node' | 'edge' | 'style' | 'pattern' | 'decision' | 'quality' | 'governance';
  change: 'added' | 'removed' | 'modified';
  label: string;
  recordId: string;
  details: string;
}

export interface BranchComparison {
  sourceBranchId: string;
  targetBranchId: string;
  generatedAt: string;
  summary: {
    added: number;
    removed: number;
    modified: number;
    riskDelta: number;
  };
  differences: ModelDifference[];
}

export interface ImpactNode {
  nodeId: string;
  label: string;
  stage: ArchitectureStage;
  distance: number;
  reasons: string[];
}

export interface ImpactAnalysis {
  sourceIds: string[];
  generatedAt: string;
  affectedNodes: ImpactNode[];
  affectedDecisionIds: string[];
  affectedStyleDecisionIds: string[];
  affectedPatternSelectionIds: string[];
  affectedApprovalStages: ArchitectureStage[];
}

export interface PortfolioEntry {
  id: string;
  name: string;
  description: string;
  owner: string;
  status: 'draft' | 'in-review' | 'approved' | 'implemented' | 'retired';
  healthScore: number;
  updatedAt: string;
  branchCount: number;
  openFindings: number;
  approvalProgress: number;
}

export interface MergeConflict {
  id: string;
  category: 'node' | 'edge' | 'style' | 'pattern' | 'decision' | 'approval';
  recordId: string;
  label: string;
  sourceValue: unknown;
  targetValue: unknown;
  resolution: 'unresolved' | 'source' | 'target';
}

export interface MergePlan {
  id: string;
  sourceBranchId: string;
  targetBranchId: string;
  createdAt: string;
  conflicts: MergeConflict[];
  nonConflictingDifferences: ModelDifference[];
  status: 'draft' | 'ready' | 'applied' | 'cancelled';
}

export type CollaborationOperation =
  | { type: 'UPSERT_NODE'; node: ArchitectureNode }
  | { type: 'DELETE_NODE'; nodeId: string }
  | { type: 'UPSERT_EDGE'; edge: ArchitectureEdge }
  | { type: 'DELETE_EDGE'; edgeId: string }
  | { type: 'ADD_COMMENT'; threadId: string; comment: DiscussionComment };

export interface CollaborationOperationBatch {
  operationId: string;
  idempotencyKey: string;
  tenantId: string;
  projectId: string;
  branchId: string;
  baseRevision: number;
  actorId: string;
  operations: CollaborationOperation[];
}

export interface CollaborationPresence {
  tenantId: string;
  connectionId: string;
  userId: string;
  branchId: string;
  stage: ArchitectureStage;
  selectedNodeId?: string | undefined;
  lastSeenAt: string;
}


export type RuntimeInventorySource = 'kubernetes' | 'terraform-state' | 'openapi' | 'manual' | 'aws' | 'azure' | 'gcp' | 'telemetry';

export interface RuntimeResource {
  id: string;
  sourceType: RuntimeInventorySource;
  externalId: string;
  resourceType: string;
  name: string;
  provider?: string | undefined;
  namespace?: string | undefined;
  region?: string | undefined;
  version?: string | undefined;
  properties: Record<string, unknown>;
  labels: Record<string, string>;
  discoveredAt: string;
}

export interface RuntimeRelationship {
  id: string;
  sourceResourceId: string;
  targetResourceId: string;
  kind: 'calls' | 'publishes' | 'subscribes' | 'reads' | 'writes' | 'deployed-on' | 'contains' | 'depends-on';
  properties: Record<string, unknown>;
}

export interface RuntimeInventory {
  id: string;
  tenantId: string;
  projectId: string;
  branchId: string;
  name: string;
  sourceType: RuntimeInventorySource;
  capturedAt: string;
  sourceRevision?: string | undefined;
  rawFingerprint: string;
  resources: RuntimeResource[];
  relationships: RuntimeRelationship[];
}

export type DriftKind = 'missing-actual' | 'unmanaged-actual' | 'property-mismatch' | 'topology-mismatch' | 'version-drift' | 'policy-violation' | 'cost-drift' | 'capacity-drift' | 'resilience-drift';

export interface DriftFinding {
  id: string;
  kind: DriftKind;
  severity: FindingSeverity;
  title: string;
  message: string;
  intendedNodeId?: string | undefined;
  actualResourceId?: string | undefined;
  propertyPath?: string | undefined;
  intendedValue?: unknown;
  actualValue?: unknown;
  rationale: string;
  recommendation: string;
  status: 'open' | 'accepted' | 'resolved' | 'ignored';
}

export interface DriftReport {
  id: string;
  inventoryId: string;
  projectRevision: number;
  generatedAt: string;
  summary: {
    matched: number;
    missingActual: number;
    unmanagedActual: number;
    propertyMismatches: number;
    topologyMismatches: number;
    versionDrift: number;
  };
  mappings: Array<{ intendedNodeId: string; actualResourceId: string; confidence: number; reasons: string[] }>;
  findings: DriftFinding[];
}

export interface RepositoryBinding {
  id: string;
  provider: 'local' | 'github' | 'gitlab' | 'azure-devops';
  repositoryUrl: string;
  defaultBranch: string;
  architecturePath: string;
  runtimeInventoryPath: string;
  policyGatePath: string;
  status: 'configured' | 'connected' | 'error';
  lastSyncedAt?: string | undefined;
}

export interface ArchitecturePolicyGate {
  id: string;
  name: string;
  enabled: boolean;
  hardFindingThreshold: number;
  significantFindingThreshold: number;
  advisoryFindingThreshold: number;
  maxMissingResources: number;
  maxUnmanagedResources: number;
  requiredApprovedStages: ArchitectureStage[];
}

export interface PolicyGateResult {
  gateId: string;
  passed: boolean;
  generatedAt: string;
  projectRevision: number;
  inventoryId?: string | undefined;
  reasons: string[];
  metrics: {
    hardFindings: number;
    significantFindings: number;
    advisoryFindings: number;
    missingResources: number;
    unmanagedResources: number;
    approvedStages: number;
  };
}

export interface ObservabilitySettings {
  serviceName: string;
  tracesEnabled: boolean;
  metricsEnabled: boolean;
  logsEnabled: boolean;
  samplingRatio: number;
  otlpEndpointReference?: string | undefined;
  targetAvailabilityPercent: number;
  targetP95LatencyMs: number;
}


export type CollectorProvider = 'aws' | 'azure' | 'gcp' | 'kubernetes';

export interface InventoryCollector {
  id: string;
  name: string;
  provider: CollectorProvider;
  enabled: boolean;
  schedule: string;
  scope: Record<string, string>;
  secretReferenceIds: string[];
  lastRunAt?: string | undefined;
  nextRunAt?: string | undefined;
  status: 'configured' | 'running' | 'healthy' | 'degraded' | 'disabled';
}

export interface CollectorRun {
  id: string;
  collectorId: string;
  startedAt: string;
  completedAt?: string | undefined;
  status: 'running' | 'completed' | 'failed';
  inventoryId?: string | undefined;
  resourceCount: number;
  relationshipCount: number;
  message: string;
}

export interface TelemetrySpanEvidence {
  traceId: string;
  spanId: string;
  parentSpanId?: string | undefined;
  serviceName: string;
  peerService?: string | undefined;
  operation: string;
  protocol?: string | undefined;
  status: 'ok' | 'error';
  durationMs: number;
  observedAt: string;
  attributes: Record<string, unknown>;
}

export interface DriftWaiver {
  id: string;
  findingId: string;
  reason: string;
  ownerId: string;
  approvedBy: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
}

export interface OperationalDriftFinding {
  id: string;
  category: 'cost' | 'capacity' | 'resilience';
  severity: FindingSeverity;
  title: string;
  message: string;
  intendedNodeId?: string | undefined;
  actualResourceId?: string | undefined;
  expectedValue?: unknown;
  actualValue?: unknown;
  estimatedMonthlyImpact?: number | undefined;
  recommendation: string;
  status: 'open' | 'waived' | 'resolved';
}

export interface OperationalDriftReport {
  id: string;
  inventoryId: string;
  generatedAt: string;
  projectRevision: number;
  summary: { cost: number; capacity: number; resilience: number; estimatedMonthlyImpact: number };
  findings: OperationalDriftFinding[];
}

export interface RemediationAction {
  id: string;
  findingId: string;
  actionType: 'architecture-change' | 'runtime-change' | 'documentation-change' | 'waiver';
  title: string;
  description: string;
  targetIds: string[];
  risk: 'low' | 'medium' | 'high';
  automation: 'manual' | 'scaffolded' | 'provider-preview';
  status: 'proposed' | 'approved' | 'rejected' | 'completed';
}

export interface RemediationPlan {
  id: string;
  name: string;
  sourceReportId: string;
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'pending-approval' | 'approved' | 'rejected' | 'completed';
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
  actions: RemediationAction[];
}

export interface ServiceLevelObjective {
  id: string;
  name: string;
  targetNodeId?: string | undefined;
  indicator: 'availability' | 'latency-p95' | 'error-rate' | 'throughput' | 'freshness';
  target: number;
  window: '1h' | '24h' | '7d' | '30d';
  warningThreshold: number;
  criticalThreshold: number;
  enabled: boolean;
}

export interface AlertPolicy {
  id: string;
  sloId: string;
  name: string;
  channels: Array<'email' | 'webhook' | 'pager' | 'chat'>;
  severity: 'warning' | 'critical';
  burnRateThreshold: number;
  evaluationWindowMinutes: number;
  enabled: boolean;
}

export interface SloEvaluation {
  sloId: string;
  observedValue: number;
  status: 'healthy' | 'warning' | 'critical';
  errorBudgetRemainingPercent: number;
  evaluatedAt: string;
}

export interface RepositoryPullRequest {
  id: string;
  bindingId: string;
  provider: RepositoryBinding['provider'];
  title: string;
  sourceBranch: string;
  targetBranch: string;
  status: 'preview' | 'opened' | 'merged' | 'closed' | 'failed';
  files: Array<{ path: string; operation: 'create' | 'update' | 'delete'; contentHash: string }>;
  createdAt: string;
  url?: string | undefined;
}

export interface EventBrokerSettings {
  adapter: 'memory' | 'webhook' | 'kafka' | 'service-bus' | 'pubsub';
  endpointReference?: string | undefined;
  topic: string;
  maxAttempts: number;
  retryDelayMs: number;
  deadLetterEnabled: boolean;
}

export interface DeploymentProfile {
  id: string;
  name: string;
  environment: 'development' | 'test' | 'staging' | 'production';
  replicas: number;
  cpuRequest: string;
  memoryRequest: string;
  publicIngress: boolean;
  autoscaling: boolean;
  minReplicas: number;
  maxReplicas: number;
}

export interface ArtifactFile {
  path: string;
  mediaType: string;
  content: string;
  /** Binary artifacts are transported as base64 and decoded when archived or streamed. */
  encoding?: 'utf8' | 'base64';
  accessibility?: { tagged?: boolean; language?: string; alternativeText?: string };
}

export interface ArtifactBundle {
  generatedAt: string;
  projectId: string;
  files: ArtifactFile[];
}

/* Sprint 7.5: core visual design intelligence */
export type DesignLibraryRecordType = 'component' | 'pattern' | 'anti-pattern' | 'style' | 'template';
export type PortDirection = 'input' | 'output' | 'bidirectional';
export type DropDisposition = 'allowed' | 'warning' | 'blocked';

export interface DesignPortDefinition {
  id: string;
  label: string;
  direction: PortDirection;
  relationshipKinds: RelationshipKind[];
  semanticTypes: string[];
  position: 'left' | 'right' | 'top' | 'bottom';
}

export interface DesignPropertyOption { label: string; value: string | number | boolean; }
export interface DesignPropertyDefinition {
  key: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'enum' | 'multiline';
  description: string;
  required?: boolean | undefined;
  defaultValue?: unknown;
  options?: DesignPropertyOption[] | undefined;
  min?: number | undefined;
  max?: number | undefined;
}

export interface DesignDepictionDefinition {
  renderer: string;
  icon: string;
  shape: 'card' | 'boundary' | 'cylinder' | 'event' | 'actor' | 'infrastructure' | 'control';
  defaultSize: { width: number; height: number };
  canContainChildren: boolean;
  ports: DesignPortDefinition[];
  previewKind: string;
  notationMappings: Record<string, string>;
}

export interface DesignTemplateNode {
  key: string;
  kind: EntityKind;
  stage: ArchitectureStage;
  label: string;
  description?: string | undefined;
  properties: Record<string, unknown>;
  tags: string[];
  offset: Point;
}

export interface DesignTemplateEdge {
  sourceKey: string;
  targetKey: string;
  kind: RelationshipKind;
  stage: ArchitectureStage;
  label?: string | undefined;
  properties: Record<string, unknown>;
}

export interface DesignLibraryRecord {
  id: string;
  recordType: DesignLibraryRecordType;
  name: string;
  category: string;
  description: string;
  applicableStages: ArchitectureStage[];
  applicableViewpoints: string[];
  maturity: 'emerging' | 'established' | 'mature';
  approvalStatus: 'draft' | 'approved' | 'deprecated';
  owner: string;
  version: string;
  tags: string[];
  depiction: DesignDepictionDefinition;
  properties: DesignPropertyDefinition[];
  qualityAttributeImpact: Record<string, number>;
  whenToUse: string[];
  whenToQuestion: string[];
  requires: string[];
  recommends: string[];
  pairsWellWith: string[];
  conflictsWith: string[];
  obligations: string[];
  risks: string[];
  mitigations: string[];
  evidenceIds: string[];
  componentKind?: EntityKind | undefined;
  defaultProperties?: Record<string, unknown> | undefined;
  nodeTemplate?: DesignTemplateNode[] | undefined;
  edgeTemplate?: DesignTemplateEdge[] | undefined;
  /** Canonical Pattern DNA or source record used to build this visual record. */
  sourceRecordId?: string | undefined;
  knowledgeReleaseId?: string | undefined;
  authorityState?: 'discovery' | 'candidate' | 'reviewed-advisory' | 'approved-production' | 'deprecated' | 'blocked' | undefined;
}

export interface LibraryDropAssessment {
  recordId: string;
  disposition: DropDisposition;
  title: string;
  explanation: string;
  findings: Array<{ severity: FindingSeverity; title: string; message: string }>;
  obligations: string[];
  scopeNodeId?: string | undefined;
  position: Point;
}

export interface LibraryDropPreview extends LibraryDropAssessment {
  record: DesignLibraryRecord;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  styleDecision?: ScopedStyleDecision | undefined;
  patternSelection?: PatternSelection | undefined;
}

export interface SemanticConnectionOption {
  kind: RelationshipKind;
  label: string;
  recommended: boolean;
  explanation: string;
  intermediaryRecordIds: string[];
}

export interface CanvasComplianceMetric {
  id: string;
  name: string;
  applicableControls: number;
  satisfiedControls: number;
  evidenceGaps: number;
  activeExceptions: number;
  hardViolations: number;
}
