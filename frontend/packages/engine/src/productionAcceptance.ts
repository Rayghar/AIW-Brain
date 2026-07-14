import type { PilotEvaluationReport } from './pilotEvaluation.js';

const REQUIRED_EVIDENCE = [
  { kind: 'enterprise-runtime', label: 'Enterprise runtime probes', controls: ['PostgreSQL connectivity', 'pgvector retrieval', 'object storage round trip', 'OIDC/JWKS', 'OpenTelemetry export', 'release signing key'] },
  { kind: 'repository-conformance', label: 'Repository conformance runs', controls: ['fitness functions executed', 'API/event contracts checked', 'repository topology assessed'] },
  { kind: 'runtime-telemetry', label: 'Runtime telemetry evidence', controls: ['service topology observed', 'critical spans exported', 'runtime resources mapped to intended architecture'] },
  { kind: 'identity-access', label: 'Identity and authorization acceptance', controls: ['tenant isolation verified', 'role boundaries verified', 'operator privileges reviewed'] },
  { kind: 'model-routing', label: 'Approved model routing', controls: ['deterministic fallback available', 'external model route governed', 'structured output validated'] },
  { kind: 'pilot-signoff', label: 'Pilot user sign-off', controls: ['pilot users completed scenarios', 'critical blockers accepted or closed', 'usage feedback reviewed'] },
  { kind: 'architecture-board-approval', label: 'Architecture-board release approval', controls: ['decision recorded', 'production boundary accepted', 'exceptions time-boxed'] },
] as const;

export type ProductionEvidenceKind = typeof REQUIRED_EVIDENCE[number]['kind'];
export type ProductionEvidenceStatus = 'verified' | 'failed' | 'missing' | 'expired' | 'superseded';
export type ProductionAcceptanceStatus = 'production-accepted' | 'acceptance-pending' | 'blocked';

export interface ProductionEvidenceRecord {
  id: string;
  tenantId: string;
  environmentId: string;
  kind: ProductionEvidenceKind;
  label: string;
  status: ProductionEvidenceStatus;
  source: 'enterprise-probe' | 'ci-run' | 'runtime-observation' | 'identity-provider' | 'model-router' | 'human-signoff' | 'architecture-board';
  collectedAt: string;
  expiresAt?: string | undefined;
  projectIds: string[];
  evidenceRefs: string[];
  summary: string;
  verifiedBy?: string | undefined;
}

export interface ProductionAcceptanceGate {
  id: string;
  label: string;
  required: boolean;
  passed: boolean;
  status: 'passed' | 'failed' | 'missing';
  evidenceIds: string[];
  rationale: string;
}

export type ProductionAcceptanceVisualNodeKind = 'release' | 'gate' | 'evidence' | 'environment' | 'approval' | 'blocker';
export type ProductionAcceptanceVisualEdgeKind = 'requires' | 'satisfied-by' | 'blocked-by' | 'approved-by' | 'targets';

export interface ProductionAcceptanceVisualNode {
  id: string;
  kind: ProductionAcceptanceVisualNodeKind;
  label: string;
  summary: string;
  x: number;
  y: number;
  status: 'passed' | 'failed' | 'missing' | 'pending';
  metadata: Record<string, unknown>;
}

export interface ProductionAcceptanceVisualEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: ProductionAcceptanceVisualEdgeKind;
  label: string;
  metadata: Record<string, unknown>;
}

export interface ProductionAcceptanceVisualModel {
  id: string;
  title: string;
  description: string;
  generatedAt: string;
  nodes: ProductionAcceptanceVisualNode[];
  edges: ProductionAcceptanceVisualEdge[];
  focusNodeIds: string[];
  summary: { gates: number; passed: number; missing: number; failed: number; evidenceRecords: number };
}

export interface V10ProductionAcceptanceAssessment {
  id: string;
  releaseId: 'AIW-0.10.0';
  packageVersion: '0.10.0-rc.2';
  targetVersion: '0.10.0';
  sprint: '8.7.6-target-acceptance-finalization';
  generatedAt: string;
  tenantId: string;
  environmentId: string;
  status: ProductionAcceptanceStatus;
  productionAccepted: boolean;
  finalDeclarationAllowed: boolean;
  gates: ProductionAcceptanceGate[];
  missingEvidenceKinds: ProductionEvidenceKind[];
  failedEvidenceKinds: ProductionEvidenceKind[];
  evidence: ProductionEvidenceRecord[];
  visualModel: ProductionAcceptanceVisualModel;
  releaseDecision: {
    recommendation: 'declare-final' | 'hold-for-evidence' | 'block-release';
    rationale: string[];
    requiredNextActions: string[];
  };
  governance: {
    referencePilotAccepted: boolean;
    targetEvidenceRequired: true;
    architectureBoardApprovalRequired: true;
    automaticProductionDeclarationAllowed: false;
    candidateKnowledgeExcluded: true;
    knowledgeReleaseId: 'AKR-0.10.60';
  };
}

function nowIso() { return new Date().toISOString(); }

function expired(record: ProductionEvidenceRecord, at = new Date()): boolean {
  return Boolean(record.expiresAt && new Date(record.expiresAt).getTime() < at.getTime());
}

function latestVerifiedEvidence(records: ProductionEvidenceRecord[], kind: ProductionEvidenceKind): ProductionEvidenceRecord[] {
  return records
    .filter((record) => record.kind === kind && record.status === 'verified' && !expired(record))
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
}

function failedEvidence(records: ProductionEvidenceRecord[], kind: ProductionEvidenceKind): ProductionEvidenceRecord[] {
  return records.filter((record) => record.kind === kind && (record.status === 'failed' || record.status === 'expired'));
}

export function requiredV10ProductionEvidence(): Array<{ kind: ProductionEvidenceKind; label: string; controls: string[] }> {
  return REQUIRED_EVIDENCE.map((item) => ({ kind: item.kind, label: item.label, controls: [...item.controls] }));
}

export function buildProductionAcceptanceVisualModel(
  gates: ProductionAcceptanceGate[],
  evidence: ProductionEvidenceRecord[],
  environmentId: string,
  generatedAt = nowIso(),
): ProductionAcceptanceVisualModel {
  const releaseNode: ProductionAcceptanceVisualNode = {
    id: 'release-aiw-0.10.0', kind: 'release', label: 'AIW v0.10.0 final declaration',
    summary: 'Final release declaration is allowed only when all target-environment evidence and board approval gates pass.',
    x: 80, y: 80, status: gates.every((gate) => gate.passed) ? 'passed' : 'pending', metadata: { releaseId: 'AIW-0.10.0' },
  };
  const environmentNode: ProductionAcceptanceVisualNode = {
    id: `environment-${environmentId}`, kind: 'environment', label: environmentId,
    summary: 'Target environment under acceptance assessment.', x: 80, y: 250, status: 'pending', metadata: { environmentId },
  };
  const gateNodes = gates.map((gate, index): ProductionAcceptanceVisualNode => ({
    id: gate.id, kind: gate.id.includes('architecture-board') ? 'approval' : 'gate', label: gate.label,
    summary: gate.rationale, x: 430 + (index % 2) * 320, y: 40 + Math.floor(index / 2) * 130,
    status: gate.status, metadata: { required: gate.required, evidenceIds: gate.evidenceIds },
  }));
  const evidenceNodes = evidence.slice(0, 24).map((record, index): ProductionAcceptanceVisualNode => ({
    id: record.id, kind: 'evidence', label: record.label, summary: record.summary,
    x: 1120 + (index % 2) * 310, y: 40 + Math.floor(index / 2) * 110,
    status: record.status === 'verified' ? 'passed' : record.status === 'failed' ? 'failed' : 'pending',
    metadata: { kind: record.kind, source: record.source, collectedAt: record.collectedAt, refs: record.evidenceRefs },
  }));
  const blockerNodes = gates.filter((gate) => !gate.passed).map((gate, index): ProductionAcceptanceVisualNode => ({
    id: `blocker-${gate.id}`, kind: 'blocker', label: `Missing: ${gate.label}`,
    summary: gate.rationale, x: 430 + (index % 2) * 320, y: 560 + Math.floor(index / 2) * 100,
    status: gate.status === 'failed' ? 'failed' : 'missing', metadata: { gateId: gate.id },
  }));
  const nodes = [releaseNode, environmentNode, ...gateNodes, ...evidenceNodes, ...blockerNodes];
  const edges: ProductionAcceptanceVisualEdge[] = [
    { id: 'edge-release-environment', sourceId: releaseNode.id, targetId: environmentNode.id, kind: 'targets', label: 'assessed against', metadata: {} },
    ...gates.map((gate) => ({ id: `edge-release-${gate.id}`, sourceId: releaseNode.id, targetId: gate.id, kind: 'requires' as const, label: 'requires gate', metadata: {} })),
    ...evidence.flatMap((record) => gates.filter((gate) => gate.evidenceIds.includes(record.id)).map((gate) => ({ id: `edge-${gate.id}-${record.id}`, sourceId: gate.id, targetId: record.id, kind: 'satisfied-by' as const, label: 'supported by', metadata: { evidenceKind: record.kind } }))),
    ...gates.filter((gate) => !gate.passed).map((gate) => ({ id: `edge-${gate.id}-blocker`, sourceId: gate.id, targetId: `blocker-${gate.id}`, kind: 'blocked-by' as const, label: 'blocked by', metadata: {} })),
  ];
  return {
    id: 'visual-v10-production-acceptance', title: 'v0.10.0 production acceptance map',
    description: 'Interactive acceptance graph linking final declaration gates to target-environment evidence and blockers.',
    generatedAt, nodes, edges, focusNodeIds: [releaseNode.id, ...gates.filter((gate) => !gate.passed).map((gate) => gate.id)],
    summary: { gates: gates.length, passed: gates.filter((gate) => gate.passed).length, missing: gates.filter((gate) => gate.status === 'missing').length, failed: gates.filter((gate) => gate.status === 'failed').length, evidenceRecords: evidence.length },
  };
}

export function assessV10ProductionAcceptance(input: {
  pilotReport: PilotEvaluationReport;
  evidenceRecords?: ProductionEvidenceRecord[];
  tenantId?: string;
  environmentId?: string;
  generatedAt?: string;
}): V10ProductionAcceptanceAssessment {
  const generatedAt = input.generatedAt ?? nowIso();
  const environmentId = input.environmentId ?? 'target-environment-not-specified';
  const tenantId = input.tenantId ?? 'tenant-reference';
  const evidence = (input.evidenceRecords ?? []).filter((record) => record.tenantId === tenantId && record.environmentId === environmentId);
  const referencePilotAccepted = input.pilotReport.releaseGate.status !== 'blocked' && input.pilotReport.summary.scenarios >= 6;
  const gates: ProductionAcceptanceGate[] = [
    { id: 'gate-reference-pilot', label: 'Reference pilot candidate evidence', required: true, passed: referencePilotAccepted, status: referencePilotAccepted ? 'passed' : 'failed', evidenceIds: [input.pilotReport.id], rationale: referencePilotAccepted ? 'Reference pilot suite nominated a release candidate or conditional candidate.' : 'Reference pilot suite is blocked.' },
    ...REQUIRED_EVIDENCE.map((requirement): ProductionAcceptanceGate => {
      const verified = latestVerifiedEvidence(evidence, requirement.kind);
      const failed = failedEvidence(evidence, requirement.kind);
      const passed = verified.length > 0;
      return {
        id: `gate-${requirement.kind}`, label: requirement.label, required: true, passed,
        status: passed ? 'passed' : failed.length ? 'failed' : 'missing',
        evidenceIds: verified.map((record) => record.id),
        rationale: passed
          ? `${verified[0]?.id} verifies ${requirement.label.toLowerCase()} for ${environmentId}.`
          : `${requirement.label} has not been verified for ${environmentId}; required controls: ${requirement.controls.join(', ')}.`,
      };
    }),
  ];
  const missingEvidenceKinds = REQUIRED_EVIDENCE.filter((requirement) => !latestVerifiedEvidence(evidence, requirement.kind).length).map((requirement) => requirement.kind);
  const failedEvidenceKinds = REQUIRED_EVIDENCE.filter((requirement) => failedEvidence(evidence, requirement.kind).length > 0 && !latestVerifiedEvidence(evidence, requirement.kind).length).map((requirement) => requirement.kind);
  const allPassed = gates.every((gate) => gate.passed);
  const status: ProductionAcceptanceStatus = allPassed ? 'production-accepted' : failedEvidenceKinds.length ? 'blocked' : 'acceptance-pending';
  const recommendation: V10ProductionAcceptanceAssessment['releaseDecision']['recommendation'] = allPassed ? 'declare-final' : failedEvidenceKinds.length ? 'block-release' : 'hold-for-evidence';
  const requiredNextActions = allPassed
    ? ['Record final release declaration and preserve acceptance evidence in immutable storage.']
    : missingEvidenceKinds.map((kind) => `Collect verified target-environment evidence for ${kind}.`);
  const rationale = allPassed
    ? ['All required target-environment evidence and governance approval are present.']
    : ['v0.10.0 cannot be declared final until every required evidence class is verified in the target environment.', `${missingEvidenceKinds.length} evidence classes remain missing.`];
  const visualModel = buildProductionAcceptanceVisualModel(gates, evidence, environmentId, generatedAt);
  return {
    id: `v10-production-acceptance-${environmentId}`, releaseId: 'AIW-0.10.0', packageVersion: '0.10.0-rc.2', targetVersion: '0.10.0', sprint: '8.7.6-target-acceptance-finalization', generatedAt, tenantId, environmentId,
    status, productionAccepted: allPassed, finalDeclarationAllowed: allPassed, gates, missingEvidenceKinds, failedEvidenceKinds, evidence, visualModel,
    releaseDecision: { recommendation, rationale, requiredNextActions },
    governance: { referencePilotAccepted, targetEvidenceRequired: true, architectureBoardApprovalRequired: true, automaticProductionDeclarationAllowed: false, candidateKnowledgeExcluded: true, knowledgeReleaseId: 'AKR-0.10.60' },
  };
}

export function productionAcceptancePlatformRelease() {
  return {
    releaseId: 'AIW-0.10.0-rc.2',
    targetReleaseId: 'AIW-0.10.0',
    version: '0.10.0-rc.2',
    sprint: '8.7.6-target-acceptance-finalization',
    status: 'acceptance-package',
    knowledgeReleaseId: 'AKR-0.10.60',
    basedOn: 'AIW-0.10.0-rc.1',
    capabilities: {
      targetEvidenceRequirements: true,
      productionAcceptanceAssessment: true,
      visualAcceptanceModel: true,
      explicitFinalDeclarationGate: true,
      architectureBoardApprovalRequired: true,
      noAutomaticProductionDeclaration: true,
      candidateKnowledgeExcluded: true,
      deterministicOfflineAssessment: true,
    },
    governanceBoundary: 'This package can assess readiness and produce a final-declaration decision, but it cannot mark v0.10.0 production-accepted without target-environment evidence and architecture-board approval.',
  };
}
