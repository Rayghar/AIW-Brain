import { describe, expect, it } from 'vitest';
import type { ConformanceEvidenceEnvelope } from '@aiw/domain';
import { conformanceEvidenceHash, normalizeConformanceEvidence } from '../src/index.js';

function evidence(sourceType: ConformanceEvidenceEnvelope['sourceType'], payload: unknown): ConformanceEvidenceEnvelope {
  return { id: `CEV-${sourceType}`, projectId: 'PRJ-1', branchId: 'BR-1', sourceType, collectedAt: '2026-07-02T19:00:00.000Z', payload };
}

describe('Sprint 7.9 implementation conformance adapters', () => {
  it('normalizes architecture test failures into governed findings', () => {
    const result = normalizeConformanceEvidence(evidence('archunit', { violations: [{ ruleId: 'layering', status: 'failed', severity: 'error', message: 'UI accesses persistence.' }] }));
    expect(result).toHaveLength(1);
    expect(result[0]?.severity).toBe('critical');
    expect(result[0]?.ruleId).toBe('layering');
  });

  it('detects destructive Terraform changes', () => {
    const result = normalizeConformanceEvidence(evidence('terraform', { resource_changes: [{ address: 'aws_db_instance.primary', change: { actions: ['delete','create'] } }] }));
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toContain('destructive');
  });

  it('detects untraced and unapproved public Kubernetes resources', () => {
    const result = normalizeConformanceEvidence(evidence('kubernetes', { resources: [{ kind: 'Service', metadata: { name: 'public-api' }, spec: { type: 'LoadBalancer' } }] }));
    expect(result.map((item) => item.title)).toEqual(expect.arrayContaining(['Deployment resource lacks AIW traceability','Unapproved public service exposure']));
  });

  it('maps runtime drift to architecture objects and produces a stable evidence hash', () => {
    const item = evidence('opentelemetry', { findings: [{ type: 'unexpected-edge', architectureObjectId: 'NODE-1', severity: 'warning', description: 'Observed an undeclared dependency.' }] });
    const result = normalizeConformanceEvidence(item);
    expect(result[0]?.architectureObjectId).toBe('NODE-1');
    expect(conformanceEvidenceHash(item)).toBe(conformanceEvidenceHash(item));
  });
});
