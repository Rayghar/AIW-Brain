import { pathToFileURL } from 'node:url';
import { createWorkerJob } from './scheduler.js';
import { describeMindFactoryJob } from './jobs/mindFactoryOrchestrationJob.js';
import { describeMindFactoryProductionExecution } from './jobs/mindFactoryProductionExecutionJob.js';
import { createProductionJobQueue, ProductionMindFactoryWorker } from './productionWorker.js';

export { createWorkerJob, createProductionJobQueue, ProductionMindFactoryWorker };
export type { WorkerJob, WorkerQueueName } from './queues/queueTypes.js';

export function workerReadinessSnapshot() {
  const job = createWorkerJob('knowledge-source-refresh', { mode: 'dry-run' });
  const mindFactory = describeMindFactoryJob(createWorkerJob('mind-factory-orchestration', { action: 'source-refresh' as const, sourceId: 'reference-source', dryRun: true }));
  const productionMindFactory = describeMindFactoryProductionExecution(createWorkerJob('mind-factory-orchestration', { action: 'read-only-repository-source-refresh' as const, connectorId: 'reference-connector', dryRun: true }));
  return { service: 'aiw-worker', release: '0.10.0-rc.10.58.0', status: 'ready' as const, durableQueueAdapters: ['postgres', 'file'], job, mindFactory, productionMindFactory };
}

async function main() {
  const queue = await createProductionJobQueue();
  const worker = new ProductionMindFactoryWorker({ queue });
  const stop = () => worker.stop();
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  console.log(JSON.stringify({ event: 'worker-start', workerId: worker.workerId, queue: await queue.health() }));
  await worker.start();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error('[aiw-worker] fatal', error); process.exitCode = 1; });
}
