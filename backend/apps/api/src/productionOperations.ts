import { AIW_RELEASE } from '@aiw/domain';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createKnowledgeObjectStore, type KnowledgeObjectStore } from './knowledgeObjectStore.js';

export interface EvidenceRecord {
  id: string; tenantId: string; projectId?: string; evidenceType: string; title: string;
  objectKey: string; objectUri: string; sha256: string; mediaType: string; sizeBytes: number;
  capturedAt: string; expiresAt?: string; status: 'active' | 'expired' | 'deleted'; metadata: Record<string, unknown>;
}
export interface EnvironmentPromotion {
  id: string; tenantId: string; sourceEnvironment: string; targetEnvironment: string; releaseVersion: string;
  pinnedKnowledgeReleaseId: string; requestedBy: string; status: 'requested' | 'blocked' | 'approved' | 'promoted' | 'rejected';
  mandatoryBlockers: string[]; acceptanceReport: Record<string, unknown>; createdAt: string; updatedAt: string;
}
interface ProductionState { schemaVersion: 1; evidence: EvidenceRecord[]; promotions: EnvironmentPromotion[]; }

function bytes(value: string): Uint8Array { return new TextEncoder().encode(value); }
function safeSegment(value: string): string { return value.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120); }

export class ProductionOperationsRepository {
  private loaded = false;
  private state: ProductionState = { schemaVersion: 1, evidence: [], promotions: [] };
  private writeChain: Promise<void> = Promise.resolve();
  constructor(private readonly stateFile = process.env.AIW_PRODUCTION_STATE_FILE || resolve(process.cwd(), '.aiw-runtime/production-operations.json'), private readonly objectStore: KnowledgeObjectStore = createKnowledgeObjectStore()) {}
  private async load() { if (this.loaded) return; this.loaded = true; try { this.state = JSON.parse(await readFile(this.stateFile, 'utf8')) as ProductionState; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; } }
  private async save() { const snapshot = JSON.stringify(this.state, null, 2); this.writeChain = this.writeChain.then(async () => { await mkdir(dirname(this.stateFile), { recursive: true }); const tmp = `${this.stateFile}.${process.pid}.tmp`; await writeFile(tmp, snapshot); await rename(tmp, this.stateFile); }); await this.writeChain; }

  async putEvidence(input: { tenantId: string; projectId?: string; evidenceType: string; title: string; contentBase64?: string; contentText?: string; mediaType?: string; expiresAt?: string; metadata?: Record<string, unknown> }): Promise<EvidenceRecord> {
    await this.load();
    if (!input.contentBase64 && input.contentText === undefined) throw new Error('EVIDENCE_CONTENT_REQUIRED');
    const content = input.contentBase64 ? new Uint8Array(Buffer.from(input.contentBase64, 'base64')) : bytes(input.contentText ?? '');
    if (content.byteLength > Number(process.env.AIW_EVIDENCE_MAX_BYTES || 10 * 1024 * 1024)) throw new Error('EVIDENCE_TOO_LARGE');
    const id = randomUUID(); const capturedAt = new Date().toISOString();
    const objectKey = `evidence/${safeSegment(input.tenantId)}/${safeSegment(input.projectId ?? 'tenant')}/${id}`;
    const stored = await this.objectStore.put(objectKey, content, input.mediaType ?? 'application/octet-stream');
    const record: EvidenceRecord = { id, tenantId: input.tenantId, ...(input.projectId ? { projectId: input.projectId } : {}), evidenceType: input.evidenceType, title: input.title, objectKey, objectUri: stored.uri, sha256: stored.sha256, mediaType: stored.mediaType, sizeBytes: stored.sizeBytes, capturedAt, ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}), status: 'active', metadata: input.metadata ?? {} };
    this.state.evidence.push(record); await this.save(); return structuredClone(record);
  }
  async listEvidence(tenantId: string, projectId?: string): Promise<EvidenceRecord[]> { await this.load(); await this.expireEvidence(); return this.state.evidence.filter((item) => item.tenantId === tenantId && (!projectId || item.projectId === projectId)).map((item) => structuredClone(item)); }
  async getEvidence(tenantId: string, id: string): Promise<{ record: EvidenceRecord; content: Uint8Array } | undefined> { await this.load(); const record = this.state.evidence.find((item) => item.id === id && item.tenantId === tenantId && item.status !== 'deleted'); if (!record) return undefined; return { record: structuredClone(record), content: await this.objectStore.get(record.objectKey) }; }
  async expireEvidence(now = new Date()): Promise<number> { await this.load(); let changed = 0; for (const item of this.state.evidence) if (item.status === 'active' && item.expiresAt && Date.parse(item.expiresAt) <= now.getTime()) { item.status = 'expired'; changed += 1; } if (changed) await this.save(); return changed; }
  async deleteEvidence(tenantId: string, id: string): Promise<EvidenceRecord> { await this.load(); const record = this.state.evidence.find((item) => item.id === id && item.tenantId === tenantId); if (!record) throw new Error('EVIDENCE_NOT_FOUND'); await this.objectStore.delete(record.objectKey); record.status = 'deleted'; await this.save(); return structuredClone(record); }

  async requestPromotion(input: { tenantId: string; sourceEnvironment: string; targetEnvironment: string; releaseVersion: string; pinnedKnowledgeReleaseId: string; requestedBy: string; mandatoryBlockers?: string[]; acceptanceReport?: Record<string, unknown> }): Promise<EnvironmentPromotion> {
    await this.load(); const now = new Date().toISOString(); const blockers = [...new Set(input.mandatoryBlockers ?? [])];
    if (input.targetEnvironment === 'production') {
      if (!input.pinnedKnowledgeReleaseId) blockers.push('PINNED_KNOWLEDGE_RELEASE_REQUIRED');
      if (input.releaseVersion !== AIW_RELEASE.version) blockers.push('RELEASE_VERSION_NOT_CURRENT');
      const accepted = input.acceptanceReport?.productionAccepted === true;
      if (!accepted) blockers.push('PRODUCTION_ACCEPTANCE_NOT_VERIFIED');
    }
    const promotion: EnvironmentPromotion = { id: randomUUID(), tenantId: input.tenantId, sourceEnvironment: input.sourceEnvironment, targetEnvironment: input.targetEnvironment, releaseVersion: input.releaseVersion, pinnedKnowledgeReleaseId: input.pinnedKnowledgeReleaseId, requestedBy: input.requestedBy, status: blockers.length ? 'blocked' : 'approved', mandatoryBlockers: blockers, acceptanceReport: input.acceptanceReport ?? {}, createdAt: now, updatedAt: now };
    this.state.promotions.push(promotion); await this.save(); return structuredClone(promotion);
  }
  async listPromotions(tenantId: string): Promise<EnvironmentPromotion[]> { await this.load(); return this.state.promotions.filter((item) => item.tenantId === tenantId).map((item) => structuredClone(item)); }
  async promote(tenantId: string, id: string): Promise<EnvironmentPromotion> { await this.load(); const item = this.state.promotions.find((promotion) => promotion.id === id && promotion.tenantId === tenantId); if (!item) throw new Error('PROMOTION_NOT_FOUND'); if (item.mandatoryBlockers.length || item.status !== 'approved') throw new Error('PROMOTION_BLOCKED'); item.status = 'promoted'; item.updatedAt = new Date().toISOString(); await this.save(); return structuredClone(item); }
  async health() { const objectStore = await this.objectStore.health(); return { stateStore: this.stateFile, stateSha256: createHash('sha256').update(JSON.stringify(this.state)).digest('hex'), objectStore }; }
}
