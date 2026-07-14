import type { WorkerJob } from '../queues/queueTypes.js';
export function describeTelemetryIngestion(job: WorkerJob) { return { ...job, operation: 'ingest runtime inventory and telemetry evidence' }; }
