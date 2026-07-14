import type { WorkerJob } from '../queues/queueTypes.js';

export type MindFactoryWorkerAction = 'source-refresh' | 'claim-extraction' | 'knowledge-pack-activation';

export interface MindFactoryWorkerPayload {
  action: MindFactoryWorkerAction;
  sourceId?: string;
  snapshotId?: string;
  releaseId?: string;
  tenantId?: string;
  dryRun?: boolean;
}

export function describeMindFactoryJob(job: WorkerJob<MindFactoryWorkerPayload>) {
  return {
    ...job,
    operation: 'governed-mind-factory-orchestration',
    doctrine: {
      candidateKnowledgeNonScoring: true,
      llmCannotApprove: true,
      releasePromotionRequiresNamedHuman: true,
      targetEnvironmentExecutesSideEffects: true,
    },
  };
}
