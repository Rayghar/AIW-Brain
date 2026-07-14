import type { WorkerJob } from '../queues/queueTypes.js';
export function describeKnowledgeSourceRefresh(job: WorkerJob) { return { ...job, operation: 'refresh governed knowledge source without promoting candidate claims' }; }
