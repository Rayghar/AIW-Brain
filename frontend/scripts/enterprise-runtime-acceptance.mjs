import { writeFile } from 'node:fs/promises';
import { buildPlatformAcceptanceReport, enforcePlatformAcceptance, platformAcceptanceProbeIds } from '../apps/api/dist/platformAcceptance.js';
import { llmRuntimeConfigurations } from '../apps/api/dist/llmRuntimeStore.js';
import { TelemetryRuntime } from '../apps/api/dist/observability.js';
import { OidcJwksVerifier } from '../apps/api/dist/oidcJwks.js';

const args = process.argv.slice(2);
const known = platformAcceptanceProbeIds();
const requested = args.find((arg) => arg.startsWith('--active='))?.slice('--active='.length).split(',').map((value) => value.trim()).filter((value) => known.includes(value));
const required = (process.env.AIW_RUNTIME_REQUIRED_CHECKS ?? '').split(',').map((value) => value.trim()).filter((value) => known.includes(value));
const activeProbeIds = requested?.length ? requested : required.length ? required : known.filter((id) => !['ACC-LLM','ACC-GITHUB','ACC-CI'].includes(id));
const tenantId = process.env.AIW_RUNTIME_ACCEPTANCE_TENANT ?? 'tenant-reference';
const gateway = await llmRuntimeConfigurations.gateway(tenantId);
const report = await buildPlatformAcceptanceReport(gateway, {
  activeProbeIds,
  ...(required.length ? { requiredCheckIds: required } : {}),
  telemetry: new TelemetryRuntime('aiw-enterprise-acceptance'),
  oidcVerifier: new OidcJwksVerifier(),
  tenantId,
});
await writeFile('ENTERPRISE_RUNTIME_ACCEPTANCE.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ platformVersion: report.platformVersion, productionAccepted: report.productionAccepted, verified: report.verified, configured: report.configured, open: report.open, report: 'ENTERPRISE_RUNTIME_ACCEPTANCE.json' }, null, 2));
if (args.includes('--enforce')) enforcePlatformAcceptance(report);
await llmRuntimeConfigurations.close();
