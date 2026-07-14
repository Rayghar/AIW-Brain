import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type {
  GenerativeLifecycleStage,
  GenerativeAuthorityClass,
  LlmCoCreationTrace,
  MindFactoryFeedbackKind,
  MindFactoryFeedbackReceipt,
  MindFactoryFeedbackStatus,
} from '@aiw/domain';

export interface RecordLivingCanvasFeedbackInput {
  tenantId: string;
  projectId: string;
  branchId: string;
  stage: GenerativeLifecycleStage;
  feedbackKind?: MindFactoryFeedbackKind;
  actionSemanticKey: string;
  actionLabel?: string;
  authorityClass: GenerativeAuthorityClass;
  outcome: MindFactoryFeedbackReceipt['outcome'];
  reason?: string;
  topic?: string;
  suggestedSourceType?: string;
  citedRecordIds: string[];
  knowledgeReleaseId: string;
  modelTrace?: LlmCoCreationTrace;
}

export interface TriageLivingCanvasFeedbackInput {
  tenantId: string;
  receiptId: string;
  status: Extract<MindFactoryFeedbackStatus, 'under-review' | 'converted-to-candidate' | 'dismissed'>;
  curator: string;
  curationNote: string;
}

interface StoredFeedback {
  version: '1.0';
  receipts: MindFactoryFeedbackReceipt[];
}

function feedbackStorePath(): string {
  return resolve(process.env.AIW_LIVING_CANVAS_FEEDBACK_PATH ?? 'data/local/living-canvas-feedback.json');
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class LivingCanvasFeedbackStore {
  private loaded = false;
  private receipts: MindFactoryFeedbackReceipt[] = [];

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const parsed = JSON.parse(readFileSync(feedbackStorePath(), 'utf8')) as Partial<StoredFeedback>;
      this.receipts = Array.isArray(parsed.receipts) ? parsed.receipts : [];
    } catch {
      this.receipts = [];
    }
  }

  private persist(): void {
    const path = feedbackStorePath();
    mkdirSync(dirname(path), { recursive: true });
    const payload: StoredFeedback = { version: '1.0', receipts: this.receipts.slice(0, 10_000) };
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  }

  record(input: RecordLivingCanvasFeedbackInput): MindFactoryFeedbackReceipt {
    this.load();
    if ((input.feedbackKind ?? 'proposal-outcome') === 'knowledge-gap') {
      const existing = this.receipts.find((item) =>
        item.tenantId === input.tenantId
        && item.projectId === input.projectId
        && item.branchId === input.branchId
        && item.actionSemanticKey === input.actionSemanticKey
        && item.knowledgeReleaseId === input.knowledgeReleaseId
        && item.status !== 'dismissed',
      );
      if (existing) return clone(existing);
    }
    const receipt: MindFactoryFeedbackReceipt = {
      id: `mind-feedback-${randomUUID()}`,
      tenantId: input.tenantId,
      projectId: input.projectId,
      branchId: input.branchId,
      stage: input.stage,
      feedbackKind: input.feedbackKind ?? 'proposal-outcome',
      actionSemanticKey: input.actionSemanticKey,
      ...(input.actionLabel ? { actionLabel: input.actionLabel.slice(0, 240) } : {}),
      authorityClass: input.authorityClass,
      outcome: input.outcome,
      ...(input.reason ? { reason: input.reason.slice(0, 2000) } : {}),
      ...(input.topic ? { topic: input.topic.slice(0, 240) } : {}),
      ...(input.suggestedSourceType ? { suggestedSourceType: input.suggestedSourceType.slice(0, 160) } : {}),
      citedRecordIds: [...new Set(input.citedRecordIds)].slice(0, 30),
      knowledgeReleaseId: input.knowledgeReleaseId,
      ...(input.modelTrace ? { modelTrace: clone(input.modelTrace) } : {}),
      status: input.feedbackKind === 'knowledge-gap' || input.authorityClass === 'llm-proposed' ? 'queued-for-curation' : 'recorded',
      createdAt: new Date().toISOString(),
    };
    this.receipts.unshift(receipt);
    this.receipts = this.receipts.slice(0, 10_000);
    this.persist();
    return clone(receipt);
  }

  list(tenantId: string, limit = 100, status?: MindFactoryFeedbackStatus): MindFactoryFeedbackReceipt[] {
    this.load();
    return this.receipts
      .filter((item) => item.tenantId === tenantId && (!status || item.status === status))
      .slice(0, Math.max(1, Math.min(500, limit)))
      .map((item) => clone(item));
  }

  triage(input: TriageLivingCanvasFeedbackInput): MindFactoryFeedbackReceipt | null {
    this.load();
    const index = this.receipts.findIndex((item) => item.tenantId === input.tenantId && item.id === input.receiptId);
    if (index < 0) return null;
    const current = this.receipts[index]!;
    const updated: MindFactoryFeedbackReceipt = {
      ...current,
      status: input.status,
      curator: input.curator.slice(0, 240),
      curationNote: input.curationNote.slice(0, 2000),
      reviewedAt: new Date().toISOString(),
    };
    this.receipts[index] = updated;
    this.persist();
    return clone(updated);
  }

  clearForTests(): void {
    this.loaded = true;
    this.receipts = [];
  }
}

export const livingCanvasFeedbackStore = new LivingCanvasFeedbackStore();
