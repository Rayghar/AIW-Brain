import type {
  ArchitectureProject,
  BuildingBlockReuseReport,
  EnterpriseArchitectureCatalog,
  InvestmentRecommendation,
  PortfolioCostSummary,
  PortfolioDependencyGraph,
  PortfolioIntelligenceReport,
  PortfolioRiskHeatmapEntry,
  ReferenceArchitecture,
  ReferenceComplianceReport,
  TechnologyStandard,
  TechnologyStandardizationFinding,
  TechnologyStandardizationReport,
} from '@aiw/domain';

const numberProperty = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const normalise = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));
const severityWeight = { HARD: 25, SIGNIFICANT: 12, ADVISORY: 4 } as const;
const criticalityWeight = { low: 0.8, medium: 1, high: 1.2, 'mission-critical': 1.4 } as const;

function technologyLabel(project: ArchitectureProject, nodeId: string): string {
  const node = project.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return nodeId;
  return [node.label, text(node.properties.product), text(node.properties.runtime), text(node.properties.vendor), text(node.properties.version)].filter(Boolean).join(' ');
}

function matchingStandard(technology: string, standards: TechnologyStandard[]): TechnologyStandard | undefined {
  const value = normalise(technology);
  return standards.find((standard) => standard.matchTerms.some((term) => value.includes(normalise(term))));
}



export type PortfolioVisualNodeKind = 'portfolio' | 'business-unit' | 'project' | 'dependency' | 'standard' | 'technology' | 'risk' | 'reuse' | 'investment';
export type PortfolioVisualEdgeKind = 'contains' | 'depends-on' | 'uses-technology' | 'governed-by' | 'affected-by' | 'reuses' | 'prioritizes';

export interface PortfolioVisualNode {
  id: string;
  kind: PortfolioVisualNodeKind;
  label: string;
  summary: string;
  x: number;
  y: number;
  score?: number | undefined;
  severity?: 'HARD' | 'SIGNIFICANT' | 'ADVISORY' | undefined;
  projectId?: string | undefined;
  standardId?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface PortfolioVisualEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: PortfolioVisualEdgeKind;
  label: string;
  metadata: Record<string, unknown>;
}

export interface PortfolioVisualModel {
  id: string;
  title: string;
  description: string;
  generatedAt: string;
  knowledgeReleaseId: string;
  nodes: PortfolioVisualNode[];
  edges: PortfolioVisualEdge[];
  focusNodeIds: string[];
  summary: { projects: number; standards: number; dependencies: number; risks: number; investments: number };
}

export interface EnterpriseStandardChange {
  id: string;
  standardId: string;
  changeType: 'deprecate' | 'prohibit' | 'restrict' | 'replace' | 'approve' | 'retire-exception';
  targetStatus?: TechnologyStandard['status'] | undefined;
  replacementTechnology?: string | undefined;
  effectiveFrom: string;
  rationale: string;
}

export interface StandardsImpactProject {
  projectId: string;
  projectName: string;
  owner: string;
  criticality: ArchitectureProject['portfolio']['criticality'];
  businessUnit: string;
  affectedNodeIds: string[];
  affectedTechnologies: string[];
  dependencyFanIn: number;
  dependencyFanOut: number;
  activeExceptionIds: string[];
  riskScore: number;
  impactLevel: 'low' | 'moderate' | 'high' | 'critical';
  actions: string[];
}

export interface StandardsMigrationWave {
  id: string;
  title: string;
  projectIds: string[];
  sequencingRationale: string;
  estimatedEffortDays: number;
  prerequisites: string[];
  humanApprovalRequired: true;
}

export interface EnterpriseStandardsImpactAnalysis {
  id: string;
  generatedAt: string;
  portfolioId: string;
  standardChange: EnterpriseStandardChange;
  affectedProjects: StandardsImpactProject[];
  affectedDependencyIds: string[];
  affectedBusinessUnits: string[];
  migrationWaves: StandardsMigrationWave[];
  decisionPackage: { title: string; context: string; decisionRequired: string; consequences: string[]; evidence: string[] };
  visualModel: PortfolioVisualModel;
  governance: { reviewRequired: true; automaticMutationAllowed: false; candidateKnowledgeExcluded: true; knowledgeReleaseId: string };
  summary: { affectedProjects: number; criticalImpacts: number; affectedTechnologies: number; estimatedEffortDays: number };
}

export function buildPortfolioDependencyGraph(projects: ArchitectureProject[]): PortfolioDependencyGraph {
  const ids = new Set(projects.map((project) => project.id));
  const dependencies = projects.flatMap((project) => project.projectDependencies)
    .filter((dependency) => dependency.status !== 'deprecated' && ids.has(dependency.targetProjectId));
  const centrality = projects.map((project) => {
    const inbound = dependencies.filter((dependency) => dependency.targetProjectId === project.id).length;
    const outbound = dependencies.filter((dependency) => dependency.sourceProjectId === project.id).length;
    return { projectId: project.id, inbound, outbound, score: inbound * 2 + outbound };
  }).sort((a, b) => b.score - a.score);
  const singlePointsOfDependency = centrality.filter((entry) => entry.inbound >= 2 && projects.find((project) => project.id === entry.projectId)?.portfolio.criticality !== 'low').map((entry) => entry.projectId);
  return {
    projects: projects.map((project) => ({ id: project.id, name: project.name, criticality: project.portfolio.criticality, owner: project.portfolio.owner })),
    dependencies,
    centrality,
    singlePointsOfDependency,
  };
}

export function analyseTechnologyStandardization(projects: ArchitectureProject[], catalog: EnterpriseArchitectureCatalog): TechnologyStandardizationReport {
  const findings: TechnologyStandardizationFinding[] = [];
  const categories = new Map<string, Set<string>>();
  let classified = 0;
  let preferred = 0;
  let restricted = 0;
  let prohibited = 0;
  let deprecated = 0;
  let unclassified = 0;

  for (const project of projects) {
    const activeExceptions = project.technologyStandardExceptions.filter((exception) => exception.status === 'active' && new Date(exception.expiresAt).getTime() > Date.now());
    for (const node of project.nodes.filter((candidate) => ['TechnologyProduct', 'TechnologyComponent', 'Runtime', 'DeployableUnit'].includes(candidate.kind))) {
      const technology = technologyLabel(project, node.id);
      const standard = matchingStandard(technology, catalog.technologyStandards);
      if (!standard) {
        unclassified += 1;
        findings.push({ id: `std-${project.id}-${node.id}`, projectId: project.id, nodeId: node.id, technology, status: 'unclassified', severity: 'ADVISORY', recommendation: 'Classify this technology in the enterprise standards catalog or replace it with an approved building block.' });
        continue;
      }
      classified += 1;
      categories.set(standard.category, (categories.get(standard.category) ?? new Set()).add(standard.technologyName));
      if (standard.status === 'preferred') preferred += 1;
      if (standard.status === 'restricted') restricted += 1;
      if (standard.status === 'prohibited') prohibited += 1;
      if (standard.status === 'deprecated') deprecated += 1;
      const excepted = activeExceptions.some((exception) => exception.standardId === standard.id && exception.nodeId === node.id);
      if (standard.status !== 'preferred' && standard.status !== 'allowed' && !excepted) {
        const severity = standard.status === 'prohibited' ? 'HARD' : standard.status === 'deprecated' ? 'SIGNIFICANT' : 'ADVISORY';
        findings.push({
          id: `std-${project.id}-${node.id}`, projectId: project.id, nodeId: node.id, technology, standardId: standard.id,
          status: standard.status, severity,
          recommendation: standard.preferredReplacement ? `Migrate to ${standard.preferredReplacement}.` : `Obtain an approved, time-bound exception or select a preferred ${standard.category} technology.`,
        });
      }
    }
  }
  const total = Math.max(1, classified + unclassified);
  const penalty = prohibited * 30 + deprecated * 16 + restricted * 7 + unclassified * 5;
  return {
    score: clamp(100 - penalty / total * 4), classified, unclassified, preferred, restricted, prohibited, deprecated,
    fragmentationByCategory: [...categories.entries()].map(([category, technologies]) => ({ category, technologies: [...technologies].sort(), count: technologies.size })).sort((a, b) => b.count - a.count),
    findings,
  };
}

function projectRisk(project: ArchitectureProject, dependencyGraph: PortfolioDependencyGraph): PortfolioRiskHeatmapEntry {
  const openDebt = project.technicalDebtItems.filter((item) => !['resolved', 'accepted'].includes(item.status));
  const technicalDebtScore = clamp(openDebt.reduce((sum, item) => sum + severityWeight[item.severity] + Math.min(15, item.estimatedEffortDays / 3), 0));
  const approvals = project.stageApprovals.filter((approval) => approval.status === 'approved').length;
  const governanceScore = clamp((6 - approvals) * 9 + project.findings.reduce((sum, finding) => sum + severityWeight[finding.severity] / 2, 0));
  const operationalFindings = project.operationalDriftReports.at(-1)?.findings.filter((finding) => finding.status === 'open') ?? [];
  const structuralFindings = project.driftReports.at(-1)?.findings.filter((finding) => finding.status === 'open') ?? [];
  const operationalScore = clamp(operationalFindings.length * 12 + structuralFindings.length * 7);
  const centrality = dependencyGraph.centrality.find((entry) => entry.projectId === project.id);
  const dependencyScore = clamp((centrality?.inbound ?? 0) * 18 + (centrality?.outbound ?? 0) * 7);
  const weighted = (technicalDebtScore * 0.35 + governanceScore * 0.25 + operationalScore * 0.25 + dependencyScore * 0.15) * criticalityWeight[project.portfolio.criticality];
  const riskScore = clamp(Math.round(weighted));
  const drivers: string[] = [];
  if (technicalDebtScore >= 35) drivers.push(`${openDebt.length} material technical-debt item(s)`);
  if (approvals < 3) drivers.push(`${6 - approvals} architecture stages remain unapproved`);
  if (operationalScore >= 25) drivers.push('Open runtime or operational drift');
  if ((centrality?.inbound ?? 0) >= 2) drivers.push('High inbound dependency centrality');
  return { projectId: project.id, projectName: project.name, criticality: project.portfolio.criticality, riskScore, technicalDebtScore, governanceScore, operationalScore, dependencyScore, riskBand: riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'moderate' : 'low', drivers };
}

export function buildPortfolioRiskHeatmap(projects: ArchitectureProject[], dependencyGraph = buildPortfolioDependencyGraph(projects)): PortfolioRiskHeatmapEntry[] {
  return projects.map((project) => projectRisk(project, dependencyGraph)).sort((a, b) => b.riskScore - a.riskScore);
}

export function aggregatePortfolioCosts(projects: ArchitectureProject[]): PortfolioCostSummary {
  const currency = projects[0]?.portfolio.currency ?? 'USD';
  const byProject = projects.map((project) => {
    const expectedMonthlyCost = project.nodes.reduce((sum, node) => sum + numberProperty(node.properties.expectedMonthlyCost), 0);
    const latestInventory = [...project.runtimeInventories].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];
    const actualMonthlyCost = latestInventory?.resources.reduce((sum, resource) => sum + numberProperty(resource.properties.monthlyCost), 0) ?? expectedMonthlyCost;
    return { projectId: project.id, expectedMonthlyCost, actualMonthlyCost, variance: actualMonthlyCost - expectedMonthlyCost };
  });
  const expectedMonthlyCost = byProject.reduce((sum, item) => sum + item.expectedMonthlyCost, 0);
  const actualMonthlyCost = byProject.reduce((sum, item) => sum + item.actualMonthlyCost, 0);
  return { currency, expectedMonthlyCost, actualMonthlyCost, monthlyVariance: actualMonthlyCost - expectedMonthlyCost, annualTechnicalDebtImpact: projects.flatMap((project) => project.technicalDebtItems).filter((item) => item.status !== 'resolved').reduce((sum, item) => sum + item.annualCostImpact, 0), byProject };
}

function complianceFor(project: ArchitectureProject, reference: ReferenceArchitecture): ReferenceComplianceReport {
  const acceptedStyles = new Set(project.styleDecisions.filter((item) => item.status === 'accepted').map((item) => item.styleId));
  const acceptedPatterns = new Set(project.patternSelections.filter((item) => item.status === 'accepted').map((item) => item.patternId));
  const kinds = new Set(project.nodes.map((node) => node.kind));
  const technologyText = project.nodes.map((node) => technologyLabel(project, node.id).toLowerCase()).join(' ');
  const decisionText = project.decisions.filter((decision) => decision.status === 'accepted').map((decision) => `${decision.title} ${decision.decision}`.toLowerCase()).join(' ');
  const missingStyles = reference.requiredStyleIds.filter((id) => !acceptedStyles.has(id));
  const missingPatterns = reference.requiredPatternIds.filter((id) => !acceptedPatterns.has(id));
  const missingNodeKinds = reference.requiredNodeKinds.filter((kind) => !kinds.has(kind));
  const prohibitedTechnologies = reference.prohibitedTechnologyTerms.filter((term) => technologyText.includes(term.toLowerCase()));
  const missingDecisions = reference.requiredDecisionTerms.filter((term) => !decisionText.includes(term.toLowerCase()));
  const approved = project.stageApprovals.filter((approval) => approval.status === 'approved').length;
  const approvalGap = Math.max(0, reference.minimumApprovedStages - approved);
  const totalChecks = Math.max(1, reference.requiredStyleIds.length + reference.requiredPatternIds.length + reference.requiredNodeKinds.length + reference.prohibitedTechnologyTerms.length + reference.requiredDecisionTerms.length + 1);
  const failures = missingStyles.length + missingPatterns.length + missingNodeKinds.length + prohibitedTechnologies.length + missingDecisions.length + (approvalGap > 0 ? 1 : 0);
  const score = clamp(Math.round((1 - failures / totalChecks) * 100));
  return { projectId: project.id, referenceArchitectureId: reference.id, score, compliant: failures === 0, missingStyles, missingPatterns, missingNodeKinds, prohibitedTechnologies, missingDecisions, approvalGap };
}

export function evaluateReferenceArchitectureCompliance(projects: ArchitectureProject[], catalog: EnterpriseArchitectureCatalog): ReferenceComplianceReport[] {
  const reports: ReferenceComplianceReport[] = [];
  for (const project of projects) {
    for (const assignment of project.referenceArchitectureAssignments.filter((item) => item.status !== 'waived')) {
      const reference = catalog.referenceArchitectures.find((item) => item.id === assignment.referenceArchitectureId);
      if (reference) reports.push(complianceFor(project, reference));
    }
  }
  return reports;
}

export function analyseBuildingBlockReuse(projects: ArchitectureProject[], catalog: EnterpriseArchitectureCatalog): BuildingBlockReuseReport {
  const usages = catalog.buildingBlocks.map((block) => {
    const projectIds = projects.filter((project) => project.buildingBlockUsages.some((usage) => usage.buildingBlockId === block.id && usage.status === 'adopted')).map((project) => project.id);
    return { buildingBlockId: block.id, projectIds, adoptionCount: projectIds.length };
  });
  const signatures = new Map<string, { projectIds: Set<string>; labels: Set<string> }>();
  for (const project of projects) {
    for (const node of project.nodes.filter((item) => item.kind === 'DeployableUnit' || item.kind === 'ApplicationComponent')) {
      const signature = `${node.kind}:${[...node.tags].sort().join(',')}:${normalise(text(node.properties.runtime))}`;
      const entry = signatures.get(signature) ?? { projectIds: new Set<string>(), labels: new Set<string>() };
      entry.projectIds.add(project.id); entry.labels.add(node.label); signatures.set(signature, entry);
    }
  }
  const duplicateCandidates = [...signatures.entries()].filter(([, value]) => value.projectIds.size >= 2).map(([signature, value]) => ({ signature, projectIds: [...value.projectIds], labels: [...value.labels], recommendation: 'Review these similar components and promote a governed reusable architecture building block.' }));
  const adopted = projects.reduce((sum, project) => sum + project.buildingBlockUsages.filter((usage) => usage.status === 'adopted').length, 0);
  const eligible = projects.reduce((sum, project) => sum + project.nodes.filter((node) => node.kind === 'DeployableUnit' || node.kind === 'ApplicationComponent').length, 0);
  return { usages, duplicateCandidates, reuseScore: clamp(Math.round(adopted / Math.max(1, eligible) * 100)) };
}

function investmentRoadmap(risks: PortfolioRiskHeatmapEntry[], standardization: TechnologyStandardizationReport, costs: PortfolioCostSummary, compliance: ReferenceComplianceReport[], reuse: BuildingBlockReuseReport): InvestmentRecommendation[] {
  const recommendations: InvestmentRecommendation[] = [];
  for (const risk of risks.filter((item) => item.riskBand === 'critical' || item.riskBand === 'high')) {
    recommendations.push({ id: `investment-risk-${risk.projectId}`, title: `Reduce architecture risk in ${risk.projectName}`, category: risk.dependencyScore >= 35 ? 'resilience' : 'risk-reduction', priority: 'now', projectIds: [risk.projectId], rationale: risk.drivers.join('; ') || `Portfolio risk score is ${risk.riskScore}.`, estimatedEffortDays: Math.max(10, Math.round(risk.riskScore / 2)), estimatedAnnualBenefit: Math.round(risk.riskScore * 1500), dependencies: [] });
  }
  const standardsProjects = [...new Set(standardization.findings.filter((finding) => ['HARD', 'SIGNIFICANT'].includes(finding.severity)).map((finding) => finding.projectId))];
  if (standardsProjects.length) recommendations.push({ id: 'investment-standardization', title: 'Consolidate deprecated and restricted technology platforms', category: 'standardization', priority: 'now', projectIds: standardsProjects, rationale: `${standardization.deprecated + standardization.prohibited + standardization.restricted} technology-standard exceptions require portfolio treatment.`, estimatedEffortDays: Math.max(20, standardsProjects.length * 20), estimatedAnnualBenefit: Math.round((standardization.deprecated * 30000) + (standardization.prohibited * 50000) + (standardization.restricted * 10000)), dependencies: ['Approve target technology migration waves'] });
  if (costs.monthlyVariance > 0) recommendations.push({ id: 'investment-cost', title: 'Correct portfolio runtime cost variance', category: 'cost-optimization', priority: costs.monthlyVariance > 1000 ? 'now' : 'next', projectIds: costs.byProject.filter((item) => item.variance > 0).map((item) => item.projectId), rationale: `Actual monthly portfolio cost exceeds the architecture baseline by ${costs.currency} ${costs.monthlyVariance.toFixed(0)}.`, estimatedEffortDays: 15, estimatedAnnualBenefit: Math.round(costs.monthlyVariance * 12), dependencies: ['Refresh runtime inventory and ownership metadata'] });
  const nonCompliant = compliance.filter((item) => !item.compliant);
  if (nonCompliant.length) recommendations.push({ id: 'investment-reference-compliance', title: 'Close enterprise reference-architecture gaps', category: 'modernization', priority: 'next', projectIds: [...new Set(nonCompliant.map((item) => item.projectId))], rationale: `${nonCompliant.length} project/reference assignments remain non-compliant.`, estimatedEffortDays: nonCompliant.length * 12, estimatedAnnualBenefit: nonCompliant.length * 12000, dependencies: ['Confirm applicability and approve waivers where necessary'] });
  if (reuse.duplicateCandidates.length) recommendations.push({ id: 'investment-reuse', title: 'Productize repeated solution components as architecture building blocks', category: 'reuse', priority: 'next', projectIds: [...new Set(reuse.duplicateCandidates.flatMap((item) => item.projectIds))], rationale: `${reuse.duplicateCandidates.length} repeated component signatures were detected across projects.`, estimatedEffortDays: reuse.duplicateCandidates.length * 8, estimatedAnnualBenefit: reuse.duplicateCandidates.length * 20000, dependencies: ['Assign building-block product owners'] });
  const rank = { now: 0, next: 1, later: 2 } as const;
  return recommendations.sort((a, b) => rank[a.priority] - rank[b.priority]);
}

export function buildPortfolioIntelligence(projects: ArchitectureProject[], catalog: EnterpriseArchitectureCatalog): PortfolioIntelligenceReport {
  const scoped = projects.filter((project) => project.tenantId === catalog.tenantId);
  const dependencyGraph = buildPortfolioDependencyGraph(scoped);
  const standardization = analyseTechnologyStandardization(scoped, catalog);
  const riskHeatmap = buildPortfolioRiskHeatmap(scoped, dependencyGraph);
  const costs = aggregatePortfolioCosts(scoped);
  const compliance = evaluateReferenceArchitectureCompliance(scoped, catalog);
  const reuse = analyseBuildingBlockReuse(scoped, catalog);
  const roadmap = investmentRoadmap(riskHeatmap, standardization, costs, compliance, reuse);
  const complianceScore = compliance.length ? Math.round(compliance.reduce((sum, item) => sum + item.score, 0) / compliance.length) : 100;
  return {
    generatedAt: new Date().toISOString(), portfolioId: scoped[0]?.portfolio.portfolioId ?? 'portfolio-unassigned', dependencyGraph, standardization, riskHeatmap, costs, compliance, reuse, roadmap,
    summary: { projects: scoped.length, highRiskProjects: riskHeatmap.filter((item) => item.riskBand === 'high' || item.riskBand === 'critical').length, totalDependencies: dependencyGraph.dependencies.length, standardizationScore: Math.round(standardization.score), complianceScore, monthlyCostVariance: costs.monthlyVariance },
  };
}

function standardNodeId(standardId: string): string { return `standard-${standardId}`; }
function projectNodeId(projectId: string): string { return `portfolio-project-${projectId}`; }
function businessUnitNodeId(value: string): string { return `business-unit-${normalise(value).replaceAll(' ', '-') || 'unassigned'}`; }
function riskNodeId(projectId: string): string { return `portfolio-risk-${projectId}`; }
function technologyNodeId(projectId: string, nodeId: string): string { return `portfolio-technology-${projectId}-${nodeId}`; }

function severityForRisk(riskBand: PortfolioRiskHeatmapEntry['riskBand']): 'HARD' | 'SIGNIFICANT' | 'ADVISORY' | undefined {
  if (riskBand === 'critical') return 'HARD';
  if (riskBand === 'high') return 'SIGNIFICANT';
  if (riskBand === 'moderate') return 'ADVISORY';
  return undefined;
}

function activeStandardForNode(project: ArchitectureProject, standards: TechnologyStandard[], nodeId: string): TechnologyStandard | undefined {
  return matchingStandard(technologyLabel(project, nodeId), standards);
}

export function buildPortfolioVisualModel(
  projects: ArchitectureProject[],
  catalog: EnterpriseArchitectureCatalog,
  report = buildPortfolioIntelligence(projects, catalog),
  focusProjectIds: string[] = [],
): PortfolioVisualModel {
  const scoped = projects.filter((project) => project.tenantId === catalog.tenantId);
  const nodes: PortfolioVisualNode[] = [];
  const edges: PortfolioVisualEdge[] = [];
  const seen = new Set<string>();
  const addNode = (node: PortfolioVisualNode) => { if (!seen.has(node.id)) { seen.add(node.id); nodes.push(node); } };
  const addEdge = (edge: PortfolioVisualEdge) => { edges.push(edge); };
  const portfolioId = report.portfolioId;
  addNode({ id: `portfolio-${portfolioId}`, kind: 'portfolio', label: portfolioId, summary: `${scoped.length} projects governed by ${catalog.id} ${catalog.version}.`, x: 20, y: 180, score: Math.round((report.summary.standardizationScore + report.summary.complianceScore) / 2), metadata: { catalogId: catalog.id, catalogVersion: catalog.version } });

  const businessUnits = [...new Set(scoped.map((project) => project.portfolio.businessUnit || 'Unassigned'))].sort();
  businessUnits.forEach((unit, index) => {
    const id = businessUnitNodeId(unit);
    addNode({ id, kind: 'business-unit', label: unit, summary: `${scoped.filter((project) => project.portfolio.businessUnit === unit).length} project(s).`, x: 260, y: 40 + index * 170, metadata: { businessUnit: unit } });
    addEdge({ id: `edge-${portfolioId}-${id}`, sourceId: `portfolio-${portfolioId}`, targetId: id, kind: 'contains', label: 'contains', metadata: {} });
  });

  scoped.forEach((project, index) => {
    const risk = report.riskHeatmap.find((item) => item.projectId === project.id);
    const unitId = businessUnitNodeId(project.portfolio.businessUnit || 'Unassigned');
    addNode({ id: projectNodeId(project.id), kind: 'project', label: project.name, summary: `${project.portfolio.criticality} · ${project.portfolio.lifecycle} · ${project.portfolio.owner}`, x: 520, y: 40 + index * 145, score: risk ? 100 - risk.riskScore : undefined, severity: risk ? severityForRisk(risk.riskBand) : undefined, projectId: project.id, metadata: { owner: project.portfolio.owner, lifecycle: project.portfolio.lifecycle, criticality: project.portfolio.criticality } });
    addEdge({ id: `edge-${unitId}-${project.id}`, sourceId: unitId, targetId: projectNodeId(project.id), kind: 'contains', label: 'owns', metadata: { businessUnit: project.portfolio.businessUnit } });
    if (risk && risk.riskBand !== 'low') {
      const id = riskNodeId(project.id);
      addNode({ id, kind: 'risk', label: `${risk.riskBand} risk`, summary: risk.drivers.join('; ') || `Portfolio risk score ${risk.riskScore}.`, x: 800, y: 40 + index * 145, score: risk.riskScore, severity: severityForRisk(risk.riskBand), projectId: project.id, metadata: { riskBand: risk.riskBand, drivers: risk.drivers } });
      addEdge({ id: `edge-risk-${project.id}`, sourceId: projectNodeId(project.id), targetId: id, kind: 'affected-by', label: 'risk', metadata: { riskScore: risk.riskScore } });
    }

    project.nodes.filter((node) => ['TechnologyProduct', 'TechnologyComponent', 'Runtime', 'DeployableUnit'].includes(node.kind)).slice(0, 5).forEach((node, nodeIndex) => {
      const standard = activeStandardForNode(project, catalog.technologyStandards, node.id);
      const technologyId = technologyNodeId(project.id, node.id);
      addNode({ id: technologyId, kind: 'technology', label: technologyLabel(project, node.id), summary: standard ? `${standard.status} standard: ${standard.technologyName}` : 'Unclassified enterprise technology.', x: 1050, y: 30 + index * 145 + nodeIndex * 35, severity: standard?.status === 'prohibited' ? 'HARD' : standard?.status === 'deprecated' ? 'SIGNIFICANT' : standard ? undefined : 'ADVISORY', projectId: project.id, standardId: standard?.id, metadata: { nodeId: node.id, standardStatus: standard?.status ?? 'unclassified' } });
      addEdge({ id: `edge-tech-${project.id}-${node.id}`, sourceId: projectNodeId(project.id), targetId: technologyId, kind: 'uses-technology', label: 'uses', metadata: { nodeId: node.id } });
      if (standard) {
        const sid = standardNodeId(standard.id);
        addNode({ id: sid, kind: 'standard', label: standard.technologyName, summary: `${standard.status} · ${standard.category}`, x: 1320, y: 40 + catalog.technologyStandards.findIndex((item) => item.id === standard.id) * 78, severity: standard.status === 'prohibited' ? 'HARD' : standard.status === 'deprecated' ? 'SIGNIFICANT' : standard.status === 'restricted' ? 'ADVISORY' : undefined, standardId: standard.id, metadata: { category: standard.category, status: standard.status, replacement: standard.preferredReplacement } });
        addEdge({ id: `edge-standard-${project.id}-${node.id}-${standard.id}`, sourceId: technologyId, targetId: sid, kind: 'governed-by', label: 'governed by', metadata: { standardId: standard.id } });
      }
    });
  });

  report.dependencyGraph.dependencies.forEach((dependency, index) => {
    const edgeId = `edge-dependency-${dependency.id}`;
    addEdge({ id: edgeId, sourceId: projectNodeId(dependency.sourceProjectId), targetId: projectNodeId(dependency.targetProjectId), kind: 'depends-on', label: dependency.kind, metadata: { dependencyId: dependency.id, criticality: dependency.criticality, dataClassification: dependency.dataClassification } });
    if (dependency.criticality === 'high') {
      const dependencyNodeId = `portfolio-dependency-${dependency.id}`;
      addNode({ id: dependencyNodeId, kind: 'dependency', label: dependency.interfaceName, summary: `${dependency.kind} · ${dependency.dataClassification} · ${dependency.criticality}`, x: 680, y: 500 + index * 85, severity: 'SIGNIFICANT', metadata: { dependencyId: dependency.id } });
      addEdge({ id: `edge-dependency-node-${dependency.id}`, sourceId: dependencyNodeId, targetId: projectNodeId(dependency.targetProjectId), kind: 'affected-by', label: 'blast radius', metadata: {} });
    }
  });

  report.reuse.duplicateCandidates.slice(0, 5).forEach((candidate, index) => {
    const id = `reuse-${index}`;
    addNode({ id, kind: 'reuse', label: 'Reuse candidate', summary: candidate.recommendation, x: 1040, y: 520 + index * 82, score: candidate.projectIds.length * 20, metadata: { signature: candidate.signature, labels: candidate.labels } });
    for (const projectId of candidate.projectIds) addEdge({ id: `edge-reuse-${index}-${projectId}`, sourceId: projectNodeId(projectId), targetId: id, kind: 'reuses', label: 'similar', metadata: { signature: candidate.signature } });
  });

  report.roadmap.slice(0, 6).forEach((item, index) => {
    const id = `investment-${item.id}`;
    addNode({ id, kind: 'investment', label: item.title, summary: `${item.priority} · ${item.category} · ${item.estimatedEffortDays} days`, x: 1320, y: 520 + index * 92, score: item.priority === 'now' ? 100 : item.priority === 'next' ? 70 : 40, severity: item.priority === 'now' ? 'SIGNIFICANT' : undefined, metadata: { category: item.category, estimatedAnnualBenefit: item.estimatedAnnualBenefit } });
    for (const projectId of item.projectIds) if (seen.has(projectNodeId(projectId))) addEdge({ id: `edge-investment-${item.id}-${projectId}`, sourceId: projectNodeId(projectId), targetId: id, kind: 'prioritizes', label: item.priority, metadata: { recommendationId: item.id } });
  });

  return {
    id: `portfolio-visual-${portfolioId}`,
    title: 'Portfolio architecture intelligence model',
    description: 'Interactive cross-project model of business ownership, dependencies, standards, risks, reuse and investment priorities.',
    generatedAt: report.generatedAt,
    knowledgeReleaseId: 'AKR-0.10.60',
    nodes,
    edges,
    focusNodeIds: focusProjectIds.map(projectNodeId).filter((id) => seen.has(id)),
    summary: { projects: scoped.length, standards: catalog.technologyStandards.length, dependencies: report.dependencyGraph.dependencies.length, risks: report.riskHeatmap.filter((item) => item.riskBand !== 'low').length, investments: report.roadmap.length },
  };
}

function impactedProjectsForStandardChange(projects: ArchitectureProject[], catalog: EnterpriseArchitectureCatalog, change: EnterpriseStandardChange, graph = buildPortfolioDependencyGraph(projects)): StandardsImpactProject[] {
  const standard = catalog.technologyStandards.find((item) => item.id === change.standardId);
  if (!standard) return [];
  const scoped = projects.filter((project) => project.tenantId === catalog.tenantId);
  return scoped.map((project) => {
    const affectedNodes = project.nodes.filter((node) => ['TechnologyProduct', 'TechnologyComponent', 'Runtime', 'DeployableUnit'].includes(node.kind) && activeStandardForNode(project, catalog.technologyStandards, node.id)?.id === change.standardId);
    if (!affectedNodes.length) return null;
    const centrality = graph.centrality.find((entry) => entry.projectId === project.id) ?? { inbound: 0, outbound: 0, score: 0 };
    const activeExceptionIds = project.technologyStandardExceptions.filter((exception) => exception.standardId === change.standardId && exception.status === 'active').map((exception) => exception.id);
    const base = affectedNodes.length * 15 + centrality.inbound * 12 + centrality.outbound * 5 + activeExceptionIds.length * 8;
    const statusMultiplier = change.changeType === 'prohibit' || change.targetStatus === 'prohibited' ? 1.8 : change.changeType === 'deprecate' || change.targetStatus === 'deprecated' ? 1.35 : change.changeType === 'restrict' ? 1.15 : 1;
    const riskScore = clamp(Math.round(base * statusMultiplier * criticalityWeight[project.portfolio.criticality]));
    const actions = [
      change.replacementTechnology || standard.preferredReplacement ? `Prepare migration path to ${change.replacementTechnology ?? standard.preferredReplacement}.` : 'Confirm target technology or approve an enterprise exception.',
      'Create architecture decision record for the standard change impact.',
      'Run conformance evidence after remediation implementation.',
    ];
    if (centrality.inbound > 0) actions.push('Coordinate dependent consumers before implementation cutover.');
    return {
      projectId: project.id,
      projectName: project.name,
      owner: project.portfolio.owner,
      criticality: project.portfolio.criticality,
      businessUnit: project.portfolio.businessUnit,
      affectedNodeIds: affectedNodes.map((node) => node.id),
      affectedTechnologies: affectedNodes.map((node) => technologyLabel(project, node.id)),
      dependencyFanIn: centrality.inbound,
      dependencyFanOut: centrality.outbound,
      activeExceptionIds,
      riskScore,
      impactLevel: riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'moderate' : 'low',
      actions,
    };
  }).filter((item): item is StandardsImpactProject => Boolean(item)).sort((a, b) => b.riskScore - a.riskScore);
}

function migrationWaves(affected: StandardsImpactProject[]): StandardsMigrationWave[] {
  const wave1 = affected.filter((item) => item.impactLevel === 'critical' || item.dependencyFanIn >= 2);
  const wave2 = affected.filter((item) => item.impactLevel === 'high' && !wave1.some((candidate) => candidate.projectId === item.projectId));
  const wave3 = affected.filter((item) => !wave1.some((candidate) => candidate.projectId === item.projectId) && !wave2.some((candidate) => candidate.projectId === item.projectId));
  const waves = [
    { id: 'wave-1-critical-dependency', title: 'Wave 1 — dependency-critical remediation', entries: wave1, rationale: 'Start with high blast-radius or mission-critical projects so downstream teams can coordinate safely.', prerequisites: ['Architecture board decision approved', 'Consumer communication plan agreed'] },
    { id: 'wave-2-high-risk-modernization', title: 'Wave 2 — high-risk modernization', entries: wave2, rationale: 'Resolve projects with high direct impact after shared dependency risks are controlled.', prerequisites: ['Target technology platform available', 'Migration runbook reviewed'] },
    { id: 'wave-3-tail-cleanup', title: 'Wave 3 — tail cleanup and exception closure', entries: wave3, rationale: 'Close remaining low/moderate usage and retire temporary exceptions.', prerequisites: ['Exception expiry schedule published'] },
  ];
  return waves.filter((wave) => wave.entries.length).map((wave) => ({
    id: wave.id,
    title: wave.title,
    projectIds: wave.entries.map((entry) => entry.projectId),
    sequencingRationale: wave.rationale,
    estimatedEffortDays: wave.entries.reduce((sum, entry) => sum + Math.max(8, entry.affectedNodeIds.length * 10 + entry.dependencyFanIn * 5), 0),
    prerequisites: wave.prerequisites,
    humanApprovalRequired: true as const,
  }));
}

export function analyseEnterpriseStandardsImpact(
  projects: ArchitectureProject[],
  catalog: EnterpriseArchitectureCatalog,
  standardChange: EnterpriseStandardChange,
): EnterpriseStandardsImpactAnalysis {
  if (catalog.technologyStandards.every((standard) => standard.id !== standardChange.standardId)) throw new Error('STANDARD_NOT_FOUND');
  const scoped = projects.filter((project) => project.tenantId === catalog.tenantId);
  const dependencyGraph = buildPortfolioDependencyGraph(scoped);
  const affectedProjects = impactedProjectsForStandardChange(scoped, catalog, standardChange, dependencyGraph);
  const affectedIds = new Set(affectedProjects.map((item) => item.projectId));
  const affectedDependencyIds = dependencyGraph.dependencies.filter((dependency) => affectedIds.has(dependency.sourceProjectId) || affectedIds.has(dependency.targetProjectId)).map((dependency) => dependency.id);
  const waves = migrationWaves(affectedProjects);
  const visualModel = buildPortfolioVisualModel(scoped, catalog, buildPortfolioIntelligence(scoped, catalog), [...affectedIds]);
  const standard = catalog.technologyStandards.find((item) => item.id === standardChange.standardId)!;
  const affectedTech = new Set(affectedProjects.flatMap((project) => project.affectedTechnologies));
  const totalEffort = waves.reduce((sum, wave) => sum + wave.estimatedEffortDays, 0);
  return {
    id: `standards-impact-${standardChange.id}`,
    generatedAt: new Date().toISOString(),
    portfolioId: scoped[0]?.portfolio.portfolioId ?? 'portfolio-unassigned',
    standardChange,
    affectedProjects,
    affectedDependencyIds,
    affectedBusinessUnits: [...new Set(affectedProjects.map((project) => project.businessUnit))].sort(),
    migrationWaves: waves,
    decisionPackage: {
      title: `Enterprise standard change: ${standard.technologyName}`,
      context: `${standard.technologyName} is currently ${standard.status}. Proposed change ${standardChange.changeType}${standardChange.targetStatus ? ` to ${standardChange.targetStatus}` : ''} affects ${affectedProjects.length} project(s).`,
      decisionRequired: 'Approve the standard lifecycle change, migration waves, exception treatment and target replacement posture before implementation begins.',
      consequences: [
        `${affectedProjects.length} project(s) require architecture review or implementation action.`,
        `${affectedDependencyIds.length} cross-project dependency relationship(s) may need consumer coordination.`,
        'No project model or repository is mutated automatically by this analysis.',
      ],
      evidence: ['AKR-0.10.60', catalog.id, catalog.version, ...standard.evidenceIds],
    },
    visualModel,
    governance: { reviewRequired: true, automaticMutationAllowed: false, candidateKnowledgeExcluded: true, knowledgeReleaseId: 'AKR-0.10.60' },
    summary: { affectedProjects: affectedProjects.length, criticalImpacts: affectedProjects.filter((item) => item.impactLevel === 'critical').length, affectedTechnologies: affectedTech.size, estimatedEffortDays: totalEffort },
  };
}

export function portfolioIntelligencePlatformRelease() {
  return {
    releaseId: 'AIW-0.10.0-alpha.4',
    version: '0.10.0-alpha.4',
    sprint: '8.7.4-portfolio-intelligence-standards-impact',
    status: 'implemented-alpha',
    knowledgeReleaseId: 'AKR-0.10.60',
    basedOn: 'AIW-0.10.0-alpha.3',
    capabilities: {
      crossProjectDependencyGraph: true,
      enterpriseStandardsImpactAnalysis: true,
      standardsBlastRadiusAssessment: true,
      migrationWavePlanning: true,
      portfolioVisualModel: true,
      businessUnitPortfolioOwnership: true,
      technologyFragmentationAnalysis: true,
      buildingBlockReuseDiscovery: true,
      portfolioInvestmentRoadmap: true,
      humanApprovedStandardChangeGovernance: true,
      automaticProjectMutationDisabled: true,
      deterministicOfflinePortfolioAnalysis: true,
    },
    portfolioBoundary: 'AIW identifies affected projects, dependencies, technologies and migration waves. It does not automatically change enterprise standards, project models or repositories.',
    governanceBoundary: 'Portfolio intelligence is produced from tenant-scoped projects, approved knowledge release AKR-0.10.60 and the enterprise catalog. Candidate knowledge remains excluded from production recommendations.',
  };
}
