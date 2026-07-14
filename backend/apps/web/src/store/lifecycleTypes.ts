// Lifecycle ledger contracts are isolated from the Zustand composition root so UI, actions and release gates share one stable model.
export type LifecycleStepId = 'requirements' | 'quality' | 'context' | 'logical' | 'realization' | 'logicalTechnology' | 'physicalTechnology' | 'review' | 'sdd';

export interface LifecycleChecklistSnapshot {
  label: string;
  done: boolean;
  required?: boolean | undefined;
  evidence?: string | undefined;
}

export interface LifecycleCompletionRecord {
  id: string;
  projectId: string;
  branchId: string;
  stepId: LifecycleStepId;
  title: string;
  status: 'completed' | 'reopened';
  completedAt: string;
  completedBy: string;
  handoffTo?: string | undefined;
  notes?: string | undefined;
  snapshotId?: string | undefined;
  checklist: LifecycleChecklistSnapshot[];
  artifactNames: string[];
  blockerCount: number;
  revision: number;
}

export interface LifecycleArtifactRecord {
  id: string;
  projectId: string;
  branchId: string;
  stepId: LifecycleStepId;
  name: string;
  type: 'stage-output' | 'sdd-pack' | 'manifest' | 'review-pack';
  status: 'planned' | 'generated' | 'downloaded';
  generatedAt: string;
  source: 'deterministic' | 'co-authored' | 'manual';
  revision: number;
}

export interface LifecycleCompletionInput {
  stepId: LifecycleStepId;
  title: string;
  handoffTo?: string | undefined;
  notes?: string | undefined;
  checklist: LifecycleChecklistSnapshot[];
  artifactNames: string[];
}


export interface GovernedReviewInput {
  id: string;
  generatedAt: string;
  executiveSummary: string;
  deliveryReadinessScore: number;
  recommendationCount: number;
  findings: Array<{
    id: string;
    category: string;
    severity: string;
    title: string;
    issue: string;
    whyItMatters: string;
    recommendedFix: string;
    affectedNodeIds: string[];
    supportingEvidenceIds: string[];
  }>;
}

