import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { architectureProjectSchema, type ArchitectureProject, type AuthenticatedPrincipal } from '@aiw/domain';
import { resolvePrincipal } from './securityRuntime.js';

export const snapshotRequestSchema = z.object({
  project: architectureProjectSchema,
  label: z.string().min(1).default('Architecture snapshot'),
  status: z.enum(['draft', 'reviewed', 'approved']).default('draft'),
  createdBy: z.string().min(1).default('local-user'),
});

export const projectParamsSchema = z.object({ projectId: z.string(), branchId: z.string() });

export function principalFor(request: FastifyRequest): AuthenticatedPrincipal {
  return resolvePrincipal(request);
}

export function canRunEnterpriseAcceptance(principal: AuthenticatedPrincipal): boolean {
  const configured = (process.env.AIW_RUNTIME_ACCEPTANCE_OPERATORS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.length) return configured.includes(principal.subject) || configured.includes(principal.email);
  return process.env.AIW_ALLOW_DEV_AUTH !== 'false' && principal.subject === 'user-owner';
}

export function tenantProject(project: ArchitectureProject, principal: AuthenticatedPrincipal): boolean {
  return project.tenantId === principal.tenantId;
}
