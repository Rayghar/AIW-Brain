import type { WorkerJob } from '../queues/queueTypes.js';
export function describeClaimExtraction(job: WorkerJob) { return { ...job, operation: 'extract candidate claims into review queue' }; }
