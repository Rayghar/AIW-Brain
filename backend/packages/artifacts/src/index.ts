export * from './accessiblePdf.js';
import { architectureDiagramArtifacts } from './stageDiagrams.js';
import { accessibleSddPdfArtifact, renderAccessibleSddPdf } from './accessiblePdf.js';
import { synthesisBlueprintDiagramArtifacts } from './synthesisBlueprintDiagrams.js';
import { coreAntiPatterns, createDesignLibrary, sampleEnterpriseCatalog, samplePortfolioProjects, trustedArchitectureSources, knowledgeRepositoryConnectors, seedKnowledgeClaims, sprint78PatternCorpus, patternCorpusMetrics, providerProductCatalog, type ArchitectureProject, type ArtifactBundle, type ArtifactFile, type KnowledgeLibrary, type RecommendationScore, type ArchitectureSynthesisRun, type ArchitectureSimulationResult, type SynthesisArtifactBundle } from '@aiw/domain';
import { assessDesignLibraryIntegrity, buildPortfolioIntelligence, assessKnowledgeMeshCoverage, detectClaimContradictions, extractionPromptContract, buildRepositoryGovernancePolicies, normalizePatternCorpus, sprint78KnowledgeReleaseManifest, generateArchitectureFitnessFunctions, composeSdd } from '@aiw/engine';
import { runArchitectureReview, type ArchitectureReview, type GeneratedReviewAdr, type GeneratedFitnessTest, type ReviewFinding } from '@aiw/intelligence';
import { assessArchitectureRoundTrip, exportArchitectureExchange } from '@aiw/modelling';

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function jsonManifest(project: ArchitectureProject): ArtifactFile {
  return {
    path: 'architecture/manifest.json',
    mediaType: 'application/json',
    content: JSON.stringify(project, null, 2),
  };
}

function mermaidDiagram(project: ArchitectureProject): ArtifactFile {
  const nodes = project.nodes.map((node) => `  ${slug(node.id)}["${node.label.replaceAll('"', "'")}"]`);
  const edges = project.edges.map((edge) => `  ${slug(edge.sourceId)} -->|${edge.label ?? edge.kind}| ${slug(edge.targetId)}`);
  return {
    path: 'diagrams/architecture.mmd',
    mediaType: 'text/plain',
    content: ['flowchart LR', ...nodes, ...edges].join('\n'),
  };
}

function adrBundle(project: ArchitectureProject): ArtifactFile {
  const accepted = project.decisions.filter((decision) => decision.status === 'accepted');
  const styleDecisions = project.styleDecisions.filter((decision) => decision.status === 'accepted');
  const sections = [
    '# Architecture Decision Records',
    '',
    ...styleDecisions.flatMap((decision, index) => [
      `## ADR-${String(index + 1).padStart(4, '0')}: Select ${decision.styleId}`,
      '',
      '### Status',
      'Accepted',
      '',
      '### Context',
      `The decision applies at ${decision.stage}${decision.scopeNodeId ? ` within scope ${decision.scopeNodeId}` : ''}.`,
      '',
      '### Decision',
      decision.rationale,
      '',
      '### Consequences',
      '- The selected style must be evaluated with its prerequisites, obligations and quality-attribute trade-offs.',
      '- Synchronous and asynchronous interactions remain permitted where justified; tensions are recorded rather than hidden.',
      '',
    ]),
    ...accepted.flatMap((decision, index) => [
      `## ADR-${String(styleDecisions.length + index + 1).padStart(4, '0')}: ${decision.title}`,
      '',
      '### Status',
      'Accepted',
      '',
      '### Context',
      decision.context,
      '',
      '### Decision',
      decision.decision,
      '',
      '### Decision Drivers',
      ...decision.drivers.map((item) => `- ${item}`),
      '',
      '### Considered Options',
      ...decision.consideredOptions.map((item) => `- ${item}`),
      '',
      '### Consequences',
      ...decision.consequences.map((item) => `- ${item}`),
      '',
    ]),
  ];
  return { path: 'docs/adr/README.md', mediaType: 'text/markdown', content: sections.join('\n') };
}

function tradeoffReport(project: ArchitectureProject, recommendations: RecommendationScore[]): ArtifactFile {
  const rows = recommendations.slice(0, 5).map((item) =>
    `| ${item.styleName} | ${item.score.toFixed(1)} | ${item.eligible ? 'Yes' : 'No'} | ${item.strengths.join('; ') || '—'} | ${item.tradeoffs.join('; ') || '—'} |`,
  );
  const findings = project.findings.length > 0
    ? project.findings.map((item) => `- **${item.severity}: ${item.title}** — ${item.message}`)
    : ['- No persisted findings. Run validation before final approval.'];
  return {
    path: 'docs/tradeoff-report.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Architecture Trade-off Report`,
      '',
      `Generated from revision ${project.revision}.`,
      '',
      '## Ranked architecture styles',
      '',
      '| Style | Score | Eligible | Strengths | Trade-offs |',
      '|---|---:|:---:|---|---|',
      ...rows,
      '',
      '## Current findings',
      '',
      ...findings,
      '',
      '## Important limitation',
      '',
      'Scores are decision support, not proof of correctness. Draft knowledge records require expert calibration and evidence review before production governance use.',
    ].join('\n'),
  };
}


function selectionTraceReport(project: ArchitectureProject, library: KnowledgeLibrary): ArtifactFile {
  const styleRows = project.styleDecisions.filter((item) => item.status === 'accepted').map((item) => {
    const record = library.architectureStyles.find((candidate) => candidate.id === item.styleId);
    return `| ${record?.name ?? item.styleId} | ${item.stage} | ${item.scopeNodeId ?? 'View'} | ${item.rationale.replaceAll('|', '/')} |`;
  });
  const patternRows = project.patternSelections.filter((item) => item.status === 'accepted' || item.status === 'considering').map((item) => {
    const record = library.patterns.find((candidate) => candidate.id === item.patternId);
    const open = (record?.obligations ?? []).filter((obligation) => !item.obligationsAcknowledged.includes(obligation));
    return `| ${record?.name ?? item.patternId} | ${item.status} | ${item.stage} | ${item.scopeNodeId ?? 'View'} | ${open.join('; ') || 'None'} |`;
  });
  return {
    path: 'docs/selection-trace.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Selection and Decision Trace`,
      '',
      '## Accepted architecture styles',
      '',
      '| Style | Stage | Scope | Rationale |',
      '|---|---|---|---|',
      ...(styleRows.length ? styleRows : ['| — | — | — | No accepted style selections |']),
      '',
      '## Selected patterns and obligations',
      '',
      '| Pattern | Status | Stage | Scope | Open obligations |',
      '|---|---|---|---|---|',
      ...(patternRows.length ? patternRows : ['| — | — | — | — | No selected patterns |']),
      '',
      '## Recorded decisions',
      '',
      ...project.decisions.map((decision) => `- **${decision.title}** — ${decision.decision}`),
    ].join('\n'),
  };
}


function governanceReport(project: ArchitectureProject, library: KnowledgeLibrary): ArtifactFile {
  const approvals = (project.stageApprovals ?? []).map((item) => `| ${item.stage} | ${item.status} | ${item.reviewer ?? '—'} | ${item.snapshotId ?? '—'} |`);
  const packs = (library.rulePacks ?? []).filter((pack) => (project.activeRulePackIds ?? []).includes(pack.id));
  return {
    path: 'docs/governance-report.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Architecture Governance Report`,
      '',
      `Branch: **${project.branch.name}** (${project.branch.id})`,
      '',
      '## Active rule packs',
      '',
      ...(packs.length ? packs.map((pack) => `- **${pack.name} ${pack.version}** — ${pack.rules.length} active rule definitions`) : ['- No rule packs enabled.']),
      '',
      '## Stage approvals',
      '',
      '| Stage | Status | Reviewer | Snapshot |',
      '|---|---|---|---|',
      ...(approvals.length ? approvals : ['| — | — | — | No approvals recorded |']),
      '',
      '## Governance findings',
      '',
      ...project.findings.map((item) => `- **${item.severity}: ${item.title}** — ${item.message}`),
    ].join('\n'),
  };
}

function collaborationReport(project: ArchitectureProject): ArtifactFile {
  const members = project.members.map((member) => `| ${member.displayName} | ${member.role} | ${member.status} | ${member.email} |`);
  const reviews = project.reviewAssignments.map((item) => {
    const assignee = project.members.find((member) => member.id === item.assignedTo)?.displayName ?? item.assignedTo;
    return `| ${item.stage} | ${assignee} | ${item.status} | ${item.priority} | ${item.dueAt ?? '—'} |`;
  });
  const threads = project.discussionThreads.map((thread) => `- **${thread.title}** — ${thread.status}; ${thread.comments.length} comment(s); target ${thread.targetType}:${thread.targetId}`);
  return {
    path: 'docs/collaboration-report.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Collaboration and Review Report`, '',
      '## Project members', '', '| Member | Role | Status | Email |', '|---|---|---|---|', ...members, '',
      '## Review assignments', '', '| Stage | Assignee | Status | Priority | Due |', '|---|---|---|---|---|', ...(reviews.length ? reviews : ['| — | — | — | — | No review assignments |']), '',
      '## Architecture discussions', '', ...(threads.length ? threads : ['- No discussion threads recorded.']), '',
      '## Notification posture', '',
      `- Total notifications: ${project.notifications.length}`,
      `- Unread notifications: ${project.notifications.filter((item) => !item.readAt).length}`,
      `- Approval validity: ${project.collaborationSettings.approvalValidityDays} days`,
      `- Default review due period: ${project.collaborationSettings.reviewDueDays} days`,
    ].join('\n'),
  };
}


function securityOperationsReport(project: ArchitectureProject): ArtifactFile {
  const providers = project.identityProviders.map((provider) => `| ${provider.name} | ${provider.type.toUpperCase()} | ${provider.enabled ? 'Enabled' : 'Disabled'} | ${provider.issuer} |`);
  const secrets = project.secretReferences.map((reference) => `| ${reference.purpose} | ${reference.provider} | ${reference.locator} | ${reference.rotatedAt ?? '—'} |`);
  return {
    path: 'docs/security-and-operations-report.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Security and Live Operations Report`, '',
      `Tenant: **${project.tenantId}**`, '',
      '## Identity policy', '',
      `- SSO required: ${project.securitySettings.requireSso ? 'Yes' : 'No'}`,
      `- Development authentication permitted: ${project.securitySettings.allowDevelopmentAuth ? 'Yes' : 'No'}`,
      `- Maximum session age: ${project.securitySettings.sessionMaxAgeMinutes} minutes`,
      `- Audit retention: ${project.securitySettings.auditRetentionDays} days`,
      `- Encryption key reference: ${project.securitySettings.encryptionKeyReference}`, '',
      '## Identity providers', '', '| Provider | Type | Status | Issuer |', '|---|---|---|---|', ...(providers.length ? providers : ['| — | — | — | No providers configured |']), '',
      '## Secret references', '', '| Purpose | Provider | Locator | Last rotation |', '|---|---|---|---|', ...(secrets.length ? secrets : ['| — | — | — | No secret references configured |']), '',
      '## Live collaboration controls', '',
      `- Presence TTL: ${project.collaborationSettings.presenceTtlSeconds} seconds`,
      `- Maximum concurrent editors: ${project.collaborationSettings.maxConcurrentEditors}`,
      `- Operation retry limit: ${project.collaborationSettings.operationRetryLimit}`,
      '- Mutation APIs require tenant and actor alignment and support idempotency keys.',
      '- Activity delivery uses a tenant-scoped event stream; production deployments should place it behind authenticated ingress and a durable broker.',
    ].join('\n'),
  };
}


function architectureDriftReport(project: ArchitectureProject): ArtifactFile {
  const latest = [...project.driftReports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
  const content = latest ? [
    `# ${project.name} — Architecture Drift Report`, '',
    `Inventory: **${latest.inventoryId}**`,
    `Architecture revision: **${latest.projectRevision}**`,
    `Generated: **${latest.generatedAt}**`, '',
    '## Summary', '',
    `- Matched resources: ${latest.summary.matched}`,
    `- Missing intended resources: ${latest.summary.missingActual}`,
    `- Unmanaged runtime resources: ${latest.summary.unmanagedActual}`,
    `- Property mismatches: ${latest.summary.propertyMismatches}`,
    `- Topology mismatches: ${latest.summary.topologyMismatches}`,
    `- Version drift: ${latest.summary.versionDrift}`, '',
    '## Findings', '',
    ...latest.findings.map((finding) => `- **${finding.severity}: ${finding.title}** — ${finding.message} Recommendation: ${finding.recommendation}`),
  ] : [`# ${project.name} — Architecture Drift Report`, '', 'No runtime inventory has been compared with this architecture revision.'];
  return { path: 'docs/architecture-drift-report.md', mediaType: 'text/markdown', content: content.join('\n') };
}

function architectureRepositoryFiles(project: ArchitectureProject): ArtifactFile[] {
  const gate = project.policyGates.find((item) => item.enabled);
  const repository = project.repositoryBindings[0];
  const gateConfig = gate ?? {
    id: 'gate-default', name: 'Default architecture policy gate', enabled: true, hardFindingThreshold: 0,
    significantFindingThreshold: 5, advisoryFindingThreshold: 25, maxMissingResources: 0, maxUnmanagedResources: 3,
    requiredApprovedStages: ['logicalApplication','applicationRealization','logicalTechnology'],
  };
  const workflow = [
    'name: AIW Architecture Policy Gate',
    'on:',
    '  pull_request:',
    '    paths:',
    "      - 'architecture/**'",
    '  workflow_dispatch:',
    'jobs:',
    '  architecture-gate:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-node@v4',
    '        with:',
    "          node-version: '22'",
    '      - run: npm ci',
    '      - run: npm run architecture:gate -- --project architecture/manifest.json --inventory architecture/runtime-inventory.json --gate architecture/policy-gate.json',
  ].join('\n');
  return [
    { path: 'architecture/policy-gate.json', mediaType: 'application/json', content: JSON.stringify(gateConfig, null, 2) },
    { path: 'architecture/repository-binding.json', mediaType: 'application/json', content: JSON.stringify(repository ?? null, null, 2) },
    { path: '.github/workflows/aiw-architecture-gate.yml', mediaType: 'text/yaml', content: workflow },
    { path: 'architecture/runtime-inventory.json', mediaType: 'application/json', content: JSON.stringify(project.runtimeInventories[0] ?? { resources: [], relationships: [] }, null, 2) },
  ];
}

function observabilityReport(project: ArchitectureProject): ArtifactFile {
  const settings = project.observabilitySettings;
  return {
    path: 'docs/observability-and-slo-report.md', mediaType: 'text/markdown', content: [
      `# ${project.name} — Observability and SLO Report`, '',
      `- Service name: ${settings.serviceName}`,
      `- Traces enabled: ${settings.tracesEnabled ? 'Yes' : 'No'}`,
      `- Metrics enabled: ${settings.metricsEnabled ? 'Yes' : 'No'}`,
      `- Logs enabled: ${settings.logsEnabled ? 'Yes' : 'No'}`,
      `- Sampling ratio: ${settings.samplingRatio}`,
      `- OTLP endpoint reference: ${settings.otlpEndpointReference ?? 'Not configured'}`,
      `- Availability target: ${settings.targetAvailabilityPercent}%`,
      `- p95 latency target: ${settings.targetP95LatencyMs} ms`, '',
      'Runtime telemetry must be connected to a production collector and alerting platform before the target architecture is declared operationally ready.',
    ].join('\n'),
  };
}

function terraformScaffold(project: ArchitectureProject): ArtifactFile[] {
  const physical = project.nodes.filter((node) => node.stage === 'physicalTechnology');
  const inventory = physical.map((node) => ({
    id: node.id,
    label: node.label,
    kind: node.kind,
    properties: node.properties,
    lineageFrom: node.lineageFrom,
  }));
  const main = [
    '# Architecture Intelligence Workbench — Terraform starter',
    '# This is intentionally scaffolding, not production-ready infrastructure.',
    '# Validate provider versions, networking, security, identity, backup, monitoring and cost controls before use.',
    '',
    'terraform {',
    '  required_version = ">= 1.8.0"',
    '}',
    '',
    'variable "environment" {',
    '  type        = string',
    '  description = "Target environment name"',
    '}',
    '',
    ...physical.flatMap((node) => [
      `# TODO: bind ${node.label} (${node.kind}) to a reviewed provider-specific module.`,
      `# Architecture node id: ${node.id}`,
      `# Properties: ${JSON.stringify(node.properties)}`,
      '',
    ]),
  ].join('\n');
  return [
    { path: 'infra/main.tf', mediaType: 'text/plain', content: main },
    { path: 'infra/component-inventory.json', mediaType: 'application/json', content: JSON.stringify(inventory, null, 2) },
  ];
}


function operationalIntelligenceReport(project: ArchitectureProject): ArtifactFile {
  const latest = [...project.operationalDriftReports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
  const waivers = project.driftWaivers.filter((item) => item.status === 'active');
  const collectors = project.inventoryCollectors.map((item) => `| ${item.name} | ${item.provider.toUpperCase()} | ${item.status} | ${item.schedule} | ${item.lastRunAt ?? 'Never'} |`);
  const findings = latest?.findings.map((item) => `- **${item.severity} / ${item.category}: ${item.title}** — ${item.message} ${item.estimatedMonthlyImpact ? `Estimated monthly impact: ${item.estimatedMonthlyImpact}.` : ''}`) ?? ['- No operational drift report generated.'];
  return { path: 'docs/operational-architecture-intelligence.md', mediaType: 'text/markdown', content: [
    `# ${project.name} — Operational Architecture Intelligence`, '',
    '## Inventory collectors', '', '| Collector | Provider | Status | Schedule | Last run |', '|---|---|---|---|---|', ...(collectors.length ? collectors : ['| — | — | — | — | No collectors configured |']), '',
    '## Operational drift', '', ...(latest ? [`- Cost findings: ${latest.summary.cost}`, `- Capacity findings: ${latest.summary.capacity}`, `- Resilience findings: ${latest.summary.resilience}`, `- Estimated monthly impact: ${latest.summary.estimatedMonthlyImpact}`] : ['- No report available.']), '',
    ...findings, '', '## Active waivers', '', ...(waivers.length ? waivers.map((item) => `- ${item.findingId} — ${item.reason}; expires ${item.expiresAt}; approved by ${item.approvedBy}`) : ['- No active drift waivers.']),
  ].join('\n') };
}

function remediationReport(project: ArchitectureProject): ArtifactFile {
  const plans = project.remediationPlans.map((plan) => [
    `## ${plan.name}`,
    '',
    `Status: **${plan.status}**`,
    `Source report: ${plan.sourceReportId}`,
    `Created by: ${plan.createdBy}`,
    ...(plan.approvedBy ? [`Approved by: ${plan.approvedBy}`] : []),
    '',
    ...plan.actions.map((action) => `- **${action.status}: ${action.title}** — ${action.description} [${action.automation}; risk ${action.risk}]`),
    '',
  ].join('\n'));
  return { path: 'docs/remediation-plans.md', mediaType: 'text/markdown', content: [`# ${project.name} — Controlled Remediation Plans`, '', ...(plans.length ? plans : ['No remediation plans have been created.'])].join('\n') };
}

function sloArtifacts(project: ArchitectureProject): ArtifactFile[] {
  const prometheusRules = [
    'groups:',
    '  - name: aiw-slo-alerts',
    '    rules:',
    ...project.alertPolicies.filter((item) => item.enabled).flatMap((policy) => {
      const slo = project.serviceLevelObjectives.find((item) => item.id === policy.sloId);
      return [
        `      - alert: ${policy.name.replace(/[^a-zA-Z0-9]/g, '')}`,
        `        expr: aiw_slo_burn_rate{slo_id="${policy.sloId}"} > ${policy.burnRateThreshold}`,
        `        for: ${policy.evaluationWindowMinutes}m`,
        '        labels:',
        `          severity: ${policy.severity}`,
        '        annotations:',
        `          summary: "${policy.name}"`,
        `          description: "SLO ${slo?.name ?? policy.sloId} is consuming error budget too quickly."`,
      ];
    }),
  ].join('\n');
  return [
    { path: 'operations/slo-definitions.json', mediaType: 'application/json', content: JSON.stringify(project.serviceLevelObjectives, null, 2) },
    { path: 'operations/alert-policies.json', mediaType: 'application/json', content: JSON.stringify(project.alertPolicies, null, 2) },
    { path: 'operations/prometheus-rules.yml', mediaType: 'text/yaml', content: prometheusRules },
  ];
}

function deploymentArtifacts(project: ArchitectureProject): ArtifactFile[] {
  const profile = project.deploymentProfiles.find((item) => item.environment === 'production') ?? project.deploymentProfiles[0];
  const replicas = profile?.replicas ?? 2;
  const minReplicas = profile?.minReplicas ?? replicas;
  const maxReplicas = profile?.maxReplicas ?? Math.max(replicas, 4);
  const deployment = [
    'apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  name: aiw-api', '  labels:', '    app: aiw-api', 'spec:', `  replicas: ${replicas}`, '  selector:', '    matchLabels:', '      app: aiw-api', '  template:', '    metadata:', '      labels:', '        app: aiw-api', '    spec:', '      containers:', '        - name: api', '          image: ghcr.io/example/aiw-api:0.8.0', '          ports:', '            - containerPort: 3000', '          readinessProbe:', '            httpGet:', '              path: /ready', '              port: 3000', '          livenessProbe:', '            httpGet:', '              path: /health', '              port: 3000', '          resources:', '            requests:', `              cpu: ${profile?.cpuRequest ?? '500m'}`, `              memory: ${profile?.memoryRequest ?? '512Mi'}`, '          envFrom:', '            - secretRef:', '                name: aiw-runtime-secrets',
  ].join('\n');
  const hpa = ['apiVersion: autoscaling/v2','kind: HorizontalPodAutoscaler','metadata:','  name: aiw-api','spec:','  scaleTargetRef:','    apiVersion: apps/v1','    kind: Deployment','    name: aiw-api',`  minReplicas: ${minReplicas}`,`  maxReplicas: ${maxReplicas}`,'  metrics:','    - type: Resource','      resource:','        name: cpu','        target:','          type: Utilization','          averageUtilization: 70'].join('\n');
  const runbook = [
    `# ${project.name} — Operational Runbook`, '',
    '## Health checks', '- `/health` verifies process health.', '- `/ready` verifies repository and durable-event readiness.', '- `/metrics` exposes Prometheus metrics.', '',
    '## Incident triage', '1. Confirm tenant and correlation ID.', '2. Check error rate, p95 latency, outbox backlog and collector health.', '3. Compare the latest runtime inventory to the approved architecture.', '4. Open or update a remediation plan; do not apply provider changes without approval.', '',
    '## Drift response', '1. Classify the drift as cost, capacity, resilience or structural.', '2. Validate whether an active time-bound waiver exists.', '3. Generate a remediation plan.', '4. Obtain an independent approval.', '5. Apply through reviewed repository or provider workflows.', '6. Re-collect inventory and close the finding.', '',
    '## Backup and recovery', '- Back up PostgreSQL using encrypted logical or physical backups.', '- Test restore procedures on a scheduled basis.', '- Preserve architecture snapshots, audit events and repository artifacts according to retention policy.', '',
    '## Rollback', '- Roll back application deployment to the previous signed image.', '- Restore the last approved architecture repository revision.', '- Do not delete drift evidence; mark remediation actions as rolled back and create a new audit event.',
  ].join('\n');
  return [
    { path: 'deploy/kubernetes/aiw-api-deployment.yml', mediaType: 'text/yaml', content: deployment },
    { path: 'deploy/kubernetes/aiw-api-hpa.yml', mediaType: 'text/yaml', content: hpa },
    { path: 'operations/RUNBOOK.md', mediaType: 'text/markdown', content: runbook },
  ];
}

function enterprisePortfolioReport(project: ArchitectureProject): ArtifactFile[] {
  const projects = samplePortfolioProjects.map((candidate) => candidate.id === project.id ? project : candidate);
  const report = buildPortfolioIntelligence(projects, sampleEnterpriseCatalog);
  const riskRows = report.riskHeatmap.map((item) => `| ${item.projectName} | ${item.criticality} | ${item.riskScore} | ${item.riskBand} | ${item.drivers.join('; ') || '—'} |`);
  const roadmap = report.roadmap.map((item, index) => `${index + 1}. **${item.priority.toUpperCase()}: ${item.title}** — ${item.rationale} Estimated effort: ${item.estimatedEffortDays} days; estimated annual benefit: ${report.costs.currency} ${item.estimatedAnnualBenefit.toFixed(0)}.`);
  const markdown = [
    `# ${project.portfolio.portfolioId} — Enterprise Architecture Portfolio Intelligence`, '',
    `Generated from ${report.summary.projects} governed projects.`, '',
    '## Executive summary', '',
    `- High-risk projects: ${report.summary.highRiskProjects}`,
    `- Cross-project dependencies: ${report.summary.totalDependencies}`,
    `- Technology-standardization score: ${report.summary.standardizationScore}%`,
    `- Reference-architecture compliance: ${report.summary.complianceScore}%`,
    `- Monthly cost variance: ${report.costs.currency} ${report.summary.monthlyCostVariance.toFixed(0)}`, '',
    '## Risk and technical-debt heatmap', '',
    '| Project | Criticality | Risk score | Band | Drivers |', '|---|---|---:|---|---|', ...riskRows, '',
    '## Technology standardization', '',
    `- Preferred technology instances: ${report.standardization.preferred}`,
    `- Restricted technology instances: ${report.standardization.restricted}`,
    `- Deprecated technology instances: ${report.standardization.deprecated}`,
    `- Unclassified technology instances: ${report.standardization.unclassified}`, '',
    ...report.standardization.findings.map((finding) => `- **${finding.severity}: ${finding.technology}** in ${finding.projectId} — ${finding.recommendation}`), '',
    '## Cost and technical debt', '',
    `- Expected monthly cost: ${report.costs.currency} ${report.costs.expectedMonthlyCost.toFixed(0)}`,
    `- Actual monthly cost: ${report.costs.currency} ${report.costs.actualMonthlyCost.toFixed(0)}`,
    `- Annual technical-debt impact: ${report.costs.currency} ${report.costs.annualTechnicalDebtImpact.toFixed(0)}`, '',
    '## Recommended investment roadmap', '', ...(roadmap.length ? roadmap : ['No investment recommendations generated.']), '',
    '## Reuse opportunities', '',
    `- Building-block reuse score: ${report.reuse.reuseScore}%`,
    ...report.reuse.duplicateCandidates.map((candidate) => `- ${candidate.recommendation} Projects: ${candidate.projectIds.join(', ')}.`),
  ].join('\n');
  return [
    { path: 'portfolio/enterprise-portfolio-intelligence.json', mediaType: 'application/json', content: JSON.stringify(report, null, 2) },
    { path: 'docs/enterprise-portfolio-intelligence.md', mediaType: 'text/markdown', content: markdown },
    { path: 'portfolio/enterprise-architecture-catalog.json', mediaType: 'application/json', content: JSON.stringify(sampleEnterpriseCatalog, null, 2) },
  ];
}

function readme(project: ArchitectureProject, library: KnowledgeLibrary): ArtifactFile {
  return {
    path: 'README.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Generated Architecture Package`,
      '',
      `Knowledge library: ${library.libraryId} ${library.version}`,
      '',
      '## Contents',
      '- Canonical architecture manifest',
      '- Mermaid diagram source',
      '- Architecture Decision Records',
      '- Trade-off report',
      '- Governance, collaboration, security, observability, drift and review reports',
      '- Architecture-as-code policy gate and repository binding files',
      '- Provider-neutral Terraform starter and physical component inventory',
      '- Operational intelligence, remediation plans, SLO rules, deployment manifests and runbook',
      '- Enterprise portfolio intelligence, technology standards, reference compliance and investment roadmap',
      '',
      'Generated files are reviewable scaffolding. They are not a substitute for engineering, security, operational and compliance validation.',
    ].join('\n'),
  };
}


function designIntelligenceArtifacts(project: ArchitectureProject, library: KnowledgeLibrary): ArtifactFile[] {
  const records = createDesignLibrary(library);
  const components = records.filter((item) => item.recordType === 'component');
  const patterns = records.filter((item) => item.recordType === 'pattern');
  const styles = records.filter((item) => item.recordType === 'style');
  const acceptedPatterns = project.patternSelections.filter((item) => item.status === 'accepted');
  const acceptedStyles = project.styleDecisions.filter((item) => item.status === 'accepted');
  const report: ArtifactFile = {
    path: 'docs/design-intelligence-report.md', mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Intelligent Design Workbench Report`, '',
      `Architecture revision: **${project.revision}**`, '',
      '## Visual design library', '',
      `- Typed component objects: ${components.length}`,
      `- Architecture and design patterns: ${patterns.length}`,
      `- Scoped architecture styles: ${styles.length}`,
      `- Records include depictions, ports, properties, applicability, trade-offs, obligations and evidence references.`, '',
      '## Active design choices', '',
      `- Accepted scoped styles: ${acceptedStyles.length}`,
      `- Accepted patterns: ${acceptedPatterns.length}`,
      `- Architecture entities: ${project.nodes.length}`,
      `- Semantic relationships: ${project.edges.length}`, '',
      '## Accepted scoped styles', '',
      ...(acceptedStyles.length ? acceptedStyles.map((item) => `- **${styles.find((style) => style.id === item.styleId)?.name ?? item.styleId}** — ${item.stage}; scope ${item.scopeNodeId ?? 'active view'}. ${item.rationale}`) : ['- No scoped style decisions have been accepted.']), '',
      '## Accepted patterns and open obligations', '',
      ...(acceptedPatterns.length ? acceptedPatterns.map((selection) => {
        const pattern = patterns.find((item) => item.id === selection.patternId);
        const open = (pattern?.obligations ?? []).filter((item) => !selection.obligationsAcknowledged.includes(item));
        return `- **${pattern?.name ?? selection.patternId}** — ${open.length ? `Open: ${open.join('; ')}` : 'All recorded obligations acknowledged'}`;
      }) : ['- No patterns have been accepted.']), '',
      '## Design-intelligence principle', '',
      'Every semantic canvas mutation should be validated, traced to a library record, and followed by recalculation of styles, patterns, obligations, decisions and affected quality attributes.',
    ].join('\n'),
  };
  return [report, { path: 'library/design-library-manifest.json', mediaType: 'application/json', content: JSON.stringify({ libraryId: library.libraryId, version: library.version, generatedAt: new Date().toISOString(), records }, null, 2) }];
}

function knowledgeIntegrityArtifacts(library: KnowledgeLibrary): ArtifactFile[] {
  const records = createDesignLibrary(library);
  const assessment = assessDesignLibraryIntegrity(library, trustedArchitectureSources);
  const provisional = assessment.records.filter((record) => record.status === 'provisional');
  const insufficient = assessment.records.filter((record) => record.status === 'insufficient');
  const markdown = [
    '# Architecture Knowledge Integrity Report', '',
    `Generated: **${assessment.generatedAt}**`,
    `Library: **${library.libraryId} ${library.version}**`, '',
    '## Summary', '',
    `- Records assessed: ${assessment.summary.totalRecords}`,
    `- Verified: ${assessment.summary.verified}`,
    `- Provisional: ${assessment.summary.provisional}`,
    `- Insufficient: ${assessment.summary.insufficient}`,
    `- Average confidence: ${assessment.summary.averageConfidence}%`,
    `- Stale sources: ${assessment.summary.staleSources}`,
    `- Unresolved evidence identifiers: ${assessment.summary.unresolvedEvidenceIds.length}`, '',
    '## Approved source registry', '',
    ...trustedArchitectureSources.map((source) => `- **${source.title}** — ${source.publisher}; authority ${source.authorityLevel}/5; ${source.ingestionMode}; reviewed ${source.reviewedAt}.`), '',
    '## Provisional records', '',
    ...(provisional.length ? provisional.map((record) => `- **${record.recordName}** — confidence ${record.confidence}%; ${record.gaps.join('; ') || 'requires broader evidence diversity or claim-level calibration'}.`) : ['- None.']), '',
    '## Insufficient records', '',
    ...(insufficient.length ? insufficient.map((record) => `- **${record.recordName}** — ${record.gaps.join('; ')}.`) : ['- None.']), '',
    '## Governance boundary', '',
    'External sources and LLM outputs cannot directly modify production recommendation logic. Allowlisted refresh results become proposals requiring curator review, contradiction analysis, regression testing and a versioned knowledge release.',
  ].join('\n');
  return [
    { path: 'docs/knowledge-integrity-report.md', mediaType: 'text/markdown', content: markdown },
    { path: 'library/trusted-architecture-sources.json', mediaType: 'application/json', content: JSON.stringify({ registryId: 'AIW-TRUSTED-SOURCES', version: library.version, sources: trustedArchitectureSources }, null, 2) },
    { path: 'library/anti-pattern-catalog.json', mediaType: 'application/json', content: JSON.stringify({ catalogId: 'AIW-ANTI-PATTERNS', version: library.version, records: coreAntiPatterns }, null, 2) },
    { path: 'library/knowledge-integrity.json', mediaType: 'application/json', content: JSON.stringify(assessment, null, 2) },
  ];
}

function dynamicKnowledgeMeshArtifacts(): ArtifactFile[] {
  const coverage = assessKnowledgeMeshCoverage();
  const contradictions = detectClaimContradictions(seedKnowledgeClaims);
  const report = [
    '# Dynamic Architecture Knowledge Mesh', '',
    `Connectors: **${coverage.connectors}**`,
    `Approved connectors: **${coverage.approvedConnectors}**`,
    `Discovery-only connectors: **${coverage.discoveryOnlyConnectors}**`,
    `Seed verified claims: **${seedKnowledgeClaims.filter((claim) => claim.reviewStatus === 'verified').length}**`,
    `Claims requiring contradiction review: **${contradictions.length}**`, '',
    '## Governance model', '',
    '1. Retrieve only allowlisted repository paths and create a quarantined snapshot.',
    '2. Use an LLM to extract atomic claims, conditions, limitations and source locations.',
    '3. Deterministically validate source, path, schema, duplication and contradiction posture.',
    '4. Require architecture-expert review and recommendation regression tests.',
    '5. Publish a signed, versioned knowledge release; never auto-publish source or LLM output.', '',
    '## Source tiers', '',
    '- Tier 1: official specifications, foundations and vendor architecture centres.',
    '- Tier 2: mature architecture methods, modelling tools and conformance platforms.',
    '- Tier 3: executable reference implementations and curated examples.',
    '- Tier 4: discovery indexes only; these cannot influence production recommendations directly.', '',
    '## Connector catalogue', '',
    ...knowledgeRepositoryConnectors.map((connector) => `- **${connector.name}** (${connector.repository}) — Tier ${connector.trustTier}; ${connector.lifecycleStatus}; uses: ${connector.contentUses.join(', ')}.`), '',
    '## Safety boundary', '',
    'Repository content is untrusted input. Embedded instructions are ignored, content is license-scoped and size-limited, credentials stay outside project data, and publication remains human-controlled.',
  ].join('\n');
  return [
    { path: 'docs/dynamic-architecture-knowledge-mesh.md', mediaType: 'text/markdown', content: report },
    { path: 'knowledge/github-connector-catalog.json', mediaType: 'application/json', content: JSON.stringify({ version: '0.8.7', coverage, connectors: knowledgeRepositoryConnectors }, null, 2) },
    { path: 'knowledge/approved-claims.json', mediaType: 'application/json', content: JSON.stringify({ version: '0.8.7-seed', claims: seedKnowledgeClaims }, null, 2) },
    { path: 'knowledge/contradiction-report.json', mediaType: 'application/json', content: JSON.stringify({ generatedAt: new Date().toISOString(), contradictions }, null, 2) },
    { path: 'knowledge/llm-extraction-contract.json', mediaType: 'application/json', content: JSON.stringify(extractionPromptContract(), null, 2) },
  ];
}


function patternIntelligenceArtifacts(): ArtifactFile[] {
  const metrics = patternCorpusMetrics();
  const normalization = normalizePatternCorpus();
  const governance = buildRepositoryGovernancePolicies();
  const release = sprint78KnowledgeReleaseManifest();
  const representativeFitness = generateArchitectureFitnessFunctions(['PAT-BOUNDED-CONTEXT','PAT-EVENT-DRIVEN-ARCHITECTURE','PAT-GITOPS','PAT-RETRIEVAL-AUGMENTED-GENERATION']);
  const report = [
    '# Architecture Pattern Intelligence and Composition', '',
    `Knowledge release: **${release.releaseId}**`,
    `Pattern DNA records: **${metrics.totalRecords}**`,
    `Approved records: **${metrics.approvedRecords}**`,
    `Anti-patterns: **${metrics.antiPatterns}**`,
    `Topology templates: **${metrics.topologyTemplates}**`,
    `Records with topology: **${metrics.recordsWithTopology}**`,
    `Evidence coverage: **${metrics.evidenceCoverage}%**`,
    `Conformance coverage: **${metrics.conformanceCoverage}%**`, '',
    '## Repository-use boundary', '',
    'AIW connects to registered repositories for change detection, downloads allowlisted content into immutable commit-pinned snapshots, quarantines it, extracts candidate claims, normalizes and reviews those claims, and publishes signed internal knowledge releases. Production recommendations never query GitHub live.', '',
    '## Source-governance posture', '',
    `- Registered policies: ${governance.length}`,
    `- Production recommendation sources: ${governance.filter((item) => item.productionRecommendationAllowed).length}`,
    `- Discovery or restricted sources: ${governance.filter((item) => !item.productionRecommendationAllowed).length}`,
    '- Discovery-only repositories cannot contribute recommendation scores.',
    '- Provider realizations remain separate from vendor-neutral Pattern DNA.',
    '- Every architecture mutation is previewed, validated and reversible.', '',
    '## Pattern DNA categories', '',
    ...Object.entries(metrics.categories).sort(([a],[b]) => a.localeCompare(b)).map(([category,count]) => `- **${category}**: ${count}`), '',
    '## Release checksum', '',
    `\`${release.checksum}\``, '',
    '## Architecture fitness functions', '',
    ...representativeFitness.map((item) => `- **${item.target}** — ${item.path}; human review required.`), '',
    '## Governance rule', '',
    'Repository popularity, stars, forks and search ranking are discovery signals only. They do not determine architectural suitability or production recommendation scores.',
  ].join('\n');
  return [
    { path: 'docs/pattern-intelligence-and-composition.md', mediaType: 'text/markdown', content: report },
    { path: 'knowledge/pattern-dna-corpus.json', mediaType: 'application/json', content: JSON.stringify({ releaseId: release.releaseId, metrics, records: sprint78PatternCorpus }, null, 2) },
    { path: 'knowledge/pattern-normalization.json', mediaType: 'application/json', content: JSON.stringify(normalization, null, 2) },
    { path: 'knowledge/repository-governance-policies.json', mediaType: 'application/json', content: JSON.stringify({ version: '0.8.8', policies: governance }, null, 2) },
    { path: 'knowledge/pattern-knowledge-release.json', mediaType: 'application/json', content: JSON.stringify(release, null, 2) },
    ...representativeFitness.map((item) => ({ path: item.path, mediaType: item.mediaType, content: item.content })),
  ];
}


function handoffStableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function handoffSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function nodeLabel(project: ArchitectureProject, nodeId: string): string {
  return project.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function sanitizeMarkdown(value: string): string {
  return value.replaceAll('|', '/').replace(/\s+/g, ' ').trim();
}

function c4Diagram(project: ArchitectureProject, stage: string, title: string): ArtifactFile {
  const nodes = project.nodes.filter((node) => node.stage === stage);
  const ids = new Set(nodes.map((node) => node.id));
  const edges = project.edges.filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId));
  const lines = [
    `%% ${title}`,
    'flowchart LR',
    ...(nodes.length ? nodes.map((node) => `  ${handoffSlug(node.id)}["${node.label.replaceAll('"', "'")}\\n${node.kind}"]`) : ['  empty["No objects represented for this view"]']),
    ...edges.map((edge) => `  ${handoffSlug(edge.sourceId)} -->|${(edge.label ?? edge.kind).replaceAll('"', "'")}| ${handoffSlug(edge.targetId)}`),
  ];
  return { path: `handoff/c4/${handoffSlug(title)}.mmd`, mediaType: 'text/plain', content: lines.join('\n') };
}


function csvValue(value: unknown): string {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return `"${normalized.replaceAll('"', '""')}"`;
}

function fullSystemDesignDescription(project: ArchitectureProject, library: KnowledgeLibrary): ArtifactFile {
  return {
    path: 'handoff/system-design-description.md',
    mediaType: 'text/markdown',
    content: composeSdd(project, library),
  };
}

function documentControlArtifact(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile {
  const reviewApproval = [...project.stageApprovals].reverse().find((item) => item.stage === 'validationRealization');
  return {
    path: 'handoff/document-control.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Document Control`, '',
      '| Field | Value |', '|---|---|',
      `| Project ID | ${project.id} |`,
      `| Tenant | ${project.tenantId} |`,
      `| Branch | ${project.branch.name} (${project.branch.id}) |`,
      `| Revision | ${project.revision} |`,
      `| Knowledge release | ${review.knowledgeReleaseId} |`,
      `| Review generated | ${review.generatedAt} |`,
      `| Review disposition | ${reviewApproval?.status ?? 'Not submitted'} |`,
      `| Reviewer | ${reviewApproval?.reviewer ?? reviewApproval?.assignedReviewerId ?? '—'} |`,
      '',
      'Generated artifacts remain proposed until the required architecture, security and delivery approvals are recorded.',
    ].join('\n'),
  };
}

function interfaceRegisterCsv(project: ArchitectureProject): ArtifactFile {
  const header = ['id','provider','interaction','consumers','operationOrEvent','protocol','version','authentication','authorization','encryption','timeoutMs','retryPolicy','idempotency','ordering','deliveryGuarantee','deadLetterPolicy','replayPolicy','slo','dataClassification','owner','lifecycleStatus','schemaRef','evidenceIds'];
  const rows = (project.interfaces ?? []).length
    ? (project.interfaces ?? []).map((contract) => [
        contract.id,
        nodeLabel(project, contract.providerNodeId),
        contract.interactionStyle,
        contract.consumerNodeIds.map((id) => nodeLabel(project, id)).join('; '),
        contract.operationOrEvent,
        contract.protocol,
        contract.version,
        contract.authentication,
        contract.authorization,
        contract.encryption,
        contract.timeoutMs ?? '',
        contract.retryPolicy,
        contract.idempotency,
        contract.ordering,
        contract.deliveryGuarantee,
        contract.deadLetterPolicy,
        contract.replayPolicy,
        contract.slo,
        contract.dataClassification,
        contract.owner,
        contract.lifecycleStatus,
        contract.schemaRef ?? '',
        contract.evidenceIds.join('; '),
      ])
    : project.edges
      .filter((edge) => ['communicatesWith','publishes','subscribes','dependsOn','reads','writes','stores'].includes(edge.kind))
      .map((edge) => [
        edge.id, nodeLabel(project, edge.sourceId), edge.kind, nodeLabel(project, edge.targetId),
        edge.label ?? edge.properties.contract ?? edge.properties.api ?? edge.properties.event ?? '',
        edge.properties.protocol ?? '', '', edge.properties.authentication ?? edge.properties.auth ?? '', '', '',
        edge.properties.timeout ?? '', edge.properties.retry ?? edge.properties.failurePolicy ?? '', '', '', '', '', '', '',
        edge.properties.classification ?? '', edge.properties.owner ?? edge.properties.team ?? '', 'proposed', '', '',
      ]);
  return {
    path: 'handoff/interface-register.csv',
    mediaType: 'text/csv',
    content: [header, ...rows].map((row) => row.map(csvValue).join(',')).join('\n'),
  };
}

function modelTraceabilityCsv(project: ArchitectureProject): ArtifactFile {
  const header = ['nodeId','label','stage','kind','status','lineageFrom','owner','tags'];
  const rows = project.nodes.map((node) => [
    node.id,
    node.label,
    node.stage,
    node.kind,
    node.status,
    node.lineageFrom.map((id) => nodeLabel(project, id)).join('; '),
    node.properties.owner ?? node.properties.team ?? node.properties.accountable ?? '',
    node.tags.join('; '),
  ]);
  return {
    path: 'handoff/model-traceability.csv',
    mediaType: 'text/csv',
    content: [header, ...rows].map((row) => row.map(csvValue).join(',')).join('\n'),
  };
}

function dataArchitectureArtifact(project: ArchitectureProject): ArtifactFile {
  const dataNodes = project.nodes.filter((node) => ['DataDomain','DataEntity','DataStore'].includes(node.kind));
  const dataEdges = project.edges.filter((edge) => ['reads','writes','stores','publishes','subscribes'].includes(edge.kind));
  return {
    path: 'handoff/data-architecture.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Data Architecture`, '',
      '| Data object | Kind | Owner / system of record | Classification | Consistency | Encryption | Retention / backup | Residency |',
      '|---|---|---|---|---|---|---|---|',
      ...(dataNodes.length ? dataNodes.map((node) => `| ${sanitizeMarkdown(node.label)} | ${node.kind} | ${sanitizeMarkdown(String(node.properties.owner ?? node.properties.dataOwner ?? node.properties.systemOfRecord ?? '—'))} | ${sanitizeMarkdown(String(node.properties.classification ?? node.properties.sensitivity ?? '—'))} | ${sanitizeMarkdown(String(node.properties.consistency ?? node.properties.consistencyModel ?? '—'))} | ${sanitizeMarkdown(String(node.properties.encryption ?? node.properties.encryptedAtRest ?? '—'))} | ${sanitizeMarkdown(String(node.properties.retention ?? node.properties.backup ?? '—'))} | ${sanitizeMarkdown(String(node.properties.residency ?? node.properties.region ?? '—'))} |`) : ['| — | — | — | — | — | — | — | No data architecture objects captured |']),
      '', '## Data flows', '',
      '| Source | Operation | Target | Contract |', '|---|---|---|---|',
      ...(dataEdges.length ? dataEdges.map((edge) => `| ${nodeLabel(project, edge.sourceId)} | ${edge.kind} | ${nodeLabel(project, edge.targetId)} | ${sanitizeMarkdown(edge.label ?? String(edge.properties.contract ?? '—'))} |`) : ['| — | — | — | No explicit data flows captured |']),
    ].join('\n'),
  };
}

function securityArchitectureArtifact(project: ArchitectureProject): ArtifactFile {
  const controls = project.nodes.filter((node) => node.kind === 'Control' || /identity|security|iam|encrypt|secret|policy|firewall|gateway/i.test(`${node.label} ${node.description ?? ''}`));
  return {
    path: 'handoff/security-architecture.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Security and Trust Architecture`, '',
      '| Control / capability | Kind | Purpose | Owner | Scope / trust zone | Evidence |',
      '|---|---|---|---|---|---|',
      ...(controls.length ? controls.map((node) => `| ${sanitizeMarkdown(node.label)} | ${node.kind} | ${sanitizeMarkdown(node.description ?? '—')} | ${sanitizeMarkdown(String(node.properties.owner ?? node.properties.team ?? '—'))} | ${sanitizeMarkdown(String(node.properties.zone ?? node.properties.scope ?? node.properties.boundary ?? '—'))} | ${sanitizeMarkdown(String(node.properties.evidence ?? node.properties.policy ?? node.properties.standard ?? '—'))} |`) : ['| — | — | — | — | — | No explicit security-control objects captured |']),
      '', '## Tenant security posture', '',
      `- SSO required: ${project.securitySettings.requireSso ? 'Yes' : 'No'}`,
      `- Development authentication allowed: ${project.securitySettings.allowDevelopmentAuth ? 'Yes' : 'No'}`,
      `- Session maximum age: ${project.securitySettings.sessionMaxAgeMinutes} minutes`,
      `- Audit retention: ${project.securitySettings.auditRetentionDays} days`,
      `- Encryption key reference: ${project.securitySettings.encryptionKeyReference}`,
      `- Identity providers: ${project.identityProviders.map((item) => `${item.name} (${item.type}, ${item.enabled ? 'enabled' : 'disabled'})`).join('; ') || 'None'}`,
    ].join('\n'),
  };
}

function resilienceOperationsArtifact(project: ArchitectureProject): ArtifactFile {
  const physical = project.nodes.filter((node) => node.stage === 'physicalTechnology');
  return {
    path: 'handoff/resilience-and-operations.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Resilience and Operations`, '',
      `Availability target: **${project.context.availabilityTarget ?? 'Not specified'}**`,
      `Recovery objectives: **${project.context.recoveryObjectives ?? 'Not specified'}**`,
      `Support model: **${project.context.supportModel ?? 'Not specified'}**`, '',
      '| Deployment object | Region / zone | Runtime | Capacity | Recovery / failover | Owner |',
      '|---|---|---|---|---|---|',
      ...(physical.length ? physical.map((node) => `| ${sanitizeMarkdown(node.label)} | ${sanitizeMarkdown(String(node.properties.region ?? '—'))} / ${sanitizeMarkdown(String(node.properties.zone ?? node.properties.availabilityZone ?? '—'))} | ${sanitizeMarkdown(String(node.properties.runtime ?? node.properties.platform ?? '—'))} | ${sanitizeMarkdown(String(node.properties.capacity ?? node.properties.replicas ?? node.properties.autoscaling ?? '—'))} | ${sanitizeMarkdown(String(node.properties.failover ?? node.properties.backup ?? node.properties.rto ?? node.properties.rpo ?? node.properties.recovery ?? '—'))} | ${sanitizeMarkdown(String(node.properties.owner ?? node.properties.team ?? '—'))} |`) : ['| — | — | — | — | — | No physical technology objects captured |']),
      '', '## Service-level objectives', '',
      ...(project.serviceLevelObjectives.length ? project.serviceLevelObjectives.map((item) => `- **${item.name}** — ${item.indicator} target ${item.target} over ${item.window}.`) : ['- No service-level objectives captured.']),
    ].join('\n'),
  };
}

function migrationTransitionArtifact(project: ArchitectureProject): ArtifactFile {
  const transitionNodes = project.nodes.filter((node) => /legacy|existing|migration|strangler|coexist|transition/i.test(`${node.label} ${node.description ?? ''} ${node.tags.join(' ')}`));
  return {
    path: 'handoff/migration-and-transition.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Migration and Transition Plan`, '',
      `Transition state: **${project.context.transitionState ?? 'Not specified'}**`,
      `Existing systems: **${project.context.existingSystems?.join(', ') || 'Not specified'}**`,
      `Legacy constraints: **${project.context.legacyConstraints?.join(', ') || 'Not specified'}**`,
      `Reversibility preference: **${project.context.reversibilityPreference ?? 'Not specified'}**`,
      `Change cadence: **${project.context.changeCadence ?? 'Not specified'}**`, '',
      '## Transition-relevant model objects', '',
      ...(transitionNodes.length ? transitionNodes.map((node) => `- **${node.label}** (${node.kind}) — ${node.description ?? 'No transition description captured.'}`) : ['- No transition-relevant model objects identified.']), '',
      '## Delivery planning requirements', '',
      '- Define migration waves, coexistence boundaries and rollback criteria.',
      '- Define data migration, reconciliation and cutover ownership.',
      '- Define decommission conditions for superseded components.',
      '- Validate operational and organisational readiness before each wave.',
    ].join('\n'),
  };
}

function crossStageLineageDiagram(project: ArchitectureProject): ArtifactFile {
  const nodes = project.nodes.filter((node) => node.status !== 'deprecated');
  const lineageEdges = nodes.flatMap((node) => node.lineageFrom.map((sourceId) => ({ sourceId, targetId: node.id })));
  return {
    path: 'handoff/diagrams/cross-stage-lineage.mmd',
    mediaType: 'text/plain',
    content: [
      'flowchart LR',
      ...nodes.map((node) => `  ${handoffSlug(node.id)}["${node.label.replaceAll('"', "'")}\\n${node.stage} · ${node.kind}"]`),
      ...lineageEdges.map((edge) => `  ${handoffSlug(edge.sourceId)} -. realizes .-> ${handoffSlug(edge.targetId)}`),
    ].join('\n'),
  };
}

function dataFlowDiagram(project: ArchitectureProject): ArtifactFile {
  const relevant = project.edges.filter((edge) => ['reads','writes','stores','publishes','subscribes','communicatesWith'].includes(edge.kind));
  const ids = new Set(relevant.flatMap((edge) => [edge.sourceId, edge.targetId]));
  return {
    path: 'handoff/diagrams/data-and-integration-flow.mmd',
    mediaType: 'text/plain',
    content: [
      'flowchart LR',
      ...project.nodes.filter((node) => ids.has(node.id)).map((node) => `  ${handoffSlug(node.id)}["${node.label.replaceAll('"', "'")}\\n${node.kind}"]`),
      ...relevant.map((edge) => `  ${handoffSlug(edge.sourceId)} -->|${(edge.label ?? edge.kind).replaceAll('"', "'")}| ${handoffSlug(edge.targetId)}`),
    ].join('\n'),
  };
}

function executiveSummaryArtifact(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile {
  const blockers = review.findings.filter((finding) => finding.severity === 'critical' || finding.severity === 'high');
  return {
    path: 'handoff/executive-summary.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Executive Architecture Summary`,
      '',
      `Generated: **${review.generatedAt}**`,
      `Knowledge release: **${review.knowledgeReleaseId}**`,
      `Delivery-readiness score: **${review.deliveryReadinessScore}%**`,
      '',
      '## Board-level summary',
      '',
      review.executiveSummary,
      '',
      '## Business objectives',
      '',
      ...(project.objectives.length ? project.objectives.map((objective) => `- ${objective}`) : ['- No explicit objectives captured.']),
      '',
      '## Material risks requiring management attention',
      '',
      ...(blockers.length ? blockers.slice(0, 8).map((finding) => `- **${finding.severity.toUpperCase()}: ${finding.title}** — ${finding.recommendedFix}`) : ['- No high/critical review blockers were detected by the deterministic review engine.']),
      '',
      '## Recommended executive decision',
      '',
      review.deliveryReadinessScore >= 80 && blockers.length === 0
        ? 'Proceed to delivery planning with ADR finalization, CI fitness controls and repository evidence mapping.'
        : 'Proceed only after the highlighted review blockers are accepted as explicit remediation actions, waivers or revised architecture decisions.',
      '',
      '## Governance boundary',
      '',
      '- This pack is generated from the canonical architecture model and deterministic Review Studio output.',
      '- Generated ADRs and implementation backlog items remain proposed until human approval.',
      '- LLM-generated narratives, where used by consumers, must not score, approve or mutate the architecture silently.',
    ].join('\n'),
  };
}

function solutionArchitectureDocument(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile {
  const logical = project.nodes.filter((node) => node.stage === 'logicalApplication');
  const data = project.nodes.filter((node) => node.kind === 'DataStore');
  const controls = project.nodes.filter((node) => node.kind === 'Control');
  const integrations = project.edges.filter((edge) => ['communicatesWith', 'publishes', 'subscribes', 'dependsOn'].includes(edge.kind));
  return {
    path: 'handoff/solution-architecture-document.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Solution Architecture Document`,
      '',
      '## 1. Purpose and scope',
      '',
      project.description || 'No project description has been captured.',
      '',
      '## 2. Objectives',
      '',
      ...(project.objectives.length ? project.objectives.map((objective) => `- ${objective}`) : ['- No explicit objectives captured.']),
      '',
      '## 3. Constraints and assumptions',
      '',
      ...(project.constraints.length ? project.constraints.map((constraint) => `- Constraint: ${constraint}`) : ['- No explicit constraints captured.']),
      ...(project.assumptions.length ? project.assumptions.map((assumption) => `- Assumption: ${assumption}`) : ['- No explicit assumptions captured.']),
      '',
      '## 4. Quality drivers and scenarios',
      '',
      ...(project.qualityPriorities.length ? project.qualityPriorities.map((driver) => `- **${driver.attributeId}** — weight ${driver.weight}`) : ['- No quality priorities captured.']),
      '',
      ...(project.qualityScenarios.length ? project.qualityScenarios.map((scenario) => `- **${scenario.attributeId}** — stimulus: ${scenario.stimulus}; response: ${scenario.response}; measure: ${scenario.responseMeasure}`) : ['- No measurable quality scenarios captured.']),
      '',
      '## 5. Logical architecture',
      '',
      '| Component | Kind | Description | Owner/context |',
      '|---|---|---|---|',
      ...(logical.length ? logical.map((node) => `| ${node.label} | ${node.kind} | ${sanitizeMarkdown(node.description ?? '—')} | ${sanitizeMarkdown(String(node.properties.owner ?? node.properties.team ?? node.properties.boundedContext ?? '—'))} |`) : ['| — | — | No logical components captured | — |']),
      '',
      '## 6. Integration architecture',
      '',
      '| Source | Relationship | Target | Contract/policy |',
      '|---|---|---|---|',
      ...(integrations.length ? integrations.map((edge) => `| ${nodeLabel(project, edge.sourceId)} | ${edge.kind} | ${nodeLabel(project, edge.targetId)} | ${sanitizeMarkdown(edge.label ?? String(edge.properties.protocol ?? edge.properties.contract ?? '—'))} |`) : ['| — | — | — | No integrations captured |']),
      '',
      '## 7. Data architecture',
      '',
      ...(data.length ? data.map((node) => `- **${node.label}** — ${node.description ?? node.kind}; controls: encryption=${String(node.properties.encryption ?? node.properties.encryptedAtRest ?? 'not specified')}, backup=${String(node.properties.backup ?? node.properties.retention ?? 'not specified')}, consistency=${String(node.properties.consistency ?? node.properties.consistencyModel ?? 'not specified')}.`) : ['- No data stores represented.']),
      '',
      '## 8. Security and control architecture',
      '',
      ...(controls.length ? controls.map((node) => `- **${node.label}** — ${node.description ?? 'Control represented in the architecture model.'}`) : ['- No explicit control nodes represented. Review security findings before handoff.']),
      '',
      '## 9. Deployment and operations architecture',
      '',
      ...(project.deploymentProfiles.length ? project.deploymentProfiles.map((profile) => `- **${profile.environment}** — replicas ${profile.replicas}; min ${profile.minReplicas}; max ${profile.maxReplicas}; CPU ${profile.cpuRequest}; memory ${profile.memoryRequest}.`) : ['- No deployment profile captured.']),
      ...(project.serviceLevelObjectives.length ? project.serviceLevelObjectives.map((slo) => `- SLO: **${slo.name}** — ${slo.indicator} target ${slo.target} over ${slo.window}.`) : ['- No service-level objectives captured.']),
      '',
      '## 10. Architecture review outcome',
      '',
      `Delivery readiness: **${review.deliveryReadinessScore}%**`,
      '',
      ...review.scorecard.map((dimension) => `- **${dimension.label}: ${dimension.score} (${dimension.status})** — ${dimension.rationale}`),
      '',
      '## 11. Open decisions and obligations',
      '',
      ...(review.recommendations.length ? review.recommendations.map((item) => `- **${item.title}** — ${item.recommendedDecision}`) : ['- No review recommendations generated.']),
      '',
      '## 12. Approval boundary',
      '',
      'This document is a handoff artifact. It becomes authoritative only after architecture review, security review, delivery-owner acceptance and repository evidence mapping are completed.',
    ].join('\n'),
  };
}

function adrPack(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile {
  const existing = project.decisions.map((decision, index) => [
    `## ADR-${String(index + 1).padStart(4, '0')}: ${decision.title}`,
    '',
    `Status: **${decision.status}**`,
    '',
    '### Context', decision.context,
    '',
    '### Decision', decision.decision,
    '',
    '### Consequences', ...(decision.consequences.length ? decision.consequences.map((item) => `- ${item}`) : ['- No consequences recorded.']),
    '',
  ].join('\n'));
  const generated = review.generatedAdrs.map((adr: GeneratedReviewAdr, index) => [
    `## REVIEW-ADR-${String(index + 1).padStart(4, '0')}: ${adr.title}`,
    '',
    'Status: **Proposed — human approval required**',
    '',
    '### Context', adr.context,
    '',
    '### Decision', adr.decision,
    '',
    '### Alternatives considered', ...(adr.alternatives.length ? adr.alternatives.map((item) => `- ${item}`) : ['- No alternatives generated.']),
    '',
    '### Consequences', ...(adr.consequences.length ? adr.consequences.map((item) => `- ${item}`) : ['- No consequences generated.']),
    '',
    '### Risks', ...(adr.risks.length ? adr.risks.map((item) => `- ${item}`) : ['- No risks generated.']),
    '',
    `Impacted components: ${adr.impactedComponentIds.join(', ') || '—'}`,
    `Review evidence: ${adr.reviewEvidenceIds.join(', ') || '—'}`,
    '',
  ].join('\n'));
  return {
    path: 'handoff/adr-pack.md',
    mediaType: 'text/markdown',
    content: [`# ${project.name} — Architecture Decision Record Pack`, '', '## Existing ADRs', '', ...(existing.length ? existing : ['No existing ADRs captured.']), '', '## Review-generated ADRs', '', ...(generated.length ? generated : ['No review-generated ADRs were produced.'])].join('\n'),
  };
}

function deploymentView(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile {
  const deploymentNodes = project.nodes.filter((node) => ['physicalTechnology', 'technology'].includes(String(node.stage)) || ['DeploymentNode', 'Environment', 'Region', 'AvailabilityZone', 'NetworkZone', 'Runtime', 'DeployableUnit'].includes(node.kind));
  return {
    path: 'handoff/deployment-view.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Deployment View`,
      '',
      '## Deployment objects',
      '',
      '| Object | Kind | Stage | Properties |',
      '|---|---|---|---|',
      ...(deploymentNodes.length ? deploymentNodes.map((node) => `| ${node.label} | ${node.kind} | ${node.stage} | ${sanitizeMarkdown(JSON.stringify(node.properties))} |`) : ['| — | — | — | No deployment objects represented |']),
      '',
      '## Deployment-readiness findings',
      '',
      ...review.findings.filter((finding) => finding.category === 'deployment' || finding.category === 'operations').map((finding) => `- **${finding.severity}: ${finding.title}** — ${finding.recommendedFix}`),
      ...(review.findings.some((finding) => finding.category === 'deployment' || finding.category === 'operations') ? [] : ['- No deployment/operations findings detected.']),
    ].join('\n'),
  };
}

function integrationCatalogue(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile {
  const integrationEdges = project.edges.filter((edge) => ['communicatesWith', 'publishes', 'subscribes', 'dependsOn', 'reads', 'writes', 'stores'].includes(edge.kind));
  return {
    path: 'handoff/integration-catalogue.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Integration Catalogue`,
      '',
      '| ID | Source | Relationship | Target | Protocol/contract | Failure policy | Review posture |',
      '|---|---|---|---|---|---|---|',
      ...(integrationEdges.length ? integrationEdges.map((edge) => {
        const related = review.findings.filter((finding) => finding.affectedEdgeIds.includes(edge.id));
        const posture = related.length ? related.map((finding) => `${finding.severity}: ${finding.title}`).join('; ') : 'No review finding';
        return `| ${edge.id} | ${nodeLabel(project, edge.sourceId)} | ${edge.kind} | ${nodeLabel(project, edge.targetId)} | ${sanitizeMarkdown(edge.label ?? String(edge.properties.protocol ?? edge.properties.contract ?? '—'))} | ${sanitizeMarkdown(String(edge.properties.failurePolicy ?? edge.properties.timeout ?? edge.properties.circuitBreaker ?? '—'))} | ${sanitizeMarkdown(posture)} |`;
      }) : ['| — | — | — | — | — | — | No integration relationships captured |']),
    ].join('\n'),
  };
}

function riskRegister(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile {
  const rows = review.findings.map((finding: ReviewFinding) => {
    const owner = finding.affectedNodeIds.map((nodeId) => project.nodes.find((node) => node.id === nodeId)?.properties.owner ?? project.nodes.find((node) => node.id === nodeId)?.properties.team).find(Boolean) ?? 'Architecture owner';
    return `| ${finding.id} | ${finding.severity} | ${sanitizeMarkdown(finding.title)} | ${sanitizeMarkdown(finding.whyItMatters)} | ${sanitizeMarkdown(finding.recommendedFix)} | ${sanitizeMarkdown(String(owner))} | Open |`;
  });
  return { path: 'handoff/risk-register.md', mediaType: 'text/markdown', content: [`# ${project.name} — Architecture Risk Register`, '', '| Risk ID | Severity | Risk | Impact | Treatment | Owner | Status |', '|---|---|---|---|---|---|---|', ...(rows.length ? rows : ['| — | — | No review findings | — | Continue monitoring | Architecture owner | Closed |'])].join('\n') };
}

function fitnessTestPack(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile[] {
  const markdown = [
    `# ${project.name} — Architecture Fitness Test Pack`,
    '',
    'These tests are generated from the deterministic architecture review and should be converted into CI/repository/runtime checks during delivery.',
    '',
    '| Test | Scope | Severity | Assertion | Evidence |',
    '|---|---|---|---|---|',
    ...(review.fitnessTests.length ? review.fitnessTests.map((test: GeneratedFitnessTest) => `| ${test.title} | ${test.scope} | ${test.severity} | ${sanitizeMarkdown(test.assertion)} | ${test.evidenceIds.join(', ') || '—'} |`) : ['| — | — | — | No generated fitness tests | — |']),
  ].join('\n');
  const yaml = [
    'name: AIW Review Fitness Tests',
    'on:',
    '  pull_request:',
    '    paths:',
    "      - 'architecture/**'",
    '  workflow_dispatch:',
    'jobs:',
    '  review-fitness:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: actions/setup-node@v4',
    '        with:',
    "          node-version: '22'",
    '      - run: npm ci',
    '      - run: npm run architecture:gate -- --review handoff/architecture-review.json --tests handoff/fitness-tests.json',
  ].join('\n');
  return [
    { path: 'handoff/fitness-tests.md', mediaType: 'text/markdown', content: markdown },
    { path: 'handoff/fitness-tests.json', mediaType: 'application/json', content: JSON.stringify(review.fitnessTests, null, 2) },
    { path: '.github/workflows/aiw-review-fitness.yml', mediaType: 'text/yaml', content: yaml },
  ];
}

function implementationBacklog(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile[] {
  const items = review.findings.map((finding, index) => ({
    id: `AIW-BACKLOG-${String(index + 1).padStart(3, '0')}`,
    title: finding.generatedAction,
    description: finding.recommendedFix,
    severity: finding.severity,
    category: finding.category,
    affectedObjects: [...finding.affectedNodeIds, ...finding.affectedEdgeIds],
    evidenceIds: finding.supportingEvidenceIds,
    status: 'proposed',
  }));
  const markdown = [
    `# ${project.name} — Architecture Implementation Backlog`,
    '',
    '| ID | Severity | Category | Title | Status |',
    '|---|---|---|---|---|',
    ...(items.length ? items.map((item) => `| ${item.id} | ${item.severity} | ${item.category} | ${sanitizeMarkdown(item.title)} | ${item.status} |`) : ['| — | — | — | No backlog items generated | — |']),
  ].join('\n');
  return [
    { path: 'handoff/implementation-backlog.md', mediaType: 'text/markdown', content: markdown },
    { path: 'handoff/implementation-backlog.json', mediaType: 'application/json', content: JSON.stringify(items, null, 2) },
  ];
}

function reviewScorecardArtifact(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile {
  return {
    path: 'handoff/review-scorecard.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Architecture Review Scorecard`,
      '',
      `Delivery readiness: **${review.deliveryReadinessScore}%**`,
      '',
      '| Dimension | Score | Status | Rationale | Evidence |',
      '|---|---:|---|---|---|',
      ...review.scorecard.map((dimension) => `| ${dimension.label} | ${dimension.score} | ${dimension.status} | ${sanitizeMarkdown(dimension.rationale)} | ${dimension.evidence.join(', ') || '—'} |`),
    ].join('\n'),
  };
}

function evidenceTraceability(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile {
  const recommendationRows = review.recommendations.map((item) => `| ${item.id} | ${sanitizeMarkdown(item.title)} | ${item.findingIds.join(', ')} | ${item.evidenceIds.join(', ') || '—'} | ${item.shouldBecomeAdr ? 'Yes' : 'No'} |`);
  const fitnessRows = review.fitnessTests.map((item) => `| ${item.id} | ${sanitizeMarkdown(item.title)} | ${item.relatedFindingIds.join(', ')} | ${item.evidenceIds.join(', ') || '—'} | ${item.scope} |`);
  return {
    path: 'handoff/evidence-traceability.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Review Evidence Traceability`,
      '',
      `Knowledge release: **${review.knowledgeReleaseId}**`,
      '',
      '## Recommendations to findings',
      '',
      '| Recommendation | Title | Finding IDs | Evidence | ADR? |',
      '|---|---|---|---|---|',
      ...(recommendationRows.length ? recommendationRows : ['| — | — | — | — | — |']),
      '',
      '## Fitness tests to findings',
      '',
      '| Fitness test | Title | Finding IDs | Evidence | Scope |',
      '|---|---|---|---|---|',
      ...(fitnessRows.length ? fitnessRows : ['| — | — | — | — | — |']),
    ].join('\n'),
  };
}

function handoffChecklist(project: ArchitectureProject, review: ArchitectureReview): ArtifactFile {
  const hasCritical = review.findings.some((finding) => finding.severity === 'critical');
  const hasHigh = review.findings.some((finding) => finding.severity === 'high');
  return {
    path: 'handoff/handoff-checklist.md',
    mediaType: 'text/markdown',
    content: [
      `# ${project.name} — Architecture Handoff Checklist`,
      '',
      `- [${project.objectives.length ? 'x' : ' '}] Objectives and constraints captured`,
      `- [${project.qualityScenarios.length ? 'x' : ' '}] Quality scenarios captured`,
      `- [${project.nodes.length ? 'x' : ' '}] Canonical architecture model populated`,
      `- [${project.edges.length ? 'x' : ' '}] Semantic relationships captured`,
      `- [${project.decisions.length || review.generatedAdrs.length ? 'x' : ' '}] ADR baseline available`,
      `- [${review.fitnessTests.length ? 'x' : ' '}] Fitness tests generated`,
      `- [${!hasCritical ? 'x' : ' '}] No critical review blockers`,
      `- [${!hasHigh ? 'x' : ' '}] No high review blockers or explicit waivers recorded`,
      `- [${project.repositoryBindings.length ? 'x' : ' '}] Repository evidence path mapped`,
      `- [${project.runtimeInventories.length ? 'x' : ' '}] Runtime inventory/evidence connected`,
      '',
      '## Required approvals before delivery',
      '',
      '- Architecture owner approval',
      '- Security reviewer approval',
      '- Delivery owner acceptance',
      '- Product/business owner acceptance',
      '- Conformance/CI owner acceptance',
    ].join('\n'),
  };
}


function artifactBytes(file: ArtifactFile): Uint8Array {
  if (file.encoding === 'base64') {
    const clean = file.content.replace(/\s+/g,'');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const output: number[] = [];
    for (let index=0; index<clean.length; index+=4) {
      const a=alphabet.indexOf(clean[index] ?? 'A'); const b=alphabet.indexOf(clean[index+1] ?? 'A');
      const c=(clean[index+2] ?? '=') === '=' ? 0 : alphabet.indexOf(clean[index+2]!); const d=(clean[index+3] ?? '=') === '=' ? 0 : alphabet.indexOf(clean[index+3]!);
      const triplet=(a<<18)|(b<<12)|(c<<6)|d; output.push((triplet>>16)&255); if ((clean[index+2] ?? '=') !== '=') output.push((triplet>>8)&255); if ((clean[index+3] ?? '=') !== '=') output.push(triplet&255);
    }
    return Uint8Array.from(output);
  }
  return new TextEncoder().encode(file.content);
}

function interoperabilityArtifacts(project: ArchitectureProject): ArtifactFile[] {
  const formats = ['structurizr-dsl','calm-json','likec4'] as const;
  const documents = formats.map((format) => exportArchitectureExchange(project,format));
  const reports = formats.map((format) => assessArchitectureRoundTrip(project,format));
  return [
    ...documents.map((document) => ({ path: `handoff/architecture-as-code/${document.fileName}`, mediaType: document.mediaType, content: document.content })),
    { path:'handoff/architecture-as-code/round-trip-validation.json', mediaType:'application/json', content:JSON.stringify(reports,null,2) },
    { path:'handoff/architecture-as-code/README.md', mediaType:'text/markdown', content:[
      '# Architecture-as-Code Exchange', '',
      'This directory contains governed exports of the same canonical AIW model in Structurizr DSL, CALM-compatible JSON and LikeC4.', '',
      ...reports.map((report) => `- **${report.format}** — ${report.overallFidelityPercent}% round-trip fidelity; ${report.passed ? 'passed' : 'review required'}.`), '',
      'AIW metadata is preserved in standards-compatible extension fields or comments so stable semantic identity, lifecycle stage, lineage and governed properties survive a round trip.',
    ].join('\n') },
  ];
}

function providerCatalogArtifacts(project: ArchitectureProject): ArtifactFile[] {
  const used = project.nodes.filter((node) => node.stage === 'logicalTechnology' || node.kind === 'LogicalTechnologyCapability').map((node) => {
    const text = `${node.label} ${node.description ?? ''} ${node.tags.join(' ')}`.toLowerCase();
    const candidates = providerProductCatalog.filter((entry) => [entry.neutralCapability,...entry.capabilityAliases].some((term) => text.includes(term.toLowerCase()) || term.toLowerCase().includes(text)));
    return { nodeId:node.id, capability:node.label, candidates };
  });
  return [
    { path:'handoff/provider-product-catalog.json', mediaType:'application/json', content:JSON.stringify({ releaseId:'PPC-0.10.60', providerNeutralFirst:true, entries:providerProductCatalog, projectMappings:used },null,2) },
    { path:'handoff/provider-product-mapping.md', mediaType:'text/markdown', content:[
      `# ${project.name} — Provider Product Mapping`, '',
      'Provider products are non-authoritative overlays. The vendor-neutral capability remains the architecture source of truth.', '',
      '| Capability | AWS | Azure | GCP | On-premises | Portable |', '|---|---|---|---|---|---|',
      ...used.map((item) => { const product=(provider:string)=>item.candidates.find((candidate)=>candidate.provider===provider)?.productName ?? 'Review required'; return `| ${sanitizeMarkdown(item.capability)} | ${sanitizeMarkdown(product('aws'))} | ${sanitizeMarkdown(product('azure'))} | ${sanitizeMarkdown(product('gcp'))} | ${sanitizeMarkdown(product('on-premises'))} | ${sanitizeMarkdown(product('portable'))} |`; }),
    ].join('\n') },
  ];
}

function accessiblePdfProfileArtifact(project: ArchitectureProject, library: KnowledgeLibrary): ArtifactFile {
  const pdf = renderAccessibleSddPdf(project,library);
  return { path:'handoff/system-design-description-accessibility.json', mediaType:'application/json', content:JSON.stringify({ ...pdf.profile, pageCount:pdf.pageCount, bookmarkCount:pdf.bookmarkCount, bytes:pdf.bytes.length },null,2) };
}

function solutionDeliveryManifest(project: ArchitectureProject, review: ArchitectureReview, files: ArtifactFile[]): ArtifactFile {
  const manifest = {
    packageId: `AIW-HANDOFF-${project.id}-${project.revision}`,
    packageType: 'solution-delivery-pack',
    generatedAt: new Date().toISOString(),
    projectId: project.id,
    projectName: project.name,
    projectRevision: project.revision,
    knowledgeReleaseId: review.knowledgeReleaseId,
    deliveryReadinessScore: review.deliveryReadinessScore,
    contents: files.map((file) => ({ path: file.path, mediaType: file.mediaType, encoding: file.encoding ?? 'utf8', bytes: artifactBytes(file).length, checksum: handoffStableHash(file.content), accessibility: file.accessibility })),
    authority: review.authority,
    approvalBoundary: 'Generated pack is proposed until human architecture/security/delivery approval is recorded.',
  };
  return { path: 'handoff/manifest.json', mediaType: 'application/json', content: JSON.stringify(manifest, null, 2) };
}

export function compileSolutionDeliveryPack(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  review: ArchitectureReview = runArchitectureReview(project, library),
): ArtifactBundle {
  const files: ArtifactFile[] = [
    documentControlArtifact(project, review),
    executiveSummaryArtifact(project, review),
    fullSystemDesignDescription(project, library),
    accessibleSddPdfArtifact(project, library),
    accessiblePdfProfileArtifact(project, library),
    solutionArchitectureDocument(project, review),
    interfaceRegisterCsv(project),
    modelTraceabilityCsv(project),
    dataArchitectureArtifact(project),
    securityArchitectureArtifact(project),
    resilienceOperationsArtifact(project),
    migrationTransitionArtifact(project),
    crossStageLineageDiagram(project),
    dataFlowDiagram(project),
    ...architectureDiagramArtifacts(project),
    adrPack(project, review),
    c4Diagram(project, 'business', 'C4 Context View'),
    c4Diagram(project, 'logicalApplication', 'C4 Container View'),
    c4Diagram(project, 'applicationRealization', 'C4 Component View'),
    deploymentView(project, review),
    integrationCatalogue(project, review),
    riskRegister(project, review),
    ...fitnessTestPack(project, review),
    ...implementationBacklog(project, review),
    reviewScorecardArtifact(project, review),
    evidenceTraceability(project, review),
    handoffChecklist(project, review),
    { path: 'handoff/architecture-review.json', mediaType: 'application/json', content: JSON.stringify(review, null, 2) },
    ...interoperabilityArtifacts(project),
    ...providerCatalogArtifacts(project),
    { path: 'handoff/canonical-architecture.json', mediaType: 'application/json', content: JSON.stringify(project, null, 2) },
  ];
  const manifest = solutionDeliveryManifest(project, review, files);
  return {
    generatedAt: new Date().toISOString(),
    projectId: project.id,
    files: [manifest, ...files],
  };
}


export interface ArtifactArchive {
  fileName: string;
  mediaType: 'application/zip';
  bytes: Uint8Array;
  fileCount: number;
  totalUncompressedBytes: number;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16LE(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32LE(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

function dosTimestamp(date = new Date()): { time: number; date: number } {
  const year = Math.max(date.getFullYear(), 1980);
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function zipSafePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.\.(\/|$)/g, '').trim() || 'artifact.txt';
}

export function createArtifactArchive(bundle: ArtifactBundle, options: { fileName?: string } = {}): ArtifactArchive {
  const encoder = new TextEncoder();
  const stamp = dosTimestamp();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  let totalUncompressedBytes = 0;

  for (const file of bundle.files) {
    const fileName = zipSafePath(file.path);
    const nameBytes = encoder.encode(fileName);
    const contentBytes = artifactBytes(file);
    const checksum = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32LE(localHeader, 0, 0x04034b50);
    writeUint16LE(localHeader, 4, 20);
    writeUint16LE(localHeader, 6, 0);
    writeUint16LE(localHeader, 8, 0);
    writeUint16LE(localHeader, 10, stamp.time);
    writeUint16LE(localHeader, 12, stamp.date);
    writeUint32LE(localHeader, 14, checksum);
    writeUint32LE(localHeader, 18, contentBytes.length);
    writeUint32LE(localHeader, 22, contentBytes.length);
    writeUint16LE(localHeader, 26, nameBytes.length);
    writeUint16LE(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32LE(centralHeader, 0, 0x02014b50);
    writeUint16LE(centralHeader, 4, 20);
    writeUint16LE(centralHeader, 6, 20);
    writeUint16LE(centralHeader, 8, 0);
    writeUint16LE(centralHeader, 10, 0);
    writeUint16LE(centralHeader, 12, stamp.time);
    writeUint16LE(centralHeader, 14, stamp.date);
    writeUint32LE(centralHeader, 16, checksum);
    writeUint32LE(centralHeader, 20, contentBytes.length);
    writeUint32LE(centralHeader, 24, contentBytes.length);
    writeUint16LE(centralHeader, 28, nameBytes.length);
    writeUint16LE(centralHeader, 30, 0);
    writeUint16LE(centralHeader, 32, 0);
    writeUint16LE(centralHeader, 34, 0);
    writeUint16LE(centralHeader, 36, 0);
    writeUint32LE(centralHeader, 38, 0);
    writeUint32LE(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    localParts.push(localHeader, contentBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + contentBytes.length;
    totalUncompressedBytes += contentBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const endRecord = new Uint8Array(22);
  writeUint32LE(endRecord, 0, 0x06054b50);
  writeUint16LE(endRecord, 4, 0);
  writeUint16LE(endRecord, 6, 0);
  writeUint16LE(endRecord, 8, bundle.files.length);
  writeUint16LE(endRecord, 10, bundle.files.length);
  writeUint32LE(endRecord, 12, centralDirectory.length);
  writeUint32LE(endRecord, 16, offset);
  writeUint16LE(endRecord, 20, 0);

  const bytes = concatBytes([...localParts, centralDirectory, endRecord]);
  return {
    fileName: options.fileName ?? `aiw-solution-delivery-pack-${bundle.projectId}.zip`,
    mediaType: 'application/zip',
    bytes,
    fileCount: bundle.files.length,
    totalUncompressedBytes,
  };
}

export function compileArtifacts(
  project: ArchitectureProject,
  library: KnowledgeLibrary,
  recommendations: RecommendationScore[],
): ArtifactBundle {
  return {
    generatedAt: new Date().toISOString(),
    projectId: project.id,
    files: [
      readme(project, library),
      jsonManifest(project),
      mermaidDiagram(project),
      adrBundle(project),
      tradeoffReport(project, recommendations),
      selectionTraceReport(project, library),
      governanceReport(project, library),
      collaborationReport(project),
      securityOperationsReport(project),
      observabilityReport(project),
      architectureDriftReport(project),
      operationalIntelligenceReport(project),
      remediationReport(project),
      ...sloArtifacts(project),
      ...architectureRepositoryFiles(project),
      ...terraformScaffold(project),
      ...deploymentArtifacts(project),
      ...enterprisePortfolioReport(project),
      ...designIntelligenceArtifacts(project, library),
      ...knowledgeIntegrityArtifacts(library),
      ...dynamicKnowledgeMeshArtifacts(),
      ...patternIntelligenceArtifacts(),
    ],
  };
}

function synthesisStableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function compileSynthesisArtifacts(
  run: ArchitectureSynthesisRun,
  alternativeId: string,
  simulationResults: ArchitectureSimulationResult[] = [],
  rationale = 'Selected after governed comparison and simulation review.',
): SynthesisArtifactBundle {
  const alternative = run.alternatives.find((item) => item.id === alternativeId);
  if (!alternative) throw new Error('SYNTHESIS_ALTERNATIVE_NOT_FOUND');
  const selectedSimulations = simulationResults.filter((item) => item.alternativeId === alternativeId);
  const project = alternative.projectedProject;
  const patternNames = alternative.patternRecommendations.map((item) => item.patternName);
  const mermaidNodes = project.nodes.map((node) => `  ${slug(node.id)}["${node.label.replaceAll('"', "'")}"]`);
  const mermaidEdges = project.edges.map((edge) => `  ${slug(edge.sourceId)} -->|${edge.label ?? edge.kind}| ${slug(edge.targetId)}`);
  const decisionMarkdown = [
    `# ADR: Select ${alternative.name}`,
    '', '## Status', 'Proposed — architecture-governance approval required.',
    '', '## Context', `${run.projectId} revision ${run.projectRevision} was evaluated against knowledge release ${run.knowledgeReleaseId}.`,
    '', '## Decision', rationale,
    '', '## Selected Pattern DNA', ...patternNames.map((name) => `- ${name}`),
    '', '## Scorecard', ...Object.entries(alternative.scorecard).map(([key,value]) => `- ${key}: ${value}`),
    '', '## Obligations', ...(alternative.obligations.length ? alternative.obligations.map((item) => `- **${item.title}** — ${item.description}`) : ['- No obligations recorded.']),
    '', '## Risks and mitigations', ...(alternative.risks.length ? alternative.risks.map((item) => `- **${item.severity.toUpperCase()}: ${item.title}** — ${item.description} Mitigation: ${item.mitigation}`) : ['- No material synthesized risks recorded.']),
    '', '## Simulations reviewed', ...(selectedSimulations.length ? selectedSimulations.map((item) => `- ${item.scenario.name}: availability ${item.outcome.availabilityPercent}%, p95 ${item.outcome.p95LatencyMs} ms, monthly cost ${item.outcome.estimatedMonthlyCost}.`) : ['- No simulation results attached.']),
    '', '## Governance boundary', 'This ADR is generated from governed Pattern DNA and deterministic simulation. It becomes authoritative only after human approval and a signed project snapshot.',
  ].join('\n');
  const simulationMarkdown = [
    `# ${alternative.name} — Architecture Simulation Report`, '',
    `Deterministic model results for synthesis run ${run.id}.`, '',
    '| Scenario | Availability | p95 latency | RTO | RPO | Monthly cost | Operations | Security exposure | Delivery risk |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...selectedSimulations.map((item) => `| ${item.scenario.name} | ${item.outcome.availabilityPercent}% | ${item.outcome.p95LatencyMs} ms | ${item.outcome.recoveryTimeMinutes} min | ${item.outcome.recoveryPointMinutes} min | ${item.outcome.estimatedMonthlyCost} | ${item.outcome.operationalLoadScore} | ${item.outcome.securityExposureScore} | ${item.outcome.deliveryRiskScore} |`),
    '', '## Limitations', '- Comparative model only; not a capacity or availability guarantee.', '- Replace default coefficients with empirical load, chaos, recovery and provider-pricing evidence before approval.',
  ].join('\n');
  const calmDocument = {
    $schema: 'https://calm.finos.org/release/1.0/meta/calm.json',
    uniqueId: alternative.id,
    name: alternative.name,
    description: alternative.summary,
    metadata: { generatedBy: 'AIW rc.10.57 Architecture Blueprint Engine', synthesisRunId: run.id, knowledgeReleaseId: run.knowledgeReleaseId, reviewRequired: true },
    nodes: project.nodes.map((node) => ({ 'unique-id': node.id, 'node-type': node.kind, name: node.label, description: node.description ?? '', metadata: node.properties })),
    relationships: project.edges.map((edge) => ({ 'unique-id': edge.id, 'relationship-type': edge.kind, source: { node: edge.sourceId }, destination: { node: edge.targetId }, description: edge.label ?? edge.kind })),
    controls: alternative.obligations.map((item) => ({ 'unique-id': item.id, name: item.title, description: item.description, requirement: item.mandatory ? 'mandatory' : 'recommended' })),
  };
  const fitness = generateArchitectureFitnessFunctions(alternative.patternIds);
  const blueprint = alternative.blueprint;
  const diagramFiles = synthesisBlueprintDiagramArtifacts(alternative);
  const interfaceRegister = [
    ['Interface ID','Name','Provider','Consumers','Style','Protocol','Operation/Event','Version','Schema','Authentication','Authorization','Encryption','Retry','Idempotency','Delivery','SLO','Owner','Status','Requirement refs','Pattern DNA'].join(','),
    ...blueprint.interfaceContracts.map((item) => [item.id,item.name,item.providerNodeId,item.consumerNodeIds.join(';'),item.interactionStyle,item.protocol,item.operationOrEvent,item.version,item.schemaRef,item.authentication,item.authorization,item.encryption,item.retryPolicy,item.idempotency,item.deliveryGuarantee,item.slo,item.owner,item.contractStatus,item.requirementRefs.join(';'),item.patternIds.join(';')].map((value) => `"${String(value).replaceAll('"','""')}"`).join(',')),
  ].join('\n');
  const traceabilityCsv = [
    ['Requirement','Objective','Logical Application','Application Realization','Logical Technology','Physical Deployment','Interfaces','Patterns','Obligations','Evidence'].join(','),
    ...blueprint.traceability.map((item) => [item.requirementRef,item.objective,item.logicalNodeIds.join(';'),item.realizationNodeIds.join(';'),item.technologyNodeIds.join(';'),item.physicalNodeIds.join(';'),item.interfaceIds.join(';'),item.patternIds.join(';'),item.obligationIds.join(';'),item.evidenceStatus].map((value) => `"${String(value).replaceAll('"','""')}"`).join(',')),
  ].join('\n');
  const blueprintSummary = [
    `# Architecture Blueprint — ${alternative.name}`, '',
    `Blueprint: ${blueprint.id}`,
    `Canonical fingerprint: ${blueprint.canonicalModelFingerprint}`,
    `Provider-neutral first: ${blueprint.providerNeutralFirst ? 'Yes' : 'No'}`, '',
    '## Completeness',
    `- Component traceability: ${blueprint.completeness.componentTraceabilityPercent}%`,
    `- Interface contracts: ${blueprint.completeness.interfaceContractPercent}%`,
    `- Physical-to-logical traceability: ${blueprint.completeness.physicalToLogicalTraceabilityPercent}%`,
    `- Required views: ${blueprint.completeness.requiredViewsPresent}/${blueprint.completeness.requiredViewsTotal}`, '',
    '## Provider-neutral capability mapping',
    ...blueprint.capabilityProductMappings.map((item) => `- **${item.capabilityName}** — ${item.neutralDefinition} (${item.productOptions.length} realization option(s); selection ${item.selectionStatus}).`), '',
    '## Deployment topology',
    ...blueprint.deploymentTopology.map((item) => `- ${item.nodeId}: ${item.runtimeClass}; ${item.regionStrategy}; ${item.scalingModel}; recovery ${item.recoveryClass}; complexity ${item.operationalComplexity}/100.`), '',
    '## Trust zones',
    ...blueprint.trustZones.map((item) => `- **${item.name}** — ${item.nodeIds.length} node(s), ${item.ingressInterfaceIds.length} ingress contract(s), controls: ${item.requiredControls.join('; ')}.`), '',
    '## Failure paths',
    ...blueprint.failurePaths.map((item) => `- **${item.name}** — Trigger: ${item.trigger}. Containment: ${item.containmentMechanisms.join('; ')}. Recovery: ${item.recoveryMechanisms.join('; ')}.`), '',
    '## Warnings', ...blueprint.warnings.map((item) => `- ${item}`),
  ].join('\n');
  const sddSynthesisSection = [
    `# SDD Architecture Synthesis and Deployment`, '',
    `Selected alternative: **${alternative.name}**`,
    `Knowledge release: **${run.knowledgeReleaseId}**`,
    `Eligibility: **${alternative.eligibility.eligible ? 'Eligible' : 'Exploratory only'}**`, '',
    '## Architecture views',
    ...blueprint.views.map((view) => `### ${view.title}\n\n![${view.title}](../../diagrams/${view.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.svg)\n\n${view.purpose}`), '',
    '## Interface and event contracts',
    `The interface register contains ${blueprint.interfaceContracts.length} provider/consumer contracts with protocol, schema, security, delivery and SLO semantics.`, '',
    '## Logical-to-physical traceability',
    `Physical-to-logical traceability is ${blueprint.completeness.physicalToLogicalTraceabilityPercent}%. Every unresolved mapping remains a review item rather than being hidden.`, '',
    '## Provider boundary',
    'The canonical architecture is provider-neutral. AWS, Azure, GCP, on-premises and portable overlays are proposals that may realize but never override the neutral capability and control requirements.', '',
    '## Cost and operational assumptions',
    ...alternative.costProjection.assumptions.map((item) => `- ${item}`),
    `- Relative monthly cost class: ${alternative.costProjection.relativeClass}; range ${alternative.costProjection.currency} ${alternative.costProjection.monthlyLow}–${alternative.costProjection.monthlyHigh}.`,
    `- Delivery effort range: ${alternative.costProjection.deliveryEffortDaysLow}–${alternative.costProjection.deliveryEffortDaysHigh} days.`, '',
    '## Resilience and security evidence',
    `The blueprint contains ${blueprint.failurePaths.length} failure path(s) and ${blueprint.trustZones.length} trust zone(s). These require simulation, control evidence and human approval before production acceptance.`,
  ].join('\n');
  const rawFiles = [
    { path: 'synthesis/run.json', mediaType: 'application/json', content: JSON.stringify(run, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'synthesis/alternative-project.json', mediaType: 'application/json', content: JSON.stringify(project, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'synthesis/architecture-blueprint.json', mediaType: 'application/json', content: JSON.stringify(blueprint, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'synthesis/eligibility-decision.json', mediaType: 'application/json', content: JSON.stringify(alternative.eligibility, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'architecture/interface-register.csv', mediaType: 'text/csv', content: interfaceRegister, sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'architecture/cross-stage-traceability.csv', mediaType: 'text/csv', content: traceabilityCsv, sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'architecture/capability-product-mappings.json', mediaType: 'application/json', content: JSON.stringify(blueprint.capabilityProductMappings, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'architecture/provider-overlays.json', mediaType: 'application/json', content: JSON.stringify(blueprint.providerOverlays, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'architecture/deployment-topology.json', mediaType: 'application/json', content: JSON.stringify(blueprint.deploymentTopology, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'architecture/security-trust-zones.json', mediaType: 'application/json', content: JSON.stringify(blueprint.trustZones, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'architecture/resilience-failure-paths.json', mediaType: 'application/json', content: JSON.stringify(blueprint.failurePaths, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'docs/architecture-blueprint.md', mediaType: 'text/markdown', content: blueprintSummary, sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'docs/sdd/architecture-synthesis-and-deployment.md', mediaType: 'text/markdown', content: sddSynthesisSection, sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'synthesis/decision-package.json', mediaType: 'application/json', content: JSON.stringify({ runId: run.id, alternativeId: alternative.id, rationale, patternIds: alternative.patternIds, obligationIds: alternative.obligations.map((item) => item.id), simulationResultIds: selectedSimulations.map((item) => item.id), conformanceTargets: [...new Set(fitness.map((item) => item.target))], blueprintId: blueprint.id, providerNeutralFirst: blueprint.providerNeutralFirst, interfaceContractIds: blueprint.interfaceContracts.map((item) => item.id), architectureViewIds: blueprint.views.map((item) => item.id), canonicalModelFingerprint: blueprint.canonicalModelFingerprint }, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'docs/adr/synthesis-decision.md', mediaType: 'text/markdown', content: decisionMarkdown, sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'docs/simulation-report.md', mediaType: 'text/markdown', content: simulationMarkdown, sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'simulation/results.json', mediaType: 'application/json', content: JSON.stringify(selectedSimulations, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'diagrams/synthesis-alternative.mmd', mediaType: 'text/plain', content: ['flowchart LR', ...mermaidNodes, ...mermaidEdges].join('\n'), sourceAlternativeId: alternative.id, reviewRequired: true },
    { path: 'architecture/calm.json', mediaType: 'application/json', content: JSON.stringify(calmDocument, null, 2), sourceAlternativeId: alternative.id, reviewRequired: true },
    ...diagramFiles,
    ...fitness.map((item) => ({ path: item.path, mediaType: item.mediaType, content: item.content, sourceAlternativeId: alternative.id, reviewRequired: item.reviewRequired })),
  ];
  const checksums = Object.fromEntries(rawFiles.map((file) => [file.path, synthesisStableHash(file.content)]));
  return {
    runId: run.id,
    alternativeId: alternative.id,
    generatedAt: new Date().toISOString(),
    files: rawFiles,
    manifest: { knowledgeReleaseId: run.knowledgeReleaseId, projectRevision: run.projectRevision, patternIds: alternative.patternIds, simulationResultIds: selectedSimulations.map((item) => item.id), checksums },
  };
}
