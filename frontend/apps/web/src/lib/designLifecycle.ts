import type { ArchitectureStage } from '@aiw/domain';

// =============================================================================
// THE DESIGN LIFECYCLE SPINE (product-vision restoration). The founder's
// eight-step journey — Requirements → Drivers → Logical → Realization →
// Logical Tech → Physical Tech → Review → SDD — mapped HONESTLY onto the six
// canonical stages (requirements+drivers live inside Design Intent, where the
// brief and quality workspaces already do that work) plus the SDD terminal.
// Each stage declares: purpose, required inputs, how AIW helps, artifacts, and
// its handoff. The spine RENDERS this; completion is COMPUTED by
// assessStageReadiness; approval is GOVERNED by the existing
// requestStageApproval/decideStageApproval flow. No second authority.
// =============================================================================

export interface LifecycleStageGuide {
  stage: ArchitectureStage;
  step: number;
  title: string;
  purpose: string;
  inputs: string[];
  aiwHelps: string[];
  artifacts: string[];
  handoff: string;
}

export const DESIGN_LIFECYCLE: LifecycleStageGuide[] = [
  {
    stage: 'designIntent', step: 1, title: 'Requirements & Drivers',
    purpose: 'Turn intent into architecture concerns: what the system must achieve, for whom, under which constraints — and which qualities dominate.',
    inputs: ['Business objective and scope', 'Stakeholders and constraints', 'Quality drivers ranked (weight ≥ 4 for the ones that matter)', 'At least one measurable scenario'],
    aiwHelps: ['Extract drivers and scenarios from a pasted brief', 'Challenge missing constraints and unstated assumptions', 'Rank quality attributes with governed evidence'],
    artifacts: ['Architecture Design Brief', 'Quality Drivers Matrix', 'Measurable Scenario Pack'],
    handoff: 'Approve brief and drivers → push to Logical Architecture',
  },
  {
    stage: 'logicalApplication', step: 2, title: 'Logical Architecture',
    purpose: 'Shape the solution: choose the architecture style with evidence, model domains, services and their relationships.',
    inputs: ['Accepted style decision', 'Logical components with responsibilities', 'Relationships between elements'],
    aiwHelps: ['Recommend styles ranked by your drivers, with cited trade-offs', 'Suggest missing components and interrogate boundaries', 'Surface tactics your topology embodies or lacks'],
    artifacts: ['Logical Application View', 'Style Decision Record (ADR)', 'Component Responsibility Notes'],
    handoff: 'Approve logical model → push to Application Realization',
  },
  {
    stage: 'applicationRealization', step: 3, title: 'Application Realization',
    purpose: 'Make the logical model implementable: services, APIs, data ownership, integration contracts — with obligations armed.',
    inputs: ['Realization units modeled', 'An accepted pattern with its obligations', 'Integration edges with failure semantics'],
    aiwHelps: ['Recommend patterns (Pattern DNA) with obligations and evidence', 'Interrogate every edge: protocol, timeout, idempotency, breaker', 'Detect coupling and cycle risks in the graph'],
    artifacts: ['Realization View', 'Pattern Decision Records', 'Integration Contract Notes'],
    handoff: 'Approve realization → push to Logical Technology',
  },
  {
    stage: 'logicalTechnology', step: 4, title: 'Logical Technology',
    purpose: 'Choose vendor-neutral capabilities — runtime, data, messaging, security, observability — that satisfy the drivers.',
    inputs: ['Technology capabilities modeled against realization units'],
    aiwHelps: ['Check capability fit against ranked drivers', 'Flag operational burden and policy implications'],
    artifacts: ['Logical Technology View', 'Technology Decision Matrix'],
    handoff: 'Approve technology choices → push to Physical Technology',
  },
  {
    stage: 'physicalTechnology', step: 5, title: 'Physical Technology',
    purpose: 'Design the deployable reality: topology, zones, environments, failover — the architecture as it will actually run.',
    inputs: ['Deployment topology modeled', 'Resilience and security boundaries stated'],
    aiwHelps: ['Validate failure paths and single points of failure', 'Check security-zone crossings against policy packs'],
    artifacts: ['Physical Deployment View', 'Operational Readiness Notes'],
    handoff: 'Approve physical architecture → push to Review & Realize',
  },
  {
    stage: 'validationRealization', step: 6, title: 'Review & Realize (SDD)',
    purpose: 'Validate the whole against drivers, policies and obligations — then freeze the traceable record and generate the delivery pack.',
    inputs: ['Decisions recorded with rationale', 'Findings resolved or waived with owners'],
    aiwHelps: ['Run the deterministic audit: findings, risks, obligation checks', 'Draft ADR narratives and the review summary', 'Compile the Solution Delivery Pack — SDD, ADRs, views, risks, fitness tests'],
    artifacts: ['Architecture Review Report', 'ADR Pack', 'FINAL: Solution Delivery Document (SDD) Pack'],
    handoff: 'Approve architecture → Generate SDD pack (the journey\u2019s output)',
  },
];

export const STAGE_ORDER: ArchitectureStage[] = DESIGN_LIFECYCLE.map((g) => g.stage);
export const nextStageOf = (stage: ArchitectureStage): ArchitectureStage | null => {
  const i = STAGE_ORDER.indexOf(stage);
  return i >= 0 && i < STAGE_ORDER.length - 1 ? STAGE_ORDER[i + 1]! : null;
};
