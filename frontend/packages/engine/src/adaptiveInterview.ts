import type { ArchitectureProject, ArchitectureStage } from '@aiw/domain';

export interface AdaptiveArchitectureQuestion {
  id: string;
  stage: ArchitectureStage;
  question: string;
  whyItMatters: string;
  answerType: 'text' | 'number' | 'boolean' | 'single-select' | 'multi-select';
  options?: string[];
  priority: 'critical' | 'high' | 'medium';
  linkedQualityAttributes: string[];
  creates: Array<'objective' | 'constraint' | 'assumption' | 'quality-scenario' | 'decision'>;
}

export interface AdaptiveInterviewResult {
  generatedAt: string;
  stage: ArchitectureStage;
  completeness: number;
  uncertaintyAreas: string[];
  questions: AdaptiveArchitectureQuestion[];
}

function hasScenario(project: ArchitectureProject, attributeId: string): boolean {
  return project.qualityScenarios.some((scenario) => scenario.attributeId === attributeId && scenario.responseMeasure.trim().length > 0);
}

function hasPriority(project: ArchitectureProject, attributeId: string): boolean {
  return project.qualityPriorities.some((priority) => priority.attributeId === attributeId && priority.weight >= 3);
}

export function nextArchitectureQuestions(project: ArchitectureProject, limit = 6): AdaptiveInterviewResult {
  const candidates: AdaptiveArchitectureQuestion[] = [];
  const uncertainty = new Set<string>();

  if (!project.objectives.length) {
    uncertainty.add('business outcome');
    candidates.push({ id: 'Q-BUSINESS-OUTCOME', stage: 'designIntent', question: 'What measurable business outcome must this system improve?', whyItMatters: 'Architecture trade-offs cannot be prioritized without a clear outcome.', answerType: 'text', priority: 'critical', linkedQualityAttributes: [], creates: ['objective'] });
  }
  if (!project.qualityPriorities.length) {
    uncertainty.add('quality priorities');
    candidates.push({ id: 'Q-QUALITY-RANKING', stage: 'designIntent', question: 'Which three quality attributes are most important, and which one may be traded away?', whyItMatters: 'Styles and patterns are trade-off profiles rather than universally correct answers.', answerType: 'multi-select', options: ['Availability','Scalability','Latency','Security','Consistency','Modifiability','Deployability','Cost efficiency','Operability'], priority: 'critical', linkedQualityAttributes: ['all'], creates: ['quality-scenario'] });
  }

  for (const attribute of project.qualityPriorities.filter((item) => item.weight >= 4)) {
    if (!hasScenario(project, attribute.attributeId)) {
      uncertainty.add(`${attribute.attributeId} scenario`);
      candidates.push({ id: `Q-SCENARIO-${attribute.attributeId}`, stage: 'designIntent', question: `What measurable scenario defines acceptable ${attribute.attributeId}?`, whyItMatters: 'A quality attribute without stimulus, environment and response measure cannot be tested or used reliably in recommendations.', answerType: 'text', priority: 'critical', linkedQualityAttributes: [attribute.attributeId], creates: ['quality-scenario'] });
    }
  }

  if (project.context.teamSize === undefined) {
    uncertainty.add('team topology');
    candidates.push({ id: 'Q-TEAM-SIZE', stage: 'designIntent', question: 'How many delivery teams will independently own and deploy parts of the solution?', whyItMatters: 'Distribution and service autonomy must be justified by real ownership boundaries.', answerType: 'number', priority: 'high', linkedQualityAttributes: ['deployability','modifiability','operationalComplexity'], creates: ['constraint'] });
  }
  if (project.context.operationalMaturity === undefined) {
    uncertainty.add('operational maturity');
    candidates.push({ id: 'Q-OPS-MATURITY', stage: 'designIntent', question: 'How mature are deployment automation, observability, incident response and platform operations?', whyItMatters: 'Operationally complex styles can score well on scalability but fail in execution.', answerType: 'single-select', options: ['1 - basic','2 - developing','3 - capable','4 - mature','5 - advanced'], priority: 'high', linkedQualityAttributes: ['operability','availability','deployability'], creates: ['constraint'] });
  }

  if (project.activeStage === 'logicalApplication') {
    if (!project.nodes.some((node) => node.kind === 'Domain')) {
      uncertainty.add('domain boundaries');
      candidates.push({ id: 'Q-DOMAIN-BOUNDARIES', stage: 'logicalApplication', question: 'Which business capabilities change together, share language and require the same transactional consistency?', whyItMatters: 'These signals help identify cohesive domain and service boundaries.', answerType: 'text', priority: 'critical', linkedQualityAttributes: ['modifiability','consistency'], creates: ['decision'] });
    }
    if (!project.constraints.some((item) => /consisten|transaction/i.test(item)) && !hasPriority(project, 'consistency')) {
      uncertainty.add('consistency needs');
      candidates.push({ id: 'Q-CONSISTENCY', stage: 'logicalApplication', question: 'Which business operations require immediate consistency, and where is delayed convergence acceptable?', whyItMatters: 'Consistency scope strongly influences boundaries, interaction style and data patterns.', answerType: 'text', priority: 'critical', linkedQualityAttributes: ['consistency','availability','latency'], creates: ['constraint','decision'] });
    }
  }

  if (project.activeStage === 'applicationRealization') {
    const logicalServices = project.nodes.filter((node) => node.kind === 'LogicalService');
    const mapped = new Set(project.nodes.flatMap((node) => node.lineageFrom));
    if (logicalServices.some((node) => !mapped.has(node.id))) {
      uncertainty.add('realization mapping');
      candidates.push({ id: 'Q-REALIZATION', stage: 'applicationRealization', question: 'Which logical responsibilities must be independently deployed, scaled or owned?', whyItMatters: 'Deployable boundaries should follow independent change and operating needs, not arbitrary decomposition.', answerType: 'text', priority: 'high', linkedQualityAttributes: ['deployability','scalability','modifiability'], creates: ['decision'] });
    }
  }

  if (project.activeStage === 'logicalTechnology') {
    const hasAsync = project.edges.some((edge) => edge.kind === 'publishes' || edge.kind === 'subscribes' || edge.properties.protocolStyle === 'asynchronous');
    if (hasAsync && !project.decisions.some((decision) => /delivery|duplicate|idempot/i.test(`${decision.title} ${decision.decision}`))) {
      uncertainty.add('messaging semantics');
      candidates.push({ id: 'Q-MESSAGING-SEMANTICS', stage: 'logicalTechnology', question: 'What delivery, ordering, duplicate-handling, replay and retention semantics are required?', whyItMatters: 'A broker choice is incomplete until its behavioural guarantees and failure handling are explicit.', answerType: 'text', priority: 'critical', linkedQualityAttributes: ['reliability','consistency','recoverability'], creates: ['decision'] });
    }
  }

  if (project.activeStage === 'physicalTechnology') {
    if (hasPriority(project, 'availability') && !project.decisions.some((decision) => /failure domain|failover|recovery/i.test(`${decision.title} ${decision.decision}`))) {
      uncertainty.add('failure-domain strategy');
      candidates.push({ id: 'Q-FAILURE-DOMAINS', stage: 'physicalTechnology', question: 'Which failures must the system survive, and what recovery time and data-loss limits apply?', whyItMatters: 'Replica and zone counts should be derived from explicit failure scenarios.', answerType: 'text', priority: 'critical', linkedQualityAttributes: ['availability','recoverability'], creates: ['quality-scenario','decision'] });
    }
  }

  const priorityWeight = { critical: 3, high: 2, medium: 1 } as const;
  const questions = candidates.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]).slice(0, limit);
  const expected = Math.max(6, candidates.length + 6);
  const completeness = Math.max(0, Math.min(100, Math.round(((expected - candidates.length) / expected) * 100)));
  return { generatedAt: new Date().toISOString(), stage: project.activeStage, completeness, uncertaintyAreas: [...uncertainty], questions };
}
