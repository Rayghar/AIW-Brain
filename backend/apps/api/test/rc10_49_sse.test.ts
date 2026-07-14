import { afterEach, describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { buildApp } from '../src/app.js';

let app: Awaited<ReturnType<typeof buildApp>> | undefined;
afterEach(async () => { if (app) await app.close(); app = undefined; });

describe('rc.10.49 collaboration stream readiness', () => {
  it('reports the tenant-scoped SSE transport as ready without opening a long-lived stream', async () => {
    app = await buildApp();
    const token = await app.inject({ method: 'POST', url: '/api/auth/development-token', payload: { subject: 'user-owner', email: 'owner@example.com', displayName: 'Owner', tenantId: sampleProject.tenantId } });
    const response = await app.inject({ method: 'GET', url: '/api/events?probe=true', headers: { authorization: `Bearer ${token.json().token}`, accept: 'application/json' } });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ready', transport: 'server-sent-events', tenantScoped: true });
  });
});
