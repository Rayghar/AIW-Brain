import type {
  ArchitectureInterface,
  ArchitectureNode,
  ArchitectureProject,
  ArchitectureStage,
  KnowledgeLibrary,
  StageArchitectureExplanation,
  StageClarificationQuestion,
  StageCoAuthorProposal,
  StageCoAuthorTarget,
  StageDraftOperation,
  StageDraftOperationKind,
} from '@aiw/domain';
import type { JsonGenerationRequest, LlmExecutionResult } from './llmGateway.js';

interface LlmJsonGateway {
  generateJson<T>(request: JsonGenerationRequest): Promise<LlmExecutionResult<T>>;
}

const targetToArchitectureStage: Record<StageCoAuthorTarget, ArchitectureStage> = {
  requirements: 'designIntent',
  qualityDrivers: 'designIntent',
  systemContext: 'logicalApplication',
  logicalApplication: 'logicalApplication',
  applicationRealization: 'applicationRealization',
  logicalTechnology: 'logicalTechnology',
  physicalTechnology: 'physicalTechnology',
  reviewAssurance: 'validationRealization',
  sddPack: 'validationRealization',
};

const stageTitles: Record<StageCoAuthorTarget, string> = {
  requirements: 'Requirements & Architecture Intent',
  qualityDrivers: 'Quality Drivers & Measurable Scenarios',
  systemContext: 'System Context & Interaction Boundaries',
  logicalApplication: 'Logical Application Architecture',
  applicationRealization: 'Application Realization',
  logicalTechnology: 'Logical Technology Architecture',
  physicalTechnology: 'Physical Technology & Deployment',
  reviewAssurance: 'Review & Assurance',
  sddPack: 'SDD & Delivery Pack',
};

const stagePurposes: Record<StageCoAuthorTarget, string> = {
  requirements: 'Turn business intent into explicit outcomes, boundaries, constraints, assumptions and questions before solution choices are made.',
  qualityDrivers: 'Translate business priorities into measurable quality scenarios that can shape architecture decisions and later become fitness tests.',
  systemContext: 'Define the system of interest, actors, external systems, trust boundaries and major interactions before decomposing internal responsibilities.',
  logicalApplication: 'Describe the business and application responsibilities, boundaries, actors, information ownership and dependencies without binding to products.',
  applicationRealization: 'Convert logical responsibilities into buildable and deployable units, contracts, workers, adapters and state ownership boundaries.',
  logicalTechnology: 'Select provider-neutral technology capabilities that enable the application model and its quality obligations.',
  physicalTechnology: 'Bind logical capabilities to approved products, environments, regions, zones and runtime topology while making failure domains visible.',
  reviewAssurance: 'Challenge the design as a traceable decision system, resolve material findings and prove that requirements and quality drivers are addressed.',
  sddPack: 'Assemble the approved model, decisions, evidence, risks and operational obligations into a delivery-ready architecture pack.',
};

const allowedNodePropertyFields = new Set([
  'description',
  'owner',
  'responsibility',
  'dataOwnership',
  'consistency',
  'availability',
  'securityBoundary',
  'operationalOwner',
  'scalingModel',
  'deploymentModel',
  'failureMode',
  'recoveryApproach',
]);

const allowedInterfaceFields = new Set<keyof ArchitectureInterface>([
  'protocol',
  'operationOrEvent',
  'version',
  'authentication',
  'authorization',
  'encryption',
  'retryPolicy',
  'idempotency',
  'ordering',
  'deliveryGuarantee',
  'deadLetterPolicy',
  'replayPolicy',
  'slo',
  'dataClassification',
  'owner',
  'deprecationPolicy',
]);

function boundedText(value: unknown, max = 700): string {
  return String(value ?? '').trim().slice(0, max);
}

function boundedList(value: unknown, maxItems: number, maxLength = 320): string[] {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => boundedText(item, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function boundedConfidence(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0.5;
}

function createRefCatalog(project: ArchitectureProject): Set<string> {
  return new Set([
    ...project.objectives.map((_, index) => `objective:${index}`),
    ...project.constraints.map((_, index) => `constraint:${index}`),
    ...project.assumptions.map((_, index) => `assumption:${index}`),
    ...project.qualityScenarios.map((item) => `quality-scenario:${item.id}`),
    ...project.nodes.map((item) => `node:${item.id}`),
    ...project.edges.map((item) => `relationship:${item.id}`),
    ...(project.interfaces ?? []).map((item) => `interface:${item.id}`),
    ...project.styleDecisions.map((item) => `style:${item.styleId}`),
    ...project.patternSelections.map((item) => `pattern:${item.patternId}`),
    ...(project.requirementsIntelligence?.requirements ?? []).map((item) => `requirement:${item.id}`),
    ...(project.requirementsIntelligence?.stakeholders ?? []).map((item) => `stakeholder:${item.id}`),
    ...(project.requirementsIntelligence?.journeys ?? []).map((item) => `journey:${item.id}`),
    ...(project.requirementsIntelligence?.sources ?? []).map((item) => `source:${item.id}`),
    ...project.decisions.map((item) => `decision:${item.id}`),
  ]);
}

function driverRefs(project: ArchitectureProject): string[] {
  return [
    ...project.objectives.slice(0, 5).map((_, index) => `objective:${index}`),
    ...project.constraints.slice(0, 5).map((_, index) => `constraint:${index}`),
    ...project.qualityScenarios.slice(0, 5).map((item) => `quality-scenario:${item.id}`),
  ];
}

function textForRef(project: ArchitectureProject, ref: string): string {
  if (ref.startsWith('objective:')) return project.objectives[Number(ref.split(':')[1])] ?? ref;
  if (ref.startsWith('constraint:')) return project.constraints[Number(ref.split(':')[1])] ?? ref;
  if (ref.startsWith('assumption:')) return project.assumptions[Number(ref.split(':')[1])] ?? ref;
  if (ref.startsWith('quality-scenario:')) {
    const id = ref.slice('quality-scenario:'.length);
    const scenario = project.qualityScenarios.find((item) => item.id === id);
    return scenario ? `${scenario.attributeId}: ${scenario.stimulus} → ${scenario.responseMeasure}` : ref;
  }
  return ref;
}

function kindTradeOffs(kind: string): string[] {
  const text = kind.toLowerCase();
  if (/worker|event|broker|stream/.test(text)) return ['Improves decoupling and burst handling, but introduces asynchronous failure modes, idempotency and observability obligations.', 'Operational teams must manage replay, ordering and poison-message behaviour.'];
  if (/api|interface/.test(text)) return ['Creates an explicit contract and ownership boundary, but increases versioning and compatibility discipline.', 'Synchronous dependencies can propagate latency and availability failures if timeouts and bulkheads are weak.'];
  if (/data|store|database/.test(text)) return ['Makes state ownership and durability explicit, but can increase coupling if multiple responsibilities share the same data boundary.', 'Consistency, backup, recovery, classification and retention must be designed rather than implied.'];
  if (/domain|service|component|module|deployable/.test(text)) return ['Improves separation of responsibility and change isolation, but too many boundaries can increase coordination and operational overhead.', 'The boundary is valuable only when ownership, contracts and transaction scope are explicit.'];
  if (/identity|control|security/.test(text)) return ['Strengthens policy enforcement and auditability, but adds latency, availability dependency and operating complexity.', 'Controls must fail safely without becoming a single point of failure.'];
  if (/runtime|deployment|region|zone|cluster/.test(text)) return ['Improves scalability or resilience, but increases cost, topology complexity and recovery testing obligations.', 'Failure-domain placement must match actual RTO, RPO and data-residency requirements.'];
  return ['Adds explicit architecture responsibility, but increases the number of elements that must be owned, tested and kept consistent.', 'Retain the component only where its responsibility cannot be represented more simply.'];
}

function componentRole(node: ArchitectureNode): string {
  const props = node.properties ?? {};
  return boundedText(props.responsibility ?? props.description ?? node.description ?? `${node.kind} responsibility in the ${node.stage} model.`, 420);
}

function componentWhy(node: ArchitectureNode, project: ArchitectureProject): string {
  const lineage = node.lineageFrom.map((id) => project.nodes.find((candidate) => candidate.id === id)?.label ?? id).slice(0, 4);
  const connected = project.edges.filter((edge) => edge.sourceId === node.id || edge.targetId === node.id).length;
  const source = lineage.length ? `It realizes or derives from ${lineage.join(', ')}.` : 'It represents a responsibility that is explicit in the current stage.';
  return `${source} It participates in ${connected} model relationship${connected === 1 ? '' : 's'} and makes ownership or dependency visible for review.`;
}

function componentEnables(node: ArchitectureNode, project: ArchitectureProject): string[] {
  const values = project.edges
    .filter((edge) => edge.sourceId === node.id || edge.targetId === node.id)
    .slice(0, 5)
    .map((edge) => {
      const otherId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
      const other = project.nodes.find((candidate) => candidate.id === otherId)?.label ?? otherId;
      return `${edge.kind.replace(/([A-Z])/g, ' $1').toLowerCase()} ${other}`;
    });
  return values.length ? values : ['Makes a stage responsibility explicit and traceable.'];
}

function deterministicClarifications(project: ArchitectureProject, targetStage: StageCoAuthorTarget): StageClarificationQuestion[] {
  const questions: StageClarificationQuestion[] = [];
  if (!project.objectives.length) questions.push({ id: 'clarify-business-outcome', question: 'What measurable business outcome must this architecture enable or protect?', whyItMatters: 'Without a business outcome, design choices cannot be ranked by value or traced to an accountable result.', relatedFieldPaths: ['objectives'], blocking: true });
  if (!project.constraints.length) questions.push({ id: 'clarify-constraints', question: 'Which regulatory, delivery, technology, budget or residency constraints are non-negotiable?', whyItMatters: 'Constraints eliminate otherwise attractive options and prevent late redesign.', relatedFieldPaths: ['constraints'], blocking: targetStage !== 'requirements' });
  if (targetStage !== 'requirements' && !project.qualityScenarios.length) questions.push({ id: 'clarify-quality-measures', question: 'What measurable latency, throughput, availability, recovery, security or operability scenarios apply?', whyItMatters: 'The model can infer tactics, but it must not invent the target measures used to justify them.', relatedFieldPaths: ['qualityScenarios'], blocking: ['logicalTechnology','physicalTechnology','reviewAssurance','sddPack'].includes(targetStage) });
  if (['applicationRealization','logicalTechnology','physicalTechnology'].includes(targetStage) && !(project.interfaces ?? []).length) questions.push({ id: 'clarify-critical-interfaces', question: 'Which interactions are business-critical, externally exposed or cross a trust boundary?', whyItMatters: 'Interface obligations drive coupling, failure handling, security, data classification and operational ownership.', relatedFieldPaths: ['interfaces'], blocking: false });
  return questions.slice(0, 6);
}

function deterministicExplanation(project: ArchitectureProject, library: KnowledgeLibrary, targetStage: StageCoAuthorTarget): StageArchitectureExplanation {
  const architectureStage = targetToArchitectureStage[targetStage];
  const nodes = project.nodes.filter((node) => node.stage === architectureStage && node.status !== 'deprecated');
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = project.edges.filter((edge) => nodeIds.has(edge.sourceId) || nodeIds.has(edge.targetId));
  const interfaces = (project.interfaces ?? []).filter((item) => item.stage === architectureStage || nodeIds.has(item.providerNodeId) || item.consumerNodeIds.some((id) => nodeIds.has(id)));
  const acceptedStyles = project.styleDecisions.filter((item) => item.status === 'accepted' && (item.stage === architectureStage || item.stage === 'logicalApplication')).map((item) => library.architectureStyles.find((style) => style.id === item.styleId)?.name ?? item.styleId);
  const acceptedPatterns = project.patternSelections.filter((item) => item.status === 'accepted' && item.stage === architectureStage).map((item) => library.patterns.find((pattern) => pattern.id === item.patternId)?.name ?? item.patternId);
  const drivers = [...project.objectives.slice(0, 4), ...project.constraints.slice(0, 3)];
  const quality = project.qualityScenarios.slice(0, 5).map((scenario) => `${scenario.attributeId}: ${scenario.responseMeasure}`);
  const components = nodes.slice(0, 24).map((node) => ({
    id: node.id,
    label: node.label,
    kind: node.kind,
    role: componentRole(node),
    whySelected: componentWhy(node, project),
    enables: componentEnables(node, project),
    driverRefs: driverRefs(project).slice(0, 8),
    qualityRefs: project.qualityScenarios.slice(0, 5).map((scenario) => `quality-scenario:${scenario.id}`),
    styleRefs: project.styleDecisions.filter((item) => item.status === 'accepted' && (!item.scopeNodeId || item.scopeNodeId === node.id || item.scopeNodeId === node.parentId)).map((item) => item.styleId),
    patternRefs: project.patternSelections.filter((item) => item.status === 'accepted' && (!item.scopeNodeId || item.scopeNodeId === node.id || item.scopeNodeId === node.parentId)).map((item) => item.patternId),
    tradeOffs: kindTradeOffs(node.kind),
    risks: project.findings.filter((item) => item.affectedNodeIds.includes(node.id)).slice(0, 4).map((item) => item.title),
    alternatives: [],
  }));
  const requirementEnablement = drivers.length
    ? drivers.map((item) => `The ${stageTitles[targetStage]} model provides an explicit place to test or realize: ${item}`)
    : ['Business outcomes and constraints are not yet explicit enough to prove why the current model is necessary.'];
  const designLogic = [
    acceptedStyles.length ? `Accepted style direction: ${acceptedStyles.join(', ')}.` : 'No accepted architecture style currently constrains this stage.',
    acceptedPatterns.length ? `Accepted patterns applied or expected: ${acceptedPatterns.join(', ')}.` : 'No accepted pattern selection is recorded for this stage.',
    nodes.length ? `${nodes.length} stage component${nodes.length === 1 ? '' : 's'} make responsibilities and boundaries reviewable.` : 'No stage components are present yet; the explanation remains intent-led rather than model-led.',
    edges.length ? `${edges.length} relationship${edges.length === 1 ? '' : 's'} show dependency or information flow.` : 'No stage relationships are present, so collaboration and failure propagation remain implicit.',
  ];
  const interfaceFlow = interfaces.length
    ? interfaces.slice(0, 12).map((item) => `${item.name}: ${item.interactionStyle} over ${item.protocol}; owner ${item.owner || 'not assigned'}; ${item.deliveryGuarantee || 'delivery guarantee not stated'}.`)
    : ['No explicit interface contract is recorded for this stage. Critical interactions, ownership, protocol, security and failure semantics remain to be completed.'];
  const tradeOffSummary = [...new Set(components.flatMap((item) => item.tradeOffs))].slice(0, 8);
  const risks = [
    ...project.findings.slice(0, 8).map((item) => `${item.severity}: ${item.title}`),
    ...(!project.qualityScenarios.length ? ['Measurable quality scenarios are missing, so architecture fitness cannot yet be proven.'] : []),
    ...(!interfaces.length && nodes.length > 1 ? ['Component boundaries exist without explicit interface contracts.'] : []),
  ];
  return {
    title: `${stageTitles[targetStage]} — why the model makes sense`,
    stagePurpose: stagePurposes[targetStage],
    businessOutcomeNarrative: drivers.length
      ? `This stage translates ${drivers.length} recorded business driver${drivers.length === 1 ? '' : 's'} into ${nodes.length} explicit architecture component${nodes.length === 1 ? '' : 's'}, ${edges.length} relationship${edges.length === 1 ? '' : 's'} and ${interfaces.length} governed interface contract${interfaces.length === 1 ? '' : 's'}.`
      : `This stage currently has ${nodes.length} model component${nodes.length === 1 ? '' : 's'}, but the business outcomes that justify them are incomplete.`,
    requirementEnablement,
    designLogic,
    selectedComponents: components,
    interfacesAndFlow: interfaceFlow,
    qualityAttributeImpact: quality.length ? quality : ['No measurable quality scenario is currently available to explain or verify the design consequences.'],
    tradeOffSummary: tradeOffSummary.length ? tradeOffSummary : ['No component-specific trade-off can be explained until the stage model contains explicit responsibilities.'],
    risksAndOpenQuestions: risks.length ? risks : ['No open deterministic finding is recorded for the current model.'],
    downstreamConsequences: [
      targetStage === 'requirements' ? 'Accepted intent becomes the source for quality drivers and scope boundaries.' : `Accepted decisions in ${stageTitles[targetStage]} constrain the next lifecycle stage and should mark affected downstream content stale when they change.`,
      'Every accepted field or component should preserve evidence, requirement and decision lineage.',
    ],
    completionEvidence: [
      `${nodes.length} stage component(s)`,
      `${edges.length} relationship(s)`,
      `${interfaces.length} interface contract(s)`,
      `${project.decisions.filter((item) => item.status === 'accepted').length} accepted decision(s)`,
    ],
  };
}

function inferTextOperations(project: ArchitectureProject, targetStage: StageCoAuthorTarget): StageDraftOperation[] {
  const operations: StageDraftOperation[] = [];
  const sourceText = [project.description, ...project.objectives, ...project.constraints, ...project.assumptions].join(' ');
  const sentenceCandidates = project.description.split(/\n|(?<=[.!?])\s+/).map((item) => item.trim()).filter(Boolean);
  const now = Date.now();
  if (targetStage === 'requirements') {
    if (!project.objectives.length) {
      const objective = sentenceCandidates.find((item) => /enable|support|improve|reduce|deliver|provide|process|moderni[sz]e|scale/i.test(item));
      if (objective) operations.push({ id: `stage-draft-objective-${now}`, kind: 'append-objective', label: 'Add business objective', targetPath: 'objectives', proposedValue: objective, rationale: 'The project description contains an outcome statement that should be tracked as an explicit architecture driver.', evidenceRefs: ['project:description'], requirementRefs: [], confidence: 0.68, validationStatus: 'ready', missingInformation: [], tradeOffs: [], downstreamEffects: ['Feeds quality-driver ranking and requirement-to-model traceability.'] });
    }
    const constraint = sentenceCandidates.find((item) => /must|shall|cannot|prohibit|regulat|residen|deadline|budget|legacy/i.test(item) && !project.constraints.some((existing) => existing.toLowerCase() === item.toLowerCase()));
    if (constraint) operations.push({ id: `stage-draft-constraint-${now}`, kind: 'append-constraint', label: 'Add explicit constraint', targetPath: 'constraints', proposedValue: constraint, rationale: 'A constraint-like statement is present in the brief but is not yet represented as a governed constraint.', evidenceRefs: ['project:description'], requirementRefs: [], confidence: 0.7, validationStatus: 'ready', missingInformation: [], tradeOffs: ['The constraint may remove otherwise attractive design options and should be confirmed by an accountable stakeholder.'], downstreamEffects: ['Filters style, pattern, provider and deployment choices.'] });
  }
  if (targetStage === 'qualityDrivers') {
    const hasAvailability = project.qualityScenarios.some((item) => item.attributeId === 'availability');
    if (!hasAvailability && /available|outage|fail|resilien|recover/i.test(sourceText)) {
      operations.push({
        id: `stage-draft-quality-availability-${now}`,
        kind: 'append-quality-scenario',
        label: 'Draft availability scenario',
        targetPath: 'qualityScenarios',
        proposedValue: { attributeId: 'availability', source: 'Runtime dependency or failure event', stimulus: 'A critical processing dependency becomes unavailable', environment: 'Production operation', artifact: 'Critical business flow', response: 'Isolate the failure and preserve recoverable work', responseMeasure: 'Recovery target requires stakeholder confirmation', weight: 5 },
        rationale: 'The project language implies resilience or recovery expectations, but no measurable availability scenario is recorded.',
        evidenceRefs: [...project.objectives.map((_, index) => `objective:${index}`), ...project.constraints.map((_, index) => `constraint:${index}`)].slice(0, 8),
        requirementRefs: [], confidence: 0.72, validationStatus: 'requires-clarification', missingInformation: ['Recovery time objective', 'Recovery point objective', 'Permitted degraded mode'], tradeOffs: ['Higher availability can increase cost, replication, operating complexity and consistency challenges.'], downstreamEffects: ['Influences redundancy, failover, idempotency, data durability and deployment topology.'],
      });
    }
    const hasPerformance = project.qualityScenarios.some((item) => item.attributeId === 'performance' || item.attributeId === 'scalability');
    if (!hasPerformance && /latency|fast|peak|volume|throughput|scale|concurrent/i.test(sourceText)) {
      operations.push({
        id: `stage-draft-quality-performance-${now}`,
        kind: 'append-quality-scenario',
        label: 'Draft performance/scalability scenario',
        targetPath: 'qualityScenarios',
        proposedValue: { attributeId: /scale|volume|throughput|concurrent/i.test(sourceText) ? 'scalability' : 'performance', source: 'Business workload', stimulus: 'Demand reaches the peak operating envelope', environment: 'Peak production traffic', artifact: 'Primary business transaction path', response: 'Process accepted work without uncontrolled queuing or failure', responseMeasure: 'Throughput and latency targets require stakeholder confirmation', weight: 4 },
        rationale: 'The requirements imply a performance or growth concern, but the measurable response target is absent.', evidenceRefs: [...project.objectives.map((_, index) => `objective:${index}`), ...project.constraints.map((_, index) => `constraint:${index}`)].slice(0, 8), requirementRefs: [], confidence: 0.7, validationStatus: 'requires-clarification', missingInformation: ['Peak request or transaction volume', 'Target latency percentile', 'Growth horizon'], tradeOffs: ['Aggressive performance targets can increase cost, caching, partitioning and operational complexity.'], downstreamEffects: ['Influences synchronous versus asynchronous flow, caching, partitioning, runtime capacity and observability.'],
      });
    }
  }
  return operations.slice(0, 8);
}

function numericClaimUnsupported(project: ArchitectureProject, value: unknown): boolean {
  const proposed = JSON.stringify(value);
  const numbers = proposed.match(/\b\d+(?:\.\d+)?%?\b/g) ?? [];
  if (!numbers.length) return false;
  const source = JSON.stringify({ description: project.description, objectives: project.objectives, constraints: project.constraints, assumptions: project.assumptions, qualityScenarios: project.qualityScenarios, context: project.context });
  return numbers.some((number) => !source.includes(number));
}

function sanitizeOperation(raw: unknown, index: number, project: ArchitectureProject, targetStage: StageCoAuthorTarget, library: KnowledgeLibrary, refs: Set<string>): StageDraftOperation | null {
  const entry = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const allowedKinds = new Set<StageDraftOperationKind>([
    'replace-project-description','append-objective','append-constraint','append-assumption','upsert-quality-priority','append-quality-scenario','update-node-description','update-node-property','update-interface-field','append-decision',
  ]);
  const kind = boundedText(entry.kind, 80) as StageDraftOperationKind;
  if (!allowedKinds.has(kind)) return null;
  const targetId = boundedText(entry.targetId, 160) || undefined;
  const field = boundedText(entry.field, 100) || undefined;
  if ((kind === 'update-node-description' || kind === 'update-node-property') && (!targetId || !project.nodes.some((item) => item.id === targetId))) return null;
  if (kind === 'update-node-property' && (!field || !allowedNodePropertyFields.has(field))) return null;
  if (kind === 'update-interface-field' && (!targetId || !(project.interfaces ?? []).some((item) => item.id === targetId) || !field || !allowedInterfaceFields.has(field as keyof ArchitectureInterface))) return null;
  const proposedValue = entry.proposedValue;
  if (proposedValue === undefined || proposedValue === null || (typeof proposedValue === 'string' && !proposedValue.trim())) return null;
  if (kind === 'upsert-quality-priority') {
    const value = proposedValue as Record<string, unknown>;
    if (!library.qualityAttributes.some((item) => item.id === String(value.attributeId ?? ''))) return null;
  }
  if (kind === 'append-quality-scenario') {
    const value = proposedValue as Record<string, unknown>;
    if (!library.qualityAttributes.some((item) => item.id === String(value.attributeId ?? '')) || !boundedText(value.stimulus) || !boundedText(value.response)) return null;
  }
  const unsupportedNumber = numericClaimUnsupported(project, proposedValue);
  const missingInformation = boundedList(entry.missingInformation, 6, 220);
  const validationStatus = unsupportedNumber || missingInformation.length
    ? 'requires-clarification'
    : entry.validationStatus === 'blocked'
      ? 'blocked'
      : 'ready';
  const evidenceRefs = boundedList(entry.evidenceRefs, 12, 180).filter((ref) => refs.has(ref));
  const requirementRefs = boundedList(entry.requirementRefs, 12, 180).filter((ref) => refs.has(ref));
  return {
    id: boundedText(entry.id, 100) || `stage-draft-operation-${index + 1}`,
    kind,
    label: boundedText(entry.label, 180) || kind.replaceAll('-', ' '),
    targetPath: boundedText(entry.targetPath, 220) || kind,
    ...(targetId ? { targetId } : {}),
    ...(field ? { field } : {}),
    proposedValue,
    rationale: boundedText(entry.rationale, 800),
    evidenceRefs,
    requirementRefs,
    confidence: boundedConfidence(entry.confidence),
    validationStatus,
    missingInformation: unsupportedNumber ? [...new Set([...missingInformation, 'Confirm any numeric target because it was not found in the governed project evidence.'])] : missingInformation,
    tradeOffs: boundedList(entry.tradeOffs, 6, 320),
    downstreamEffects: boundedList(entry.downstreamEffects, 6, 320),
  };
}

function sanitizeClarification(raw: unknown, index: number): StageClarificationQuestion | null {
  const entry = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const question = boundedText(entry.question, 360);
  const whyItMatters = boundedText(entry.whyItMatters, 500);
  if (!question || !whyItMatters) return null;
  return {
    id: boundedText(entry.id, 100) || `stage-clarification-${index + 1}`,
    question,
    whyItMatters,
    relatedFieldPaths: boundedList(entry.relatedFieldPaths, 8, 180),
    blocking: Boolean(entry.blocking),
  };
}

function mergeExplanation(base: StageArchitectureExplanation, raw: unknown, project: ArchitectureProject, refs: Set<string>): StageArchitectureExplanation {
  const entry = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const componentMap = new Map(base.selectedComponents.map((item) => [item.id, item]));
  const rawComponents = Array.isArray(entry.selectedComponents) ? entry.selectedComponents : [];
  for (const rawComponent of rawComponents.slice(0, 24)) {
    const item = rawComponent && typeof rawComponent === 'object' ? rawComponent as Record<string, unknown> : {};
    const id = boundedText(item.id, 160);
    const existing = componentMap.get(id);
    if (!existing) continue;
    componentMap.set(id, {
      ...existing,
      role: boundedText(item.role, 520) || existing.role,
      whySelected: boundedText(item.whySelected, 800) || existing.whySelected,
      enables: boundedList(item.enables, 8, 300).length ? boundedList(item.enables, 8, 300) : existing.enables,
      driverRefs: boundedList(item.driverRefs, 10, 180).filter((ref) => refs.has(ref)),
      qualityRefs: boundedList(item.qualityRefs, 10, 180).filter((ref) => refs.has(ref)),
      styleRefs: boundedList(item.styleRefs, 10, 180).filter((ref) => project.styleDecisions.some((decision) => decision.styleId === ref)),
      patternRefs: boundedList(item.patternRefs, 10, 180).filter((ref) => project.patternSelections.some((selection) => selection.patternId === ref)),
      tradeOffs: boundedList(item.tradeOffs, 6, 320).length ? boundedList(item.tradeOffs, 6, 320) : existing.tradeOffs,
      risks: boundedList(item.risks, 6, 320).length ? boundedList(item.risks, 6, 320) : existing.risks,
      alternatives: boundedList(item.alternatives, 5, 320),
    });
  }
  const choose = (field: keyof StageArchitectureExplanation, fallback: string[], max: number) => {
    const values = boundedList(entry[field], max, 420);
    return values.length ? values : fallback;
  };
  return {
    title: boundedText(entry.title, 220) || base.title,
    stagePurpose: boundedText(entry.stagePurpose, 720) || base.stagePurpose,
    businessOutcomeNarrative: boundedText(entry.businessOutcomeNarrative, 1200) || base.businessOutcomeNarrative,
    requirementEnablement: choose('requirementEnablement', base.requirementEnablement, 12),
    designLogic: choose('designLogic', base.designLogic, 12),
    selectedComponents: [...componentMap.values()],
    interfacesAndFlow: choose('interfacesAndFlow', base.interfacesAndFlow, 12),
    qualityAttributeImpact: choose('qualityAttributeImpact', base.qualityAttributeImpact, 12),
    tradeOffSummary: choose('tradeOffSummary', base.tradeOffSummary, 10),
    risksAndOpenQuestions: choose('risksAndOpenQuestions', base.risksAndOpenQuestions, 12),
    downstreamConsequences: choose('downstreamConsequences', base.downstreamConsequences, 10),
    completionEvidence: choose('completionEvidence', base.completionEvidence, 10),
  };
}

const proposalSchema = {
  type: 'object', additionalProperties: false,
  required: ['summary','operations','clarifications','explanation'],
  properties: {
    summary: { type: 'string' },
    operations: { type: 'array', maxItems: 16, items: { type: 'object', additionalProperties: false, required: ['id','kind','label','targetPath','targetId','field','proposedValue','rationale','evidenceRefs','requirementRefs','confidence','validationStatus','missingInformation','tradeOffs','downstreamEffects'], properties: {
      id: { type: 'string' }, kind: { type: 'string', enum: ['replace-project-description','append-objective','append-constraint','append-assumption','upsert-quality-priority','append-quality-scenario','update-node-description','update-node-property','update-interface-field','append-decision'] }, label: { type: 'string' }, targetPath: { type: 'string' }, targetId: { type: ['string','null'] }, field: { type: ['string','null'] }, proposedValue: {}, rationale: { type: 'string' }, evidenceRefs: { type: 'array', maxItems: 12, items: { type: 'string' } }, requirementRefs: { type: 'array', maxItems: 12, items: { type: 'string' } }, confidence: { type: 'number', minimum: 0, maximum: 1 }, validationStatus: { type: 'string', enum: ['ready','requires-clarification','blocked'] }, missingInformation: { type: 'array', maxItems: 6, items: { type: 'string' } }, tradeOffs: { type: 'array', maxItems: 6, items: { type: 'string' } }, downstreamEffects: { type: 'array', maxItems: 6, items: { type: 'string' } },
    } } },
    clarifications: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['id','question','whyItMatters','relatedFieldPaths','blocking'], properties: { id: { type: 'string' }, question: { type: 'string' }, whyItMatters: { type: 'string' }, relatedFieldPaths: { type: 'array', maxItems: 8, items: { type: 'string' } }, blocking: { type: 'boolean' } } } },
    explanation: { type: 'object', additionalProperties: false, required: ['title','stagePurpose','businessOutcomeNarrative','requirementEnablement','designLogic','selectedComponents','interfacesAndFlow','qualityAttributeImpact','tradeOffSummary','risksAndOpenQuestions','downstreamConsequences','completionEvidence'], properties: {
      title: { type: 'string' }, stagePurpose: { type: 'string' }, businessOutcomeNarrative: { type: 'string' }, requirementEnablement: { type: 'array', maxItems: 12, items: { type: 'string' } }, designLogic: { type: 'array', maxItems: 12, items: { type: 'string' } }, selectedComponents: { type: 'array', maxItems: 24, items: { type: 'object', additionalProperties: false, required: ['id','role','whySelected','enables','driverRefs','qualityRefs','styleRefs','patternRefs','tradeOffs','risks','alternatives'], properties: { id: { type: 'string' }, role: { type: 'string' }, whySelected: { type: 'string' }, enables: { type: 'array', maxItems: 8, items: { type: 'string' } }, driverRefs: { type: 'array', maxItems: 10, items: { type: 'string' } }, qualityRefs: { type: 'array', maxItems: 10, items: { type: 'string' } }, styleRefs: { type: 'array', maxItems: 10, items: { type: 'string' } }, patternRefs: { type: 'array', maxItems: 10, items: { type: 'string' } }, tradeOffs: { type: 'array', maxItems: 6, items: { type: 'string' } }, risks: { type: 'array', maxItems: 6, items: { type: 'string' } }, alternatives: { type: 'array', maxItems: 5, items: { type: 'string' } } } } }, interfacesAndFlow: { type: 'array', maxItems: 12, items: { type: 'string' } }, qualityAttributeImpact: { type: 'array', maxItems: 12, items: { type: 'string' } }, tradeOffSummary: { type: 'array', maxItems: 10, items: { type: 'string' } }, risksAndOpenQuestions: { type: 'array', maxItems: 12, items: { type: 'string' } }, downstreamConsequences: { type: 'array', maxItems: 10, items: { type: 'string' } }, completionEvidence: { type: 'array', maxItems: 10, items: { type: 'string' } },
    } },
  },
} as const;

function compactProject(project: ArchitectureProject, targetStage: StageCoAuthorTarget, explanation: StageArchitectureExplanation, library: KnowledgeLibrary) {
  const architectureStage = targetToArchitectureStage[targetStage];
  return {
    targetStage,
    architectureStage,
    project: {
      id: project.id, name: project.name, description: project.description, revision: project.revision,
      objectives: project.objectives.map((text, index) => ({ ref: `objective:${index}`, text })),
      constraints: project.constraints.map((text, index) => ({ ref: `constraint:${index}`, text })),
      assumptions: project.assumptions.map((text, index) => ({ ref: `assumption:${index}`, text })),
      qualityPriorities: project.qualityPriorities,
      qualityScenarios: project.qualityScenarios.map((item) => ({ ...item, ref: `quality-scenario:${item.id}` })),
      nodes: project.nodes.filter((item) => item.stage === architectureStage).map((item) => ({ id: item.id, ref: `node:${item.id}`, kind: item.kind, label: item.label, description: item.description, properties: item.properties, lineageFrom: item.lineageFrom, parentId: item.parentId })),
      relationships: project.edges.filter((item) => item.stage === architectureStage).map((item) => ({ ...item, ref: `relationship:${item.id}` })),
      interfaces: (project.interfaces ?? []).filter((item) => item.stage === architectureStage).map((item) => ({ ...item, ref: `interface:${item.id}` })),
      acceptedStyles: project.styleDecisions.filter((item) => item.status === 'accepted').map((item) => ({ ...item, name: library.architectureStyles.find((style) => style.id === item.styleId)?.name ?? item.styleId })),
      acceptedPatterns: project.patternSelections.filter((item) => item.status === 'accepted').map((item) => ({ ...item, name: library.patterns.find((pattern) => pattern.id === item.patternId)?.name ?? item.patternId })),
      decisions: project.decisions,
      findings: project.findings,
      requirementsIntelligence: project.requirementsIntelligence ? {
        knowledgeReleaseId: project.requirementsIntelligence.knowledgeReleaseId,
        acceptedRequirements: project.requirementsIntelligence.requirements.filter((item) => item.status === 'accepted').slice(0, 80).map((item) => ({ ref: `requirement:${item.id}`, id: item.id, title: item.title, statement: item.statement, type: item.type, priority: item.priority, evidenceRefs: item.evidenceRefs, journeyRefs: item.journeyRefs, qualityAttributeHints: item.qualityAttributeHints })),
        stakeholders: project.requirementsIntelligence.stakeholders.filter((item) => item.status === 'accepted').slice(0, 30).map((item) => ({ ref: `stakeholder:${item.id}`, id: item.id, name: item.name, role: item.role, concerns: item.concerns })),
        journeys: project.requirementsIntelligence.journeys.filter((item) => item.status === 'accepted').slice(0, 24).map((item) => ({ ref: `journey:${item.id}`, id: item.id, name: item.name, goal: item.goal, priority: item.priority, requirementRefs: item.requirementRefs, qualityHotspots: item.qualityHotspots, architectureObligations: item.architectureObligations, participants: item.participants.map((participant) => ({ id: participant.id, name: participant.name, kind: participant.kind })), interactions: item.paths.flatMap((path) => path.interactions).slice(0, 40).map((interaction) => ({ from: interaction.fromParticipantId, to: interaction.toParticipantId, label: interaction.label, requirementRefs: interaction.requirementRefs, qualityRefs: interaction.qualityRefs, trustBoundaryCrossing: interaction.trustBoundaryCrossing })) })),
        contextPackage: project.requirementsIntelligence.contextPackages.find((item) => item.target === targetStage) ?? project.requirementsIntelligence.contextPackages.find((item) => item.target === (targetStage === 'systemContext' ? 'systemContext' : targetStage)),
        openQuestions: project.requirementsIntelligence.openQuestions.filter((item) => item.status === 'open').slice(0, 30),
        health: project.requirementsIntelligence.health,
      } : null,
    },
    deterministicExplanation: explanation,
    allowedOperationKinds: ['replace-project-description','append-objective','append-constraint','append-assumption','upsert-quality-priority','append-quality-scenario','update-node-description','update-node-property','update-interface-field','append-decision'],
    allowedNodePropertyFields: [...allowedNodePropertyFields],
    allowedInterfaceFields: [...allowedInterfaceFields],
    qualityAttributes: library.qualityAttributes.map((item) => ({ id: item.id, name: item.name, calibrated: item.calibrated === true, measures: item.measures })),
  };
}

export function buildDeterministicStageCoAuthorProposal(input: { project: ArchitectureProject; library: KnowledgeLibrary; targetStage: StageCoAuthorTarget }): StageCoAuthorProposal {
  const explanation = deterministicExplanation(input.project, input.library, input.targetStage);
  const operations = inferTextOperations(input.project, input.targetStage);
  const clarifications = deterministicClarifications(input.project, input.targetStage);
  return {
    schemaVersion: '1.0', mode: 'deterministic', targetStage: input.targetStage, architectureStage: targetToArchitectureStage[input.targetStage], projectRevision: input.project.revision, generatedAt: new Date().toISOString(),
    summary: operations.length ? `AIW prepared ${operations.length} evidence-aware field draft${operations.length === 1 ? '' : 's'} and a model explanation for ${stageTitles[input.targetStage]}.` : `AIW prepared a model explanation for ${stageTitles[input.targetStage]}; no safe deterministic field draft is currently available.`,
    operations, clarifications, explanation,
    notice: 'The proposal is a draft layer only. Nothing enters the canonical model until the architect accepts specific operations.',
  };
}

export async function buildGovernedStageCoAuthorProposal(input: { project: ArchitectureProject; library: KnowledgeLibrary; targetStage: StageCoAuthorTarget; gateway: LlmJsonGateway; dataClassification?: 'public'|'internal'|'confidential'|'restricted' }): Promise<StageCoAuthorProposal> {
  const fallback = buildDeterministicStageCoAuthorProposal(input);
  const refs = createRefCatalog(input.project);
  try {
    const result = await input.gateway.generateJson<Record<string, unknown>>({
      purpose: 'architecture-reasoning', schemaName: 'aiw_stage_co_author_v1', dataClassification: input.dataClassification ?? 'internal',
      system: [
        'You are Sol, the governed AIW stage co-author and architecture explainer.',
        'Draft structured field proposals and explain how the current model enables business outcomes and requirements.',
        'Use only the supplied project, node, interface, style, pattern, quality and decision identifiers.',
        'Do not invent evidence, approvals, production metrics, regulatory applicability or numeric targets.',
        'When a measurable target is missing, create a clarification and mark the operation requires-clarification.',
        'Do not create canonical mutations. Return reviewable draft operations only.',
        'For every selected component explain its role, why it exists, what it enables, relevant drivers, quality impact, trade-offs, risks and realistic alternatives.',
        'Prefer precise architecture language over generic prose. Return only JSON matching the schema.',
      ].join(' '),
      user: JSON.stringify(compactProject(input.project, input.targetStage, fallback.explanation, input.library)),
      jsonSchema: proposalSchema as unknown as Record<string, unknown>,
    });
    const source = result.value ?? {};
    const rawOperations = Array.isArray(source.operations) ? source.operations : [];
    const operations = rawOperations.map((item, index) => sanitizeOperation(item, index, input.project, input.targetStage, input.library, refs)).filter((item): item is StageDraftOperation => Boolean(item));
    const clarifications = [
      ...deterministicClarifications(input.project, input.targetStage),
      ...(Array.isArray(source.clarifications) ? source.clarifications.map(sanitizeClarification).filter((item): item is StageClarificationQuestion => Boolean(item)) : []),
    ].filter((item, index, all) => all.findIndex((candidate) => candidate.question.toLowerCase() === item.question.toLowerCase()) === index).slice(0, 8);
    const explanation = mergeExplanation(fallback.explanation, source.explanation, input.project, refs);
    return {
      ...fallback,
      mode: 'llm-assisted',
      generatedAt: new Date().toISOString(),
      summary: boundedText(source.summary, 900) || fallback.summary,
      operations: [...fallback.operations, ...operations].filter((item, index, all) => all.findIndex((candidate) => candidate.kind === item.kind && candidate.targetPath === item.targetPath && JSON.stringify(candidate.proposedValue) === JSON.stringify(item.proposedValue)) === index).slice(0, 16),
      clarifications,
      explanation,
      notice: 'Sol drafted fields and explanations from governed project evidence. The model authored no canonical mutation; accept only the operations you have reviewed.',
      trace: { providerId: result.providerId, model: result.model, routeId: result.routeId, requestFingerprint: result.requestFingerprint, latencyMs: result.latencyMs, fallbackUsed: result.fallbackUsed },
    };
  } catch (error) {
    return { ...fallback, mode: 'deterministic-fallback', notice: `Governed LLM stage drafting was unavailable. Deterministic explanation and safe local drafts remain active${error instanceof Error ? ` (${error.message.split(':')[0]})` : ''}.` };
  }
}

export function stageArchitectureStage(targetStage: StageCoAuthorTarget): ArchitectureStage {
  return targetToArchitectureStage[targetStage];
}

export function resolveStageEvidence(project: ArchitectureProject, refs: string[]): string[] {
  return refs.map((ref) => textForRef(project, ref));
}
