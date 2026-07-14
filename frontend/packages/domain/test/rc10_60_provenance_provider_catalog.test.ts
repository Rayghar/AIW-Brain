import { describe, expect, it } from 'vitest';
import { patternAtomicClaimReceipts, providerProductCatalog, sprint78PatternCorpus } from '../src/index.js';

describe('rc.10.60 knowledge provenance and provider product catalogue', () => {
  it('links every governed Pattern DNA evidence reference to reviewed atomic claim receipts', () => {
    const claimIds = new Set(patternAtomicClaimReceipts.map((claim) => claim.id));
    expect(patternAtomicClaimReceipts.length).toBeGreaterThanOrEqual(sprint78PatternCorpus.length);
    for (const record of sprint78PatternCorpus) {
      expect(record.evidence.length).toBeGreaterThan(0);
      expect(record.evidence.every((evidence) => evidence.claimIds.length > 0 && evidence.claimIds.every((id) => claimIds.has(id)))).toBe(true);
    }
    expect(patternAtomicClaimReceipts.every((claim) => claim.releaseId === 'AKR-0.10.60' && claim.reviewStatus === 'verified')).toBe(true);
  });

  it('preserves vendor-neutral capability authority and offers governed mappings across five deployment postures', () => {
    const providers = new Set(providerProductCatalog.map((entry) => entry.provider));
    expect(providers).toEqual(new Set(['portable','aws','azure','gcp','on-premises']));
    const families = new Set(providerProductCatalog.map((entry) => entry.productFamily));
    expect(families.size).toBeGreaterThanOrEqual(8);
    expect(providerProductCatalog.every((entry) => entry.requiredCharacteristics.length > 0 && entry.architectureConsequences.length > 0)).toBe(true);
    expect(providerProductCatalog.filter((entry) => entry.provider === 'portable').length).toBeGreaterThanOrEqual(8);
  });
});
