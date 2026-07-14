import type { WorkerJob } from '../queues/queueTypes.js';
export function describeRepositoryScan(job: WorkerJob) { return { ...job, operation: 'read-only repository scan and evidence mapping' }; }
