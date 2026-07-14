import type { ArchitectureStage, BrainSignalInputFinding } from './types.js';

export interface KernelFindingLike {
  id?: string;
  kind: string;
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  objectId?: string;
  confidence?: number;
  evidenceIds?: string[];
}

export function fromKernelFinding(
  projectId: string,
  stage: ArchitectureStage,
  finding: KernelFindingLike,
): BrainSignalInputFinding {
  return {
    ...(finding.id ? { id: finding.id } : {}),
    projectId,
    stage,
    ...(finding.objectId ? { objectId: finding.objectId } : {}),
    source: `kernel:${finding.kind}`,
    sourceType: 'deterministic',
    severity: finding.severity === 'critical' ? 'blocker' : finding.severity === 'warning' ? 'warning' : 'hint',
    confidence: finding.confidence ?? 0.9,
    title: finding.title,
    message: finding.message,
    evidence: (finding.evidenceIds ?? []).map((id) => ({ id, title: id, sourceType: 'review-check' })),
    tags: [finding.kind],
  };
}

export interface LlmCritiqueLike {
  summary: string;
  confidence?: number;
  recommendations?: Array<{ title: string; message: string; action?: string }>;
}

export function fromLlmCritique(
  projectId: string,
  stage: ArchitectureStage,
  critique: LlmCritiqueLike,
): BrainSignalInputFinding[] {
  return (critique.recommendations ?? []).map((rec, index) => ({
    id: `llm_critique_${index}`,
    projectId,
    stage,
    source: 'llm:co-architect-critique',
    sourceType: 'llm',
    severity: 'recommendation',
    confidence: critique.confidence ?? 0.7,
    title: rec.title,
    message: rec.message,
    ...(rec.action ? { recommendedAction: rec.action } : {}),
    tags: ['recommendation', 'co-architect'],
  }));
}
