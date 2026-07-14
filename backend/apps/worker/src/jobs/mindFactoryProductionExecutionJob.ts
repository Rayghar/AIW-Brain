import type { WorkerJob } from '../queues/queueTypes.js';

export type MindFactoryProductionAction = 'read-only-repository-source-refresh' | 'claim-extraction-execute' | 'kms-signing-attestation' | 'pack-activation-persist';

export interface MindFactoryProductionPayload {
  action: MindFactoryProductionAction;
  connectorId?: string;
  snapshotId?: string;
  releaseId?: string;
  tenantId?: string;
  dryRun?: boolean;
}

export function describeMindFactoryProductionExecution(job: WorkerJob<MindFactoryProductionPayload>) {
  return {
    ...job,
    operation: 'production-mind-factory-execution-loop',
    safety: {
      repositoryWritesDisabled: true,
      candidateClaimsNonScoring: true,
      kmsKeyRefRequiredInProduction: true,
      tenantScopedPersistenceRequired: true,
    },
  };
}
