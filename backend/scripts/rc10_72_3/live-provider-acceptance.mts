import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { llmRuntimeConfigurations } from '../../apps/api/src/llmRuntimeStore.js';


async function main() {
  const tenantId = process.env.AIW_RUNTIME_ACCEPTANCE_TENANT ?? 'tenant-reference';
  const outputPath = resolve(process.argv[2] ?? '../release-evidence/rc10.72.3/LIVE_SOL_PROVIDER_ACCEPTANCE.json');
  const generatedAt = new Date().toISOString();
  let result: Record<string, unknown>;
  
  try {
    const gateway = await llmRuntimeConfigurations.gateway(tenantId);
    const routes = await gateway.health('architecture-reasoning');
    const configured = routes.filter((route) => route.configured && route.circuit === 'closed');
    if (!configured.length) {
      result = {
        schemaVersion: '1.0',
        releaseId: 'AIW-0.10.0-rc.10.72.3',
        generatedAt,
        tenantId,
        status: 'blocked',
        productionAccepted: false,
        liveProviderUsed: false,
        routes,
        blocker: 'No configured architecture-reasoning route has a resolvable provider credential. Secrets were not displayed or inferred.',
      };
    } else {
      const started = performance.now();
      const response = await gateway.generateJson({
        purpose: 'architecture-reasoning',
        schemaName: 'aiw_rc10_72_3_live_sol_probe',
        jsonSchema: {
          type: 'object', additionalProperties: false, required: ['status','boundary'],
          properties: {
            status: { type: 'string', enum: ['ok'] },
            boundary: { type: 'string', enum: ['proposal-only'] },
          },
        },
        dataClassification: 'public',
        system: 'Return only the required JSON. You are proposing architecture reasoning and have no authority to mutate a model.',
        user: 'Return status ok and boundary proposal-only.',
      });
      result = {
        schemaVersion: '1.0',
        releaseId: 'AIW-0.10.0-rc.10.72.3',
        generatedAt,
        tenantId,
        status: 'passed',
        productionAccepted: false,
        liveProviderUsed: true,
        providerId: response.providerId,
        model: response.model,
        routeId: response.routeId,
        fallbackUsed: response.fallbackUsed,
        latencyMs: Math.round(performance.now() - started),
        requestFingerprint: response.requestFingerprint,
        response: response.value,
        boundary: 'The live route completed a non-mutating provider probe. Full stage-by-stage expert acceptance remains separate.',
      };
    }
  } catch (error) {
    result = {
      schemaVersion: '1.0',
      releaseId: 'AIW-0.10.0-rc.10.72.3',
      generatedAt,
      tenantId,
      status: 'failed',
      productionAccepted: false,
      liveProviderUsed: false,
      error: error instanceof Error ? error.message : 'LIVE_PROVIDER_ACCEPTANCE_FAILED',
    };
  }
  
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
  await llmRuntimeConfigurations.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
