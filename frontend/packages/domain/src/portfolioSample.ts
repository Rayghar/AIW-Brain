import type { ArchitectureProject, EnterpriseArchitectureCatalog } from './types.js';
import { sampleProject } from './sample.js';

const clone = <T>(value: T): T => structuredClone(value);

export const sampleEnterpriseCatalog: EnterpriseArchitectureCatalog = {
  id: 'enterprise-catalog-reference',
  tenantId: sampleProject.tenantId,
  version: '1.0.0',
  technologyStandards: [
    { id: 'STD-RDBMS-POSTGRES', category: 'relational-database', technologyName: 'PostgreSQL', matchTerms: ['postgresql', 'postgres', 'aurora postgresql'], status: 'preferred', rationale: 'Preferred relational platform for new transactional services.', effectiveFrom: '2026-01-01', evidenceIds: ['EVIDENCE-INTERNAL-TECH-STANDARD'] },
    { id: 'STD-RUNTIME-NODE', category: 'application-runtime', technologyName: 'Node.js', matchTerms: ['node.js', 'nodejs'], status: 'allowed', rationale: 'Supported runtime for API and event-processing workloads.', effectiveFrom: '2026-01-01', evidenceIds: ['EVIDENCE-INTERNAL-TECH-STANDARD'] },
    { id: 'STD-CACHE-REDIS', category: 'distributed-cache', technologyName: 'Redis', matchTerms: ['redis', 'elasticache'], status: 'preferred', rationale: 'Preferred distributed cache and ephemeral coordination technology.', effectiveFrom: '2026-01-01', evidenceIds: ['EVIDENCE-INTERNAL-TECH-STANDARD'] },
    { id: 'STD-BROKER-KAFKA', category: 'event-streaming', technologyName: 'Kafka', matchTerms: ['kafka', 'msk', 'confluent'], status: 'preferred', rationale: 'Preferred high-throughput event-streaming platform.', effectiveFrom: '2026-01-01', evidenceIds: ['EVIDENCE-INTERNAL-TECH-STANDARD'] },
    { id: 'STD-RDBMS-MYSQL-LEGACY', category: 'relational-database', technologyName: 'MySQL 5.x', matchTerms: ['mysql 5', 'mysql5'], status: 'deprecated', preferredReplacement: 'PostgreSQL', rationale: 'Legacy engine version is outside the target modernization standard.', effectiveFrom: '2026-01-01', evidenceIds: ['EVIDENCE-INTERNAL-TECH-STANDARD'] },
    { id: 'STD-MQ-RABBIT-RESTRICTED', category: 'message-broker', technologyName: 'RabbitMQ', matchTerms: ['rabbitmq', 'rabbit mq'], status: 'restricted', preferredReplacement: 'Kafka or managed queue based on workload', rationale: 'Allowed only where work-queue semantics are explicitly required.', effectiveFrom: '2026-01-01', evidenceIds: ['EVIDENCE-INTERNAL-TECH-STANDARD'] },
  ],
  buildingBlocks: [
    {
      id: 'ABB-SECURE-API-SERVICE', name: 'Secure API Service', version: '1.0.0', category: 'application-service',
      description: 'Reusable API service boundary with identity, rate limiting, observability and resilient downstream access.',
      requiredPatternIds: ['PAT-API-GATEWAY', 'PAT-CIRCUIT-BREAKER'], qualityAttributeIds: ['security', 'availability', 'observability'], status: 'approved',
      nodeTemplates: [
        { kind: 'DeployableUnit', stage: 'applicationRealization', label: 'API Service', properties: { public: false }, tags: ['api', 'building-block'] },
        { kind: 'LogicalTechnologyCapability', stage: 'logicalTechnology', label: 'API Management', properties: {}, tags: ['security', 'building-block'] },
      ],
      edgeTemplates: [{ sourceLabel: 'API Service', targetLabel: 'API Management', kind: 'mapsTo', stage: 'logicalTechnology' }],
    },
    {
      id: 'ABB-EVENT-PROCESSOR', name: 'Reliable Event Processor', version: '1.0.0', category: 'event-processing',
      description: 'Reusable event consumer with idempotency, dead-letter handling, schema governance and telemetry.',
      requiredPatternIds: ['PAT-OUTBOX', 'PAT-IDEMPOTENT-CONSUMER'], qualityAttributeIds: ['reliability', 'faultTolerance', 'observability'], status: 'approved',
      nodeTemplates: [{ kind: 'DeployableUnit', stage: 'applicationRealization', label: 'Event Processor', properties: {}, tags: ['worker', 'building-block'] }], edgeTemplates: [],
    },
  ],
  referenceArchitectures: [
    {
      id: 'REF-DIGITAL-TRANSACTION-PLATFORM', name: 'Resilient Digital Transaction Platform', version: '1.0.0',
      description: 'Enterprise baseline for revenue-critical digital transaction systems.', applicableContexts: ['digital-commerce', 'payments', 'banking'],
      requiredStyleIds: ['STYLE-EVENT-DRIVEN'], requiredPatternIds: ['PAT-OUTBOX', 'PAT-CIRCUIT-BREAKER'],
      requiredNodeKinds: ['LogicalService', 'DeployableUnit', 'DataStore', 'TechnologyProduct'], prohibitedTechnologyTerms: ['mysql 5'],
      requiredDecisionTerms: ['recovery', 'data ownership'], minimumApprovedStages: 3, status: 'approved',
    },
  ],
};

function projectVariant(id: string, name: string, owner: string, criticality: ArchitectureProject['portfolio']['criticality']): ArchitectureProject {
  const project = clone(sampleProject);
  project.id = id;
  project.name = name;
  project.description = `${name} enterprise portfolio reference project.`;
  project.portfolio.owner = owner;
  project.portfolio.criticality = criticality;
  project.branch.id = `branch-main-${id}`;
  project.projectDependencies = [];
  project.technicalDebtItems = [];
  project.referenceArchitectureAssignments = [];
  project.buildingBlockUsages = [];
  project.runtimeInventories = [];
  project.driftReports = [];
  project.operationalDriftReports = [];
  project.nodes = project.nodes.map((node) => ({ ...node, id: `${id}-${node.id}`, label: node.label }));
  project.edges = [];
  project.styleDecisions = [];
  project.patternSelections = [];
  project.stageApprovals = [];
  return project;
}

const identity = projectVariant('project-customer-identity', 'Customer Identity Platform', 'Identity Engineering', 'mission-critical');
identity.portfolio.businessUnit = 'Enterprise Platforms';
identity.nodes = [
  { id: 'identity-api', kind: 'DeployableUnit', stage: 'applicationRealization', label: 'Identity API', properties: { runtime: 'Node.js', expectedMonthlyCost: 650 }, lineageFrom: [], positions: { applicationRealization: { x: 100, y: 100 } }, tags: ['api', 'critical'], status: 'approved' },
  { id: 'identity-postgres', kind: 'TechnologyProduct', stage: 'physicalTechnology', label: 'PostgreSQL Identity Store', properties: { product: 'PostgreSQL', expectedMonthlyCost: 750, availabilityZones: 2 }, lineageFrom: [], positions: { physicalTechnology: { x: 300, y: 100 } }, tags: ['database', 'critical'], status: 'approved' },
];
identity.technicalDebtItems = [{ id: 'debt-identity-token-rotation', title: 'Manual signing-key rotation', category: 'security', severity: 'SIGNIFICANT', description: 'Signing key rotation remains a manual operational procedure.', linkedNodeIds: ['identity-api'], estimatedEffortDays: 10, annualCostImpact: 24000, status: 'planned' }];
identity.buildingBlockUsages = [{ id: 'usage-identity-api', buildingBlockId: 'ABB-SECURE-API-SERVICE', version: '1.0.0', scopeNodeId: 'identity-api', status: 'adopted' }];
identity.referenceArchitectureAssignments = [{ id: 'assignment-identity-ref', referenceArchitectureId: 'REF-DIGITAL-TRANSACTION-PLATFORM', version: '1.0.0', status: 'applicable' }];

const analytics = projectVariant('project-commerce-analytics', 'Commerce Analytics Platform', 'Data Products', 'high');
analytics.portfolio.businessUnit = 'Data & Analytics';
analytics.portfolio.lifecycle = 'modernize';
analytics.nodes = [
  { id: 'analytics-worker', kind: 'DeployableUnit', stage: 'applicationRealization', label: 'Analytics Ingestion Worker', properties: { runtime: 'Node.js', expectedMonthlyCost: 300 }, lineageFrom: [], positions: { applicationRealization: { x: 100, y: 100 } }, tags: ['worker'], status: 'draft' },
  { id: 'analytics-mysql', kind: 'TechnologyProduct', stage: 'physicalTechnology', label: 'MySQL 5 Reporting Store', properties: { product: 'MySQL 5.7', expectedMonthlyCost: 900 }, lineageFrom: [], positions: { physicalTechnology: { x: 300, y: 100 } }, tags: ['database', 'legacy'], status: 'draft' },
  { id: 'analytics-rabbit', kind: 'TechnologyProduct', stage: 'physicalTechnology', label: 'RabbitMQ Broker', properties: { product: 'RabbitMQ', expectedMonthlyCost: 350 }, lineageFrom: [], positions: { physicalTechnology: { x: 500, y: 100 } }, tags: ['broker'], status: 'draft' },
];
analytics.technicalDebtItems = [
  { id: 'debt-analytics-mysql', title: 'Legacy reporting database', category: 'technology', severity: 'HARD', description: 'The reporting store uses a deprecated database engine version.', linkedNodeIds: ['analytics-mysql'], estimatedEffortDays: 35, annualCostImpact: 60000, status: 'open' },
  { id: 'debt-analytics-observability', title: 'Incomplete ingestion observability', category: 'operations', severity: 'SIGNIFICANT', description: 'End-to-end freshness and lag telemetry is incomplete.', linkedNodeIds: ['analytics-worker'], estimatedEffortDays: 12, annualCostImpact: 18000, status: 'open' },
];
analytics.projectDependencies = [{ id: 'dependency-analytics-identity', sourceProjectId: analytics.id, targetProjectId: identity.id, kind: 'api', criticality: 'low', interfaceName: 'Analyst Access Federation', dataClassification: 'internal', status: 'active' }];

export const samplePortfolioProjects: ArchitectureProject[] = [sampleProject, identity, analytics];
