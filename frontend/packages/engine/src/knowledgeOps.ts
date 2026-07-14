import type { KnowledgeLibrary } from '@aiw/domain';
import { detectContradictionsV2, libraryClaimGraph, type AtomicClaim, type ContradictionV2 } from './claimAssembly.js';

// =============================================================================
// KNOWLEDGE OPERATIONS (Sprint 8.8.0) — the work-queue substrate behind the
// Knowledge Ops console. Pure functions: queues are DERIVED from governed
// state, decisions are RECORDED as events, and nothing here mutates knowledge
// directly — promotion still flows through the release manager and canPromote.
// =============================================================================

export interface ClaimReviewItem {
  claimId: string;
  subjectId: string;
  subjectName: string;
  claimType: string;
  predicate: string;
  summary: string;
  reviewStatus: AtomicClaim['reviewStatus'];
  evidence: string[];
  suggestedReviewerRole: 'knowledge-curator' | 'architecture-reviewer' | 'security-reviewer' | 'compliance-reviewer';
}

export interface ClaimReviewDecision {
  claimId: string;
  decision: 'approve' | 'reject' | 'request-changes';
  reviewer: string;             // named human — never empty
  rationale: string;
  conditionsAdded?: string[] | undefined;
  decidedAt: string;
}

export interface ContradictionTriageItem extends ContradictionV2 { triageStatus: 'open'; }

export interface ContradictionTriageDecision {
  subjectId: string;
  predicate: string;
  resolution: 'context-split' | 'source-conflict' | 'outdated-claim' | 'escalate-expert';
  conditionsA?: string[] | undefined;   // context-split: conditions attached to each side
  conditionsB?: string[] | undefined;
  reviewer: string;
  rationale: string;
  decidedAt: string;
}

export interface SourceRefreshItem {
  sourceId: string;
  title: string;
  status: string;
  lastReviewedAt: string | null;
  cadenceDays: number;
  overdueDays: number;
}

const roleFor = (claimType: string): ClaimReviewItem['suggestedReviewerRole'] =>
  /security/i.test(claimType) ? 'security-reviewer'
  : /compliance|obligation/i.test(claimType) ? 'compliance-reviewer'
  : /quality-impact|applicability|avoidance/i.test(claimType) ? 'architecture-reviewer'
  : 'knowledge-curator';

/** Claims awaiting review, derived live from the library's claim graph. */
export function buildClaimReviewQueue(library: KnowledgeLibrary, extraClaims: AtomicClaim[] = []): ClaimReviewItem[] {
  const { claims } = libraryClaimGraph(library);
  return [...claims, ...extraClaims]
    .filter((claim) => claim.reviewStatus === 'candidate')
    .map((claim) => ({
      claimId: claim.claimId, subjectId: claim.subjectId, subjectName: claim.subjectName,
      claimType: claim.claimType, predicate: claim.predicate, summary: claim.object,
      reviewStatus: claim.reviewStatus, evidence: claim.evidence,
      suggestedReviewerRole: roleFor(claim.claimType),
    }));
}

/** Open contradictions demanding triage — v2 detection, context-split doctrine. */
export function buildContradictionQueue(library: KnowledgeLibrary, extraClaims: AtomicClaim[] = []): ContradictionTriageItem[] {
  const { claims } = libraryClaimGraph(library);
  return detectContradictionsV2([...claims, ...extraClaims]).map((item) => ({ ...item, triageStatus: 'open' as const }));
}

/** Validate a triage decision against doctrine before it is recorded. */
export function validateTriageDecision(decision: ContradictionTriageDecision): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!decision.reviewer || decision.reviewer.trim().length < 1) reasons.push('a named reviewer is required');
  if (!decision.rationale?.trim()) reasons.push('a rationale is required');
  if (decision.resolution === 'context-split' && !(decision.conditionsA?.length || decision.conditionsB?.length))
    reasons.push('context-split requires applicability conditions on at least one side — deleting a side is prohibited');
  return { valid: reasons.length === 0, reasons };
}

/** Sources whose refresh cadence has lapsed (registry-driven). */
export function buildSourceRefreshQueue(
  sources: Array<{ id: string; title?: string; status?: string; reviewedAt?: string; refreshCadenceDays?: number }>,
  now = new Date(),
): SourceRefreshItem[] {
  const out: SourceRefreshItem[] = [];
  for (const source of sources) {
    const cadence = source.refreshCadenceDays ?? 180;
    const last = source.reviewedAt ? new Date(source.reviewedAt) : null;
    const ageDays = last ? Math.floor((now.getTime() - last.getTime()) / 86_400_000) : Number.MAX_SAFE_INTEGER;
    if (ageDays > cadence) out.push({
      sourceId: source.id, title: source.title ?? source.id, status: source.status ?? 'unknown',
      lastReviewedAt: source.reviewedAt ?? null, cadenceDays: cadence,
      overdueDays: last ? ageDays - cadence : cadence,
    });
  }
  return out.sort((a, b) => b.overdueDays - a.overdueDays);
}
