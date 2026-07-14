import type { ArchitectureBrainOrchestrator } from './architectureBrainOrchestrator.js';
import type { BrainTransactionRepository } from './brainTransactionRepository.js';
import type { FastifyInstance } from "fastify";

export interface ApplicationRouteContext {
  app: FastifyInstance;
  repository: any;
  eventHub: any;
  auditLog: any;
  idempotency: any;
  telemetry: any;
  durableEvents: any;
  oidcVerifier: any;
  eventBroker: any;
  outboxWorker: any;
  knowledgeOperations: any;
  synthesisRepository: any;
  platformAcceptanceRepository: any;
  referenceSampleProject: any;
  publishActivity: (input: any) => Promise<any>;
  architectureBrain: ArchitectureBrainOrchestrator;
  brainTransactions: BrainTransactionRepository;
}
