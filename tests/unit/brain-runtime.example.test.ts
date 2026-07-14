import { describe, expect, it } from 'vitest';
import { deriveBrainSignals } from '../../packages/brain-runtime/src';

describe('brain runtime', () => {
  it('creates quiet signals from driver, style, pattern and interface state', () => {
    const signals = deriveBrainSignals({
      projectId: 'p1',
      activeStage: 'logical-application',
      selectedStyleId: 'microservices',
      qualityDrivers: [{ id: 'scalability', name: 'Scalability', weight: 10, scenarioComplete: false }],
      candidateStyles: [{ id: 'microservices', name: 'Microservices', driverAffinity: { scalability: 0.9 }, requiredPatterns: ['api-gateway'] }],
      candidatePatterns: [{ id: 'api-gateway', name: 'API Gateway' }],
      acceptedPatterns: [{ id: 'api-gateway', name: 'API Gateway', accepted: true, obligations: [{ id: 'auth-boundary', label: 'Define authentication boundary', domain: 'security', evidenceRequired: true }] }],
      architectureObjects: [{ id: 'svc1', name: 'Payment Service', family: 'Logical Service' }],
    });

    expect(signals.some((s) => s.category === 'interface-critique')).toBe(true);
    expect(signals.some((s) => s.category === 'pattern-obligation')).toBe(true);
    expect(signals.some((s) => s.surfaces.includes('canvas-badge'))).toBe(true);
  });
});
