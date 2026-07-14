import type { ArchitectureEdge, ArchitectureNode, ArchitectureProject, KnowledgeLibrary } from '@aiw/domain';
import { analyseArchitectureGraph } from './graphAnalysis.js';
import { simulateQualityScenarios } from './scenarioSimulation.js';

export interface SddSection {
  id: string;
  title: string;
  markdown: string[];
}

const stageLabels: Record<string, string> = {
  designIntent: 'Requirements and intent',
  logicalApplication: 'Logical application',
  applicationRealization: 'Application realization',
  logicalTechnology: 'Logical technology',
  physicalTechnology: 'Physical technology',
  validationRealization: 'Review and assurance',
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function normaliseProjectForSdd(project: ArchitectureProject): ArchitectureProject {
  const source = project as ArchitectureProject & Record<string, unknown>;
  const security = (source.securitySettings ?? {}) as unknown as Record<string, unknown>;
  const branch = (source.branch ?? {}) as unknown as Record<string, unknown>;
  const nodes = asArray<ArchitectureNode>(source.nodes).map((node) => ({
    ...node,
    properties: node.properties ?? {},
    tags: asArray<string>(node.tags),
    lineageFrom: asArray<string>(node.lineageFrom),
    status: node.status ?? 'proposed',
  }));
  const edges = asArray<ArchitectureEdge>(source.edges).map((edge) => ({
    ...edge,
    properties: edge.properties ?? {},
  }));

  return {
    ...project,
    id: typeof source.id === 'string' && source.id ? source.id : 'unidentified-project',
    tenantId: typeof source.tenantId === 'string' && source.tenantId ? source.tenantId : 'unassigned-tenant',
    revision: typeof source.revision === 'number' && Number.isFinite(source.revision) ? source.revision : 0,
    branch: {
      ...branch,
      id: typeof branch.id === 'string' && branch.id ? branch.id : 'main',
      name: typeof branch.name === 'string' && branch.name ? branch.name : 'main',
    } as ArchitectureProject['branch'],
    context: (source.context && typeof source.context === 'object' ? source.context : {}) as ArchitectureProject['context'],
    objectives: asArray<string>(source.objectives),
    constraints: asArray<string>(source.constraints),
    assumptions: asArray<string>(source.assumptions),
    qualityPriorities: asArray<ArchitectureProject['qualityPriorities'][number]>(source.qualityPriorities),
    qualityScenarios: asArray<ArchitectureProject['qualityScenarios'][number]>(source.qualityScenarios),
    nodes,
    edges,
    interfaces: asArray<NonNullable<ArchitectureProject['interfaces']>[number]>(source.interfaces),
    architectureViews: asArray<NonNullable<ArchitectureProject['architectureViews']>[number]>(source.architectureViews),
    architectureViewVersions: asArray<NonNullable<ArchitectureProject['architectureViewVersions']>[number]>(source.architectureViewVersions),
    styleDecisions: asArray<ArchitectureProject['styleDecisions'][number]>(source.styleDecisions),
    patternSelections: asArray<ArchitectureProject['patternSelections'][number]>(source.patternSelections).map((selection) => ({
      ...selection,
      obligationsAcknowledged: asArray<string>(selection.obligationsAcknowledged),
    })),
    decisions: asArray<ArchitectureProject['decisions'][number]>(source.decisions).map((decision) => ({
      ...decision,
      consequences: asArray<string>(decision.consequences),
    })),
    findings: asArray<ArchitectureProject['findings'][number]>(source.findings).map((finding) => ({
      ...finding,
      affectedNodeIds: asArray<string>(finding.affectedNodeIds),
      affectedEdgeIds: asArray<string>(finding.affectedEdgeIds),
      mitigations: asArray<string>(finding.mitigations),
    })),
    aiReviewHistory: asArray<ArchitectureProject['aiReviewHistory'][number]>(source.aiReviewHistory),
    reviewAssignments: asArray<ArchitectureProject['reviewAssignments'][number]>(source.reviewAssignments),
    stageApprovals: asArray<ArchitectureProject['stageApprovals'][number]>(source.stageApprovals),
    policyGates: asArray<ArchitectureProject['policyGates'][number]>(source.policyGates),
    repositoryPullRequests: asArray<ArchitectureProject['repositoryPullRequests'][number]>(source.repositoryPullRequests),
    runtimeInventories: asArray<ArchitectureProject['runtimeInventories'][number]>(source.runtimeInventories),
    deploymentProfiles: asArray<ArchitectureProject['deploymentProfiles'][number]>(source.deploymentProfiles),
    serviceLevelObjectives: asArray<ArchitectureProject['serviceLevelObjectives'][number]>(source.serviceLevelObjectives),
    technicalDebtItems: asArray<ArchitectureProject['technicalDebtItems'][number]>(source.technicalDebtItems),
    members: asArray<ArchitectureProject['members'][number]>(source.members),
    identityProviders: asArray<ArchitectureProject['identityProviders'][number]>(source.identityProviders),
    securitySettings: {
      ...security,
      requireSso: Boolean(security.requireSso),
      allowDevelopmentAuth: security.allowDevelopmentAuth === undefined ? true : Boolean(security.allowDevelopmentAuth),
      sessionMaxAgeMinutes: typeof security.sessionMaxAgeMinutes === 'number' ? security.sessionMaxAgeMinutes : 0,
      auditRetentionDays: typeof security.auditRetentionDays === 'number' ? security.auditRetentionDays : 0,
      encryptionKeyReference: typeof security.encryptionKeyReference === 'string' && security.encryptionKeyReference ? security.encryptionKeyReference : 'Not configured',
    } as ArchitectureProject['securitySettings'],
  } as ArchitectureProject;
}

function text(value: unknown, fallback = 'Not specified'): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value) && value.length) return value.map((item) => text(item, '')).filter(Boolean).join(', ');
  return fallback;
}

function md(value: unknown): string {
  return text(value, '—').replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function property(node: ArchitectureNode, names: string[]): string {
  const entry = Object.entries(node.properties).find(([key, value]) => names.some((name) => key.toLowerCase().includes(name)) && text(value, '').length > 0);
  return entry ? text(entry[1]) : '—';
}

function nodeName(project: ArchitectureProject, id: string): string {
  return project.nodes.find((node) => node.id === id)?.label ?? id;
}

function stageNodes(project: ArchitectureProject, stage: string): ArchitectureNode[] {
  return project.nodes.filter((node) => node.stage === stage && node.status !== 'deprecated');
}

function edgesForStage(project: ArchitectureProject, stage: string): ArchitectureEdge[] {
  return project.edges.filter((edge) => edge.stage === stage);
}

function list(items: string[], fallback = '- None recorded.'): string[] {
  return items.length ? items.map((item) => `- ${item}`) : [fallback];
}

function table(headers: string[], rows: string[][], empty: string): string[] {
  return [
    `| ${headers.join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...(rows.length ? rows.map((row) => `| ${row.map(md).join(' | ')} |`) : [`| ${[empty, ...headers.slice(1).map(() => '—')].join(' | ')} |`]),
  ];
}

function interfaceRows(project: ArchitectureProject): string[][] {
  if ((project.interfaces ?? []).length) {
    return (project.interfaces ?? []).map((contract) => [
      contract.id,
      nodeName(project, contract.providerNodeId),
      contract.interactionStyle,
      contract.consumerNodeIds.map((id) => nodeName(project, id)).join('; '),
      `${contract.operationOrEvent} · v${contract.version}`,
      contract.protocol,
      `${contract.authentication}; ${contract.authorization}`,
      `timeout=${contract.timeoutMs ?? '—'}ms; ${contract.retryPolicy}; idempotency=${contract.idempotency}; DLQ=${contract.deadLetterPolicy}`,
      contract.owner,
    ]);
  }
  return project.edges
    .filter((edge) => ['communicatesWith', 'publishes', 'subscribes', 'dependsOn', 'reads', 'writes', 'stores'].includes(edge.kind))
    .map((edge) => [
      edge.id,
      nodeName(project, edge.sourceId),
      edge.kind,
      nodeName(project, edge.targetId),
      edge.label ?? text(edge.properties.contract ?? edge.properties.api ?? edge.properties.event),
      text(edge.properties.protocol),
      text(edge.properties.authentication ?? edge.properties.auth),
      text(edge.properties.timeout ?? edge.properties.failurePolicy ?? edge.properties.retry),
      text(edge.properties.owner ?? edge.properties.team),
    ]);
}

function dataNodes(project: ArchitectureProject): ArchitectureNode[] {
  return project.nodes.filter((node) => ['DataDomain', 'DataEntity', 'DataStore'].includes(node.kind));
}

function controlNodes(project: ArchitectureProject): ArchitectureNode[] {
  return project.nodes.filter((node) => node.kind === 'Control' || /identity|security|iam|encrypt|secret|policy|firewall|gateway/i.test(`${node.label} ${node.description ?? ''}`));
}

function transitionNodes(project: ArchitectureProject): ArchitectureNode[] {
  return project.nodes.filter((node) => /legacy|existing|migration|strangler|coexist|transition/i.test(`${node.label} ${node.description ?? ''} ${node.tags.join(' ')}`));
}

function acceptedStyleRows(project: ArchitectureProject, library: KnowledgeLibrary): string[][] {
  return project.styleDecisions.filter((item) => item.status === 'accepted').map((item) => {
    const record = library.architectureStyles.find((candidate) => candidate.id === item.styleId);
    return [record?.name ?? item.styleId, stageLabels[item.stage] ?? item.stage, item.scopeNodeId ? nodeName(project, item.scopeNodeId) : 'Project / view', item.rationale, (record?.obligations ?? []).map((obligation) => String(obligation)).filter(Boolean).join('; ') || '—'];
  });
}

function patternRows(project: ArchitectureProject, library: KnowledgeLibrary): string[][] {
  return project.patternSelections.filter((item) => item.status === 'accepted' || item.status === 'considering').map((item) => {
    const record = library.patterns.find((candidate) => candidate.id === item.patternId);
    const obligations = record?.obligations ?? [];
    const obligationNames = obligations.map((obligation) => String(obligation)).filter(Boolean);
    const open = obligationNames.filter((obligation) => !item.obligationsAcknowledged.includes(obligation));
    return [record?.name ?? item.patternId, item.status, stageLabels[item.stage] ?? item.stage, item.rationale || '—', item.obligationsAcknowledged.join('; ') || 'None', open.join('; ') || 'None'];
  });
}

function approvalRows(project: ArchitectureProject): string[][] {
  return project.stageApprovals.map((item) => [stageLabels[item.stage] ?? item.stage, item.status, item.reviewer ?? item.assignedReviewerId ?? '—', item.requestedAt ?? '—', item.decidedAt ?? '—', item.snapshotId ?? '—']);
}


function executiveSummary(project: ArchitectureProject, release: string): SddSection {
  const approvedStages = project.stageApprovals.filter((item) => item.status === 'approved').length;
  const openFindings = project.findings.length;
  const interfaces = project.interfaces?.length ?? 0;
  const estimatedMonthlyCost = project.nodes.reduce((sum, node) => sum + (typeof node.properties.expectedMonthlyCost === 'number' ? node.properties.expectedMonthlyCost : 0), 0);
  return {
    id: 'executive-summary',
    title: '2. Executive architecture summary',
    markdown: [
      project.description || 'No architecture summary has been recorded.',
      '',
      ...table(['Architecture measure', 'Current position'], [
        ['Canonical model', `${project.nodes.length} elements and ${project.edges.length} relationships`],
        ['Interfaces', `${interfaces} governed contracts`],
        ['Architecture direction', `${project.styleDecisions.filter((item) => item.status === 'accepted').length} accepted style decision(s); ${project.patternSelections.filter((item) => item.status === 'accepted' || item.status === 'considering').length} pattern selection(s)`],
        ['Quality scenarios', `${project.qualityScenarios.length} measurable scenario(s)`],
        ['Review posture', `${openFindings} persisted finding(s); ${approvedStages} approved lifecycle stage(s)`],
        ['Estimated monthly platform cost', estimatedMonthlyCost ? `${estimatedMonthlyCost.toLocaleString()} (model currency not asserted)` : 'Not calculated'],
        ['Knowledge authority', release],
      ], 'No architecture summary available'),
      '',
      '### Architecture direction',
      ...list(project.styleDecisions.filter((item) => item.status === 'accepted').map((item) => `${item.styleId}: ${item.rationale}`), '- No accepted architecture style decision.'),
      '',
      '### Material delivery risks',
      ...list([
        ...project.findings.filter((item) => item.severity === 'HARD' || item.severity === 'SIGNIFICANT').map((item) => `${item.severity}: ${item.title}`),
        ...(project.technicalDebtItems ?? []).filter((item) => item.status !== 'resolved').map((item) => `${item.severity}: ${item.title}`),
      ], '- No material persisted findings or technical-debt items recorded.'),
      '',
      '**Decision posture.** This SDD is generated from the current canonical model. Unapproved choices, missing evidence and unresolved controls remain visible and must not be treated as production acceptance.',
    ],
  };
}

function documentControl(project: ArchitectureProject, release: string): SddSection {
  return {
    id: 'document-control',
    title: '1. Document control',
    markdown: [
      ...table(['Field', 'Value'], [
        ['Document', `${project.name || 'Architecture'} — System Design Description`],
        ['Project ID', project.id],
        ['Tenant', project.tenantId],
        ['Branch', `${project.branch.name} (${project.branch.id})`],
        ['Revision', String(project.revision)],
        ['Knowledge release', release],
        ['Generated', new Date().toISOString()],
        ['Document status', project.stageApprovals.some((item) => item.stage === 'validationRealization' && item.status === 'approved') ? 'Approved baseline available' : 'Draft / not approved'],
      ], 'No document-control information'),
      '',
      '**Authority boundary.** This document is generated from the canonical AIW project model. Draft, proposed and unapproved records remain non-authoritative until the required human review and approval is recorded.',
    ],
  };
}

function purposeScope(project: ArchitectureProject): SddSection {
  const context = project.context ?? {};
  return {
    id: 'purpose-scope',
    title: '3. Purpose, outcomes and scope',
    markdown: [
      project.description || 'No problem statement has been recorded.',
      '',
      '### Business outcomes',
      ...list(project.objectives),
      '',
      '### In scope',
      ...list(context.inScopeCapabilities ?? []),
      '',
      '### Out of scope',
      ...list(context.outOfScopeCapabilities ?? []),
      '',
      '### Stakeholders and approvers',
      ...list(context.stakeholders ?? []),
    ],
  };
}

function constraintsContext(project: ArchitectureProject): SddSection {
  const context = project.context ?? {};
  return {
    id: 'constraints-context',
    title: '4. Constraints, assumptions and enterprise feasibility',
    markdown: [
      '### Constraints',
      ...list(project.constraints),
      '',
      '### Assumptions',
      ...list(project.assumptions),
      '',
      ...table(['Context dimension', 'Recorded position'], [
        ['Team size', text(context.teamSize)],
        ['Delivery horizon', context.deliveryHorizonMonths ? `${context.deliveryHorizonMonths} months` : 'Not specified'],
        ['Operational maturity', text(context.operationalMaturity)],
        ['Architecture experience', text(context.architectureExperience)],
        ['Change readiness', text(context.organizationalChangeReadiness)],
        ['Deployment model', text(context.deploymentModel)],
        ['Data sensitivity', text(context.dataSensitivity)],
        ['Regulatory exposure', text(context.regulatoryExposure)],
        ['Jurisdictions', text(context.regulatoryJurisdictions)],
        ['Sovereignty requirements', text(context.sovereigntyRequirements)],
        ['Existing systems', text(context.existingSystems)],
        ['Legacy constraints', text(context.legacyConstraints)],
        ['Transition state', text(context.transitionState)],
        ['Support model', text(context.supportModel)],
        ['Change cadence', text(context.changeCadence)],
        ['Peak-load variability', text(context.peakLoadVariability)],
        ['Reversibility preference', text(context.reversibilityPreference)],
      ], 'No enterprise-feasibility context'),
    ],
  };
}

function requirementsTrace(project: ArchitectureProject): SddSection {
  const rows = project.objectives.map((objective, index) => {
    const linkedNodes = project.nodes.filter((node) => node.lineageFrom.includes(`objective-${index + 1}`) || node.tags.some((tag) => objective.toLowerCase().includes(tag.toLowerCase())));
    return [`OBJ-${String(index + 1).padStart(3, '0')}`, objective, linkedNodes.map((node) => node.label).join('; ') || 'No explicit model lineage', linkedNodes.length ? 'Partially traced' : 'Trace required'];
  });
  return {
    id: 'requirements-traceability',
    title: '5. Requirements and traceability',
    markdown: [
      ...table(['ID', 'Requirement / objective', 'Model evidence', 'Status'], rows, 'No objectives captured'),
      '',
      '**Traceability rule.** Every material architecture object, decision and test should link to an objective, constraint, quality scenario, upstream model object or approved exception.',
    ],
  };
}

function qualityDrivers(project: ArchitectureProject, library: KnowledgeLibrary): SddSection {
  const verdicts = simulateQualityScenarios(project);
  const attributeName = (id: string) => library.qualityAttributes.find((item) => item.id === id)?.name ?? id;
  return {
    id: 'quality-drivers',
    title: '6. Architecture drivers and measurable quality scenarios',
    markdown: [
      ...table(['Quality attribute', 'Weight', 'Rationale'], project.qualityPriorities.filter((item) => item.weight > 0).sort((a, b) => b.weight - a.weight).map((item) => [attributeName(item.attributeId), `${item.weight}/5`, item.rationale ?? '—']), 'No quality priorities captured'),
      '',
      ...table(['Scenario', 'Attribute', 'Source', 'Stimulus', 'Environment', 'Artifact', 'Response', 'Measure', 'Assessment'], project.qualityScenarios.map((scenario, index) => {
        const verdict = verdicts.find((item) => item.scenarioId === scenario.id);
        return [`QS-${String(index + 1).padStart(3, '0')}`, attributeName(scenario.attributeId), scenario.source, scenario.stimulus, scenario.environment, scenario.artifact, scenario.response, scenario.responseMeasure, verdict ? `${verdict.verdict}: ${verdict.reasoning}` : 'Not assessed'];
      }), 'No measurable scenarios captured'),
    ],
  };
}

function decisionsAndPatterns(project: ArchitectureProject, library: KnowledgeLibrary): SddSection {
  return {
    id: 'decisions-patterns',
    title: '7. Architecture direction, decisions and pattern obligations',
    markdown: [
      '### Accepted architecture styles',
      ...table(['Style', 'Stage', 'Scope', 'Rationale', 'Library obligations'], acceptedStyleRows(project, library), 'No accepted style decision'),
      '',
      '### Selected patterns',
      ...table(['Pattern', 'Status', 'Stage', 'Rationale', 'Acknowledged obligations', 'Open obligations'], patternRows(project, library), 'No pattern selections'),
      '',
      '### Architecture decision records',
      ...table(['Decision', 'Status', 'Context', 'Decision', 'Consequences'], project.decisions.map((item) => [item.title, item.status, item.context, item.decision, item.consequences.join('; ') || '—']), 'No ADRs captured'),
    ],
  };
}

function modelSection(project: ArchitectureProject, stage: string, title: string, sectionId: string): SddSection {
  const nodes = stageNodes(project, stage);
  const edges = edgesForStage(project, stage);
  const diagramNames: Record<string, string> = {
    logicalApplication: 'logical-application-architecture.svg',
    applicationRealization: 'application-realization-architecture.svg',
    logicalTechnology: 'logical-technology-architecture.svg',
    physicalTechnology: 'physical-deployment-architecture.svg',
  };
  return {
    id: sectionId,
    title,
    markdown: [
      `![${title}](diagrams/${diagramNames[stage] ?? `${sectionId}.svg`})`,
      '',
      ...table(['Object', 'Kind', 'Responsibility / description', 'Owner', 'Lineage', 'Key properties'], nodes.map((node) => [node.label, node.kind, node.description ?? '—', property(node, ['owner', 'team', 'accountable']), node.lineageFrom.map((id) => nodeName(project, id)).join('; ') || '—', Object.entries(node.properties).slice(0, 8).map(([key, value]) => `${key}=${text(value)}`).join('; ') || '—']), 'No model objects captured'),
      '',
      '### Relationships',
      ...table(['Source', 'Relationship', 'Target', 'Contract / label', 'Properties'], edges.map((edge) => [nodeName(project, edge.sourceId), edge.kind, nodeName(project, edge.targetId), edge.label ?? '—', Object.entries(edge.properties).map(([key, value]) => `${key}=${text(value)}`).join('; ') || '—']), 'No relationships captured'),
    ],
  };
}

function interfaces(project: ArchitectureProject): SddSection {
  return {
    id: 'interfaces',
    title: '10. Interface, API and event contract register',
    markdown: [
      ...table(['ID', 'Source', 'Interaction', 'Target', 'Contract / event', 'Protocol', 'Authentication', 'Failure policy', 'Owner'], interfaceRows(project), 'No interface relationships captured'),
      '',
      '**Implementation expectation.** Every external or cross-boundary interaction should define ownership, contract/version, protocol, security, timeout, retry/idempotency and observability behaviour.',
    ],
  };
}

function dataArchitecture(project: ArchitectureProject): SddSection {
  const nodes = dataNodes(project);
  return {
    id: 'data-architecture',
    title: '11. Data architecture',
    markdown: [
      ...table(['Data object', 'Kind', 'Owner / system of record', 'Classification', 'Consistency', 'Encryption', 'Retention / backup', 'Residency'], nodes.map((node) => [node.label, node.kind, property(node, ['owner', 'systemofrecord', 'dataowner']), property(node, ['classification', 'sensitivity']), property(node, ['consistency']), property(node, ['encrypt']), property(node, ['retention', 'backup']), property(node, ['residency', 'region'])]), 'No data architecture objects captured'),
      '',
      '### Data flows',
      ...table(['Source', 'Operation', 'Target', 'Contract'], project.edges.filter((edge) => ['reads', 'writes', 'stores', 'publishes', 'subscribes'].includes(edge.kind)).map((edge) => [nodeName(project, edge.sourceId), edge.kind, nodeName(project, edge.targetId), edge.label ?? text(edge.properties.contract)]), 'No explicit data flows captured'),
    ],
  };
}

function securityArchitecture(project: ArchitectureProject): SddSection {
  const controls = controlNodes(project);
  return {
    id: 'security-architecture',
    title: '14. Security, privacy and trust architecture',
    markdown: [
      ...table(['Control / capability', 'Kind', 'Purpose', 'Owner', 'Trust zone / scope', 'Evidence'], controls.map((node) => [node.label, node.kind, node.description ?? '—', property(node, ['owner', 'team']), property(node, ['zone', 'scope', 'boundary']), property(node, ['evidence', 'standard', 'policy'])]), 'No explicit security-control objects captured'),
      '',
      ...table(['Security setting', 'Position'], [
        ['SSO required', String(project.securitySettings.requireSso)],
        ['Development authentication allowed', String(project.securitySettings.allowDevelopmentAuth)],
        ['Session maximum age', `${project.securitySettings.sessionMaxAgeMinutes} minutes`],
        ['Audit retention', `${project.securitySettings.auditRetentionDays} days`],
        ['Encryption key reference', project.securitySettings.encryptionKeyReference],
        ['Identity providers', project.identityProviders.map((item) => `${item.name} (${item.type}, ${item.enabled ? 'enabled' : 'disabled'})`).join('; ') || 'None'],
      ], 'No security settings recorded'),
    ],
  };
}

function deploymentOperations(project: ArchitectureProject): SddSection {
  const physical = stageNodes(project, 'physicalTechnology');
  const context = project.context ?? {};
  return {
    id: 'deployment-operations',
    title: '15. Deployment, resilience and operations',
    markdown: [
      ...table(['Deployment object', 'Kind', 'Region / zone', 'Runtime', 'Capacity', 'Recovery', 'Owner'], physical.map((node) => [node.label, node.kind, `${property(node, ['region'])} / ${property(node, ['zone', 'availability'])}`, property(node, ['runtime', 'platform']), property(node, ['capacity', 'replica', 'autoscale', 'throughput', 'cost']), property(node, ['failover', 'backup', 'rto', 'rpo', 'recovery']), property(node, ['owner', 'team'])]), 'No physical-technology objects captured'),
      '',
      ...table(['Operational concern', 'Position'], [
        ['Availability target', text(context.availabilityTarget)],
        ['Recovery objectives', text(context.recoveryObjectives)],
        ['Workload profile', text(context.workloadProfile)],
        ['Peak-load variability', text(context.peakLoadVariability)],
        ['Support model', text(context.supportModel)],
        ['Runtime inventories', String(project.runtimeInventories.length)],
        ['Deployment profiles', String(project.deploymentProfiles.length)],
        ['Service-level objectives', String(project.serviceLevelObjectives.length)],
      ], 'No operational context captured'),
      '',
      '### Service-level objectives',
      ...table(['SLO', 'Indicator', 'Target', 'Window'], project.serviceLevelObjectives.map((item) => [item.name, item.indicator, String(item.target), item.window]), 'No SLOs captured'),
    ],
  };
}

function migrationTransition(project: ArchitectureProject): SddSection {
  const context = project.context ?? {};
  const candidates = transitionNodes(project);
  return {
    id: 'migration-transition',
    title: '16. Migration, coexistence and transition plan',
    markdown: [
      ...table(['Dimension', 'Position'], [
        ['Transition state', text(context.transitionState)],
        ['Existing systems', text(context.existingSystems)],
        ['Legacy constraints', text(context.legacyConstraints)],
        ['Reversibility preference', text(context.reversibilityPreference)],
        ['Change cadence', text(context.changeCadence)],
        ['Organisational change readiness', text(context.organizationalChangeReadiness)],
      ], 'No transition context captured'),
      '',
      '### Transition-relevant architecture objects',
      ...table(['Object', 'Kind', 'Description', 'Lineage'], candidates.map((node) => [node.label, node.kind, node.description ?? '—', node.lineageFrom.map((id) => nodeName(project, id)).join('; ') || '—']), 'No transition objects identified'),
      '',
      '### Required delivery planning',
      '- Define migration waves, coexistence boundaries and rollback criteria.',
      '- Define data migration, reconciliation and cutover ownership.',
      '- Define decommission conditions for superseded components.',
      '- Validate organisational readiness and operational support before each wave.',
    ],
  };
}

function capacityCost(project: ArchitectureProject): SddSection {
  const physical = stageNodes(project, 'physicalTechnology');
  const capacity = physical.filter((node) => property(node, ['capacity', 'replica', 'throughput', 'autoscale', 'cost']) !== '—');
  return {
    id: 'capacity-cost',
    title: '17. Capacity, performance and cost assumptions',
    markdown: [
      ...table(['Object', 'Capacity / performance assumption', 'Cost assumption', 'Validation evidence'], capacity.map((node) => [node.label, property(node, ['capacity', 'replica', 'throughput', 'autoscale', 'latency']), property(node, ['cost', 'budget']), property(node, ['evidence', 'benchmark', 'test'])]), 'No capacity or cost assumptions captured'),
      '',
      `Budget sensitivity: **${text(project.context.budgetSensitivity)}**`,
      '',
      '**Validation expectation.** Comparative architecture scores are not production forecasts. Performance, capacity and cost assumptions require benchmark, load-test or runtime evidence before production acceptance.',
    ],
  };
}

function reviewGovernance(project: ArchitectureProject): SddSection {
  return {
    id: 'review-governance',
    title: '18. Architecture review, risks, fitness tests and approvals',
    markdown: [
      '### Persisted findings',
      ...table(['ID', 'Severity', 'Finding', 'Affected objects', 'Mitigation', 'Override'], project.findings.map((item) => [item.id, item.severity, `${item.title}: ${item.message}`, [...item.affectedNodeIds, ...item.affectedEdgeIds].join('; ') || '—', item.mitigations.join('; ') || '—', item.canOverride ? 'Permitted by policy' : 'Not permitted']), 'No persisted findings'),
      '',
      '### Review history',
      ...table(['Review', 'Generated', 'Summary'], project.aiReviewHistory.map((item) => [item.id, item.createdAt, item.summary]), 'No persisted AI/deterministic review runs'),
      '',
      '### Review assignments',
      ...table(['Stage', 'Assignee', 'Status', 'Priority', 'Due'], project.reviewAssignments.map((item) => [stageLabels[item.stage] ?? item.stage, item.assignedTo, item.status, item.priority, item.dueAt ?? '—']), 'No review assignments'),
      '',
      '### Approval disposition',
      ...table(['Stage', 'Status', 'Reviewer', 'Requested', 'Decided', 'Snapshot'], approvalRows(project), 'No approval records'),
      '',
      '### Policy and conformance evidence',
      ...table(['Evidence', 'Status', 'Reference'], [
        ...project.policyGates.map((item) => [item.name, item.enabled ? 'Enabled' : 'Disabled', item.id]),
        ...project.repositoryPullRequests.map((item) => [`Repository pull request ${item.id}`, item.status, item.url ?? item.id]),
      ], 'No policy-gate or repository evidence recorded'),
    ],
  };
}


function completenessAndActions(project: ArchitectureProject): SddSection {
  const gaps: string[][] = [];
  const add = (area: string, condition: boolean, gap: string, action: string) => { if (condition) gaps.push([area, gap, action, 'Open']); };
  add('Scope', !(project.context.inScopeCapabilities?.length), 'In-scope capabilities are not recorded.', 'Confirm the solution boundary and accountable business capabilities.');
  add('Stakeholders', !(project.context.stakeholders?.length), 'Stakeholders and approvers are not recorded.', 'Assign business, security, data, platform and delivery approvers.');
  add('Traceability', project.objectives.some((_, index) => !project.nodes.some((node) => node.lineageFrom.includes(`objective-${index + 1}`) || (Array.isArray(node.properties.objectiveIds) && node.properties.objectiveIds.includes(`OBJ-${String(index + 1).padStart(3, '0')}`)))), 'One or more objectives lack explicit model lineage.', 'Link objectives to logical responsibilities, decisions and validation evidence.');
  add('Interfaces', !(project.interfaces?.length), 'No governed interface contracts are captured.', 'Define provider, consumer, schema, security, failure and ownership semantics.');
  add('Data', !dataNodes(project).length, 'No explicit data objects are captured.', 'Model data ownership, classification, consistency, residency, retention and recovery.');
  add('Security', project.securitySettings.allowDevelopmentAuth || !project.securitySettings.requireSso, 'Enterprise identity posture is not production accepted.', 'Require enterprise SSO, remove development authentication and attach runtime evidence.');
  add('Resilience', !project.context.recoveryObjectives, 'Recovery objectives are not recorded.', 'Record RTO/RPO and validate failover, backup and restore evidence.');
  add('Review', !project.stageApprovals.some((item) => item.stage === 'validationRealization' && item.status === 'approved'), 'Final architecture approval is absent.', 'Complete independent review and record disposition against an immutable snapshot.');
  return {
    id: 'completeness-actions',
    title: '19. Architecture completeness, evidence gaps and next actions',
    markdown: [
      ...table(['Area', 'Gap', 'Required action', 'Status'], gaps, 'No material completeness gaps detected by the SDD composer'),
      '',
      `Completeness posture: **${gaps.length ? `${gaps.length} open evidence or governance gap(s)` : 'no material generated gaps'}**. Generated completeness is advisory and does not replace specialist review.`,
    ],
  };
}

function traceability(project: ArchitectureProject, release: string): SddSection {
  const graph = analyseArchitectureGraph(project);
  const lineageRows = project.nodes.map((node) => [node.label, stageLabels[node.stage] ?? node.stage, node.kind, node.lineageFrom.map((id) => nodeName(project, id)).join('; ') || 'No upstream lineage', node.status]);
  return {
    id: 'traceability',
    title: '20. Model lineage, conformance and handoff traceability',
    markdown: [
      ...table(['Object', 'Stage', 'Kind', 'Upstream lineage', 'Status'], lineageRows, 'No architecture objects captured'),
      '',
      `Graph posture: **${project.nodes.length} nodes**, **${project.edges.length} relationships**, coupling index **${graph.couplingIndex}**, longest synchronous chain **${graph.maxSyncChainDepth}**, dependency cycles **${graph.cycles.length}**.`,
      '',
      `Knowledge release: **${release}**. Recommendations and governed records should retain evidence identifiers and release provenance. Repository, runtime and conformance evidence remain separate acceptance gates unless explicitly attached to this revision.`,
    ],
  };
}

export function buildSddSections(project: ArchitectureProject, library: KnowledgeLibrary): SddSection[] {
  const safeProject = normaliseProjectForSdd(project);
  const release = (library as { knowledgeReleaseId?: string }).knowledgeReleaseId ?? 'AKR-unversioned';
  return [
    documentControl(safeProject, release),
    executiveSummary(safeProject, release),
    purposeScope(safeProject),
    constraintsContext(safeProject),
    requirementsTrace(safeProject),
    qualityDrivers(safeProject, library),
    decisionsAndPatterns(safeProject, library),
    modelSection(safeProject, 'logicalApplication', '8. Logical application architecture', 'logical-application'),
    modelSection(safeProject, 'applicationRealization', '9. Application realization architecture', 'application-realization'),
    interfaces(safeProject),
    dataArchitecture(safeProject),
    modelSection(safeProject, 'logicalTechnology', '12. Logical technology architecture', 'logical-technology'),
    modelSection(safeProject, 'physicalTechnology', '13. Physical technology architecture', 'physical-technology'),
    securityArchitecture(safeProject),
    deploymentOperations(safeProject),
    migrationTransition(safeProject),
    capacityCost(safeProject),
    reviewGovernance(safeProject),
    completenessAndActions(safeProject),
    traceability(safeProject, release),
  ];
}

export function renderSddMarkdown(project: ArchitectureProject, library: KnowledgeLibrary): string {
  const safeProject = normaliseProjectForSdd(project);
  const sections = buildSddSections(safeProject, library);
  const lines = [`# ${safeProject.name || 'Architecture'} — System Design Description`, '', '> Generated from the governed AIW canonical architecture model. Missing evidence is shown explicitly rather than inferred.', ''];
  for (const section of sections) lines.push(`## ${section.title}`, '', ...section.markdown, '');
  return lines.join('\n').trimEnd() + '\n';
}
