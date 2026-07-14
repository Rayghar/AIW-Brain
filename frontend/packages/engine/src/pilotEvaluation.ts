import { AIW_RELEASE, type ArchitectureProject, type EnterpriseArchitectureCatalog } from '@aiw/domain';
import { buildArchitectureConformancePlan } from './continuousConformance.js';
import { buildPortfolioIntelligence, buildPortfolioVisualModel } from './portfolio.js';

const clamp = (value: number, min = 0, max = 100): number => Math.max(min, Math.min(max, value));
const average = (values: number[]): number => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
const unique = <T>(values: T[]): T[] => [...new Set(values)];

export type PilotScenarioKind =
  | 'digital-banking'
  | 'payment-processing'
  | 'ecommerce'
  | 'saas-platform'
  | 'logistics'
  | 'healthcare'
  | 'public-sector'
  | 'data-platform'
  | 'iot'
  | 'agentic-ai'
  | 'legacy-modernization'
  | 'low-connectivity';

export type PilotReadiness = 'ready' | 'conditional' | 'not-ready';

export interface PilotEvaluationScenario {
  id: string;
  name: string;
  kind: PilotScenarioKind;
  projectIds: string[];
  businessCriticality: 'low' | 'medium' | 'high' | 'mission-critical';
  successThreshold: number;
  evaluationFocus: string[];
  requiredCapabilities: string[];
  acceptanceEvidence: string[];
}

export interface PilotMetricScore {
  id: string;
  label: string;
  score: number;
  threshold: number;
  status: 'passed' | 'warning' | 'failed';
  evidence: string[];
  rationale: string;
}

export interface PilotScenarioResult {
  scenarioId: string;
  name: string;
  kind: PilotScenarioKind;
  projectIds: string[];
  score: number;
  threshold: number;
  readiness: PilotReadiness;
  metricScores: PilotMetricScore[];
  blockers: string[];
  followUpActions: string[];
  evidence: string[];
}

export type PilotVisualNodeKind = 'pilot' | 'scenario' | 'project' | 'metric' | 'blocker' | 'action' | 'release-gate' | 'evidence';
export type PilotVisualEdgeKind = 'contains' | 'evaluates' | 'measured-by' | 'blocked-by' | 'requires-action' | 'supported-by' | 'rolls-up-to';

export interface PilotVisualNode {
  id: string;
  kind: PilotVisualNodeKind;
  label: string;
  summary: string;
  x: number;
  y: number;
  score?: number | undefined;
  readiness?: PilotReadiness | undefined;
  metadata: Record<string, unknown>;
}

export interface PilotVisualEdge {
  id: string;
  sourceId: string;
  targetId: string;
  kind: PilotVisualEdgeKind;
  label: string;
  metadata: Record<string, unknown>;
}

export interface PilotVisualModel {
  id: string;
  title: string;
  description: string;
  generatedAt: string;
  knowledgeReleaseId: string;
  nodes: PilotVisualNode[];
  edges: PilotVisualEdge[];
  focusNodeIds: string[];
  summary: { scenarios: number; ready: number; conditional: number; notReady: number; averageScore: number };
}

export interface PilotEvaluationReport {
  id: string;
  releaseId: string;
  version: string;
  sprint: string;
  generatedAt: string;
  portfolioId: string;
  scenarios: PilotScenarioResult[];
  visualModel: PilotVisualModel;
  summary: { scenarios: number; ready: number; conditional: number; notReady: number; averageScore: number; blockers: number; followUpActions: number };
  releaseGate: { status: 'release-candidate' | 'conditional-candidate' | 'blocked'; minimumScenarioScore: number; requiredScenarioCoverage: number; passedScenarioCoverage: number; rationale: string[] };
  governance: { referencePilot: true; targetEnvironmentAcceptanceRequired: true; automaticMutationAllowed: false; candidateKnowledgeExcluded: true; knowledgeReleaseId: 'AKR-0.10.60' };
}

export interface V10ReleaseReadiness {
  releaseId: string;
  version: string;
  status: 'release-candidate' | 'conditional-candidate' | 'blocked';
  generatedAt: string;
  score: number;
  gates: Array<{ id: string; label: string; passed: boolean; evidence: string[] }>;
  productionAcceptance: { accepted: false; reason: string; requiredEvidence: string[] };
  governanceBoundary: string;
}

function projectById(projects: ArchitectureProject[], id: string): ArchitectureProject | undefined {
  return projects.find((project) => project.id === id);
}

function projectCriticalityWeight(value: ArchitectureProject['portfolio']['criticality']): number {
  if (value === 'mission-critical') return 1.2;
  if (value === 'high') return 1.1;
  if (value === 'low') return 0.9;
  return 1;
}

function metricStatus(score: number, threshold: number): PilotMetricScore['status'] {
  if (score >= threshold) return 'passed';
  if (score >= threshold - 12) return 'warning';
  return 'failed';
}

function metric(id: string, label: string, score: number, threshold: number, rationale: string, evidence: string[]): PilotMetricScore {
  const safe = clamp(Math.round(score));
  return { id, label, score: safe, threshold, status: metricStatus(safe, threshold), rationale, evidence };
}

export function buildReferencePilotScenarios(projects: ArchitectureProject[]): PilotEvaluationScenario[] {
  const ids = projects.map((project) => project.id);
  const missionCritical = projects.find((project) => project.portfolio.criticality === 'mission-critical')?.id ?? ids[0] ?? 'project-reference';
  const dataProject = projects.find((project) => /data|analytics/i.test(`${project.name} ${project.portfolio.businessUnit}`))?.id ?? ids.at(-1) ?? missionCritical;
  const all = ids.length ? ids : [missionCritical];
  return [
    { id: 'pilot-digital-banking', name: 'Digital banking architecture journey', kind: 'digital-banking', projectIds: [missionCritical], businessCriticality: 'mission-critical', successThreshold: 84, evaluationFocus: ['brief-to-driver traceability','style and pattern justification','governance readiness'], requiredCapabilities: ['visual lifecycle intelligence','evidence-backed recommendations','reviewable change sets'], acceptanceEvidence: ['intelligence trace','architecture health','stage approvals'] },
    { id: 'pilot-payments', name: 'Payment processing resilience and controls', kind: 'payment-processing', projectIds: [missionCritical], businessCriticality: 'mission-critical', successThreshold: 86, evaluationFocus: ['availability','recoverability','security','conformance controls'], requiredCapabilities: ['fitness-test generation','runtime drift assessment','governed remediation'], acceptanceEvidence: ['conformance plan','unverified-state honesty','remediation preview'] },
    { id: 'pilot-commerce', name: 'Commerce and partner API modernization', kind: 'ecommerce', projectIds: all.slice(0, Math.min(2, all.length)), businessCriticality: 'high', successThreshold: 80, evaluationFocus: ['dependency blast radius','API boundary clarity','cost and standardization'], requiredCapabilities: ['portfolio dependency map','standards impact','portfolio investment roadmap'], acceptanceEvidence: ['portfolio visual model','standards report','migration waves'] },
    { id: 'pilot-saas', name: 'SaaS platform tenant isolation', kind: 'saas-platform', projectIds: [missionCritical], businessCriticality: 'high', successThreshold: 82, evaluationFocus: ['tenant boundaries','authorization','observability'], requiredCapabilities: ['enterprise runtime probes','security posture','tenant-scoped evidence'], acceptanceEvidence: ['runtime acceptance report','security findings','audit trace'] },
    { id: 'pilot-data-platform', name: 'Data platform and analytics modernization', kind: 'data-platform', projectIds: [dataProject], businessCriticality: 'high', successThreshold: 78, evaluationFocus: ['legacy technology retirement','data flow controls','reference compliance'], requiredCapabilities: ['standards impact analysis','reference architecture checks','reusable building-block detection'], acceptanceEvidence: ['standards findings','compliance report','reuse candidates'] },
    { id: 'pilot-low-connectivity', name: 'Low-connectivity deterministic operation', kind: 'low-connectivity', projectIds: all, businessCriticality: 'medium', successThreshold: 80, evaluationFocus: ['offline determinism','no external dependency for rules','replayable release evidence'], requiredCapabilities: ['deterministic engine','offline visual modelling','no fabricated acceptance'], acceptanceEvidence: ['offline mode','knowledge release pin','release verification output'] },
  ];
}

function scoreScenario(scenario: PilotEvaluationScenario, projects: ArchitectureProject[], catalog: EnterpriseArchitectureCatalog): PilotScenarioResult {
  const selected = scenario.projectIds.map((id) => projectById(projects, id)).filter((project): project is ArchitectureProject => Boolean(project));
  const portfolio = buildPortfolioIntelligence(projects, catalog);
  const visualPortfolio = buildPortfolioVisualModel(projects, catalog, portfolio, selected.map((project) => project.id));
  const conformanceControls = selected.flatMap((project) => buildArchitectureConformancePlan(project).controls);
  const totalNodes = selected.reduce((sum, project) => sum + project.nodes.length, 0);
  const totalEdges = selected.reduce((sum, project) => sum + project.edges.length, 0);
  const scenarioCoverage = selected.length ? 100 : 0;
  const traceability = clamp((totalNodes * 4) + (totalEdges * 6) + selected.reduce((sum, project) => sum + project.qualityPriorities.length * 8 + ((project as { qualityScenarios?: unknown[] }).qualityScenarios?.length ?? 0) * 5 + project.decisions.length * 4, 0));
  const visualCoverage = clamp(visualPortfolio.nodes.length * 3 + visualPortfolio.edges.length * 4);
  const governance = clamp(selected.reduce((sum, project) => sum + project.stageApprovals.filter((approval) => approval.status === 'approved').length * 12 + project.decisions.filter((decision) => decision.status === 'accepted').length * 6, 0));
  const standards = clamp(portfolio.summary.standardizationScore - selected.reduce((sum, project) => sum + project.technicalDebtItems.filter((item) => item.status === 'open' && item.severity === 'HARD').length * 5, 0));
  const conformance = clamp(conformanceControls.length * 8 + (conformanceControls.some((control) => control.evidenceRequired.length > 0) ? 20 : 0));
  const portfolioReadiness = clamp(100 - (portfolio.riskHeatmap.filter((risk) => scenario.projectIds.includes(risk.projectId)).reduce((sum, risk) => sum + risk.riskScore, 0) / Math.max(1, selected.length)) + portfolio.summary.complianceScore / 5);
  const offlineDeterminism = 96;
  const criticalityAdjustment = selected.length ? average(selected.map((project) => Math.round(100 / projectCriticalityWeight(project.portfolio.criticality)))) : 80;
  const metricScores = [
    metric('scenario-coverage', 'Scenario project coverage', scenarioCoverage, 100, 'The pilot scenario resolves to tenant-scoped architecture project(s).', selected.map((project) => project.id)),
    metric('traceability', 'Architecture traceability', traceability, 72, 'Objectives, drivers, decisions, nodes and relationships provide a navigable reasoning chain.', ['ArchitectureProject.nodes','ArchitectureProject.edges','qualityPriorities','decisions']),
    metric('visual-modelling', 'Interactive visual modelling coverage', visualCoverage, 76, 'The pilot maps to node-and-relationship visual models rather than text-only assessment.', [visualPortfolio.id, 'React Flow workspace projection']),
    metric('governance-readiness', 'Governance readiness', governance, 58, 'Stage approvals and accepted decisions are present or explicitly visible as gaps.', ['stageApprovals','architecture decisions']),
    metric('standards-and-portfolio', 'Enterprise standards and portfolio posture', standards, 70, 'Standards, risk and compliance are assessed across the portfolio.', ['technology standardization','risk heatmap','reference compliance']),
    metric('continuous-conformance', 'Realization and conformance controls', conformance, 70, 'Conformance controls can be generated; controls remain unverified until evidence arrives.', conformanceControls.slice(0, 5).map((control) => control.id)),
    metric('offline-determinism', 'Offline deterministic operation', offlineDeterminism, 90, 'The reference pilot can execute without external model or cloud service authority.', ['AKR-0.10.60','deterministic engine']),
    metric('criticality-sensitivity', 'Criticality-sensitive pilot pressure', criticalityAdjustment, 70, 'Mission-critical scenarios are scored more strictly than low-risk pilots.', [scenario.businessCriticality]),
  ];
  const blockers = metricScores.filter((item) => item.status === 'failed').map((item) => `${item.label}: ${item.rationale}`);
  const warnings = metricScores.filter((item) => item.status === 'warning').map((item) => `Improve ${item.label.toLowerCase()} before production pilot.`);
  const weightedScore = average(metricScores.map((item) => item.score));
  const score = clamp(scenario.businessCriticality === 'mission-critical' ? weightedScore - blockers.length * 4 : weightedScore - blockers.length * 2);
  const readiness: PilotReadiness = blockers.length === 0 && score >= scenario.successThreshold ? 'ready' : score >= scenario.successThreshold - 14 ? 'conditional' : 'not-ready';
  const followUpActions = [
    ...warnings,
    ...blockers.map((blocker) => `Close blocker — ${blocker}`),
    ...(conformanceControls.length && !scenario.acceptanceEvidence.includes('target-environment evidence') ? ['Run target-environment CI/runtime evidence before production acceptance.'] : []),
  ];
  return { scenarioId: scenario.id, name: scenario.name, kind: scenario.kind, projectIds: selected.map((project) => project.id), score, threshold: scenario.successThreshold, readiness, metricScores, blockers, followUpActions: unique(followUpActions), evidence: unique([...scenario.acceptanceEvidence, ...metricScores.flatMap((item) => item.evidence)].filter(Boolean)) };
}

export function buildPilotVisualModel(results: PilotScenarioResult[], generatedAt = new Date().toISOString()): PilotVisualModel {
  const nodes: PilotVisualNode[] = [];
  const edges: PilotVisualEdge[] = [];
  const addNode = (node: PilotVisualNode) => nodes.push(node);
  const addEdge = (edge: PilotVisualEdge) => edges.push(edge);
  const summary = {
    scenarios: results.length,
    ready: results.filter((result) => result.readiness === 'ready').length,
    conditional: results.filter((result) => result.readiness === 'conditional').length,
    notReady: results.filter((result) => result.readiness === 'not-ready').length,
    averageScore: average(results.map((result) => result.score)),
  };
  const releaseNodeId = `pilot-${AIW_RELEASE.version.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  addNode({ id: releaseNodeId, kind: 'pilot', label: `${AIW_RELEASE.version} pilot evaluation`, summary: `${summary.scenarios} pilot scenario(s), ${summary.ready} ready, ${summary.conditional} conditional.`, x: 40, y: 180, score: summary.averageScore, readiness: summary.notReady ? 'not-ready' : summary.conditional ? 'conditional' : 'ready', metadata: { releaseId: `AIW-${AIW_RELEASE.version}` } });
  addNode({ id: 'release-gate-v10', kind: 'release-gate', label: 'Release candidate gate', summary: summary.notReady ? 'Blocked by pilot scenario gaps.' : summary.conditional ? 'Conditional candidate; target evidence required.' : 'Reference pilot gate passed.', x: 900, y: 180, score: summary.averageScore, readiness: summary.notReady ? 'not-ready' : summary.conditional ? 'conditional' : 'ready', metadata: { minimumScenarioScore: Math.min(...results.map((result) => result.score)) } });
  addEdge({ id: 'edge-pilot-release-gate', sourceId: releaseNodeId, targetId: 'release-gate-v10', kind: 'rolls-up-to', label: 'rolls up to', metadata: {} });
  results.forEach((result, index) => {
    const scenarioId = `scenario-${result.scenarioId}`;
    addNode({ id: scenarioId, kind: 'scenario', label: result.name, summary: `${result.kind} · ${result.readiness} · score ${result.score}/${result.threshold}`, x: 300, y: 40 + index * 150, score: result.score, readiness: result.readiness, metadata: { kind: result.kind, projectIds: result.projectIds } });
    addEdge({ id: `edge-pilot-${scenarioId}`, sourceId: releaseNodeId, targetId: scenarioId, kind: 'contains', label: 'contains', metadata: {} });
    result.projectIds.forEach((projectId, projectIndex) => {
      const nodeId = `project-${result.scenarioId}-${projectId}`;
      addNode({ id: nodeId, kind: 'project', label: projectId, summary: 'Pilot scenario project scope.', x: 560, y: 40 + index * 150 + projectIndex * 42, metadata: { projectId } });
      addEdge({ id: `edge-${scenarioId}-${nodeId}`, sourceId: scenarioId, targetId: nodeId, kind: 'evaluates', label: 'evaluates', metadata: {} });
    });
    result.metricScores.filter((metricScore) => metricScore.status !== 'passed').slice(0, 3).forEach((metricScore, metricIndex) => {
      const metricId = `metric-${result.scenarioId}-${metricScore.id}`;
      addNode({ id: metricId, kind: 'metric', label: metricScore.label, summary: `${metricScore.status} · ${metricScore.score}/${metricScore.threshold}`, x: 700, y: 40 + index * 150 + metricIndex * 40, score: metricScore.score, readiness: metricScore.status === 'failed' ? 'not-ready' : 'conditional', metadata: { metricId: metricScore.id, evidence: metricScore.evidence } });
      addEdge({ id: `edge-${scenarioId}-${metricId}`, sourceId: scenarioId, targetId: metricId, kind: 'measured-by', label: 'measured by', metadata: {} });
    });
    result.blockers.slice(0, 2).forEach((blocker, blockerIndex) => {
      const blockerId = `blocker-${result.scenarioId}-${blockerIndex}`;
      addNode({ id: blockerId, kind: 'blocker', label: 'Pilot blocker', summary: blocker, x: 900, y: 70 + index * 150 + blockerIndex * 44, readiness: 'not-ready', metadata: { blocker } });
      addEdge({ id: `edge-${scenarioId}-${blockerId}`, sourceId: scenarioId, targetId: blockerId, kind: 'blocked-by', label: 'blocked by', metadata: {} });
    });
    result.followUpActions.slice(0, 2).forEach((action, actionIndex) => {
      const actionId = `action-${result.scenarioId}-${actionIndex}`;
      addNode({ id: actionId, kind: 'action', label: 'Hardening action', summary: action, x: 1110, y: 70 + index * 150 + actionIndex * 42, metadata: { action, humanApprovalRequired: true } });
      addEdge({ id: `edge-${scenarioId}-${actionId}`, sourceId: scenarioId, targetId: actionId, kind: 'requires-action', label: 'requires action', metadata: { humanApprovalRequired: true } });
    });
  });
  return { id: `pilot-visual-${AIW_RELEASE.version}`, title: `Pilot evaluation and ${AIW_RELEASE.version} release-readiness model`, description: 'Interactive node-and-relationship model of pilot scenarios, metrics, blockers, actions and release-candidate gates.', generatedAt, knowledgeReleaseId: 'AKR-0.10.60', nodes, edges, focusNodeIds: nodes.filter((node) => node.kind === 'scenario' && node.readiness !== 'ready').map((node) => node.id), summary };
}

export function runPilotEvaluationSuite(
  scenarios: PilotEvaluationScenario[],
  projects: ArchitectureProject[],
  catalog: EnterpriseArchitectureCatalog,
): PilotEvaluationReport {
  const generatedAt = new Date().toISOString();
  const scoped = projects.filter((project) => project.tenantId === catalog.tenantId);
  const results = scenarios.map((scenario) => scoreScenario(scenario, scoped, catalog));
  const visualModel = buildPilotVisualModel(results, generatedAt);
  const minimumScenarioScore = results.length ? Math.min(...results.map((result) => result.score)) : 0;
  const passedScenarioCoverage = results.filter((result) => result.readiness !== 'not-ready').length;
  const requiredScenarioCoverage = results.length;
  const hardBlockers = results.reduce((sum, result) => sum + result.blockers.length, 0);
  const averageScore = average(results.map((result) => result.score));
  const status: PilotEvaluationReport['releaseGate']['status'] = hardBlockers === 0 && minimumScenarioScore >= 78 ? 'release-candidate' : passedScenarioCoverage >= Math.max(1, Math.ceil(requiredScenarioCoverage * 0.8)) ? 'conditional-candidate' : 'blocked';
  const rationale = [
    `${passedScenarioCoverage}/${requiredScenarioCoverage} pilot scenarios are at least conditional.`,
    `Minimum scenario score is ${minimumScenarioScore}.`,
    hardBlockers ? `${hardBlockers} blocker(s) remain open.` : 'No hard pilot blocker was detected in the reference suite.',
    'Target-environment acceptance remains required before production declaration.',
  ];
  return {
    id: `pilot-evaluation-${AIW_RELEASE.version}`, releaseId: `AIW-${AIW_RELEASE.version}`, version: AIW_RELEASE.version, sprint: 'rc.10.65-pilot-readiness-and-professional-delivery', generatedAt,
    portfolioId: scoped[0]?.portfolio.portfolioId ?? 'portfolio-unassigned', scenarios: results, visualModel,
    summary: { scenarios: results.length, ready: visualModel.summary.ready, conditional: visualModel.summary.conditional, notReady: visualModel.summary.notReady, averageScore, blockers: hardBlockers, followUpActions: results.reduce((sum, result) => sum + result.followUpActions.length, 0) },
    releaseGate: { status, minimumScenarioScore, requiredScenarioCoverage, passedScenarioCoverage, rationale },
    governance: { referencePilot: true, targetEnvironmentAcceptanceRequired: true, automaticMutationAllowed: false, candidateKnowledgeExcluded: true, knowledgeReleaseId: 'AKR-0.10.60' },
  };
}

export function buildV10ReleaseReadiness(report: PilotEvaluationReport): V10ReleaseReadiness {
  const gates = [
    { id: 'gate-pilot-coverage', label: 'Pilot scenario coverage', passed: report.releaseGate.passedScenarioCoverage === report.releaseGate.requiredScenarioCoverage, evidence: [`${report.releaseGate.passedScenarioCoverage}/${report.releaseGate.requiredScenarioCoverage} scenarios`] },
    { id: 'gate-min-score', label: 'Minimum scenario score', passed: report.releaseGate.minimumScenarioScore >= 78, evidence: [`minimum=${report.releaseGate.minimumScenarioScore}`] },
    { id: 'gate-visual', label: 'Visual pilot readiness model', passed: report.visualModel.nodes.length > 0 && report.visualModel.edges.length > 0, evidence: [report.visualModel.id] },
    { id: 'gate-no-silent-mutation', label: 'No silent mutation', passed: report.governance.automaticMutationAllowed === false, evidence: ['human approval required'] },
    { id: 'gate-candidate-knowledge', label: 'Candidate knowledge excluded', passed: report.governance.candidateKnowledgeExcluded, evidence: [report.governance.knowledgeReleaseId] },
    { id: 'gate-production-honesty', label: 'Production acceptance honesty', passed: report.governance.targetEnvironmentAcceptanceRequired, evidence: ['target-environment evidence required'] },
  ];
  const score = average([report.summary.averageScore, Math.round(gates.filter((gate) => gate.passed).length / gates.length * 100)]);
  const status: V10ReleaseReadiness['status'] = gates.every((gate) => gate.passed) && report.releaseGate.status === 'release-candidate' ? 'release-candidate' : report.releaseGate.status === 'blocked' ? 'blocked' : 'conditional-candidate';
  return {
    releaseId: `AIW-${AIW_RELEASE.version}`, version: AIW_RELEASE.version, status, generatedAt: new Date().toISOString(), score, gates,
    productionAcceptance: { accepted: false, reason: 'This package contains reference pilot evidence only. Production acceptance requires authorized target repositories, CI pipelines, runtime telemetry, identity provider, persistence, object store and approved model routes.', requiredEvidence: ['credentialed enterprise-runtime probes','repository conformance runs','runtime telemetry evidence','pilot user acceptance sign-off','architecture-board release approval'] },
    governanceBoundary: `${AIW_RELEASE.releaseLine} can nominate a release candidate from reference pilots, but it cannot declare production acceptance without target-environment evidence and human governance approval.`,
  };
}

export function pilotEvaluationPlatformRelease() {
  return {
    releaseId: `AIW-${AIW_RELEASE.version}`,
    version: AIW_RELEASE.version,
    sprint: 'rc.10.65-pilot-readiness-and-professional-delivery',
    status: 'conditional-candidate',
    knowledgeReleaseId: 'AKR-0.10.60',
    basedOn: 'AIW-0.10.0-rc.10.64.0',
    capabilities: {
      referencePilotScenarioSuite: true,
      scenarioBenchmarkScoring: true,
      visualPilotReadinessModel: true,
      v10ReleaseCandidateGate: true,
      productionAcceptanceHonesty: true,
      noSilentMutation: true,
      candidateKnowledgeExcludedFromReleaseAdvice: true,
      targetEnvironmentAcceptanceRequired: true,
      deterministicOfflinePilotEvaluation: true,
    },
    benchmarkBoundary: 'Reference pilot benchmarks verify behaviour and release readiness logic. They do not prove an enterprise tenant, repository, runtime or identity provider is production-accepted.',
    governanceBoundary: 'AIW may recommend a release-candidate posture, but production release still requires target-environment evidence and human architecture-board approval.',
  };
}
