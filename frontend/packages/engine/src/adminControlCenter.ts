import type { KnowledgeLibrary } from '@aiw/domain';
import { buildClaimReviewQueue, buildContradictionQueue, buildSourceRefreshQueue } from './knowledgeOps.js';

// Admin Control Center (Sprint 8.8.0): the executive summary model answering
// "is AIW safe, current, governed, and ready to advise users?" — derived, not
// stored; the API layer adds runtime/LLM/acceptance posture from environment.

export interface AdminSummary {
  knowledge: {
    releaseId: string;
    recordCount: number;
    productionAttributes: number;
    draftAttributes: number;
    pendingClaimReviews: number;
    openContradictions: number;
    overdueSourceRefreshes: number;
    flagshipImpactsCurated: number;
    impactStubsRemaining: number;
  };
  postureQuestions: string[];   // the questions this dashboard exists to answer
}

export function buildAdminSummary(
  library: KnowledgeLibrary,
  sources: Array<{ id: string; title?: string; status?: string; reviewedAt?: string; refreshCadenceDays?: number }>,
): AdminSummary {
  const attributes = library.qualityAttributes as Array<{ calibrationStatus?: string }>;
  const patterns = library.patterns as Array<{ qualityAttributeImpact?: Record<string, number>; impactProvenance?: string }>;
  return {
    knowledge: {
      releaseId: (library as { knowledgeReleaseId?: string }).knowledgeReleaseId ?? 'AKR-unversioned',
      recordCount: library.architectureStyles.length + library.patterns.length,
      productionAttributes: attributes.filter((a) => a.calibrationStatus === 'production').length,
      draftAttributes: attributes.filter((a) => a.calibrationStatus !== 'production').length,
      pendingClaimReviews: buildClaimReviewQueue(library).length,
      openContradictions: buildContradictionQueue(library).length,
      overdueSourceRefreshes: buildSourceRefreshQueue(sources).length,
      flagshipImpactsCurated: patterns.filter((p) => p.impactProvenance).length,
      impactStubsRemaining: patterns.filter((p) => { const q = p.qualityAttributeImpact ?? {}; return Object.keys(q).length === 1 && q.modifiability === 1; }).length,
    },
    postureQuestions: [
      'Which sources power recommendations, and are any overdue for refresh?',
      'How many candidate claims await a named reviewer?',
      'Are there unresolved contradictions demanding context splits?',
      'Which attributes are production-calibrated vs draft?',
      'Can this knowledge release be reproduced and rolled back?',
    ],
  };
}
