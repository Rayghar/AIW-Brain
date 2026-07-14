import type { ArchitectureDecision, ArchitectureEdge, ArchitectureNode, ArchitectureProject, EntityKind, FindingSeverity, KnowledgeLibrary, PatternRecord } from '@aiw/domain';
import { recommendInContext, validateProject } from '@aiw/engine';
import { defaultAuthorityBoundary } from '../authority-boundary/index.js';

export type ReviewDimensionId =
  | 'completeness'
  | 'patternAlignment'
  | 'riskPosture'
  | 'securityReadiness'
  | 'resilienceReadiness'
  | 'operationalReadiness'
  | 'decisionQuality'
  | 'deliveryReadiness';

export type ReviewCategory =
  | 'architecture-completeness'
  | 'pattern-fit'
  | 'anti-pattern'
  | 'security'
  | 'resilience'
  | 'integration'
  | 'data-flow'
  | 'deployment'
  | 'operations'
  | 'decision-quality';

export type ReviewSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ReviewScorecardDimension {
  id: ReviewDimensionId;
  label: string;
  score: number;
  status: 'strong' | 'watch' | 'weak';
  rationale: string;
  evidence: string[];
}

export interface ReviewFinding {
  id: string;
  category: ReviewCategory;
  severity: ReviewSeverity;
  title: string;
  issue: string;
  whyItMatters: string;
  recommendedFix: string;
  affectedNodeIds: string[];
  affectedEdgeIds: string[];
  supportingEvidenceIds: string[];
  generatedAction: string;
}

export interface ReviewRecommendation {
  id: string;
  findingIds: string[];
  title: string;
  recommendedDecision: string;
  alternativesConsidered: string[];
  tradeoffs: string[];
  riskImpact: string;
  implementationImplication: string;
  affectedObjectIds: string[];
  confidence: 'high' | 'medium';
  evidenceIds: string[];
  shouldBecomeAdr: boolean;
}

export interface GeneratedReviewAdr {
  id: string;
  title: string;
  context: string;
  decision: string;
  alternatives: string[];
  consequences: string[];
  risks: string[];
  impactedComponentIds: string[];
  linkedPatternIds: string[];
  reviewEvidenceIds: string[];
  status: 'proposed';
}

export interface GeneratedFitnessTest {
  id: string;
  title: string;
  assertion: string;
  scope: 'architecture-model' | 'repository-evidence' | 'runtime-evidence' | 'ci-fitness-loop';
  severity: ReviewSeverity;
  relatedFindingIds: string[];
  evidenceIds: string[];
}

export interface ArchitectureReview {
  id: string;
  projectId: string;
  projectName: string;
  generatedAt: string;
  knowledgeReleaseId: string;
  deliveryReadinessScore: number;
  executiveSummary: string;
  scorecard: ReviewScorecardDimension[];
  findings: ReviewFinding[];
  recommendations: ReviewRecommendation[];
  generatedAdrs: GeneratedReviewAdr[];
  fitnessTests: GeneratedFitnessTest[];
  authority: {
    deterministicKernel: true;
    llmMayScore: false;
    llmMayMutateArchitecture: false;
    candidateKnowledgeMayInfluenceProduction: false;
    humanApprovalRequired: true;
  };
  pipeline: string[];
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${stableHash(value).slice(0, 8)}`;
}

function propText(node: ArchitectureNode, keys: string[]): string {
  for (const key of keys) {
    const value = node.properties[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length) return value.map(String).join(', ');
    if (typeof value === 'boolean') return String(value);
  }
  return '';
}

function edgePropText(edge: ArchitectureEdge, keys: string[]): string {
  for (const key of keys) {
    const value = edge.properties[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value) && value.length) return value.map(String).join(', ');
    if (typeof value === 'boolean') return String(value);
  }
  return '';
}

function nodesOf(project: ArchitectureProject, kinds: EntityKind[]): ArchitectureNode[] {
  return project.nodes.filter((node) => kinds.includes(node.kind));
}

function severityRank(severity: ReviewSeverity): number {
  return severity === 'critical' ? 20 : severity === 'high' ? 13 : severity === 'medium' ? 8 : 3;
}

function evidenceForPattern(library: KnowledgeLibrary, patternIds: string[]): string[] {
  const ids = new Set<string>();
  for (const id of patternIds) {
    const pattern = library.patterns.find((item) => item.id === id);
    if (pattern) ids.add(pattern.id);
  }
  return [...ids];
}

function patternIdsByTerms(library: KnowledgeLibrary, terms: string[]): string[] {
  const lower = terms.map((term) => term.toLowerCase());
  return library.patterns
    .filter((pattern) => lower.some((term) => `${pattern.id} ${pattern.name} ${pattern.category} ${pattern.obligations.join(' ')} ${pattern.risks.join(' ')} ${pattern.mitigations.join(' ')}`.toLowerCase().includes(term)))
    .slice(0, 4)
    .map((pattern) => pattern.id);
}

function acceptedPatternRecords(project: ArchitectureProject, library: KnowledgeLibrary): PatternRecord[] {
  const ids = new Set(project.patternSelections.filter((selection) => selection.status === 'accepted').map((selection) => selection.patternId));
  return library.patterns.filter((pattern) => ids.has(pattern.id));
}

function finding(input: Omit<ReviewFinding, 'id'>): ReviewFinding {
  return { id: stableId('ARF', `${input.category}:${input.title}:${input.affectedNodeIds.join(',')}:${input.affectedEdgeIds.join(',')}`), ...input };
}

function recommendation(input: Omit<ReviewRecommendation, 'id'>): ReviewRecommendation {
  return { id: stableId('ARR', `${input.title}:${input.findingIds.join(',')}:${input.affectedObjectIds.join(',')}`), ...input };
}

function generatedAdr(input: Omit<GeneratedReviewAdr, 'id' | 'status'>): GeneratedReviewAdr {
  return { id: stableId('ADR-REVIEW', `${input.title}:${input.impactedComponentIds.join(',')}`), status: 'proposed', ...input };
}

function fitnessTest(input: Omit<GeneratedFitnessTest, 'id'>): GeneratedFitnessTest {
  return { id: stableId('FIT-REVIEW', `${input.title}:${input.relatedFindingIds.join(',')}`), ...input };
}

function detectReviewFindings(project: ArchitectureProject, library: KnowledgeLibrary): ReviewFinding[] {
  const findings: ReviewFinding[] = [];
  const services = nodesOf(project, ['LogicalService', 'ApplicationComponent', 'Module']);
  const apis = nodesOf(project, ['API', 'Interface']);
  const events = nodesOf(project, ['Event']);
  const stores = nodesOf(project, ['DataStore']);
  const deploymentNodes = nodesOf(project, ['DeploymentNode', 'Environment', 'Region', 'AvailabilityZone', 'NetworkZone']);
  const controls = nodesOf(project, ['Control']);
  const externalSystems = nodesOf(project, ['ExternalSystem']);
  const deployables = nodesOf(project, ['DeployableUnit', 'Runtime']);
  const topDrivers = project.qualityPriorities.filter((driver) => driver.weight >= 4).map((driver) => driver.attributeId.toLowerCase());
  const securityExpected = topDrivers.some((driver) => ['security', 'privacy', 'auditability'].includes(driver));
  const resilienceExpected = topDrivers.some((driver) => ['availability', 'recoverability', 'resilience'].includes(driver));

  const validationFindings = validateProject(project).filter((item) => item.severity === 'HARD' || item.severity === 'SIGNIFICANT');
  for (const item of validationFindings.slice(0, 6)) {
    findings.push(finding({
      category: 'architecture-completeness',
      severity: item.severity === 'HARD' ? 'high' : 'medium',
      title: item.title,
      issue: item.message,
      whyItMatters: item.rationale,
      recommendedFix: item.mitigations[0] ?? 'Resolve the validation issue before final architecture handoff.',
      affectedNodeIds: item.affectedNodeIds,
      affectedEdgeIds: item.affectedEdgeIds,
      supportingEvidenceIds: [],
      generatedAction: 'Open deterministic validation item and remediate or record an explicit waiver.',
    }));
  }

  if (!project.objectives.length || !project.constraints.length || !project.qualityScenarios.length) {
    findings.push(finding({
      category: 'architecture-completeness',
      severity: 'high',
      title: 'Architecture intent is not complete enough for governed review',
      issue: 'Objectives, constraints or measurable quality scenarios are missing.',
      whyItMatters: 'The review engine can only evaluate trade-offs against explicit drivers and scenarios.',
      recommendedFix: 'Complete the brief, define top quality drivers and add at least one measurable quality scenario.',
      affectedNodeIds: [],
      affectedEdgeIds: [],
      supportingEvidenceIds: [],
      generatedAction: 'Return to the guided journey or Design Brief Studio and complete driver extraction.',
    }));
  }

  if (!project.decisions.length) {
    findings.push(finding({
      category: 'decision-quality',
      severity: 'high',
      title: 'No Architecture Decision Records captured',
      issue: 'The design has no recorded ADRs for its major choices.',
      whyItMatters: 'A global enterprise review needs decision rationale, alternatives and consequences before implementation handoff.',
      recommendedFix: 'Generate ADRs for style, integration, data ownership, resilience and security decisions.',
      affectedNodeIds: [],
      affectedEdgeIds: [],
      supportingEvidenceIds: [],
      generatedAction: 'Create review-generated ADRs from the highest-risk findings.',
    }));
  }

  for (const service of services) {
    const owner = propText(service, ['owner', 'team', 'serviceOwner']);
    const boundedContext = propText(service, ['boundedContext', 'domain', 'context']);
    if (!owner || !boundedContext) {
      findings.push(finding({
        category: 'architecture-completeness',
        severity: 'medium',
        title: `Service boundary metadata missing for ${service.label}`,
        issue: `${service.label} does not declare both ownership and bounded-context metadata.`,
        whyItMatters: 'Services without clear ownership or bounded context tend to become unclear integration points or distributed-monolith boundaries.',
        recommendedFix: 'Declare owner/team and bounded context for the service; split or rename if the responsibility is unclear.',
        affectedNodeIds: [service.id],
        affectedEdgeIds: [],
        supportingEvidenceIds: patternIdsByTerms(library, ['domain', 'bounded context', 'modular']),
        generatedAction: 'Open object inspector and add owner plus bounded-context properties.',
      }));
    }
  }

  for (const api of apis) {
    const auth = propText(api, ['authentication', 'auth', 'authorization']);
    const contract = propText(api, ['contract', 'openapi', 'schema', 'version']);
    const rateLimit = propText(api, ['rateLimit', 'quota', 'throttling']);
    if (!auth || !contract || !rateLimit) {
      findings.push(finding({
        category: 'security',
        severity: securityExpected ? 'high' : 'medium',
        title: `API control metadata incomplete for ${api.label}`,
        issue: `${api.label} does not declare authentication, contract/versioning and rate-limit assumptions.`,
        whyItMatters: 'Public or partner APIs become difficult to govern, test and protect without explicit API control metadata.',
        recommendedFix: 'Define authentication, authorization, OpenAPI/contract path, versioning and rate-limit policy.',
        affectedNodeIds: [api.id],
        affectedEdgeIds: [],
        supportingEvidenceIds: patternIdsByTerms(library, ['api gateway', 'rate limiting', 'zero trust', 'least privilege']),
        generatedAction: 'Create API governance ADR and corresponding CI fitness test.',
      }));
    }
  }

  for (const event of events) {
    const retry = propText(event, ['retryPolicy', 'retry', 'maxAttempts']);
    const dlq = propText(event, ['deadLetterQueue', 'dlq', 'deadLetter']);
    const idem = propText(event, ['idempotency', 'idempotencyKey', 'deduplication']);
    if (!retry || !dlq || !idem) {
      findings.push(finding({
        category: 'resilience',
        severity: resilienceExpected ? 'high' : 'medium',
        title: `Event reliability controls missing for ${event.label}`,
        issue: `${event.label} does not fully specify retry, dead-letter and idempotency policy.`,
        whyItMatters: 'Event-driven systems need failure handling and replay safety to avoid duplicate processing, silent loss or operational incidents.',
        recommendedFix: 'Add retry policy, dead-letter handling, idempotency key and replay/reconciliation expectations.',
        affectedNodeIds: [event.id],
        affectedEdgeIds: [],
        supportingEvidenceIds: patternIdsByTerms(library, ['outbox', 'publish subscribe', 'dead letter', 'idempotent']),
        generatedAction: 'Generate event reliability ADR and CI fitness tests for consumers.',
      }));
    }
  }

  for (const store of stores) {
    const encryption = propText(store, ['encryption', 'encryptedAtRest', 'kms']);
    const backup = propText(store, ['backup', 'retention', 'rpo']);
    const consistency = propText(store, ['consistency', 'consistencyModel', 'transactionBoundary']);
    if (!encryption || !backup || !consistency) {
      findings.push(finding({
        category: 'data-flow',
        severity: securityExpected || resilienceExpected ? 'high' : 'medium',
        title: `Data-store controls incomplete for ${store.label}`,
        issue: `${store.label} does not declare encryption, backup/recovery and consistency expectations.`,
        whyItMatters: 'Data stores are high-impact assets. Weak data-control metadata hides compliance, recovery and consistency risk.',
        recommendedFix: 'Define encryption/KMS, backup retention/RPO, consistency model and ownership.',
        affectedNodeIds: [store.id],
        affectedEdgeIds: [],
        supportingEvidenceIds: patternIdsByTerms(library, ['database per service', 'cqrs', 'audit trail', 'backup']),
        generatedAction: 'Create data ownership and recovery fitness tests.',
      }));
    }
  }

  const integrationEdges = project.edges.filter((edge) => ['communicatesWith', 'publishes', 'subscribes', 'dependsOn'].includes(edge.kind));
  for (const edge of integrationEdges) {
    const source = project.nodes.find((node) => node.id === edge.sourceId);
    const target = project.nodes.find((node) => node.id === edge.targetId);
    const touchesExternal = Boolean(source && externalSystems.some((item) => item.id === source.id)) || Boolean(target && externalSystems.some((item) => item.id === target.id));
    const protocol = edge.label || edgePropText(edge, ['protocol', 'transport', 'contract']);
    const timeout = edgePropText(edge, ['timeout', 'timeoutMs', 'sla']);
    const failure = edgePropText(edge, ['failurePolicy', 'fallback', 'circuitBreaker']);
    if (touchesExternal && (!protocol || !timeout || !failure)) {
      findings.push(finding({
        category: 'integration',
        severity: 'high',
        title: `External integration policy missing for ${source?.label ?? edge.sourceId} → ${target?.label ?? edge.targetId}`,
        issue: 'An external dependency/integration lacks protocol, timeout and failure-policy metadata.',
        whyItMatters: 'External systems fail independently; without timeout and fallback policies they can cascade failures into the product boundary.',
        recommendedFix: 'Declare protocol/contract, timeout, retry/circuit-breaker and ownership for the integration.',
        affectedNodeIds: [edge.sourceId, edge.targetId],
        affectedEdgeIds: [edge.id],
        supportingEvidenceIds: patternIdsByTerms(library, ['circuit breaker', 'bulkhead', 'anti corruption', 'gateway']),
        generatedAction: 'Generate integration-risk ADR and fitness test for every external dependency.',
      }));
    }
  }

  const storesByReader = new Map<string, Set<string>>();
  for (const edge of project.edges.filter((item) => ['reads', 'writes', 'stores'].includes(item.kind))) {
    const target = project.nodes.find((node) => node.id === edge.targetId);
    if (!target || target.kind !== 'DataStore') continue;
    const source = project.nodes.find((node) => node.id === edge.sourceId);
    if (!source || !['LogicalService', 'ApplicationComponent', 'Module'].includes(source.kind)) continue;
    if (!storesByReader.has(target.id)) storesByReader.set(target.id, new Set());
    storesByReader.get(target.id)!.add(source.id);
  }
  for (const [storeId, serviceIds] of storesByReader.entries()) {
    if (serviceIds.size >= 2) {
      const store = project.nodes.find((node) => node.id === storeId);
      findings.push(finding({
        category: 'anti-pattern',
        severity: 'high',
        title: `Potential shared-database / distributed-monolith risk at ${store?.label ?? storeId}`,
        issue: `${serviceIds.size} services/components access the same datastore directly.`,
        whyItMatters: 'Shared database ownership couples services and undermines independent deployability, data ownership and change safety.',
        recommendedFix: 'Clarify data ownership; introduce service-owned schemas, APIs/events, CQRS/read models or an anti-corruption layer where justified.',
        affectedNodeIds: [storeId, ...serviceIds],
        affectedEdgeIds: project.edges.filter((edge) => edge.targetId === storeId && serviceIds.has(edge.sourceId)).map((edge) => edge.id),
        supportingEvidenceIds: patternIdsByTerms(library, ['database per service', 'anti corruption', 'cqrs', 'modular monolith']),
        generatedAction: 'Open a data ownership ADR and split direct writes from read-model use.',
      }));
    }
  }

  if (deployables.length && !deploymentNodes.length) {
    findings.push(finding({
      category: 'deployment',
      severity: 'high',
      title: 'Deployment topology is not represented',
      issue: 'Deployable units or runtimes exist without deployment nodes, environments, regions or network zones.',
      whyItMatters: 'Implementation teams need deployment topology to reason about blast radius, resilience, latency, security zones and operations.',
      recommendedFix: 'Add environment, region/zone, network boundary and deployment-node mapping.',
      affectedNodeIds: deployables.map((node) => node.id),
      affectedEdgeIds: [],
      supportingEvidenceIds: patternIdsByTerms(library, ['deployment', 'cell', 'availability zone', 'bulkhead']),
      generatedAction: 'Generate deployment-readiness fitness tests and a deployment topology view.',
    }));
  }

  if (securityExpected && !controls.length) {
    findings.push(finding({
      category: 'security',
      severity: 'critical',
      title: 'Security controls are not explicitly modelled',
      issue: 'Security/privacy/auditability is a top driver, but the architecture has no Control nodes.',
      whyItMatters: 'Security requirements must be visible as architecture controls before approval, especially for regulated and global deployments.',
      recommendedFix: 'Model authentication, authorization, audit, secrets, encryption and boundary controls as first-class architecture objects.',
      affectedNodeIds: [],
      affectedEdgeIds: [],
      supportingEvidenceIds: patternIdsByTerms(library, ['zero trust', 'least privilege', 'audit trail', 'secure defaults']),
      generatedAction: 'Create security-control ADR and required-control fitness tests.',
    }));
  }

  if (resilienceExpected && project.serviceLevelObjectives.length === 0 && !project.context.availabilityTarget && !project.context.recoveryObjectives) {
    findings.push(finding({
      category: 'resilience',
      severity: 'high',
      title: 'Resilience targets are not testable',
      issue: 'Availability/recoverability is a top driver, but no SLO, availability target or recovery objective is defined.',
      whyItMatters: 'Without measurable resilience targets, design choices cannot be validated or monitored after deployment.',
      recommendedFix: 'Define SLOs, RTO/RPO and failure-mode expectations for critical user journeys.',
      affectedNodeIds: [],
      affectedEdgeIds: [],
      supportingEvidenceIds: patternIdsByTerms(library, ['slo', 'bulkhead', 'circuit breaker', 'health check']),
      generatedAction: 'Generate resilience scorecard and CI/runtime fitness checks.',
    }));
  }

  if (project.patternSelections.filter((selection) => selection.status === 'accepted').length === 0) {
    findings.push(finding({
      category: 'pattern-fit',
      severity: 'medium',
      title: 'No approved architecture pattern selected',
      issue: 'The design has not accepted any governed Pattern DNA record.',
      whyItMatters: 'Pattern selections provide traceable design intent, obligations and fitness-test mappings.',
      recommendedFix: 'Review pattern recommendations and accept or reject relevant patterns with rationale.',
      affectedNodeIds: [],
      affectedEdgeIds: [],
      supportingEvidenceIds: patternIdsByTerms(library, ['architecture', 'pattern']),
      generatedAction: 'Open Pattern Intelligence and select applicable pattern decisions.',
    }));
  }

  return [...new Map(findings.map((item) => [item.id, item])).values()].slice(0, 24);
}

function scoreDimension(id: ReviewDimensionId, label: string, base: number, findings: ReviewFinding[], categories: ReviewCategory[], evidence: string[]): ReviewScorecardDimension {
  const penalty = findings.filter((finding) => categories.includes(finding.category)).reduce((sum, finding) => sum + severityRank(finding.severity), 0);
  const score = Math.max(0, Math.min(100, Math.round(base - penalty)));
  return {
    id,
    label,
    score,
    status: score >= 75 ? 'strong' : score >= 55 ? 'watch' : 'weak',
    rationale: score >= 75 ? `${label} is in a usable review posture.` : score >= 55 ? `${label} needs targeted improvement before handoff.` : `${label} is weak and should block production handoff until remediated.`,
    evidence,
  };
}

function buildScorecard(project: ArchitectureProject, findings: ReviewFinding[], library: KnowledgeLibrary): ReviewScorecardDimension[] {
  const acceptedPatterns = acceptedPatternRecords(project, library).map((pattern) => pattern.id);
  const acceptedStyles = project.styleDecisions.filter((style) => style.status === 'accepted').map((style) => style.styleId);
  const decisionEvidence = project.decisions.slice(0, 4).map((decision) => decision.id);
  return [
    scoreDimension('completeness', 'Architecture Completeness', 88, findings, ['architecture-completeness'], ['objectives', 'constraints', 'quality-scenarios']),
    scoreDimension('patternAlignment', 'Pattern Alignment', acceptedPatterns.length ? 86 : 70, findings, ['pattern-fit', 'anti-pattern'], acceptedPatterns),
    scoreDimension('riskPosture', 'Risk Posture', 82, findings, ['anti-pattern', 'integration', 'data-flow'], [...acceptedPatterns, ...decisionEvidence]),
    scoreDimension('securityReadiness', 'Security Readiness', 86, findings, ['security'], patternIdsByTerms(library, ['zero trust', 'least privilege', 'audit trail'])),
    scoreDimension('resilienceReadiness', 'Resilience Readiness', 84, findings, ['resilience'], patternIdsByTerms(library, ['circuit breaker', 'bulkhead', 'outbox', 'health check'])),
    scoreDimension('operationalReadiness', 'Operational Readiness', project.runtimeInventories.length || project.serviceLevelObjectives.length ? 84 : 76, findings, ['operations', 'deployment'], ['runtime-inventory', 'slo', 'deployment-topology']),
    scoreDimension('decisionQuality', 'Decision Quality', project.decisions.length ? 88 : 68, findings, ['decision-quality'], decisionEvidence),
    scoreDimension('deliveryReadiness', 'Delivery Readiness', acceptedStyles.length || acceptedPatterns.length ? 82 : 72, findings, ['architecture-completeness', 'deployment', 'decision-quality'], [...acceptedStyles, ...acceptedPatterns]),
  ];
}

function buildRecommendations(findings: ReviewFinding[]): ReviewRecommendation[] {
  const groups: Array<{ key: string; categories: ReviewCategory[]; title: string; decision: string; alternatives: string[]; tradeoffs: string[]; implication: string }> = [
    { key: 'security', categories: ['security'], title: 'Establish explicit API and security-control architecture', decision: 'Adopt explicit security-control modelling for APIs, trust boundaries, identity, secrets, rate limits and audit trails.', alternatives: ['Leave controls in implementation tickets only', 'Document controls in a separate security document'], tradeoffs: ['More modelling work up front', 'Improves reviewability, CI controls and audit readiness'], implication: 'Add Control nodes, API metadata, security ADRs and CI checks for authentication, authorization and rate limits.' },
    { key: 'resilience', categories: ['resilience'], title: 'Make resilience measurable and enforceable', decision: 'Define retry, dead-letter, idempotency, SLO, RTO/RPO and failure-mode policies for critical flows.', alternatives: ['Rely on platform defaults', 'Handle failures manually through operations runbooks'], tradeoffs: ['Requires explicit operational policy', 'Reduces incident ambiguity and replay risk'], implication: 'Attach event-reliability metadata and generate CI/runtime fitness tests.' },
    { key: 'data', categories: ['data-flow', 'anti-pattern'], title: 'Clarify data ownership and consistency boundaries', decision: 'Assign data ownership and avoid ungoverned shared-database access across service boundaries.', alternatives: ['Keep a shared operational datastore', 'Use read-only replicas without ownership clarity'], tradeoffs: ['May require schema/service refactoring', 'Improves independent deployability and audit clarity'], implication: 'Create data ownership ADR, update relationships and add fitness tests preventing direct private database access.' },
    { key: 'integration', categories: ['integration'], title: 'Govern external integration failure policies', decision: 'Every external integration must declare protocol, contract, timeout, retry/circuit-breaker and fallback policy.', alternatives: ['Treat external dependencies as standard API calls', 'Push failure policy into code conventions only'], tradeoffs: ['More metadata to maintain', 'Prevents hidden cascading failure risk'], implication: 'Update integration edges and create conformance checks for integration metadata.' },
    { key: 'delivery', categories: ['architecture-completeness', 'deployment', 'decision-quality', 'pattern-fit'], title: 'Complete architecture handoff readiness baseline', decision: 'Require complete brief, accepted pattern/style decisions, deployment topology and ADR baseline before implementation handoff.', alternatives: ['Proceed with incomplete review and fill gaps during delivery', 'Use design review meeting notes only'], tradeoffs: ['May slow initial handoff', 'Improves delivery clarity and reduces architecture drift'], implication: 'Generate review ADRs, deployment-readiness tests and a handoff pack from the canonical review.' },
  ];

  return groups.flatMap((group) => {
    const scoped = findings.filter((finding) => group.categories.includes(finding.category));
    if (!scoped.length) return [];
    const highest = scoped.some((item) => ['critical', 'high'].includes(item.severity));
    return [recommendation({
      findingIds: scoped.map((finding) => finding.id),
      title: group.title,
      recommendedDecision: group.decision,
      alternativesConsidered: group.alternatives,
      tradeoffs: group.tradeoffs,
      riskImpact: highest ? 'High-risk findings are reduced from review blockers to controlled implementation obligations.' : 'Medium-risk findings become explicit delivery controls.',
      implementationImplication: group.implication,
      affectedObjectIds: [...new Set(scoped.flatMap((finding) => [...finding.affectedNodeIds, ...finding.affectedEdgeIds]))],
      confidence: highest ? 'high' : 'medium',
      evidenceIds: [...new Set(scoped.flatMap((finding) => finding.supportingEvidenceIds))],
      shouldBecomeAdr: true,
    })];
  });
}

function buildAdrs(recommendations: ReviewRecommendation[], findings: ReviewFinding[]): GeneratedReviewAdr[] {
  return recommendations.filter((item) => item.shouldBecomeAdr).map((item) => {
    const scoped = findings.filter((finding) => item.findingIds.includes(finding.id));
    return generatedAdr({
      title: item.title,
      context: `The architecture review found ${scoped.length} related issue(s): ${scoped.map((finding) => finding.title).join('; ')}.`,
      decision: item.recommendedDecision,
      alternatives: item.alternativesConsidered,
      consequences: [...item.tradeoffs, item.implementationImplication],
      risks: scoped.map((finding) => finding.whyItMatters),
      impactedComponentIds: item.affectedObjectIds,
      linkedPatternIds: item.evidenceIds.filter((id) => id.startsWith('PAT') || id.startsWith('TPL')),
      reviewEvidenceIds: item.evidenceIds,
    });
  });
}

function buildFitnessTests(findings: ReviewFinding[]): GeneratedFitnessTest[] {
  const tests: GeneratedFitnessTest[] = [];
  const add = (title: string, assertion: string, scope: GeneratedFitnessTest['scope'], severity: ReviewSeverity, related: ReviewFinding[]) => {
    if (!related.length) return;
    tests.push(fitnessTest({ title, assertion, scope, severity, relatedFindingIds: related.map((finding) => finding.id), evidenceIds: [...new Set(related.flatMap((finding) => finding.supportingEvidenceIds))] }));
  };
  add('Every public or partner API declares authentication, contract and rate-limit policy', 'For each API/Interface node, authentication, contract/openapi and rateLimit metadata must be present before approval.', 'architecture-model', 'high', findings.filter((item) => item.category === 'security'));
  add('Every event consumer has retry, dead-letter and idempotency handling', 'For each Event node, retryPolicy, deadLetterQueue and idempotency metadata must be defined and mapped to repository/runtime evidence.', 'ci-fitness-loop', 'high', findings.filter((item) => item.category === 'resilience'));
  add('No service directly writes another service-owned private datastore', 'Direct reads/writes/stores relationships to a DataStore from multiple services require an approved data-ownership ADR or read-model designation.', 'architecture-model', 'high', findings.filter((item) => item.category === 'anti-pattern' || item.category === 'data-flow'));
  add('Every external integration declares timeout and failure policy', 'External integration edges must include protocol/contract, timeout and failurePolicy metadata.', 'repository-evidence', 'high', findings.filter((item) => item.category === 'integration'));
  add('Deployment topology exists for every deployable unit', 'Each DeployableUnit or Runtime must map to an Environment/DeploymentNode/Region/Zone before implementation handoff.', 'architecture-model', 'medium', findings.filter((item) => item.category === 'deployment'));
  add('Major architecture choices have ADR coverage', 'Each accepted style, accepted pattern and high-risk review recommendation must have a proposed or accepted ADR.', 'architecture-model', 'medium', findings.filter((item) => item.category === 'decision-quality' || item.category === 'pattern-fit'));
  return tests;
}

export function runArchitectureReview(project: ArchitectureProject, library: KnowledgeLibrary): ArchitectureReview {
  const now = new Date().toISOString();
  const contextual = recommendInContext(project, library, { stage: project.activeStage, trigger: 'canvas-change' });
  const findings = detectReviewFindings(project, library);
  const scorecard = buildScorecard(project, findings, library);
  const recommendations = buildRecommendations(findings);
  const generatedAdrs = buildAdrs(recommendations, findings);
  const fitnessTests = buildFitnessTests(findings);
  const deliveryReadinessScore = Math.round(scorecard.reduce((sum, item) => sum + item.score, 0) / scorecard.length);
  const blockers = findings.filter((finding) => finding.severity === 'critical' || finding.severity === 'high').length;
  const strengths = scorecard.filter((dimension) => dimension.status === 'strong').map((dimension) => dimension.label);
  const weak = scorecard.filter((dimension) => dimension.status === 'weak').map((dimension) => dimension.label);
  return {
    id: stableId('ARRUN', `${project.id}:${project.revision}:${now.slice(0, 13)}`),
    projectId: project.id,
    projectName: project.name,
    generatedAt: now,
    knowledgeReleaseId: library.knowledgeReleaseId ?? library.version,
    deliveryReadinessScore,
    executiveSummary: blockers
      ? `This architecture is ${deliveryReadinessScore}% delivery-ready. It has ${blockers} high/critical review blocker(s). Strong areas: ${strengths.join(', ') || 'none yet'}. Weak areas: ${weak.join(', ') || 'none, but targeted remediation is still recommended'}.`
      : `This architecture is ${deliveryReadinessScore}% delivery-ready. No high/critical blockers were detected; continue with ADR finalization, conformance mapping and handoff packaging.`,
    scorecard,
    findings,
    recommendations,
    generatedAdrs,
    fitnessTests,
    authority: {
      deterministicKernel: true,
      llmMayScore: defaultAuthorityBoundary.llmMayScore,
      llmMayMutateArchitecture: defaultAuthorityBoundary.llmMayMutateArchitecture,
      candidateKnowledgeMayInfluenceProduction: defaultAuthorityBoundary.candidateKnowledgeMayInfluenceProduction,
      humanApprovalRequired: defaultAuthorityBoundary.proposedChangeSetsRequireApproval,
    },
    pipeline: [
      'Canonical Architecture Model',
      'Deterministic Review Engine',
      'Pattern DNA / Knowledge Release Evaluation',
      'Findings',
      'Recommendations',
      'Generated ADRs',
      'Fitness Tests',
      'Review Scorecard',
    ],
  };
}

export function reviewToArchitectureDecisions(review: ArchitectureReview): ArchitectureDecision[] {
  return review.generatedAdrs.map((adr) => ({
    id: adr.id,
    title: adr.title,
    context: adr.context,
    decision: adr.decision,
    drivers: adr.reviewEvidenceIds,
    consideredOptions: adr.alternatives,
    consequences: adr.consequences,
    status: 'proposed',
    createdAt: review.generatedAt,
    linkedRecordIds: adr.reviewEvidenceIds,
    scopeNodeId: adr.impactedComponentIds[0],
  }));
}
