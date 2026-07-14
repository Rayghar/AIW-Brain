import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { KnowledgeLibrary } from '@aiw/domain';
import {
  buildRecordDraftPrompt,
  sanitizeDraftedRecord,
  canPromote,
  evaluateRecordCompleteness,
  type GovernancePolicy,
  type RecordDraftRequest,
  type DraftedRecordResult,
} from '@aiw/engine';
import type { LlmGateway } from './llmGateway.js';

// -----------------------------------------------------------------------------
// Knowledge promotion (Sprint 8.3) — the bridge between the mesh and the
// governed library, LLM-accelerated and human-gated:
//   draft   → the LLM assembles a CANDIDATE record + reviewer brief from
//             quarantined evidence and claim candidates (never persisted here),
//   check   → mechanical canPromote evaluation for any record,
//   promote → a NAMED human owner stamps the record; 'approved' requires the
//             full gate, 'reviewed' requires completeness. Persistence to the
//             bundled library file happens ONLY when AIW_LIBRARY_WRITE=filesystem
//             (a deliberate dev/ops flag) — otherwise the stamped record is
//             returned for the caller's own persistence pipeline.
// -----------------------------------------------------------------------------

const governancePath = process.env.AIW_GOVERNANCE_PATH
  ?? fileURLToPath(new URL('../../../data/knowledge-governance.json', import.meta.url));
const libraryWritePath = process.env.AIW_LIBRARY_PATH
  ?? fileURLToPath(new URL('../../../data/knowledge-library.json', import.meta.url));

export async function loadGovernancePolicy(): Promise<GovernancePolicy> {
  return JSON.parse(await readFile(governancePath, 'utf8')) as GovernancePolicy;
}

export interface DraftRecordResponse {
  available: boolean;
  degradedReason?: string;
  draft?: DraftedRecordResult;
  gate?: { allowed: boolean; reasons: string[] };
}

export async function draftKnowledgeRecord(
  gateway: LlmGateway,
  request: RecordDraftRequest,
  library: KnowledgeLibrary,
): Promise<DraftRecordResponse> {
  const policy = await loadGovernancePolicy();
  const prompt = buildRecordDraftPrompt(request, policy, library);
  try {
    const execution = await gateway.generateJson<unknown>({
      purpose: prompt.purpose,
      system: prompt.system,
      user: prompt.user,
      schemaName: prompt.schemaName,
      dataClassification: 'internal',
      jsonSchema: {
        type: 'object',
        additionalProperties: false,
        required: ['record', 'reviewerBrief'],
        properties: {
          record: {
            type: 'object',
            required: ['id', 'name', 'recordType', 'status', 'owner', 'version'],
            properties: {
              id: { type: 'string', minLength: 1 },
              name: { type: 'string', minLength: 1, maxLength: 80 },
              recordType: { type: 'string', enum: ['architectureStyle', 'pattern'] },
              status: { type: 'string', enum: ['candidate'] },
              owner: { type: 'string', enum: [''] },
              version: { type: 'string', minLength: 1, maxLength: 12 },
              evidence: { type: 'array', items: { type: 'string', enum: request.evidence.map((item) => item.id) } },
            },
            additionalProperties: true,
          },
          reviewerBrief: {
            type: 'object', additionalProperties: false,
            required: ['completenessGaps', 'contradictions', 'promotionRecommendation'],
            properties: {
              completenessGaps: { type: 'array', maxItems: 5, items: { type: 'string', maxLength: 200 } },
              contradictions: { type: 'array', maxItems: 3, items: { type: 'string', maxLength: 200 } },
              promotionRecommendation: { type: 'string', maxLength: 240 },
            },
          },
        },
      },
    });
    const draft = sanitizeDraftedRecord(execution.value, request, policy);
    const gate = canPromote(draft.record as { id: string; recordType?: string }, policy);
    return { available: true, draft, gate };
  } catch (error) {
    return { available: false, degradedReason: error instanceof Error ? error.message : 'LLM_UNAVAILABLE' };
  }
}

export interface PromotionRequest {
  record: Record<string, unknown> & { id: string; recordType?: string };
  owner: string;
  targetStatus: 'reviewed' | 'approved';
}

export interface PromotionResponse {
  allowed: boolean;
  reasons: string[];
  persisted: boolean;
  record?: Record<string, unknown>;
}

export async function promoteKnowledgeRecord(request: PromotionRequest): Promise<PromotionResponse> {
  const policy = await loadGovernancePolicy();
  const reasons: string[] = [];
  if (!request.owner || request.owner.trim().length < 2) reasons.push('a named human owner is required for promotion');

  if (request.targetStatus === 'approved') {
    const gate = canPromote(request.record, policy);
    reasons.push(...gate.reasons);
  } else {
    const completeness = evaluateRecordCompleteness(request.record, policy);
    if (!completeness.complete) reasons.push(`incomplete for review: missing ${completeness.missing.join(', ')}`);
  }
  if (reasons.length) return { allowed: false, reasons, persisted: false };

  const stamped = {
    ...request.record,
    status: request.targetStatus,
    owner: request.owner.trim(),
    reviewedAt: new Date().toISOString(),
  };

  if (process.env.AIW_LIBRARY_WRITE !== 'filesystem') {
    return { allowed: true, reasons: [], persisted: false, record: stamped };
  }

  const library = JSON.parse(await readFile(libraryWritePath, 'utf8')) as KnowledgeLibrary & Record<string, unknown>;
  const collection = stamped.recordType === 'architectureStyle' ? library.architectureStyles : library.patterns;
  const records = collection as unknown as Array<Record<string, unknown> & { id: string }>;
  const index = records.findIndex((item) => item.id === stamped.id);
  if (index >= 0) records[index] = stamped as never;
  else records.push(stamped as never);
  await writeFile(libraryWritePath, JSON.stringify(library, null, 2));
  return { allowed: true, reasons: [], persisted: true, record: stamped };
}
