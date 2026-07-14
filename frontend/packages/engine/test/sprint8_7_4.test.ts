import { describe, expect, it } from 'vitest';
import { sampleEnterpriseCatalog, samplePortfolioProjects } from '@aiw/domain';
import {
  analyseEnterpriseStandardsImpact,
  buildPortfolioIntelligence,
  buildPortfolioVisualModel,
  portfolioIntelligencePlatformRelease,
} from '../src/index.js';

const mysqlDeprecation = {
  id: 'change-mysql-5-deprecate',
  standardId: 'STD-RDBMS-MYSQL-LEGACY',
  changeType: 'prohibit' as const,
  targetStatus: 'prohibited' as const,
  replacementTechnology: 'PostgreSQL',
  effectiveFrom: '2026-10-01',
  rationale: 'Remove legacy database risk from revenue-impacting analytics workloads.',
};

describe('Sprint 8.7.4 portfolio intelligence and standards impact', () => {
  it('builds an interactive cross-project portfolio visual model', () => {
    const report = buildPortfolioIntelligence(samplePortfolioProjects, sampleEnterpriseCatalog);
    const visual = buildPortfolioVisualModel(samplePortfolioProjects, sampleEnterpriseCatalog, report);
    expect(visual.nodes.some((node) => node.kind === 'project')).toBe(true);
    expect(visual.nodes.some((node) => node.kind === 'standard')).toBe(true);
    expect(visual.edges.some((edge) => edge.kind === 'depends-on')).toBe(true);
    expect(visual.knowledgeReleaseId).toBe('AKR-0.10.60');
  });

  it('finds the blast radius of enterprise standard lifecycle changes', () => {
    const impact = analyseEnterpriseStandardsImpact(samplePortfolioProjects, sampleEnterpriseCatalog, mysqlDeprecation);
    expect(impact.summary.affectedProjects).toBeGreaterThan(0);
    expect(impact.affectedProjects.some((project) => project.affectedTechnologies.some((technology) => /mysql/i.test(technology)))).toBe(true);
    expect(impact.affectedDependencyIds.length).toBeGreaterThan(0);
    expect(impact.visualModel.focusNodeIds.length).toBeGreaterThan(0);
  });

  it('creates human-approved migration waves without mutating projects or standards', () => {
    const beforeStatus = sampleEnterpriseCatalog.technologyStandards.find((standard) => standard.id === mysqlDeprecation.standardId)?.status;
    const projectNodeCounts = samplePortfolioProjects.map((project) => project.nodes.length);
    const impact = analyseEnterpriseStandardsImpact(samplePortfolioProjects, sampleEnterpriseCatalog, mysqlDeprecation);
    expect(impact.migrationWaves.every((wave) => wave.humanApprovalRequired)).toBe(true);
    expect(impact.governance.automaticMutationAllowed).toBe(false);
    expect(sampleEnterpriseCatalog.technologyStandards.find((standard) => standard.id === mysqlDeprecation.standardId)?.status).toBe(beforeStatus);
    expect(samplePortfolioProjects.map((project) => project.nodes.length)).toEqual(projectNodeCounts);
  });

  it('publishes the 8.7.4 release capability boundary', () => {
    const release = portfolioIntelligencePlatformRelease();
    expect(release.version).toBe('0.10.0-alpha.4');
    expect(release.capabilities.enterpriseStandardsImpactAnalysis).toBe(true);
    expect(release.capabilities.automaticProjectMutationDisabled).toBe(true);
  });
});
