import { describe, expect, it } from 'vitest';
import { AIW_RELEASE, sampleEnterpriseCatalog, samplePortfolioProjects } from '@aiw/domain';
import {
  buildReferencePilotScenarios,
  buildV10ReleaseReadiness,
  pilotEvaluationPlatformRelease,
  runPilotEvaluationSuite,
} from '../src/index.js';

describe('Sprint 8.7.5 pilot evaluation and v0.10.0 release hardening', () => {
  it('builds a reference pilot scenario suite across multiple architecture contexts', () => {
    const scenarios = buildReferencePilotScenarios(samplePortfolioProjects);
    expect(scenarios.length).toBeGreaterThanOrEqual(6);
    expect(scenarios.some((scenario) => scenario.kind === 'digital-banking')).toBe(true);
    expect(scenarios.some((scenario) => scenario.kind === 'low-connectivity')).toBe(true);
    expect(scenarios.every((scenario) => scenario.projectIds.length > 0)).toBe(true);
  });

  it('runs benchmark scoring and produces a visual pilot readiness model', () => {
    const report = runPilotEvaluationSuite(buildReferencePilotScenarios(samplePortfolioProjects), samplePortfolioProjects, sampleEnterpriseCatalog);
    expect(report.version).toBe(AIW_RELEASE.version);
    expect(report.scenarios.length).toBeGreaterThan(0);
    expect(report.visualModel.nodes.some((node) => node.kind === 'scenario')).toBe(true);
    expect(report.visualModel.edges.some((edge) => edge.kind === 'measured-by' || edge.kind === 'rolls-up-to')).toBe(true);
    expect(report.visualModel.knowledgeReleaseId).toBe('AKR-0.10.60');
  });

  it('keeps production acceptance honest while nominating release-candidate readiness', () => {
    const report = runPilotEvaluationSuite(buildReferencePilotScenarios(samplePortfolioProjects), samplePortfolioProjects, sampleEnterpriseCatalog);
    const readiness = buildV10ReleaseReadiness(report);
    expect(readiness.version).toBe(AIW_RELEASE.version);
    expect(readiness.productionAcceptance.accepted).toBe(false);
    expect(readiness.productionAcceptance.requiredEvidence.length).toBeGreaterThan(0);
    expect(readiness.gates.some((gate) => gate.label.includes('Production acceptance honesty') && gate.passed)).toBe(true);
  });

  it('publishes the 8.7.5 release capability boundary', () => {
    const release = pilotEvaluationPlatformRelease();
    expect(release.version).toBe(AIW_RELEASE.version);
    expect(release.basedOn).toBe('AIW-0.10.0-rc.10.64.0');
    expect(release.capabilities.visualPilotReadinessModel).toBe(true);
    expect(release.capabilities.targetEnvironmentAcceptanceRequired).toBe(true);
  });
});
