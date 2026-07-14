import { access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { AIW_RELEASE } from '@aiw/domain';
import { createKnowledgeObjectStore, type KnowledgeObjectStore } from './knowledgeObjectStore.js';
import { ApprovedKnowledgeVectorStore } from './knowledgeVectorStore.js';
import type { LlmGateway } from './llmGateway.js';
import { OidcJwksVerifier } from './oidcJwks.js';
import { TelemetryRuntime } from './observability.js';

export type AcceptanceStatus = 'verified' | 'configured' | 'reference-only' | 'not-configured' | 'failed';
export type AcceptanceProbeId = 'ACC-POSTGRES' | 'ACC-OBJECT-STORE' | 'ACC-VECTOR' | 'ACC-LLM' | 'ACC-GITHUB' | 'ACC-CI' | 'ACC-OIDC' | 'ACC-OTEL' | 'ACC-SIGNING';

export interface PlatformAcceptanceCheck {
  id: AcceptanceProbeId;
  name: string;
  category: 'data' | 'knowledge' | 'ai' | 'delivery' | 'identity' | 'observability' | 'trust';
  status: AcceptanceStatus;
  detail: string;
  remediation: string;
  activeProbe: boolean;
  probeMode: 'passive' | 'active';
  durationMs: number;
  evidence: string[];
}

export interface PlatformAcceptanceReport {
  generatedAt: string;
  platformVersion: string;
  environment: string;
  productionAccepted: boolean;
  verified: number;
  configured: number;
  open: number;
  checks: PlatformAcceptanceCheck[];
  requiredChecks: AcceptanceProbeId[];
  boundary: string;
}

export interface PlatformAcceptanceOptions {
  activeProbeIds?: AcceptanceProbeId[];
  requiredCheckIds?: AcceptanceProbeId[];
  objectStore?: KnowledgeObjectStore;
  oidcVerifier?: OidcJwksVerifier;
  telemetry?: TelemetryRuntime;
  fetcher?: typeof fetch;
  tenantId?: string;
}

const ALL_CHECKS: AcceptanceProbeId[] = ['ACC-POSTGRES','ACC-OBJECT-STORE','ACC-VECTOR','ACC-LLM','ACC-GITHUB','ACC-CI','ACC-OIDC','ACC-OTEL','ACC-SIGNING'];
const DEFAULT_REQUIRED: AcceptanceProbeId[] = ['ACC-POSTGRES','ACC-OBJECT-STORE','ACC-VECTOR','ACC-OIDC','ACC-OTEL','ACC-SIGNING'];

function configured(value: string | undefined): boolean { return Boolean(value && value.trim()); }
function active(set: Set<AcceptanceProbeId>, id: AcceptanceProbeId): boolean { return set.has(id); }
function duration(started: number): number { return Math.max(0, Date.now() - started); }
function asError(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function check(input: Omit<PlatformAcceptanceCheck, 'probeMode' | 'durationMs' | 'evidence'> & { probeMode?: 'passive'|'active'; durationMs?: number; evidence?: string[] }): PlatformAcceptanceCheck {
  return { ...input, probeMode: input.probeMode ?? 'passive', durationMs: input.durationMs ?? 0, evidence: input.evidence ?? [] };
}
function parseRequired(value = process.env.AIW_RUNTIME_REQUIRED_CHECKS): AcceptanceProbeId[] {
  if (!value?.trim()) return DEFAULT_REQUIRED;
  const requested = value.split(',').map((item) => item.trim()).filter((item): item is AcceptanceProbeId => ALL_CHECKS.includes(item as AcceptanceProbeId));
  return requested.length ? requested : DEFAULT_REQUIRED;
}

async function probePostgres(): Promise<{ detail: string; evidence: string[] }> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, application_name: 'aiw-acceptance-probe', connectionTimeoutMillis: 8_000 });
  try {
    const client = await pool.connect();
    try {
      const database = await client.query(`SELECT current_database() AS database, current_user AS role, current_setting('server_version') AS version`);
      const rls = await client.query(`SELECT count(*)::int AS count FROM pg_class WHERE relrowsecurity = true AND relnamespace = 'public'::regnamespace`);
      const policies = await client.query(`SELECT count(*)::int AS count FROM pg_policies WHERE schemaname='public' AND policyname='tenant_isolation'`);
      const migrations = await client.query(`SELECT to_regclass('public.platform_acceptance_runs') IS NOT NULL AS acceptance_table`);
      const row = database.rows[0] ?? {};
      const rlsCount = Number(rls.rows[0]?.count ?? 0);
      const policyCount = Number(policies.rows[0]?.count ?? 0);
      if (rlsCount < 1 || policyCount < 1) throw new Error('POSTGRES_TENANT_RLS_NOT_ACTIVE');
      return {
        detail: `Connected to ${String(row.database)} as ${String(row.role)} on PostgreSQL ${String(row.version)}; ${rlsCount} RLS table(s) and ${policyCount} tenant policy/policies detected.`,
        evidence: [`database:${String(row.database)}`, `role:${String(row.role)}`, `rls-tables:${rlsCount}`, `tenant-policies:${policyCount}`, `acceptance-table:${Boolean(migrations.rows[0]?.acceptance_table)}`],
      };
    } finally { client.release(); }
  } finally { await pool.end(); }
}

async function probeObjectStore(store: KnowledgeObjectStore, tenantId: string): Promise<{ detail: string; evidence: string[] }> {
  const payload = JSON.stringify({ probe: 'AIW-8.7.2', tenantId, at: new Date().toISOString() });
  const expected = createHash('sha256').update(payload).digest('hex');
  const key = `acceptance/${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  const stored = await store.put(key, payload, 'application/json');
  try {
    const loaded = await store.get(key);
    const actual = createHash('sha256').update(loaded).digest('hex');
    if (actual !== expected || stored.sha256 !== expected) throw new Error('OBJECT_STORE_ROUNDTRIP_DIGEST_MISMATCH');
    return { detail: `Write/read/delete round trip succeeded through ${stored.uri.split(':')[0]} storage.`, evidence: [`storage-adapter:${stored.uri.split(':')[0]}`, `sha256:${expected}`, `bytes:${stored.sizeBytes}`] };
  } finally { await store.delete(key).catch(() => undefined); }
}

async function probeGithub(fetcher: typeof fetch): Promise<{ detail: string; evidence: string[]; writable: boolean }> {
  const repository = process.env.AIW_GITHUB_ACCEPTANCE_REPOSITORY;
  if (!repository) throw new Error('AIW_GITHUB_ACCEPTANCE_REPOSITORY_REQUIRED');
  const token = process.env.AIW_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN_REQUIRED');
  const normalized = repository.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/^\/+|\/+$/g, '');
  if (!/^[^/]+\/[^/]+$/.test(normalized)) throw new Error('INVALID_GITHUB_ACCEPTANCE_REPOSITORY');
  const response = await fetcher(`https://api.github.com/repos/${normalized}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': `AIW-Enterprise-Acceptance/${AIW_RELEASE.version}` }, signal: AbortSignal.timeout(15_000) });
  const body = await response.json() as { full_name?: string; default_branch?: string; permissions?: { push?: boolean }; message?: string };
  if (!response.ok) throw new Error(`GITHUB_ACCEPTANCE_${response.status}:${body.message ?? 'request failed'}`);
  return { detail: `Authenticated repository probe succeeded for ${body.full_name ?? normalized}.`, evidence: [`repository:${body.full_name ?? normalized}`, `default-branch:${body.default_branch ?? 'unknown'}`, `push:${Boolean(body.permissions?.push)}`], writable: Boolean(body.permissions?.push) };
}

async function probeLlm(gateway: LlmGateway): Promise<{ detail: string; evidence: string[] }> {
  const result = await gateway.generateJson<{ status: 'ok' }>({
    purpose: 'recommendation-explanation',
    schemaName: 'aiw_enterprise_runtime_probe',
    jsonSchema: { type: 'object', additionalProperties: false, required: ['status'], properties: { status: { type: 'string', enum: ['ok'] } } },
    dataClassification: 'public',
    system: 'Return only a JSON object matching the schema.',
    user: 'Return status ok.',
  });
  if (result.value.status !== 'ok') throw new Error('LLM_ACTIVE_PROBE_INVALID_RESPONSE');
  return { detail: `Governed model route ${result.routeId} completed a structured-output probe.`, evidence: [`provider:${result.providerId}`, `model:${result.model}`, `route:${result.routeId}`, `latency-ms:${result.latencyMs}`, `fallback:${result.fallbackUsed}`] };
}

export async function buildPlatformAcceptanceReport(gateway: LlmGateway, options: PlatformAcceptanceOptions = {}): Promise<PlatformAcceptanceReport> {
  const checks: PlatformAcceptanceCheck[] = [];
  const activeIds = new Set(options.activeProbeIds ?? []);
  const requiredChecks = options.requiredCheckIds ?? parseRequired();
  const tenantId = options.tenantId ?? 'tenant-reference';
  const fetcher = options.fetcher ?? fetch;

  const databaseConfigured = configured(process.env.DATABASE_URL);
  if (databaseConfigured && active(activeIds, 'ACC-POSTGRES')) {
    const started = Date.now();
    try {
      const result = await probePostgres();
      checks.push(check({ id: 'ACC-POSTGRES', name: 'PostgreSQL and row-level security', category: 'data', status: 'verified', detail: result.detail, remediation: 'Retain migration, backup/restore and cross-tenant isolation evidence for each promoted environment.', activeProbe: true, probeMode: 'active', durationMs: duration(started), evidence: result.evidence }));
    } catch (error) {
      checks.push(check({ id: 'ACC-POSTGRES', name: 'PostgreSQL and row-level security', category: 'data', status: 'failed', detail: asError(error), remediation: 'Run migrations and validate PostgreSQL connectivity, RLS policies and tenant-scoped transactions.', activeProbe: true, probeMode: 'active', durationMs: duration(started) }));
    }
  } else {
    checks.push(check({ id: 'ACC-POSTGRES', name: 'PostgreSQL and row-level security', category: 'data', status: databaseConfigured ? 'configured' : 'reference-only', detail: databaseConfigured ? 'DATABASE_URL is configured; no active database probe was requested.' : 'The application is using the memory/reference repository.', remediation: databaseConfigured ? 'Run the active PostgreSQL probe and backup/restore tests in the target environment.' : 'Configure DATABASE_URL for durable multi-user operation.', activeProbe: databaseConfigured }));
  }

  const objectStore = options.objectStore ?? createKnowledgeObjectStore();
  const objectHealth = await objectStore.health();
  const s3Selected = process.env.AIW_KNOWLEDGE_OBJECT_STORE === 's3';
  if (objectHealth.ready && active(activeIds, 'ACC-OBJECT-STORE')) {
    const started = Date.now();
    try {
      const result = await probeObjectStore(objectStore, tenantId);
      checks.push(check({ id: 'ACC-OBJECT-STORE', name: 'Immutable snapshot object storage', category: 'knowledge', status: s3Selected ? 'verified' : 'reference-only', detail: result.detail, remediation: s3Selected ? 'Retain bucket policy, encryption and lifecycle evidence.' : 'Configure S3 or MinIO for production snapshot durability.', activeProbe: true, probeMode: 'active', durationMs: duration(started), evidence: result.evidence }));
    } catch (error) {
      checks.push(check({ id: 'ACC-OBJECT-STORE', name: 'Immutable snapshot object storage', category: 'knowledge', status: 'failed', detail: asError(error), remediation: 'Validate bucket credentials, write/read/delete permissions, encryption and lifecycle policy.', activeProbe: true, probeMode: 'active', durationMs: duration(started) }));
    }
  } else {
    checks.push(check({ id: 'ACC-OBJECT-STORE', name: 'Immutable snapshot object storage', category: 'knowledge', status: objectHealth.ready ? (s3Selected ? 'configured' : 'reference-only') : 'failed', detail: `${objectHealth.adapter}: ${objectHealth.detail}`, remediation: s3Selected ? 'Run the active write/read/delete round-trip probe.' : 'Configure S3 or MinIO for production snapshot durability.', activeProbe: objectHealth.ready }));
  }

  if (databaseConfigured && active(activeIds, 'ACC-VECTOR')) {
    const started = Date.now();
    const vector = new ApprovedKnowledgeVectorStore();
    try {
      const health = await vector.health();
      checks.push(check({ id: 'ACC-VECTOR', name: 'Approved knowledge vector retrieval', category: 'knowledge', status: health.ready && health.vectorExtension ? 'verified' : 'failed', detail: `pgvector extension=${health.vectorExtension}; indexed approved records=${health.count}.`, remediation: 'Enable pgvector, run migration and reindex only the active approved knowledge release.', activeProbe: true, probeMode: 'active', durationMs: duration(started), evidence: [`vector-extension:${health.vectorExtension}`, `approved-record-count:${health.count}`] }));
    } catch (error) {
      checks.push(check({ id: 'ACC-VECTOR', name: 'Approved knowledge vector retrieval', category: 'knowledge', status: 'failed', detail: asError(error), remediation: 'Enable pgvector, run migration and reindex only the active approved knowledge release.', activeProbe: true, probeMode: 'active', durationMs: duration(started) }));
    } finally { await vector.close(); }
  } else {
    checks.push(check({ id: 'ACC-VECTOR', name: 'Approved knowledge vector retrieval', category: 'knowledge', status: databaseConfigured ? 'configured' : 'not-configured', detail: databaseConfigured ? 'PostgreSQL is configured; no active pgvector probe was requested.' : 'DATABASE_URL is required for pgvector retrieval.', remediation: 'Run the active vector probe and index only approved release records.', activeProbe: databaseConfigured }));
  }

  const llmRoutes = await gateway.health();
  const configuredRoutes = llmRoutes.filter((route) => route.configured);
  if (configuredRoutes.length && active(activeIds, 'ACC-LLM')) {
    const started = Date.now();
    try {
      const result = await probeLlm(gateway);
      checks.push(check({ id: 'ACC-LLM', name: 'Configurable LLM brain', category: 'ai', status: 'verified', detail: result.detail, remediation: 'Retain provider approval, data-classification and fallback-route evidence.', activeProbe: true, probeMode: 'active', durationMs: duration(started), evidence: result.evidence }));
    } catch (error) {
      checks.push(check({ id: 'ACC-LLM', name: 'Configurable LLM brain', category: 'ai', status: 'failed', detail: asError(error), remediation: 'Validate the governed route, secret reference, structured output support and provider policy.', activeProbe: true, probeMode: 'active', durationMs: duration(started) }));
    }
  } else {
    checks.push(check({ id: 'ACC-LLM', name: 'Configurable LLM brain', category: 'ai', status: configuredRoutes.length ? 'configured' : 'not-configured', detail: configuredRoutes.length ? `${configuredRoutes.length} governed route(s) have resolvable secret references.` : 'No external or local model route is configured; deterministic mode remains available.', remediation: configuredRoutes.length ? 'Run the active structured-output probe for every approved purpose and fallback route.' : 'Configure one approved provider or local OpenAI-compatible route.', activeProbe: configuredRoutes.length > 0 }));
  }

  const githubEnabled = process.env.AIW_ENABLE_GITHUB_KNOWLEDGE === 'true';
  const githubCredential = configured(process.env.GITHUB_TOKEN) || configured(process.env.AIW_GITHUB_TOKEN);
  let githubWritable = false;
  if (githubEnabled && githubCredential && active(activeIds, 'ACC-GITHUB')) {
    const started = Date.now();
    try {
      const result = await probeGithub(fetcher);
      githubWritable = result.writable;
      checks.push(check({ id: 'ACC-GITHUB', name: 'GitHub knowledge refresh', category: 'knowledge', status: 'verified', detail: result.detail, remediation: 'Execute a commit-pinned candidate refresh and preserve review/promotion evidence.', activeProbe: true, probeMode: 'active', durationMs: duration(started), evidence: result.evidence }));
    } catch (error) {
      checks.push(check({ id: 'ACC-GITHUB', name: 'GitHub knowledge refresh', category: 'knowledge', status: 'failed', detail: asError(error), remediation: 'Install a read-only GitHub App or token and configure AIW_GITHUB_ACCEPTANCE_REPOSITORY.', activeProbe: true, probeMode: 'active', durationMs: duration(started) }));
    }
  } else {
    checks.push(check({ id: 'ACC-GITHUB', name: 'GitHub knowledge refresh', category: 'knowledge', status: githubEnabled && githubCredential ? 'configured' : 'not-configured', detail: githubEnabled ? (githubCredential ? 'Refresh is enabled and a credential reference is present.' : 'Refresh is enabled but no supported credential is present.') : 'Live GitHub retrieval is disabled.', remediation: 'Configure a read-only credential and an acceptance repository, then execute the active probe.', activeProbe: githubEnabled && githubCredential }));
  }

  const ciConfigured = configured(process.env.AIW_FITNESS_TARGET_REPOSITORY) && githubCredential;
  checks.push(check({ id: 'ACC-CI', name: 'External fitness-function CI loop', category: 'delivery', status: ciConfigured && githubWritable ? 'verified' : ciConfigured ? 'configured' : 'not-configured', detail: ciConfigured ? (githubWritable ? 'The acceptance repository reports push permission; generated PR and CI evidence can be delivered.' : 'A writable target repository and credential are configured; a real pull request and evidence return remain required.') : 'No writable fitness-test target repository is configured.', remediation: 'Open a generated pull request in a non-production acceptance repository, execute CI and return conformance evidence to AIW.', activeProbe: ciConfigured, probeMode: githubWritable ? 'active' : 'passive', evidence: githubWritable ? ['repository-write-authorized:true'] : [] }));

  const oidcIssuer = process.env.AIW_OIDC_ISSUER;
  const oidcConfigured = configured(oidcIssuer) && configured(process.env.AIW_OIDC_AUDIENCE);
  if (oidcConfigured && oidcIssuer && active(activeIds, 'ACC-OIDC')) {
    const started = Date.now();
    const result = await (options.oidcVerifier ?? new OidcJwksVerifier(fetcher)).health(oidcIssuer);
    checks.push(check({ id: 'ACC-OIDC', name: 'Enterprise OIDC identity', category: 'identity', status: result.ready ? 'verified' : 'failed', detail: result.ready ? `${result.detail} Issuer discovery and JWKS retrieval succeeded.` : result.detail, remediation: 'Complete end-to-end login, role mapping, token-expiry and tenant-claim acceptance.', activeProbe: true, probeMode: 'active', durationMs: duration(started), evidence: result.ready ? [`issuer:${result.issuer}`, `jwks:${result.jwksUri ?? 'unknown'}`, `keys:${result.keyCount}`, `algorithms:${result.algorithms.join(',')}`] : [] }));
  } else {
    checks.push(check({ id: 'ACC-OIDC', name: 'Enterprise OIDC identity', category: 'identity', status: oidcConfigured ? 'configured' : 'not-configured', detail: oidcConfigured ? 'Issuer and audience are configured; no discovery/JWKS probe was requested.' : 'Development identity mode is active or enterprise OIDC is incomplete.', remediation: 'Configure issuer and audience, run discovery/JWKS acceptance, then complete real sign-in and role-mapping tests.', activeProbe: oidcConfigured }));
  }

  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const otelConfigured = configured(otelEndpoint);
  if (otelConfigured && otelEndpoint && options.telemetry && active(activeIds, 'ACC-OTEL')) {
    const started = Date.now();
    try {
      const id = `acceptance-${Date.now()}`;
      options.telemetry.beginRequest(id, 'PROBE', '/platform/acceptance/otel');
      options.telemetry.endRequest(id, 200);
      const result = await options.telemetry.exportOtlp(otelEndpoint, fetcher);
      if (result.exported < 1) throw new Error('OTLP_PROBE_EXPORTED_NO_SPANS');
      checks.push(check({ id: 'ACC-OTEL', name: 'Runtime telemetry and conformance feed', category: 'observability', status: 'verified', detail: `OTLP export accepted ${result.exported} span(s).`, remediation: 'Retain collector routing, tenant-safe attributes, retention and topology-reconciliation evidence.', activeProbe: true, probeMode: 'active', durationMs: duration(started), evidence: [`endpoint:${otelEndpoint}`, `exported-spans:${result.exported}`] }));
    } catch (error) {
      checks.push(check({ id: 'ACC-OTEL', name: 'Runtime telemetry and conformance feed', category: 'observability', status: 'failed', detail: asError(error), remediation: 'Validate OTLP endpoint reachability, protocol, authentication and collector routing.', activeProbe: true, probeMode: 'active', durationMs: duration(started) }));
    }
  } else {
    checks.push(check({ id: 'ACC-OTEL', name: 'Runtime telemetry and conformance feed', category: 'observability', status: otelConfigured ? 'configured' : 'not-configured', detail: otelConfigured ? 'OTLP export endpoint is configured; no active export probe was requested.' : 'No external telemetry endpoint is configured.', remediation: 'Connect an OTLP collector and run an active synthetic-span export.', activeProbe: otelConfigured }));
  }

  const signingConfigured = configured(process.env.AIW_RELEASE_PRIVATE_KEY_PEM) || configured(process.env.AIW_RELEASE_PRIVATE_KEY_PATH);
  let signingStatus: AcceptanceStatus = signingConfigured ? 'configured' : 'not-configured';
  let signingDetail = signingConfigured ? 'A release signing key reference is configured.' : 'No enterprise release signing key is configured.';
  const signingEvidence: string[] = [];
  const signingStarted = Date.now();
  if (process.env.AIW_RELEASE_PRIVATE_KEY_PATH && active(activeIds, 'ACC-SIGNING')) {
    try { await access(process.env.AIW_RELEASE_PRIVATE_KEY_PATH); signingStatus = 'verified'; signingDetail = 'The configured signing key path is readable by the API runtime.'; signingEvidence.push('key-path:readable'); }
    catch (error) { signingStatus = 'failed'; signingDetail = asError(error); }
  } else if (process.env.AIW_RELEASE_PRIVATE_KEY_PEM && active(activeIds, 'ACC-SIGNING')) {
    signingStatus = process.env.AIW_RELEASE_PRIVATE_KEY_PEM.includes('PRIVATE KEY') ? 'verified' : 'failed';
    signingDetail = signingStatus === 'verified' ? 'An in-memory PEM key reference is structurally present.' : 'The configured PEM value does not contain a private-key envelope.';
    if (signingStatus === 'verified') signingEvidence.push('pem-envelope:present');
  }
  checks.push(check({ id: 'ACC-SIGNING', name: 'Enterprise release signing trust', category: 'trust', status: signingStatus, detail: signingDetail, remediation: 'Use a protected enterprise key or KMS-backed signer and independently verify the packaged release.', activeProbe: signingConfigured, probeMode: active(activeIds, 'ACC-SIGNING') ? 'active' : 'passive', durationMs: active(activeIds, 'ACC-SIGNING') ? duration(signingStarted) : 0, evidence: signingEvidence }));

  const verified = checks.filter((item) => item.status === 'verified').length;
  const configuredCount = checks.filter((item) => item.status === 'configured').length;
  const open = checks.length - verified - configuredCount;
  const productionAccepted = requiredChecks.every((id) => checks.find((item) => item.id === id)?.status === 'verified');
  return {
    generatedAt: new Date().toISOString(),
    platformVersion: AIW_RELEASE.version,
    environment: process.env.NODE_ENV ?? 'development',
    productionAccepted,
    verified,
    configured: configuredCount,
    open,
    checks,
    requiredChecks,
    boundary: 'Configured means a code path and secret reference exist. Verified means this runtime completed the named active probe. Production accepted means every required check is verified; accountable environment sign-off and retained evidence are still required.',
  };
}

export function enforcePlatformAcceptance(report: PlatformAcceptanceReport): void {
  const failures = report.requiredChecks.filter((id) => report.checks.find((check) => check.id === id)?.status !== 'verified');
  if (failures.length) throw new Error(`ENTERPRISE_RUNTIME_ACCEPTANCE_FAILED:${failures.join(',')}`);
}

export function platformAcceptanceProbeIds(): AcceptanceProbeId[] { return [...ALL_CHECKS]; }
