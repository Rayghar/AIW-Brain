import type { KnowledgePackActivationPolicy, SignedKnowledgePackManifest } from '@aiw/domain';
import { referenceChecksum, verifyKnowledgePackActivation } from './mindFactory.js';

export interface AiwKpackEnvelope {
  envelopeVersion: 'aiw-kpack/v1';
  fileName: string;
  mimeType: 'application/vnd.aiw.knowledge-pack+json';
  createdAt: string;
  createdBy: string;
  tenantId?: string;
  projectId?: string;
  manifest: SignedKnowledgePackManifest;
  payload: {
    manifestJson: string;
    checksum: string;
    extension: '.aiw-kpack';
  };
  activation: {
    requiresSignature: true;
    requiresTenantPolicy: true;
    candidateKnowledgeBlocked: true;
    humanPromotionRequired: true;
  };
}

export interface AiwKpackImportResult {
  status: 'accepted' | 'rejected';
  releaseId?: string;
  packId?: string;
  checksum?: string;
  reasons: string[];
  activationPreview?: KnowledgePackActivationPolicy;
}

export interface ReleaseActivationScreenModel {
  title: string;
  currentTenantId: string;
  currentProjectId?: string;
  activeReleaseId?: string;
  availablePacks: Array<{ packId: string; releaseId: string; signed: boolean; fileName: string }>;
  persistedActivations: Array<{ tenantId: string; projectId?: string; releaseId: string; packId: string; pinStatus?: string }>;
  actions: string[];
  safeguards: string[];
}

export function createAiwKpackEnvelope(input: { manifest: SignedKnowledgePackManifest; createdBy: string; tenantId?: string; projectId?: string }): AiwKpackEnvelope {
  const manifestJson = JSON.stringify(input.manifest, null, 2);
  const checksum = referenceChecksum(manifestJson);
  return {
    envelopeVersion: 'aiw-kpack/v1',
    fileName: `${input.manifest.releaseId}.${input.manifest.packId}.aiw-kpack`,
    mimeType: 'application/vnd.aiw.knowledge-pack+json',
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    ...(input.projectId ? { projectId: input.projectId } : {}),
    manifest: input.manifest,
    payload: { manifestJson, checksum, extension: '.aiw-kpack' },
    activation: { requiresSignature: true, requiresTenantPolicy: true, candidateKnowledgeBlocked: true, humanPromotionRequired: true },
  };
}

export function verifyAiwKpackEnvelope(input: { envelope?: unknown; tenantId: string; projectId?: string; activatedBy: string }): AiwKpackImportResult {
  const envelope = input.envelope as Partial<AiwKpackEnvelope> | undefined;
  const reasons: string[] = [];
  if (!envelope || envelope.envelopeVersion !== 'aiw-kpack/v1') reasons.push('Envelope version must be aiw-kpack/v1.');
  if (!envelope?.manifest) reasons.push('Envelope must include a signed knowledge-pack manifest.');
  if (!envelope?.payload?.manifestJson || !envelope?.payload?.checksum) reasons.push('Envelope payload must include manifest JSON and checksum.');
  if (envelope?.payload?.manifestJson && envelope?.payload?.checksum && referenceChecksum(envelope.payload.manifestJson) !== envelope.payload.checksum) reasons.push('Envelope checksum does not match manifest JSON.');
  if (envelope?.manifest && envelope.payload?.manifestJson) {
    const parsed = JSON.parse(envelope.payload.manifestJson) as SignedKnowledgePackManifest;
    if (parsed.packId !== envelope.manifest.packId || parsed.releaseId !== envelope.manifest.releaseId) reasons.push('Envelope manifest object and manifestJson disagree.');
  }
  if (reasons.length || !envelope?.manifest) return { status: 'rejected', reasons };
  const activation = verifyKnowledgePackActivation(envelope.manifest);
  if (activation.status === 'rejected') return { status: 'rejected', ...(activation.releaseId ? { releaseId: activation.releaseId } : {}), reasons: [...reasons, ...activation.reasons] };
  return {
    status: 'accepted',
    releaseId: envelope.manifest.releaseId,
    packId: envelope.manifest.packId,
    ...(envelope.payload?.checksum ? { checksum: envelope.payload.checksum } : {}),
    reasons: ['Envelope verified. Activation remains tenant/project scoped and human-approved.'],
    activationPreview: {
      tenantId: input.tenantId,
      ...(input.projectId ? { projectId: input.projectId } : {}),
      releaseId: envelope.manifest.releaseId,
      packId: envelope.manifest.packId,
      activatedBy: input.activatedBy,
      activatedAt: new Date().toISOString(),
      activationMode: 'enterprise-tenant',
      checks: [
        { checkId: 'envelope-version', ok: true, detail: 'aiw-kpack/v1' },
        { checkId: 'checksum', ok: true, detail: envelope.payload?.checksum ?? 'verified' },
        { checkId: 'manifest-signature', ok: true, detail: 'signature present' },
        { checkId: 'candidate-knowledge', ok: true, detail: 'candidate knowledge remains blocked until promotion' },
      ],
      pinned: false,
    },
  };
}

export function buildReleaseActivationScreen(input: { tenantId: string; projectId?: string; exports: SignedKnowledgePackManifest[]; persistedActivations: Array<{ tenantId: string; projectId?: string; releaseId: string; packId: string; pinStatus?: string }> }): ReleaseActivationScreenModel {
  const active = input.persistedActivations.find((record) => record.tenantId === input.tenantId && (!input.projectId || record.projectId === input.projectId));
  return {
    title: 'Knowledge Pack Activation',
    currentTenantId: input.tenantId,
    ...(input.projectId ? { currentProjectId: input.projectId } : {}),
    ...(active?.releaseId ? { activeReleaseId: active.releaseId } : {}),
    availablePacks: input.exports.map((manifest) => ({ packId: manifest.packId, releaseId: manifest.releaseId, signed: Boolean(manifest.signature?.value), fileName: `${manifest.releaseId}.${manifest.packId}.aiw-kpack` })),
    persistedActivations: input.persistedActivations,
    actions: ['export-aiw-kpack', 'import-aiw-kpack', 'verify-signature', 'activate-for-tenant', 'pin-to-project', 'rollback-to-previous-release'],
    safeguards: ['unsigned packs cannot activate', 'candidate knowledge is non-scoring', 'activation is tenant/project scoped', 'all actions are audit logged'],
  };
}
