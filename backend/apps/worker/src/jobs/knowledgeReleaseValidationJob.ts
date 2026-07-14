import type { WorkerJob } from '../queues/queueTypes.js';
export function describeKnowledgeReleaseValidation(job: WorkerJob) { return { ...job, operation: 'validate release candidate gates before promotion' }; }
