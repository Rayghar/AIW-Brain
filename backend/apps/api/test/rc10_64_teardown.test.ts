import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { InMemoryProjectRepository } from '../src/repository.js';

describe('rc.10.65 API lifecycle teardown', () => {
  it('closes API resources within the release timeout', async () => {
    const app = await buildApp({ repository: new InMemoryProjectRepository(), logger: false });
    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    await expect(Promise.race([
      app.close().then(() => 'closed'),
      new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 2500)),
    ])).resolves.toBe('closed');
  });
});
