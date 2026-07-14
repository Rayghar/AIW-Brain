export type ArchitectureStage =
  | 'requirements'
  | 'quality-drivers'
  | 'logical-application'
  | 'application-realization'
  | 'logical-technology'
  | 'physical-technology'
  | 'review-assurance'
  | 'sdd-pack';

export type BrainSignalSourceType = 'deterministic' | 'knowledge' | 'llm' | 'system';

export type BrainSignalSeverity =
  | 'silent'
  | 'hint'
  | 'warning'
  | 'blocker'
  | 'recommendation'
  | 'review'
  | 'evidence'
  | 'handoff';

export type BrainSignalSurface =
  | 'silent-ranking'
  | 'canvas-badge'
  | 'library-chip'
  | 'stage-health-chip'
  | 'bottom-dock'
  | 'info-center'
  | 'decision-radar'
  | 'co-architect'
  | 'drop-preflight'
  | 'stage-gate'
  | 'admin-only';

export interface EvidenceRef {
  id: string;
  title: string;
  sourceType: 'knowledge-record' | 'policy' | 'pattern' | 'architecture-object' | 'review-check' | 'llm-citation' | 'system-event';
  uri?: string;
  confidence?: number;
}

export interface SurfacePolicy {
  primary: BrainSignalSurface;
  secondary?: BrainSignalSurface[];
  requiresUserAction?: boolean;
  dismissible?: boolean;
  noisy?: boolean;
}

export interface BrainSignal {
  id: string;
  projectId: string;
  stage: ArchitectureStage;
  objectId?: string;
  source: string;
  sourceType: BrainSignalSourceType;
  severity: BrainSignalSeverity;
  confidence: number;
  title: string;
  shortMessage: string;
  detail?: string;
  recommendedAction?: string;
  evidence?: EvidenceRef[];
  surfacePolicy: SurfacePolicy;
  dismissed?: boolean;
  createdAt: string;
}

export interface BrainSignalInputFinding {
  id?: string;
  projectId: string;
  stage: ArchitectureStage;
  objectId?: string;
  source: string;
  sourceType: BrainSignalSourceType;
  severity?: BrainSignalSeverity;
  confidence?: number;
  title: string;
  message: string;
  detail?: string;
  recommendedAction?: string;
  evidence?: EvidenceRef[];
  tags?: string[];
  readinessImpact?: number;
}

export interface SignalContext {
  projectId: string;
  stage: ArchitectureStage;
  selectedObjectId?: string;
  activePanel?: 'canvas' | 'library' | 'info-center' | 'decision-radar' | 'co-architect' | 'review' | 'sdd';
  userMode?: 'quiet' | 'guided' | 'detailed';
  dismissedSignalIds?: string[];
}

export interface SignalBudget {
  canvasBadges: number;
  libraryChipsPerItem: number;
  stageHealthChips: number;
  bottomDock: number;
  infoCenter: number;
  decisionRadar: number;
}

export const DEFAULT_SIGNAL_BUDGET: SignalBudget = {
  canvasBadges: 5,
  libraryChipsPerItem: 2,
  stageHealthChips: 4,
  bottomDock: 1,
  infoCenter: 50,
  decisionRadar: 20,
};
