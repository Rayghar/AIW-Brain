import type { WorkerJob, WorkerQueueName } from './queues/queueTypes.js';
export function createWorkerJob<T extends Record<string, unknown>>(queue: WorkerQueueName, payload: T): WorkerJob<T> { return { id: `${queue}-${Date.now()}`, queue, payload, createdAt: new Date().toISOString() }; }
