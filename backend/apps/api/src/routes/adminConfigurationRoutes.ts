import type { FastifyInstance, FastifyRequest } from 'fastify';
import { adminConfigurationSummary } from '../services/releaseRegistry.js';
import { adminRepositories } from '../repositories/adminRepositories.js';
import { buildAdminControlPlaneSnapshot } from '@aiw/admin';
import { hasPermission } from '@aiw/engine';

interface RuntimePrincipal { tenantId: string; subject?: string; userId?: string; sub?: string }
export interface AdminConfigurationDeps { principalFor: (request: FastifyRequest) => RuntimePrincipal }

export async function adminConfigurationRoutes(app: FastifyInstance, deps: AdminConfigurationDeps): Promise<void> {
  const { principalFor } = deps;
  const requireControlPlaneRead = (request: FastifyRequest, reply: { code: (status: number) => { send: (payload: unknown) => unknown } }) => {
    const principal = principalFor(request);
    const guard = hasPermission(principal, 'admin.control-plane.read');
    if (guard.ok) return null;
    return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'admin.control-plane.read', roles: guard.roles });
  };
  app.get('/api/admin/configuration-summary', async (request, reply) => {
    const denied = requireControlPlaneRead(request, reply);
    if (denied) return denied;
    return adminConfigurationSummary();
  });
  app.get('/api/admin/control-plane', async (request, reply) => {
    const denied = requireControlPlaneRead(request, reply);
    if (denied) return denied;
    return buildAdminControlPlaneSnapshot(adminRepositories);
  });
}
