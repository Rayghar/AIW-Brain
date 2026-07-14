import { describe, expect, it } from 'vitest';
import { sampleEnterpriseCatalog, samplePortfolioProjects } from '@aiw/domain';
import {
  aggregatePortfolioCosts,
  analyseBuildingBlockReuse,
  analyseTechnologyStandardization,
  buildPortfolioDependencyGraph,
  buildPortfolioIntelligence,
  buildPortfolioRiskHeatmap,
  evaluateReferenceArchitectureCompliance,
} from '../src/index.js';

describe('Sprint 7 enterprise portfolio intelligence', () => {
  it('maps cross-project dependencies and centrality', () => {
    const graph = buildPortfolioDependencyGraph(samplePortfolioProjects);
    expect(graph.projects).toHaveLength(3);
    expect(graph.dependencies.length).toBeGreaterThanOrEqual(3);
    expect(graph.centrality[0]?.inbound).toBeGreaterThan(0);
    expect(graph.singlePointsOfDependency).toContain('project-customer-identity');
  });

  it('detects deprecated, restricted and unclassified technology choices', () => {
    const report = analyseTechnologyStandardization(samplePortfolioProjects, sampleEnterpriseCatalog);
    expect(report.classified).toBeGreaterThan(0);
    expect(report.deprecated).toBeGreaterThan(0);
    expect(report.restricted).toBeGreaterThan(0);
    expect(report.findings.some((finding) => finding.projectId === 'project-commerce-analytics' && finding.severity === 'SIGNIFICANT')).toBe(true);
  });

  it('produces a risk heatmap ordered by risk', () => {
    const heatmap = buildPortfolioRiskHeatmap(samplePortfolioProjects);
    expect(heatmap).toHaveLength(3);
    expect(heatmap[0]!.riskScore).toBeGreaterThanOrEqual(heatmap[1]!.riskScore);
    expect(heatmap.some((entry) => entry.projectId === 'project-commerce-analytics' && ['high', 'critical'].includes(entry.riskBand))).toBe(true);
  });

  it('aggregates architecture costs and technical-debt impact', () => {
    const costs = aggregatePortfolioCosts(samplePortfolioProjects);
    expect(costs.expectedMonthlyCost).toBeGreaterThan(0);
    expect(costs.annualTechnicalDebtImpact).toBeGreaterThan(0);
    expect(costs.byProject).toHaveLength(3);
  });

  it('evaluates reference architecture compliance', () => {
    const reports = evaluateReferenceArchitectureCompliance(samplePortfolioProjects, sampleEnterpriseCatalog);
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((report) => report.score >= 0 && report.score <= 100)).toBe(true);
    expect(reports.some((report) => !report.compliant)).toBe(true);
  });

  it('analyses building block reuse and duplicate candidates', () => {
    const report = analyseBuildingBlockReuse(samplePortfolioProjects, sampleEnterpriseCatalog);
    expect(report.usages.find((usage) => usage.buildingBlockId === 'ABB-SECURE-API-SERVICE')?.adoptionCount).toBe(2);
    expect(report.reuseScore).toBeGreaterThanOrEqual(0);
  });

  it('builds an integrated investment roadmap', () => {
    const report = buildPortfolioIntelligence(samplePortfolioProjects, sampleEnterpriseCatalog);
    expect(report.summary.projects).toBe(3);
    expect(report.roadmap.length).toBeGreaterThan(0);
    expect(report.roadmap.some((item) => item.priority === 'now')).toBe(true);
    expect(report.summary.standardizationScore).toBeLessThan(100);
  });
});
