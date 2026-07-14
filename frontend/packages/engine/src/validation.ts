import { createId, type ArchitectureEdge, type ArchitectureNode, type ArchitectureProject, type Finding, type KnowledgeLibrary } from '@aiw/domain';
import { evaluateGovernanceRulePacks } from './governance.js';
import { validateProjectSecurity } from './security.js';

const crossStageKinds = new Set(['realizes', 'implements', 'mapsTo', 'deployedOn', 'hostedBy', 'selectedBecauseOf']);

function finding(input: Omit<Finding, 'id'>): Finding {
  return { id: createId('finding'), ...input };
}

function acceptedStyleIds(project: ArchitectureProject): Set<string> {
  return new Set(project.styleDecisions.filter((item) => item.status === 'accepted').map((item) => item.styleId));
}

export function validateProject(project: ArchitectureProject, library?: KnowledgeLibrary): Finding[] {
  const findings: Finding[] = [];
  const nodeMap = new Map(project.nodes.map((node) => [node.id, node]));
  const styleIds = acceptedStyleIds(project);

  for (const edge of project.edges) {
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) {
      findings.push(finding({
        ruleId: 'GRAPH-ORPHAN-EDGE',
        severity: 'HARD',
        title: 'Orphaned relationship',
        message: `Relationship ${edge.id} references a node that does not exist.`,
        rationale: 'A graph relationship must resolve to valid source and target entities.',
        affectedNodeIds: [edge.sourceId, edge.targetId],
        affectedEdgeIds: [edge.id],
        mitigations: ['Restore the missing node or remove the relationship.'],
        canOverride: false,
      }));
      continue;
    }
    if (source.stage !== target.stage && !crossStageKinds.has(edge.kind)) {
      findings.push(finding({
        ruleId: 'META-CROSS-STAGE-RELATION',
        severity: 'HARD',
        title: 'Invalid cross-stage relationship',
        message: `${edge.kind} cannot directly connect ${source.stage} to ${target.stage}.`,
        rationale: 'Cross-stage traceability must use typed realization or mapping relationships so abstraction boundaries remain explicit.',
        affectedNodeIds: [source.id, target.id],
        affectedEdgeIds: [edge.id],
        mitigations: ['Use realizes, implements, mapsTo, deployedOn or hostedBy as applicable.'],
        canOverride: false,
      }));
    }
  }

  for (const node of project.nodes.filter((item) => item.stage !== 'designIntent' && item.stage !== 'logicalApplication')) {
    if (node.lineageFrom.length === 0) {
      findings.push(finding({
        ruleId: 'TRACE-MISSING-LINEAGE',
        severity: 'SIGNIFICANT',
        title: 'Missing upstream lineage',
        message: `${node.label} has no upstream realization or mapping lineage.`,
        rationale: 'Every downstream realization should explain which upstream design element it implements.',
        affectedNodeIds: [node.id],
        affectedEdgeIds: [],
        mitigations: ['Map the element to one or more upstream architecture entities.'],
        canOverride: true,
      }));
    }
  }

  const eventDriven = styleIds.has('STYLE-EVENT-DRIVEN');
  if (eventDriven) {
    for (const edge of project.edges.filter((item) => item.properties.protocolStyle === 'synchronous')) {
      findings.push(finding({
        ruleId: 'STYLE-EDA-SYNC-TENSION',
        severity: 'ADVISORY',
        title: 'Synchronous interaction inside an event-driven scope',
        message: `${edge.label ?? edge.id} is synchronous within a scope that also uses event-driven architecture.`,
        rationale: 'This is not inherently invalid, but it introduces temporal coupling and should be justified against latency, consistency and availability needs.',
        affectedNodeIds: [edge.sourceId, edge.targetId],
        affectedEdgeIds: [edge.id],
        mitigations: ['Document why request-response is required.', 'Add timeout, retry and circuit-breaker tactics where appropriate.'],
        canOverride: true,
      }));
    }
  }

  const asynchronousEdges = project.edges.filter((edge) => edge.kind === 'publishes' || edge.kind === 'subscribes' || edge.properties.protocolStyle === 'asynchronous');
  const hasMessagingCapability = project.nodes.some((node) =>
    node.kind === 'LogicalTechnologyCapability' && /broker|stream|queue|messag/i.test(node.label),
  );
  if (asynchronousEdges.length > 0 && !hasMessagingCapability) {
    findings.push(finding({
      ruleId: 'INT-ASYNC-NO-MESSAGING-CAPABILITY',
      severity: 'SIGNIFICANT',
      title: 'Asynchronous flow lacks a logical messaging capability',
      message: 'The model includes asynchronous interactions but does not yet define the transport, delivery or failure-handling capability.',
      rationale: 'Asynchronous architecture requires explicit ownership of delivery guarantees, retry, dead-letter handling and observability.',
      affectedNodeIds: [...new Set(asynchronousEdges.flatMap((edge) => [edge.sourceId, edge.targetId]))],
      affectedEdgeIds: asynchronousEdges.map((edge) => edge.id),
      mitigations: ['Add a logical message broker or event-streaming capability.', 'Define idempotency and dead-letter handling obligations.'],
      canOverride: true,
    }));
  }

  for (const node of project.nodes.filter((item) => item.kind === 'DeployableUnit' && item.properties.public === true)) {
    const hasControl = project.nodes.some((candidate) => candidate.kind === 'Control' && /auth|identity|access/i.test(candidate.label));
    if (!hasControl) {
      findings.push(finding({
        ruleId: 'SEC-PUBLIC-NO-ACCESS-CONTROL',
        severity: 'SIGNIFICANT',
        title: 'Public application boundary has no modeled access control',
        message: `${node.label} is public but authentication and authorization controls are absent from the model.`,
        rationale: 'Public attack surfaces require explicit identity and access-control responsibilities.',
        affectedNodeIds: [node.id],
        affectedEdgeIds: [],
        mitigations: ['Add an identity provider or API access-control component.', 'Define authentication and authorization obligations.'],
        canOverride: true,
      }));
    }
  }

  const availabilityWeight = project.qualityPriorities.find((priority) => priority.attributeId === 'availability')?.weight ?? 0;
  if (availabilityWeight >= 4) {
    for (const node of project.nodes.filter((item) => item.stage === 'physicalTechnology')) {
      const replicas = Number(node.properties.replicas ?? 1);
      const zones = Number(node.properties.availabilityZones ?? 1);
      if (replicas < 2 || zones < 2) {
        findings.push(finding({
          ruleId: 'DEPLOY-HA-SINGLE-FAILURE-DOMAIN',
          severity: 'SIGNIFICANT',
          title: 'High-availability objective is not realized',
          message: `${node.label} is configured with ${replicas} replica(s) across ${zones} availability zone(s).`,
          rationale: 'A top-priority availability objective requires redundancy across independent failure domains.',
          affectedNodeIds: [node.id],
          affectedEdgeIds: [],
          mitigations: ['Increase replicas to at least two.', 'Distribute instances across at least two failure domains.'],
          canOverride: true,
        }));
      }
    }
  }

  findings.push(...validateProjectSecurity(project));
  if (library) findings.push(...evaluateGovernanceRulePacks(project, library));
  return findings;
}

export function validateProposedEdge(
  project: ArchitectureProject,
  edge: ArchitectureEdge,
): { allowed: boolean; findings: Finding[] } {
  const candidate: ArchitectureProject = { ...project, edges: [...project.edges, edge] };
  const findings = validateProject(candidate).filter((item) => item.affectedEdgeIds.includes(edge.id));
  return { allowed: !findings.some((item) => item.severity === 'HARD'), findings };
}

export function validateProposedNode(
  project: ArchitectureProject,
  node: ArchitectureNode,
): { allowed: boolean; findings: Finding[] } {
  const prohibited = project.context.prohibitedTechnologies ?? [];
  const violations = prohibited.filter((item) => node.label.toLowerCase().includes(item.toLowerCase()));
  if (violations.length === 0) return { allowed: true, findings: [] };
  return {
    allowed: false,
    findings: [finding({
      ruleId: 'POLICY-PROHIBITED-TECHNOLOGY',
      severity: 'HARD',
      title: 'Prohibited technology selection',
      message: `${node.label} conflicts with the prohibited technology list.`,
      rationale: 'An explicit organization policy is a hard constraint until it is changed or formally waived.',
      affectedNodeIds: [node.id],
      affectedEdgeIds: [],
      mitigations: [`Choose an approved alternative to ${violations.join(', ')}.`],
      canOverride: false,
    })],
  };
}
