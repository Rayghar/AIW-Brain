import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileDurableJobQueue, InMemoryJobQueue } from '../src/durableJobQueue.js';

describe('rc.10.58 durable production queue', () => {
  it('survives adapter restart and completes a leased job', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aiw-queue-'));
    try {
      const file = join(dir, 'jobs.json');
      const first = new FileDurableJobQueue(file);
      const queued = await first.enqueue({ tenantId: 'tenant-a', queue: 'knowledge-source-refresh', payload: { repository: 'org/repo' } });
      const restarted = new FileDurableJobQueue(file);
      expect((await restarted.get('tenant-a', queued.id))?.status).toBe('queued');
      const leased = await restarted.reserve('worker-1', ['knowledge-source-refresh'], 30_000);
      expect(leased?.attempts).toBe(1);
      expect(await restarted.heartbeat('worker-1', queued.id, 30_000)).toBe(true);
      expect((await restarted.complete('worker-1', queued.id)).status).toBe('completed');
      expect((await new FileDurableJobQueue(file).get('tenant-a', queued.id))?.status).toBe('completed');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('retries with backoff and moves exhausted work to dead letter', async () => {
    const queue = new InMemoryJobQueue();
    const job = await queue.enqueue({ tenantId: 'tenant-a', queue: 'claim-extraction', payload: {}, maxAttempts: 2 });
    await queue.reserve('worker-1', ['claim-extraction'], 30_000);
    const retry = await queue.fail('worker-1', job.id, 'temporary', 0);
    expect(retry.status).toBe('retry-wait');
    const second = await queue.reserve('worker-1', ['claim-extraction'], 30_000);
    expect(second?.attempts).toBe(2);
    const dead = await queue.fail('worker-1', job.id, 'permanent', 0);
    expect(dead.status).toBe('dead-letter');
  });

  it('isolates tenants and supports cancellation', async () => {
    const queue = new InMemoryJobQueue();
    const job = await queue.enqueue({ tenantId: 'tenant-a', queue: 'repository-scan', payload: {} });
    expect(await queue.get('tenant-b', job.id)).toBeUndefined();
    expect((await queue.cancel('tenant-a', job.id)).status).toBe('cancelled');
    expect(await queue.reserve('worker-1', ['repository-scan'], 10_000)).toBeUndefined();
  });
});
