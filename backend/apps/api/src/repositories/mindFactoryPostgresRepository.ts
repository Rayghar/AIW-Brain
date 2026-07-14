// Sprint 8.9.7 — Production Mind Factory persistence contract.
// This file is deliberately adapter-shaped: deployments can bind these methods
// to pg/transaction clients while the reference build keeps execution side-effect free.
import type {
  KmsSigningResult,
  MindFactoryActivationPersistenceRecord,
  MindFactoryPersistencePlan,
  RepositorySourceExecutionResult,
  SourceQuarantineSnapshot,
  QuarantinedCandidateClaim,
} from '@aiw/domain';

export interface MindFactoryPersistencePort {
  plan: MindFactoryPersistencePlan;
  persistSnapshot(snapshot: SourceQuarantineSnapshot): Promise<void>;
  persistCandidateClaims(claims: QuarantinedCandidateClaim[]): Promise<void>;
  persistRepositoryExecution(execution: RepositorySourceExecutionResult): Promise<void>;
  persistKmsSignature(signature: KmsSigningResult): Promise<void>;
  persistActivation(record: MindFactoryActivationPersistenceRecord): Promise<void>;
}

export function createReferenceMindFactoryPersistencePort(plan: MindFactoryPersistencePlan): MindFactoryPersistencePort {
  const buffer: unknown[] = [];
  return {
    plan,
    async persistSnapshot(snapshot) { buffer.push({ type: 'snapshot', snapshot }); },
    async persistCandidateClaims(claims) { buffer.push({ type: 'candidate-claims', claims }); },
    async persistRepositoryExecution(execution) { buffer.push({ type: 'repository-execution', execution }); },
    async persistKmsSignature(signature) { buffer.push({ type: 'kms-signature', signature }); },
    async persistActivation(record) { buffer.push({ type: 'activation', record }); },
  };
}
