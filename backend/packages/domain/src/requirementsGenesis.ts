import type { ArchitectureContextGraph, ArchitectureSemanticChange } from './architectureContextGraph.js';
export const requirementSourceKinds = ['idea','paste','text','markdown','docx','pdf','spreadsheet','workshop-note','existing-sdd'] as const;
export type RequirementSourceKind = (typeof requirementSourceKinds)[number];

export const requirementOriginKinds = ['source-derived','user-entered','deterministically-derived','knowledge-suggested','llm-inferred','architect-confirmed','rejected'] as const;
export type RequirementOrigin = (typeof requirementOriginKinds)[number];

export const requirementRecordTypes = ['business','functional','business-rule','quality','data','integration','security','operational','constraint','assumption','dependency','risk'] as const;
export type RequirementRecordType = (typeof requirementRecordTypes)[number];

export const requirementLifecycleStatuses = ['candidate','needs-clarification','accepted','rejected','superseded'] as const;
export type RequirementLifecycleStatus = (typeof requirementLifecycleStatuses)[number];

export interface RequirementSourceSection {
  id: string;
  heading: string;
  order: number;
  text: string;
  excerpt: string;
}

export interface RequirementSourceRecord {
  id: string;
  name: string;
  mediaType: string;
  kind: RequirementSourceKind;
  classification: 'public'|'internal'|'confidential'|'restricted';
  version: number;
  status: 'uploaded'|'extracted'|'needs-attention'|'replaced';
  contentHash: string;
  characterCount: number;
  excerpt: string;
  sections: RequirementSourceSection[];
  warnings: string[];
  addedAt: string;
  replacedBySourceId?: string;
}

export interface RequirementEvidenceReference {
  id: string;
  sourceId: string;
  sectionId?: string;
  excerpt: string;
  locator: string;
}

export interface CanonicalRequirementRecord {
  id: string;
  title: string;
  statement: string;
  type: RequirementRecordType;
  priority: 'critical'|'high'|'medium'|'low'|'unprioritized';
  origin: RequirementOrigin;
  status: RequirementLifecycleStatus;
  confidence: number;
  evidenceRefs: string[];
  stakeholderRefs: string[];
  journeyRefs: string[];
  acceptanceCriteria: string[];
  qualityAttributeHints: string[];
  tags: string[];
  ambiguityFlags: string[];
  rationale: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementStakeholder {
  id: string;
  name: string;
  role: string;
  concerns: string[];
  decisionRights: string[];
  origin: RequirementOrigin;
  evidenceRefs: string[];
  status: RequirementLifecycleStatus;
}

export interface RequirementOpenQuestion {
  id: string;
  question: string;
  whyItMatters: string;
  impact: 'critical'|'high'|'medium'|'low';
  relatedRequirementRefs: string[];
  relatedJourneyRefs: string[];
  status: 'open'|'answered'|'deferred';
  answer?: string;
}


export interface RequirementConflict {
  id: string;
  kind: 'duplicate'|'contradiction'|'terminology'|'numeric-target'|'scope'|'temporal'|'policy-hierarchy'|'legal-review';
  leftRef: string;
  rightRef: string;
  severity: 'critical'|'high'|'medium'|'low';
  summary: string;
  rationale: string;
  status: 'open'|'resolved'|'accepted-variance'|'false-positive';
  resolution?: string;
  analysis?: {
    normalizedSubject?: string;
    normalizedAction?: string;
    leftModality?: 'must'|'must-not'|'should'|'may'|'unknown';
    rightModality?: 'must'|'must-not'|'should'|'may'|'unknown';
    leftMeasurements?: string[];
    rightMeasurements?: string[];
    jurisdictions?: string[];
    effectiveDates?: string[];
    sourceAuthorities?: string[];
    policyPrecedence?: string[];
    legalReviewRequired?: boolean;
    autoResolutionAllowed?: boolean;
  };
}

export interface LegacyRequirementsMigrationReceipt {
  migratedAt: string;
  fromProjectRevision: number;
  sourceId: string;
  projectedObjectiveCount: number;
  projectedConstraintCount: number;
  projectedAssumptionCount: number;
  projectedStakeholderCount: number;
  projectedCapabilityCount: number;
  canonicalAuthority: 'requirements-intelligence';
  legacyFieldsRetainedAsProjection: true;
}

export const journeyPathKinds = ['happy','alternate','failure','recovery'] as const;
export type JourneyPathKind = (typeof journeyPathKinds)[number];

export interface JourneyParticipant {
  id: string;
  name: string;
  kind: 'human'|'system-of-interest'|'external-system'|'team'|'data-store';
  description: string;
  stakeholderRef?: string;
  systemNodeRef?: string;
}

export interface JourneyInteraction {
  id: string;
  sequence: number;
  fromParticipantId: string;
  toParticipantId: string;
  label: string;
  interactionKind: 'command'|'query'|'event'|'notification'|'manual-task'|'data-exchange';
  requirementRefs: string[];
  qualityRefs: string[];
  dataObjects: string[];
  trustBoundaryCrossing: boolean;
  timingExpectation?: string;
  failureBehaviour?: string;
  status: 'candidate'|'accepted'|'rejected';
}

export interface JourneyPath {
  id: string;
  kind: JourneyPathKind;
  name: string;
  description: string;
  interactions: JourneyInteraction[];
}

export interface SolutionJourney {
  id: string;
  name: string;
  goal: string;
  description: string;
  priority: 'critical'|'high'|'medium'|'low';
  origin: RequirementOrigin;
  status: RequirementLifecycleStatus;
  actorRefs: string[];
  requirementRefs: string[];
  participants: JourneyParticipant[];
  paths: JourneyPath[];
  qualityHotspots: string[];
  architectureObligations: string[];
  createdAt: string;
  updatedAt: string;
}

export type SequenceCandidateStatus = 'candidate'|'accepted'|'rejected'|'deferred'|'stale'|'superseded';
export type SequenceParticipantType = 'actor'|'system'|'service'|'data-store'|'external-system'|'operator';

export interface RequirementsSequenceParticipant {
  id: string;
  name: string;
  type: SequenceParticipantType;
  boundary: 'user'|'aiw-system'|'trusted-enterprise'|'external'|'unknown';
  sourceRefs: string[];
}

export interface RequirementsSequenceMessage {
  id: string;
  order: number;
  fromParticipantId: string;
  toParticipantId: string;
  label: string;
  semantics: 'synchronous'|'asynchronous'|'manual';
  classification: 'command'|'query'|'event'|'notification'|'data-exchange'|'manual-task';
  protocol?: string;
  request?: string;
  response?: string;
  dataClassifications: string[];
  trustBoundaryCrossing: boolean;
  authenticationPoint: boolean;
  authorisationPoint: boolean;
  timeout?: string;
  retry?: string;
  idempotency?: string;
  requirementRefs: string[];
  journeyStepRefs: string[];
  interfaceRefs: string[];
  assumptionRefs: string[];
}

export interface RequirementsSequenceFragment {
  id: string;
  kind: 'alternate'|'optional'|'loop'|'parallel'|'failure'|'recovery';
  label: string;
  messageRefs: string[];
  condition?: string;
}

export interface RequirementsSequenceDiagram {
  id: string;
  projectId: string;
  revision: number;
  title: string;
  scenario: string;
  trigger: string;
  preconditions: string[];
  participants: RequirementsSequenceParticipant[];
  messages: RequirementsSequenceMessage[];
  fragments: RequirementsSequenceFragment[];
  compensatingActions: string[];
  requirementRefs: string[];
  journeyRefs: string[];
  interfaceRefs: string[];
  unresolvedAssumptions: string[];
  status: SequenceCandidateStatus;
  supersedesId?: string;
  staleReason?: string;
  fingerprint: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementsHealthGap {
  id: string;
  dimension: 'completeness'|'clarity'|'testability'|'traceability'|'journey-coverage'|'stakeholder-coverage'|'contradiction'|'architecture-significance';
  severity: 'critical'|'high'|'medium'|'low';
  title: string;
  detail: string;
  relatedRefs: string[];
  recommendedAction: string;
}

export interface RequirementsHealthAssessment {
  completeness: number;
  clarity: number;
  testability: number;
  traceability: number;
  journeyCoverage: number;
  stakeholderCoverage: number;
  contradictionCount: number;
  openCriticalQuestions: number;
  assessedAt: string;
  gaps: RequirementsHealthGap[];
}

export const architectureContextTargets = ['qualityDrivers','systemContext','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','reviewAssurance','sddPack'] as const;
export type ArchitectureContextTarget = (typeof architectureContextTargets)[number];

export interface ArchitectureContextPackage {
  id: string;
  target: ArchitectureContextTarget;
  version: number;
  projectRevision: number;
  compiledAt: string;
  contextFingerprint: string;
  summary: string;
  requirementRefs: string[];
  stakeholderRefs: string[];
  journeyRefs: string[];
  qualityDriverHints: string[];
  architectureObligations: string[];
  unresolvedQuestionRefs: string[];
  sourceRefs: string[];
}

export interface RequirementsIntelligenceState {
  schemaVersion: '1.0';
  knowledgeReleaseId: string;
  sources: RequirementSourceRecord[];
  evidence: RequirementEvidenceReference[];
  requirements: CanonicalRequirementRecord[];
  stakeholders: RequirementStakeholder[];
  journeys: SolutionJourney[];
  sequenceDiagrams?: RequirementsSequenceDiagram[];
  openQuestions: RequirementOpenQuestion[];
  health: RequirementsHealthAssessment;
  contextPackages: ArchitectureContextPackage[];
  contextGraph?: ArchitectureContextGraph;
  conflicts?: RequirementConflict[];
  semanticChanges?: ArchitectureSemanticChange[];
  migrationReceipt?: LegacyRequirementsMigrationReceipt;
  lastDistilledAt?: string;
  lastCompiledAt?: string;
}

export interface RequirementsDistillationProposal {
  schemaVersion: '1.0';
  mode: 'deterministic'|'llm-assisted'|'deterministic-fallback';
  generatedAt: string;
  projectRevision: number;
  sourceRecords: RequirementSourceRecord[];
  evidence: RequirementEvidenceReference[];
  requirements: CanonicalRequirementRecord[];
  stakeholders: RequirementStakeholder[];
  journeys: SolutionJourney[];
  openQuestions: RequirementOpenQuestion[];
  health: RequirementsHealthAssessment;
  contextPackages: ArchitectureContextPackage[];
  contextGraph?: ArchitectureContextGraph;
  conflicts?: RequirementConflict[];
  semanticChanges?: ArchitectureSemanticChange[];
  summary: string;
  notice: string;
  trace?: { providerId: string; model: string; routeId: string; requestFingerprint: string; latencyMs: number; fallbackUsed: boolean };
}

export function emptyRequirementsIntelligenceState(knowledgeReleaseId = 'CAMBRIDGE-SA-1.0'): RequirementsIntelligenceState {
  return {
    schemaVersion: '1.0',
    knowledgeReleaseId,
    sources: [], evidence: [], requirements: [], stakeholders: [], journeys: [], sequenceDiagrams: [], openQuestions: [],
    health: { completeness: 0, clarity: 0, testability: 0, traceability: 0, journeyCoverage: 0, stakeholderCoverage: 0, contradictionCount: 0, openCriticalQuestions: 0, assessedAt: new Date(0).toISOString(), gaps: [] },
    contextPackages: [],
  };
}
