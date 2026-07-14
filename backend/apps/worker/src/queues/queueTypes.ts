export type WorkerQueueName =
  | 'knowledge-source-refresh'
  | 'claim-extraction'
  | 'repository-scan'
  | 'conformance-evidence-ingestion'
  | 'knowledge-release-validation'
  | 'telemetry-ingestion'
  | 'mind-factory-orchestration'
  | 'knowledge-pack-activation'
  | 'evidence-expiry'
  | 'environment-promotion-validation'
  | 'backup-restore-acceptance';
export interface WorkerJob<T = Record<string, unknown>> { id: string; queue: WorkerQueueName; payload: T; createdAt: string; }
