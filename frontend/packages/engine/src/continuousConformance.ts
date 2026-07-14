import type {
  ArchitectureConformanceFinding,
  ArchitectureProject,
  ConformanceEvidenceEnvelope,
  ConformanceSourceType,
  DriftReport,
  FitnessFunctionArtifact,
} from '@aiw/domain';
import { generateArchitectureFitnessFunctions } from './patternIntelligence.js';
import { normalizeConformanceEvidence } from './conformance.js';

export type ConformanceControlTarget = ConformanceSourceType | 'architecture-model';
export type ConformanceControlStatus = 'passed' | 'failed' | 'unverified';

export interface ArchitectureConformanceControl {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  source: 'pattern' | 'decision' | 'topology' | 'traceability' | 'governance';
  target: ConformanceControlTarget;
  severity: ArchitectureConformanceFinding['severity'];
  patternId?: string;
  architectureObjectIds: string[];
  decisionIds: string[];
  artifact?: FitnessFunctionArtifact | ProjectFitnessArtifact;
  evidenceRequired: string[];
}

export interface ProjectFitnessArtifact {
  id: string;
  target: ConformanceControlTarget;
  path: string;
  mediaType: string;
  content: string;
  reviewRequired: true;
  sourceRuleIds: string[];
}

export interface ArchitectureConformancePlan {
  id: string;
  projectId: string;
  branchId: string;
  projectRevision: number;
  generatedAt: string;
  knowledgeReleaseId: string;
  patternIds: string[];
  controls: ArchitectureConformanceControl[];
  artifacts: Array<FitnessFunctionArtifact | ProjectFitnessArtifact>;
  summary: {
    total: number;
    executable: number;
    modelControls: number;
    coveredObjects: number;
    coveredDecisions: number;
  };
  reviewRequired: true;
}

export interface AssessedConformanceControl extends ArchitectureConformanceControl {
  status: ConformanceControlStatus;
  evidenceIds: string[];
  findingIds: string[];
  explanation: string;
}

export interface ContinuousConformanceAssessment {
  id: string;
  planId: string;
  projectId: string;
  branchId: string;
  projectRevision: number;
  assessedAt: string;
  controls: AssessedConformanceControl[];
  findings: ArchitectureConformanceFinding[];
  summary: {
    passed: number;
    failed: number;
    unverified: number;
    critical: number;
    high: number;
    warning: number;
    coveragePercent: number;
    healthScore: number;
  };
  gate: {
    passed: boolean;
    reasons: string[];
  };
}

export interface ConformanceRemediationAction {
  id: string;
  findingId: string;
  actionType: 'implementation-change' | 'architecture-change' | 'evidence-correction' | 'time-bound-waiver';
  title: string;
  description: string;
  targetIds: string[];
  risk: 'low' | 'medium' | 'high';
  status: 'proposed' | 'approved' | 'rejected';
  automaticMutationAllowed: false;
}

export interface ConformanceRemediationChangeSet {
  id: string;
  assessmentId: string;
  projectId: string;
  createdAt: string;
  status: 'draft' | 'pending-approval' | 'approved' | 'rejected';
  actions: ConformanceRemediationAction[];
  humanApprovalRequired: true;
  rollbackRequired: true;
}

export interface ConformanceVisualNode {
  id: string;
  kind: 'intended' | 'actual' | 'control' | 'finding';
  label: string;
  status: 'healthy' | 'attention' | 'at-risk' | 'unknown';
  x: number;
  y: number;
  metadata: Record<string, unknown>;
}

export interface ConformanceVisualEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  kind: 'maps-to' | 'verified-by' | 'violates' | 'governs';
}

export interface ConformanceVisualModel {
  nodes: ConformanceVisualNode[];
  edges: ConformanceVisualEdge[];
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
  return `${prefix}-${stableHash(value)}-${stableHash(value.split('').reverse().join(''))}`;
}

function acceptedPatternIds(project: ArchitectureProject): string[] {
  return [...new Set(project.patternSelections
    .filter((selection) => selection.status === 'accepted')
    .map((selection) => selection.patternId))].sort();
}

function sourceForTarget(target: FitnessFunctionArtifact['target']): ConformanceSourceType {
  return target;
}

function projectArtifact(input: {
  id: string;
  target: ConformanceControlTarget;
  path: string;
  ruleId: string;
  body: Record<string, unknown>;
}): ProjectFitnessArtifact {
  return {
    id: input.id,
    target: input.target,
    path: input.path,
    mediaType: 'application/json',
    content: `${JSON.stringify(input.body, null, 2)}\n`,
    reviewRequired: true,
    sourceRuleIds: [input.ruleId],
  };
}

function patternControls(patternIds: string[]): ArchitectureConformanceControl[] {
  return generateArchitectureFitnessFunctions(patternIds).map((artifact) => {
    const ruleId = artifact.sourceRuleIds[0] ?? artifact.id;
    return {
      id: stableId('CTRL', `${artifact.patternId}:${ruleId}`),
      ruleId,
      title: `${artifact.patternId} conformance control`,
      description: `Execute the generated ${artifact.target} fitness function and return evidence for ${artifact.patternId}.`,
      source: 'pattern',
      target: sourceForTarget(artifact.target),
      severity: 'high',
      patternId: artifact.patternId,
      architectureObjectIds: [],
      decisionIds: [],
      artifact,
      evidenceRequired: [`${artifact.target} execution result`, 'repository revision', 'workflow run identity'],
    };
  });
}

function traceabilityControls(project: ArchitectureProject): ArchitectureConformanceControl[] {
  return project.nodes
    .filter((node) => ['applicationRealization', 'logicalTechnology', 'physicalTechnology'].includes(node.stage) && node.status !== 'deprecated')
    .map((node) => {
      const ruleId = `traceability:${node.id}`;
      const artifact = projectArtifact({
        id: stableId('FIT', ruleId),
        target: 'runtime-inventory',
        path: `.aiw/fitness/traceability/${node.id}.json`,
        ruleId,
        body: {
          ruleId,
          architectureObjectId: node.id,
          expectedLabels: { 'aiw.node-id': node.id },
          expectedKind: node.kind,
          expectedStage: node.stage,
        },
      });
      return {
        id: stableId('CTRL', ruleId),
        ruleId,
        title: `Runtime traceability for ${node.label}`,
        description: 'Every realized or deployed resource must carry an explicit mapping to its governed AIW architecture object.',
        source: 'traceability' as const,
        target: 'runtime-inventory' as const,
        severity: 'high' as const,
        architectureObjectIds: [node.id],
        decisionIds: [],
        artifact,
        evidenceRequired: ['runtime inventory resource label', 'source revision'],
      };
    });
}

function topologyControls(project: ArchitectureProject): ArchitectureConformanceControl[] {
  return project.edges
    .filter((edge) => ['applicationRealization', 'logicalTechnology', 'physicalTechnology'].includes(edge.stage))
    .map((edge) => {
      const ruleId = `topology:${edge.id}`;
      const artifact = projectArtifact({
        id: stableId('FIT', ruleId),
        target: 'opentelemetry',
        path: `.aiw/fitness/topology/${edge.id}.json`,
        ruleId,
        body: {
          ruleId,
          sourceArchitectureObjectId: edge.sourceId,
          targetArchitectureObjectId: edge.targetId,
          expectedRelationship: edge.kind,
        },
      });
      return {
        id: stableId('CTRL', ruleId),
        ruleId,
        title: `Runtime relationship ${edge.kind}`,
        description: 'Observed runtime interactions must remain compatible with the approved architecture relationship.',
        source: 'topology' as const,
        target: 'opentelemetry' as const,
        severity: 'warning' as const,
        architectureObjectIds: [edge.sourceId, edge.targetId],
        decisionIds: [],
        artifact,
        evidenceRequired: ['runtime trace or service graph', 'architecture object correlation attributes'],
      };
    });
}

function decisionControls(project: ArchitectureProject): ArchitectureConformanceControl[] {
  return project.decisions
    .filter((decision) => decision.status === 'accepted')
    .map((decision) => {
      const ruleId = `decision:${decision.id}`;
      const artifact = projectArtifact({
        id: stableId('FIT', ruleId),
        target: 'architecture-model',
        path: `.aiw/fitness/decisions/${decision.id}.json`,
        ruleId,
        body: {
          ruleId,
          decisionId: decision.id,
          scopeNodeId: decision.scopeNodeId,
          linkedRecordIds: decision.linkedRecordIds ?? [],
          requiredEvidence: ['implementation reference', 'owner', 'review outcome'],
        },
      });
      return {
        id: stableId('CTRL', ruleId),
        ruleId,
        title: `Decision realization: ${decision.title}`,
        description: 'The accepted architecture decision must have implementation evidence and remain linked to its governed scope.',
        source: 'decision' as const,
        target: 'architecture-model' as const,
        severity: 'high' as const,
        architectureObjectIds: decision.scopeNodeId ? [decision.scopeNodeId] : [],
        decisionIds: [decision.id],
        artifact,
        evidenceRequired: ['implementation reference', 'review owner', 'decision status'],
      };
    });
}

function governanceControls(project: ArchitectureProject): ArchitectureConformanceControl[] {
  const stages = ['logicalApplication', 'applicationRealization', 'logicalTechnology'] as const;
  return stages.map((stage) => {
    const ruleId = `governance:stage-approved:${stage}`;
    const artifact = projectArtifact({
      id: stableId('FIT', ruleId),
      target: 'architecture-model',
      path: `.aiw/fitness/governance/${stage}.json`,
      ruleId,
      body: { ruleId, stage, requiredStatus: 'approved' },
    });
    return {
      id: stableId('CTRL', ruleId),
      ruleId,
      title: `${stage} approval is current`,
      description: 'Implementation conformance cannot pass while the corresponding governed architecture stage lacks a current approval.',
      source: 'governance' as const,
      target: 'architecture-model' as const,
      severity: 'critical' as const,
      architectureObjectIds: project.nodes.filter((node) => node.stage === stage).map((node) => node.id),
      decisionIds: [],
      artifact,
      evidenceRequired: ['approved stage baseline', 'reviewer identity', 'approval validity'],
    };
  });
}

export function buildArchitectureConformancePlan(
  project: ArchitectureProject,
  explicitPatternIds?: string[],
  knowledgeReleaseId = 'AKR-0.10.60',
): ArchitectureConformancePlan {
  const patternIds = [...new Set(explicitPatternIds ?? acceptedPatternIds(project))].sort();
  const controls = [
    ...patternControls(patternIds),
    ...traceabilityControls(project),
    ...topologyControls(project),
    ...decisionControls(project),
    ...governanceControls(project),
  ];
  const artifacts = controls.flatMap((control) => control.artifact ? [control.artifact] : []);
  return {
    id: stableId('CPLAN', `${project.id}:${project.branch.id}:${project.revision}:${patternIds.join(',')}`),
    projectId: project.id,
    branchId: project.branch.id,
    projectRevision: project.revision,
    generatedAt: new Date().toISOString(),
    knowledgeReleaseId,
    patternIds,
    controls,
    artifacts,
    summary: {
      total: controls.length,
      executable: controls.filter((control) => control.target !== 'architecture-model').length,
      modelControls: controls.filter((control) => control.target === 'architecture-model').length,
      coveredObjects: new Set(controls.flatMap((control) => control.architectureObjectIds)).size,
      coveredDecisions: new Set(controls.flatMap((control) => control.decisionIds)).size,
    },
    reviewRequired: true,
  };
}

function sourceMatches(target: ConformanceControlTarget, sourceType: ConformanceSourceType): boolean {
  if (target === 'architecture-model') return false;
  if (target === sourceType) return true;
  if (target === 'runtime-inventory' && sourceType === 'kubernetes') return true;
  if (target === 'opentelemetry' && sourceType === 'runtime-inventory') return true;
  return false;
}

function governanceFinding(project: ArchitectureProject, control: ArchitectureConformanceControl): ArchitectureConformanceFinding | null {
  if (!control.ruleId.startsWith('governance:stage-approved:')) return null;
  const stage = control.ruleId.split(':').at(-1);
  const approved = project.stageApprovals.some((approval) => approval.stage === stage && approval.status === 'approved' && !approval.expiredAt);
  if (approved) return null;
  return {
    id: stableId('CONF', `${project.id}:${control.ruleId}`),
    evidenceId: `MODEL-${project.revision}`,
    projectId: project.id,
    branchId: project.branch.id,
    ruleId: control.ruleId,
    severity: control.severity,
    status: 'open',
    title: control.title,
    description: `The ${stage} stage does not have a current approved baseline.`,
    remediation: 'Complete independent review and approve an immutable stage baseline before enforcing implementation conformance.',
    detail: { stage, projectRevision: project.revision },
    createdAt: new Date().toISOString(),
  };
}

function decisionFinding(project: ArchitectureProject, control: ArchitectureConformanceControl): ArchitectureConformanceFinding | null {
  if (!control.ruleId.startsWith('decision:')) return null;
  const decision = project.decisions.find((item) => control.decisionIds.includes(item.id));
  if (!decision) return null;
  const linked = decision.linkedRecordIds?.length || decision.scopeNodeId;
  if (linked) return null;
  return {
    id: stableId('CONF', `${project.id}:${control.ruleId}:unlinked`),
    evidenceId: `MODEL-${project.revision}`,
    projectId: project.id,
    branchId: project.branch.id,
    decisionId: decision.id,
    ruleId: control.ruleId,
    severity: 'warning',
    status: 'open',
    title: `Decision lacks realization linkage: ${decision.title}`,
    description: 'The accepted decision is not linked to a governed pattern, architecture object or implementation scope.',
    remediation: 'Link the decision to its architecture scope and implementation evidence before treating it as realized.',
    detail: { decisionId: decision.id },
    createdAt: new Date().toISOString(),
  };
}

function driftAsConformance(project: ArchitectureProject, report?: DriftReport): ArchitectureConformanceFinding[] {
  if (!report) return [];
  return report.findings.map((item) => ({
    id: stableId('CONF', `drift:${report.id}:${item.id}`),
    evidenceId: report.inventoryId,
    projectId: project.id,
    branchId: project.branch.id,
    ...(item.intendedNodeId ? { architectureObjectId: item.intendedNodeId } : {}),
    ruleId: `drift:${item.kind}`,
    severity: item.severity === 'HARD' ? 'critical' : item.severity === 'SIGNIFICANT' ? 'high' : 'warning',
    status: item.status === 'resolved' ? 'remediated' : item.status === 'accepted' ? 'accepted' : 'open',
    title: item.title,
    description: item.message,
    remediation: item.recommendation,
    detail: {
      rationale: item.rationale,
      actualResourceId: item.actualResourceId,
      propertyPath: item.propertyPath,
      intendedValue: item.intendedValue,
      actualValue: item.actualValue,
    },
    createdAt: report.generatedAt,
  }));
}

export function assessContinuousConformance(input: {
  project: ArchitectureProject;
  plan: ArchitectureConformancePlan;
  evidence?: ConformanceEvidenceEnvelope[];
  driftReport?: DriftReport;
}): ContinuousConformanceAssessment {
  const evidence = input.evidence ?? [];
  const externalFindings = evidence.flatMap(normalizeConformanceEvidence);
  const modelFindings = input.plan.controls.flatMap((control) => {
    const result = governanceFinding(input.project, control) ?? decisionFinding(input.project, control);
    return result ? [result] : [];
  });
  const findings = [...externalFindings, ...modelFindings, ...driftAsConformance(input.project, input.driftReport)];
  const controls: AssessedConformanceControl[] = input.plan.controls.map((control) => {
    const related = findings.filter((item) => item.ruleId === control.ruleId ||
      (item.architectureObjectId && control.architectureObjectIds.includes(item.architectureObjectId)) ||
      (item.decisionId && control.decisionIds.includes(item.decisionId)) ||
      String(item.detail.patternId ?? '') === control.patternId);
    const relevantEvidence = evidence.filter((item) => sourceMatches(control.target, item.sourceType));
    const failed = related.some((item) => item.status === 'open' && ['critical', 'high', 'warning'].includes(item.severity));
    const modelVerified = control.target === 'architecture-model' && related.length === 0;
    const status: ConformanceControlStatus = failed ? 'failed' : (modelVerified || relevantEvidence.length > 0) ? 'passed' : 'unverified';
    return {
      ...control,
      status,
      evidenceIds: relevantEvidence.map((item) => item.id),
      findingIds: related.map((item) => item.id),
      explanation: status === 'failed'
        ? `${related.length} conformance finding(s) affect this control.`
        : status === 'passed'
          ? control.target === 'architecture-model' ? 'The governed architecture model currently satisfies this control.' : `Evidence from ${relevantEvidence.map((item) => item.sourceType).join(', ')} executed this control without a mapped violation.`
          : `No ${control.target} evidence has been received for this control.`,
    };
  });
  const passed = controls.filter((control) => control.status === 'passed').length;
  const failed = controls.filter((control) => control.status === 'failed').length;
  const unverified = controls.filter((control) => control.status === 'unverified').length;
  const critical = findings.filter((finding) => finding.status === 'open' && finding.severity === 'critical').length;
  const high = findings.filter((finding) => finding.status === 'open' && finding.severity === 'high').length;
  const warning = findings.filter((finding) => finding.status === 'open' && finding.severity === 'warning').length;
  const coveragePercent = controls.length ? Math.round(((passed + failed) / controls.length) * 100) : 0;
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - critical * 25 - high * 12 - warning * 4 - unverified * 2)));
  const reasons: string[] = [];
  if (critical) reasons.push(`${critical} critical conformance finding(s) remain open.`);
  if (high) reasons.push(`${high} high-severity conformance finding(s) remain open.`);
  if (unverified) reasons.push(`${unverified} control(s) have no execution evidence.`);
  return {
    id: stableId('CASS', `${input.plan.id}:${evidence.map((item) => item.id).sort().join(',')}:${input.driftReport?.id ?? ''}`),
    planId: input.plan.id,
    projectId: input.project.id,
    branchId: input.project.branch.id,
    projectRevision: input.project.revision,
    assessedAt: new Date().toISOString(),
    controls,
    findings,
    summary: { passed, failed, unverified, critical, high, warning, coveragePercent, healthScore },
    gate: { passed: critical === 0 && high === 0 && unverified === 0, reasons },
  };
}

export function buildConformanceRemediationChangeSet(
  assessment: ContinuousConformanceAssessment,
): ConformanceRemediationChangeSet {
  const actions = assessment.findings
    .filter((finding) => finding.status === 'open')
    .map((finding) => {
      const actionType: ConformanceRemediationAction['actionType'] = finding.ruleId.startsWith('governance:') || finding.ruleId.startsWith('decision:')
        ? 'architecture-change'
        : finding.ruleId.includes('traceability')
          ? 'evidence-correction'
          : 'implementation-change';
      return {
        id: stableId('CACT', `${assessment.id}:${finding.id}`),
        findingId: finding.id,
        actionType,
        title: finding.remediation ?? `Resolve ${finding.title}`,
        description: finding.description,
        targetIds: [finding.architectureObjectId, finding.decisionId].filter((value): value is string => Boolean(value)),
        risk: finding.severity === 'critical' ? 'high' as const : finding.severity === 'high' ? 'medium' as const : 'low' as const,
        status: 'proposed' as const,
        automaticMutationAllowed: false as const,
      };
    });
  return {
    id: stableId('CSET', assessment.id),
    assessmentId: assessment.id,
    projectId: assessment.projectId,
    createdAt: new Date().toISOString(),
    status: 'draft',
    actions,
    humanApprovalRequired: true,
    rollbackRequired: true,
  };
}

export function buildConformanceVisualModel(
  project: ArchitectureProject,
  assessment: ContinuousConformanceAssessment,
): ConformanceVisualModel {
  const intended = project.nodes
    .filter((node) => ['applicationRealization', 'logicalTechnology', 'physicalTechnology'].includes(node.stage))
    .map((node, index): ConformanceVisualNode => ({
      id: `intended:${node.id}`,
      kind: 'intended',
      label: node.label,
      status: assessment.findings.some((finding) => finding.architectureObjectId === node.id && finding.status === 'open') ? 'at-risk' : 'healthy',
      x: 40,
      y: 40 + index * 105,
      metadata: { architectureObjectId: node.id, stage: node.stage, kind: node.kind },
    }));
  const inventory = project.runtimeInventories[0];
  const actual = (inventory?.resources ?? []).map((resource, index): ConformanceVisualNode => ({
    id: `actual:${resource.id}`,
    kind: 'actual',
    label: resource.name,
    status: assessment.findings.some((finding) => String(finding.detail.actualResourceId ?? '') === resource.id && finding.status === 'open') ? 'at-risk' : 'unknown',
    x: 640,
    y: 40 + index * 105,
    metadata: { runtimeResourceId: resource.id, resourceType: resource.resourceType, provider: resource.provider },
  }));
  const controls = assessment.controls.slice(0, 30).map((control, index): ConformanceVisualNode => ({
    id: `control:${control.id}`,
    kind: 'control',
    label: control.title,
    status: control.status === 'passed' ? 'healthy' : control.status === 'failed' ? 'at-risk' : 'unknown',
    x: 340,
    y: 40 + index * 84,
    metadata: { controlId: control.id, target: control.target, status: control.status },
  }));
  const findingNodes = assessment.findings.filter((finding) => finding.status === 'open').slice(0, 30).map((finding, index): ConformanceVisualNode => ({
    id: `finding:${finding.id}`,
    kind: 'finding',
    label: finding.title,
    status: finding.severity === 'critical' || finding.severity === 'high' ? 'at-risk' : 'attention',
    x: 940,
    y: 40 + index * 90,
    metadata: { findingId: finding.id, severity: finding.severity, ruleId: finding.ruleId },
  }));
  const edges: ConformanceVisualEdge[] = [];
  for (const control of assessment.controls) {
    for (const objectId of control.architectureObjectIds) {
      if (intended.some((node) => node.id === `intended:${objectId}`)) edges.push({ id: stableId('VEDGE', `${objectId}:${control.id}`), sourceId: `intended:${objectId}`, targetId: `control:${control.id}`, label: 'governed by', kind: 'governs' });
    }
    for (const findingId of control.findingIds) {
      if (findingNodes.some((node) => node.id === `finding:${findingId}`)) edges.push({ id: stableId('VEDGE', `${control.id}:${findingId}`), sourceId: `control:${control.id}`, targetId: `finding:${findingId}`, label: 'violated by', kind: 'violates' });
    }
  }
  const report = project.driftReports[0];
  for (const mapping of report?.mappings ?? []) {
    if (intended.some((node) => node.id === `intended:${mapping.intendedNodeId}`) && actual.some((node) => node.id === `actual:${mapping.actualResourceId}`)) {
      edges.push({ id: stableId('VEDGE', `${mapping.intendedNodeId}:${mapping.actualResourceId}`), sourceId: `intended:${mapping.intendedNodeId}`, targetId: `actual:${mapping.actualResourceId}`, label: `${Math.round(mapping.confidence * 100)}% match`, kind: 'maps-to' });
    }
  }
  return { nodes: [...intended, ...controls, ...actual, ...findingNodes], edges };
}
