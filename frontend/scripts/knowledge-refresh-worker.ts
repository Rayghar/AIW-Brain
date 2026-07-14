import { knowledgeRepositoryConnectors } from '../packages/domain/src/index.js';
import { refreshGitHubKnowledge } from '../apps/api/src/githubKnowledgeConnector.js';
import { createKnowledgeObjectStore } from '../apps/api/src/knowledgeObjectStore.js';
import { createKnowledgeOperationsRepository } from '../apps/api/src/knowledgeOperationsRepository.js';
import { extractKnowledgeClaims } from '../apps/api/src/knowledgeExtraction.js';
import { createId } from '../packages/domain/src/index.js';

async function main(): Promise<void> {

  if (process.env.AIW_ENABLE_GITHUB_KNOWLEDGE !== 'true') throw new Error('AIW_ENABLE_GITHUB_KNOWLEDGE must be true');
  const requested = (process.env.AIW_REFRESH_CONNECTORS || 'GH-FINOS-CALM,GH-MICROSOFT-ARCH-CENTER,GH-ASYNCAPI,GH-APACHE-CAMEL,GH-CONTEXT-MAPPER,GH-ARCHUNIT')
    .split(',').map((value) => value.trim()).filter(Boolean);
  const allowed = knowledgeRepositoryConnectors.filter((connector) => requested.includes(connector.id) && connector.lifecycleStatus === 'approved' && connector.ingestionMode !== 'discovery-only');
  const tenantId = process.env.AIW_REFRESH_TENANT_ID || 'tenant-reference';
  const requestedBy = process.env.AIW_REFRESH_ACTOR || 'knowledge-refresh-worker';
  const repository = createKnowledgeOperationsRepository();
  const store = createKnowledgeObjectStore();
  const results: unknown[] = [];
  try {
    for (const connector of allowed) {
      const id = `knowledge-refresh-${connector.id.toLowerCase()}-${Date.now()}`;
      const startedAt = new Date().toISOString();
      await repository.saveRefresh(tenantId, { id, connectorId: connector.id, triggerType: 'scheduled', status: 'running', requestedBy, requestedAt: startedAt, startedAt, result: {} });
      try {
        const result = await refreshGitHubKnowledge({ connectorId: connector.id, ...(process.env.AIW_GITHUB_TOKEN ? { token: process.env.AIW_GITHUB_TOKEN } : {}), store });
        const manifest = result.storedObjects.find((item) => item.key.endsWith('/manifest.json'));
        await repository.saveObjects(tenantId, result.snapshot.id, connector.id, result.quarantine.passed ? 'quarantined' : 'rejected', result.storedObjects);
        const extractionResults: Array<Record<string, unknown>> = [];
        if (result.quarantine.passed && process.env.AIW_ENABLE_LLM_EXTRACTION === 'true') {
          const maximum = Math.max(1, Number(process.env.AIW_EXTRACTION_MAX_FILES_PER_REFRESH || 20));
          const files = result.snapshot.files.filter((file) => typeof file.content === 'string' && file.content.length >= 20).slice(0, maximum);
          for (const file of files) {
            try {
              const extraction = await extractKnowledgeClaims({ snapshot: result.snapshot, sourcePath: file.path, sourceText: file.content! });
              await repository.saveCandidateClaims(tenantId, extraction.claims);
              await repository.saveLlmAudit(tenantId, { executionId: createId('llm-execution'), purpose: 'knowledge-extraction', routeId: extraction.routeId, providerId: extraction.provider, model: extraction.model, requestFingerprint: extraction.requestFingerprint, dataClassification: 'public', fallbackUsed: extraction.fallbackUsed, latencyMs: extraction.latencyMs, usage: extraction.usage as Record<string, unknown>, status: 'succeeded' });
              extractionResults.push({ path: file.path, claims: extraction.claims.length, rejected: extraction.rejected.length, provider: extraction.provider, model: extraction.model });
            } catch (error) {
              const errorCode = error instanceof Error ? error.message : String(error);
              extractionResults.push({ path: file.path, error: errorCode });
              if (process.env.AIW_EXTRACTION_FAIL_FAST === 'true') throw error;
            }
          }
        }
        await repository.saveRefresh(tenantId, { id, connectorId: connector.id, triggerType: 'scheduled', status: result.quarantine.passed ? 'review-required' : 'failed', requestedBy, requestedAt: startedAt, startedAt, completedAt: new Date().toISOString(), resolvedRevision: result.revision, snapshotId: result.snapshot.id, ...(manifest ? { objectManifestUri: manifest.uri } : {}), result: { eligibleFiles: result.eligibleFiles, ignoredFiles: result.ignoredFiles, quarantine: result.quarantine, warnings: result.warnings, extraction: extractionResults } });
        results.push({ connectorId: connector.id, revision: result.revision, snapshotId: result.snapshot.id, storedObjects: result.storedObjects.length, quarantinePassed: result.quarantine.passed, extraction: extractionResults });
      } catch (error) {
        const errorCode = error instanceof Error ? error.message : String(error);
        await repository.saveRefresh(tenantId, { id, connectorId: connector.id, triggerType: 'scheduled', status: 'failed', requestedBy, requestedAt: startedAt, startedAt, completedAt: new Date().toISOString(), result: {}, errorCode });
        results.push({ connectorId: connector.id, error: errorCode });
        if (process.env.AIW_REFRESH_FAIL_FAST === 'true') throw error;
      }
    }
  } finally { await repository.close(); }
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), tenantId, requested: requested.length, executed: allowed.length, results }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
