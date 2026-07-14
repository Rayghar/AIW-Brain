import { buildApp } from './app.js';
import { buildPlatformAcceptanceReport, enforcePlatformAcceptance, platformAcceptanceProbeIds, type AcceptanceProbeId } from './platformAcceptance.js';
import { llmRuntimeConfigurations } from './llmRuntimeStore.js';
import { TelemetryRuntime } from './observability.js';
import { OidcJwksVerifier } from './oidcJwks.js';

const telemetry = new TelemetryRuntime('aiw-api');
const oidcVerifier = new OidcJwksVerifier();
const acceptanceMode = process.env.AIW_RUNTIME_ACCEPTANCE_MODE ?? 'report';

if (acceptanceMode === 'enforce') {
  const known = platformAcceptanceProbeIds();
  const required = (process.env.AIW_RUNTIME_REQUIRED_CHECKS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is AcceptanceProbeId => known.includes(value as AcceptanceProbeId));
  const activeProbeIds = required.length ? required : known.filter((id) => !['ACC-LLM','ACC-GITHUB','ACC-CI'].includes(id));
  const gateway = await llmRuntimeConfigurations.gateway(process.env.AIW_RUNTIME_ACCEPTANCE_TENANT ?? 'tenant-reference');
  const report = await buildPlatformAcceptanceReport(gateway, {
    activeProbeIds,
    ...(required.length ? { requiredCheckIds: required } : {}),
    telemetry,
    oidcVerifier,
    tenantId: process.env.AIW_RUNTIME_ACCEPTANCE_TENANT ?? 'tenant-reference',
  });
  enforcePlatformAcceptance(report);
}

const app = await buildApp({ logger: true, telemetry, oidcVerifier });
const port = Number(process.env.PORT || 4100);
const host = process.env.HOST || '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
