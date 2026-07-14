import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hasPermission, sprint78KnowledgeReleaseManifest } from '@aiw/engine';
import { principalFor } from '../appRuntimeSupport.js';
import type { KnowledgeOperationsRepository } from '../knowledgeOperationsRepository.js';
import {
  sprint79KnowledgeRelease,
  sprint80PlatformRelease,
  sprint801PlatformRelease,
  sprint802PlatformRelease,
  reconciledPlatformRelease,
  hardeningPlatformRelease,
  embeddedIntelligencePlatformRelease,
  fullJourneyIntelligencePlatformRelease,
  enterpriseRuntimePlatformRelease,
  continuousConformancePlatformRelease,
  sprint878PlatformRelease,
  sprint879PlatformRelease,
  releasePrivateKeyPem,
} from '../services/releaseRegistry.js';
import { pilotEvaluationPlatformRelease } from '@aiw/engine';
import { productionAcceptancePlatformRelease } from '@aiw/engine';
import { portfolioIntelligencePlatformRelease } from '@aiw/engine';
import { signKnowledgeRelease, verifyKnowledgeRelease } from '../knowledgeReleaseSigning.js';

interface ReleaseRegistryRouteOptions {
  knowledgeOperations: KnowledgeOperationsRepository;
}

export async function releaseRegistryRoutes(app: FastifyInstance, options: ReleaseRegistryRouteOptions) {
  const { knowledgeOperations } = options;
  const getRelease = (path: string, factory: () => unknown) => {
    app.get(path, async (request) => {
      principalFor(request);
      return factory();
    });
  };

  getRelease('/api/knowledge-releases/7.8', sprint78KnowledgeReleaseManifest);
  getRelease('/api/knowledge-releases/7.9', sprint79KnowledgeRelease);
  getRelease('/api/releases/8.0', sprint80PlatformRelease);
  getRelease('/api/releases/8.0.1', sprint801PlatformRelease);
  getRelease('/api/releases/8.0.2', sprint802PlatformRelease);
  getRelease('/api/releases/8.0.3', reconciledPlatformRelease);
  getRelease('/api/releases/8.0.4', hardeningPlatformRelease);
  getRelease('/api/releases/8.6', embeddedIntelligencePlatformRelease);
  getRelease('/api/releases/8.7.1', fullJourneyIntelligencePlatformRelease);
  getRelease('/api/releases/8.7.2', enterpriseRuntimePlatformRelease);
  getRelease('/api/releases/8.7.3', continuousConformancePlatformRelease);
  getRelease('/api/releases/8.7.4', portfolioIntelligencePlatformRelease);
  getRelease('/api/releases/8.7.5', pilotEvaluationPlatformRelease);
  getRelease('/api/releases/8.7.6', productionAcceptancePlatformRelease);
  getRelease('/api/releases/8.7.8', sprint878PlatformRelease);
  getRelease('/api/releases/8.7.9', sprint879PlatformRelease);
  getRelease('/api/releases/10.0.0', productionAcceptancePlatformRelease);

  app.post('/api/knowledge-releases/7.9/sign', async (request, reply) => {
    const principal = principalFor(request);
    const guard = hasPermission(principal, 'release.promote');
    if (!guard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'release.promote', roles: guard.roles });
    if (process.env.AIW_ENABLE_RELEASE_SIGNING !== 'true') return reply.code(503).send({ error: 'RELEASE_SIGNING_DISABLED' });
    try {
      const release = sprint79KnowledgeRelease();
      const signature = signKnowledgeRelease({
        releaseId: release.releaseId,
        release,
        privateKeyPem: await releasePrivateKeyPem(),
        signedBy: principal.subject,
      });
      await knowledgeOperations.saveSignature(principal.tenantId, signature);
      return { release, signature, externallyVerifiable: true };
    } catch (error) {
      return reply.code(503).send({ error: error instanceof Error ? error.message : 'RELEASE_SIGNING_FAILED' });
    }
  });

  app.post('/api/knowledge-releases/verify', async (request, reply) => {
    const principal = principalFor(request);
    const guard = hasPermission(principal, 'audit.read');
    if (!guard.ok) return reply.code(403).send({ error: 'PERMISSION_DENIED', permission: 'audit.read', roles: guard.roles });
    const parsed = z.object({
      release: z.unknown(),
      signature: z.object({
        releaseId: z.string(),
        checksumSha256: z.string(),
        signatureAlgorithm: z.literal('Ed25519'),
        publicKeyId: z.string(),
        publicKeyPem: z.string(),
        signatureBase64: z.string(),
        signedBy: z.string(),
        signedAt: z.string(),
        verificationStatus: z.enum(['valid', 'invalid', 'unverified']),
      }),
    }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_RELEASE_SIGNATURE_REQUEST' });
    const valid = verifyKnowledgeRelease(parsed.data.release, parsed.data.signature);
    return reply.code(valid ? 200 : 409).send({ valid, releaseId: parsed.data.signature.releaseId, publicKeyId: parsed.data.signature.publicKeyId });
  });
}
