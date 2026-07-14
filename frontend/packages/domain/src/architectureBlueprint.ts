import type { ArchitectureStage, InterfaceInteractionStyle } from './types.js';

export const architectureBlueprintViewIds = [
  'system-context',
  'logical-application',
  'application-realization',
  'interface-event-flow',
  'data-architecture',
  'logical-technology',
  'physical-deployment',
  'security-trust-boundaries',
  'resilience-recovery',
  'cross-stage-traceability',
] as const;

export type ArchitectureBlueprintViewId = (typeof architectureBlueprintViewIds)[number];

export interface SynthesisEligibilityCriterion {
  id: string;
  title: string;
  passed: boolean;
  blocking: boolean;
  evidence: string[];
  remediation?: string;
}

export interface SynthesisEligibilityDecision {
  evaluatedAt: string;
  eligible: boolean;
  exploratoryOnly: boolean;
  deterministicRuleVersion: string;
  criteria: SynthesisEligibilityCriterion[];
  disqualifiers: string[];
}

export interface BlueprintComponentLineage {
  nodeId: string;
  nodeKind: string;
  stage: ArchitectureStage;
  requirementRefs: string[];
  patternIds: string[];
  logicalNodeIds: string[];
  capabilityIds: string[];
  provenance: string[];
}

export interface BlueprintInterfaceContract {
  id: string;
  name: string;
  providerNodeId: string;
  consumerNodeIds: string[];
  interactionStyle: InterfaceInteractionStyle;
  protocol: string;
  operationOrEvent: string;
  version: string;
  schemaRef: string;
  authentication: string;
  authorization: string;
  encryption: string;
  timeoutMs?: number;
  retryPolicy: string;
  idempotency: string;
  ordering: string;
  deliveryGuarantee: string;
  deadLetterPolicy: string;
  replayPolicy: string;
  slo: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  owner: string;
  contractStatus: 'generated' | 'inherited' | 'review-required';
  requirementRefs: string[];
  patternIds: string[];
}

export interface CapabilityProductOption {
  id: string;
  provider: 'portable' | 'aws' | 'azure' | 'gcp' | 'on-premises';
  productName: string;
  rationale: string;
  portabilityNotes: string[];
}

export interface CapabilityProductMapping {
  capabilityId: string;
  capabilityName: string;
  logicalNodeIds: string[];
  neutralDefinition: string;
  requiredCharacteristics: string[];
  productOptions: CapabilityProductOption[];
  selectedProductOptionId?: string;
  selectionStatus: 'neutral' | 'proposed' | 'approved';
}

export interface ProviderOverlayMapping {
  canonicalNodeId: string;
  neutralCapabilityId: string;
  providerProduct: string;
  configurationAssumptions: string[];
  lockInRisks: string[];
}

export interface ProviderOverlay {
  id: string;
  provider: 'aws' | 'azure' | 'gcp' | 'on-premises' | 'portable';
  status: 'proposal' | 'reviewed' | 'approved';
  generatedAt: string;
  canonicalModelFingerprint: string;
  mappings: ProviderOverlayMapping[];
  warnings: string[];
}

export interface DeploymentTopologyElement {
  id: string;
  nodeId: string;
  logicalCapabilityIds: string[];
  runtimeClass: string;
  regionStrategy: string;
  availabilityZoneStrategy: string;
  networkZone: string;
  scalingModel: string;
  recoveryClass: string;
  relativeCostClass: 'low' | 'medium' | 'high' | 'very-high';
  operationalComplexity: number;
  patternIds: string[];
}

export interface ArchitectureTrustZone {
  id: string;
  name: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
  nodeIds: string[];
  ingressInterfaceIds: string[];
  egressInterfaceIds: string[];
  requiredControls: string[];
  trustAssumptions: string[];
}

export interface ArchitectureFailurePath {
  id: string;
  name: string;
  trigger: string;
  affectedNodeIds: string[];
  affectedInterfaceIds: string[];
  propagationPath: string[];
  containmentMechanisms: string[];
  recoveryMechanisms: string[];
  expectedOutcome: string;
  simulationScenarioIds: string[];
  patternIds: string[];
}

export interface BlueprintViewDefinition {
  id: ArchitectureBlueprintViewId;
  title: string;
  purpose: string;
  nodeIds: string[];
  edgeIds: string[];
  interfaceIds: string[];
  trustZoneIds: string[];
  failurePathIds: string[];
}

export interface CrossStageTraceabilityRow {
  requirementRef: string;
  objective: string;
  logicalNodeIds: string[];
  realizationNodeIds: string[];
  technologyNodeIds: string[];
  physicalNodeIds: string[];
  interfaceIds: string[];
  patternIds: string[];
  obligationIds: string[];
  evidenceStatus: 'complete' | 'partial' | 'missing';
}

export interface ArchitectureBlueprint {
  id: string;
  alternativeId: string;
  generatedAt: string;
  blueprintVersion: '2.0';
  canonicalModelFingerprint: string;
  providerNeutralFirst: true;
  componentLineage: BlueprintComponentLineage[];
  interfaceContracts: BlueprintInterfaceContract[];
  capabilityProductMappings: CapabilityProductMapping[];
  providerOverlays: ProviderOverlay[];
  deploymentTopology: DeploymentTopologyElement[];
  trustZones: ArchitectureTrustZone[];
  failurePaths: ArchitectureFailurePath[];
  views: BlueprintViewDefinition[];
  traceability: CrossStageTraceabilityRow[];
  completeness: {
    componentTraceabilityPercent: number;
    interfaceContractPercent: number;
    physicalToLogicalTraceabilityPercent: number;
    requiredViewsPresent: number;
    requiredViewsTotal: number;
  };
  warnings: string[];
}

export interface AlternativeCounterfactual {
  alternativeId: string;
  comparedWithAlternativeId: string;
  condition: string;
  whyRankingWouldChange: string;
  dimensionsAffected: string[];
  patternsAddedOrRemoved: string[];
}
