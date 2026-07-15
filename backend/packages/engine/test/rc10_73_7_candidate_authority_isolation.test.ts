import { describe, expect, it } from 'vitest';
import { seedKnowledgeClaims, type ArchitectureKnowledgeClaim } from '@aiw/domain';
import { retrieveArchitectureKnowledge } from '../src/index.js';

describe('rc.10.73.7 candidate knowledge authority isolation', () => {
  it('never places candidate knowledge on the authoritative Brain route', () => {
    const approved = structuredClone(seedKnowledgeClaims[0]!) as ArchitectureKnowledgeClaim;
    approved.reviewStatus = 'verified';
    approved.statement = 'Authority isolation exact-match evidence for approved routing.';
    approved.subjectName = 'Authority isolation exact match';
    const candidate = structuredClone(approved) as ArchitectureKnowledgeClaim;
    candidate.id = `${approved.id}-CANDIDATE`;
    candidate.reviewStatus = 'candidate';
    candidate.statement = 'Authority isolation exact-match evidence for candidate routing.';

    const defaultResult = retrieveArchitectureKnowledge({ query: 'Authority isolation exact match' }, [approved, candidate]);
    expect(defaultResult.approved.map((hit) => hit.claim.id)).toEqual([approved.id]);
    expect(defaultResult.candidate).toEqual([]);

    const optInResult = retrieveArchitectureKnowledge({ query: 'Authority isolation exact match', includeCandidateClaims: true }, [approved, candidate]);
    expect(optInResult.approved.map((hit) => hit.claim.id)).toEqual([approved.id]);
    expect(optInResult.candidate.map((hit) => hit.claim.id)).toEqual([candidate.id]);
    expect(optInResult.candidate.every((hit) => hit.releaseStatus === 'candidate')).toBe(true);
  });
});
