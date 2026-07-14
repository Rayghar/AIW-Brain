import type { ArchitectureProject, KnowledgeLibrary } from '@aiw/domain';
export * from './kernel/index.js';
export * from './authority-boundary/index.js';
export * from './review-studio/index.js';

export type GuidedJourneyStepId = 'brief' | 'drivers' | 'model' | 'patterns' | 'alternatives' | 'adrs' | 'conformance' | 'export';
export type GuidedJourneyStepState = 'blocked' | 'ready' | 'done';

export interface GuidedJourneyStep {
  id: GuidedJourneyStepId;
  label: string;
  state: GuidedJourneyStepState;
  completion: number;
  outcome: string;
  action: string;
  evidence: string[];
}

export interface GuidedJourneyAssessment {
  completion: number;
  readyForArchitecturePack: boolean;
  steps: GuidedJourneyStep[];
  nextStep?: GuidedJourneyStep | undefined;
}

function step(id: GuidedJourneyStepId, label: string, completion: number, outcome: string, action: string, evidence: string[]): GuidedJourneyStep {
  return { id, label, completion: Math.max(0, Math.min(100, Math.round(completion))), state: completion >= 100 ? 'done' : completion > 0 ? 'ready' : 'blocked', outcome, action, evidence };
}

export function evaluateGuidedArchitectureJourney(project: ArchitectureProject): GuidedJourneyAssessment {
  const briefSignals = [project.description?.trim(), ...project.objectives, ...project.constraints, ...project.assumptions].filter((item) => Boolean(item && item.trim().length));
  const highDrivers = project.qualityPriorities.filter((priority) => priority.weight >= 4);
  const logicalNodes = project.nodes.filter((node) => node.stage === 'logicalApplication');
  const acceptedPatterns = project.patternSelections.filter((item) => item.status === 'accepted');
  const acceptedStyles = project.styleDecisions.filter((item) => item.status === 'accepted');
  const conformanceControls = project.policyGates.length + ((project as { conformanceControls?: unknown[] }).conformanceControls?.length ?? 0);
  const exportedAt = (project as unknown as { guidedJourneyExportedAt?: string }).guidedJourneyExportedAt;
  const steps = [
    step('brief', 'Paste or write architecture brief', project.description.trim().length > 80 || briefSignals.length >= 4 ? 100 : briefSignals.length * 20, 'Structured intent, objectives and constraints are available to the kernel.', 'Paste the problem statement and extract architecture drivers.', briefSignals.slice(0, 4)),
    step('drivers', 'Extract and rank drivers', highDrivers.length >= 3 && project.qualityScenarios.length >= 1 ? 100 : highDrivers.length * 25 + project.qualityScenarios.length * 25, 'Quality drivers and at least one measurable scenario are present.', 'Extract drivers or apply a scenario template.', highDrivers.map((item) => `${item.attributeId}:${item.weight}`)),
    step('model', 'Generate first model', logicalNodes.length >= 4 ? 100 : logicalNodes.length * 25, 'The logical architecture has enough components for visual reasoning.', 'Generate the initial model and preview an intelligent layout.', logicalNodes.slice(0, 5).map((node) => node.label)),
    step('patterns', 'Recommend and accept patterns', acceptedPatterns.length >= 1 ? 100 : project.patternSelections.length ? 65 : 10, 'Pattern decisions are explicit and traceable.', 'Review recommendations and accept a supporting pattern.', acceptedPatterns.map((item) => item.patternId)),
    step('alternatives', 'Generate alternatives', acceptedStyles.length >= 1 || project.decisions.some((decision) => /alternative|style|synthesis/i.test(decision.title)) ? 100 : 0, 'Architecture alternatives or accepted style choices have been explored.', 'Open synthesis and compare at least one alternative.', acceptedStyles.map((item) => item.styleId)),
    step('adrs', 'Create ADRs', project.decisions.length >= 2 ? 100 : project.decisions.length * 50, 'Decisions are recorded as reviewable ADRs.', 'Create decision records from accepted style/pattern choices.', project.decisions.slice(0, 3).map((item) => item.title)),
    step('conformance', 'Generate conformance controls', conformanceControls >= 1 ? 100 : project.policyGates.length ? 75 : 0, 'The architecture has controls or gates ready for verification.', 'Generate the conformance plan.', [`${conformanceControls} control(s)`]),
    step('export', 'Export architecture pack', exportedAt ? 100 : project.decisions.length && conformanceControls ? 70 : 0, 'A board-ready architecture pack can be exported.', 'Export the architecture pack for review.', exportedAt ? [`Exported ${exportedAt}`] : []),
  ];
  const completion = Math.round(steps.reduce((sum, item) => sum + item.completion, 0) / steps.length);
  return { completion, readyForArchitecturePack: completion >= 75, steps, nextStep: steps.find((item) => item.state !== 'done') };
}

export interface ExtractedArchitectureDrivers {
  objectives: string[];
  constraints: string[];
  assumptions: string[];
  drivers: Record<string, number>;
  recommendedTemplateHints: string[];
  measurableScenarios: Array<{ attributeId: string; stimulus: string; response: string; responseMeasure: string }>;
}

function has(text: string, terms: string[]): boolean { return terms.some((term) => text.includes(term)); }

export function extractArchitectureDriversFromBrief(brief: string, library?: Pick<KnowledgeLibrary, 'qualityAttributes'>): ExtractedArchitectureDrivers {
  const text = brief.toLowerCase();
  const drivers: Record<string, number> = {};
  const add = (id: string, weight: number) => { drivers[id] = Math.max(drivers[id] ?? 0, weight); };
  if (has(text, ['available', 'availability', 'uptime', 'outage', 'always on'])) add('availability', 5);
  if (has(text, ['recover', 'recovery', 'rto', 'rpo', 'failover', 'disaster'])) add('recoverability', 5);
  if (has(text, ['secure', 'security', 'auth', 'fraud', 'pci', 'zero trust', 'attack'])) add('security', 5);
  if (has(text, ['privacy', 'pii', 'phi', 'gdpr', 'ndpr', 'consent'])) add('privacy', 5);
  if (has(text, ['audit', 'trace', 'reconcile', 'evidence', 'regulator'])) add('auditability', 4);
  if (has(text, ['scale', 'scalable', 'surge', 'peak', 'burst', 'millions'])) add('scalability', 4);
  if (has(text, ['latency', 'p99', 'fast', 'response time', 'throughput'])) add('performance', 4);
  if (has(text, ['integrate', 'api', 'partner', 'third party', 'legacy'])) add('interoperability', 4);
  if (has(text, ['change', 'modular', 'modernize', 'legacy', 'replace', 'strangler'])) add('modifiability', 4);
  if (has(text, ['cost', 'budget', 'optimize', 'finops'])) add('costEfficiency', 3);
  if (Object.keys(drivers).length === 0) add('modifiability', 3);
  const known = new Set((library?.qualityAttributes ?? []).map((attribute) => attribute.id));
  if (known.size) for (const key of Object.keys(drivers)) if (!known.has(key)) delete drivers[key];
  const recommendedTemplateHints: string[] = [];
  if (has(text, ['payment', 'settlement', 'merchant', 'card', 'wallet'])) recommendedTemplateHints.push('TPL-PAYMENTS');
  if (has(text, ['bank', 'account', 'transfer', 'core banking'])) recommendedTemplateHints.push('TPL-DIGITAL-BANKING');
  if (has(text, ['loan', 'lending', 'credit', 'repayment'])) recommendedTemplateHints.push('TPL-LENDING');
  if (has(text, ['tenant', 'saas', 'subscription'])) recommendedTemplateHints.push('TPL-B2B-SAAS');
  if (has(text, ['agent', 'llm', 'ai', 'model route'])) recommendedTemplateHints.push('TPL-AI-AGENTIC');
  if (has(text, ['offline', 'low connectivity', 'edge', 'rural'])) recommendedTemplateHints.push('TPL-LOW-CONNECTIVITY');
  const objectives = [
    brief.trim().split(/[.!?]/).find((sentence) => sentence.trim().length > 30)?.trim() ?? 'Deliver the target digital capability safely and iteratively.',
    'Create an architecture that is explainable, governable and testable before build-out.',
    'Expose key trade-offs and decisions as reviewable ADRs.',
  ];
  const constraints = [
    has(text, ['six month', '6 month', 'deadline', 'timeline']) ? 'Delivery timeline is constrained and must be managed through incremental releases.' : 'Architecture must remain implementable by the available delivery team.',
    has(text, ['regulated', 'pci', 'gdpr', 'ndpr', 'hipaa']) ? 'Regulatory and audit obligations must be explicitly modelled.' : 'Governance obligations must be made explicit before production use.',
    'LLM-generated content is advisory and cannot silently mutate production architecture decisions.',
  ];
  const assumptions = [
    'Architecture decisions will be reviewed by accountable human owners before finalization.',
    'Repository/runtime evidence can be connected later for conformance and drift analysis.',
    'Quality scenarios can be refined with actual workload and recovery targets during review.',
  ];
  const topDriver = Object.entries(drivers).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'modifiability';
  const measurableScenarios = [{
    attributeId: topDriver,
    stimulus: `A production event stresses ${topDriver} expectations`,
    response: 'The system remains within the agreed service and governance boundary',
    responseMeasure: topDriver === 'performance' ? 'p99 <= agreed latency budget at peak load' : topDriver === 'recoverability' ? 'RTO/RPO targets met for critical transactions' : 'Objective evidence captured within the review window',
  }];
  return { objectives, constraints, assumptions, drivers, recommendedTemplateHints, measurableScenarios };
}

export interface ArchitecturePackManifest {
  packageId: string;
  generatedAt: string;
  projectId: string;
  projectName: string;
  contents: string[];
  governance: {
    llmAuthority: 'none';
    candidateKnowledgeInfluence: 'blocked-until-promotion';
    humanApprovalRequired: true;
  };
  counts: { nodes: number; edges: number; drivers: number; scenarios: number; decisions: number; findings: number; controls: number };
}

export function createArchitecturePackManifest(project: ArchitectureProject): ArchitecturePackManifest {
  const controls = project.policyGates.length + ((project as { conformanceControls?: unknown[] }).conformanceControls?.length ?? 0);
  return {
    packageId: `arch-pack-${project.id}-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    projectId: project.id,
    projectName: project.name,
    contents: ['project brief', 'quality drivers', 'architecture model summary', 'accepted style/pattern decisions', 'ADRs', 'conformance controls', 'open findings'],
    governance: { llmAuthority: 'none', candidateKnowledgeInfluence: 'blocked-until-promotion', humanApprovalRequired: true },
    counts: { nodes: project.nodes.length, edges: project.edges.length, drivers: project.qualityPriorities.length, scenarios: project.qualityScenarios.length, decisions: project.decisions.length, findings: project.findings.length, controls },
  };
}

export * from './brain/index.js';

export * from './orchestrator/index.js';
