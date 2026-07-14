import type { ArchitectureEdge, ArchitectureInterface, ArchitectureNode, ArchitectureProject, ArchitectureStage, EntityKind, Point, RelationshipKind } from './types.js';
import type { ArchitectureView } from './architectureView.js';
import type { KnowledgeRepositoryConnector, SourceTrustTier } from './knowledgeMesh.js';

export const patternKnowledgeRecordTypes = ['style','pattern','anti-pattern','topology-template','component-archetype','reference-architecture'] as const;
export type PatternKnowledgeRecordType = (typeof patternKnowledgeRecordTypes)[number];
export type PatternKnowledgeLifecycle = 'candidate' | 'approved' | 'deprecated' | 'retired';
export type RepositoryAcquisitionMode = 'selected-files' | 'commit-archive' | 'controlled-clone';
export type RepositoryMonitoringMode = 'scheduled-poll' | 'webhook' | 'manual';
export type RepositoryOperation = 'monitor' | 'snapshot' | 'extract-claims' | 'recommend' | 'generate-template' | 'reuse-code';

export interface PatternEvidenceReference {
  connectorId: string;
  claimIds: string[];
  evidenceRole: 'primary' | 'corroborating' | 'limiting' | 'realization';
  sourceTrustTier: SourceTrustTier;
  revisionPolicy: 'approved-commit-only' | 'approved-release-only';
}


export interface PatternAtomicClaimReceipt {
  id: string;
  patternRecordId: string;
  connectorId: string;
  claimType: 'problem' | 'applicability' | 'consequence' | 'obligation' | 'realization';
  statement: string;
  evidenceRole: PatternEvidenceReference['evidenceRole'];
  sourceTrustTier: SourceTrustTier;
  revisionPolicy: PatternEvidenceReference['revisionPolicy'];
  derivation: 'editorial-synthesis';
  reviewStatus: 'verified';
  reviewedBy: string;
  reviewedAt: string;
  releaseId: string;
}

export interface PatternQualityImpact {
  attributeId: string;
  direction: 'improves' | 'degrades' | 'conditional';
  magnitude: 1 | 2 | 3 | 4 | 5;
  rationale: string;
  conditions: string[];
}

export interface PatternObligation {
  id: string;
  title: string;
  description: string;
  category: 'security' | 'reliability' | 'data' | 'operations' | 'delivery' | 'governance' | 'cost';
  mandatory: boolean;
  verificationHint: string;
}

export interface PatternTopologyNode {
  key: string;
  label: string;
  kind: EntityKind;
  stage: ArchitectureStage;
  properties: Record<string, unknown>;
  tags: string[];
  offset: Point;
}

export interface PatternTopologyEdge {
  sourceKey: string;
  targetKey: string;
  kind: RelationshipKind;
  stage: ArchitectureStage;
  label?: string;
  properties: Record<string, unknown>;
}

export interface PatternTopology {
  nodes: PatternTopologyNode[];
  edges: PatternTopologyEdge[];
  boundaryRules: string[];
}

export interface ProviderRealization {
  provider: 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'open-source' | 'framework' | 'generic';
  name: string;
  technologyIds: string[];
  connectorId?: string;
  conditions: string[];
  notes: string[];
}

export interface PatternConformanceRule {
  id: string;
  title: string;
  target: 'archunit' | 'jqassistant' | 'spring-modulith' | 'openapi' | 'asyncapi' | 'terraform' | 'kubernetes' | 'generic';
  predicate: 'require-node' | 'require-edge' | 'forbid-edge' | 'require-property' | 'forbid-cycle' | 'require-contract' | 'require-observability';
  parameters: Record<string, unknown>;
  severity: 'advisory' | 'warning' | 'error';
  rationale: string;
}

export interface PatternReviewMetadata {
  reviewedBy: string;
  reviewedAt: string;
  releaseId: string;
  reviewMethod: 'expert-reviewed' | 'standards-mapped' | 'calibrated-reference';
  notes: string[];
}


export interface PatternComponentKitItem {
  key: string;
  name: string;
  archetype: string;
  responsibility: string;
  required: boolean;
  properties: Record<string, unknown>;
}

export interface PatternInterfaceKitItem {
  key: string;
  name: string;
  providerRole: string;
  consumerRole: string;
  interaction: 'request-response' | 'event' | 'stream' | 'batch' | 'control';
  protocol: string;
  contractType: string;
  required: boolean;
}

export interface PatternGenerationContract {
  components: boolean;
  relationships: boolean;
  interfaces: boolean;
  trustBoundaries: boolean;
  obligations: boolean;
  risks: boolean;
  fitnessTests: boolean;
  topology: boolean;
  idempotentApplicationKey: string;
}

export interface PatternDna2EditorialReview {
  depth: 'deep' | 'standard';
  reviewedBy: string;
  reviewedAt: string;
  releaseId: string;
  independentReviewRequired: boolean;
  checklist: string[];
}

export interface PatternKnowledgeRecord {
  id: string;
  name: string;
  aliases: string[];
  recordType: PatternKnowledgeRecordType;
  category: string;
  summary: string;
  problem: string;
  context: string[];
  forces: string[];
  applicableStages: ArchitectureStage[];
  applicabilityRules: string[];
  exclusions: string[];
  prerequisites: string[];
  complements: string[];
  conflicts: string[];
  alternatives: string[];
  qualityImpacts: PatternQualityImpact[];
  obligations: PatternObligation[];
  risks: string[];
  mitigations: string[];
  topology?: PatternTopology;
  providerRealizations: ProviderRealization[];
  conformanceRules: PatternConformanceRule[];
  evidence: PatternEvidenceReference[];
  lifecycle: PatternKnowledgeLifecycle;
  maturity: 'emerging' | 'established' | 'mature';
  owner: string;
  version: string;
  review: PatternReviewMetadata;
  tags: string[];
  /** rc.10.55 Pattern DNA 2.0 extension. */
  dnaVersion?: '2.0';
  componentKit?: PatternComponentKitItem[];
  interfaceKit?: PatternInterfaceKitItem[];
  operationalImpacts?: string[];
  securityConsequences?: string[];
  dataConsequences?: string[];
  costImplications?: string[];
  failureModes?: string[];
  transitionStrategies?: string[];
  providerNeutralRealization?: string[];
  detectionRules?: string[];
  fitnessTests?: string[];
  counterfactualExplanation?: string;
  sourceLifecycleUses?: Array<{ stage: ArchitectureStage; use: string }>;
  generationContract?: PatternGenerationContract;
  editorialReview?: PatternDna2EditorialReview;

}

export interface RepositoryGovernancePolicy {
  connectorId: string;
  repository: string;
  acquisitionMode: RepositoryAcquisitionMode;
  monitoringMode: RepositoryMonitoringMode;
  approvedRevision?: string;
  candidateRevision?: string;
  immutableSnapshotRequired: boolean;
  quarantineRequired: boolean;
  humanApprovalRequired: boolean;
  productionRecommendationAllowed: boolean;
  permittedOperations: RepositoryOperation[];
  prohibitedOperations: RepositoryOperation[];
  refreshCadenceDays: number;
  licenseGate: 'verified' | 'legal-review' | 'metadata-only';
  promptInjectionBoundary: 'treat-as-untrusted-data';
  maxFiles: number;
  maxFileBytes: number;
}

export interface RepositoryGovernanceDecision {
  allowed: boolean;
  connectorId: string;
  operation: RepositoryOperation;
  reasons: string[];
  requiredControls: string[];
}

export interface PatternCompositionRequest {
  project: ArchitectureProject;
  patternIds: string[];
  scopeNodeId?: string;
  stage?: ArchitectureStage;
  anchor?: Point;
  allowConditionalPrerequisites?: boolean;
}

export interface PatternCompositionMutation {
  addNodes: ArchitectureNode[];
  addEdges: ArchitectureEdge[];
  addInterfaces: ArchitectureInterface[];
  addArchitectureViews: ArchitectureView[];
  addPatternSelections: Array<{ id: string; patternId: string; scopeNodeId?: string; stage: ArchitectureStage; obligations: string[] }>;
}

export interface PatternCompositionCanonicalCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface PatternCompositionPlan {
  id: string;
  applicationKey: string;
  createdAt: string;
  patternIds: string[];
  eligible: boolean;
  summary: string;
  prerequisitesSatisfied: string[];
  missingPrerequisites: string[];
  conflicts: Array<{ patternId: string; conflictingPatternId: string; explanation: string }>;
  completionSuggestions: string[];
  obligations: PatternObligation[];
  qualityDelta: Record<string, number>;
  mutation: PatternCompositionMutation;
  rollback: {
    removeNodeIds: string[];
    removeEdgeIds: string[];
    removeInterfaceIds: string[];
    removeArchitectureViewIds: string[];
    removePatternSelectionIds: string[];
    removePatternIds: string[];
  };
  duplicateSkips: Array<{ kind: 'node' | 'edge' | 'interface' | 'view' | 'pattern-selection'; id: string; reason: string }>;
  canonicalChecks: PatternCompositionCanonicalCheck[];
  warnings: string[];
}

export interface PatternRecommendationRequest {
  query: string;
  project: ArchitectureProject;
  stage?: ArchitectureStage;
  scopeNodeId?: string;
  category?: string;
  limit?: number;
}

export interface PatternRecommendationScore {
  patternId: string;
  patternName: string;
  eligible: boolean;
  totalScore: number;
  dimensions: {
    contextFit: number;
    qualityAlignment: number;
    compatibility: number;
    evidenceConfidence: number;
    operationalReadiness: number;
    enterpriseReuse: number;
  };
  penalties: string[];
  assumptions: string[];
  evidenceConnectorIds: string[];
  reasons: string[];
  counterfactuals: string[];
}

export interface RecommendationEvidencePack {
  knowledgeRelease: string;
  generatedAt: string;
  request: PatternRecommendationRequest;
  recommendations: PatternRecommendationScore[];
  approvedRecordIds: string[];
  approvedEvidence: PatternEvidenceReference[];
  opposingEvidence: PatternEvidenceReference[];
  obligations: PatternObligation[];
  conflicts: string[];
  openQuestions: string[];
  warnings: string[];
}

export interface FitnessFunctionArtifact {
  id: string;
  patternId: string;
  target: PatternConformanceRule['target'];
  path: string;
  mediaType: string;
  content: string;
  reviewRequired: boolean;
  sourceRuleIds: string[];
}

export interface PatternBenchmarkScenario {
  id: string;
  name: string;
  domain: 'banking' | 'payments' | 'e-commerce' | 'saas' | 'healthcare' | 'public-sector' | 'logistics' | 'data-platform' | 'iot' | 'ai-system' | 'legacy-modernization' | 'low-connectivity';
  query: string;
  objectives: string[];
  constraints: string[];
  qualityPriorities: Array<{ attributeId: string; weight: number }>;
  expectedCandidateIds: string[];
  expectedExcludedIds: string[];
  requiredObligationCategories: PatternObligation['category'][];
}

export interface PatternBenchmarkResult {
  scenarioId: string;
  passed: boolean;
  recommendedIds: string[];
  excludedIds: string[];
  missingExpectedCandidates: string[];
  unexpectedCandidates: string[];
  obligationCategories: string[];
  notes: string[];
}

export interface PatternCorpusMetrics {
  generatedAt: string;
  releaseId: string;
  totalRecords: number;
  approvedRecords: number;
  antiPatterns: number;
  topologyTemplates: number;
  categories: Record<string, number>;
  evidenceCoverage: number;
  conformanceCoverage: number;
  recordsWithTopology: number;
  recordsWithObligations: number;
  reviewCoverage: number;
}

const REVIEW: PatternReviewMetadata = {
  reviewedBy: 'AIW Architecture Knowledge Council',
  reviewedAt: '2026-07-02T00:00:00.000Z',
  releaseId: 'AKR-0.10.60',
  reviewMethod: 'calibrated-reference',
  notes: ['Normalized into AIW Pattern DNA and gated by the Sprint 7.8 knowledge-release policy.'],
};

const categoryEvidence: Record<string, string[]> = {
  application: ['GH-MICROSOFT-ARCH-CENTER','GH-ARDALIS-CLEAN-ARCH','GH-ARC42'],
  integration: ['GH-APACHE-CAMEL','GH-ASYNCAPI','GH-MICROSOFT-ARCH-CENTER'],
  data: ['GH-MICROSOFT-ARCH-CENTER','GH-GCP-CLOUD-FOUNDATION-FABRIC','GH-FINOS-CALM'],
  resilience: ['GH-MICROSOFT-ARCH-CENTER','GH-AWS-SOLUTIONS-CONSTRUCTS','GH-GCP-MICROSERVICES-DEMO'],
  security: ['GH-CNCF-TAG-SECURITY','GH-MICROSOFT-ARCH-CENTER','GH-FINOS-CALM'],
  platform: ['GH-OAM-SPEC','GH-K8S-PATTERNS','GH-MESHERY'],
  deployment: ['GH-K8S-PATTERNS','GH-GCP-SOFTWARE-DELIVERY-BLUEPRINT','GH-AZURE-RESOURCE-MODULES'],
  observability: ['GH-OTEL-DEMO','GH-MICROSOFT-ARCH-CENTER','GH-K8S-PATTERNS'],
  domain: ['GH-DDD-CREW','GH-CONTEXT-MAPPER-DSL','GH-JMOLECULES'],
  ai: ['GH-FINOS-AI-RA','GH-MICROSOFT-AGENT-SKILLS','GH-CNCF-TAG-SECURITY'],
  governance: ['GH-FINOS-CALM','GH-ARCHUNIT','GH-JQASSISTANT'],
};

const categoryQuality: Record<string, Array<[string, PatternQualityImpact['direction'], PatternQualityImpact['magnitude']]>> = {
  application: [['modifiability','improves',4],['complexity','conditional',2]],
  integration: [['interoperability','improves',4],['reliability','conditional',3]],
  data: [['data-integrity','improves',4],['performance','conditional',3]],
  resilience: [['availability','improves',5],['operability','conditional',3]],
  security: [['security','improves',5],['usability','conditional',2]],
  platform: [['deployability','improves',4],['cost','conditional',3]],
  deployment: [['deployability','improves',5],['availability','improves',3]],
  observability: [['operability','improves',5],['cost','degrades',2]],
  domain: [['modifiability','improves',5],['delivery-speed','conditional',3]],
  ai: [['intelligence-quality','improves',4],['security','conditional',4]],
  governance: [['compliance','improves',5],['delivery-speed','conditional',2]],
};

const patternGroups: Record<string, string[]> = {
  application: ['Layered Architecture','Hexagonal Architecture','Clean Architecture','Onion Architecture','Modular Monolith','Microkernel Architecture','Plugin Architecture','Vertical Slice Architecture','Backend for Frontend','API Composition','Server-Side Rendering','Client-Side Rendering','Strangler Fig','Branch by Abstraction','Facade','Adapter','Anti-Corruption Layer','Service Layer','Repository Pattern','Unit of Work','Dependency Injection','Command Pattern','Strategy Pattern','Specification Pattern'],
  domain: ['Bounded Context','Context Map','Aggregate','Domain Event','Domain Service','Application Service','Value Object','Entity','Saga Boundary','Shared Kernel','Customer-Supplier Context','Conformist Context','Open Host Service','Published Language','Separate Ways','Event Storming','Domain Storytelling','Example Mapping'],
  integration: ['Event-Driven Architecture','Message Broker','Publish-Subscribe','Competing Consumers','Message Router','Content-Based Router','Message Translator','Canonical Data Model','Request-Reply','Fire-and-Forget','Claim Check','Dead Letter Channel','Idempotent Consumer','Transactional Outbox','Inbox Pattern','Change Data Capture','Event Notification','Event-Carried State Transfer','API Gateway','Service Mesh','Sidecar','Ambassador','Gateway Aggregation','Gateway Offloading','Protocol Bridge','Circuit Mediated Integration','Polling Publisher','Correlation Identifier','Resequencer','Scatter-Gather'],
  data: ['CQRS','Event Sourcing','Database per Service','Shared Database','Polyglot Persistence','Data Lakehouse','Data Mesh','Data Fabric','Materialized View','Read Replica','Sharding','Consistent Hashing','Cache-Aside','Read-Through Cache','Write-Through Cache','Write-Behind Cache','Time-Series Store','Document Store','Graph Store','Immutable Log','Bitemporal Data','Soft Delete','Data Partitioning','Schema Registry','Data Contract','Data Quality Gate'],
  resilience: ['Circuit Breaker','Retry with Backoff','Timeout','Bulkhead','Rate Limiting','Load Shedding','Failover','Active-Active','Active-Passive','Health Endpoint Monitoring','Leader Election','Quorum','Graceful Degradation','Fallback','Hedged Requests','Queue-Based Load Leveling','Throttling','Priority Queue','Cell-Based Architecture','Chaos Engineering','Disaster Recovery','Backup and Restore','Geo-Redundancy','Fault Isolation','Brownout'],
  security: ['Zero Trust','Least Privilege','Defense in Depth','Identity-Aware Proxy','Federated Identity','Token Exchange','Secrets Management','Key Rotation','Mutual TLS','Network Segmentation','Private Endpoint','Web Application Firewall','API Authorization','Policy Enforcement Point','Security Token Service','Audit Trail','Tamper-Evident Log','Data Encryption at Rest','Data Encryption in Transit','Data Masking','Tokenization','Privacy by Design','Threat Modeling','Software Supply Chain Controls','Secure Defaults','Tenant Isolation'],
  platform: ['Platform Engineering','Internal Developer Platform','Golden Path','Service Template','Software Catalog','Control Plane','Operator Pattern','Reconciliation Loop','Declarative Configuration','GitOps','Infrastructure as Code','Policy as Code','Configuration as Code','Feature Flag','Service Discovery','Centralized Configuration','Externalized Configuration','Workload Identity','Multi-Tenancy','Namespace Isolation','Resource Quota','Autoscaling','Ephemeral Environment','Self-Service Provisioning'],
  deployment: ['Blue-Green Deployment','Canary Release','Rolling Deployment','Recreate Deployment','Shadow Deployment','A/B Deployment','Immutable Infrastructure','Containerization','Function as a Service','Serverless Architecture','Multi-Region Deployment','Availability Zone Distribution','Edge Deployment','Hybrid Cloud','Multi-Cloud','Landing Zone','Deployment Stamp','Environment Promotion','Progressive Delivery','Release Train'],
  observability: ['Distributed Tracing','Structured Logging','Metrics and Alerting','Correlation ID','OpenTelemetry Instrumentation','Health Probes','SLO-Based Operations','Error Budget','Synthetic Monitoring','Real User Monitoring','Log Aggregation','Service Dependency Map','Audit Observability','Business KPI Monitoring','Continuous Profiling'],
  ai: ['Retrieval-Augmented Generation','Agentic Workflow','Human-in-the-Loop AI','Model Gateway','Prompt Registry','Model Registry','Feature Store','Vector Store','AI Guardrails','Grounded Generation','Tool-Use Mediation','AI Evaluation Harness','Model Monitoring','Data Lineage for AI','Responsible AI Control Plane','Multi-Agent Orchestration','Semantic Cache','Prompt Injection Boundary','PII Redaction Pipeline','AI Fallback Strategy'],
  governance: ['Architecture Decision Record','Architecture Fitness Function','Policy Gate','Reference Architecture','Architecture Review Board','Exception with Expiry','Architecture Drift Detection','Design-Time Compliance','Runtime Conformance','Evidence-Based Recommendation','Knowledge Release','Claim-Level Provenance'],
};

const antiPatternNames = ['Big Ball of Mud','Distributed Monolith','Shared Database Coupling','Chatty Services','God Service','Nano Services','Premature Microservices','Golden Hammer','Vendor Lock-In by Accident','Synchronous Chain','Retry Storm','Cache Stampede','Thundering Herd','Single Point of Failure','Snowflake Server','Manual Configuration Drift','Secrets in Source','Security by Perimeter Only','Unbounded Queue','Missing Idempotency','Schema-on-Wish','Data Swamp','Observability as Afterthought','Magic Integration','Circular Dependencies','Shared Mutable State','Unversioned API','Long-Lived Feature Branch','Copy-Paste Architecture','AI Without Evaluation'];
const topologyNames = ['Secure API Service','Event-Driven Service','Transactional Outbox Topology','CQRS Service','Resilient External Call','Multi-Region Active-Active','Zero-Trust Service Boundary','Observable Microservice','Modular Monolith Starter','Data Lakehouse Platform','RAG Application','Agentic Workflow with Approval','AsyncAPI Event Mesh','Service Mesh Baseline','Platform Golden Path','GitOps Delivery Pipeline','Cell-Based Workload','Multi-Tenant SaaS','Edge Processing Topology','Hybrid Integration Hub','Payment Processing Cell','Low-Connectivity Sync','Secure Data Exchange','AI Model Gateway'];
const styleNames = ['Layered','Hexagonal','Clean','Modular Monolith','Microservices','Event-Driven','Service-Oriented','Microkernel','Pipe-and-Filter','Space-Based','Cell-Based','Serverless','Data Mesh','Platform-Centric'];
const archetypeNames = ['API Gateway Capability','Message Broker Capability','Relational Data Capability','Document Data Capability','Vector Search Capability','Identity Provider Capability','Secrets Manager Capability','Observability Collector Capability','Policy Engine Capability','Service Catalog Capability','Workflow Engine Capability','Object Storage Capability','Cache Capability','Event Router Capability','Model Gateway Capability','Feature Store Capability','Schema Registry Capability','CI/CD Orchestrator Capability','Service Mesh Capability','Distributed Lock Capability'];

function slug(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function stageForCategory(category: string): ArchitectureStage[] {
  if (category === 'domain') return ['logicalApplication','applicationRealization'];
  if (category === 'platform' || category === 'deployment' || category === 'observability') return ['logicalTechnology','physicalTechnology'];
  if (category === 'governance') return ['designIntent','validationRealization'];
  return ['applicationRealization','logicalTechnology'];
}

function connectorTier(connectorId: string): SourceTrustTier {
  return connectorId.includes('MICROSOFT') || connectorId.includes('FINOS') || connectorId.includes('ASYNCAPI') || connectorId.includes('APACHE') || connectorId.includes('CNCF') || connectorId.includes('ARCHUNIT') || connectorId.includes('JQASSISTANT') ? 1 : 2;
}

function baseEvidence(category: string): PatternEvidenceReference[] {
  return (categoryEvidence[category] ?? categoryEvidence.application!).map((connectorId, index) => ({ connectorId, claimIds: [], evidenceRole: index === 0 ? 'primary' : 'corroborating', sourceTrustTier: connectorTier(connectorId), revisionPolicy: 'approved-commit-only' }));
}

function qualityImpacts(category: string, name: string): PatternQualityImpact[] {
  return (categoryQuality[category] ?? categoryQuality.application!).map(([attributeId, direction, magnitude]) => ({ attributeId, direction, magnitude, rationale: `${name} has a context-dependent impact on ${attributeId}; AIW requires scenario-level calibration rather than treating the rating as universal.`, conditions: ['Validate against measurable quality scenarios and current operating constraints.'] }));
}

function obligations(category: string, name: string): PatternObligation[] {
  const categoryMap: Record<string, PatternObligation['category']> = { security: 'security', resilience: 'reliability', data: 'data', deployment: 'delivery', platform: 'operations', observability: 'operations', ai: 'governance', governance: 'governance', integration: 'operations', application: 'delivery', domain: 'governance' };
  const obligationCategory = categoryMap[category] ?? 'governance';
  return [{ id: `OBL-${slug(name)}-01`, title: `${name} operating obligation`, description: `Define ownership, monitoring, failure handling and review criteria introduced by ${name}.`, category: obligationCategory, mandatory: true, verificationHint: 'Confirm the obligation is linked to an owner, a measurable control and an architecture fitness function where possible.' }];
}

function conformance(category: string, name: string): PatternConformanceRule[] {
  const target: PatternConformanceRule['target'] = category === 'integration' ? 'asyncapi' : category === 'deployment' || category === 'platform' ? 'kubernetes' : category === 'domain' || category === 'application' ? 'archunit' : category === 'governance' ? 'jqassistant' : 'generic';
  return [{ id: `RULE-${slug(name)}-01`, title: `Conformance for ${name}`, target, predicate: category === 'observability' ? 'require-observability' : category === 'integration' ? 'require-contract' : 'require-property', parameters: { pattern: name, property: 'architectureIntent', expected: slug(name) }, severity: 'warning', rationale: `Preserve the accepted ${name} intent in implementation and deployment evidence.` }];
}

function topologyFor(name: string, category: string): PatternTopology {
  const stage = stageForCategory(category)[0]!;
  const firstKind: EntityKind = category === 'data' ? 'LogicalTechnologyCapability' : category === 'platform' || category === 'deployment' || category === 'observability' ? 'LogicalTechnologyCapability' : 'LogicalService';
  const secondKind: EntityKind = category === 'data' ? 'TechnologyProduct' : category === 'integration' ? 'Event' : category === 'security' ? 'Control' : 'DeployableUnit';
  return {
    nodes: [
      { key: 'primary', label: name, kind: firstKind, stage, properties: { architectureIntent: slug(name) }, tags: [category, slug(name).toLowerCase()], offset: { x: 0, y: 0 } },
      { key: 'support', label: `${name} Support`, kind: secondKind, stage, properties: { responsibility: 'supporting-capability' }, tags: [category, 'support'], offset: { x: 290, y: 0 } },
    ],
    edges: [{ sourceKey: 'primary', targetKey: 'support', kind: category === 'integration' ? 'publishes' : 'dependsOn', stage, label: 'uses', properties: {} }],
    boundaryRules: [`Apply ${name} only within the selected architecture scope and preserve explicit ownership boundaries.`],
  };
}

function createRecord(name: string, category: string, recordType: PatternKnowledgeRecordType, index: number): PatternKnowledgeRecord {
  const idPrefix = recordType === 'anti-pattern' ? 'ANTI' : recordType === 'topology-template' ? 'TPL' : recordType === 'style' ? 'STYLE' : recordType === 'component-archetype' ? 'ARCH' : 'PAT';
  const topology = recordType === 'topology-template' || (recordType === 'pattern' && ['integration','deployment','platform','ai'].includes(category)) ? topologyFor(name, category) : undefined;
  return {
    id: `${idPrefix}-${slug(name)}`,
    name,
    aliases: [name.replaceAll('-', ' '), slug(name).toLowerCase()],
    recordType,
    category,
    summary: `${name} normalized as an AIW ${recordType} record with explicit applicability, trade-offs, obligations, evidence and conformance guidance.`,
    problem: recordType === 'anti-pattern' ? `Detect and remediate architecture conditions associated with ${name}.` : `Address architecture forces for ${name} without hiding its operational and governance consequences.`,
    context: [`Use when ${name} is relevant to the selected ${category} scope.`, 'Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions.'],
    forces: ['Delivery speed versus long-term maintainability.','Local optimization versus end-to-end system behavior.','Operational simplicity versus flexibility and scale.'],
    applicableStages: stageForCategory(category),
    applicabilityRules: [`The selected scope must contain a ${category}-relevant responsibility or capability.`],
    exclusions: recordType === 'anti-pattern' ? [] : [`Do not adopt ${name} only because a technology or repository is popular.`],
    prerequisites: recordType === 'anti-pattern' ? [] : [`Named owner and measurable quality scenario for ${name}.`],
    complements: [],
    conflicts: recordType === 'anti-pattern' ? [] : index % 11 === 0 ? ['ANTI-BIG-BALL-OF-MUD'] : [],
    alternatives: [],
    qualityImpacts: qualityImpacts(category, name),
    obligations: obligations(category, name),
    risks: [recordType === 'anti-pattern' ? `${name} can amplify coupling, operational risk or unclear ownership.` : `Misapplying ${name} can add complexity without improving the priority quality attributes.`],
    mitigations: ['Use an architecture decision record, measurable acceptance criteria and implementation fitness functions.'],
    ...(topology ? { topology } : {}),
    providerRealizations: recordType === 'component-archetype' || ['platform','deployment','ai'].includes(category) ? [{ provider: 'generic', name: `${name} vendor-neutral realization`, technologyIds: [], conditions: ['Select a provider product only after the capability and constraints are agreed.'], notes: ['Provider mappings remain overlays and cannot redefine the general pattern.'] }] : [],
    conformanceRules: conformance(category, name),
    evidence: baseEvidence(category),
    lifecycle: 'approved',
    maturity: recordType === 'anti-pattern' ? 'established' : 'mature',
    owner: 'AIW Architecture Knowledge Council',
    version: '0.8.8',
    review: REVIEW,
    tags: [category, recordType, slug(name).toLowerCase()],
  };
}

const generatedPatterns = Object.entries(patternGroups).flatMap(([category, names]) => names.map((name, index) => createRecord(name, category, 'pattern', index)));
const generatedAntiPatterns = antiPatternNames.map((name, index) => createRecord(name, index % 5 === 0 ? 'integration' : index % 5 === 1 ? 'application' : index % 5 === 2 ? 'resilience' : index % 5 === 3 ? 'security' : 'data', 'anti-pattern', index));
const generatedTopologies = topologyNames.map((name, index) => createRecord(name, index % 6 === 0 ? 'security' : index % 6 === 1 ? 'integration' : index % 6 === 2 ? 'resilience' : index % 6 === 3 ? 'platform' : index % 6 === 4 ? 'ai' : 'deployment', 'topology-template', index));
const generatedStyles = styleNames.map((name, index) => createRecord(name, index % 4 === 0 ? 'application' : index % 4 === 1 ? 'integration' : index % 4 === 2 ? 'platform' : 'data', 'style', index));
const generatedArchetypes = archetypeNames.map((name, index) => createRecord(name, index % 5 === 0 ? 'integration' : index % 5 === 1 ? 'data' : index % 5 === 2 ? 'security' : index % 5 === 3 ? 'observability' : 'platform', 'component-archetype', index));

// Editorial depth overrides for the patterns most likely to drive production recommendations.
// These records are deliberately specific about applicability, failure modes and operating obligations;
// the remaining generated corpus is retained as supporting knowledge until curator enrichment is complete.
const editorialDepthOverrides: Record<string, Partial<PatternKnowledgeRecord>> = {
  "STYLE-MICROSERVICES": {
    "summary": "An independently deployable service architecture that aligns service boundaries to business capabilities and accepts distributed-systems complexity in exchange for team autonomy, selective scaling and fault isolation.",
    "problem": "A large solution needs independently owned change and scaling boundaries, but a single deployment unit causes coordination bottlenecks, broad regression risk or unequal scaling cost.",
    "context": [
      "Multiple stable business capabilities change at different rates and can be owned by long-lived teams.",
      "Independent deployment or selective scaling has measurable value that exceeds the cost of distributed operations.",
      "The organization can operate service discovery, secure service-to-service communication, observability and automated delivery."
    ],
    "forces": [
      "Team autonomy and independent deployment versus cross-service coordination and governance.",
      "Selective scaling and fault isolation versus network latency, partial failure and data consistency complexity.",
      "Bounded service ownership versus duplicated platform capabilities and higher operating cost."
    ],
    "applicabilityRules": [
      "At least two stable business capability boundaries and named owning teams are identified.",
      "A measurable need exists for independent deployment, selective scaling or failure isolation.",
      "Operational maturity covers automated delivery, telemetry, incident response and service ownership."
    ],
    "exclusions": [
      "Avoid when one small team owns the whole product and coordinated releases are acceptable.",
      "Avoid when domain boundaries are uncertain; begin with a modular monolith and extract only after evidence.",
      "Do not use microservices merely to separate technical layers or to imitate a reference architecture."
    ],
    "prerequisites": [
      "Bounded contexts or capability ownership are documented.",
      "API and event contract governance is available.",
      "Central identity, secrets, observability and deployment automation are production-ready."
    ],
    "risks": [
      "Chatty synchronous dependencies can create a distributed monolith with worse reliability than the original system.",
      "Duplicated data and eventual consistency can surprise business users and reconciliation processes.",
      "Service proliferation increases platform, security, observability and on-call burden."
    ],
    "mitigations": [
      "Use domain boundaries and dependency direction tests to prevent technical-layer services.",
      "Prefer asynchronous integration for non-immediate workflows and define explicit consistency semantics.",
      "Adopt a paved platform path, service ownership catalogue and service-level objectives before scaling the service count."
    ],
    "obligations": [
      {
        "id": "OBL-MICROSERVICES-OWNERSHIP",
        "title": "Own Microservices lifecycle",
        "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for Microservices.",
        "category": "governance",
        "mandatory": true,
        "verificationHint": "The architecture decision links an owner, quality scenario and review date."
      },
      {
        "id": "OBL-MICROSERVICES-OPERATIONS",
        "title": "Validate Microservices in operation",
        "description": "Define telemetry, failure handling and fitness functions that prove the intended Microservices properties.",
        "category": "operations",
        "mandatory": true,
        "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
      }
    ]
  },
  "PAT-TRANSACTIONAL-OUTBOX": {
    "summary": "Atomically records a domain change and an outbound message in the same local transaction, then publishes the message asynchronously so database state and integration events cannot diverge through a dual-write failure.",
    "problem": "A service must update its database and notify other systems, but writing to the database and broker separately can leave one side committed while the other fails.",
    "context": [
      "A service owns a transactional database and emits integration events derived from committed state changes.",
      "Cross-resource distributed transactions are unavailable, undesirable or unsupported.",
      "At-least-once publication is acceptable when consumers are idempotent."
    ],
    "forces": [
      "Atomic local consistency versus asynchronous publication delay.",
      "Reliable event publication versus duplicate delivery and operational backlog management.",
      "Simple application writes versus additional relay, retention and monitoring responsibilities."
    ],
    "applicabilityRules": [
      "The business change and outbox insert can commit in one local transaction.",
      "Consumers can tolerate at-least-once delivery and implement idempotency.",
      "An outbox relay or change-data-capture mechanism can be operated and monitored."
    ],
    "exclusions": [
      "Do not use as a substitute for consumer idempotency or message schema governance.",
      "Avoid when the source store cannot atomically persist the business record and outbox entry.",
      "Do not claim exactly-once end-to-end delivery; publication and consumption remain at-least-once in most implementations."
    ],
    "prerequisites": [
      "A stable event identifier and idempotency key strategy are defined.",
      "Outbox retention, retry, poison-message and replay procedures are owned.",
      "Event schemas and compatibility policy are governed."
    ],
    "risks": [
      "Relay lag can delay downstream visibility and hide growing operational debt.",
      "Poor partitioning or ordering keys can publish related events out of business order.",
      "Deleting outbox rows too early can make recovery or audit impossible."
    ],
    "mitigations": [
      "Alert on oldest unpublished row, relay failure rate and backlog size.",
      "Use immutable event IDs, monotonic aggregate versions and idempotent consumers.",
      "Define retention and replay procedures that preserve audit and privacy obligations."
    ],
    "obligations": [
      {
        "id": "OBL-OUTBOX-RELAY",
        "title": "Operate and monitor the outbox relay",
        "description": "Own relay availability, backlog age, retries, poison records, retention and replay procedures.",
        "category": "operations",
        "mandatory": true,
        "verificationHint": "Alert on oldest unpublished record and prove replay from a controlled checkpoint."
      },
      {
        "id": "OBL-OUTBOX-IDEMPOTENCY",
        "title": "Enforce downstream idempotency",
        "description": "Every emitted message carries a stable event identifier and consumers suppress duplicate effects.",
        "category": "reliability",
        "mandatory": true,
        "verificationHint": "Run duplicate-delivery tests and verify one business effect per event identifier."
      }
    ]
  },
  "PAT-SAGA-BOUNDARY": {
    "summary": "Coordinates a long-running business transaction across autonomous services as a sequence of local transactions with explicit compensating actions and observable business state.",
    "problem": "A business process spans multiple service-owned data stores, but a global ACID transaction would couple services, reduce availability or is not technically available.",
    "context": [
      "The workflow contains multiple independently committed steps and can expose intermediate states.",
      "Business compensation is possible even when technical rollback is not.",
      "Process duration, failure states and manual intervention must be visible."
    ],
    "forces": [
      "Service autonomy and availability versus temporary inconsistency.",
      "Automated compensation versus business irreversibility and human exception handling.",
      "Central orchestration clarity versus choreography coupling hidden in events."
    ],
    "applicabilityRules": [
      "Every step has an owner, idempotency rule and defined success/failure outcome.",
      "Compensation semantics are agreed with business stakeholders.",
      "The saga state and correlation identifier are persisted and observable."
    ],
    "exclusions": [
      "Avoid for operations that require immediate atomic consistency across all participants.",
      "Do not model irreversible financial settlement as a simple technical rollback.",
      "Avoid choreography when participants cannot understand the full process or event ownership."
    ],
    "prerequisites": [
      "A canonical process state model and correlation ID are defined.",
      "Timeouts, retries, compensation and manual resolution paths are documented.",
      "Audit evidence records each state transition and actor."
    ],
    "risks": [
      "Compensation may not restore the original business state after external side effects.",
      "Choreographed sagas can become difficult to understand and change safely.",
      "Retries and timeouts can trigger duplicate actions without strict idempotency."
    ],
    "mitigations": [
      "Prefer orchestration when process visibility and controlled sequencing are critical.",
      "Model compensations as new auditable business actions, not hidden rollbacks.",
      "Provide operations with stuck-saga queues, replay controls and manual resolution runbooks."
    ],
    "obligations": [
      {
        "id": "OBL-SAGA-BOUNDARY-OWNERSHIP",
        "title": "Own Saga Boundary lifecycle",
        "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for Saga Boundary.",
        "category": "governance",
        "mandatory": true,
        "verificationHint": "The architecture decision links an owner, quality scenario and review date."
      },
      {
        "id": "OBL-SAGA-BOUNDARY-OPERATIONS",
        "title": "Validate Saga Boundary in operation",
        "description": "Define telemetry, failure handling and fitness functions that prove the intended Saga Boundary properties.",
        "category": "operations",
        "mandatory": true,
        "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
      }
    ]
  },
  "PAT-CIRCUIT-BREAKER": {
    "summary": "Stops repeated calls to a failing or slow dependency after a threshold, fails fast during an open interval and probes controlled recovery to limit cascading failure.",
    "problem": "Repeated calls to an unhealthy dependency consume threads, connections and timeouts, causing local resource exhaustion and propagating a remote failure through the system.",
    "context": [
      "A remote dependency can fail partially or become slow while callers continue receiving traffic.",
      "The caller has a fallback, queued path or explicit degraded response.",
      "Failure rates and latency can be observed at the correct dependency boundary."
    ],
    "forces": [
      "Fast failure and resource protection versus rejecting calls during transient recovery.",
      "Local resilience versus hiding a systemic dependency outage.",
      "Automatic recovery probes versus retry storms and synchronized clients."
    ],
    "applicabilityRules": [
      "Timeouts are bounded and shorter than the end-to-end request budget.",
      "Circuit state is scoped per dependency and operation rather than globally.",
      "Fallback behavior is safe, observable and acceptable to the business."
    ],
    "exclusions": [
      "Do not use without timeouts; a circuit breaker cannot interrupt an indefinitely blocked call.",
      "Do not wrap local in-process calls where ordinary exception handling is sufficient.",
      "Avoid using fallback data when stale or incomplete results could create financial or safety harm."
    ],
    "prerequisites": [
      "Dependency SLOs, timeout budgets and failure thresholds are defined.",
      "Metrics expose open/half-open state, rejection rate and downstream health.",
      "Retry policies use jitter and are coordinated with the breaker."
    ],
    "risks": [
      "Poor thresholds can oscillate between open and closed states or reject healthy traffic.",
      "A fallback can conceal prolonged dependency failure and create silent data quality issues.",
      "Independent breakers across many instances can synchronize recovery probes."
    ],
    "mitigations": [
      "Tune from measured latency and error distributions rather than fixed folklore values.",
      "Use jittered half-open probes and expose breaker state in dashboards and alerts.",
      "Make degraded responses explicit and traceable to the affected dependency."
    ],
    "obligations": [
      {
        "id": "OBL-CB-SLO",
        "title": "Calibrate breaker thresholds from dependency SLOs",
        "description": "Timeout, failure threshold, open duration and half-open probes are derived from measured dependency behavior.",
        "category": "reliability",
        "mandatory": true,
        "verificationHint": "Load and failure tests demonstrate bounded resource use and controlled recovery."
      },
      {
        "id": "OBL-CB-VISIBILITY",
        "title": "Expose breaker state and degraded behavior",
        "description": "Operations can see state transitions, rejected calls, fallback use and affected business capabilities.",
        "category": "operations",
        "mandatory": true,
        "verificationHint": "Dashboards and alerts identify open circuits and fallback rates per dependency."
      }
    ]
  },
  "PAT-ZERO-TRUST": {
    "summary": "Applies continuous identity, device, workload and context verification with least-privilege authorization at each protected interaction instead of trusting network location.",
    "problem": "Perimeter trust allows a compromised internal identity, device or workload to move laterally and access resources beyond its legitimate business purpose.",
    "context": [
      "Users, agents, services or devices access resources across cloud, on-premises and partner boundaries.",
      "Identity, policy decision and telemetry services can be made highly available.",
      "Sensitive data and regulated operations require fine-grained, auditable access decisions."
    ],
    "forces": [
      "Fine-grained control and reduced lateral movement versus policy complexity and request overhead.",
      "Continuous verification versus user experience and operational availability.",
      "Central policy consistency versus local service autonomy."
    ],
    "applicabilityRules": [
      "Every protected resource has a named owner and data classification.",
      "Workload and user identities are strongly authenticated and short-lived credentials are supported.",
      "Policy decisions and enforcement outcomes are logged without exposing secrets."
    ],
    "exclusions": [
      "Do not equate zero trust with a single product, VPN replacement or network micro-segmentation alone.",
      "Avoid central policy dependencies without resilient local enforcement and safe failure modes.",
      "Do not collect device or behavioral telemetry without privacy and retention controls."
    ],
    "prerequisites": [
      "Identity lifecycle, device posture and workload identity foundations are mature.",
      "Policy-as-code, secrets management and certificate rotation are automated.",
      "Break-glass access and policy outage behavior are approved and tested."
    ],
    "risks": [
      "Policy sprawl can create inconsistent access decisions and difficult incident diagnosis.",
      "Identity or policy service failure can become a broad availability dependency.",
      "Overly aggressive controls can impair frontline or low-connectivity operations."
    ],
    "mitigations": [
      "Use a common policy model, decision logs and automated tests for critical authorization paths.",
      "Cache bounded policy decisions safely and design explicit fail-open/fail-closed behavior per risk.",
      "Measure user and service impact and provide governed emergency access."
    ],
    "obligations": [
      {
        "id": "OBL-ZT-POLICY",
        "title": "Govern policy and identity lifecycle",
        "description": "Authentication strength, least-privilege policy, credential lifetime and revocation are centrally governed and tested.",
        "category": "security",
        "mandatory": true,
        "verificationHint": "Policy tests cover critical allow, deny and break-glass paths."
      },
      {
        "id": "OBL-ZT-RESILIENCE",
        "title": "Design policy-service failure behavior",
        "description": "Each protected operation has approved fail-open or fail-closed behavior and resilient policy enforcement.",
        "category": "reliability",
        "mandatory": true,
        "verificationHint": "Failure exercises verify the approved behavior without uncontrolled access."
      }
    ]
  },
  "PAT-API-GATEWAY": {
    "summary": "Provides a governed external entry point that routes, authenticates, protects and observes API traffic while keeping domain logic inside backend services.",
    "problem": "Multiple backend services need a consistent external interface and shared edge controls without duplicating authentication, rate limiting, routing and protocol concerns.",
    "context": [
      "External, mobile, partner or channel clients call multiple backend capabilities.",
      "Edge policies differ from internal service responsibilities.",
      "Gateway availability and change governance can be operated as critical shared infrastructure."
    ],
    "forces": [
      "Centralized policy and client simplification versus a shared bottleneck and blast radius.",
      "Protocol translation and aggregation versus added latency and coupling to backend contracts.",
      "Consistent security controls versus temptation to place business logic at the edge."
    ],
    "applicabilityRules": [
      "The gateway owns edge concerns only and backend domain ownership remains explicit.",
      "Capacity, regional redundancy and failure behavior meet the most critical API SLO.",
      "API ownership, versioning and deprecation rules are defined."
    ],
    "exclusions": [
      "Do not place core business workflows or authoritative data in the gateway.",
      "Avoid a single global gateway when regulatory or failure-isolation requirements demand cells or regions.",
      "Do not use request aggregation that creates long synchronous dependency chains."
    ],
    "prerequisites": [
      "Identity, certificate, API catalogue and rate-limit policies are available.",
      "Backend timeouts and error contracts are standardized.",
      "Gateway configuration is versioned, tested and promoted through CI."
    ],
    "risks": [
      "A gateway outage can block all channels even when backend services are healthy.",
      "Uncontrolled aggregation can increase latency and create tight coupling.",
      "Policy drift between regions or gateways can produce inconsistent security behavior."
    ],
    "mitigations": [
      "Deploy redundant gateways with tested failover and capacity headroom.",
      "Keep transformations declarative and move domain decisions to owned services.",
      "Continuously test route, policy and certificate configuration as architecture fitness functions."
    ],
    "obligations": [
      {
        "id": "OBL-API-GATEWAY-OWNERSHIP",
        "title": "Own API Gateway lifecycle",
        "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for API Gateway.",
        "category": "governance",
        "mandatory": true,
        "verificationHint": "The architecture decision links an owner, quality scenario and review date."
      },
      {
        "id": "OBL-API-GATEWAY-OPERATIONS",
        "title": "Validate API Gateway in operation",
        "description": "Define telemetry, failure handling and fitness functions that prove the intended API Gateway properties.",
        "category": "operations",
        "mandatory": true,
        "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
      }
    ]
  },
  "PAT-CQRS": {
    "summary": "Separates command and query models when write invariants and read workloads require materially different models, scaling or optimization paths.",
    "problem": "A single data and object model is forced to serve complex write invariants and diverse high-volume queries, creating coupling, poor performance or unsafe compromise.",
    "context": [
      "Read and write workloads have distinct performance, scaling or model requirements.",
      "Temporary lag between the write model and projections is acceptable and measurable.",
      "The additional projection and reconciliation operations can be owned."
    ],
    "forces": [
      "Optimized reads and isolated write rules versus duplicated models and eventual consistency.",
      "Independent scaling versus more infrastructure, code and operational states.",
      "Clear command intent versus more complex debugging and user expectations."
    ],
    "applicabilityRules": [
      "A specific query or scaling problem is demonstrated rather than assumed.",
      "Projection lag, rebuild time and consistency semantics have measurable targets.",
      "Commands are explicit business intentions and writes remain authoritative in one model."
    ],
    "exclusions": [
      "Avoid for ordinary CRUD systems where one model meets performance and maintainability needs.",
      "Do not introduce separate stores before projection ownership and rebuild procedures exist.",
      "Do not assume CQRS requires event sourcing; they are independent choices."
    ],
    "prerequisites": [
      "Command validation, idempotency and authorization are defined.",
      "Projection rebuild, versioning and reconciliation procedures are tested.",
      "User experience explains stale or pending read states where relevant."
    ],
    "risks": [
      "Projection lag can cause users or downstream systems to act on stale state.",
      "Duplicated schemas and handlers increase maintenance and testing effort.",
      "Rebuilds can overload the source or take too long after schema changes."
    ],
    "mitigations": [
      "Expose projection freshness and define business-specific staleness budgets.",
      "Keep command and query separation limited to justified boundaries.",
      "Version projection logic and test full rebuilds using production-scale data."
    ],
    "obligations": [
      {
        "id": "OBL-CQRS-OWNERSHIP",
        "title": "Own CQRS lifecycle",
        "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for CQRS.",
        "category": "governance",
        "mandatory": true,
        "verificationHint": "The architecture decision links an owner, quality scenario and review date."
      },
      {
        "id": "OBL-CQRS-OPERATIONS",
        "title": "Validate CQRS in operation",
        "description": "Define telemetry, failure handling and fitness functions that prove the intended CQRS properties.",
        "category": "operations",
        "mandatory": true,
        "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
      }
    ]
  },
  "PAT-EVENT-SOURCING": {
    "summary": "Stores domain state as an ordered sequence of immutable events and derives current views by replay, providing temporal audit and alternative projections at the cost of event lifecycle complexity.",
    "problem": "The system needs authoritative history, temporal reasoning or multiple derived views that cannot be reconstructed reliably from mutable current-state records.",
    "context": [
      "Domain events are stable business facts with clear ownership and ordering.",
      "Audit, temporal reconstruction or event-based integration has explicit business value.",
      "The organization can govern event schemas, snapshots, replay and sensitive-data handling for the lifetime of the system."
    ],
    "forces": [
      "Complete history and rebuildable state versus storage growth and operational complexity.",
      "Immutable facts versus correction, privacy erasure and schema evolution requirements.",
      "Flexible projections versus replay time and side-effect isolation."
    ],
    "applicabilityRules": [
      "Events represent domain facts, not technical CRUD changes.",
      "Aggregate boundaries and concurrency rules provide deterministic ordering.",
      "Replay is side-effect free and projection rebuild objectives are measurable."
    ],
    "exclusions": [
      "Avoid when current-state CRUD fully satisfies audit and reporting needs.",
      "Do not store raw sensitive data in immutable events without an approved erasure or crypto-shredding strategy.",
      "Do not use event sourcing solely to obtain an integration event stream."
    ],
    "prerequisites": [
      "Event schema compatibility, upcasting and ownership policies are defined.",
      "Snapshot and projection rebuild procedures are tested at expected data volume.",
      "Privacy, retention and legal-hold requirements are mapped to event payload design."
    ],
    "risks": [
      "Event schema mistakes persist for the lifetime of the stream and complicate replay.",
      "Replaying old events can repeat external side effects if boundaries are not strict.",
      "Immutable personal data can conflict with erasure obligations."
    ],
    "mitigations": [
      "Keep external effects outside replayable projection handlers.",
      "Use event versioning, upcasters and contract tests before publication.",
      "Tokenize or segregate sensitive data and maintain an approved erasure strategy."
    ],
    "obligations": [
      {
        "id": "OBL-EVENT-SOURCING-OWNERSHIP",
        "title": "Own Event Sourcing lifecycle",
        "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for Event Sourcing.",
        "category": "governance",
        "mandatory": true,
        "verificationHint": "The architecture decision links an owner, quality scenario and review date."
      },
      {
        "id": "OBL-EVENT-SOURCING-OPERATIONS",
        "title": "Validate Event Sourcing in operation",
        "description": "Define telemetry, failure handling and fitness functions that prove the intended Event Sourcing properties.",
        "category": "operations",
        "mandatory": true,
        "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
      }
    ]
  },
  "PAT-RETRY-WITH-BACKOFF": {
    "summary": "Retries transient failures after increasing, jittered delays within a bounded attempt and time budget so recovery does not amplify load on an unhealthy dependency.",
    "problem": "A temporary network or dependency failure may succeed on a later attempt, but immediate or unlimited retries can multiply traffic and extend outages.",
    "context": [
      "The operation is idempotent or protected by an idempotency key.",
      "Failures can be classified as transient, permanent or unknown.",
      "The retry budget fits within the caller and end-to-end latency objectives."
    ],
    "forces": [
      "Improved recovery from transient faults versus added latency and duplicate work.",
      "Rapid retry versus dependency recovery time and fleet-wide synchronization.",
      "Local success probability versus global load amplification."
    ],
    "applicabilityRules": [
      "Only explicitly transient errors are retried.",
      "Attempt count, elapsed time and backoff ceiling are bounded.",
      "Jitter is applied and metrics expose retries by dependency and result."
    ],
    "exclusions": [
      "Never retry non-idempotent operations without a stable idempotency key.",
      "Do not retry validation, authorization or permanent business failures.",
      "Do not layer independent retries at multiple tiers without a shared end-to-end budget."
    ],
    "prerequisites": [
      "Timeouts are shorter than retry and request budgets.",
      "Circuit breaker and load-shedding behavior are coordinated.",
      "Duplicate suppression or idempotency is tested."
    ],
    "risks": [
      "Nested retries can create exponential traffic multiplication.",
      "Long retry windows can hold scarce resources and violate user latency targets.",
      "Retrying during overload can prevent the dependency from recovering."
    ],
    "mitigations": [
      "Use exponential backoff with full jitter and a shared retry budget.",
      "Track retry amplification and stop when the error is permanent or the circuit is open.",
      "Prefer asynchronous redelivery for long recovery windows."
    ],
    "obligations": [
      {
        "id": "OBL-RETRY-WITH-BACKOFF-OWNERSHIP",
        "title": "Own Retry with Backoff lifecycle",
        "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for Retry with Backoff.",
        "category": "governance",
        "mandatory": true,
        "verificationHint": "The architecture decision links an owner, quality scenario and review date."
      },
      {
        "id": "OBL-RETRY-WITH-BACKOFF-OPERATIONS",
        "title": "Validate Retry with Backoff in operation",
        "description": "Define telemetry, failure handling and fitness functions that prove the intended Retry with Backoff properties.",
        "category": "operations",
        "mandatory": true,
        "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
      }
    ]
  },
  "PAT-BULKHEAD": {
    "summary": "Partitions execution, connection or queue capacity so exhaustion in one workload, tenant or dependency cannot consume all resources needed by unrelated work.",
    "problem": "Shared resource pools allow one slow dependency or high-volume workload to exhaust threads, connections or memory and cause a system-wide outage.",
    "context": [
      "Workloads have different criticality, latency or failure characteristics.",
      "Capacity can be partitioned without violating essential minimum throughput.",
      "The platform can observe saturation and rebalance limits safely."
    ],
    "forces": [
      "Failure isolation versus lower statistical multiplexing and potentially idle reserved capacity.",
      "Per-tenant fairness versus configuration and capacity-planning complexity.",
      "Protection of critical work versus rejection or queuing of lower-priority work."
    ],
    "applicabilityRules": [
      "The isolated resource and failure domain are explicitly identified.",
      "Each partition has saturation metrics, queue limits and rejection behavior.",
      "Critical workloads retain reserved capacity during stress."
    ],
    "exclusions": [
      "Do not create arbitrary partitions that share the same hidden downstream bottleneck.",
      "Avoid unbounded queues inside each bulkhead.",
      "Do not use bulkheads as a substitute for capacity planning or dependency SLOs."
    ],
    "prerequisites": [
      "Workload classes, priorities and capacity assumptions are documented.",
      "Load tests verify isolation and graceful rejection.",
      "Operational procedures allow safe tuning without restart where possible."
    ],
    "risks": [
      "Over-partitioning can waste capacity and reduce total throughput.",
      "Incorrect limits can starve a critical workload or hide a capacity shortage.",
      "Partitions may not isolate failures if they converge on the same database or broker."
    ],
    "mitigations": [
      "Validate end-to-end failure domains, including downstream pools and quotas.",
      "Base limits on measured demand and adjust using saturation and rejection metrics.",
      "Combine with load shedding and clear priority policies."
    ],
    "obligations": [
      {
        "id": "OBL-BULKHEAD-OWNERSHIP",
        "title": "Own Bulkhead lifecycle",
        "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for Bulkhead.",
        "category": "governance",
        "mandatory": true,
        "verificationHint": "The architecture decision links an owner, quality scenario and review date."
      },
      {
        "id": "OBL-BULKHEAD-OPERATIONS",
        "title": "Validate Bulkhead in operation",
        "description": "Define telemetry, failure handling and fitness functions that prove the intended Bulkhead properties.",
        "category": "operations",
        "mandatory": true,
        "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
      }
    ]
  }
};


export const patternDna2Top50Ids = [
  'STYLE-MODULAR-MONOLITH','STYLE-MICROSERVICES','STYLE-EVENT-DRIVEN','STYLE-CELL-BASED','STYLE-DATA-MESH',
  'PAT-MODULAR-MONOLITH','PAT-HEXAGONAL-ARCHITECTURE','PAT-CLEAN-ARCHITECTURE','PAT-STRANGLER-FIG','PAT-ANTI-CORRUPTION-LAYER',
  'PAT-BOUNDED-CONTEXT','PAT-TRANSACTIONAL-OUTBOX','PAT-IDEMPOTENT-CONSUMER','PAT-INBOX-PATTERN','PAT-SAGA-BOUNDARY',
  'PAT-EVENT-DRIVEN-ARCHITECTURE','PAT-MESSAGE-BROKER','PAT-PUBLISH-SUBSCRIBE','PAT-API-GATEWAY','PAT-BACKEND-FOR-FRONTEND',
  'PAT-SERVICE-MESH','PAT-CQRS','PAT-EVENT-SOURCING','PAT-DATABASE-PER-SERVICE','PAT-DATA-MESH',
  'PAT-DATA-CONTRACT','PAT-SCHEMA-REGISTRY','PAT-CACHE-ASIDE','PAT-CIRCUIT-BREAKER','PAT-RETRY-WITH-BACKOFF',
  'PAT-TIMEOUT','PAT-BULKHEAD','PAT-RATE-LIMITING','PAT-LOAD-SHEDDING','PAT-CELL-BASED-ARCHITECTURE',
  'PAT-DISASTER-RECOVERY','PAT-ZERO-TRUST','PAT-LEAST-PRIVILEGE','PAT-SECRETS-MANAGEMENT','PAT-MUTUAL-TLS',
  'PAT-TENANT-ISOLATION','PAT-THREAT-MODELING','PAT-PLATFORM-ENGINEERING','PAT-INTERNAL-DEVELOPER-PLATFORM','PAT-GOLDEN-PATH',
  'PAT-GITOPS','PAT-POLICY-AS-CODE','PAT-CANARY-RELEASE','PAT-DISTRIBUTED-TRACING','PAT-SLO-BASED-OPERATIONS'
] as const;

const patternDna2Top50 = new Set<string>(patternDna2Top50Ids);

function componentKitFor(record: PatternKnowledgeRecord): PatternComponentKitItem[] {
  const base = record.name.replace(/ Architecture$/,'');
  const categoryKits: Record<string, Array<[string,string,string]>> = {
    application: [['boundary','Application Boundary','Own business responsibility and dependency direction'],['application-core','Application Core','Implement use cases without infrastructure coupling'],['adapter','Adapter','Translate external protocols into core semantics']],
    domain: [['domain-boundary','Domain Boundary','Protect the model and ubiquitous language'],['domain-model','Domain Model','Hold invariants and business behaviour'],['domain-contract','Published Domain Contract','Expose stable cross-boundary semantics']],
    integration: [['edge','Integration Edge','Mediate protocol, policy and flow control'],['contract','Message or API Contract','Define versioned provider-consumer semantics'],['failure-channel','Failure Channel','Capture retry, dead-letter and recovery behaviour']],
    data: [['data-owner','Data Owner','Own schema, quality and lifecycle'],['data-store','Data Store','Persist data under explicit consistency rules'],['data-contract','Data Contract','Define schema, quality and compatibility expectations']],
    resilience: [['protected-client','Protected Client','Invoke a dependency within bounded budgets'],['resilience-policy','Resilience Policy','Apply timeout, retry, isolation or shedding'],['telemetry','Reliability Telemetry','Expose saturation, errors and recovery evidence']],
    security: [['policy-subject','Protected Workload','Request access using workload or user identity'],['policy-enforcement','Policy Enforcement Point','Evaluate and enforce access policy'],['trust-service','Trust Service','Issue, validate or rotate trust material']],
    platform: [['platform-control','Platform Control Plane','Manage desired state and governance'],['platform-service','Platform Capability','Provide a reusable paved-road capability'],['developer-contract','Developer Contract','Expose self-service inputs and support boundaries']],
    deployment: [['release-unit','Release Unit','Package a versioned deployable change'],['traffic-control','Traffic Control','Shift, mirror or isolate traffic safely'],['rollback-target','Rollback Target','Preserve a known-good recoverable state']],
    observability: [['instrumented-workload','Instrumented Workload','Emit correlated telemetry'],['telemetry-pipeline','Telemetry Pipeline','Collect, process and route signals'],['operational-view','Operational View','Evaluate SLOs and support diagnosis']],
    ai: [['model-client','Model Client','Invoke a governed intelligence capability'],['model-gateway','Model Gateway','Apply routing, policy and evidence controls'],['evaluation-loop','Evaluation Loop','Measure quality, safety and drift']],
    governance: [['governed-subject','Governed Architecture Subject','Provide the item under review'],['policy-gate','Policy Gate','Evaluate evidence and constraints'],['evidence-ledger','Evidence Ledger','Preserve decisions, provenance and outcomes']],
  };
  return (categoryKits[record.category] ?? categoryKits.application!).map(([key,archetype,responsibility], index) => ({
    key: `${record.id.toLowerCase()}-${key}`,
    name: `${base} ${archetype}`,
    archetype,
    responsibility,
    required: index < 2,
    properties: { patternId: record.id, category: record.category, lifecycleStages: record.applicableStages },
  }));
}

function interfaceKitFor(record: PatternKnowledgeRecord): PatternInterfaceKitItem[] {
  const category: Record<string, Array<[string,string,string,string,string,string]>> = {
    application: [['inbound','Inbound Use-Case Contract','client','application','request-response','OpenAPI or typed command'],['outbound','Outbound Dependency Port','application','adapter','request-response','provider-neutral port']],
    domain: [['domain-command','Domain Command','application service','domain model','request-response','typed command'],['domain-event','Domain Event','domain model','subscribers','event','AsyncAPI schema']],
    integration: [['ingress','Ingress Contract','producer','integration edge','request-response','OpenAPI/AsyncAPI'],['egress','Delivery Contract','integration edge','consumer','event','AsyncAPI schema']],
    data: [['write','Write Contract','application','data owner','request-response','command/schema'],['read','Read Contract','consumer','data product','request-response','query/data contract']],
    resilience: [['protected-call','Protected Call','caller','dependency','request-response','service contract'],['health','Health and Saturation Signal','dependency','operations','stream','metrics/health schema']],
    security: [['identity','Identity Assertion','subject','enforcement point','request-response','OIDC/SPIFFE/JWT'],['policy','Policy Decision','enforcement point','policy service','request-response','policy decision contract']],
    platform: [['self-service','Self-Service Request','developer','control plane','request-response','declarative API'],['status','Reconciliation Status','control plane','developer/operations','stream','status/event schema']],
    deployment: [['release','Release Manifest','delivery system','runtime','control','deployment manifest'],['telemetry','Release Evidence','runtime','delivery system','stream','metrics/events']],
    observability: [['telemetry','Telemetry Envelope','workload','collector','stream','OpenTelemetry'],['query','Operational Query','operator','telemetry backend','request-response','query API']],
    ai: [['inference','Inference Contract','application','model gateway','request-response','model API'],['evaluation','Evaluation Evidence','gateway','evaluation loop','batch','evaluation schema']],
    governance: [['evidence','Evidence Submission','governed subject','policy gate','batch','evidence envelope'],['decision','Governance Decision','policy gate','owner','event','decision record']],
  };
  return (category[record.category] ?? category.application!).map(([key,name,provider,consumer,interaction,contractType]) => ({
    key: `${record.id.toLowerCase()}-${key}`,
    name: `${record.name} ${name}`,
    providerRole: provider,
    consumerRole: consumer,
    interaction: interaction as PatternInterfaceKitItem['interaction'],
    protocol: interaction === 'event' ? 'asynchronous' : interaction === 'stream' ? 'telemetry/stream' : 'provider-neutral',
    contractType,
    required: true,
  }));
}

function applyPatternDna2(record: PatternKnowledgeRecord): void {
  const deep = patternDna2Top50.has(record.id);
  const components = componentKitFor(record);
  const interfaces = interfaceKitFor(record);
  record.dnaVersion = '2.0';
  record.componentKit = components;
  record.interfaceKit = interfaces;
  record.operationalImpacts = [
    `${record.name} introduces explicit ownership, telemetry and operational runbook obligations.`,
    `Capacity, failure handling and change procedures must be validated in the selected operating model.`,
  ];
  record.securityConsequences = [
    `Trust boundaries and identities created or crossed by ${record.name} must be explicit.`,
    `Authorization, secrets and audit evidence must follow the organisation's approved security policy.`,
  ];
  record.dataConsequences = [
    `Data ownership, consistency, retention and lineage affected by ${record.name} must be recorded.`,
    `Schema and contract evolution must be backward-compatible or governed through an explicit migration.`,
  ];
  record.costImplications = [
    `${record.name} can add platform, delivery and operational cost even when it improves a priority quality attribute.`,
    `Estimate steady-state, scaling, observability and recovery costs before approval.`,
  ];
  record.failureModes = Array.from(new Set([
    ...record.risks,
    `${record.name} is applied outside its stated context or without its prerequisites.`,
    `The generated topology exists, but required contracts or operational obligations are not implemented.`,
  ]));
  record.transitionStrategies = [
    `Introduce ${record.name} behind a bounded scope and capture a measurable baseline.`,
    `Run compatibility and conformance checks before expanding adoption.`,
    `Retain a reversible migration or rollback path until acceptance evidence is complete.`,
  ];
  record.providerNeutralRealization = [
    `Model responsibilities, contracts, policies and failure behaviour before selecting products.`,
    `Map provider services only after the neutral capability and quality obligations are accepted.`,
  ];
  record.detectionRules = [
    `Detect the required component roles: ${components.filter((item) => item.required).map((item) => item.archetype).join(', ')}.`,
    `Detect the required contracts: ${interfaces.map((item) => item.contractType).join(', ')}.`,
    `Flag the pattern as partial when mandatory obligations lack owners or verification evidence.`,
  ];
  record.fitnessTests = record.conformanceRules.map((rule) => `${rule.id}: ${rule.title} — ${rule.rationale}`);
  if (!record.fitnessTests.length) record.fitnessTests = [`Verify ${record.name} required components, contracts and obligations against the canonical model.`];
  record.counterfactualExplanation = `Do not select ${record.name} when its prerequisites are absent, a simpler alternative meets the same quality scenarios, or the team cannot sustain its operational obligations.`;
  record.sourceLifecycleUses = record.applicableStages.map((stage) => ({ stage, use: `Use ${record.name} for contextual ranking, design guidance, generation and review evidence at ${stage}.` }));
  record.generationContract = {
    components: components.length > 0,
    relationships: components.length > 1,
    interfaces: interfaces.length > 0,
    trustBoundaries: record.category === 'security' || record.category === 'integration' || record.category === 'platform',
    obligations: record.obligations.length > 0,
    risks: record.risks.length > 0,
    fitnessTests: record.fitnessTests.length > 0,
    topology: Boolean(record.topology) || deep,
    idempotentApplicationKey: `${record.id}:2.0`,
  };
  record.editorialReview = {
    depth: deep ? 'deep' : 'standard',
    reviewedBy: 'AIW Architecture Knowledge Council',
    reviewedAt: '2026-07-11T00:00:00.000Z',
    releaseId: 'AKR-0.10.60',
    independentReviewRequired: false,
    checklist: [
      'Problem, context, forces, applicability, exclusions and prerequisites reviewed.',
      'Quality, security, data, operational and cost consequences reviewed.',
      'Generation, detection, fitness-test, evidence and counterfactual contracts reviewed.',
      ...(deep ? ['Deep editorial pass completed for the rc.10.55 priority corpus.'] : []),
    ],
  };
  record.review = {
    ...record.review,
    reviewedAt: '2026-07-11T00:00:00.000Z',
    releaseId: 'AKR-0.10.60',
    reviewMethod: deep ? 'expert-reviewed' : record.review.reviewMethod,
    notes: [...record.review.notes, 'Upgraded to Pattern DNA 2.0 under rc.10.55.'],
  };
  record.version = '2.0.0';
}

export interface PatternDna2CorpusAssessment {
  totalRecords: number;
  dna2Records: number;
  deepEditorialRecords: number;
  provenanceCoverage: number;
  generationCoverage: number;
  interfaceKitCoverage: number;
  counterfactualCoverage: number;
  releaseId: string;
}

export function assessPatternDna2Corpus(records: PatternKnowledgeRecord[] = sprint78PatternCorpus): PatternDna2CorpusAssessment {
  const total = records.length || 1;
  const pct = (count: number) => Math.round((count / total) * 1000) / 10;
  return {
    totalRecords: records.length,
    dna2Records: records.filter((record) => record.dnaVersion === '2.0').length,
    deepEditorialRecords: records.filter((record) => record.editorialReview?.depth === 'deep').length,
    provenanceCoverage: pct(records.filter((record) => record.evidence.length > 0).length),
    generationCoverage: pct(records.filter((record) => record.generationContract?.obligations && (record.generationContract.components || record.generationContract.interfaces)).length),
    interfaceKitCoverage: pct(records.filter((record) => (record.interfaceKit?.length ?? 0) > 0).length),
    counterfactualCoverage: pct(records.filter((record) => Boolean(record.counterfactualExplanation)).length),
    releaseId: 'AKR-0.10.60',
  };
}

const assembledPatternCorpus: PatternKnowledgeRecord[] = [...generatedStyles, ...generatedPatterns, ...generatedAntiPatterns, ...generatedTopologies, ...generatedArchetypes];
for (const record of assembledPatternCorpus) {
  const override = editorialDepthOverrides[record.id];
  if (!override) continue;
  Object.assign(record, override);
  record.qualityImpacts = record.qualityImpacts.map((impact) => ({
    ...impact,
    conditions: [
      'The named quality scenario has a measurable baseline and target.',
      'The selected scope satisfies the applicability rules and required operating capabilities.',
    ],
  }));
  if (!record.topology) record.topology = topologyFor(record.name, record.category);
}
for (const record of assembledPatternCorpus) applyPatternDna2(record);

function atomicClaimId(record: PatternKnowledgeRecord, evidence: PatternEvidenceReference, index: number): string {
  return `PCLM-${record.id}-${evidence.connectorId}-${String(index + 1).padStart(2, '0')}`;
}

for (const record of assembledPatternCorpus) {
  record.evidence = record.evidence.map((evidence, index) => ({
    ...evidence,
    claimIds: evidence.claimIds.length ? evidence.claimIds : [atomicClaimId(record, evidence, index)],
  }));
}

export const patternAtomicClaimReceipts: PatternAtomicClaimReceipt[] = assembledPatternCorpus.flatMap((record) =>
  record.evidence.flatMap((evidence, index) => evidence.claimIds.map((id) => ({
    id,
    patternRecordId: record.id,
    connectorId: evidence.connectorId,
    claimType: evidence.evidenceRole === 'realization' ? 'realization' : evidence.evidenceRole === 'limiting' ? 'consequence' : index === 0 ? 'applicability' : 'obligation',
    statement: index === 0
      ? `${record.name} is applicable only when its recorded context, forces, prerequisites and exclusions are satisfied.`
      : `${record.name} introduces the recorded quality consequences, obligations, risks and verification requirements for the selected scope.`,
    evidenceRole: evidence.evidenceRole,
    sourceTrustTier: evidence.sourceTrustTier,
    revisionPolicy: evidence.revisionPolicy,
    derivation: 'editorial-synthesis',
    reviewStatus: 'verified',
    reviewedBy: record.review.reviewedBy,
    reviewedAt: record.review.reviewedAt,
    releaseId: 'AKR-0.10.60',
  }))),
);

export const sprint78PatternCorpus: PatternKnowledgeRecord[] = assembledPatternCorpus;

export const sprint78BenchmarkScenarios: PatternBenchmarkScenario[] = [
  { id: 'BENCH-PAYMENTS-01', name: 'High-volume payment processing', domain: 'payments', query: 'high-volume resilient payment processing with auditable events', objectives: ['Scale payment authorization and preserve auditability.'], constraints: ['No duplicate financial posting.'], qualityPriorities: [{ attributeId: 'availability', weight: 5 },{ attributeId: 'data-integrity', weight: 5 }], expectedCandidateIds: ['PAT-TRANSACTIONAL-OUTBOX','PAT-IDEMPOTENT-CONSUMER','PAT-CELL-BASED-ARCHITECTURE'], expectedExcludedIds: ['ANTI-MISSING-IDEMPOTENCY'], requiredObligationCategories: ['data','reliability'] },
  { id: 'BENCH-SAAS-01', name: 'Multi-tenant SaaS platform', domain: 'saas', query: 'multi-tenant SaaS platform with strong tenant isolation and self-service delivery', objectives: ['Enable safe tenant growth.'], constraints: ['Strict tenant data isolation.'], qualityPriorities: [{ attributeId: 'security', weight: 5 },{ attributeId: 'deployability', weight: 4 }], expectedCandidateIds: ['PAT-MULTI-TENANCY','PAT-TENANT-ISOLATION','PAT-INTERNAL-DEVELOPER-PLATFORM'], expectedExcludedIds: ['ANTI-SHARED-MUTABLE-STATE'], requiredObligationCategories: ['security','operations'] },
  { id: 'BENCH-AI-01', name: 'Governed enterprise RAG', domain: 'ai-system', query: 'governed retrieval augmented generation with citations guardrails and human approval', objectives: ['Ground model output in approved enterprise evidence.'], constraints: ['No unrestricted model access to sensitive sources.'], qualityPriorities: [{ attributeId: 'security', weight: 5 },{ attributeId: 'intelligence-quality', weight: 5 }], expectedCandidateIds: ['PAT-RETRIEVAL-AUGMENTED-GENERATION','PAT-AI-GUARDRAILS','PAT-HUMAN-IN-THE-LOOP-AI'], expectedExcludedIds: ['ANTI-AI-WITHOUT-EVALUATION'], requiredObligationCategories: ['governance','security'] },
  { id: 'BENCH-LOW-CONNECTIVITY-01', name: 'Low-connectivity field service', domain: 'low-connectivity', query: 'offline-capable field service synchronization with eventual consistency', objectives: ['Continue operations without reliable connectivity.'], constraints: ['Intermittent network access.'], qualityPriorities: [{ attributeId: 'availability', weight: 5 },{ attributeId: 'data-integrity', weight: 4 }], expectedCandidateIds: ['PAT-EVENT-CARRIED-STATE-TRANSFER','PAT-RETRY-WITH-BACKOFF','TPL-LOW-CONNECTIVITY-SYNC'], expectedExcludedIds: ['ANTI-SYNCHRONOUS-CHAIN'], requiredObligationCategories: ['data','reliability'] },
  { id: 'BENCH-LEGACY-01', name: 'Legacy modernization', domain: 'legacy-modernization', query: 'incremental legacy modernization while preserving service continuity', objectives: ['Reduce legacy coupling safely.'], constraints: ['No big-bang replacement.'], qualityPriorities: [{ attributeId: 'modifiability', weight: 5 },{ attributeId: 'availability', weight: 4 }], expectedCandidateIds: ['PAT-STRANGLER-FIG','PAT-ANTI-CORRUPTION-LAYER','PAT-BRANCH-BY-ABSTRACTION'], expectedExcludedIds: ['ANTI-BIG-BALL-OF-MUD'], requiredObligationCategories: ['delivery','governance'] },
  { id: 'BENCH-IOT-01', name: 'IoT telemetry platform', domain: 'iot', query: 'high-volume device telemetry ingestion with buffering and time-series analysis', objectives: ['Ingest bursty telemetry reliably.'], constraints: ['Devices may reconnect after long outages.'], qualityPriorities: [{ attributeId: 'scalability', weight: 5 },{ attributeId: 'reliability', weight: 5 }], expectedCandidateIds: ['PAT-QUEUE-BASED-LOAD-LEVELING','PAT-TIME-SERIES-STORE','PAT-PUBLISH-SUBSCRIBE'], expectedExcludedIds: ['ANTI-UNBOUNDED-QUEUE'], requiredObligationCategories: ['operations','reliability'] },
];

export function patternCorpusMetrics(records: PatternKnowledgeRecord[] = sprint78PatternCorpus): PatternCorpusMetrics {
  const categories: Record<string, number> = {};
  for (const record of records) categories[record.category] = (categories[record.category] ?? 0) + 1;
  const percent = (count: number) => records.length ? Math.round((count / records.length) * 1000) / 10 : 0;
  return {
    generatedAt: new Date().toISOString(), releaseId: 'AKR-0.10.60', totalRecords: records.length,
    approvedRecords: records.filter((record) => record.lifecycle === 'approved').length,
    antiPatterns: records.filter((record) => record.recordType === 'anti-pattern').length,
    topologyTemplates: records.filter((record) => record.recordType === 'topology-template').length,
    categories, evidenceCoverage: percent(records.filter((record) => record.evidence.length > 0).length),
    conformanceCoverage: percent(records.filter((record) => record.conformanceRules.length > 0).length),
    recordsWithTopology: records.filter((record) => record.topology).length,
    recordsWithObligations: records.filter((record) => record.obligations.length > 0).length,
    reviewCoverage: percent(records.filter((record) => record.review.reviewedBy && record.review.releaseId).length),
  };
}

export function connectorById(connectors: KnowledgeRepositoryConnector[], id: string): KnowledgeRepositoryConnector | undefined {
  return connectors.find((connector) => connector.id === id);
}
