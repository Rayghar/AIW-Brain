import type { ArchitectureProject, ArchitectureStyleRecord } from '@aiw/domain';

export interface RecommendationCalibrationRule {
  id: string;
  explanation: string;
  delta: number;
  applies: (style: ArchitectureStyleRecord, project: ArchitectureProject) => boolean;
}

function traits(style: ArchitectureStyleRecord): Set<string> {
  return new Set(style.traits ?? []);
}

export const recommendationCalibrationRules: RecommendationCalibrationRule[] = [
  {
    id: 'CAL-SMALL-TEAM-DISTRIBUTED',
    explanation: 'Small teams carry disproportionate coordination and operating cost for distributed styles.',
    delta: -8,
    applies: (style, project) => { const size = project.context.teamSize ?? 0; return size > 0 && size < 10 && traits(style).has('distributed'); },
  },
  {
    id: 'CAL-LOW-MATURITY-HIGH-OPS',
    explanation: 'Low operational maturity increases deployment, observability and incident-response risk.',
    delta: -7,
    applies: (style, project) => (project.context.operationalMaturity ?? 3) <= 2 && traits(style).has('high-operational-overhead'),
  },
  {
    id: 'CAL-LOW-ARCH-EXPERIENCE-DISTRIBUTED',
    explanation: 'Limited architecture experience makes distributed failure modes, ownership and interface governance harder to sustain.',
    delta: -6,
    applies: (style, project) => (project.context.architectureExperience ?? 3) <= 2 && traits(style).has('distributed'),
  },
  {
    id: 'CAL-BUDGET-HIGH-OPS',
    explanation: 'High budget sensitivity penalizes duplicated platform and operating overhead.',
    delta: -5,
    applies: (style, project) => (project.context.budgetSensitivity ?? 3) >= 4 && traits(style).has('high-operational-overhead'),
  },
  {
    id: 'CAL-SHORT-HORIZON-COHESIVE',
    explanation: 'A short delivery horizon favors a cohesive deployable with explicit internal boundaries.',
    delta: 4,
    applies: (style, project) => (project.context.deliveryHorizonMonths ?? 12) <= 4 && (traits(style).has('cohesive-deployment') || traits(style).has('evolutionary')),
  },
  {
    id: 'CAL-MODERNIZATION-EVOLUTIONARY',
    explanation: 'Incremental modernization favors styles that preserve reversibility and allow staged boundary extraction.',
    delta: 5,
    applies: (style, project) => ['incremental-modernization','migration','coexistence'].includes(project.context.transitionState ?? '') && traits(style).has('evolutionary'),
  },
  {
    id: 'CAL-HIGH-REVERSIBILITY-EVOLUTIONARY',
    explanation: 'A high reversibility preference favors designs that can evolve without irreversible platform commitments.',
    delta: 3,
    applies: (style, project) => (project.context.reversibilityPreference ?? 3) >= 4 && traits(style).has('evolutionary'),
  },
  {
    id: 'CAL-RESTRICTED-DATA-DISTRIBUTION',
    explanation: 'Restricted data increases the security, lineage and consistency burden of distributing state and processing.',
    delta: -4,
    applies: (style, project) => project.context.dataSensitivity === 'restricted' && traits(style).has('distributed'),
  },
  {
    id: 'CAL-SOVEREIGNTY-PROVIDER-DEPENDENCE',
    explanation: 'Sovereignty or portability constraints reduce the suitability of provider-dependent execution models.',
    delta: -8,
    applies: (style, project) => (project.context.sovereigntyRequirements?.length ?? 0) > 0 && traits(style).has('provider-dependent'),
  },
  {
    id: 'CAL-RAPID-CADENCE-INDEPENDENT-DEPLOYMENT',
    explanation: 'Frequent independent change can justify deployable autonomy when the organisation can operate it.',
    delta: 4,
    applies: (style, project) => ['daily','weekly'].includes(project.context.changeCadence ?? '') && (project.context.operationalMaturity ?? 3) >= 3 && traits(style).has('independent-deployment'),
  },
  {
    id: 'CAL-MANAGED-SUPPORT-MANAGED-RUNTIME',
    explanation: 'A managed-service support model modestly favors managed runtimes where portability constraints allow them.',
    delta: 3,
    applies: (style, project) => project.context.supportModel === 'managed-service' && traits(style).has('managed-runtime'),
  },

  {
    id: 'CAL-HIGH-REGULATORY-DISTRIBUTED',
    explanation: 'High regulatory exposure increases evidence, control, lineage and operating burdens across distributed boundaries.',
    delta: -4,
    applies: (style, project) => project.context.regulatoryExposure === 'high' && traits(style).has('distributed'),
  },
  {
    id: 'CAL-LOW-CHANGE-READINESS-AUTONOMY',
    explanation: 'Low organisational change readiness reduces the practical value of independently deployable services and increases coordination risk.',
    delta: -5,
    applies: (style, project) => (project.context.organizationalChangeReadiness ?? 3) <= 2 && traits(style).has('independent-deployment'),
  },
  {
    id: 'CAL-HIGH-REVERSIBILITY-PROVIDER-DEPENDENCE',
    explanation: 'A strong reversibility requirement penalizes execution models with provider-specific runtime and event semantics.',
    delta: -5,
    applies: (style, project) => (project.context.reversibilityPreference ?? 3) >= 4 && traits(style).has('provider-dependent'),
  },
  {
    id: 'CAL-CENTRAL-OPS-HIGH-OVERHEAD',
    explanation: 'A central-operations support model can become a bottleneck for styles that multiply deployables and operational ownership.',
    delta: -4,
    applies: (style, project) => project.context.supportModel === 'central-operations' && traits(style).has('high-operational-overhead'),
  },
  {
    id: 'CAL-COEXISTENCE-COARSE-BOUNDARIES',
    explanation: 'Coexistence and migration favour explicit coarse-grained boundaries that can wrap legacy capabilities before finer decomposition.',
    delta: 4,
    applies: (style, project) => ['migration','coexistence'].includes(project.context.transitionState ?? '') && (traits(style).has('coarse-grained-services') || traits(style).has('evolutionary')),
  },

  {
    id: 'CAL-REGULATED-FINANCE-PROVIDER-DEPENDENCE',
    explanation: 'Regulated financial and payment workloads require explicit portability, auditability and control evidence before provider-dependent execution is favoured.',
    delta: -7,
    applies: (style, project) => {
      const text = JSON.stringify({ description: project.description, objectives: project.objectives, constraints: project.constraints, requirements: project.requirementsIntelligence }).toLowerCase();
      const financial = /bank|payment|financial|ledger|settlement|transaction|agency banking|wallet/.test(text);
      const governed = project.context.regulatoryExposure === 'high' || project.context.dataSensitivity === 'restricted';
      return financial && governed && traits(style).has('provider-dependent');
    },
  },
  {
    id: 'CAL-REGULATED-FINANCE-COARSE-EVOLUTIONARY',
    explanation: 'Regulated financial solutions benefit from explicit coarse-grained ownership boundaries and reversible evolution before finer distribution is justified.',
    delta: 5,
    applies: (style, project) => {
      const text = JSON.stringify({ description: project.description, objectives: project.objectives, constraints: project.constraints, requirements: project.requirementsIntelligence }).toLowerCase();
      const financial = /bank|payment|financial|ledger|settlement|transaction|agency banking|wallet/.test(text);
      return financial && (traits(style).has('coarse-grained-services') || traits(style).has('evolutionary'));
    },
  },
  {
    id: 'CAL-EVENT-JOURNEY-EVENT-DRIVEN',
    explanation: 'Accepted asynchronous journeys, replay obligations or event contracts provide evidence for event-driven architecture rather than keyword-only preference.',
    delta: 6,
    applies: (style, project) => {
      const text = JSON.stringify({ requirements: project.requirementsIntelligence, interfaces: project.interfaces, decisions: project.decisions }).toLowerCase();
      const eventEvidence = /asynchronous|event|publish|subscribe|replay|outbox|dead.?letter|eventual consistency/.test(text);
      return eventEvidence && (traits(style).has('event-centric') || traits(style).has('asynchronous'));
    },
  },
  {
    id: 'CAL-EVENT-STYLE-WITHOUT-EVIDENCE',
    explanation: 'Event-driven architecture is penalized when no accepted journey, interface or decision demonstrates asynchronous or replay semantics.',
    delta: -6,
    applies: (style, project) => {
      const text = JSON.stringify({ requirements: project.requirementsIntelligence, interfaces: project.interfaces, decisions: project.decisions }).toLowerCase();
      const eventEvidence = /asynchronous|event|publish|subscribe|replay|outbox|dead.?letter|eventual consistency/.test(text);
      return !eventEvidence && (traits(style).has('event-centric') || traits(style).has('asynchronous'));
    },
  },
  {
    id: 'CAL-DATA-MESH-REQUIRES-DOMAIN-GOVERNANCE',
    explanation: 'Data Mesh requires explicit domain data ownership, federated governance and product accountability; analytics demand alone is insufficient.',
    delta: -8,
    applies: (style, project) => {
      if (!traits(style).has('data-mesh')) return false;
      const text = JSON.stringify({ description: project.description, objectives: project.objectives, constraints: project.constraints, requirements: project.requirementsIntelligence, nodes: project.nodes }).toLowerCase();
      const ownership = /data product|domain data owner|federated governance|data contract|domain-owned data/.test(text);
      return !ownership;
    },
  },
  {
    id: 'CAL-DATA-MESH-DOMAIN-GOVERNANCE-EVIDENCE',
    explanation: 'Explicit domain data ownership, data-product accountability and federated governance provide evidence for Data Mesh.',
    delta: 6,
    applies: (style, project) => {
      if (!traits(style).has('data-mesh')) return false;
      const text = JSON.stringify({ description: project.description, objectives: project.objectives, constraints: project.constraints, requirements: project.requirementsIntelligence, nodes: project.nodes }).toLowerCase();
      return /data product|domain data owner|federated governance|data contract|domain-owned data/.test(text);
    },
  },
  {
    id: 'CAL-SCALE-ELASTIC-TRAIT',
    explanation: 'Validated highly variable demand favors styles designed for elastic execution.',
    delta: 5,
    applies: (style, project) => {
      const text = [project.description, ...project.objectives, ...project.constraints].join(' ').toLowerCase();
      const variable = ['bursty','unpredictable'].includes(project.context.peakLoadVariability ?? '') || /bursty|spiky|variable load|extreme scale|autoscal/.test(text);
      return traits(style).has('elastic') && variable;
    },
  },
];
