import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { createId, type ActivityEvent, type AuditEvent, type AuthenticatedPrincipal, type CollaborationPresence, type IdentityProviderConfig } from '@aiw/domain';
import { mapExternalClaims, type ExternalIdentityClaims } from './identity.js';
import { createAuditEvent } from '@aiw/engine';

export const DEFAULT_TENANT_ID = 'tenant-reference';
export const DEFAULT_USER_ID = 'user-owner';

function base64url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url');
}

export function issueDevelopmentToken(principal: AuthenticatedPrincipal, secret: string): string {
  const payload = base64url(JSON.stringify(principal));
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `aiwdev.${payload}.${signature}`;
}

export function verifyDevelopmentToken(token: string, secret: string): AuthenticatedPrincipal | null {
  const [prefix, payload, signature] = token.split('.');
  if (prefix !== 'aiwdev' || !payload || !signature) return null;
  const expected = createHmac('sha256', secret).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const principal = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthenticatedPrincipal;
    if (new Date(principal.expiresAt).getTime() <= Date.now()) return null;
    return principal;
  } catch { return null; }
}

function splitRoles(value: unknown): string[] {
  return String(value ?? 'platform-admin').split(',').map((role) => role.trim()).filter(Boolean);
}

function proxyVerifiedPrincipal(request: FastifyRequest): AuthenticatedPrincipal | null {
  if (process.env.AIW_TRUST_PROXY_OIDC_CLAIMS !== 'true') return null;
  const encoded = request.headers['x-aiw-verified-oidc-claims'];
  if (!encoded) return null;
  const tenantId = String(request.headers['x-aiw-tenant-id'] ?? DEFAULT_TENANT_ID);
  const provider: IdentityProviderConfig = {
    id: process.env.AIW_OIDC_PROVIDER_ID ?? 'proxy-verified-oidc',
    tenantId,
    type: 'oidc',
    name: process.env.AIW_OIDC_PROVIDER_NAME ?? 'Proxy verified OIDC',
    issuer: process.env.AIW_OIDC_ISSUER ?? '',
    clientId: process.env.AIW_OIDC_CLIENT_ID ?? 'aiw-client',
    scopes: ['openid', 'profile', 'email'],
    enabled: true,
  };
  const claims = JSON.parse(Buffer.from(String(encoded), 'base64url').toString('utf8')) as ExternalIdentityClaims;
  const principal = mapExternalClaims(provider, claims, tenantId);
  return { ...principal, authMode: 'proxy-verified-oidc' };
}

export function resolvePrincipal(request: FastifyRequest): AuthenticatedPrincipal {
  const allowDevelopment = process.env.AIW_ALLOW_DEV_AUTH !== 'false';
  const authorization = request.headers.authorization;
  const devSecret = process.env.AIW_DEV_TOKEN_SECRET ?? 'local-development-only-change-me';
  if (allowDevelopment && authorization?.startsWith('Bearer ')) {
    const verified = verifyDevelopmentToken(authorization.slice(7), devSecret);
    if (verified) return { ...verified, roles: verified.roles?.length ? verified.roles : splitRoles(request.headers['x-aiw-roles']), authMode: 'development-token', roleSource: verified.roleSource ?? 'development-default' };
  }
  const proxyPrincipal = proxyVerifiedPrincipal(request);
  if (proxyPrincipal) return proxyPrincipal;
  if (!allowDevelopment) throw new Error('UNAUTHENTICATED');
  const tenantId = String(request.headers['x-aiw-tenant-id'] ?? DEFAULT_TENANT_ID);
  const subject = String(request.headers['x-aiw-user-id'] ?? DEFAULT_USER_ID);
  return {
    subject,
    email: String(request.headers['x-aiw-user-email'] ?? `${subject}@example.invalid`),
    displayName: String(request.headers['x-aiw-user-name'] ?? subject),
    tenantId,
    providerId: 'idp-reference-development',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    roles: splitRoles(request.headers['x-aiw-roles']),
    authMode: 'development',
    roleSource: 'development-default',
  };
}

export function requestHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export class IdempotencyStore {
  private readonly receipts = new Map<string, { requestHash: string; response: unknown; expiresAt: number }>();
  private readonly pending = new Map<string, { requestHash: string; promise: Promise<unknown> }>();

  async execute<T>(tenantId: string, scope: string, key: string, request: unknown, operation: () => Promise<T>): Promise<{ response: T; replayed: boolean }> {
    const composite = `${tenantId}:${scope}:${key}`;
    const hash = requestHash(request);
    const existing = this.receipts.get(composite);
    if (existing && existing.expiresAt > Date.now()) {
      if (existing.requestHash !== hash) throw new Error('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST');
      return { response: structuredClone(existing.response) as T, replayed: true };
    }
    const inFlight = this.pending.get(composite);
    if (inFlight) {
      if (inFlight.requestHash !== hash) throw new Error('IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST');
      return { response: structuredClone(await inFlight.promise) as T, replayed: true };
    }
    const promise = operation();
    this.pending.set(composite, { requestHash: hash, promise });
    try {
      const response = await promise;
      this.receipts.set(composite, { requestHash: hash, response: structuredClone(response), expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      return { response, replayed: false };
    } finally {
      this.pending.delete(composite);
    }
  }
}

export class AuditLog {
  private events: AuditEvent[] = [];
  append(input: Parameters<typeof createAuditEvent>[0]): AuditEvent {
    const event = createAuditEvent(input);
    this.events.unshift(event);
    return event;
  }
  list(tenantId: string, limit = 100): AuditEvent[] { return this.events.filter((event) => event.tenantId === tenantId).slice(0, limit).map((event) => structuredClone(event)); }
  purge(now = new Date()): number {
    const before = this.events.length;
    this.events = this.events.filter((event) => new Date(event.retentionUntil) > now);
    return before - this.events.length;
  }
}

export class TenantEventHub {
  private readonly activity = new Map<string, ActivityEvent[]>();
  private readonly listeners = new Map<string, Set<(event: ActivityEvent) => void>>();
  private readonly presence = new Map<string, CollaborationPresence>();

  publish(event: Omit<ActivityEvent, 'id' | 'createdAt'>): ActivityEvent {
    return this.publishPrepared({ ...event, id: createId('activity'), createdAt: new Date().toISOString() });
  }

  publishPrepared(event: ActivityEvent): ActivityEvent {
    const enriched = structuredClone(event);
    const list = this.activity.get(event.tenantId) ?? [];
    if (!list.some((item) => item.id === event.id)) this.activity.set(event.tenantId, [enriched, ...list].slice(0, 1000));
    for (const listener of this.listeners.get(event.tenantId) ?? []) listener(enriched);
    return structuredClone(enriched);
  }

  list(tenantId: string, projectId?: string, limit = 100): ActivityEvent[] {
    return (this.activity.get(tenantId) ?? []).filter((event) => !projectId || event.projectId === projectId).slice(0, limit).map((event) => structuredClone(event));
  }

  subscribe(tenantId: string, listener: (event: ActivityEvent) => void): () => void {
    const set = this.listeners.get(tenantId) ?? new Set();
    set.add(listener); this.listeners.set(tenantId, set);
    return () => { set.delete(listener); if (!set.size) this.listeners.delete(tenantId); };
  }

  heartbeat(presence: CollaborationPresence): CollaborationPresence {
    this.presence.set(`${presence.tenantId}:${presence.connectionId}`, structuredClone(presence));
    return structuredClone(presence);
  }

  listPresence(tenantId: string, branchId: string, ttlSeconds: number, now = new Date()): CollaborationPresence[] {
    const cutoff = now.getTime() - ttlSeconds * 1000;
    const result: CollaborationPresence[] = [];
    for (const [key, presence] of this.presence) {
      if (new Date(presence.lastSeenAt).getTime() < cutoff) { this.presence.delete(key); continue; }
      if (presence.tenantId === tenantId && presence.branchId === branchId) result.push(structuredClone(presence));
    }
    return result;
  }
}
