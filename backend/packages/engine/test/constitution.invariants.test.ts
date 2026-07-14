import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import type { ArchitectureProject, KnowledgeLibrary, QualityPriority } from '@aiw/domain';
import { recommendArchitectureStyles } from '../src/recommendation.js';
import { evaluateArchitectureEvent } from '../src/intelligenceKernel.js';
import {
  decomposeRecordToClaims,
  assembleRecordFromClaims,
  detectContradictions,
  corroborationFor,
  libraryClaimGraph,
  type AtomicClaim,
} from '../src/claimAssembly.js';

// -----------------------------------------------------------------------------
// Constitution invariants (v0.9.9). These encode the governance doctrine as
// executable law:
//   1. Source/retrieval changes can NEVER reorder recommendation semantics —
//      "source authority affects evidence confidence, not architectural
//      desirability."
//   2. The kernel performs NO network I/O — production recommendations answer
//      from the governed release, never the live internet.
//   3. Records are claim-aggregations with per-claim provenance (the spine).
//   4. Contradictions demand context splits; unconditional opposites are flagged.
//   5. Rating-bearing assertions need corroboration or accountable internal
//      architecture-board approval.
// -----------------------------------------------------------------------------

const library: KnowledgeLibrary = JSON.parse(
  readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8'),
);
const project = (qp: QualityPriority[], ctx: Record<string, unknown> = {}): ArchitectureProject =>
  ({ qualityPriorities: qp, context: ctx, nodes: [], edges: [], styleDecisions: [], patternSelections: [], decisions: [], objectives: [], constraints: [], assumptions: [], activeStage: 'logicalApplication' } as unknown as ArchitectureProject);

describe('invariant: retrieval/source changes never reorder recommendations', () => {
  const drivers: QualityPriority[] = [
    { attributeId: 'scalability', weight: 5 }, { attributeId: 'security', weight: 4 }, { attributeId: 'consistency', weight: 3 },
  ];
  it('renaming evidence and multiplying corroboration leaves ranking identical', () => {
    const before = recommendArchitectureStyles(project(drivers), library).map((r) => r.styleId).join('>');
    const mutated: KnowledgeLibrary = JSON.parse(JSON.stringify(library));
    for (const style of mutated.architectureStyles as unknown as Array<Record<string, unknown>>) {
      style.evidence = ['EVID-RENAMED-SOURCE-A', 'EVID-RENAMED-SOURCE-B', 'EVID-RENAMED-SOURCE-C'];
      style.name = `${style.name} (renamed)`;
    }
    const after = recommendArchitectureStyles(project(drivers), mutated).map((r) => r.styleId).join('>');
    expect(after).toEqual(before);
  });
});

describe('invariant: no network inside the kernel', () => {
  it('kernel source contains no network primitives', () => {
    const src = readFileSync(new URL('../src/intelligenceKernel.ts', import.meta.url), 'utf8');
    expect(/\bfetch\s*\(|XMLHttpRequest|axios|node:https?|from 'https?/.test(src)).toBe(false);
  });
  it('evaluate() succeeds with fetch poisoned', () => {
    const poisoned = () => { throw new Error('NETWORK FORBIDDEN IN KERNEL'); };
    const original = (globalThis as { fetch?: unknown }).fetch;
    (globalThis as { fetch?: unknown }).fetch = poisoned;
    try {
      const response = evaluateArchitectureEvent(project([{ attributeId: 'availability', weight: 5 }]), library, { kind: 'state-recomputed' });
      expect(response.evidence.knowledgeReleaseId.length).toBeGreaterThan(0);
      expect(response.nextBestActions.length).toBeGreaterThan(0);
    } finally {
      (globalThis as { fetch?: unknown }).fetch = original;
    }
  });
});

describe('knowledge spine: records are claim aggregations with provenance', () => {
  it('decompose → assemble round-trips governed fields with per-field claim provenance', () => {
    const source = library.patterns.find((item) => item.obligations.length > 0) as unknown as Record<string, unknown> & { id: string; name: string };
    const claims = decomposeRecordToClaims(source);
    expect(claims.length).toBeGreaterThan(2);
    const { record, provenance } = assembleRecordFromClaims(source.id, String(source.name), 'pattern', claims);
    expect((record.obligations as string[]).length).toBe((source.obligations as unknown[]).length);
    expect(provenance.obligations?.length).toBe((source.obligations as unknown[]).length);
    if (typeof source.whenToConsider === 'string' && source.whenToConsider.trim()) {
      expect(String(record.whenToConsider)).toContain(source.whenToConsider.slice(0, 20));
    }
  });
  it('whole-library claim graph decomposes and finds no unconditional contradictions in the governed release', () => {
    const graph = libraryClaimGraph(library);
    expect(graph.claims.length).toBeGreaterThan(100);
    expect(graph.contradictions).toEqual([]);
  });
});

describe('contradiction doctrine: context split, never a silent winner', () => {
  const claim = (over: Partial<AtomicClaim>): AtomicClaim => ({
    claimId: over.claimId ?? 'CLM-X', subjectId: 'PAT-X', subjectName: 'X', claimType: 'applicability',
    predicate: 'applies-when', object: 'o', polarity: 'supports', conditions: [], evidence: ['EVID-A'], reviewStatus: 'approved', ...over,
  });
  it('unconditional opposite polarities are a contradiction', () => {
    const out = detectContradictions([claim({ claimId: 'a' }), claim({ claimId: 'b', polarity: 'opposes' })]);
    expect(out).toHaveLength(1);
    expect(out[0]!.resolution).toBe('context-split-required');
  });
  it('conditions on either side dissolve the contradiction (context split accepted)', () => {
    const out = detectContradictions([claim({ claimId: 'a', conditions: ['services independently deployable'] }), claim({ claimId: 'b', polarity: 'opposes', conditions: ['migration risk high'] })]);
    expect(out).toHaveLength(0);
  });
});

describe('corroboration doctrine for rating-bearing assertions', () => {
  const base: AtomicClaim = { claimId: 'c', subjectId: 'STYLE-X', subjectName: 'X', claimType: 'quality-impact', predicate: 'impacts:security', object: 'rating 4', polarity: 'supports', conditions: [], evidence: [], reviewStatus: 'approved' };
  it('one ordinary source is insufficient; two independent sources suffice', () => {
    expect(corroborationFor({ ...base, evidence: ['EVID-ONE'] }, ['EVID-', 'SRC-']).sufficientForRatings).toBe(false);
    expect(corroborationFor({ ...base, evidence: ['EVID-ONE', 'SRC-TWO'] }, ['EVID-', 'SRC-']).sufficientForRatings).toBe(true);
  });
  it('accountable internal architecture-board approval suffices alone', () => {
    const result = corroborationFor({ ...base, evidence: ['EVID-INTERNAL-EXPERT-BOARD-APPROVAL-001'] }, ['EVID-', 'SRC-']);
    expect(result.hasInternalBoardApproval).toBe(true);
    expect(result.sufficientForRatings).toBe(true);
  });
});

describe('calibration integrity and anti-placebo governance', () => {
  it('keeps eight production calibrations and twelve visible draft candidates', () => {
    expect(library.qualityAttributes).toHaveLength(20);
    const production = library.qualityAttributes.filter((attribute) => attribute.calibrated === true);
    const draft = library.qualityAttributes.filter((attribute) => attribute.calibrated !== true);
    expect(production).toHaveLength(8);
    expect(draft).toHaveLength(12);
    expect(production.every((attribute) => attribute.calibrationStatus === 'production')).toBe(true);
    expect(draft.every((attribute) => attribute.calibrationStatus === 'draft-ai')).toBe(true);
    expect(library.architectureStyles.every((style) => Object.keys(style.qualityAttributeRatings).length === 20)).toBe(true);
  });
  it('every draft matrix has real cross-style variance even though production scoring excludes it', () => {
    const draftIds = library.qualityAttributes.filter((attribute) => !attribute.calibrated).map((attribute) => attribute.id);
    for (const attributeId of draftIds) {
      const values = new Set(library.architectureStyles.map((style) => style.qualityAttributeRatings[attributeId]));
      expect(values.size, `${attributeId} draft matrix must not be inert`).toBeGreaterThan(1);
    }
  });
  it('pending attributes are ignored by deterministic ranking until expert promotion', () => {
    const pending = library.qualityAttributes.find((attribute) => !attribute.calibrated)!;
    const base = recommendArchitectureStyles(project([{ attributeId: 'availability', weight: 5 }]), library).map((r) => r.styleId).join('>');
    const withPending = recommendArchitectureStyles(project([{ attributeId: 'availability', weight: 5 }, { attributeId: pending.id, weight: 5 }]), library).map((r) => r.styleId).join('>');
    expect(withPending).toEqual(base);
  });
});
