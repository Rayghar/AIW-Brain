import { describe, expect, it } from 'vitest';
import { InMemoryJobQueue } from '@aiw/integrations';
import { ProductionMindFactoryWorker } from '../src/productionWorker.js';

describe('rc.10.58 real worker loop', () => {
  it('processes asynchronous work and stops gracefully', async () => {
    const queue = new InMemoryJobQueue();
    let executed = 0;
    const job = await queue.enqueue({ tenantId: 'tenant-a', queue: 'repository-scan', payload: {} });
    const worker = new ProductionMindFactoryWorker({ queue, workerId: 'worker-test', pollMs: 5, heartbeatMs: 10, handlers: { 'repository-scan': async () => { executed += 1; } } });
    const running = worker.start();
    await new Promise((resolve) => setTimeout(resolve, 40));
    worker.stop(); await running;
    expect(executed).toBe(1);
    expect((await queue.get('tenant-a', job.id))?.status).toBe('completed');
  });

  it('enqueues and executes scheduled source refresh work with stable schedule slots', async () => {
    const queue = new InMemoryJobQueue();
    let executed = 0;
    const worker = new ProductionMindFactoryWorker({
      queue,
      workerId: 'worker-scheduler-test',
      pollMs: 5,
      heartbeatMs: 10,
      scheduleTickMs: 5,
      schedules: [{ id: 'github-daily', tenantId: 'tenant-a', queue: 'knowledge-source-refresh', payload: { repository: 'owner/repo' }, everyMs: 60_000 }],
      handlers: { 'knowledge-source-refresh': async () => { executed += 1; } },
    });
    const running = worker.start();
    await new Promise((resolve) => setTimeout(resolve, 50));
    worker.stop(); await running;
    expect(executed).toBe(1);
    const jobs = await queue.list('tenant-a');
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.correlationId).toBe('schedule:github-daily');
    expect(jobs[0]?.status).toBe('completed');
  });

  it('does not let provider failure stop deterministic processing', async () => {
    const queue = new InMemoryJobQueue();
    const failed = await queue.enqueue({ tenantId: 'tenant-a', queue: 'knowledge-source-refresh', payload: {}, maxAttempts: 1 });
    const deterministic = await queue.enqueue({ tenantId: 'tenant-a', queue: 'claim-extraction', payload: { pinnedKnowledgeReleaseId: 'AKR-0.10.55' } });
    const worker = new ProductionMindFactoryWorker({ queue, workerId: 'worker-test', pollMs: 5, heartbeatMs: 10, handlers: { 'knowledge-source-refresh': async () => { throw new Error('provider down'); }, 'claim-extraction': async () => undefined } });
    const running = worker.start(); await new Promise((resolve) => setTimeout(resolve, 60)); worker.stop(); await running;
    expect((await queue.get('tenant-a', failed.id))?.status).toBe('dead-letter');
    expect((await queue.get('tenant-a', deterministic.id))?.status).toBe('completed');
  });
});
