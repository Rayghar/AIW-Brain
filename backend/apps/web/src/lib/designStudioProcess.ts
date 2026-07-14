import { createDesignLibrary, type ArchitectureProject, type ArchitectureStage, type DesignLibraryRecord, type KnowledgeLibrary } from '@aiw/domain';

export type DesignProcessStepStatus = 'ready' | 'active' | 'blocked' | 'done';

export type DesignProcessStep = {
  id: string;
  label: string;
  description: string;
  status: DesignProcessStepStatus;
  action: string;
};

export type StageObjectFamily = {
  label: string;
  purpose: string;
  recordIds: string[];
};

export type StageDesignProcess = {
  stage: ArchitectureStage;
  title: string;
  principle: string;
  sequence: DesignProcessStep[];
  preferredStyleIds: string[];
  patternEmphasis: string[];
  objectFamilies: StageObjectFamily[];
  interfaceFocus: string[];
  completionEvidence: string[];
  forceQuestions: string[];
  decisionOrder: string[];
};

const styleToComponents: Record<string, Partial<Record<ArchitectureStage, string[]>>> = {
  'STYLE-LAYERED': {
    logicalApplication: ['COMP-ACTOR', 'COMP-DOMAIN', 'COMP-LOGICAL-SERVICE', 'COMP-EXTERNAL-SYSTEM'],
    applicationRealization: ['COMP-MODULE', 'COMP-API', 'COMP-IAM-CONTROL', 'COMP-RELATIONAL-DATA'],
    logicalTechnology: ['COMP-API-MANAGEMENT', 'COMP-RELATIONAL-DATA', 'COMP-OBSERVABILITY'],
    physicalTechnology: ['COMP-RUNTIME', 'COMP-DATA-STORE', 'COMP-DEPLOYMENT-NODE'],
  },
  'STYLE-MODULAR-MONOLITH': {
    logicalApplication: ['COMP-DOMAIN', 'COMP-LOGICAL-SERVICE', 'COMP-EVENT', 'COMP-EXTERNAL-SYSTEM'],
    applicationRealization: ['COMP-DEPLOYABLE', 'COMP-MODULE', 'COMP-API', 'COMP-IAM-CONTROL'],
    logicalTechnology: ['COMP-RELATIONAL-DATA', 'COMP-CACHE', 'COMP-OBSERVABILITY'],
    physicalTechnology: ['COMP-RUNTIME', 'COMP-DATA-STORE', 'COMP-DEPLOYMENT-NODE'],
  },
  'STYLE-SERVICE-BASED': {
    logicalApplication: ['COMP-ACTOR', 'COMP-DOMAIN', 'COMP-LOGICAL-SERVICE', 'COMP-EXTERNAL-SYSTEM'],
    applicationRealization: ['COMP-DEPLOYABLE', 'COMP-API', 'COMP-MODULE', 'COMP-IAM-CONTROL'],
    logicalTechnology: ['COMP-API-MANAGEMENT', 'COMP-RELATIONAL-DATA', 'COMP-MESSAGE-BROKER', 'COMP-OBSERVABILITY'],
    physicalTechnology: ['COMP-RUNTIME', 'COMP-DEPLOYMENT-NODE', 'COMP-DATA-STORE', 'COMP-NETWORK-ZONE'],
  },
  'STYLE-MICROSERVICES': {
    logicalApplication: ['COMP-ACTOR', 'COMP-DOMAIN', 'COMP-LOGICAL-SERVICE', 'COMP-EVENT', 'COMP-EXTERNAL-SYSTEM'],
    applicationRealization: ['COMP-DEPLOYABLE', 'COMP-API', 'COMP-WORKER', 'COMP-IAM-CONTROL'],
    logicalTechnology: ['COMP-API-MANAGEMENT', 'COMP-MESSAGE-BROKER', 'COMP-RELATIONAL-DATA', 'COMP-OBSERVABILITY'],
    physicalTechnology: ['COMP-RUNTIME', 'COMP-DEPLOYMENT-NODE', 'COMP-NETWORK-ZONE', 'COMP-DATA-STORE', 'COMP-STREAMING-PRODUCT'],
  },
  'STYLE-EVENT-DRIVEN': {
    logicalApplication: ['COMP-DOMAIN', 'COMP-LOGICAL-SERVICE', 'COMP-EVENT', 'COMP-EXTERNAL-SYSTEM'],
    applicationRealization: ['COMP-DEPLOYABLE', 'COMP-WORKER', 'COMP-EVENT', 'COMP-API'],
    logicalTechnology: ['COMP-MESSAGE-BROKER', 'COMP-OBSERVABILITY', 'COMP-DOCUMENT-DATA'],
    physicalTechnology: ['COMP-STREAMING-PRODUCT', 'COMP-RUNTIME', 'COMP-DEPLOYMENT-NODE', 'COMP-NETWORK-ZONE'],
  },
  'STYLE-SERVERLESS': {
    applicationRealization: ['COMP-DEPLOYABLE', 'COMP-API', 'COMP-WORKER', 'COMP-EVENT'],
    logicalTechnology: ['COMP-API-MANAGEMENT', 'COMP-MESSAGE-BROKER', 'COMP-DOCUMENT-DATA', 'COMP-OBSERVABILITY'],
    physicalTechnology: ['COMP-TECH-PRODUCT', 'COMP-RUNTIME', 'COMP-DATA-STORE', 'COMP-STREAMING-PRODUCT'],
  },
  'STYLE-SOA': {
    logicalApplication: ['COMP-DOMAIN', 'COMP-LOGICAL-SERVICE', 'COMP-EXTERNAL-SYSTEM'],
    applicationRealization: ['COMP-DEPLOYABLE', 'COMP-API', 'COMP-IAM-CONTROL'],
    logicalTechnology: ['COMP-API-MANAGEMENT', 'COMP-MESSAGE-BROKER', 'COMP-OBSERVABILITY'],
    physicalTechnology: ['COMP-RUNTIME', 'COMP-DEPLOYMENT-NODE', 'COMP-NETWORK-ZONE'],
  },
  'STYLE-SPACE-BASED': {
    logicalApplication: ['COMP-DOMAIN', 'COMP-LOGICAL-SERVICE', 'COMP-EVENT'],
    applicationRealization: ['COMP-DEPLOYABLE', 'COMP-WORKER', 'COMP-API'],
    logicalTechnology: ['COMP-CACHE', 'COMP-MESSAGE-BROKER', 'COMP-OBSERVABILITY'],
    physicalTechnology: ['COMP-RUNTIME', 'COMP-DEPLOYMENT-NODE', 'COMP-DATA-STORE', 'COMP-STREAMING-PRODUCT'],
  },
};

const styleToPatterns: Record<string, Partial<Record<ArchitectureStage, string[]>>> = {
  'STYLE-MODULAR-MONOLITH': {
    logicalApplication: ['PAT-HEXAGONAL', 'PAT-CLEAN', 'PAT-ANTI-CORRUPTION', 'PAT-STRANGLER'],
    applicationRealization: ['PAT-HEXAGONAL', 'PAT-CLEAN', 'PAT-OUTBOX'],
  },
  'STYLE-SERVICE-BASED': {
    logicalApplication: ['PAT-STRANGLER', 'PAT-ANTI-CORRUPTION'],
    applicationRealization: ['PAT-API-GATEWAY', 'PAT-BFF', 'PAT-CIRCUIT-BREAKER', 'PAT-RETRY'],
    logicalTechnology: ['PAT-API-GATEWAY', 'PAT-RATE-LIMITER', 'PAT-CACHE-ASIDE'],
  },
  'STYLE-MICROSERVICES': {
    logicalApplication: ['PAT-STRANGLER', 'PAT-ANTI-CORRUPTION', 'PAT-CQRS'],
    applicationRealization: ['PAT-API-GATEWAY', 'PAT-BFF', 'PAT-SAGA', 'PAT-OUTBOX', 'PAT-CIRCUIT-BREAKER', 'PAT-BULKHEAD', 'PAT-DB-PER-SERVICE'],
    logicalTechnology: ['PAT-API-GATEWAY', 'PAT-DLQ', 'PAT-RATE-LIMITER', 'PAT-CACHE-ASIDE'],
    physicalTechnology: ['PAT-SIDECAR', 'PAT-BLUE-GREEN', 'PAT-BULKHEAD', 'PAT-ACTIVE-ACTIVE'],
  },
  'STYLE-EVENT-DRIVEN': {
    logicalApplication: ['PAT-CQRS', 'PAT-ANTI-CORRUPTION'],
    applicationRealization: ['PAT-OUTBOX', 'PAT-SAGA', 'PAT-EVENT-SOURCING', 'PAT-IDEMPOTENT', 'PAT-DLQ'],
    logicalTechnology: ['PAT-DLQ', 'PAT-RETRY', 'PAT-BULKHEAD'],
    physicalTechnology: ['PAT-DLQ', 'PAT-ACTIVE-ACTIVE'],
  },
  'STYLE-SERVERLESS': {
    applicationRealization: ['PAT-API-GATEWAY', 'PAT-BFF', 'PAT-IDEMPOTENT', 'PAT-DLQ'],
    logicalTechnology: ['PAT-API-GATEWAY', 'PAT-RATE-LIMITER', 'PAT-DLQ'],
    physicalTechnology: ['PAT-BLUE-GREEN', 'PAT-ACTIVE-ACTIVE'],
  },
  'STYLE-SOA': {
    logicalApplication: ['PAT-ANTI-CORRUPTION', 'PAT-STRANGLER'],
    applicationRealization: ['PAT-API-GATEWAY', 'PAT-CIRCUIT-BREAKER', 'PAT-RETRY'],
    logicalTechnology: ['PAT-API-GATEWAY', 'PAT-RATE-LIMITER'],
  },
};

const universalDecisionOrder = [
  'Drivers',
  'Forces',
  'Candidate styles',
  'Style decision',
  'Pattern kit',
  'Object kit',
  'Interfaces',
  'Validation',
];

const stageDefaults: Record<ArchitectureStage, Omit<StageDesignProcess, 'stage' | 'sequence'>> = {
  designIntent: {
    title: 'Requirements & Intent',
    principle: 'Clarify the problem before modelling. AIW extracts constraints, stakeholders, assumptions and architecture concerns from the brief before any style or pattern decision is made.',
    preferredStyleIds: [],
    patternEmphasis: [],
    objectFamilies: [],
    interfaceFocus: ['Stakeholders', 'Scope boundaries', 'Constraints', 'Assumptions'],
    completionEvidence: ['Architecture brief approved', 'material questions answered', 'constraints captured'],
    forceQuestions: ['What outcome must the architecture protect?', 'Which constraints are non-negotiable?', 'Where are uncertainty and risk highest?'],
    decisionOrder: ['Intent', 'Stakeholders', 'Constraints', 'Assumptions', 'Questions', 'Handoff'],
  },
  logicalApplication: {
    title: 'Logical Application Architecture',
    principle: 'Drivers and architectural forces come first; then compare candidate styles, accept a primary or hybrid style, select patterns, place logical components and define semantic interfaces.',
    preferredStyleIds: ['STYLE-MODULAR-MONOLITH', 'STYLE-SERVICE-BASED', 'STYLE-MICROSERVICES', 'STYLE-EVENT-DRIVEN'],
    patternEmphasis: ['PAT-STRANGLER', 'PAT-ANTI-CORRUPTION', 'PAT-CQRS', 'PAT-HEXAGONAL'],
    objectFamilies: [
      { label: 'Context objects', purpose: 'Define who/what interacts with the system.', recordIds: ['COMP-ACTOR', 'COMP-EXTERNAL-SYSTEM'] },
      { label: 'Business structure', purpose: 'Establish domains, responsibilities and service boundaries.', recordIds: ['COMP-DOMAIN', 'COMP-LOGICAL-SERVICE'] },
      { label: 'Information flow', purpose: 'Mark key events and information ownership before realization.', recordIds: ['COMP-EVENT'] },
    ],
    interfaceFocus: ['service responsibility', 'data ownership', 'business events', 'external dependency', 'semantic relationship'],
    completionEvidence: ['Drivers understood', 'style decision recorded', 'domains/services defined', 'key relationships present', 'open anti-patterns reviewed'],
    forceQuestions: ['Do bounded contexts need independent change?', 'Is integration mostly synchronous or event-driven?', 'What data ownership boundaries are non-negotiable?', 'Which dependencies require anti-corruption?'],
    decisionOrder: universalDecisionOrder,
  },
  applicationRealization: {
    title: 'Application Realization',
    principle: 'Convert the logical model into buildable/deployable units with owners, contracts, adapters, workers and explicit transaction boundaries.',
    preferredStyleIds: ['STYLE-MODULAR-MONOLITH', 'STYLE-SERVICE-BASED', 'STYLE-MICROSERVICES', 'STYLE-SERVERLESS', 'STYLE-SOA'],
    patternEmphasis: ['PAT-API-GATEWAY', 'PAT-BFF', 'PAT-HEXAGONAL', 'PAT-OUTBOX', 'PAT-SAGA', 'PAT-CIRCUIT-BREAKER'],
    objectFamilies: [
      { label: 'Deployable structure', purpose: 'Map logical responsibilities to deployable units and modules.', recordIds: ['COMP-DEPLOYABLE', 'COMP-MODULE', 'COMP-WORKER'] },
      { label: 'Interfaces', purpose: 'Make API and event contracts explicit.', recordIds: ['COMP-API', 'COMP-EVENT'] },
      { label: 'Controls', purpose: 'Attach security and access-control responsibilities early.', recordIds: ['COMP-IAM-CONTROL'] },
    ],
    interfaceFocus: ['API protocol', 'versioning', 'contract ownership', 'transaction boundary', 'idempotency', 'adapter boundary'],
    completionEvidence: ['Lineage from logical model', 'deployable units named', 'interfaces defined', 'integration risks reviewed'],
    forceQuestions: ['Which responsibilities must deploy independently?', 'Which transactions cross boundaries?', 'Where do adapters protect the core?', 'What contract compatibility is required?'],
    decisionOrder: universalDecisionOrder,
  },
  logicalTechnology: {
    title: 'Logical Technology Architecture',
    principle: 'Choose vendor-neutral capabilities before products. Each runtime, data, messaging, identity or observability choice must be justified by a quality driver.',
    preferredStyleIds: ['STYLE-EVENT-DRIVEN', 'STYLE-MICROSERVICES', 'STYLE-SPACE-BASED', 'STYLE-SERVERLESS', 'STYLE-SOA'],
    patternEmphasis: ['PAT-API-GATEWAY', 'PAT-DLQ', 'PAT-CACHE-ASIDE', 'PAT-BULKHEAD', 'PAT-RATE-LIMITER'],
    objectFamilies: [
      { label: 'Runtime and integration', purpose: 'Select runtime, API, messaging and integration capabilities.', recordIds: ['COMP-API-MANAGEMENT', 'COMP-MESSAGE-BROKER', 'COMP-RUNTIME'] },
      { label: 'Data capabilities', purpose: 'Match persistence to consistency, classification and performance needs.', recordIds: ['COMP-RELATIONAL-DATA', 'COMP-DOCUMENT-DATA', 'COMP-CACHE'] },
      { label: 'Operate and secure', purpose: 'Define observability and identity capabilities as first-class architecture elements.', recordIds: ['COMP-OBSERVABILITY', 'COMP-IAM-CONTROL'] },
    ],
    interfaceFocus: ['capability fit', 'quality-driver trade-off', 'policy obligation', 'operational burden', 'data classification'],
    completionEvidence: ['Capability choices justified', 'security/observability present', 'data/messaging fit documented'],
    forceQuestions: ['Which capabilities protect availability and operability?', 'What consistency and latency do the data paths require?', 'What policy controls must be built into the platform?'],
    decisionOrder: universalDecisionOrder,
  },
  physicalTechnology: {
    title: 'Physical Technology & Deployment',
    principle: 'Bind capabilities to products, zones and runtime topology only after logical technology decisions are justified and reviewable.',
    preferredStyleIds: ['STYLE-MICROSERVICES', 'STYLE-SPACE-BASED', 'STYLE-SERVERLESS', 'STYLE-SOA'],
    patternEmphasis: ['PAT-BLUE-GREEN', 'PAT-ACTIVE-ACTIVE', 'PAT-SIDECAR', 'PAT-DLQ', 'PAT-BULKHEAD'],
    objectFamilies: [
      { label: 'Failure domains', purpose: 'Represent regions, zones, network boundaries and blast-radius isolation.', recordIds: ['COMP-REGION', 'COMP-AVAILABILITY-ZONE', 'COMP-NETWORK-ZONE'] },
      { label: 'Runtime topology', purpose: 'Place runtime services, deployment nodes and concrete products.', recordIds: ['COMP-RUNTIME', 'COMP-DEPLOYMENT-NODE', 'COMP-TECH-PRODUCT'] },
      { label: 'Data and streaming products', purpose: 'Bind data and event capabilities to managed products.', recordIds: ['COMP-DATA-STORE', 'COMP-STREAMING-PRODUCT'] },
    ],
    interfaceFocus: ['zone placement', 'replicas', 'failover path', 'telemetry', 'network trust boundary', 'DR posture'],
    completionEvidence: ['Failure domains visible', 'runtime/product mapping complete', 'resilience and observability reviewed'],
    forceQuestions: ['What failure domains must be isolated?', 'Where is the trust boundary?', 'What should happen during failover?', 'How will operations observe health?'],
    decisionOrder: universalDecisionOrder,
  },
  validationRealization: {
    title: 'Review & SDD Pack',
    principle: 'Review the architecture as a traceable decision system, then generate the SDD pack from approved evidence.',
    preferredStyleIds: [],
    patternEmphasis: [],
    objectFamilies: [],
    interfaceFocus: ['findings', 'ADRs', 'fitness tests', 'waivers', 'handoff checklist'],
    completionEvidence: ['Review blockers resolved', 'ADRs accepted', 'SDD generated', 'artifact pack downloaded'],
    forceQuestions: ['What decisions remain weak?', 'Which quality drivers are unproven?', 'Which obligations are still open?'],
    decisionOrder: ['Findings', 'ADRs', 'Fitness tests', 'Waivers', 'SDD pack', 'Handoff'],
  },
};

function acceptedStyleIds(project: ArchitectureProject, stage: ArchitectureStage): string[] {
  const scoped = project.styleDecisions
    .filter((item) => item.status === 'accepted' && (item.stage === stage || item.stage === 'logicalApplication' || item.stage === 'applicationRealization'))
    .map((item) => item.styleId);
  return [...new Set(scoped)];
}

function acceptedPatternIds(project: ArchitectureProject, stage: ArchitectureStage): string[] {
  return [...new Set(project.patternSelections.filter((item) => item.stage === stage && item.status === 'accepted').map((item) => item.patternId))];
}

function requiredPropertyCompletion(record: DesignLibraryRecord | undefined, nodeProperties: Record<string, unknown>): boolean {
  const required = record?.properties.filter((property) => property.required) ?? [];
  if (!required.length) return true;
  return required.every((property) => {
    const value = nodeProperties[property.key];
    return value !== undefined && value !== null && String(value).trim() !== '';
  });
}

export function styleAlignedRecordIds(project: ArchitectureProject, stage: ArchitectureStage): string[] {
  const styleIds = acceptedStyleIds(project, stage);
  const ids = new Set<string>();
  for (const styleId of styleIds) {
    for (const recordId of styleToComponents[styleId]?.[stage] ?? []) ids.add(recordId);
  }
  for (const recordId of stageDefaults[stage]?.objectFamilies.flatMap((family) => family.recordIds) ?? []) ids.add(recordId);
  return [...ids];
}

export function getStageDesignProcess(project: ArchitectureProject, library: KnowledgeLibrary, stage: ArchitectureStage): StageDesignProcess {
  const defaults = stageDefaults[stage];
  const acceptedStyles = acceptedStyleIds(project, stage);
  const acceptedPatterns = acceptedPatternIds(project, stage);
  const stageNodes = project.nodes.filter((node) => node.stage === stage);
  const stageEdges = project.edges.filter((edge) => edge.stage === stage);
  const driversPresent = project.qualityPriorities.some((priority) => priority.weight >= 3) || project.objectives.length > 0 || project.constraints.length > 0 || stage === 'designIntent' || stage === 'validationRealization';
  const forceInputsPresent = project.constraints.length > 0 || project.assumptions.length > 0 || project.qualityScenarios.length > 0 || stage === 'designIntent' || stage === 'validationRealization';
  const hasStyle = acceptedStyles.length > 0 || defaults.preferredStyleIds.length === 0;
  const candidateStylesKnown = defaults.preferredStyleIds.some((id) => library.architectureStyles.some((style) => style.id === id)) || defaults.preferredStyleIds.length === 0;
  const hasPatterns = acceptedPatterns.length > 0 || defaults.patternEmphasis.length === 0;
  const hasObjects = stageNodes.length > 0 || !defaults.objectFamilies.length;
  const records = new Map(createDesignLibrary(library).map((record) => [record.id, record]));
  const allRequiredAttributesComplete = stageNodes.every((node) => requiredPropertyCompletion(records.get(String(node.properties.libraryRecordId ?? '')), node.properties));
  const hasInterfaces = stageEdges.length > 0 || stage === 'designIntent' || stage === 'validationRealization';
  const stylesKnown = defaults.preferredStyleIds.filter((id) => library.architectureStyles.some((style) => style.id === id));
  const sequence: DesignProcessStep[] = [
    {
      id: 'drivers',
      label: '1. Drivers',
      description: 'Architecture design starts from business outcomes, constraints and quality drivers.',
      status: driversPresent ? 'done' : 'active',
      action: driversPresent ? 'Drivers available for this stage' : 'Capture objectives, constraints or quality priorities first.',
    },
    {
      id: 'forces',
      label: '2. Forces',
      description: 'Identify the tensions that will shape trade-offs before choosing a style.',
      status: !driversPresent ? 'blocked' : forceInputsPresent ? 'done' : 'active',
      action: !driversPresent ? 'Define drivers first.' : forceInputsPresent ? 'Forces available from constraints/scenarios' : 'Answer the force questions in the stage guide.',
    },
    {
      id: 'candidate-styles',
      label: '3. Candidate styles',
      description: 'Compare styles that fit the drivers; do not lock a style before the forces are clear.',
      status: !forceInputsPresent ? 'blocked' : candidateStylesKnown ? 'ready' : 'active',
      action: !forceInputsPresent ? 'Clarify forces first.' : 'Open Library → Styles to compare fit, trade-offs and obligations.',
    },
    {
      id: 'style-decision',
      label: '4. Style decision',
      description: 'Accept a primary or hybrid style that constrains pattern and component choices.',
      status: !forceInputsPresent ? 'blocked' : hasStyle ? 'done' : 'active',
      action: hasStyle ? `${acceptedStyles.length} style decision(s) active` : 'Accept one style before applying stage pattern kits.',
    },
    {
      id: 'pattern-kit',
      label: '5. Pattern kit',
      description: 'Select patterns because they solve architectural forces, not because they are popular.',
      status: !hasStyle ? 'blocked' : hasPatterns ? 'done' : 'active',
      action: !hasStyle ? 'Accept a style first.' : hasPatterns ? `${acceptedPatterns.length} accepted pattern(s)` : 'Review style-aligned patterns and accept only the ones that solve forces.',
    },
    {
      id: 'object-kit',
      label: '6. Object kit',
      description: 'Place governed objects/components from the style-aligned kit onto the canvas.',
      status: !hasStyle ? 'blocked' : hasObjects ? 'done' : 'active',
      action: hasObjects ? `${stageNodes.length} object(s) placed` : 'Drag stage objects from the curated kit or apply a topology template.',
    },
    {
      id: 'interfaces',
      label: '7. Interfaces',
      description: 'Define attributes, ports and semantic relationships so the diagram becomes a reviewable architecture model.',
      status: !hasObjects ? 'blocked' : hasInterfaces && allRequiredAttributesComplete ? 'done' : 'active',
      action: !hasObjects ? 'Place objects first.' : hasInterfaces ? 'Relationships/interfaces present; review required attributes.' : 'Connect objects and complete required attributes in Inspect.',
    },
    {
      id: 'validation',
      label: '8. Validate',
      description: 'Run deterministic and knowledge-backed critique before stage handoff.',
      status: stageNodes.length ? 'ready' : 'blocked',
      action: stageNodes.length ? 'Open Brain/Decision Radar to inspect obligations, anti-patterns and evidence.' : 'Place objects before validation.',
    },
  ];
  return { stage, ...defaults, preferredStyleIds: stylesKnown.length ? stylesKnown : defaults.preferredStyleIds, sequence };
}

export function stagePatternIdsForStyle(library: KnowledgeLibrary, stage: ArchitectureStage, styleIds: string[]): string[] {
  const ids = new Set<string>();
  for (const styleId of styleIds) {
    for (const patternId of styleToPatterns[styleId]?.[stage] ?? []) ids.add(patternId);
  }
  for (const pattern of library.patterns) {
    if (!pattern.applicableStages.includes(stage)) continue;
    if (styleIds.length === 0 || pattern.pairsWellWith.some((pair) => styleIds.includes(pair)) || pattern.requires.some((item) => styleIds.includes(item)) || ids.has(pattern.id)) ids.add(pattern.id);
  }
  return [...ids];
}
