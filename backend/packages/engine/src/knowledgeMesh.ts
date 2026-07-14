import {
  knowledgeRepositoryConnectors,
  seedKnowledgeClaims,
  type ArchitectureKnowledgeClaim,
  type ClaimContradiction,
  type KnowledgeChangeProposal,
  type KnowledgeRelease,
  type KnowledgeRepositoryConnector,
  type KnowledgeRetrievalHit,
  type KnowledgeRetrievalRequest,
  type KnowledgeRetrievalResult,
  type KnowledgeSourceFile,
  type KnowledgeSourceSnapshot,
  type SourceTrustTier,
} from '@aiw/domain';

export interface KnowledgeMeshCoverage {
  generatedAt: string;
  connectors: number;
  approvedConnectors: number;
  discoveryOnlyConnectors: number;
  categories: Record<string, number>;
  uses: Record<string, number>;
  trustTiers: Record<string, number>;
  sourceFamilies: Record<string, number>;
  licenseReviewRequired: number;
  refreshDue: string[];
}

export interface ExtractedClaimCandidate {
  subjectId: string;
  subjectName: string;
  claimType: ArchitectureKnowledgeClaim['claimType'];
  predicate: string;
  object: string;
  statement: string;
  polarity: ArchitectureKnowledgeClaim['polarity'];
  conditions?: string[];
  limitations?: string[];
  contextTags?: string[];
  heading?: string;
  lineStart?: number;
  lineEnd?: number;
  confidence?: number;
}

export interface ClaimExtractionEnvelope {
  connectorId: string;
  repositoryRevision: string;
  sourcePath: string;
  extractor: {
    provider: string;
    model: string;
    promptVersion: string;
  };
  candidates: ExtractedClaimCandidate[];
}

export interface ClaimValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalized?: ArchitectureKnowledgeClaim;
}

const stopWords = new Set([
  'a','an','and','are','as','at','be','by','can','for','from','has','have','in','into','is','it','of','on','or','that','the','this','to','with','within','without',
]);

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9._-]+/g, ' ').split(/\s+/)
      .map((token) => token.trim()).filter((token) => token.length > 1 && !stopWords.has(token)),
  );
}

function includesGlob(path: string, glob: string): boolean {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '§§').replace(/\*/g, '[^/]*').replace(/§§/g, '.*');
  return new RegExp(`^${escaped}$`, 'i').test(path);
}

export function sourcePathAllowed(connector: KnowledgeRepositoryConnector, path: string): boolean {
  if (connector.deniedPaths.some((glob) => includesGlob(path, glob))) return false;
  return connector.allowedPaths.some((glob) => includesGlob(path, glob));
}

export function fingerprintSourceFiles(files: KnowledgeSourceFile[]): string {
  const ordered = files
    .map((file) => ({ path: file.path, blobSha: file.blobSha, sizeBytes: file.sizeBytes, mediaType: file.mediaType }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return `km-${stableHash(canonical(ordered))}`;
}

export function createKnowledgeSnapshot(input: {
  connectorId: string;
  repositoryRevision: string;
  fetchedAt?: string;
  etag?: string;
  files: KnowledgeSourceFile[];
}): KnowledgeSourceSnapshot {
  const connector = knowledgeRepositoryConnectors.find((item) => item.id === input.connectorId);
  if (!connector) throw new Error('UNKNOWN_KNOWLEDGE_CONNECTOR');
  const acceptedFiles = input.files.filter((file) => sourcePathAllowed(connector, file.path) && file.sizeBytes <= connector.maxFileBytes).slice(0, connector.maxFilesPerRefresh);
  if (!acceptedFiles.length) throw new Error('NO_ALLOWED_SOURCE_FILES');
  const contentHash = fingerprintSourceFiles(acceptedFiles);
  const base: KnowledgeSourceSnapshot = {
    id: `KSNAP-${stableHash(`${connector.id}:${input.repositoryRevision}:${contentHash}`)}`,
    connectorId: connector.id,
    repositoryRevision: input.repositoryRevision,
    fetchedAt: input.fetchedAt ?? new Date().toISOString(),
    files: acceptedFiles,
    contentHash,
    status: 'quarantined',
  };
  return input.etag ? { ...base, etag: input.etag } : base;
}

function trustWeight(tier: SourceTrustTier): number {
  return ({ 1: 1, 2: 0.82, 3: 0.62, 4: 0.35 } as const)[tier];
}

function sourceTierForClaim(claim: ArchitectureKnowledgeClaim): SourceTrustTier {
  const tiers = claim.sourceLocations.flatMap((location) => {
    const connector = knowledgeRepositoryConnectors.find((item) => item.id === location.connectorId);
    return connector ? [connector.trustTier] : [];
  });
  return tiers.length ? Math.min(...tiers) as SourceTrustTier : 4;
}

function claimText(claim: ArchitectureKnowledgeClaim): string {
  return [claim.subjectName, claim.claimType, claim.predicate, claim.object, claim.statement, ...claim.conditions, ...claim.limitations, ...claim.contextTags].join(' ');
}

export function validateExtractedClaim(envelope: ClaimExtractionEnvelope, candidate: ExtractedClaimCandidate, extractedAt = new Date().toISOString()): ClaimValidationResult {
  const connector = knowledgeRepositoryConnectors.find((item) => item.id === envelope.connectorId);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!connector) errors.push('Connector is not allowlisted.');
  if (connector && !sourcePathAllowed(connector, envelope.sourcePath)) errors.push('Source path is outside the connector allowlist.');
  if (!candidate.subjectId.trim() || !candidate.subjectName.trim()) errors.push('Claim subject is required.');
  if (!candidate.predicate.trim() || !candidate.object.trim() || candidate.statement.trim().length < 20) errors.push('Atomic claim predicate, object and a meaningful statement are required.');
  if (candidate.statement.length > 900) warnings.push('Claim statement is unusually long and should be split into atomic claims.');
  if (!(candidate.conditions?.length ?? 0)) warnings.push('Applicability conditions are absent.');
  if (!(candidate.limitations?.length ?? 0)) warnings.push('Limitations are absent.');
  if (!connector || errors.length) return { valid: false, errors, warnings };

  const requestedConfidence = Math.max(0, Math.min(100, Math.round(candidate.confidence ?? 70)));
  const sourceConfidence = Math.round(requestedConfidence * trustWeight(connector.trustTier));
  const lineStart = candidate.lineStart;
  const lineEnd = candidate.lineEnd;
  const location = {
    connectorId: connector.id,
    repository: connector.repository,
    revision: envelope.repositoryRevision,
    path: envelope.sourcePath,
    excerptHash: `EX-${stableHash(candidate.statement)}`,
    ...(candidate.heading ? { heading: candidate.heading } : {}),
    ...(lineStart !== undefined ? { lineStart } : {}),
    ...(lineEnd !== undefined ? { lineEnd } : {}),
  };
  const normalized: ArchitectureKnowledgeClaim = {
    id: `KCLM-${stableHash(`${connector.id}:${envelope.repositoryRevision}:${envelope.sourcePath}:${candidate.subjectId}:${candidate.predicate}:${candidate.object}`)}`,
    subjectId: candidate.subjectId.trim(),
    subjectName: candidate.subjectName.trim(),
    claimType: candidate.claimType,
    predicate: candidate.predicate.trim(),
    object: candidate.object.trim(),
    statement: candidate.statement.trim(),
    polarity: candidate.polarity,
    conditions: [...new Set(candidate.conditions ?? [])],
    limitations: [...new Set(candidate.limitations ?? [])],
    contextTags: [...new Set(candidate.contextTags ?? [])],
    sourceLocations: [location],
    extraction: {
      mode: 'llm',
      provider: envelope.extractor.provider,
      model: envelope.extractor.model,
      promptVersion: envelope.extractor.promptVersion,
      extractedAt,
    },
    sourceConfidence,
    corroborationScore: 0,
    reviewStatus: 'candidate',
  };
  return { valid: true, errors, warnings, normalized };
}

export function extractionPromptContract(): { version: string; instructions: string[]; requiredFields: string[] } {
  return {
    version: 'km-claim-extraction-v1',
    instructions: [
      'Extract only claims explicitly supported by the supplied source text.',
      'Produce atomic claims with one subject, predicate and object.',
      'Capture conditions and limitations; never convert contextual guidance into a universal rule.',
      'Preserve provider or framework specificity in context tags.',
      'Do not infer compliance, suitability or numerical quality impact unless the source explicitly supports it.',
      'Do not quote long passages; store a source location and excerpt hash instead.',
      'Return candidates only. Publication requires deterministic validation and human approval.',
    ],
    requiredFields: ['subjectId','subjectName','claimType','predicate','object','statement','polarity','conditions','limitations','contextTags'],
  };
}

export function detectClaimContradictions(claims: ArchitectureKnowledgeClaim[]): ClaimContradiction[] {
  const groups = new Map<string, ArchitectureKnowledgeClaim[]>();
  for (const claim of claims.filter((item) => item.reviewStatus !== 'rejected' && item.reviewStatus !== 'superseded')) {
    const key = `${claim.subjectId.toLowerCase()}::${claim.predicate.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) ?? []), claim]);
  }
  const contradictions: ClaimContradiction[] = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const polarities = new Set(group.map((claim) => claim.polarity));
    const objects = new Set(group.map((claim) => claim.object.toLowerCase()));
    const conflictingPolarity = polarities.has('supports') && (polarities.has('prohibits') || polarities.has('limits'));
    const opposingObjects = objects.size > 1 && group.some((claim) => claim.polarity === 'requires' || claim.polarity === 'prohibits');
    if (!conflictingPolarity && !opposingObjects) continue;
    const contexts = [...new Set(group.flatMap((claim) => claim.contextTags))];
    const contextSets = group.map((claim) => new Set(claim.contextTags));
    const sharedContext = contextSets.length > 1 && [...contextSets[0]!].some((tag) => contextSets.slice(1).every((set) => set.has(tag)));
    contradictions.push({
      id: `KCON-${stableHash(`${key}:${group.map((claim) => claim.id).sort().join(':')}`)}`,
      subjectId: group[0]!.subjectId,
      predicate: group[0]!.predicate,
      claimIds: group.map((claim) => claim.id).sort(),
      severity: sharedContext ? 'material' : 'contextual',
      explanation: sharedContext
        ? 'Claims with overlapping contexts express materially different guidance and require expert resolution.'
        : 'Claims appear different but may apply to distinct technology, workload or organizational contexts.',
      distinguishingContexts: contexts,
      resolutionStatus: sharedContext ? 'open' : 'context-separated',
    });
  }
  return contradictions.sort((a, b) => a.id.localeCompare(b.id));
}

function scoreClaim(claim: ArchitectureKnowledgeClaim, request: KnowledgeRetrievalRequest): KnowledgeRetrievalHit {
  const queryTokens = tokenize(request.query);
  const claimTokens = tokenize(claimText(claim));
  const overlap = [...queryTokens].filter((token) => claimTokens.has(token));
  const reasons: string[] = [];
  let score = overlap.length * 8;
  if (claim.subjectName.toLowerCase().includes(request.query.toLowerCase())) { score += 25; reasons.push('subject-name match'); }
  if (request.stage && claim.contextTags.includes(request.stage)) { score += 12; reasons.push('architecture-stage match'); }
  if (request.selectedNodeKind && claim.contextTags.some((tag) => tag.toLowerCase() === request.selectedNodeKind!.toLowerCase())) { score += 10; reasons.push('selected-component match'); }
  const requestedTags = [...(request.contextTags ?? []), ...(request.qualityAttributeIds ?? [])];
  const tagOverlap = requestedTags.filter((tag) => claim.contextTags.map((item) => item.toLowerCase()).includes(tag.toLowerCase()));
  score += tagOverlap.length * 6;
  if (tagOverlap.length) reasons.push(`context match: ${tagOverlap.join(', ')}`);
  if (overlap.length) reasons.push(`term match: ${overlap.slice(0, 6).join(', ')}`);
  const tier = sourceTierForClaim(claim);
  score += Math.round(claim.sourceConfidence * 0.18 + claim.corroborationScore * 0.12 + trustWeight(tier) * 15);
  if (claim.reviewStatus === 'verified') { score += 20; reasons.push('expert-verified claim'); }
  if (claim.reviewStatus === 'disputed') score -= 20;
  return { claim, score: Math.max(0, Math.round(score)), matchReasons: reasons, sourceTrustTier: tier, releaseStatus: claim.reviewStatus === 'verified' ? 'approved' : 'candidate' };
}

export function retrieveArchitectureKnowledge(request: KnowledgeRetrievalRequest, claims: ArchitectureKnowledgeClaim[] = seedKnowledgeClaims): KnowledgeRetrievalResult {
  const limit = Math.max(1, Math.min(50, request.limit ?? 12));
  const ranked = claims.map((claim) => scoreClaim(claim, request)).filter((hit) => hit.score > 5).sort((a, b) => b.score - a.score || a.claim.id.localeCompare(b.claim.id));
  const approved = ranked.filter((hit) => hit.releaseStatus === 'approved').slice(0, limit);
  const candidate = request.includeCandidateClaims ? ranked.filter((hit) => hit.releaseStatus === 'candidate').slice(0, limit) : [];
  const warnings: string[] = [];
  if (!approved.length) warnings.push('No approved claim strongly matched this query; the design assistant should ask clarifying questions or broaden the scope.');
  if (candidate.length) warnings.push('Candidate claims are unreleased and must be labelled as provisional evidence.');
  return { generatedAt: new Date().toISOString(), query: request.query, approved, candidate, warnings };
}

export function createKnowledgeProposal(input: {
  title: string;
  createdBy: string;
  sourceSnapshotIds: string[];
  claims: ArchitectureKnowledgeClaim[];
  existingClaims?: ArchitectureKnowledgeClaim[];
  affectedLibraryRecordIds?: string[];
  recommendationRegressionIds?: string[];
  now?: string;
}): KnowledgeChangeProposal {
  const existing = new Map((input.existingClaims ?? seedKnowledgeClaims).map((claim) => [claim.id, claim]));
  const newClaims = input.claims.filter((claim) => !existing.has(claim.id));
  const changedClaims = input.claims.filter((claim) => existing.has(claim.id) && canonical(existing.get(claim.id)) !== canonical(claim));
  const allClaims = [...(input.existingClaims ?? seedKnowledgeClaims), ...newClaims, ...changedClaims];
  return {
    id: `KPROP-${stableHash(`${input.title}:${input.createdBy}:${input.sourceSnapshotIds.sort().join(':')}:${input.claims.map((claim) => claim.id).sort().join(':')}`)}`,
    title: input.title,
    createdAt: input.now ?? new Date().toISOString(),
    createdBy: input.createdBy,
    sourceSnapshotIds: [...new Set(input.sourceSnapshotIds)],
    newClaims,
    changedClaims,
    supersededClaimIds: [],
    contradictions: detectClaimContradictions(allClaims),
    affectedLibraryRecordIds: [...new Set(input.affectedLibraryRecordIds ?? input.claims.map((claim) => claim.subjectId))],
    recommendationRegressionIds: [...new Set(input.recommendationRegressionIds ?? [])],
    status: 'draft',
    reviewNotes: [],
  };
}

export function submitKnowledgeProposal(proposal: KnowledgeChangeProposal): KnowledgeChangeProposal {
  if (!proposal.newClaims.length && !proposal.changedClaims.length && !proposal.supersededClaimIds.length) throw new Error('EMPTY_KNOWLEDGE_PROPOSAL');
  if (proposal.contradictions.some((item) => item.severity === 'blocking' && item.resolutionStatus === 'open')) throw new Error('BLOCKING_KNOWLEDGE_CONTRADICTION');
  return { ...proposal, status: 'pending-review' };
}

export function decideKnowledgeProposal(proposal: KnowledgeChangeProposal, decision: 'approved' | 'changes-requested' | 'rejected', reviewer: string, note: string, now = new Date().toISOString()): KnowledgeChangeProposal {
  if (proposal.status !== 'pending-review') throw new Error('KNOWLEDGE_PROPOSAL_NOT_PENDING_REVIEW');
  const base = { ...proposal, status: decision, reviewNotes: [...proposal.reviewNotes, `${reviewer}: ${note}`] } as KnowledgeChangeProposal;
  return decision === 'approved' ? { ...base, approvedBy: reviewer, approvedAt: now } : base;
}

export function publishKnowledgeRelease(input: {
  version: string;
  approvedProposals: KnowledgeChangeProposal[];
  existingClaimIds?: string[];
  createdBy: string;
  notes?: string[];
  now?: string;
}): KnowledgeRelease {
  if (!input.approvedProposals.length || input.approvedProposals.some((proposal) => proposal.status !== 'approved')) throw new Error('ONLY_APPROVED_PROPOSALS_CAN_BE_PUBLISHED');
  const claimIds = new Set(input.existingClaimIds ?? seedKnowledgeClaims.filter((claim) => claim.reviewStatus === 'verified').map((claim) => claim.id));
  const sourceSnapshotIds = new Set<string>();
  for (const proposal of input.approvedProposals) {
    proposal.sourceSnapshotIds.forEach((id) => sourceSnapshotIds.add(id));
    proposal.supersededClaimIds.forEach((id) => claimIds.delete(id));
    [...proposal.newClaims, ...proposal.changedClaims].forEach((claim) => claimIds.add(claim.id));
  }
  const payload = { version: input.version, claimIds: [...claimIds].sort(), sourceSnapshotIds: [...sourceSnapshotIds].sort(), proposalIds: input.approvedProposals.map((proposal) => proposal.id).sort() };
  return {
    id: `KREL-${stableHash(canonical(payload))}`,
    version: input.version,
    createdAt: input.now ?? new Date().toISOString(),
    createdBy: input.createdBy,
    status: 'approved',
    claimIds: payload.claimIds,
    sourceSnapshotIds: payload.sourceSnapshotIds,
    proposalIds: payload.proposalIds,
    checksum: `SHA-${stableHash(canonical(payload))}`,
    notes: [...(input.notes ?? [])],
  };
}

export function assessKnowledgeMeshCoverage(connectors: KnowledgeRepositoryConnector[] = knowledgeRepositoryConnectors, now = new Date()): KnowledgeMeshCoverage {
  const categories: Record<string, number> = {};
  const uses: Record<string, number> = {};
  const trustTiers: Record<string, number> = {};
  const sourceFamilies: Record<string, number> = {};
  const refreshDue: string[] = [];
  for (const connector of connectors) {
    connector.categories.forEach((category) => { categories[category] = (categories[category] ?? 0) + 1; });
    connector.contentUses.forEach((use) => { uses[use] = (uses[use] ?? 0) + 1; });
    trustTiers[`tier-${connector.trustTier}`] = (trustTiers[`tier-${connector.trustTier}`] ?? 0) + 1;
    connector.sourceFamilyIds.forEach((id) => { sourceFamilies[id] = (sourceFamilies[id] ?? 0) + 1; });
    if (connector.lifecycleStatus === 'approved' && connector.refreshCadenceDays <= 14) refreshDue.push(connector.id);
  }
  return {
    generatedAt: now.toISOString(),
    connectors: connectors.length,
    approvedConnectors: connectors.filter((item) => item.lifecycleStatus === 'approved').length,
    discoveryOnlyConnectors: connectors.filter((item) => item.lifecycleStatus === 'discovery-only').length,
    categories,
    uses,
    trustTiers,
    sourceFamilies,
    licenseReviewRequired: connectors.filter((item) => item.license.reviewStatus === 'requires-review').length,
    refreshDue: refreshDue.sort(),
  };
}
