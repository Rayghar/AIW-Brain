import type { WorkerJob } from '../queues/queueTypes.js';
export function describeConformanceEvidenceIngestion(job: WorkerJob) { return { ...job, operation: 'normalize external conformance evidence' }; }
