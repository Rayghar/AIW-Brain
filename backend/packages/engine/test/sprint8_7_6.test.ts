import { describe, expect, it } from 'vitest';
import { sampleEnterpriseCatalog, samplePortfolioProjects } from '@aiw/domain';
import {
  assessV10ProductionAcceptance,
  buildReferencePilotScenarios,
  productionAcceptancePlatformRelease,
  requiredV10ProductionEvidence,
  runPilotEvaluationSuite,
  type ProductionEvidenceRecord,
} from '../src/index.js';

function referenceReport() {
  return runPilotEvaluationSuite(buildReferencePilotScenarios(samplePortfolioProjects), samplePortfolioProjects, sampleEnterpriseCatalog);
}

function verifiedEvidence(kind: ProductionEvidenceRecord['kind']): ProductionEvidenceRecord {
  return {
    id: `evid-${kind}`,
    tenantId: 'tenant-reference',
    environmentId: 'prod-like-1',
    kind,
    label: `Verified ${kind}`,
    status: 'verified',
    source: kind === 'repository-conformance' ? 'ci-run' : kind === 'runtime-telemetry' ? 'runtime-observation' : kind === 'identity-access' ? 'identity-provider' : kind === 'model-routing' ? 'model-router' : kind === 'pilot-signoff' ? 'human-signoff' : kind === 'architecture-board-approval' ? 'architecture-board' : 'enterprise-probe',
    collectedAt: '2026-07-03T19:00:00.000Z',
    projectIds: samplePortfolioProjects.map((project) => project.id),
    evidenceRefs: [`ref-${kind}`],
    summary: `Target evidence verified for ${kind}`,
    verifiedBy: 'architecture-board',
  };
}

describe('Sprint 8.7.6 target acceptance and v0.10.0 finalization', () => {
  it('defines all required production evidence categories', () => {
    const requirements = requiredV10ProductionEvidence();
    expect(requirements.map((item) => item.kind)).toContain('enterprise-runtime');
    expect(requirements.map((item) => item.kind)).toContain('architecture-board-approval');
    expect(requirements.every((item) => item.controls.length > 0)).toBe(true);
  });

  it('does not allow final declaration with reference pilot evidence alone', () => {
    const assessment = assessV10ProductionAcceptance({ pilotReport: referenceReport(), tenantId: 'tenant-reference', environmentId: 'prod-like-1' });
    expect(assessment.packageVersion).toBe('0.10.0-rc.2');
    expect(assessment.targetVersion).toBe('0.10.0');
    expect(assessment.productionAccepted).toBe(false);
    expect(assessment.finalDeclarationAllowed).toBe(false);
    expect(assessment.releaseDecision.recommendation).toBe('hold-for-evidence');
    expect(assessment.missingEvidenceKinds.length).toBe(requiredV10ProductionEvidence().length);
  });

  it('allows final declaration only when every evidence category is verified', () => {
    const evidence = requiredV10ProductionEvidence().map((requirement) => verifiedEvidence(requirement.kind));
    const assessment = assessV10ProductionAcceptance({ pilotReport: referenceReport(), evidenceRecords: evidence, tenantId: 'tenant-reference', environmentId: 'prod-like-1' });
    expect(assessment.productionAccepted).toBe(true);
    expect(assessment.finalDeclarationAllowed).toBe(true);
    expect(assessment.status).toBe('production-accepted');
    expect(assessment.releaseDecision.recommendation).toBe('declare-final');
    expect(assessment.gates.every((gate) => gate.passed)).toBe(true);
  });

  it('renders a visual target acceptance graph rather than a text-only checklist', () => {
    const assessment = assessV10ProductionAcceptance({ pilotReport: referenceReport(), tenantId: 'tenant-reference', environmentId: 'prod-like-1' });
    expect(assessment.visualModel.nodes.some((node) => node.kind === 'release')).toBe(true);
    expect(assessment.visualModel.nodes.some((node) => node.kind === 'blocker')).toBe(true);
    expect(assessment.visualModel.edges.some((edge) => edge.kind === 'requires')).toBe(true);
    expect(assessment.visualModel.summary.gates).toBeGreaterThan(0);
  });

  it('publishes the acceptance package boundary without claiming production acceptance', () => {
    const release = productionAcceptancePlatformRelease();
    expect(release.version).toBe('0.10.0-rc.2');
    expect(release.targetReleaseId).toBe('AIW-0.10.0');
    expect(release.capabilities.visualAcceptanceModel).toBe(true);
    expect(release.capabilities.noAutomaticProductionDeclaration).toBe(true);
  });
});
