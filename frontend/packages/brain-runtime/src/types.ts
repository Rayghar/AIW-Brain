export type AiwLifecycleStage =
  | 'requirements-intent'
  | 'quality-drivers'
  | 'system-context'
  | 'logical-application'
  | 'application-realization'
  | 'logical-technology'
  | 'physical-technology'
  | 'review-assurance'
  | 'sdd-pack';

export type BrainSignalSourceType =
  | 'deterministic'
  | 'knowledge'
  | 'llm'
  | 'mind-factory'
  | 'system';

export type BrainSignalAuthority =
  | 'authoritative-kernel'
  | 'presentation-projection'
  | 'llm-assist';

export type BrainSignalSeverity =
  | 'silent'
  | 'hint'
  | 'recommendation'
  | 'warning'
  | 'blocker'
  | 'review'
  | 'evidence'
  | 'handoff';

export type BrainSignalSurface =
  | 'silent-ranking'
  | 'canvas-badge'
  | 'library-chip'
  | 'stage-health-chip'
  | 'bottom-brain-signal'
  | 'info-center'
  | 'decision-radar'
  | 'co-architect'
  | 'drop-preflight'
  | 'stage-gate'
  | 'admin-only';

export type BrainSignalCategory =
  | 'driver-fit'
  | 'style-fit'
  | 'style-constraint'
  | 'pattern-fit'
  | 'pattern-obligation'
  | 'object-completeness'
  | 'interface-critique'
  | 'evidence-quality'
  | 'mind-factory-release'
  | 'review-readiness'
  | 'sdd-readiness'
  | 'cost-governance'
  | 'security-governance';

export interface BrainEvidenceRef {
  id: string;
  label: string;
  sourceType: 'knowledge-record' | 'pattern-record' | 'policy' | 'project-state' | 'llm-output' | 'runtime-signal' | 'audit';
  uri?: string;
  confidence?: number;
}

export interface BrainSignalAction {
  id: string;
  label: string;
  kind: 'open-info' | 'open-radar' | 'ask-coarchitect' | 'apply-fix' | 'accept-pattern' | 'define-interface' | 'open-stage' | 'dismiss';
  payload?: Record<string, unknown>;
}

export interface BrainSignal {
  id: string;
  stage: AiwLifecycleStage;
  category: BrainSignalCategory;
  sourceType: BrainSignalSourceType;
  /** The canonical kernel wins when a presentation projection overlaps it. */
  authority: BrainSignalAuthority;
  sourceId?: string;
  objectId?: string;
  patternId?: string;
  styleId?: string;
  severity: BrainSignalSeverity;
  confidence: number;
  title: string;
  shortMessage: string;
  detail?: string;
  recommendedAction?: string;
  actions?: BrainSignalAction[];
  evidence?: BrainEvidenceRef[];
  surfaces: BrainSignalSurface[];
  dismissible?: boolean;
  dismissed?: boolean;
  createdAt: string;
}

export interface QualityDriverInput {
  id: string;
  name: string;
  weight: number;
  target?: string;
  scenarioComplete?: boolean;
}

export interface ArchitectureStyleInput {
  id: string;
  name: string;
  fitScore?: number;
  driverAffinity?: Record<string, number>;
  requiredPatterns?: string[];
  discouragedPatterns?: string[];
  requiredObjectFamilies?: string[];
}

export interface PatternInput {
  id: string;
  name: string;
  accepted?: boolean;
  candidate?: boolean;
  obligations?: PatternObligation[];
  requires?: string[];
  conflictsWith?: string[];
  pairsWith?: string[];
}

export interface PatternObligation {
  id: string;
  label: string;
  domain: 'security' | 'resilience' | 'observability' | 'data' | 'integration' | 'deployment' | 'review';
  severity?: 'hint' | 'warning' | 'blocker';
  evidenceRequired?: boolean;
}

export interface ArchitectureObjectInput {
  id: string;
  name: string;
  family: string;
  stage?: AiwLifecycleStage;
  attributes?: Record<string, unknown>;
  inboundInterfaces?: InterfaceInput[];
  outboundInterfaces?: InterfaceInput[];
  owner?: string;
  acceptedPatternIds?: string[];
}

export interface InterfaceInput {
  id: string;
  name: string;
  kind: 'api' | 'event' | 'data-contract' | 'command' | 'stream' | 'file' | 'human';
  direction: 'inbound' | 'outbound';
  contractDefined?: boolean;
  owner?: string;
  consumerId?: string;
  producerId?: string;
}

export interface MindFactoryInput {
  activeReleaseId?: string;
  releaseConfidence?: number;
  staleRecords?: number;
  contradictionsOpen?: number;
  candidateRecords?: number;
  approvedRecords?: number;
}

export interface BrainContext {
  projectId: string;
  activeStage: AiwLifecycleStage;
  selectedObjectId?: string;
  selectedStyleId?: string;
  qualityDrivers: QualityDriverInput[];
  candidateStyles: ArchitectureStyleInput[];
  acceptedPatterns: PatternInput[];
  candidatePatterns: PatternInput[];
  architectureObjects: ArchitectureObjectInput[];
  mindFactory?: MindFactoryInput;
  dismissedSignalIds?: string[];
  now?: string;
}

export interface NoiseBudget {
  canvasBadges: number;
  libraryChipsPerItem: number;
  stageHealthChips: number;
  bottomBrainSignals: number;
  infoCenterItems: number;
}
