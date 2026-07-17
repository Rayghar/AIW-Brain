import { describe, expect, it } from 'vitest';
import { passesGate6b3CriticalMetrics, validateCapabilityRouting } from '../src/gate6b3ModelRouting.js';

const passing = {
  dispositionAccuracy: 80, primaryOrPermittedAssetTypeAccuracy: 80,
  sourceAtomEpistemicAccuracy: 80, fieldEpistemicAccuracy: 80,
  assetSynthesisStatusAccuracy: 80, requiredConditionCompleteness: 80,
  requiredLimitationCompleteness: 80, criticalUnsupportedClaimsAccepted: 0,
  crossCaseContamination: 0, authorityLeakage: 0, designGraphMutations: 0,
  automaticPromotions: 0,
};

describe('Gate 6B.3 capability-aware routing', () => {
  it('accepts a model route only at every absolute threshold', () => {
    expect(passesGate6b3CriticalMetrics(passing)).toBe(true);
    expect(passesGate6b3CriticalMetrics({ ...passing, requiredLimitationCompleteness: 79.99 })).toBe(false);
  });
  it('never treats relative model superiority as an absolute pass', () => {
    expect(passesGate6b3CriticalMetrics({ ...passing, dispositionAccuracy: 79 })).toBe(false);
  });
  it('requires evidence for every enabled class', () => {
    expect(validateCapabilityRouting([{ assetClass: 'pattern-dna', route: 'route-b-gpt-5.6-sol', enabledForPlanning: true, evidenceCases: [], rationale: 'relative result' }]).valid).toBe(false);
  });
  it('requires unproven classes to remain explicitly deferred', () => {
    expect(validateCapabilityRouting([{ assetClass: 'pattern-dna', route: 'deferred', enabledForPlanning: false, evidenceCases: ['G6B1-09'], rationale: 'no passing route' }])).toEqual({ valid: true, errors: [] });
  });
  it('allows deterministic no-evidence abstention as a bounded route', () => {
    expect(validateCapabilityRouting([{ assetClass: 'no-evidence-abstention', route: 'route-c-deterministic', enabledForPlanning: true, evidenceCases: ['G6B1-24'], rationale: 'zero-call deterministic control passed' }]).valid).toBe(true);
  });
});
