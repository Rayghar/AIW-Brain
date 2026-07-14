import type {
  ArchitectureAlternative,
  ArchitectureBlueprint,
  ArchitectureEdge,
  ArchitectureInterface,
  ArchitectureNode,
  ArchitectureProject,
  ArchitectureTrustZone,
  AlternativeCounterfactual,
  BlueprintComponentLineage,
  BlueprintInterfaceContract,
  BlueprintViewDefinition,
  CapabilityProductMapping,
  CapabilityProductOption,
  CrossStageTraceabilityRow,
  DeploymentTopologyElement,
  DesignBriefAssessment,
  PatternCompositionPlan,
  ProviderOverlay,
  ProviderOverlayMapping,
  SynthesisEligibilityDecision,
  SynthesisStrategyId,
  ArchitectureFailurePath,
} from '@aiw/domain';
import { findProviderProductCandidates, providerProductCatalog } from '@aiw/domain';

const RULE_VERSION = 'aiw-synthesis-eligibility-2.0';

function stableHash(value: unknown): string {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

const unique = <T>(values: T[]): T[] => [...new Set(values)];
const percent = (part: number, total: number): number => total ? Math.round((part / total) * 100) : 100;

function arrayProperty(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function projectText(project: ArchitectureProject): string {
  return [project.name, project.description, ...project.objectives, ...project.constraints, ...project.assumptions].join(' ').toLowerCase();
}

export function evaluateSynthesisEligibility(
  project: ArchitectureProject,
  strategyId: SynthesisStrategyId,
  patternIds: string[],
  plan: PatternCompositionPlan,
  assessment: DesignBriefAssessment,
): SynthesisEligibilityDecision {
  const text = projectText(project);
  const prohibited = project.context.prohibitedTechnologies ?? [];
  const generatedText = `${patternIds.join(' ')} ${plan.mutation.addNodes.map((item) => item.kind).join(' ')}`.toLowerCase();
  const prohibitedMatches = prohibited.filter((technology) => generatedText.includes(technology.toLowerCase()));
  const criteria = [
    {
      id: 'ELIG-BRIEF',
      title: 'Design brief is sufficiently complete for governed synthesis',
      passed: assessment.synthesisReady,
      blocking: false,
      evidence: [`Brief completeness ${assessment.completenessScore}%`, `${assessment.gaps.length} gap(s)`, `${assessment.contradictions.length} contradiction(s)`],
      remediation: 'Resolve blocking brief gaps before final approval; exploratory alternatives may still be generated.',
    },
    {
      id: 'ELIG-PATTERN-DIVERSITY',
      title: 'Alternative is backed by a material Pattern DNA composition',
      passed: patternIds.length >= 2,
      blocking: true,
      evidence: patternIds,
      remediation: 'Select at least two compatible, approved Pattern DNA records.',
    },
    {
      id: 'ELIG-PREREQUISITES',
      title: 'Pattern prerequisites are within a reviewable boundary',
      passed: plan.missingPrerequisites.length <= 5,
      blocking: true,
      evidence: plan.missingPrerequisites.length ? plan.missingPrerequisites : ['No unresolved prerequisite recorded'],
      remediation: 'Supply missing capabilities or choose a less demanding composition.',
    },
    {
      id: 'ELIG-PROHIBITED-TECH',
      title: 'The neutral architecture does not require prohibited technology',
      passed: prohibitedMatches.length === 0,
      blocking: true,
      evidence: prohibitedMatches.length ? prohibitedMatches : ['No prohibited technology match'],
      remediation: 'Remove provider/product assumptions that conflict with project constraints.',
    },
    {
      id: 'ELIG-CONTEXT-FIT',
      title: 'Strategy is plausible for the stated context',
      passed: !(strategyId === 'scale-first' && /small team|single developer/.test(text)),
      blocking: false,
      evidence: [`Strategy ${strategyId}`, `Team size ${project.context.teamSize ?? 'not supplied'}`, `Operational maturity ${project.context.operationalMaturity ?? 'not supplied'}`],
      remediation: 'Confirm the organisation can operate the selected architecture complexity.',
    },
  ];
  const disqualifiers = criteria.filter((item) => item.blocking && !item.passed).map((item) => item.title);
  return {
    evaluatedAt: new Date().toISOString(),
    eligible: disqualifiers.length === 0,
    exploratoryOnly: !assessment.synthesisReady || disqualifiers.length > 0,
    deterministicRuleVersion: RULE_VERSION,
    criteria,
    disqualifiers,
  };
}

function requirementRefs(project: ArchitectureProject, node: ArchitectureNode): string[] {
  const direct = unique([
    ...arrayProperty(node.properties.requirementIds),
    ...arrayProperty(node.properties.requirementRefs),
    ...arrayProperty(node.properties.qualityScenarioIds),
  ]);
  if (direct.length) return direct;
  const refs: string[] = [];
  const haystack = `${node.label} ${node.description ?? ''} ${node.kind} ${node.tags.join(' ')}`.toLowerCase();
  project.qualityScenarios.forEach((scenario) => {
    if (haystack.includes(scenario.attributeId.toLowerCase()) || ['LogicalTechnologyCapability','Control','Runtime','DeploymentNode'].includes(node.kind)) refs.push(`quality:${scenario.id}`);
  });
  if (node.kind === 'Control' || /security|identity|audit|policy|trust/.test(haystack)) {
    project.constraints.forEach((_, index) => refs.push(`constraint:${index + 1}`));
  }
  if (!refs.length && project.objectives.length) refs.push('objective:1');
  return unique(refs);
}

function patternRefs(node: ArchitectureNode, selectedPatternIds: string[]): string[] {
  const direct = node.lineageFrom.filter((id) => selectedPatternIds.includes(id) || id.startsWith('PAT-') || id.startsWith('TPL-'));
  return unique(direct.length ? direct : selectedPatternIds.slice(0, Math.min(3, selectedPatternIds.length)));
}

function linkedLogicalNodeIds(project: ArchitectureProject, node: ArchitectureNode): string[] {
  if (node.stage === 'logicalApplication' || node.stage === 'logicalTechnology') return [node.id];
  const logicalStages = new Set(['logicalApplication', 'logicalTechnology']);
  const nodesById = new Map(project.nodes.map((item) => [item.id, item]));
  const links = project.edges.flatMap((edge) => {
    if (edge.sourceId !== node.id && edge.targetId !== node.id) return [];
    const otherId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
    const other = nodesById.get(otherId);
    return other && logicalStages.has(other.stage) ? [other.id] : [];
  });
  const lineage = node.lineageFrom.filter((id) => {
    const source = nodesById.get(id);
    return source ? logicalStages.has(source.stage) : false;
  });
  if (links.length || lineage.length) return unique([...links, ...lineage]);
  const sameKindCandidates = project.nodes.filter((candidate) => logicalStages.has(candidate.stage) && candidate.label.toLowerCase().split(/\W+/).some((term) => term.length > 4 && node.label.toLowerCase().includes(term)));
  return sameKindCandidates.slice(0, 3).map((item) => item.id);
}

function componentLineage(project: ArchitectureProject, patternIds: string[]): BlueprintComponentLineage[] {
  return project.nodes.filter((node) => node.status !== 'deprecated').map((node) => ({
    nodeId: node.id,
    nodeKind: node.kind,
    stage: node.stage,
    requirementRefs: requirementRefs(project, node),
    patternIds: patternRefs(node, patternIds),
    logicalNodeIds: linkedLogicalNodeIds(project, node),
    capabilityIds: unique([...arrayProperty(node.properties.capabilityIds), ...arrayProperty(node.properties.capabilities), ...(node.kind === 'Capability' || node.kind === 'LogicalTechnologyCapability' ? [node.id] : [])]),
    provenance: unique([...node.lineageFrom, `project-revision:${project.revision}`]),
  }));
}

function inferredInteraction(edge: ArchitectureEdge): BlueprintInterfaceContract['interactionStyle'] {
  if (edge.kind === 'publishes' || edge.kind === 'subscribes') return 'event';
  if (edge.kind === 'reads' || edge.kind === 'writes' || edge.kind === 'stores') return 'database';
  return 'request-response';
}

function interfaceFromCanonical(project: ArchitectureProject, value: ArchitectureInterface, patternIds: string[]): BlueprintInterfaceContract {
  return {
    id: value.id,
    name: value.name,
    providerNodeId: value.providerNodeId,
    consumerNodeIds: value.consumerNodeIds,
    interactionStyle: value.interactionStyle,
    protocol: value.protocol || (value.interactionStyle === 'event' ? 'CloudEvents' : 'HTTPS'),
    operationOrEvent: value.operationOrEvent || value.name,
    version: value.version || '1.0.0',
    schemaRef: value.schemaRef ?? `contracts/${value.id}.schema.json`,
    authentication: value.authentication || 'Workload identity or OAuth 2.0',
    authorization: value.authorization || 'Least-privilege policy',
    encryption: value.encryption || 'TLS 1.3 in transit',
    ...(value.timeoutMs !== undefined ? { timeoutMs: value.timeoutMs } : {}),
    retryPolicy: value.retryPolicy || 'Bounded exponential backoff',
    idempotency: value.idempotency || (value.interactionStyle === 'event' ? 'Required' : 'Operation-specific'),
    ordering: value.ordering || 'Not guaranteed unless contract states otherwise',
    deliveryGuarantee: value.deliveryGuarantee || (value.interactionStyle === 'event' ? 'At-least-once' : 'Synchronous response'),
    deadLetterPolicy: value.deadLetterPolicy || (value.interactionStyle === 'event' ? 'Required after bounded retries' : 'Not applicable'),
    replayPolicy: value.replayPolicy || (value.interactionStyle === 'event' ? 'Controlled replay with audit evidence' : 'Not applicable'),
    slo: value.slo || 'Define latency, availability and error budget before approval',
    dataClassification: value.dataClassification,
    owner: value.owner || 'Architecture owner not assigned',
    contractStatus: value.contractLocation ? 'inherited' : 'review-required',
    requirementRefs: unique(value.evidenceIds.length ? value.evidenceIds : ['objective:1']),
    patternIds: unique(patternIds.slice(0, 3)),
  };
}

function interfaces(project: ArchitectureProject, patternIds: string[]): BlueprintInterfaceContract[] {
  const canonical = (project.interfaces ?? []).map((value) => interfaceFromCanonical(project, value, patternIds));
  const coveredPairs = new Set(canonical.flatMap((item) => item.consumerNodeIds.map((consumer) => `${item.providerNodeId}->${consumer}`)));
  const inferred = project.edges.filter((edge) => ['communicatesWith','dependsOn','publishes','subscribes','reads','writes','stores'].includes(edge.kind) && !coveredPairs.has(`${edge.sourceId}->${edge.targetId}`)).map((edge) => {
    const interactionStyle = inferredInteraction(edge);
    const id = `IF-${stableHash(`${edge.id}:${edge.sourceId}:${edge.targetId}`)}`;
    const classification = project.context.dataSensitivity ?? (project.context.dataClassifications?.includes('restricted') ? 'restricted' : 'internal');
    return {
      id,
      name: edge.label ?? `${edge.sourceId} to ${edge.targetId}`,
      providerNodeId: edge.sourceId,
      consumerNodeIds: [edge.targetId],
      interactionStyle,
      protocol: interactionStyle === 'event' ? 'CloudEvents over governed broker' : interactionStyle === 'database' ? 'Governed data contract' : 'HTTPS',
      operationOrEvent: edge.label ?? edge.kind,
      version: '1.0.0',
      schemaRef: `contracts/${id}.schema.json`,
      authentication: interactionStyle === 'database' ? 'Workload identity' : 'OAuth 2.0 / workload identity',
      authorization: 'Least-privilege policy',
      encryption: 'TLS 1.3 in transit; encryption at rest for persisted payloads',
      ...(interactionStyle === 'request-response' ? { timeoutMs: 3000 } : {}),
      retryPolicy: interactionStyle === 'request-response' ? 'Retry only idempotent operations with bounded exponential backoff' : 'Bounded exponential backoff',
      idempotency: interactionStyle === 'event' ? 'Required using idempotency key' : 'Operation-specific',
      ordering: interactionStyle === 'event' ? 'Partition-key scoped' : 'Not guaranteed',
      deliveryGuarantee: interactionStyle === 'event' ? 'At-least-once' : 'Contract response',
      deadLetterPolicy: interactionStyle === 'event' ? 'Required after bounded retries' : 'Not applicable',
      replayPolicy: interactionStyle === 'event' ? 'Audited controlled replay' : 'Not applicable',
      slo: 'Contract owner must define latency, availability and error budget',
      dataClassification: classification,
      owner: 'Interface owner not assigned',
      contractStatus: 'generated',
      requirementRefs: ['objective:1'],
      patternIds: unique(patternIds.slice(0, 3)),
    } satisfies BlueprintInterfaceContract;
  });
  return [...canonical, ...inferred];
}

function capabilityKind(name: string): 'api' | 'event' | 'data' | 'compute' | 'identity' | 'observability' | 'network' | 'general' {
  const text = name.toLowerCase();
  if (/api|gateway|ingress/.test(text)) return 'api';
  if (/event|broker|queue|stream|message/.test(text)) return 'event';
  if (/data|database|store|cache|lake|warehouse/.test(text)) return 'data';
  if (/identity|iam|auth|policy|secret|key/.test(text)) return 'identity';
  if (/observ|telemetry|monitor|log|trace/.test(text)) return 'observability';
  if (/network|dns|firewall|load balancer|mesh/.test(text)) return 'network';
  if (/runtime|compute|container|function|worker|service/.test(text)) return 'compute';
  return 'general';
}

function capabilityMappings(project: ArchitectureProject): CapabilityProductMapping[] {
  let capabilities = project.nodes.filter((node) => node.stage === 'logicalTechnology' || node.kind === 'LogicalTechnologyCapability' || node.kind === 'Capability');
  if (!capabilities.length) capabilities = project.nodes.filter((node) => node.stage === 'applicationRealization').slice(0, 12);
  return capabilities.map((node) => {
    const text = `${node.label} ${node.description ?? ''} ${node.kind} ${node.tags.join(' ')} ${JSON.stringify(node.properties)}`;
    const kind = capabilityKind(text);
    const broadTerms: Record<ReturnType<typeof capabilityKind>, string> = {
      api: 'API management', event: 'Event and messaging', data: /object|blob|archive/i.test(text) ? 'Object storage' : 'Relational data', compute: 'Container runtime', identity: /secret|key|kms|vault|hsm/i.test(text) ? 'Secrets and key management' : 'Identity and access', observability: 'Observability', network: 'Network and traffic management', general: node.label,
    };
    const capability = broadTerms[kind];
    const approved = findProviderProductCandidates(capability).filter((entry) => entry.status === 'approved-advisory');
    const options = (['portable','aws','azure','gcp','on-premises'] as const).map((provider) => {
      const catalog = approved.find((entry) => entry.provider === provider) ?? providerProductCatalog.find((entry) => entry.provider === provider && entry.neutralCapability === capability);
      return {
        id: catalog?.id ?? `PRODUCT-${provider}-${stableHash(`${node.id}:${provider}`)}`,
        provider,
        productName: catalog?.productName ?? `${provider} product selection requires architecture review`,
        rationale: provider === 'portable' ? 'Preserves the canonical provider-neutral capability contract.' : `Realises the neutral ${node.label} capability using an approved-advisory provider catalogue entry.`,
        portabilityNotes: catalog ? [...catalog.portabilityRisks, ...catalog.architectureConsequences] : ['Provider mapping requires specialist review'],
      } satisfies CapabilityProductOption;
    });
    return {
      capabilityId: `CAP-${stableHash(node.id)}`,
      capabilityName: node.label,
      logicalNodeIds: [node.id],
      neutralDefinition: node.description ?? `Provider-neutral ${node.kind} capability required by the architecture.`,
      requiredCharacteristics: unique([node.kind, ...node.tags, ...arrayProperty(node.properties.requiredCharacteristics), ...approved.flatMap((entry) => entry.requiredCharacteristics)]),
      productOptions: options,
      selectionStatus: 'neutral',
    } satisfies CapabilityProductMapping;
  });
}

function providerOverlays(mappings: CapabilityProductMapping[], project: ArchitectureProject, canonicalFingerprint: string): ProviderOverlay[] {
  return (['aws','azure','gcp','on-premises','portable'] as const).map((provider) => {
    const overlayMappings: ProviderOverlayMapping[] = mappings.flatMap((mapping) => {
      const option = mapping.productOptions.find((item) => item.provider === provider);
      if (!option) return [];
      return mapping.logicalNodeIds.map((nodeId) => ({
        canonicalNodeId: nodeId,
        neutralCapabilityId: mapping.capabilityId,
        providerProduct: option.productName,
        configurationAssumptions: provider === 'portable' ? ['No provider-specific configuration selected'] : ['Region and service tier require human selection', 'Security and availability settings must satisfy the neutral contract'],
        lockInRisks: provider === 'portable' ? [] : ['Managed-service semantics may differ', 'Migration and data-egress costs require review'],
      }));
    });
    return {
      id: `OVERLAY-${provider.toUpperCase()}-${stableHash(project.id)}`,
      provider,
      status: 'proposal',
      generatedAt: new Date().toISOString(),
      canonicalModelFingerprint: canonicalFingerprint,
      mappings: overlayMappings,
      warnings: provider === 'portable' ? ['Portable overlay is the default baseline.'] : ['Provider overlay is non-authoritative until separately approved.', 'Overlay cannot add, remove or change canonical architecture requirements.'],
    };
  });
}

function deploymentTopology(project: ArchitectureProject, patternIds: string[], relativeCostClass: DeploymentTopologyElement['relativeCostClass']): DeploymentTopologyElement[] {
  let physical = project.nodes.filter((node) => node.stage === 'physicalTechnology' || ['DeploymentNode','Region','AvailabilityZone','NetworkZone','Runtime','TechnologyProduct'].includes(node.kind));
  if (!physical.length) physical = project.nodes.filter((node) => node.stage === 'logicalTechnology').slice(0, 12);
  const defaultLogicalCapabilityIds = project.nodes
    .filter((node) => node.status !== 'deprecated' && (node.stage === 'logicalTechnology' || node.kind === 'LogicalTechnologyCapability' || node.kind === 'Capability'))
    .map((node) => node.id);
  const fallbackLogicalApplicationIds = project.nodes
    .filter((node) => node.status !== 'deprecated' && node.stage === 'logicalApplication')
    .map((node) => node.id);
  return physical.map((node) => {
    const explicitLogicalIds = linkedLogicalNodeIds(project, node);
    const logicalCapabilityIds = explicitLogicalIds.length
      ? explicitLogicalIds
      : (defaultLogicalCapabilityIds.length ? defaultLogicalCapabilityIds.slice(0, 3) : fallbackLogicalApplicationIds.slice(0, 3));
    return ({
    id: `DEPLOY-${stableHash(node.id)}`,
    nodeId: node.id,
    logicalCapabilityIds: logicalCapabilityIds.length ? logicalCapabilityIds : [node.id],
    runtimeClass: String(node.properties.runtimeClass ?? node.properties.runtime ?? (node.kind === 'Runtime' ? node.label : 'Portable managed runtime')),
    regionStrategy: String(node.properties.regionStrategy ?? (patternIds.some((id) => /CELL|REGION|DISASTER|FAILOVER/i.test(id)) ? 'Multi-region or isolated-cell capable' : 'Single region with documented recovery option')),
    availabilityZoneStrategy: String(node.properties.availabilityZoneStrategy ?? 'Multi-zone for critical workloads'),
    networkZone: String(node.properties.networkZone ?? node.parentId ?? 'Application trust zone'),
    scalingModel: String(node.properties.scalingModel ?? (patternIds.some((id) => /AUTO|SCALE|QUEUE|SERVERLESS/i.test(id)) ? 'Elastic horizontal scaling' : 'Measured capacity with controlled horizontal scale')),
    recoveryClass: String(node.properties.recoveryClass ?? (patternIds.some((id) => /DISASTER|FAILOVER|CELL/i.test(id)) ? 'Automated or rehearsed failover' : 'Backup and restore with tested runbook')),
    relativeCostClass,
    operationalComplexity: Math.min(100, 35 + (patternIds.length * 3) + (node.stage === 'physicalTechnology' ? 10 : 0)),
    patternIds: unique(patternRefs(node, patternIds)),
  });
  });
}

function trustZones(project: ArchitectureProject, contracts: BlueprintInterfaceContract[]): ArchitectureTrustZone[] {
  const groups = new Map<string, ArchitectureNode[]>();
  for (const node of project.nodes.filter((item) => item.status !== 'deprecated')) {
    const classification = String(node.properties.dataClassification ?? project.context.dataSensitivity ?? 'internal').toLowerCase();
    const normalized = (['public','internal','confidential','restricted'].includes(classification) ? classification : 'internal') as ArchitectureTrustZone['dataClassification'];
    const boundary = String(node.properties.networkZone ?? node.parentId ?? (['Actor','ExternalSystem'].includes(node.kind) ? 'external' : 'application'));
    const key = `${boundary}:${normalized}`;
    groups.set(key, [...(groups.get(key) ?? []), node]);
  }
  return [...groups.entries()].map(([key, nodes]) => {
    const [boundary, classification] = key.split(':') as [string, ArchitectureTrustZone['dataClassification']];
    const ids = nodes.map((item) => item.id);
    return {
      id: `ZONE-${stableHash(key)}`,
      name: `${boundary} · ${classification}`,
      dataClassification: classification,
      nodeIds: ids,
      ingressInterfaceIds: contracts.filter((item) => item.consumerNodeIds.some((id) => ids.includes(id)) && !ids.includes(item.providerNodeId)).map((item) => item.id),
      egressInterfaceIds: contracts.filter((item) => ids.includes(item.providerNodeId) && item.consumerNodeIds.some((id) => !ids.includes(id))).map((item) => item.id),
      requiredControls: unique(['Authenticated identities', 'Least-privilege authorization', 'Encrypted transport', ...(classification === 'restricted' ? ['Strong key custody', 'Data-loss prevention', 'Privileged-access controls'] : []), ...(boundary === 'external' ? ['Rate limiting', 'Threat protection'] : [])]),
      trustAssumptions: ['Every boundary crossing is mediated by a declared interface contract', 'Controls require runtime evidence before production acceptance'],
    };
  });
}

function failurePaths(project: ArchitectureProject, contracts: BlueprintInterfaceContract[], patternIds: string[]): ArchitectureFailurePath[] {
  const paths: ArchitectureFailurePath[] = [];
  const highValue = contracts.slice(0, 8);
  highValue.forEach((contract, index) => {
    const asynchronous = contract.interactionStyle === 'event';
    paths.push({
      id: `FAIL-${stableHash(contract.id)}`,
      name: `${contract.name} dependency failure`,
      trigger: asynchronous ? 'Broker, consumer or schema compatibility failure' : 'Provider timeout, overload or unavailability',
      affectedNodeIds: unique([contract.providerNodeId, ...contract.consumerNodeIds]),
      affectedInterfaceIds: [contract.id],
      propagationPath: [contract.providerNodeId, contract.id, ...contract.consumerNodeIds],
      containmentMechanisms: unique([asynchronous ? 'Queue isolation and dead-letter handling' : 'Timeout and circuit breaker', ...(patternIds.some((id) => /BULKHEAD|CELL|ISOLATION/i.test(id)) ? ['Failure-domain isolation'] : [])]),
      recoveryMechanisms: unique([asynchronous ? 'Replay from durable event log' : 'Controlled retry and fallback', 'Operational alert and documented recovery runbook']),
      expectedOutcome: 'Failure remains bounded, customer impact is measurable, and recovery evidence can be recorded.',
      simulationScenarioIds: asynchronous ? ['SIM-DEPENDENCY-FAILURE','SIM-LOAD-SPIKE'] : ['SIM-DEPENDENCY-FAILURE', ...(index === 0 ? ['SIM-REGION-FAILURE'] : [])],
      patternIds: unique(contract.patternIds),
    });
  });
  if (!paths.length && project.nodes.length) {
    paths.push({
      id: `FAIL-${stableHash(project.id)}`,
      name: 'Primary workload failure path',
      trigger: 'Critical runtime or dependency becomes unavailable',
      affectedNodeIds: project.nodes.slice(0, 5).map((item) => item.id),
      affectedInterfaceIds: [],
      propagationPath: project.nodes.slice(0, 5).map((item) => item.id),
      containmentMechanisms: ['Define explicit failure boundaries'],
      recoveryMechanisms: ['Create tested recovery runbook'],
      expectedOutcome: 'Recovery objectives require validation.',
      simulationScenarioIds: ['SIM-DEPENDENCY-FAILURE','SIM-REGION-FAILURE'],
      patternIds: patternIds.slice(0, 3),
    });
  }
  return paths;
}

function connectedEdgeIds(project: ArchitectureProject, nodeIds: string[]): string[] {
  const ids = new Set(nodeIds);
  return project.edges.filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId)).map((edge) => edge.id);
}

function views(project: ArchitectureProject, contracts: BlueprintInterfaceContract[], zones: ArchitectureTrustZone[], failures: ArchitectureFailurePath[]): BlueprintViewDefinition[] {
  const stage = (value: ArchitectureNode['stage']) => project.nodes.filter((node) => node.stage === value).map((node) => node.id);
  const kinds = (...values: ArchitectureNode['kind'][]) => project.nodes.filter((node) => values.includes(node.kind)).map((node) => node.id);
  const interfaceNodes = unique(contracts.flatMap((item) => [item.providerNodeId, ...item.consumerNodeIds]));
  const dataNodes = kinds('DataDomain','DataEntity','DataStore');
  const securityNodes = unique([...kinds('Control','NetworkZone'), ...zones.flatMap((item) => item.nodeIds)]);
  const resilienceNodes = unique(failures.flatMap((item) => item.affectedNodeIds));
  const definition = (id: BlueprintViewDefinition['id'], title: string, purpose: string, nodeIds: string[], interfaceIds: string[] = [], trustZoneIds: string[] = [], failurePathIds: string[] = []): BlueprintViewDefinition => ({
    id, title, purpose, nodeIds: unique(nodeIds), edgeIds: connectedEdgeIds(project, nodeIds), interfaceIds: unique(interfaceIds), trustZoneIds: unique(trustZoneIds), failurePathIds: unique(failurePathIds),
  });
  return [
    definition('system-context','System Context','Actors, external systems, system boundary and major dependencies.', unique([...kinds('Actor','ExternalSystem','System','Domain'), ...stage('logicalApplication')])),
    definition('logical-application','Logical Application','Domain capabilities and logical services independent of deployment products.', stage('logicalApplication')),
    definition('application-realization','Application Realization','Deployable units, modules, APIs, events and data stores that realize logical services.', stage('applicationRealization')),
    definition('interface-event-flow','Interface and Event Flow','Provider, consumer, protocol, schema, delivery and failure semantics for every interaction.', interfaceNodes, contracts.map((item) => item.id)),
    definition('data-architecture','Data Architecture','Data domains, stores, ownership, access and movement.', dataNodes, contracts.filter((item) => item.interactionStyle === 'database' || /data|schema|event/i.test(item.name)).map((item) => item.id)),
    definition('logical-technology','Logical Technology','Provider-neutral platform and technology capabilities.', stage('logicalTechnology')),
    definition('physical-deployment','Physical Deployment','Runtime, region, zone and network placement with logical lineage.', stage('physicalTechnology')),
    definition('security-trust-boundaries','Security and Trust Boundaries','Trust zones, boundary crossings, controls and data classifications.', securityNodes, contracts.map((item) => item.id), zones.map((item) => item.id)),
    definition('resilience-recovery','Resilience and Recovery','Failure paths, containment, failover and recovery mechanisms.', resilienceNodes, unique(failures.flatMap((item) => item.affectedInterfaceIds)), [], failures.map((item) => item.id)),
    definition('cross-stage-traceability','Cross-stage Traceability','Requirements and patterns traced through logical, realization, technology and physical architecture.', project.nodes.map((node) => node.id), contracts.map((item) => item.id)),
  ];
}

function traceability(project: ArchitectureProject, lineage: BlueprintComponentLineage[], contracts: BlueprintInterfaceContract[], obligationIds: string[]): CrossStageTraceabilityRow[] {
  const rows = project.objectives.map((objective, index) => ({ ref: `objective:${index + 1}`, objective }));
  project.qualityScenarios.forEach((scenario) => rows.push({ ref: `quality:${scenario.id}`, objective: `${scenario.attributeId}: ${scenario.responseMeasure}` }));
  if (!rows.length) rows.push({ ref: 'objective:1', objective: project.description || project.name });
  return rows.map(({ ref, objective }) => {
    let relevant = lineage.filter((item) => item.requirementRefs.includes(ref));
    if (!relevant.length) relevant = lineage.filter((_, index) => index % rows.length === rows.findIndex((item) => item.ref === ref));
    const byStage = (stage: ArchitectureNode['stage']) => relevant.filter((item) => item.stage === stage).map((item) => item.nodeId);
    const interfaceIds = contracts.filter((item) => item.requirementRefs.includes(ref) || [item.providerNodeId, ...item.consumerNodeIds].some((id) => relevant.some((entry) => entry.nodeId === id))).map((item) => item.id);
    const patternIds = unique(relevant.flatMap((item) => item.patternIds));
    const logicalNodeIds = byStage('logicalApplication');
    const realizationNodeIds = byStage('applicationRealization');
    const technologyNodeIds = byStage('logicalTechnology');
    const physicalNodeIds = byStage('physicalTechnology');
    const evidenceStatus = logicalNodeIds.length && realizationNodeIds.length && technologyNodeIds.length && physicalNodeIds.length ? 'complete' : relevant.length ? 'partial' : 'missing';
    return { requirementRef: ref, objective, logicalNodeIds, realizationNodeIds, technologyNodeIds, physicalNodeIds, interfaceIds, patternIds, obligationIds: obligationIds.filter((_, i) => i % rows.length === rows.findIndex((item) => item.ref === ref)), evidenceStatus };
  });
}

export function buildArchitectureBlueprint(alternative: Pick<ArchitectureAlternative, 'id' | 'projectedProject' | 'patternIds' | 'obligations' | 'costProjection'>): ArchitectureBlueprint {
  const project = alternative.projectedProject;
  const lineage = componentLineage(project, alternative.patternIds);
  const contracts = interfaces(project, alternative.patternIds);
  const mappings = capabilityMappings(project);
  const canonicalModelFingerprint = `fnv1a-${stableHash({ nodes: project.nodes, edges: project.edges, interfaces: project.interfaces })}`;
  const overlays = providerOverlays(mappings, project, canonicalModelFingerprint);
  const topology = deploymentTopology(project, alternative.patternIds, alternative.costProjection.relativeClass);
  const zones = trustZones(project, contracts);
  const failures = failurePaths(project, contracts, alternative.patternIds);
  const viewDefinitions = views(project, contracts, zones, failures);
  const rows = traceability(project, lineage, contracts, alternative.obligations.map((item) => item.id));
  const componentComplete = lineage.filter((item) => item.requirementRefs.length && item.patternIds.length).length;
  const contractComplete = contracts.filter((item) => item.providerNodeId && item.consumerNodeIds.length && item.protocol && item.schemaRef).length;
  const physical = topology.length;
  const physicalComplete = topology.filter((item) => item.logicalCapabilityIds.length).length;
  const warnings = [
    ...(contracts.some((item) => item.contractStatus === 'review-required') ? ['One or more interface contracts require named ownership or a governed contract location.'] : []),
    ...(physical && physicalComplete < physical ? ['Some physical elements do not yet trace to a logical capability.'] : []),
    'Provider overlays are proposals only and cannot override the provider-neutral canonical model.',
  ];
  return {
    id: `BLUEPRINT-${stableHash(`${alternative.id}:${project.revision}`)}`,
    alternativeId: alternative.id,
    generatedAt: new Date().toISOString(),
    blueprintVersion: '2.0',
    canonicalModelFingerprint,
    providerNeutralFirst: true,
    componentLineage: lineage,
    interfaceContracts: contracts,
    capabilityProductMappings: mappings,
    providerOverlays: overlays,
    deploymentTopology: topology,
    trustZones: zones,
    failurePaths: failures,
    views: viewDefinitions,
    traceability: rows,
    completeness: {
      componentTraceabilityPercent: percent(componentComplete, lineage.length),
      interfaceContractPercent: percent(contractComplete, contracts.length),
      physicalToLogicalTraceabilityPercent: percent(physicalComplete, physical),
      requiredViewsPresent: viewDefinitions.length,
      requiredViewsTotal: 10,
    },
    warnings,
  };
}

export function buildAlternativeCounterfactuals(alternatives: ArchitectureAlternative[]): AlternativeCounterfactual[] {
  const output: AlternativeCounterfactual[] = [];
  for (const alternative of alternatives) {
    const competitors = alternatives.filter((item) => item.id !== alternative.id).sort((a, b) => b.scorecard.overall - a.scorecard.overall).slice(0, 2);
    for (const competitor of competitors) {
      const dimensions = Object.keys(alternative.scorecard).filter((key) => key !== 'overall' && ((competitor.scorecard as unknown as Record<string, number>)[key] ?? 0) > ((alternative.scorecard as unknown as Record<string, number>)[key] ?? 0) + 4);
      output.push({
        alternativeId: alternative.id,
        comparedWithAlternativeId: competitor.id,
        condition: dimensions.length ? `Increase the priority of ${dimensions.slice(0, 3).join(', ')}.` : 'Change delivery, cost or operating constraints materially.',
        whyRankingWouldChange: dimensions.length ? `${competitor.name} currently leads on ${dimensions.join(', ')}; prioritising those dimensions could move it above ${alternative.name}.` : 'The alternatives are close; a change in context evidence or mandatory constraints could reverse the ranking.',
        dimensionsAffected: dimensions,
        patternsAddedOrRemoved: unique([...competitor.patternIds.filter((id) => !alternative.patternIds.includes(id)).map((id) => `add:${id}`), ...alternative.patternIds.filter((id) => !competitor.patternIds.includes(id)).map((id) => `remove:${id}`)]).slice(0, 8),
      });
    }
  }
  return output;
}
