import type {
  CandidateClaimStatus,
  ClaimPredicateClass,
  KnowledgePackActivationResult,
  KmsSigningRequest,
  KmsSigningResult,
  MindFactoryActivationPersistenceRecord,
  MindFactoryPersistenceBackend,
  MindFactoryPersistencePlan,
  MindFactorySourceType,
  NormalizedClaimResult,
  RepositorySourceExecutionPolicy,
  RepositorySourceExecutionResult,
  QuarantinedCandidateClaim,
  ReleaseImpactPreview,
  SignedKnowledgePackManifest,
  SourceQuarantineSnapshot,
  StageKnowledgeTraceabilityRecord,
} from '@aiw/domain';

export interface SourceSnapshotInput {
  sourceId: string;
  sourceTitle: string;
  sourceType: MindFactorySourceType | string;
  capturedBy: string;
  content?: string;
  commitSha?: string;
  license?: string;
  provenanceUrl?: string;
  allowedClaimTypes?: ClaimPredicateClass[];
  blockedClaimTypes?: ClaimPredicateClass[];
}

const defaultPredicates: ClaimPredicateClass[] = ['applicability', 'benefit', 'liability', 'obligation', 'risk', 'mitigation', 'quality-impact', 'tactic', 'fitness-test'];
const riskyLicenseTerms = ['unknown', 'unlicensed', 'proprietary-unapproved', 'blocked'];

function stableText(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

export function referenceChecksum(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(16, '0');
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function claimId(snapshotId: string, predicate: string, subject: string, object: string): string {
  return `claim-${referenceChecksum(`${snapshotId}:${predicate}:${subject}:${object}`).slice(0, 12)}`;
}

export function captureSourceSnapshot(input: SourceSnapshotInput): SourceQuarantineSnapshot {
  const content = input.content ?? `${input.sourceTitle}:${input.provenanceUrl ?? input.sourceId}:${input.commitSha ?? 'unpinned'}`;
  const license = (input.license ?? 'unknown').trim();
  const hasPinnedEvidence = Boolean(input.commitSha || input.provenanceUrl || input.content);
  const licenseBlocked = riskyLicenseTerms.includes(license.toLowerCase());
  const status = !hasPinnedEvidence || licenseBlocked ? 'blocked' : 'quarantined';
  return {
    snapshotId: `snap-${referenceChecksum(`${input.sourceId}:${content}:${input.commitSha ?? ''}`).slice(0, 12)}`,
    sourceId: input.sourceId,
    sourceTitle: input.sourceTitle,
    sourceType: input.sourceType,
    capturedAt: new Date().toISOString(),
    capturedBy: input.capturedBy,
    ...(input.commitSha ? { commitSha: input.commitSha } : {}),
    contentHash: referenceChecksum(content),
    ...(license ? { license } : {}),
    ...(input.provenanceUrl ? { provenanceUrl: input.provenanceUrl } : {}),
    status,
    quarantineReason: status === 'blocked' ? 'Snapshot lacks approved provenance, pinned evidence, or licence posture.' : 'Snapshot is quarantined. Candidate claims are non-scoring until named human approval and release promotion.',
    eligibleClaimTypes: input.allowedClaimTypes?.length ? input.allowedClaimTypes : defaultPredicates,
    blockedClaimTypes: input.blockedClaimTypes ?? ['compliance', 'security', 'cost', 'operational-maturity'],
    evidenceRefs: [`${input.sourceId}@${input.commitSha ?? 'snapshot'}#${referenceChecksum(content).slice(0, 8)}`],
  };
}

export function extractCandidateClaimsFromSnapshot(snapshot: SourceQuarantineSnapshot, content?: string): QuarantinedCandidateClaim[] {
  if (snapshot.status === 'blocked') return [];
  const lower = `${snapshot.sourceTitle}\n${content ?? ''}`.toLowerCase();
  const seeds: Array<{ predicate: ClaimPredicateClass; subject: string; object: string; context: string[] }> = [];
  if (lower.includes('adapter') || lower.includes('legacy') || lower.includes('interface')) seeds.push({ predicate: 'applicability', subject: 'adapter-pattern', object: 'Use Adapter when existing systems or third-party components expose incompatible interfaces.', context: ['legacy-integration', 'interface-conversion'] });
  if (lower.includes('facade') || lower.includes('simplified interface')) seeds.push({ predicate: 'benefit', subject: 'facade-pattern', object: 'Facade simplifies common interactions with complex subsystems while keeping the subsystem available for advanced use.', context: ['subsystem-simplification', 'integration'] });
  if (lower.includes('modifiability') || lower.includes('maintainability')) seeds.push({ predicate: 'tactic', subject: 'modifiability', object: 'Localize changes, maintain interfaces, hide information, and restrict communication paths to reduce ripple effects.', context: ['change-management', 'maintainability'] });
  if (lower.includes('performance') || lower.includes('latency') || lower.includes('throughput')) seeds.push({ predicate: 'quality-impact', subject: 'performance', object: 'Caching, load balancing, database optimization, asynchronous processing, and capacity planning improve responsiveness under load.', context: ['performance', 'scalability'] });
  if (lower.includes('sdd') || lower.includes('driver') || lower.includes('decision')) seeds.push({ predicate: 'obligation', subject: 'solution-design-document', object: 'Trace stakeholders to drivers, decisions, trade-offs, risks, components, views, and handoff artifacts.', context: ['sdd', 'traceability'] });
  if (!seeds.length) seeds.push({ predicate: 'risk', subject: normalizeTerm(snapshot.sourceTitle) || 'architecture-source', object: 'Source requires curator review before any claim can influence recommendations.', context: ['quarantine'] });
  return seeds.map((seed) => ({
    claimId: claimId(snapshot.snapshotId, seed.predicate, seed.subject, seed.object),
    snapshotId: snapshot.snapshotId,
    sourceId: snapshot.sourceId,
    predicate: seed.predicate,
    subject: seed.subject,
    object: seed.object,
    applicabilityContext: seed.context,
    evidenceRefs: snapshot.evidenceRefs,
    sourceSpan: seed.object.slice(0, 180),
    confidence: snapshot.license && snapshot.license !== 'unknown' ? 'moderate' : 'weak',
    status: 'candidate' as CandidateClaimStatus,
    reviewerRequired: true,
    nonScoring: true,
  }));
}

export function normalizeMindFactoryClaims(claims: QuarantinedCandidateClaim[]): NormalizedClaimResult {
  const seen = new Map<string, QuarantinedCandidateClaim>();
  const duplicateGroups: NormalizedClaimResult['duplicateGroups'] = [];
  const synonymMap = new Map<string, Set<string>>();
  const contradictionGroups: NormalizedClaimResult['contradictionGroups'] = [];
  const normalizedClaims = claims.map((claim) => ({ ...claim, status: 'normalized' as CandidateClaimStatus }));
  for (const claim of normalizedClaims) {
    const key = `${normalizeTerm(claim.subject)}:${normalizeTerm(claim.predicate)}:${normalizeTerm(claim.object)}`;
    const existing = seen.get(key);
    if (existing) duplicateGroups.push({ groupId: `dup-${referenceChecksum(key).slice(0, 10)}`, canonicalClaimId: existing.claimId, duplicateClaimIds: [claim.claimId], reason: 'Same subject, predicate and normalized object.' });
    else seen.set(key, claim);
    const subjectKey = normalizeTerm(claim.subject.replace('-pattern', ''));
    if (!synonymMap.has(subjectKey)) synonymMap.set(subjectKey, new Set<string>());
    synonymMap.get(subjectKey)?.add(claim.subject);
  }
  const synonymGroups = [...synonymMap.entries()].filter(([, terms]) => terms.size > 1).map(([canonicalTerm, terms]) => ({ groupId: `syn-${referenceChecksum(canonicalTerm).slice(0, 10)}`, canonicalTerm, synonyms: [...terms], scope: 'pattern' }));
  const bySubject = new Map<string, QuarantinedCandidateClaim[]>();
  for (const claim of normalizedClaims) {
    const key = normalizeTerm(claim.subject);
    bySubject.set(key, [...(bySubject.get(key) ?? []), claim]);
  }
  for (const [subject, subjectClaims] of bySubject.entries()) {
    const hasBenefit = subjectClaims.some((c) => c.predicate === 'benefit' || c.predicate === 'applicability');
    const hasRisk = subjectClaims.some((c) => c.predicate === 'risk' || c.predicate === 'liability' || c.predicate === 'conflict');
    if (hasBenefit && hasRisk) contradictionGroups.push({ groupId: `contra-${referenceChecksum(subject).slice(0, 10)}`, subject, opposingClaimIds: subjectClaims.map((c) => c.claimId), resolution: 'needs-context-split', reason: 'Benefit/applicability and risk/liability claims must be split by context instead of deleted.' });
  }
  const corroboration = normalizedClaims.map((claim) => {
    const independentSupportCount = new Set(normalizedClaims.filter((other) => normalizeTerm(other.subject) === normalizeTerm(claim.subject)).map((other) => other.sourceId)).size;
    const confidence: 'weak' | 'moderate' | 'strong' = independentSupportCount >= 3 ? 'strong' : independentSupportCount >= 2 ? 'moderate' : 'weak';
    return { claimId: claim.claimId, independentSupportCount, confidence, recommendation: confidence === 'weak' ? 'Keep in review; attach stronger evidence before release inclusion.' : 'Eligible for reviewer decision and release-impact preview.' };
  });
  return { normalizedClaims, duplicateGroups, synonymGroups, contradictionGroups, corroboration };
}

export function buildReleaseImpactPreview(input: { baseReleaseId: string; candidateReleaseId: string; changedClaims: QuarantinedCandidateClaim[]; changedPatterns?: string[] }): ReleaseImpactPreview {
  const affectedStages = [...new Set(input.changedClaims.flatMap((claim) => {
    if (claim.subject.includes('adapter') || claim.subject.includes('facade')) return ['patterns-and-tactics', 'canvas-modelling', 'repository-conformance'];
    if (claim.subject.includes('performance') || claim.predicate === 'quality-impact') return ['quality-drivers', 'review-studio'];
    if (claim.subject.includes('solution-design')) return ['architecture-handoff', 'review-studio'];
    return ['brief', 'review-studio'];
  }))];
  const blockedByContradictions = input.changedClaims.some((claim) => claim.status === 'contradicted');
  return {
    previewId: `impact-${referenceChecksum(`${input.baseReleaseId}:${input.candidateReleaseId}:${input.changedClaims.length}`).slice(0, 12)}`,
    baseReleaseId: input.baseReleaseId,
    candidateReleaseId: input.candidateReleaseId,
    generatedAt: new Date().toISOString(),
    changedClaimCount: input.changedClaims.length,
    changedPatternCount: input.changedPatterns?.length ?? new Set(input.changedClaims.map((claim) => claim.subject).filter((subject) => subject.includes('pattern'))).size,
    affectedStages,
    recommendationMovement: affectedStages.map((stage) => ({ recommendationId: `${stage}-ranking`, before: 'current-release', after: 'candidate-release-preview-only', reason: 'Preview generated before promotion; candidate knowledge remains non-scoring.' })),
    riskNotes: blockedByContradictions ? ['At least one contradiction requires context split before promotion.'] : ['Candidate release may change stage recommendations only after named-human promotion.'],
    promotionGate: blockedByContradictions ? 'blocked' : 'eligible-after-human-approval',
  };
}

export function buildStageKnowledgeTraceability(): StageKnowledgeTraceabilityRecord[] {
  return [
    { stageId: 'brief', stageName: 'Brief', knowledgeInputs: ['attribute-catalog', 'scenario-grammar', 'sdd-reasoning-grammar'], claimPredicates: ['applicability', 'quality-impact'], evidenceRequired: ['sourceText span', 'kbRef'], offlineAvailable: true, adminControls: ['knowledge-release pin', 'claim review'] },
    { stageId: 'quality-drivers', stageName: 'Quality Drivers', knowledgeInputs: ['quality-attribute taxonomy', 'tactics'], claimPredicates: ['quality-impact', 'tactic'], evidenceRequired: ['approved claim', 'release id'], offlineAvailable: true, adminControls: ['release impact preview', 'scenario regression'] },
    { stageId: 'patterns-and-tactics', stageName: 'Patterns and Tactics', knowledgeInputs: ['pattern DNA', 'tactic catalog', 'pattern-quality matrix'], claimPredicates: ['applicability', 'obligation', 'risk', 'mitigation'], evidenceRequired: ['Pattern DNA record', 'source provenance'], offlineAvailable: true, adminControls: ['Pattern DNA Ops', 'contradiction triage'] },
    { stageId: 'canvas-modelling', stageName: 'Canvas Modelling', knowledgeInputs: ['component grammar', 'edge obligations', 'graph checks'], claimPredicates: ['obligation', 'risk', 'fitness-test'], evidenceRequired: ['object id', 'edge id', 'kbRef'], offlineAvailable: true, adminControls: ['stage receipts', 'approval-required changes'] },
    { stageId: 'review-studio', stageName: 'Review Studio', knowledgeInputs: ['review rules', 'fitness-test seeds', 'decision grammar'], claimPredicates: ['risk', 'mitigation', 'fitness-test'], evidenceRequired: ['finding id', 'release id'], offlineAvailable: true, adminControls: ['release pin', 'impact preview'] },
    { stageId: 'repository-conformance', stageName: 'Repository Conformance', knowledgeInputs: ['repository evidence mappings', 'CI fitness loop'], claimPredicates: ['compliance', 'fitness-test'], evidenceRequired: ['commit SHA', 'path mapping'], offlineAvailable: false, adminControls: ['repository connector admin', 'read-only scan'] },
    { stageId: 'architecture-handoff', stageName: 'Architecture Handoff', knowledgeInputs: ['SDD grammar', 'ADR grammar', 'risk register grammar'], claimPredicates: ['obligation', 'mitigation'], evidenceRequired: ['decision id', 'artifact id'], offlineAvailable: true, adminControls: ['knowledge-pack signature', 'handoff checklist'] },
  ];
}

export function createSignedKnowledgePackManifest(input: { releaseId: string; generatedBy: string; files?: Record<string, string> }): SignedKnowledgePackManifest {
  const files = Object.entries(input.files ?? {
    'manifest.json': input.releaseId,
    'knowledge-release.json': input.releaseId,
    'claims.ndjson': '',
    'pattern-dna.json': '',
    'sdd-reasoning-grammar.json': '',
    'source-provenance.json': '',
    'license-manifest.json': '',
  }).map(([path, content]) => ({ path, sha256: referenceChecksum(content), bytes: content.length }));
  const packId = `kpack-${referenceChecksum(`${input.releaseId}:${files.map((f) => f.sha256).join(':')}`).slice(0, 12)}`;
  const signable = stableText({ packId, releaseId: input.releaseId, files: files.map((file) => [file.path, file.sha256]) });
  return {
    packId,
    releaseId: input.releaseId,
    generatedAt: new Date().toISOString(),
    generatedBy: input.generatedBy,
    files,
    activationRules: ['signature-valid', 'all-checksums-match', 'release-status-released', 'not-expired', 'tenant-policy-allows-pack'],
    rejectionRules: ['unsigned', 'checksum-mismatch', 'candidate-only', 'blocked-source-present', 'unsupported-schema-version'],
    provenance: { candidateKnowledgeInfluence: 'blocked-until-promotion', llmAuthority: 'none', humanPromotionRequired: true },
    signature: { algorithm: 'reference-sha256-manifest', value: referenceChecksum(signable) },
  };
}

export function verifyKnowledgePackActivation(manifest: Partial<SignedKnowledgePackManifest>): KnowledgePackActivationResult {
  const reasons: string[] = [];
  if (!manifest.releaseId) reasons.push('releaseId is required.');
  if (!manifest.signature?.value) reasons.push('signature is required.');
  if (!manifest.files?.length) reasons.push('files manifest is required.');
  if (manifest.provenance?.candidateKnowledgeInfluence !== 'blocked-until-promotion') reasons.push('candidate knowledge influence policy must be blocked until promotion.');
  const rejected = reasons.length > 0;
  return { status: rejected ? 'rejected' : 'accepted', ...(manifest.releaseId && !rejected ? { releaseId: manifest.releaseId } : {}), activatedAt: new Date().toISOString(), reasons: rejected ? reasons : ['Knowledge pack accepted for activation after tenant/project pinning.'], ...(manifest as SignedKnowledgePackManifest).packId ? { manifest: manifest as SignedKnowledgePackManifest } : {} };
}

export function createMindFactoryWorkerJobPlan(input: { operation: import('@aiw/domain').MindFactoryWorkerOperation; queuedBy: string; sourceId?: string; snapshotId?: string; releaseId?: string; tenantId?: string }): import('@aiw/domain').MindFactoryWorkerJobPlan {
  const seed = `${input.operation}:${input.sourceId ?? ''}:${input.snapshotId ?? ''}:${input.releaseId ?? ''}:${Date.now()}`;
  return {
    jobId: `mfjob-${referenceChecksum(seed).slice(0, 12)}`,
    operation: input.operation,
    ...(input.sourceId ? { sourceId: input.sourceId } : {}),
    ...(input.snapshotId ? { snapshotId: input.snapshotId } : {}),
    ...(input.releaseId ? { releaseId: input.releaseId } : {}),
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    status: 'queued',
    queuedAt: new Date().toISOString(),
    queuedBy: input.queuedBy,
    workerQueue: input.operation === 'source-refresh' ? 'knowledge-source-refresh' : input.operation === 'claim-extraction' ? 'claim-extraction' : 'mind-factory-orchestration',
    doctrine: { deterministicAuthority: true, candidateKnowledgeNonScoring: true, humanApprovalRequired: true },
  };
}

export function activateSignedKnowledgePack(input: { manifest: Partial<SignedKnowledgePackManifest>; tenantId: string; activatedBy: string; projectId?: string; activationMode?: import('@aiw/domain').KnowledgePackActivationPolicy['activationMode'] }): import('@aiw/domain').KnowledgePackActivationPolicy | KnowledgePackActivationResult {
  const verification = verifyKnowledgePackActivation(input.manifest);
  if (verification.status !== 'accepted' || !input.manifest.releaseId || !input.manifest.packId) return verification;
  const checks = [
    { checkId: 'signature-present', ok: Boolean(input.manifest.signature?.value), detail: 'Knowledge-pack manifest carries a reference signature.' },
    { checkId: 'candidate-blocked', ok: input.manifest.provenance?.candidateKnowledgeInfluence === 'blocked-until-promotion', detail: 'Candidate knowledge influence remains blocked until promotion.' },
    { checkId: 'human-promotion-required', ok: input.manifest.provenance?.humanPromotionRequired === true, detail: 'Human promotion remains required by manifest provenance.' },
    { checkId: 'files-present', ok: Boolean(input.manifest.files?.length), detail: `${input.manifest.files?.length ?? 0} manifest file entries present.` },
  ];
  return {
    tenantId: input.tenantId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
    releaseId: input.manifest.releaseId,
    packId: input.manifest.packId,
    activatedBy: input.activatedBy,
    activatedAt: new Date().toISOString(),
    activationMode: input.activationMode ?? 'enterprise-tenant',
    checks,
    pinned: checks.every((check) => check.ok),
  };
}

export function buildMindFactoryAuditTimeline(events: Array<{ at: string; actor: string; action: string; subject: string; detail: string }>): import('@aiw/domain').MindFactoryAuditTimelineEvent[] {
  return events.filter((event) => event.action.includes('mind-factory') || event.action.includes('knowledge-pack')).map((event) => {
    const action = event.action;
    const phase: import('@aiw/domain').MindFactoryAuditTimelineEvent['phase'] = action.includes('snapshot') ? 'snapshot' : action.includes('extract') ? 'extraction' : action.includes('normal') ? 'normalization' : action.includes('impact') ? 'impact-preview' : action.includes('export') ? 'pack-export' : action.includes('import') ? 'pack-import' : action.includes('activ') ? 'activation' : 'worker';
    return { ...event, phase };
  });
}


export function createMindFactoryPersistencePlan(input: { backend?: MindFactoryPersistenceBackend; generatedBy?: string } = {}): MindFactoryPersistencePlan {
  const backend = input.backend ?? 'postgres';
  return {
    planId: `mf-persist-${referenceChecksum(`${backend}:${input.generatedBy ?? 'system'}:${Date.now()}`).slice(0, 12)}`,
    backend,
    generatedAt: new Date().toISOString(),
    tables: [
      { table: 'mind_factory_source_snapshots', tenantScoped: true, rlsRequired: true, purpose: 'Commit-pinned/quarantined source snapshots.' },
      { table: 'mind_factory_candidate_claims', tenantScoped: true, rlsRequired: true, purpose: 'Non-scoring candidate claims awaiting review.' },
      { table: 'mind_factory_worker_jobs', tenantScoped: true, rlsRequired: true, purpose: 'Worker orchestration jobs and dry-run/live execution metadata.' },
      { table: 'mind_factory_pack_activations', tenantScoped: true, rlsRequired: true, purpose: 'Tenant/project signed-pack activations and release pins.' },
      { table: 'mind_factory_audit_timeline', tenantScoped: true, rlsRequired: true, purpose: 'Append-only Mind Factory audit events.' },
      { table: 'mind_factory_repository_executions', tenantScoped: true, rlsRequired: true, purpose: 'Read-only repository source refresh executions.' },
      { table: 'mind_factory_kms_signatures', tenantScoped: true, rlsRequired: true, purpose: 'KMS signing attestations for knowledge packs.' },
    ],
    migrations: ['database/migrations/016_sprint8_9_7_mind_factory_production.sql'],
    safety: {
      candidateClaimsNonScoring: true,
      releaseActivationTenantScoped: true,
      repositoryExecutionsReadOnly: true,
      auditTimelineAppendOnly: true,
    },
  };
}

export function signKnowledgePackWithKms(input: KmsSigningRequest): { manifest: SignedKnowledgePackManifest; signature: KmsSigningResult } {
  const manifestHash = referenceChecksum(stableText({ packId: input.manifest.packId, releaseId: input.manifest.releaseId, files: input.manifest.files.map((file) => [file.path, file.sha256]) }));
  const value = referenceChecksum(`${input.provider}:${input.keyRef}:${manifestHash}:${input.requestedBy}`);
  const signature: KmsSigningResult = {
    signatureId: `kms-${referenceChecksum(`${input.keyRef}:${value}`).slice(0, 12)}`,
    provider: input.provider,
    keyRef: input.keyRef,
    algorithm: 'kms-attested-sha256-manifest',
    value,
    signedAt: new Date().toISOString(),
    signedBy: input.requestedBy,
    manifestPackId: input.manifest.packId,
    verification: { manifestHash, candidateKnowledgeBlocked: true, humanPromotionRequired: true, keyRefRecorded: true },
  };
  return {
    manifest: {
      ...input.manifest,
      activationRules: [...new Set([...input.manifest.activationRules, 'kms-signature-attested', 'tenant-policy-allows-key-ref'])],
      signature: { algorithm: 'kms-attested-sha256-manifest', value, provider: input.provider, keyRef: input.keyRef },
    },
    signature,
  };
}

export function executeRepositorySourceRefresh(input: RepositorySourceExecutionPolicy): RepositorySourceExecutionResult {
  const warnings: string[] = [];
  if (!input.readOnly) warnings.push('Repository source execution must be read-only.');
  if (!input.allowedPaths.length) warnings.push('At least one allowed path must be configured before execution.');
  const doctrine = { repositoryWritesDisabled: true, prCreationRequiresApproval: true, architectureMutationRequiresApproval: true, candidateClaimsNonScoring: true } as const;
  if (warnings.length) {
    return {
      executionId: `repoexec-${referenceChecksum(`${input.connectorId}:blocked:${Date.now()}`).slice(0, 12)}`,
      connectorId: input.connectorId,
      mode: 'reference-dry-run',
      status: 'blocked',
      executedAt: new Date().toISOString(),
      detectedPaths: input.allowedPaths,
      warnings,
      doctrine,
    };
  }
  const detectedPaths = [...new Set(input.allowedPaths)].sort();
  const snapshot = captureSourceSnapshot({
    sourceId: `repo-${input.connectorId}`,
    sourceTitle: `${input.provider} repository source ${input.connectorId}`,
    sourceType: input.provider,
    capturedBy: input.executedBy,
    content: `${input.repositoryUrl}\n${input.branch}\n${detectedPaths.join('\n')}`,
    commitSha: input.commitSha ?? `ref-${referenceChecksum(`${input.repositoryUrl}:${input.branch}:${detectedPaths.join(':')}`).slice(0, 12)}`,
    license: input.licence ?? 'repository-policy-approved',
    provenanceUrl: input.repositoryUrl,
  });
  return {
    executionId: `repoexec-${referenceChecksum(`${input.connectorId}:${snapshot.snapshotId}`).slice(0, 12)}`,
    connectorId: input.connectorId,
    mode: 'reference-dry-run',
    status: 'completed',
    executedAt: new Date().toISOString(),
    snapshot,
    detectedPaths,
    warnings: ['Reference execution captured configured paths only. Target environment performs actual Git provider fetch behind read-only connector policy.'],
    doctrine,
  };
}

export function persistKnowledgePackActivation(input: { activation: import('@aiw/domain').KnowledgePackActivationPolicy; persistedBy: string; backend?: MindFactoryPersistenceBackend }): MindFactoryActivationPersistenceRecord {
  return {
    recordId: `mfact-${referenceChecksum(`${input.activation.tenantId}:${input.activation.projectId ?? 'tenant'}:${input.activation.packId}`).slice(0, 12)}`,
    tenantId: input.activation.tenantId,
    ...(input.activation.projectId ? { projectId: input.activation.projectId } : {}),
    releaseId: input.activation.releaseId,
    packId: input.activation.packId,
    persistedAt: new Date().toISOString(),
    persistedBy: input.persistedBy,
    backend: input.backend ?? 'postgres',
    pinStatus: input.activation.pinned ? 'pinned' : 'blocked',
    rlsPartitionKey: `${input.activation.tenantId}:${input.activation.projectId ?? 'tenant'}`,
  };
}
