import type { KnowledgeLibrary } from '@aiw/domain';

// =============================================================================
// CLAIM ASSEMBLY — the knowledge spine (v0.9.9).
//
// Doctrine (Source Map / Mesh constitution): "a library record is assembled
// from many claims rather than one manually written description." This module
// makes that executable in both directions:
//
//   decomposeRecordToClaims()  record  -> atomic, individually traceable claims
//   assembleRecordFromClaims() claims  -> record fields with per-claim provenance
//   detectContradictions()     claims  -> pairs that demand a CONTEXT SPLIT
//                                         (never a silent winner)
//   corroborationFor()         claims  -> independent approved-source count for
//                                         any assertion that carries authority
//
// Rules encoded here, enforced by knowledgeGovernance + the CI gate:
//   * contradictions resolve into applicability conditions, never deletions;
//   * assertions that set ratings/prohibitions need >=2 independent
//     approved-posture sources OR a recorded internal architecture-board approval;
//   * every assembled field lists the claimIds that justify it.
// =============================================================================

export interface AtomicClaim {
  claimId: string;
  subjectId: string;          // record id (STYLE-*/PAT-*)
  subjectName: string;
  claimType: 'applicability' | 'avoidance' | 'obligation' | 'quality-impact' | 'conflict' | 'prerequisite' | 'risk' | 'mitigation';
  predicate: string;
  object: string;
  polarity: 'supports' | 'opposes' | 'conditional';
  conditions: string[];
  evidence: string[];         // source/evidence ids
  reviewStatus: 'candidate' | 'approved' | 'rejected';
  /** A5: structured content; `object` remains the concise display summary. */
  payload?: { fullText: string; units?: string; range?: [number, number] } | undefined;
  /** A4: optional per-evidence source metadata for independence computation. */
  sourceMeta?: Record<string, { organization?: string; upstream?: string }> | undefined;
}

export interface Contradiction {
  subjectId: string;
  predicate: string;
  supporting: string[];       // claimIds
  opposing: string[];         // claimIds
  resolution: 'context-split-required';
  note: string;
}

type AnyRecord = Record<string, unknown> & { id: string; name?: string; recordType?: string };

const text = (value: unknown): string =>
  typeof value === 'string' ? value : String((value as { description?: string })?.description ?? value ?? '');

let seq = 0;
const cid = (subject: string, type: string) => `CLM-${subject}-${type}-${(seq += 1).toString(36)}`;

/** Decompose an existing library record into atomic, provenance-carrying claims. */
export function decomposeRecordToClaims(record: AnyRecord): AtomicClaim[] {
  seq = 0;
  const claims: AtomicClaim[] = [];
  const evidence = (Array.isArray(record.evidence) ? record.evidence : []).map(text).filter(Boolean);
  const status = record.status === 'approved' || record.status === 'reviewed' ? 'approved' : 'candidate';
  const base = { subjectId: record.id, subjectName: String(record.name ?? record.id), evidence, reviewStatus: status as AtomicClaim['reviewStatus'] };
  const push = (claimType: AtomicClaim['claimType'], predicate: string, object: string, polarity: AtomicClaim['polarity'] = 'supports', conditions: string[] = []) => {
    if (object.trim()) claims.push({ claimId: cid(record.id, claimType), ...base, claimType, predicate,
      object: object.slice(0, 300),            // concise display summary
      payload: { fullText: object },           // A5: structured payload preserves qualifiers
      polarity, conditions } as AtomicClaim);
  };

  if (record.whenToConsider) push('applicability', 'applies-when', text(record.whenToConsider));
  if (record.whenToAvoidOrQuestion) push('avoidance', 'question-when', text(record.whenToAvoidOrQuestion), 'opposes');
  for (const item of (Array.isArray(record.obligations) ? record.obligations : [])) push('obligation', 'obligates', text(item));
  for (const item of (Array.isArray(record.requires) ? record.requires : [])) push('prerequisite', 'requires', text(item));
  for (const item of (Array.isArray(record.conflictsWith) ? record.conflictsWith : [])) push('conflict', 'conflicts-with', text(item), 'opposes');
  for (const item of (Array.isArray(record.risks) ? record.risks : [])) push('risk', 'carries-risk', text(item), 'opposes');
  for (const item of (Array.isArray(record.mitigations) ? record.mitigations : [])) push('mitigation', 'mitigated-by', text(item));
  const ratings = (record.qualityAttributeRatings ?? record.qualityAttributeImpact ?? {}) as Record<string, unknown>;
  for (const [attribute, rating] of Object.entries(ratings)) {
    push('quality-impact', `impacts:${attribute}`, `rating ${String(rating)}`, Number(rating) >= 3 ? 'supports' : 'conditional');
  }
  return claims;
}

/** Assemble record fields from claims, carrying per-claim provenance on every field. */
export function assembleRecordFromClaims(
  subjectId: string,
  subjectName: string,
  recordType: 'architectureStyle' | 'pattern',
  claims: AtomicClaim[],
): { record: Record<string, unknown>; provenance: Record<string, string[]>; unresolvedContradictions: Contradiction[] } {
  const mine = claims.filter((claim) => claim.subjectId === subjectId && claim.reviewStatus !== 'rejected');
  const provenance: Record<string, string[]> = {};
  const take = (claimType: AtomicClaim['claimType']) => {
    const matched = mine.filter((claim) => claim.claimType === claimType);
    return matched;
  };
  const joinField = (field: string, matched: AtomicClaim[]) => {
    provenance[field] = matched.map((claim) => claim.claimId);
    return matched.map((claim) => claim.object);
  };
  const applicability = take('applicability');
  const avoidance = take('avoidance');
  const record: Record<string, unknown> = {
    id: subjectId,
    name: subjectName,
    recordType,
    status: 'candidate',
    owner: '',
    version: '0.1.0',
    whenToConsider: joinField('whenToConsider', applicability).join(' '),
    whenToAvoidOrQuestion: joinField('whenToAvoidOrQuestion', avoidance).join(' '),
    obligations: joinField('obligations', take('obligation')),
    requires: joinField('requires', take('prerequisite')),
    conflictsWith: joinField('conflictsWith', take('conflict')),
    risks: joinField('risks', take('risk')),
    mitigations: joinField('mitigations', take('mitigation')),
    evidence: [...new Set(mine.flatMap((claim) => claim.evidence))],
  };
  return { record, provenance, unresolvedContradictions: detectContradictions(mine) };
}

/**
 * Contradiction: same subject + predicate, opposite polarity, and NO
 * distinguishing conditions on either side. Output demands a context split —
 * two conditional claims — never a silent winner.
 */
export function detectContradictions(claims: AtomicClaim[]): Contradiction[] {
  const groups = new Map<string, AtomicClaim[]>();
  for (const claim of claims) {
    const key = `${claim.subjectId}::${claim.predicate}`;
    groups.set(key, [...(groups.get(key) ?? []), claim]);
  }
  const out: Contradiction[] = [];
  for (const [key, group] of groups) {
    const supports = group.filter((claim) => claim.polarity === 'supports' && claim.conditions.length === 0);
    const opposes = group.filter((claim) => claim.polarity === 'opposes' && claim.conditions.length === 0);
    if (supports.length && opposes.length) {
      const [subjectId, predicate] = key.split('::') as [string, string];
      out.push({
        subjectId, predicate,
        supporting: supports.map((claim) => claim.claimId),
        opposing: opposes.map((claim) => claim.claimId),
        resolution: 'context-split-required',
        note: 'Both sides assert unconditionally. Resolve by attaching applicability conditions to each claim; do not delete either.',
      });
    }
  }
  return out;
}

/** Independent approved-posture corroboration for an assertion. A recorded internal architecture-board approval may count as accountable Tier-1 authority when independently auditable. */
export function corroborationFor(
  claim: AtomicClaim,
  approvedEvidencePrefixes: string[],
  internalExpertPrefix = 'EVID-INTERNAL-EXPERT-BOARD',
): { independentSources: number; hasInternalBoardApproval: boolean; sufficientForRatings: boolean } {
  const approved = [...new Set(claim.evidence)].filter((id) => approvedEvidencePrefixes.some((prefix) => id.startsWith(prefix)));
  const hasInternalBoardApproval = approved.some((id) => id.startsWith(internalExpertPrefix));
  // A4: genuine independence — distinct organization/upstream lineages, not raw id count.
  const meta = (claim.sourceMeta ?? {}) as Record<string, { organization?: string; upstream?: string }>;
  const lineages = new Set(approved.map((id) => meta[id]?.upstream ?? meta[id]?.organization ?? id));
  const independentSources = lineages.size;
  return { independentSources, hasInternalBoardApproval, sufficientForRatings: independentSources >= 2 || hasInternalBoardApproval };
}

/** Decompose an entire library into its claim graph (deterministic, offline). */
export function libraryClaimGraph(library: KnowledgeLibrary): { claims: AtomicClaim[]; contradictions: Contradiction[] } {
  const claims = [
    ...(library.architectureStyles as unknown as AnyRecord[]),
    ...(library.patterns as unknown as AnyRecord[]),
  ].flatMap((record) => decomposeRecordToClaims(record));
  return { claims, contradictions: detectContradictions(claims) };
}

// ---- A6: contradiction detection v2 (semantic-adjacent, deterministic) ----
export interface ContradictionV2 extends Contradiction { severity: 'high' | 'medium'; kind: 'polarity' | 'numeric-range' | 'rating-disagreement' | 'near-duplicate-opposition'; }

const NUM = /(-?\d+(?:\.\d+)?)/g;
const tokens2 = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
const jaccard = (a: Set<string>, b: Set<string>) => { const i = [...a].filter((x) => b.has(x)).length; return i / (a.size + b.size - i || 1); };

export function detectContradictionsV2(claims: AtomicClaim[]): ContradictionV2[] {
  const out: ContradictionV2[] = [];
  const bySubjectPredicate = new Map<string, AtomicClaim[]>();
  for (const c of claims) { const k = `${c.subjectId}::${c.predicate}`; bySubjectPredicate.set(k, [...(bySubjectPredicate.get(k) ?? []), c]); }
  for (const [key, group] of bySubjectPredicate) {
    const [subjectId, predicate] = key.split('::') as [string, string];
    const sev = (a: AtomicClaim, b: AtomicClaim): 'high' | 'medium' => (a.reviewStatus === 'approved' && b.reviewStatus === 'approved') ? 'high' : 'medium';
    // polarity (v1 semantics, carried)
    const sup = group.filter((c) => c.polarity === 'supports' && !c.conditions.length);
    const opp = group.filter((c) => c.polarity === 'opposes' && !c.conditions.length);
    if (sup.length && opp.length) out.push({ subjectId, predicate, supporting: sup.map((c) => c.claimId), opposing: opp.map((c) => c.claimId), resolution: 'context-split-required', note: 'Unconditional opposite assertions.', severity: sev(sup[0]!, opp[0]!), kind: 'polarity' });
    // rating disagreements on impacts:<attr> (>=2 apart)
    if (predicate.startsWith('impacts:')) {
      const rated = group.map((c) => ({ c, n: Number((c.object.match(NUM) ?? [])[0]) })).filter((x) => Number.isFinite(x.n));
      for (let i = 0; i < rated.length; i++) for (let j = i + 1; j < rated.length; j++) {
        if (Math.abs(rated[i]!.n - rated[j]!.n) >= 2 && !rated[i]!.c.conditions.length && !rated[j]!.c.conditions.length)
          out.push({ subjectId, predicate, supporting: [rated[i]!.c.claimId], opposing: [rated[j]!.c.claimId], resolution: 'context-split-required', note: `Ratings ${rated[i]!.n} vs ${rated[j]!.n} disagree materially.`, severity: sev(rated[i]!.c, rated[j]!.c), kind: 'rating-disagreement' });
      }
    }
    // numeric-range conflicts inside payload/full text (same predicate, disjoint numbers with opposite polarity)
    const nums = group.map((c) => ({ c, ns: ((c.payload?.fullText ?? c.object).match(NUM) ?? []).map(Number) })).filter((x) => x.ns.length);
    for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) {
      const A = nums[i]!, B = nums[j]!;
      if (A.c.polarity !== B.c.polarity && Math.min(...A.ns) > Math.max(...B.ns) * 2 && !A.c.conditions.length && !B.c.conditions.length)
        out.push({ subjectId, predicate, supporting: [A.c.claimId], opposing: [B.c.claimId], resolution: 'context-split-required', note: 'Numeric claims diverge by more than 2x with opposite polarity.', severity: sev(A.c, B.c), kind: 'numeric-range' });
    }
  }
  // near-duplicate opposition across predicates on the same subject
  const bySubject = new Map<string, AtomicClaim[]>();
  for (const c of claims) bySubject.set(c.subjectId, [...(bySubject.get(c.subjectId) ?? []), c]);
  for (const [subjectId, group] of bySubject) {
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = group[i]!, b = group[j]!;
      if (a.polarity === b.polarity || a.conditions.length || b.conditions.length) continue;
      if (a.predicate.startsWith('impacts:') || b.predicate.startsWith('impacts:')) continue;
      if (jaccard(tokens2(a.object), tokens2(b.object)) >= 0.8)
        out.push({ subjectId, predicate: `${a.predicate}~${b.predicate}`, supporting: [a.polarity === 'supports' ? a.claimId : b.claimId], opposing: [a.polarity === 'opposes' ? a.claimId : b.claimId], resolution: 'context-split-required', note: 'Near-identical statements with opposite polarity across predicates.', severity: (a.reviewStatus === 'approved' && b.reviewStatus === 'approved') ? 'high' : 'medium', kind: 'near-duplicate-opposition' });
    }
  }
  return out;
}
