import type {
  ArchitectureBrainProposalReceipt,
  ArchitectureBrainTransactionSummary,
} from '@aiw/domain';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function looksLikeReceipt(value: unknown): value is ArchitectureBrainProposalReceipt {
  if (!isRecord(value)) return false;
  return value.schemaVersion === '1.0'
    && typeof value.proposalId === 'string'
    && typeof value.task === 'string'
    && typeof value.projectId === 'string'
    && typeof value.branchId === 'string'
    && isRecord(value.graph)
    && isRecord(value.manifest)
    && isRecord(value.governance);
}

export function findArchitectureBrainReceipt(
  value: unknown,
  depth = 0,
): ArchitectureBrainProposalReceipt | null {
  if (depth > 4) return null;
  if (looksLikeReceipt(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 20)) {
      const receipt = findArchitectureBrainReceipt(item, depth + 1);
      if (receipt) return receipt;
    }
    return null;
  }
  if (!isRecord(value)) return null;
  if (looksLikeReceipt(value.brainReceipt)) return value.brainReceipt;
  const preferred = ['result', 'review', 'proposal', 'response', 'data', 'run'];
  for (const key of preferred) {
    const receipt = findArchitectureBrainReceipt(value[key], depth + 1);
    if (receipt) return receipt;
  }
  for (const item of Object.values(value).slice(0, 30)) {
    const receipt = findArchitectureBrainReceipt(item, depth + 1);
    if (receipt) return receipt;
  }
  return null;
}

function stringRef(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function extractExternalRefs(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const refs: Record<string, string> = {};
  const candidates: Array<[string, unknown]> = [
    ['resultId', value.id],
    ['runId', isRecord(value.run) ? value.run.id : value.runId],
    ['reviewId', isRecord(value.review) ? value.review.id : value.reviewId],
    ['systemNodeRef', value.systemNodeRef],
    ['materializedFingerprint', isRecord(value.materializationReceipt) ? value.materializationReceipt.materializedFingerprint : undefined],
    ['migrationFingerprint', isRecord(value.migrationReceipt) ? value.migrationReceipt.migratedGraphFingerprint : undefined],
  ];
  for (const [key, candidate] of candidates) {
    const text = stringRef(candidate);
    if (text) refs[key] = text;
  }
  return refs;
}

const titles: Record<string, string> = {
  'design-graph-projection': 'Canonical Design Graph proposal',
  'requirements-distillation': 'Requirements and journey proposal',
  'system-context-composition': 'System Context composition proposal',
  'design-brief-analysis': 'Design brief analysis',
  'stage-field-drafting': 'Stage co-author proposal',
  'living-canvas-actions': 'Living Canvas architecture action',
  'explain-or-challenge': 'Sol architecture explanation or challenge',
  'design-ranking-explanation': 'Architecture ranking explanation',
  'stage-guidance': 'Architecture stage guidance',
  'architecture-synthesis': 'Candidate architecture synthesis',
  'architecture-review': 'Architecture review',
  'assisted-audit': 'Assisted architecture audit',
  'workspace-projection': 'Architecture workspace projection',
};

export function summarizeArchitectureBrainResponse(
  receipt: ArchitectureBrainProposalReceipt,
  response: unknown,
): ArchitectureBrainTransactionSummary {
  const warningCount = receipt.warnings.length;
  const quality = receipt.quality;
  const description = quality
    ? `${quality.status} quality posture at ${quality.score}/100; ${warningCount} warning(s).`
    : `${receipt.deterministicRules.length} deterministic rule(s), ${receipt.knowledgeRefs.length} knowledge reference(s), ${warningCount} warning(s).`;
  return {
    title: titles[receipt.task] ?? receipt.task,
    description,
    externalRefs: extractExternalRefs(response),
    warningCount,
    knowledgeRefCount: receipt.knowledgeRefs.length,
    llmUsed: receipt.llm.used,
  };
}

export function parseJsonResponsePayload(payload: unknown): unknown {
  if (typeof payload === 'string') {
    if (payload.length > 4 * 1024 * 1024) return null;
    try { return JSON.parse(payload); } catch { return null; }
  }
  if (Buffer.isBuffer(payload)) {
    if (payload.byteLength > 4 * 1024 * 1024) return null;
    try { return JSON.parse(payload.toString('utf8')); } catch { return null; }
  }
  return isRecord(payload) || Array.isArray(payload) ? payload : null;
}
