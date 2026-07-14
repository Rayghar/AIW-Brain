export type IntegrationCapability = 'llm' | 'repository' | 'identity' | 'storage' | 'telemetry' | 'runtime-evidence';

export interface IntegrationConnectorContract {
  id: string;
  provider: string;
  capability: IntegrationCapability;
  readOnlyByDefault: boolean;
}

export const defaultConnectorContracts: IntegrationConnectorContract[] = [
  { id: 'github', provider: 'GitHub', capability: 'repository', readOnlyByDefault: true },
  { id: 'gitlab', provider: 'GitLab', capability: 'repository', readOnlyByDefault: true },
  { id: 'azure-devops', provider: 'Azure DevOps', capability: 'repository', readOnlyByDefault: true },
  { id: 'bitbucket', provider: 'Bitbucket', capability: 'repository', readOnlyByDefault: true },
  { id: 'oidc', provider: 'OIDC/JWKS', capability: 'identity', readOnlyByDefault: true },
  { id: 's3-compatible', provider: 'S3-compatible object store', capability: 'storage', readOnlyByDefault: false },
  { id: 'otel', provider: 'OpenTelemetry', capability: 'runtime-evidence', readOnlyByDefault: true },
];

export type RepositoryAssetKind = 'adr' | 'openapi' | 'asyncapi' | 'terraform' | 'kubernetes' | 'docs' | 'ci' | 'runtime';
export type RepositoryScanMode = 'offline-config' | 'read-only-live';

export interface RepositoryOnboardingInput {
  connectorId: string;
  provider: string;
  repositoryUrl: string;
  defaultBranch?: string;
  allowedPaths: string[];
  evidenceKinds: string[];
  writeEnabled?: boolean;
  prRequiresApproval?: boolean;
  architectureMutationRequiresApproval?: boolean;
}

export interface RepositoryAssetDetection {
  kind: RepositoryAssetKind;
  path: string;
  confidence: number;
  reason: string;
  controlsSeeded: string[];
}

export interface RepositoryEvidenceCoverage {
  connectorId: string;
  repositoryUrl: string;
  branch: string;
  coverageScore: number;
  detectedKinds: RepositoryAssetKind[];
  missingKinds: RepositoryAssetKind[];
  detections: RepositoryAssetDetection[];
  readOnly: true;
  writePolicy: 'blocked-unless-explicitly-approved';
  architectureMutationPolicy: 'human-approval-required';
}

export interface RepositoryConformanceControl {
  id: string;
  title: string;
  evidenceKind: RepositoryAssetKind;
  sourcePath: string;
  severity: 'info' | 'warning' | 'critical';
  fitnessTestSeed: string;
  humanApprovalRequired: true;
}

export interface RepositoryPilotScan {
  scanId: string;
  connectorId: string;
  scanMode: RepositoryScanMode;
  startedAt: string;
  completedAt: string;
  coverage: RepositoryEvidenceCoverage;
  controls: RepositoryConformanceControl[];
  warnings: string[];
}

export interface CiFitnessLoopPlan {
  connectorId: string;
  generatedAt: string;
  workflowName: string;
  requiredInputs: string[];
  proposedChecks: string[];
  prCreation: 'preview-only-requires-approval';
  repositoryWrites: 'disabled-by-default';
}

export interface RuntimeEvidenceIngestionPlan {
  connectorId: string;
  generatedAt: string;
  sources: string[];
  acceptedFormats: string[];
  tenantIsolationRequired: true;
  runtimeMutationPolicy: 'evidence-only-no-architecture-mutation';
}

const KIND_DETECTORS: Array<{ kind: RepositoryAssetKind; re: RegExp; controls: string[] }> = [
  { kind: 'adr', re: /(^|\/)(adr|adrs|decisions?|architecture-decisions?)(\/|$)|\.adr\.md$/i, controls: ['ADR present for key architecture decisions', 'ADR status and supersession tracked'] },
  { kind: 'openapi', re: /openapi|swagger|\.ya?ml$|\.json$/i, controls: ['OpenAPI contracts versioned', 'Breaking API changes detected before release'] },
  { kind: 'asyncapi', re: /asyncapi|events?|topics?|schemas?/i, controls: ['AsyncAPI/event contracts versioned', 'Event producers and consumers traceable'] },
  { kind: 'terraform', re: /terraform|\.tf$|iac/i, controls: ['Infrastructure drift checked against intended topology', 'Privileged resources reviewed'] },
  { kind: 'kubernetes', re: /kubernetes|k8s|helm|deployment\.ya?ml|namespace/i, controls: ['Kubernetes workloads mapped to architecture components', 'Namespace and network policies reviewed'] },
  { kind: 'docs', re: /docs?|architecture|readme|design/i, controls: ['Architecture documentation discovered', 'Documentation freshness reviewed'] },
  { kind: 'ci', re: /\.github\/workflows|azure-pipelines|gitlab-ci|bitbucket-pipelines|ci/i, controls: ['CI fitness checks available', 'Conformance gate integrated into build pipeline'] },
  { kind: 'runtime', re: /runtime|otel|telemetry|inventory|observability/i, controls: ['Runtime evidence ingestion available', 'Runtime drift signals available'] },
];

function unique<T>(values: T[]): T[] { return [...new Set(values)]; }

export function assertRepositoryWriteSafety(input: Pick<RepositoryOnboardingInput, 'writeEnabled' | 'prRequiresApproval' | 'architectureMutationRequiresApproval'>): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (input.writeEnabled === true) reasons.push('Repository writes must remain disabled for pilot onboarding.');
  if (input.prRequiresApproval === false) reasons.push('PR creation requires explicit human approval.');
  if (input.architectureMutationRequiresApproval === false) reasons.push('Architecture model mutation requires human approval.');
  return reasons.length ? { ok: false, reasons } : { ok: true };
}

export function detectRepositoryArchitectureAssets(paths: string[]): RepositoryAssetDetection[] {
  const detections: RepositoryAssetDetection[] = [];
  for (const rawPath of paths) {
    const path = rawPath.trim();
    if (!path) continue;
    for (const detector of KIND_DETECTORS) {
      if (detector.re.test(path)) {
        detections.push({
          kind: detector.kind,
          path,
          confidence: detector.kind === 'docs' ? 68 : 82,
          reason: `Path matches ${detector.kind} evidence convention.`,
          controlsSeeded: detector.controls,
        });
      }
    }
  }
  const deduped = new Map<string, RepositoryAssetDetection>();
  for (const item of detections) deduped.set(`${item.kind}:${item.path}`, item);
  return [...deduped.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path));
}

export function buildRepositoryEvidenceCoverage(input: RepositoryOnboardingInput, detections = detectRepositoryArchitectureAssets(input.allowedPaths)): RepositoryEvidenceCoverage {
  const expected: RepositoryAssetKind[] = ['adr', 'openapi', 'asyncapi', 'terraform', 'kubernetes', 'docs', 'ci', 'runtime'];
  const detectedKinds = unique(detections.map((item) => item.kind));
  const missingKinds = expected.filter((kind) => !detectedKinds.includes(kind));
  const coverageScore = Math.round((detectedKinds.length / expected.length) * 100);
  return {
    connectorId: input.connectorId,
    repositoryUrl: input.repositoryUrl,
    branch: input.defaultBranch || 'main',
    coverageScore,
    detectedKinds,
    missingKinds,
    detections,
    readOnly: true,
    writePolicy: 'blocked-unless-explicitly-approved',
    architectureMutationPolicy: 'human-approval-required',
  };
}

export function generateConformanceControlsFromCoverage(coverage: RepositoryEvidenceCoverage): RepositoryConformanceControl[] {
  const controls: RepositoryConformanceControl[] = [];
  let index = 1;
  for (const detection of coverage.detections) {
    for (const seed of detection.controlsSeeded) {
      controls.push({
        id: `RC-${coverage.connectorId}-${String(index++).padStart(3, '0')}`,
        title: seed,
        evidenceKind: detection.kind,
        sourcePath: detection.path,
        severity: detection.kind === 'runtime' || detection.kind === 'ci' ? 'warning' : 'info',
        fitnessTestSeed: `Verify ${seed.toLowerCase()} using ${detection.path}.`,
        humanApprovalRequired: true,
      });
    }
  }
  return controls;
}

export function createReadOnlyRepositoryPilotScan(input: RepositoryOnboardingInput, now = new Date().toISOString()): RepositoryPilotScan {
  const safety = assertRepositoryWriteSafety(input);
  const warnings = safety.ok ? [] : safety.reasons;
  const coverage = buildRepositoryEvidenceCoverage({ ...input, writeEnabled: false, prRequiresApproval: true, architectureMutationRequiresApproval: true });
  return {
    scanId: `repo-scan-${input.connectorId}-${now.replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    connectorId: input.connectorId,
    scanMode: 'offline-config',
    startedAt: now,
    completedAt: now,
    coverage,
    controls: generateConformanceControlsFromCoverage(coverage),
    warnings,
  };
}

export function createCiFitnessLoopPlan(input: RepositoryOnboardingInput, controls: RepositoryConformanceControl[], now = new Date().toISOString()): CiFitnessLoopPlan {
  return {
    connectorId: input.connectorId,
    generatedAt: now,
    workflowName: 'aiw-architecture-conformance.yml',
    requiredInputs: ['AIW tenant id', 'project id', 'knowledge release id', 'read-only repository token'],
    proposedChecks: controls.map((control) => `${control.id}: ${control.title}`),
    prCreation: 'preview-only-requires-approval',
    repositoryWrites: 'disabled-by-default',
  };
}

export function createRuntimeEvidenceIngestionPlan(input: RepositoryOnboardingInput, now = new Date().toISOString()): RuntimeEvidenceIngestionPlan {
  return {
    connectorId: input.connectorId,
    generatedAt: now,
    sources: ['OpenTelemetry inventory', 'Kubernetes manifests', 'CI conformance reports', 'runtime inventory JSON'],
    acceptedFormats: ['json', 'yaml', 'otlp-summary'],
    tenantIsolationRequired: true,
    runtimeMutationPolicy: 'evidence-only-no-architecture-mutation',
  };
}

// Sprint 8.9.7 — production adapter contracts.
export type KmsAdapterProvider = 'reference-local' | 'aws-kms' | 'azure-keyvault' | 'gcp-kms' | 'hashicorp-vault' | 'sovereign-hsm';
export interface KmsSigningAdapterContract {
  provider: KmsAdapterProvider;
  keyRefRequired: true;
  supportsOfflineAttestation: boolean;
  zeroEgressCapable: boolean;
}

export const kmsSigningAdapterContracts: KmsSigningAdapterContract[] = [
  { provider: 'reference-local', keyRefRequired: true, supportsOfflineAttestation: true, zeroEgressCapable: true },
  { provider: 'aws-kms', keyRefRequired: true, supportsOfflineAttestation: false, zeroEgressCapable: false },
  { provider: 'azure-keyvault', keyRefRequired: true, supportsOfflineAttestation: false, zeroEgressCapable: false },
  { provider: 'gcp-kms', keyRefRequired: true, supportsOfflineAttestation: false, zeroEgressCapable: false },
  { provider: 'hashicorp-vault', keyRefRequired: true, supportsOfflineAttestation: true, zeroEgressCapable: true },
  { provider: 'sovereign-hsm', keyRefRequired: true, supportsOfflineAttestation: true, zeroEgressCapable: true },
];

export interface ReadOnlyRepositoryExecutionContract {
  connectorId: string;
  provider: string;
  readOnly: true;
  writesPermitted: false;
  prCreation: 'preview-only-requires-approval';
  architectureMutation: 'human-approval-required';
}

export * from './liveProviderBindings.js';

export * from './llm-gateway/index.js';

export * from './durableJobQueue.js';
export * from './repositorySourceAdapters.js';
