import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AIW_RELEASE } from '@aiw/domain';
import { FileSystemKnowledgeObjectStore } from '../src/knowledgeObjectStore.js';
import { ProductionOperationsRepository } from '../src/productionOperations.js';
import { LocalEd25519ReleaseSigner } from '../src/enterpriseReleaseSigning.js';

describe('rc.10.58 production operations', () => {
  it('stores evidence, expires it and preserves tenant boundaries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aiw-evidence-'));
    try {
      const repository = new ProductionOperationsRepository(join(dir, 'state.json'), new FileSystemKnowledgeObjectStore(join(dir, 'objects')));
      const evidence = await repository.putEvidence({ tenantId: 'tenant-a', projectId: 'project-a', evidenceType: 'conformance', title: 'CI result', contentText: 'passed', mediaType: 'text/plain', expiresAt: '2020-01-01T00:00:00.000Z' });
      expect((await repository.getEvidence('tenant-b', evidence.id))).toBeUndefined();
      expect(await repository.expireEvidence(new Date())).toBe(1);
      expect((await repository.listEvidence('tenant-a'))[0]?.status).toBe('expired');
      expect(Buffer.from((await repository.getEvidence('tenant-a', evidence.id))!.content).toString()).toBe('passed');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('blocks production promotion without accepted evidence and a pinned release', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aiw-promotion-'));
    try {
      const repository = new ProductionOperationsRepository(join(dir, 'state.json'), new FileSystemKnowledgeObjectStore(join(dir, 'objects')));
      const blocked = await repository.requestPromotion({ tenantId: 'tenant-a', sourceEnvironment: 'uat', targetEnvironment: 'production', releaseVersion: AIW_RELEASE.version, pinnedKnowledgeReleaseId: 'AKR-0.10.55', requestedBy: 'tester', acceptanceReport: { productionAccepted: false } });
      expect(blocked.status).toBe('blocked');
      const approved = await repository.requestPromotion({ tenantId: 'tenant-a', sourceEnvironment: 'uat', targetEnvironment: 'production', releaseVersion: AIW_RELEASE.version, pinnedKnowledgeReleaseId: 'AKR-0.10.55', requestedBy: 'tester', acceptanceReport: { productionAccepted: true } });
      expect((await repository.promote('tenant-a', approved.id)).status).toBe('promoted');
    } finally { await rm(dir, { recursive: true, force: true }); }
  });

  it('independently validates the local acceptance signer', async () => {
    const privateKeyPem = generateKeyPairSync('ed25519').privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const signature = await new LocalEd25519ReleaseSigner(privateKeyPem).sign({ release: 'rc10.58', manifest: ['a', 'b'] });
    expect(signature.provider).toBe('local-ed25519');
    expect(signature.providerEvidence.verificationStatus).toBe('valid');
  });
});
